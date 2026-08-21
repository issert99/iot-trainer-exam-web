<script lang="ts" setup>
import type { TaxonomyNode } from '../domain/types';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Card,
  Col,
  Descriptions,
  Empty,
  Progress,
  Row,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tree,
} from 'ant-design-vue';

import { latestItemRevisions, taxonomyUsage } from '../stores/classification';
import { schoolAssessmentState } from '../stores/state';

defineOptions({ name: 'AssessmentCurriculum' });

type TaxonomyTreeNode = {
  children?: TaxonomyTreeNode[];
  key: string;
  title: string;
};

const activeTab = ref('relations');
const initialKnowledgeNode = schoolAssessmentState.taxonomyNodes.find(
  (node) =>
    schoolAssessmentState.taxonomySchemes.find(
      (scheme) => scheme.id === node.schemeId,
    )?.scope === 'knowledge',
);
const selectedKnowledgeId = ref(initialKnowledgeNode?.id ?? '');

const tabItems = [
  { key: 'relations', label: '学科·专业·课程关系' },
  { key: 'standards', label: '分类标准' },
  { key: 'knowledge', label: '知识树' },
  { key: 'outcomes', label: '能力 / 毕业要求' },
  { key: 'tags', label: '标签字典' },
];

function organizationName(id: string) {
  return (
    schoolAssessmentState.organizationNodes.find((node) => node.id === id)
      ?.name ?? id
  );
}

function courseName(id: string) {
  return schoolAssessmentState.courses.find((course) => course.id === id)?.name;
}

function taxonomyNodeName(id: string) {
  return schoolAssessmentState.taxonomyNodes.find((node) => node.id === id)
    ?.name;
}

const relationRows = computed(() =>
  schoolAssessmentState.majors.map((major) => {
    const discipline = schoolAssessmentState.disciplines.find(
      (entry) => entry.id === major.disciplineId,
    );
    const courses = schoolAssessmentState.courses.filter((course) =>
      course.applicableMajorIds.includes(major.id),
    );
    const plans = schoolAssessmentState.curriculumPlans.filter(
      (plan) => plan.majorId === major.id,
    );
    return {
      ...major,
      collegeName: organizationName(major.collegeId),
      courses,
      disciplineName: discipline?.name ?? '未归类',
      plans,
      sharedCourseCount: courses.filter((course) => course.sharedAcrossMajors)
        .length,
    };
  }),
);

const schemeRows = computed(() =>
  schoolAssessmentState.taxonomySchemes.map((scheme) => {
    const nodes = taxonomyUsage.value.filter(
      (node) => node.schemeId === scheme.id,
    );
    return {
      ...scheme,
      itemCount: nodes.reduce((total, node) => total + node.itemCount, 0),
      nodeCount: nodes.length,
    };
  }),
);

const knowledgeSchemeIds = computed(() =>
  schoolAssessmentState.taxonomySchemes
    .filter((scheme) => scheme.scope === 'knowledge')
    .map((scheme) => scheme.id),
);

const knowledgeNodes = computed(() =>
  schoolAssessmentState.taxonomyNodes.filter((node) =>
    knowledgeSchemeIds.value.includes(node.schemeId),
  ),
);

function buildKnowledgeTree(
  nodes: TaxonomyNode[],
  parentId: null | string,
): TaxonomyTreeNode[] {
  return nodes
    .filter((node) => node.parentId === parentId)
    .map((node) => {
      const children = buildKnowledgeTree(nodes, node.id);
      const usage =
        taxonomyUsage.value.find((entry) => entry.id === node.id)?.itemCount ??
        0;
      return {
        children: children.length > 0 ? children : undefined,
        key: node.id,
        title: `${node.name} · ${usage} 题`,
      };
    });
}

const knowledgeTree = computed(() =>
  buildKnowledgeTree(knowledgeNodes.value, null),
);

const selectedKnowledge = computed(() =>
  knowledgeNodes.value.find((node) => node.id === selectedKnowledgeId.value),
);

const selectedKnowledgeItems = computed(() =>
  latestItemRevisions.value.filter((item) =>
    item.classification.taxonomyNodeIds.includes(selectedKnowledgeId.value),
  ),
);

const selectedKnowledgeCoverageText = computed(
  () => `${selectedKnowledgeItems.value.length} 个最新题目版本`,
);

const outcomeRows = computed(() => {
  const schemes = schoolAssessmentState.taxonomySchemes.filter((scheme) =>
    ['ability', 'graduate-outcome'].includes(scheme.scope),
  );
  return schoolAssessmentState.taxonomyNodes
    .filter((node) => schemes.some((scheme) => scheme.id === node.schemeId))
    .map((node) => {
      const scheme = schemes.find((entry) => entry.id === node.schemeId);
      const outgoing = schoolAssessmentState.taxonomyEdges
        .filter((edge) => edge.fromId === node.id)
        .map((edge) => taxonomyNodeName(edge.toId))
        .filter(Boolean);
      const incoming = schoolAssessmentState.taxonomyEdges
        .filter((edge) => edge.toId === node.id)
        .map((edge) => taxonomyNodeName(edge.fromId))
        .filter(Boolean);
      return {
        ...node,
        incoming,
        itemCount:
          taxonomyUsage.value.find((entry) => entry.id === node.id)
            ?.itemCount ?? 0,
        outgoing,
        schemeName: scheme?.name ?? '',
        scope: scheme?.scope ?? 'ability',
      };
    });
});

const tagRows = computed(() => {
  const dictionary = new Map<
    string,
    {
      courseIds: Set<string>;
      itemCount: number;
      majorIds: Set<string>;
      name: string;
    }
  >();
  latestItemRevisions.value.forEach((item) => {
    item.classification.freeTags.forEach((tag) => {
      const entry = dictionary.get(tag) ?? {
        courseIds: new Set<string>(),
        itemCount: 0,
        majorIds: new Set<string>(),
        name: tag,
      };
      entry.itemCount += 1;
      entry.courseIds.add(item.metadata.ownership.primaryCourseId);
      item.metadata.applicability.majorIds.forEach((id) =>
        entry.majorIds.add(id),
      );
      dictionary.set(tag, entry);
    });
  });
  return [...dictionary.values()]
    .map((entry) => ({
      courseNames: [...entry.courseIds]
        .map((id) => courseName(id))
        .filter(Boolean),
      itemCount: entry.itemCount,
      majorCount: entry.majorIds.size,
      name: entry.name,
    }))
    .toSorted(
      (left, right) =>
        right.itemCount - left.itemCount ||
        left.name.localeCompare(right.name, 'zh-CN'),
    );
});

const activeSchemeCount = computed(
  () =>
    schoolAssessmentState.taxonomySchemes.filter(
      (scheme) => scheme.status === 'active',
    ).length,
);

function structureLabel(value: string) {
  return (
    {
      facet: '分面',
      graph: '图谱',
      tree: '树',
    }[value] ?? value
  );
}

function scopeLabel(value: string) {
  return (
    {
      ability: '能力',
      application: '应用场景',
      certification: '认证',
      'graduate-outcome': '毕业要求',
      knowledge: '知识',
      topic: '主题',
    }[value] ?? value
  );
}

function selectKnowledge(keys: Array<number | string>) {
  selectedKnowledgeId.value = String(keys[0] ?? '');
}
</script>

<template>
  <Page>
    <div class="curriculum-page">
      <section class="curriculum-hero">
        <div>
          <Tag color="cyan">单校主数据</Tag>
          <h1>基础与分类</h1>
          <p>
            以 {{ schoolAssessmentState.school.name }}
            为唯一数据边界，统一维护学科专业课程关系、知识分类、能力指标和校级标签。
          </p>
        </div>
        <div class="curriculum-hero__stats">
          <Statistic
            title="专业"
            :value="schoolAssessmentState.majors.length"
          />
          <Statistic
            title="课程"
            :value="schoolAssessmentState.courses.length"
          />
          <Statistic title="分类标准" :value="activeSchemeCount" />
          <Statistic
            title="分类节点"
            :value="schoolAssessmentState.taxonomyNodes.length"
          />
        </div>
      </section>

      <Card :bordered="false" class="curriculum-workspace">
        <Tabs v-model:active-key="activeTab" :items="tabItems" />

        <template v-if="activeTab === 'relations'">
          <Alert
            class="mb-4"
            show-icon
            type="info"
            message="全校共用一套学科、专业与课程主数据"
            :description="`${schoolAssessmentState.school.academicYear} 学年 · ${schoolAssessmentState.school.semester}，公共基础课程可同时服务多个专业。`"
          />
          <Table
            row-key="id"
            :columns="[
              { title: '学科 / 专业', key: 'major', width: 230 },
              { title: '归属单位', dataIndex: 'collegeName', width: 150 },
              { title: '课程关系', key: 'courses' },
              { title: '培养方案', key: 'plans', width: 220 },
              { title: '共享课', dataIndex: 'sharedCourseCount', width: 90 },
            ]"
            :data-source="relationRows"
            :pagination="false"
            :scroll="{ x: 960 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'major'">
                <strong>{{ record.name }}</strong>
                <div class="muted">
                  {{ record.disciplineName }} · {{ record.code }}
                </div>
              </template>
              <template v-else-if="column.key === 'courses'">
                <Tag
                  v-for="course in record.courses"
                  :key="course.id"
                  :color="course.sharedAcrossMajors ? 'blue' : undefined"
                >
                  {{ course.name }}
                  <span v-if="course.sharedAcrossMajors"> · 共享</span>
                </Tag>
                <span v-if="record.courses.length === 0" class="muted">
                  暂无课程关系
                </span>
              </template>
              <template v-else-if="column.key === 'plans'">
                <div v-for="plan in record.plans" :key="plan.id">
                  {{ plan.name }}
                  <Tag>{{ plan.version }}</Tag>
                </div>
                <span v-if="record.plans.length === 0" class="muted">
                  尚未登记
                </span>
              </template>
            </template>
          </Table>
        </template>

        <template v-else-if="activeTab === 'standards'">
          <Table
            row-key="id"
            :columns="[
              { title: '标准', key: 'scheme', width: 280 },
              { title: '用途', key: 'scope', width: 120 },
              { title: '结构', key: 'structure', width: 100 },
              { title: '版本', key: 'version', width: 100 },
              { title: '节点', dataIndex: 'nodeCount', width: 90 },
              { title: '题目引用', dataIndex: 'itemCount', width: 110 },
              { title: '状态', key: 'status', width: 100 },
            ]"
            :data-source="schemeRows"
            :pagination="false"
            :scroll="{ x: 860 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'scheme'">
                <strong>{{ record.name }}</strong>
                <div class="muted">
                  {{ record.code }} · {{ record.description }}
                </div>
              </template>
              <template v-else-if="column.key === 'scope'">
                {{ scopeLabel(record.scope) }}
              </template>
              <template v-else-if="column.key === 'structure'">
                <Tag>{{ structureLabel(record.structure) }}</Tag>
              </template>
              <template v-else-if="column.key === 'version'">
                v{{ record.version }}
              </template>
              <template v-else-if="column.key === 'status'">
                <Tag
                  :color="record.status === 'active' ? 'success' : 'default'"
                >
                  {{ record.status === 'active' ? '生效中' : record.status }}
                </Tag>
              </template>
            </template>
          </Table>
        </template>

        <Row v-else-if="activeTab === 'knowledge'" :gutter="[16, 16]">
          <Col :xs="24" :lg="9">
            <Card title="课程知识树" size="small">
              <Tree
                block-node
                default-expand-all
                :selected-keys="[selectedKnowledgeId]"
                :tree-data="knowledgeTree"
                @select="selectKnowledge"
              />
            </Card>
          </Col>
          <Col :xs="24" :lg="15">
            <Card
              v-if="selectedKnowledge"
              :title="selectedKnowledge.name"
              size="small"
            >
              <Descriptions bordered :column="1" size="small">
                <Descriptions.Item label="节点代码">
                  {{ selectedKnowledge.code }}
                </Descriptions.Item>
                <Descriptions.Item label="课程归属">
                  <Tag
                    v-for="courseId in selectedKnowledge.courseIds"
                    :key="courseId"
                  >
                    {{ courseName(courseId) }}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="别名">
                  {{ selectedKnowledge.aliases.join('、') || '无' }}
                </Descriptions.Item>
                <Descriptions.Item label="定义">
                  {{ selectedKnowledge.description }}
                </Descriptions.Item>
              </Descriptions>
              <div class="knowledge-coverage">
                <div>
                  <strong>题库覆盖</strong>
                  <span>{{ selectedKnowledgeCoverageText }}</span>
                </div>
                <Progress
                  :percent="
                    Math.min(
                      100,
                      Math.round(
                        (selectedKnowledgeItems.length /
                          Math.max(1, latestItemRevisions.length)) *
                          100,
                      ),
                    )
                  "
                  :show-info="false"
                />
              </div>
            </Card>
            <Empty v-else description="请选择一个知识节点" />
          </Col>
        </Row>

        <template v-else-if="activeTab === 'outcomes'">
          <Alert
            class="mb-4"
            show-icon
            type="success"
            message="能力与毕业要求采用可关联图谱"
            description="一个题目可同时支撑课程知识、能力指标与毕业要求，关系不被压缩到单一目录层级。"
          />
          <Table
            row-key="id"
            :columns="[
              { title: '指标', key: 'indicator', width: 260 },
              { title: '标准', dataIndex: 'schemeName', width: 150 },
              { title: '支持关系', key: 'relations' },
              { title: '题目覆盖', dataIndex: 'itemCount', width: 110 },
            ]"
            :data-source="outcomeRows"
            :pagination="false"
            :scroll="{ x: 760 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'indicator'">
                <Tag :color="record.scope === 'ability' ? 'purple' : 'gold'">
                  {{ scopeLabel(record.scope) }}
                </Tag>
                <strong>{{ record.name }}</strong>
                <div class="muted">
                  {{ record.code }} · {{ record.description }}
                </div>
              </template>
              <template v-else-if="column.key === 'relations'">
                <span v-if="record.incoming.length > 0">
                  由 {{ record.incoming.join('、') }} 支撑
                </span>
                <span v-if="record.outgoing.length > 0">
                  支撑 {{ record.outgoing.join('、') }}
                </span>
                <span
                  v-if="
                    record.incoming.length === 0 && record.outgoing.length === 0
                  "
                  class="muted"
                >
                  独立指标
                </span>
              </template>
            </template>
          </Table>
        </template>

        <template v-else>
          <Alert
            class="mb-4"
            show-icon
            type="warning"
            message="自由标签用于检索，不替代受控分类"
            description="标签字典由全校最新题目版本实时汇总，可观察跨课程、跨专业使用范围。"
          />
          <Table
            row-key="name"
            :columns="[
              { title: '标签', key: 'tag', width: 220 },
              { title: '题目数', dataIndex: 'itemCount', width: 100 },
              { title: '涉及课程', key: 'courses' },
              { title: '覆盖专业', dataIndex: 'majorCount', width: 110 },
            ]"
            :data-source="tagRows"
            :pagination="{ pageSize: 8 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'tag'">
                <Tag color="blue">{{ record.name }}</Tag>
              </template>
              <template v-else-if="column.key === 'courses'">
                {{ record.courseNames.join('、') || '未归属' }}
              </template>
            </template>
          </Table>
        </template>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.curriculum-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.curriculum-hero {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  color: #fff;
  background:
    radial-gradient(circle at 90% 20%, rgb(34 211 238 / 34%), transparent 28%),
    linear-gradient(125deg, #12304a, #0e7490);
  border-radius: 16px;
}

.curriculum-hero h1 {
  margin: 8px 0 4px;
  font-size: 26px;
  color: inherit;
}

.curriculum-hero p {
  max-width: 720px;
  margin: 0;
  line-height: 1.7;
  opacity: 0.8;
}

.curriculum-hero__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(80px, 1fr));
  gap: 14px;
  min-width: 420px;
  padding: 14px 18px;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 12px;
}

.curriculum-hero__stats :deep(.ant-statistic-title),
.curriculum-hero__stats :deep(.ant-statistic-content) {
  color: inherit;
}

.curriculum-workspace {
  min-height: 540px;
}

.muted {
  margin-top: 3px;
  font-size: 12px;
  color: hsl(var(--foreground) / 52%);
}

.knowledge-coverage {
  padding: 16px;
  margin-top: 16px;
  background: hsl(var(--accent) / 35%);
  border-radius: 10px;
}

.knowledge-coverage > div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

@media (max-width: 1100px) {
  .curriculum-hero {
    align-items: flex-start;
  }

  .curriculum-hero__stats {
    grid-template-columns: repeat(2, 1fr);
    min-width: 220px;
  }
}

@media (max-width: 760px) {
  .curriculum-hero {
    flex-direction: column;
  }

  .curriculum-hero__stats {
    width: 100%;
  }
}
</style>
