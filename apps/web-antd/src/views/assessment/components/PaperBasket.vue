<script lang="ts" setup>
import type { AssessmentItemRevision } from '../domain/types';

import { computed, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  List,
  message,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  addToPaperBasket,
  createFormFromBasket,
  paperBasket,
  publishedItems,
  removeFromPaperBasket,
} from '../stores/paper';
import { schoolAssessmentState } from '../stores/state';

const emit = defineEmits<{
  formCreated: [formId: string];
}>();

const keyword = ref('');
const courseId = ref('');
const majorId = ref('');
const interactionId = ref('');
const difficulty = ref<number>();

const courseOptions = computed(() =>
  schoolAssessmentState.courses.map((course) => ({
    label: `${course.name} · ${course.code}`,
    value: course.id,
  })),
);

const majorOptions = computed(() =>
  schoolAssessmentState.majors.map((major) => ({
    label: major.name,
    value: major.id,
  })),
);

const interactionOptions = computed(() =>
  schoolAssessmentState.pluginPackages.map((plugin) => ({
    label: plugin.name,
    value: plugin.id,
  })),
);

function isAssessmentItem(
  item: AssessmentItemRevision | undefined,
): item is AssessmentItemRevision {
  return item !== undefined;
}

const basketItems = computed(() =>
  paperBasket.itemIds
    .map((id) =>
      schoolAssessmentState.itemRevisions.find((item) => item.id === id),
    )
    .filter(isAssessmentItem),
);

const basketScore = computed(() =>
  basketItems.value.reduce((sum, item) => sum + item.maxScore, 0),
);

const basketPrintRisks = computed(
  () =>
    basketItems.value.filter((item) => {
      const printVariant = item.channelVariants.find(
        (variant) => variant.channel === 'print',
      );
      return !printVariant || printVariant.mode === 'unsupported';
    }).length,
);

const filteredItems = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase();
  return publishedItems.value.filter((item) => {
    const stem = item.stem.blocks
      .map((block) => String(block.data.text ?? block.data.source ?? ''))
      .join(' ');
    const matchesKeyword =
      !query ||
      `${item.title} ${item.id} ${stem}`.toLocaleLowerCase().includes(query);
    const matchesCourse =
      !courseId.value ||
      item.metadata.ownership.primaryCourseId === courseId.value ||
      item.metadata.applicability.reusableCourseIds.includes(courseId.value);
    const matchesMajor =
      !majorId.value ||
      item.metadata.applicability.majorIds.includes(majorId.value);
    const matchesInteraction =
      !interactionId.value || item.interaction.pluginId === interactionId.value;
    const matchesDifficulty =
      difficulty.value === undefined ||
      item.metadata.difficulty === difficulty.value;
    return (
      matchesKeyword &&
      matchesCourse &&
      matchesMajor &&
      matchesInteraction &&
      matchesDifficulty
    );
  });
});

function asItem(value: unknown) {
  return value as AssessmentItemRevision;
}

function isInBasket(itemId: string) {
  return paperBasket.itemIds.includes(itemId);
}

function courseName(course: string) {
  return (
    schoolAssessmentState.courses.find((entry) => entry.id === course)?.name ??
    course
  );
}

function majorNames(value: unknown) {
  const item = asItem(value);
  return item.metadata.applicability.majorIds
    .map(
      (id) =>
        schoolAssessmentState.majors.find((major) => major.id === id)?.name,
    )
    .filter(Boolean)
    .join('、');
}

function taxonomyNames(value: unknown) {
  const item = asItem(value);
  return item.classification.taxonomyNodeIds
    .map(
      (id) =>
        schoolAssessmentState.taxonomyNodes.find((node) => node.id === id)
          ?.name,
    )
    .filter(Boolean)
    .join('、');
}

function add(itemValue: unknown) {
  const item = asItem(itemValue);
  addToPaperBasket(item.id);
  message.success(`已将“${item.title}”加入选题篮`);
}

function remove(itemId: string) {
  removeFromPaperBasket(itemId);
}

function addFilteredItems() {
  filteredItems.value.forEach((item) => addToPaperBasket(item.id));
  message.success(`已加入当前筛选结果，共 ${filteredItems.value.length} 题`);
}

function clearFilters() {
  keyword.value = '';
  courseId.value = '';
  majorId.value = '';
  interactionId.value = '';
  difficulty.value = undefined;
}

function createPaper() {
  if (!paperBasket.name.trim()) {
    message.warning('请先填写手工试卷名称');
    return;
  }
  try {
    const form = createFormFromBasket();
    emit('formCreated', form.id);
    message.success(`已从选题篮创建 ${form.totalScore} 分的手工试卷`);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建试卷失败');
  }
}
</script>

<template>
  <div class="paper-basket-workspace">
    <Card :bordered="false" class="bank-panel">
      <template #title>
        <div class="panel-title">
          <div>
            <Tag color="cyan">全校共享</Tag>
            <h2>校级题库选题</h2>
          </div>
          <span>{{ filteredItems.length }} 个已发布版本</span>
        </div>
      </template>
      <template #extra>
        <Space>
          <Button @click="clearFilters">重置筛选</Button>
          <Button
            :disabled="filteredItems.length === 0"
            @click="addFilteredItems"
          >
            加入当前结果
          </Button>
        </Space>
      </template>

      <div class="filters">
        <Input
          v-model:value="keyword"
          allow-clear
          placeholder="搜索题目、题干或版本 ID"
        />
        <Select
          v-model:value="courseId"
          allow-clear
          placeholder="全部课程"
          :options="courseOptions"
        />
        <Select
          v-model:value="majorId"
          allow-clear
          placeholder="全部专业"
          :options="majorOptions"
        />
        <Select
          v-model:value="interactionId"
          allow-clear
          placeholder="全部交互"
          :options="interactionOptions"
        />
        <Select
          v-model:value="difficulty"
          allow-clear
          placeholder="全部难度"
          :options="
            [1, 2, 3, 4, 5].map((value) => ({
              label: `难度 ${value}`,
              value,
            }))
          "
        />
      </div>

      <Table
        row-key="id"
        size="middle"
        :scroll="{ x: 980 }"
        :data-source="filteredItems"
        :pagination="{ pageSize: 6, showSizeChanger: false }"
        :columns="[
          { title: '题目版本', key: 'item', width: 300 },
          { title: '课程 / 专业', key: 'scope', width: 260 },
          { title: '分类', key: 'taxonomy', width: 190 },
          { title: '交互', key: 'interaction', width: 160 },
          { title: '难度', key: 'difficulty', width: 80 },
          { title: '分值', dataIndex: 'maxScore', width: 70 },
          { title: '操作', key: 'action', fixed: 'right', width: 100 },
        ]"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'item'">
            <div class="item-title">
              <strong>{{ record.title }}</strong>
              <code>{{ record.id }}</code>
            </div>
          </template>
          <template v-else-if="column.key === 'scope'">
            <div>
              {{ courseName(record.metadata.ownership.primaryCourseId) }}
            </div>
            <small>{{ majorNames(record) || '全专业可复用' }}</small>
          </template>
          <template v-else-if="column.key === 'taxonomy'">
            <span>{{ taxonomyNames(record) || '未绑定分类' }}</span>
          </template>
          <template v-else-if="column.key === 'interaction'">
            <Tag color="blue">{{ record.interaction.pluginId }}</Tag>
          </template>
          <template v-else-if="column.key === 'difficulty'">
            <Tag :color="record.metadata.difficulty >= 4 ? 'orange' : 'green'">
              D{{ record.metadata.difficulty }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Button
              v-if="!isInBasket(record.id)"
              size="small"
              type="primary"
              @click="add(record)"
            >
              加入
            </Button>
            <Button v-else size="small" type="link" @click="remove(record.id)">
              已加入
            </Button>
          </template>
        </template>
      </Table>
    </Card>

    <aside class="basket-panel">
      <Card :bordered="false">
        <template #title>
          <div class="basket-title">
            <span>选题篮</span>
            <Tag color="processing">{{ basketItems.length }} 题</Tag>
          </div>
        </template>

        <Input
          v-model:value="paperBasket.name"
          class="paper-name"
          placeholder="手工试卷名称"
        />

        <div class="basket-statistics">
          <Statistic title="原始分值" :value="basketScore" suffix="分" />
          <Statistic
            title="纸质阻断"
            :value="basketPrintRisks"
            suffix="项"
            :value-style="{
              color: basketPrintRisks > 0 ? '#cf1322' : '#389e0d',
            }"
          />
        </div>

        <Alert
          v-if="basketPrintRisks > 0"
          class="basket-alert"
          show-icon
          type="warning"
          message="篮中存在不支持纸质渠道的题目"
          description="仍可创建草稿，但需在校样阶段处理 compatibility 阻断项。"
        />

        <List
          v-if="basketItems.length > 0"
          class="basket-list"
          size="small"
          :data-source="basketItems"
        >
          <template #renderItem="{ item }">
            <List.Item>
              <div class="basket-item">
                <div>
                  <strong>{{ item.title }}</strong>
                  <small>
                    D{{ item.metadata.difficulty }} ·
                    {{ courseName(item.metadata.ownership.primaryCourseId) }} ·
                    {{ item.maxScore }} 分
                  </small>
                </div>
                <Button
                  danger
                  size="small"
                  type="text"
                  @click="remove(item.id)"
                >
                  移除
                </Button>
              </div>
            </List.Item>
          </template>
        </List>
        <Empty v-else description="从左侧全校题库加入题目" />

        <Button
          block
          class="create-button"
          type="primary"
          :disabled="basketItems.length === 0"
          @click="createPaper"
        >
          从选题篮创建试卷
        </Button>
      </Card>
    </aside>
  </div>
</template>

<style scoped>
.paper-basket-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  align-items: start;
}

.bank-panel {
  min-width: 0;
}

.panel-title,
.basket-title {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.panel-title h2 {
  margin: 7px 0 0;
  font-size: 20px;
}

.panel-title > span {
  color: hsl(var(--foreground) / 50%);
}

.filters {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(4, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.item-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-title code,
small {
  color: hsl(var(--foreground) / 50%);
}

.basket-panel {
  position: sticky;
  top: 16px;
}

.paper-name {
  margin-bottom: 16px;
}

.basket-statistics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 14px;
  background: hsl(var(--accent) / 40%);
  border-radius: 10px;
}

.basket-alert {
  margin-top: 14px;
}

.basket-list {
  max-height: 460px;
  margin-top: 10px;
  overflow: auto;
}

.basket-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
}

.basket-item > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.basket-item strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.create-button {
  margin-top: 16px;
}

@media (max-width: 1280px) {
  .paper-basket-workspace {
    grid-template-columns: 1fr;
  }

  .basket-panel {
    position: static;
  }

  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .panel-title {
    align-items: flex-start;
  }

  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
