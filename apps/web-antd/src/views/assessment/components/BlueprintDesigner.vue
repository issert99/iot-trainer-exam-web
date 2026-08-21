<script lang="ts" setup>
import type {
  AssessmentBlueprint,
  BlueprintRule,
  DeliveryChannel,
} from '../domain/types';

import { computed, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
} from 'ant-design-vue';

import { clone, uid } from '../domain/integrity';
import { assembleFromBlueprint, publishedItems } from '../stores/paper';
import { persistSchoolState, schoolAssessmentState } from '../stores/state';

const emit = defineEmits<{
  formCreated: [formId: string];
}>();

const channelOptions: Array<{ label: string; value: DeliveryChannel }> = [
  { label: '在线机考', value: 'online' },
  { label: '纸质考试', value: 'print' },
  { label: '实践考站', value: 'practical' },
];

const blueprintOptions = computed(() =>
  schoolAssessmentState.blueprints.map((blueprint) => ({
    label: `${blueprint.name} · ${blueprint.status}`,
    value: blueprint.id,
  })),
);

const majorOptions = computed(() =>
  schoolAssessmentState.majors.map((major) => ({
    label: `${major.name} · ${major.code}`,
    value: major.id,
  })),
);

const courseOptions = computed(() =>
  schoolAssessmentState.courses.map((course) => ({
    label: `${course.name} · ${course.code}`,
    value: course.id,
  })),
);

const taxonomyOptions = computed(() =>
  schoolAssessmentState.taxonomyNodes.map((node) => ({
    label: `${node.name} · ${node.code}`,
    value: node.id,
  })),
);

const interactionOptions = computed(() =>
  schoolAssessmentState.pluginPackages.map((plugin) => ({
    label: `${plugin.name} · ${plugin.id}`,
    value: plugin.id,
  })),
);

function createRule(): BlueprintRule {
  return {
    applicabilityMajorIds: [],
    channels: ['online', 'print'],
    count: 2,
    difficultyRange: [2, 4],
    interactionIds: [],
    scorePerItem: 10,
    taxonomyNodeIds: [],
  };
}

function createBlueprint(): AssessmentBlueprint {
  const majorId = schoolAssessmentState.majors[0]?.id;
  const courseId = schoolAssessmentState.courses[0]?.id;
  return {
    applicableMajorIds: majorId ? [majorId] : [],
    channels: ['online', 'print'],
    courseIds: courseId ? [courseId] : [],
    createdAt: new Date().toISOString(),
    durationMinutes: 90,
    id: uid('blueprint'),
    name: '新建考试蓝图',
    sections: [
      {
        id: uid('blueprint-section'),
        name: '第一部分',
        rules: [createRule()],
      },
    ],
    status: 'draft',
    totalScore: 20,
  };
}

const initialBlueprint = schoolAssessmentState.blueprints[0];
const selectedBlueprintId = ref(initialBlueprint?.id ?? '');
const editableBlueprint = ref<AssessmentBlueprint>(
  initialBlueprint ? clone(initialBlueprint) : createBlueprint(),
);

watch(selectedBlueprintId, (id) => {
  const blueprint = schoolAssessmentState.blueprints.find(
    (entry) => entry.id === id,
  );
  if (blueprint) editableBlueprint.value = clone(blueprint);
});

const totalScore = computed(() =>
  editableBlueprint.value.sections.reduce(
    (total, section) =>
      total +
      section.rules.reduce(
        (sectionTotal, rule) => sectionTotal + rule.count * rule.scorePerItem,
        0,
      ),
    0,
  ),
);

const requestedItemCount = computed(() =>
  editableBlueprint.value.sections.reduce(
    (total, section) =>
      total +
      section.rules.reduce(
        (sectionTotal, rule) => sectionTotal + rule.count,
        0,
      ),
    0,
  ),
);

const coveredPublishedItems = computed(() => {
  const itemIds = new Set<string>();
  editableBlueprint.value.sections.forEach((section) => {
    section.rules.forEach((rule) => {
      publishedItems.value.forEach((item) => {
        const inDifficulty =
          item.metadata.difficulty >= rule.difficultyRange[0] &&
          item.metadata.difficulty <= rule.difficultyRange[1];
        const inMajor =
          rule.applicabilityMajorIds.length === 0 ||
          rule.applicabilityMajorIds.some((majorId) =>
            item.metadata.applicability.majorIds.includes(majorId),
          );
        const inTaxonomy =
          rule.taxonomyNodeIds.length === 0 ||
          rule.taxonomyNodeIds.some((nodeId) =>
            item.classification.taxonomyNodeIds.includes(nodeId),
          );
        const inInteraction =
          rule.interactionIds.length === 0 ||
          rule.interactionIds.includes(item.interaction.pluginId);
        if (inDifficulty && inMajor && inTaxonomy && inInteraction) {
          itemIds.add(item.id);
        }
      });
    });
  });
  return itemIds.size;
});

function startNewBlueprint() {
  selectedBlueprintId.value = '';
  editableBlueprint.value = createBlueprint();
}

function addSection() {
  editableBlueprint.value.sections.push({
    id: uid('blueprint-section'),
    name: `第 ${editableBlueprint.value.sections.length + 1} 部分`,
    rules: [createRule()],
  });
}

function removeSection(index: number) {
  if (editableBlueprint.value.sections.length === 1) {
    message.warning('蓝图至少保留一个章节');
    return;
  }
  editableBlueprint.value.sections.splice(index, 1);
}

function addRule(sectionIndex: number) {
  editableBlueprint.value.sections[sectionIndex]?.rules.push(createRule());
}

function removeRule(sectionIndex: number, ruleIndex: number) {
  const section = editableBlueprint.value.sections[sectionIndex];
  if (!section) return;
  if (section.rules.length === 1) {
    message.warning('每个章节至少保留一条选题规则');
    return;
  }
  section.rules.splice(ruleIndex, 1);
}

function validateBlueprint() {
  const blueprint = editableBlueprint.value;
  if (!blueprint.name.trim()) return '请填写蓝图名称';
  if (blueprint.courseIds.length === 0) return '请至少选择一门课程';
  if (blueprint.applicableMajorIds.length === 0) return '请至少选择一个专业';
  if (blueprint.channels.length === 0) return '请至少选择一个交付渠道';
  if (blueprint.sections.some((section) => !section.name.trim())) {
    return '请填写所有章节名称';
  }
  if (
    blueprint.sections.some((section) =>
      section.rules.some(
        (rule) =>
          rule.count < 1 ||
          rule.scorePerItem <= 0 ||
          rule.difficultyRange[0] > rule.difficultyRange[1],
      ),
    )
  ) {
    return '规则中的难度、数量或分值不合法';
  }
  return '';
}

function saveBlueprint(silent = false) {
  const error = validateBlueprint();
  if (error) {
    message.warning(error);
    return undefined;
  }
  editableBlueprint.value.totalScore = totalScore.value;
  const snapshot = clone(editableBlueprint.value);
  const existingIndex = schoolAssessmentState.blueprints.findIndex(
    (entry) => entry.id === snapshot.id,
  );
  if (existingIndex === -1) {
    schoolAssessmentState.blueprints.unshift(snapshot);
  } else {
    schoolAssessmentState.blueprints.splice(existingIndex, 1, snapshot);
  }
  selectedBlueprintId.value = snapshot.id;
  persistSchoolState();
  if (!silent) message.success('蓝图规则已保存到本校工作区');
  return snapshot.id;
}

function assemble(variant: 'A' | 'B') {
  const blueprintId = saveBlueprint(true);
  if (!blueprintId) return;
  try {
    const form = assembleFromBlueprint(blueprintId, variant);
    emit('formCreated', form.id);
    message.success(
      `已生成 ${variant} 卷：${form.sections.length} 个章节、${form.totalScore} 分`,
    );
  } catch (error) {
    message.error(error instanceof Error ? error.message : '智能组卷失败');
  }
}
</script>

<template>
  <div class="blueprint-designer">
    <Card :bordered="false" class="designer-toolbar">
      <div class="toolbar-row">
        <div>
          <Tag color="blue">规则驱动</Tag>
          <h2>考试蓝图设计器</h2>
          <p>先定义覆盖范围与配额，再生成可编辑的 A/B 卷快照。</p>
        </div>
        <Space wrap>
          <Select
            v-model:value="selectedBlueprintId"
            allow-clear
            placeholder="选择已有蓝图"
            style="min-width: 300px"
            :options="blueprintOptions"
          />
          <Button @click="startNewBlueprint">新建蓝图</Button>
          <Button @click="saveBlueprint()">保存规则</Button>
          <Button type="primary" @click="assemble('A')">智能生成 A 卷</Button>
          <Button @click="assemble('B')">智能生成 B 卷</Button>
        </Space>
      </div>
    </Card>

    <div class="designer-layout">
      <aside class="summary-panel">
        <Card title="蓝图概览" :bordered="false">
          <Row :gutter="[12, 18]">
            <Col :span="12">
              <Statistic
                title="计划题量"
                :value="requestedItemCount"
                suffix="题"
              />
            </Col>
            <Col :span="12">
              <Statistic title="目标总分" :value="totalScore" suffix="分" />
            </Col>
            <Col :span="12">
              <Statistic
                title="可匹配题目"
                :value="coveredPublishedItems"
                suffix="题"
              />
            </Col>
            <Col :span="12">
              <Statistic
                title="考试时长"
                :value="editableBlueprint.durationMinutes"
                suffix="分钟"
              />
            </Col>
          </Row>
          <Alert
            class="coverage-alert"
            show-icon
            :type="
              coveredPublishedItems >= requestedItemCount
                ? 'success'
                : 'warning'
            "
            :message="
              coveredPublishedItems >= requestedItemCount
                ? '题库覆盖可支持当前配额'
                : '部分规则可能无法凑足题量'
            "
            description="组卷时优先选择曝光次数更低的已发布题目，并固定题目版本。"
          />
        </Card>
      </aside>

      <main class="rules-panel">
        <Card title="适用范围" :bordered="false">
          <Form layout="vertical">
            <Row :gutter="16">
              <Col :xs="24" :lg="12">
                <Form.Item label="蓝图名称">
                  <Input
                    v-model:value="editableBlueprint.name"
                    placeholder="例如：2026 春季工程基础期末考试"
                  />
                </Form.Item>
              </Col>
              <Col :xs="12" :lg="6">
                <Form.Item label="考试时长">
                  <InputNumber
                    v-model:value="editableBlueprint.durationMinutes"
                    class="full-width"
                    :min="15"
                    :step="15"
                    addon-after="分钟"
                  />
                </Form.Item>
              </Col>
              <Col :xs="12" :lg="6">
                <Form.Item label="蓝图状态">
                  <Select
                    v-model:value="editableBlueprint.status"
                    :options="[
                      { label: '草稿', value: 'draft' },
                      { label: '已发布', value: 'published' },
                      { label: '已停用', value: 'retired' },
                    ]"
                  />
                </Form.Item>
              </Col>
              <Col :xs="24" :lg="12">
                <Form.Item label="适用专业">
                  <Select
                    v-model:value="editableBlueprint.applicableMajorIds"
                    mode="multiple"
                    placeholder="选择专业"
                    :options="majorOptions"
                  />
                </Form.Item>
              </Col>
              <Col :xs="24" :lg="12">
                <Form.Item label="课程范围">
                  <Select
                    v-model:value="editableBlueprint.courseIds"
                    mode="multiple"
                    placeholder="选择课程"
                    :options="courseOptions"
                  />
                </Form.Item>
              </Col>
              <Col :xs="24">
                <Form.Item label="交付渠道">
                  <Select
                    v-model:value="editableBlueprint.channels"
                    mode="multiple"
                    :options="channelOptions"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card
          v-for="(section, sectionIndex) in editableBlueprint.sections"
          :key="section.id"
          :bordered="false"
          class="section-card"
        >
          <template #title>
            <div class="section-title">
              <span class="section-index">{{ sectionIndex + 1 }}</span>
              <Input
                v-model:value="section.name"
                class="section-name"
                placeholder="章节名称"
              />
              <Tag>
                {{ section.rules.reduce((sum, rule) => sum + rule.count, 0) }}
                题
              </Tag>
            </div>
          </template>
          <template #extra>
            <Space>
              <Button size="small" @click="addRule(sectionIndex)">
                添加规则
              </Button>
              <Button
                danger
                size="small"
                type="text"
                @click="removeSection(sectionIndex)"
              >
                删除章节
              </Button>
            </Space>
          </template>

          <article
            v-for="(rule, ruleIndex) in section.rules"
            :key="`${section.id}-${ruleIndex}`"
            class="rule-card"
          >
            <div class="rule-heading">
              <strong>规则 {{ ruleIndex + 1 }}</strong>
              <span>同时满足下列条件</span>
              <Button
                danger
                size="small"
                type="link"
                @click="removeRule(sectionIndex, ruleIndex)"
              >
                移除
              </Button>
            </div>
            <Form layout="vertical">
              <Row :gutter="12">
                <Col :xs="24" :xl="12">
                  <Form.Item label="专业限制（空为继承蓝图）">
                    <Select
                      v-model:value="rule.applicabilityMajorIds"
                      mode="multiple"
                      placeholder="全部适用专业"
                      :options="majorOptions"
                    />
                  </Form.Item>
                </Col>
                <Col :xs="24" :xl="12">
                  <Form.Item label="知识分类 / 能力节点">
                    <Select
                      v-model:value="rule.taxonomyNodeIds"
                      mode="multiple"
                      placeholder="全部分类"
                      :options="taxonomyOptions"
                    />
                  </Form.Item>
                </Col>
                <Col :xs="24" :xl="12">
                  <Form.Item label="交互类型">
                    <Select
                      v-model:value="rule.interactionIds"
                      mode="multiple"
                      placeholder="全部交互"
                      :options="interactionOptions"
                    />
                  </Form.Item>
                </Col>
                <Col :xs="24" :xl="12">
                  <Form.Item label="渠道要求">
                    <Select
                      v-model:value="rule.channels"
                      mode="multiple"
                      :options="channelOptions"
                    />
                  </Form.Item>
                </Col>
                <Col :xs="12" :sm="6">
                  <Form.Item label="最低难度">
                    <InputNumber
                      v-model:value="rule.difficultyRange[0]"
                      class="full-width"
                      :min="1"
                      :max="5"
                    />
                  </Form.Item>
                </Col>
                <Col :xs="12" :sm="6">
                  <Form.Item label="最高难度">
                    <InputNumber
                      v-model:value="rule.difficultyRange[1]"
                      class="full-width"
                      :min="1"
                      :max="5"
                    />
                  </Form.Item>
                </Col>
                <Col :xs="12" :sm="6">
                  <Form.Item label="题目数量">
                    <InputNumber
                      v-model:value="rule.count"
                      class="full-width"
                      :min="1"
                      :max="50"
                      addon-after="题"
                    />
                  </Form.Item>
                </Col>
                <Col :xs="12" :sm="6">
                  <Form.Item label="每题分值">
                    <InputNumber
                      v-model:value="rule.scorePerItem"
                      class="full-width"
                      :min="0.5"
                      :step="0.5"
                      addon-after="分"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </article>
        </Card>

        <Divider>
          <Button type="dashed" @click="addSection">添加试卷章节</Button>
        </Divider>
      </main>
    </div>
  </div>
</template>

<style scoped>
.blueprint-designer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar-row {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.toolbar-row h2 {
  margin: 8px 0 3px;
  font-size: 20px;
}

.toolbar-row p {
  margin: 0;
  color: hsl(var(--foreground) / 58%);
}

.designer-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.28fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.summary-panel {
  position: sticky;
  top: 16px;
}

.coverage-alert {
  margin-top: 18px;
}

.rules-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.full-width {
  width: 100%;
}

.section-title {
  display: flex;
  gap: 10px;
  align-items: center;
}

.section-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #fff;
  background: #1677ff;
  border-radius: 8px;
}

.section-name {
  width: min(360px, 55vw);
  font-weight: 600;
}

.rule-card {
  padding: 16px 16px 0;
  margin-bottom: 12px;
  background: hsl(var(--accent) / 35%);
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.rule-card:last-child {
  margin-bottom: 0;
}

.rule-heading {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.rule-heading span {
  color: hsl(var(--foreground) / 50%);
}

.rule-heading button {
  margin-left: auto;
}

@media (max-width: 1100px) {
  .toolbar-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .designer-layout {
    grid-template-columns: 1fr;
  }

  .summary-panel {
    position: static;
  }
}

@media (max-width: 640px) {
  .designer-toolbar :deep(.ant-space),
  .designer-toolbar :deep(.ant-select) {
    width: 100%;
  }

  .section-card :deep(.ant-card-head-wrapper) {
    align-items: flex-start;
  }

  .section-card :deep(.ant-card-extra) {
    margin-left: 8px;
  }

  .section-name {
    width: 150px;
  }
}
</style>
