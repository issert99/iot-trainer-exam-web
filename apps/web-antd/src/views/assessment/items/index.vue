<script lang="ts" setup>
import type {
  AssessmentItemRevision,
  ItemRevisionStatus,
} from '../domain/types';
import type { ItemFacetQuery } from '../stores/classification';

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  message,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Timeline,
  Tree,
} from 'ant-design-vue';

import ClassificationPicker from '../components/ClassificationPicker.vue';
import FacetFilterBar from '../components/FacetFilterBar.vue';
import ItemStem from '../components/ItemStem.vue';
import {
  addItemClassifications,
  applySavedView,
  courseName,
  filteredItemRevisions,
  itemFacetQuery,
  latestItemRevisions,
  majorName,
  resetItemFacets,
  savedViews,
  taxonomyUsage,
} from '../stores/classification';
import { getItemFamily } from '../stores/item-bank';
import { schoolAssessmentState } from '../stores/state';

defineOptions({ name: 'AssessmentItems' });

type NavigationNode = {
  children?: NavigationNode[];
  key: string;
  title: string;
};

const router = useRouter();
const selectedItemId = ref(schoolAssessmentState.activeItemId);
const selectedRowKeys = ref<string[]>([]);
const activeScopeId = ref('school');
const activeViewId = ref('');
const batchOpen = ref(false);
const batchClassificationIds = ref<string[]>([]);

const statusOptions: Array<{
  label: string;
  value: ItemRevisionStatus;
}> = [
  { label: '草稿', value: 'draft' },
  { label: '待审核', value: 'review' },
  { label: '已批准', value: 'approved' },
  { label: '已发布', value: 'published' },
  { label: '已退回', value: 'rejected' },
  { label: '已暂停', value: 'suspended' },
  { label: '已退役', value: 'retired' },
];

const cognitiveOptions = [
  { label: '记忆', value: 'remember' },
  { label: '理解', value: 'understand' },
  { label: '应用', value: 'apply' },
  { label: '分析', value: 'analyze' },
  { label: '评价', value: 'evaluate' },
  { label: '创造', value: 'create' },
];

const difficultyOptions = [1, 2, 3, 4, 5].map((value) => ({
  label: `${value} 级`,
  value,
}));

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

const taxonomyOptions = computed(() =>
  taxonomyUsage.value.map((node) => ({
    label: `${node.schemeName} / ${node.name}（${node.itemCount}）`,
    value: node.id,
  })),
);

const interactionOptions = computed(() =>
  schoolAssessmentState.pluginPackages.map((plugin) => ({
    label: plugin.name,
    value: plugin.id,
  })),
);

const collegeScopes = computed(() =>
  schoolAssessmentState.organizationNodes
    .filter((node) => node.type === 'college')
    .map((node) => {
      const majorIds = schoolAssessmentState.majors
        .filter((major) => major.collegeId === node.id)
        .map((major) => major.id);
      return {
        count: latestItemRevisions.value.filter((item) =>
          item.metadata.applicability.majorIds.some((id) =>
            majorIds.includes(id),
          ),
        ).length,
        id: node.id,
        majorIds,
        name: node.name,
      };
    }),
);

const courseNavigation = computed<NavigationNode[]>(() =>
  schoolAssessmentState.courses.map((course) => {
    const nodes = schoolAssessmentState.taxonomyNodes.filter((node) =>
      node.courseIds.includes(course.id),
    );
    const itemCount = latestItemRevisions.value.filter(
      (item) =>
        item.metadata.ownership.primaryCourseId === course.id ||
        item.metadata.applicability.reusableCourseIds.includes(course.id),
    ).length;
    return {
      children: nodes.map((node) => ({
        key: `taxonomy:${node.id}`,
        title: `${node.name} · ${
          taxonomyUsage.value.find((entry) => entry.id === node.id)
            ?.itemCount ?? 0
        }`,
      })),
      key: `course:${course.id}`,
      title: `${course.name} · ${itemCount}`,
    };
  }),
);

const selectedItem = computed(() => {
  const visible = filteredItemRevisions.value;
  return visible.find((item) => item.id === selectedItemId.value) ?? visible[0];
});

watch(
  filteredItemRevisions,
  (items) => {
    if (!items.some((item) => item.id === selectedItemId.value)) {
      selectedItemId.value = items[0]?.id ?? '';
    }
    selectedRowKeys.value = selectedRowKeys.value.filter((id) =>
      items.some((item) => item.id === id),
    );
  },
  { immediate: true },
);

const selectedMajors = computed(() =>
  (selectedItem.value?.metadata.applicability.majorIds ?? [])
    .map((id) => schoolAssessmentState.majors.find((major) => major.id === id))
    .filter(Boolean),
);

const selectedTaxonomies = computed(() =>
  (selectedItem.value?.classification.taxonomyNodeIds ?? [])
    .map((id) =>
      schoolAssessmentState.taxonomyNodes.find((node) => node.id === id),
    )
    .filter(Boolean),
);

const selectedVersions = computed(() =>
  selectedItem.value ? getItemFamily(selectedItem.value.familyId) : [],
);

const selectedOrganizationName = computed(() => {
  const ownerId = selectedItem.value?.metadata.ownership.ownerOrgId;
  return (
    schoolAssessmentState.organizationNodes.find((node) => node.id === ownerId)
      ?.name ?? ownerId
  );
});

const selectedQualityScore = computed(() => {
  const quality = selectedItem.value?.metadata.quality;
  if (!quality || quality.sampleSize === 0) return 0;
  const discrimination = Math.max(0, quality.discrimination ?? 0) * 100;
  const sampleConfidence = Math.min(100, quality.sampleSize / 2);
  return Math.round(discrimination * 0.65 + sampleConfidence * 0.35);
});

const selectedReuseCourses = computed(() =>
  (selectedItem.value?.metadata.applicability.reusableCourseIds ?? [])
    .map((id) => courseName(id))
    .filter(Boolean),
);

const rowSelection = computed(() => ({
  onChange: (keys: Array<number | string>) => {
    selectedRowKeys.value = keys.map(String);
  },
  selectedRowKeys: selectedRowKeys.value,
}));

function statusLabel(status: ItemRevisionStatus) {
  return (
    statusOptions.find((option) => option.value === status)?.label ?? status
  );
}

function statusColor(status: ItemRevisionStatus) {
  return (
    {
      approved: 'cyan',
      draft: 'default',
      published: 'success',
      rejected: 'error',
      retired: 'default',
      review: 'processing',
      suspended: 'warning',
    }[status] ?? 'default'
  );
}

function cognitiveLabel(value: string) {
  return (
    cognitiveOptions.find((option) => option.value === value)?.label ?? value
  );
}

function channelLabel(value: string) {
  return (
    {
      online: '机考',
      practical: '实践',
      print: '纸笔',
    }[value] ?? value
  );
}

function channelModeLabel(value: string) {
  return (
    {
      equivalent: '等价',
      'examiner-recorded': '考官记录',
      native: '原生',
      unsupported: '不支持',
    }[value] ?? value
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function asItem(value: unknown) {
  return value as AssessmentItemRevision;
}

function pluginName(id: string) {
  return (
    schoolAssessmentState.pluginPackages.find((plugin) => plugin.id === id)
      ?.name ?? id
  );
}

function qualityPercent(item: AssessmentItemRevision) {
  if (item.metadata.quality.sampleSize === 0) return 0;
  return Math.min(
    100,
    Math.round(
      Math.max(0, item.metadata.quality.discrimination ?? 0) * 100 +
        Math.min(40, item.metadata.quality.sampleSize / 5),
    ),
  );
}

function selectItem(item: AssessmentItemRevision) {
  selectedItemId.value = item.id;
  schoolAssessmentState.activeItemId = item.id;
}

function itemRow(item: AssessmentItemRevision) {
  return {
    class: item.id === selectedItem.value?.id ? 'is-active-row' : '',
    onClick: () => selectItem(item),
  };
}

function updateFacetQuery(value: ItemFacetQuery) {
  Object.assign(itemFacetQuery, value);
  activeViewId.value = '';
  activeScopeId.value = 'school';
}

function clearFacets() {
  resetItemFacets();
  activeViewId.value = '';
  activeScopeId.value = 'school';
}

function selectSchoolScope() {
  clearFacets();
}

function selectCollegeScope(scope: (typeof collegeScopes.value)[number]) {
  resetItemFacets();
  itemFacetQuery.majorIds = [...scope.majorIds];
  activeScopeId.value = scope.id;
  activeViewId.value = '';
}

function selectSavedView(id: string) {
  applySavedView(id);
  activeViewId.value = id;
  activeScopeId.value = 'school';
}

function selectNavigation(keys: Array<number | string>) {
  const [key] = keys;
  if (!key) return;
  const [type, id = ''] = String(key).split(':');
  activeViewId.value = '';
  if (type === 'course') {
    itemFacetQuery.courseIds = [id];
    itemFacetQuery.taxonomyNodeIds = [];
  } else if (type === 'taxonomy') {
    const node = schoolAssessmentState.taxonomyNodes.find(
      (entry) => entry.id === id,
    );
    itemFacetQuery.taxonomyNodeIds = [id];
    itemFacetQuery.courseIds = node?.courseIds.slice(0, 1) ?? [];
  }
}

function openBatchClassification() {
  if (selectedRowKeys.value.length === 0) {
    message.info('请先选择需要批量分类的题目');
    return;
  }
  batchClassificationIds.value = [];
  batchOpen.value = true;
}

function applyBatchClassification() {
  if (batchClassificationIds.value.length === 0) {
    message.warning('请选择至少一个分类节点');
    return;
  }
  addItemClassifications(selectedRowKeys.value, batchClassificationIds.value);
  batchOpen.value = false;
  message.success(`已更新 ${selectedRowKeys.value.length} 个题目版本的分类`);
}

function openEditor(itemId?: string) {
  void router.push({
    path: '/assessment/items/editor',
    query: itemId ? { itemId } : undefined,
  });
}

function openReview() {
  void router.push('/assessment/items/review');
}
</script>

<template>
  <Page>
    <div class="item-bank-page">
      <section class="item-bank-heading">
        <div>
          <Tag color="blue">全校统一题库</Tag>
          <h1>{{ schoolAssessmentState.school.name }} · 全专业题库</h1>
          <p>
            统一保存题目家族与不可变版本，通过课程、专业和多套分类标准实现跨专业复用。
          </p>
        </div>
        <Space wrap>
          <Button @click="openReview">审核中心</Button>
          <Button type="primary" @click="openEditor()">新建题目</Button>
        </Space>
      </section>

      <div class="item-bank-layout">
        <aside class="item-bank-sidebar">
          <Card :bordered="false" size="small" title="题库范围">
            <button
              class="navigation-button"
              :class="{ 'is-active': activeScopeId === 'school' }"
              type="button"
              @click="selectSchoolScope"
            >
              <span>
                <strong>全校题库</strong>
                <small>{{ schoolAssessmentState.school.code }}</small>
              </span>
              <Tag>{{ latestItemRevisions.length }}</Tag>
            </button>
            <button
              v-for="scope in collegeScopes"
              :key="scope.id"
              class="navigation-button"
              :class="{ 'is-active': activeScopeId === scope.id }"
              type="button"
              @click="selectCollegeScope(scope)"
            >
              <span>{{ scope.name }}</span>
              <small>{{ scope.count }}</small>
            </button>
          </Card>

          <Card :bordered="false" size="small" title="保存的视图">
            <button
              v-for="view in savedViews"
              :key="view.id"
              class="navigation-button"
              :class="{ 'is-active': activeViewId === view.id }"
              type="button"
              @click="selectSavedView(view.id)"
            >
              <span>{{ view.name }}</span>
              <small>{{ view.count }}</small>
            </button>
          </Card>

          <Card :bordered="false" size="small" title="课程与知识导航">
            <Tree
              block-node
              default-expand-all
              :tree-data="courseNavigation"
              @select="selectNavigation"
            />
          </Card>
        </aside>

        <main class="item-bank-results">
          <Card :bordered="false">
            <div class="result-heading">
              <div>
                <strong>题目版本</strong>
                <span>
                  共 {{ filteredItemRevisions.length }} 个最新版本，已选
                  {{ selectedRowKeys.length }} 个
                </span>
              </div>
              <Space>
                <Button
                  :disabled="selectedRowKeys.length === 0"
                  @click="openBatchClassification"
                >
                  批量分类
                </Button>
                <Button type="primary" @click="openEditor()">命制新题</Button>
              </Space>
            </div>

            <FacetFilterBar
              class="mb-4"
              :cognitive-options="cognitiveOptions"
              :course-options="courseOptions"
              :difficulty-options="difficultyOptions"
              :interaction-options="interactionOptions"
              :major-options="majorOptions"
              :model-value="itemFacetQuery"
              :status-options="statusOptions"
              :taxonomy-options="taxonomyOptions"
              @reset="clearFacets"
              @update:model-value="updateFacetQuery"
            />

            <Table
              row-key="id"
              :columns="[
                { title: '题目', key: 'item', width: 300 },
                { title: '主课程', key: 'course', width: 150 },
                { title: '跨专业复用', key: 'reuse', width: 160 },
                { title: '难度', key: 'difficulty', width: 84 },
                { title: '质量', key: 'quality', width: 120 },
                { title: '状态', key: 'status', width: 100 },
              ]"
              :custom-row="itemRow"
              :data-source="filteredItemRevisions"
              :pagination="{ pageSize: 7, showSizeChanger: false }"
              :row-selection="rowSelection"
              :scroll="{ x: 900 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'item'">
                  <div class="item-cell">
                    <strong>{{ record.title }}</strong>
                    <span>
                      {{ record.id }} ·
                      {{ pluginName(record.interaction.pluginId) }}
                    </span>
                    <div>
                      <Tag
                        v-for="tag in record.classification.freeTags.slice(
                          0,
                          2,
                        )"
                        :key="tag"
                      >
                        {{ tag }}
                      </Tag>
                    </div>
                  </div>
                </template>
                <template v-else-if="column.key === 'course'">
                  {{ courseName(record.metadata.ownership.primaryCourseId) }}
                  <Tag
                    v-if="
                      schoolAssessmentState.courses.find(
                        (course) =>
                          course.id ===
                          record.metadata.ownership.primaryCourseId,
                      )?.sharedAcrossMajors
                    "
                    color="blue"
                  >
                    共享课
                  </Tag>
                </template>
                <template v-else-if="column.key === 'reuse'">
                  <div class="major-avatar-group">
                    <span
                      v-for="majorId in record.metadata.applicability.majorIds.slice(
                        0,
                        4,
                      )"
                      :key="majorId"
                      :title="majorName(majorId)"
                    >
                      {{ majorName(majorId)?.slice(0, 1) }}
                    </span>
                  </div>
                  <small>
                    {{ record.metadata.applicability.majorIds.length }} 个专业
                  </small>
                </template>
                <template v-else-if="column.key === 'difficulty'">
                  <Tag color="orange"> D{{ record.metadata.difficulty }} </Tag>
                </template>
                <template v-else-if="column.key === 'quality'">
                  <Progress
                    size="small"
                    :percent="qualityPercent(asItem(record))"
                    :show-info="false"
                  />
                  <small>
                    {{
                      record.metadata.quality.sampleSize
                        ? `${record.metadata.quality.sampleSize} 样本`
                        : '待采样'
                    }}
                  </small>
                </template>
                <template v-else-if="column.key === 'status'">
                  <Tag :color="statusColor(record.status)">
                    {{ statusLabel(record.status) }}
                  </Tag>
                </template>
              </template>
            </Table>
          </Card>
        </main>

        <aside class="item-bank-detail">
          <Card
            v-if="selectedItem"
            :bordered="false"
            class="detail-card"
            title="题目详情"
          >
            <template #extra>
              <Tag :color="statusColor(selectedItem.status)">
                {{ statusLabel(selectedItem.status) }}
              </Tag>
            </template>

            <div class="detail-title">
              <span>{{ selectedItem.id }}</span>
              <h2>{{ selectedItem.title }}</h2>
              <div class="detail-stem">
                <ItemStem :document="selectedItem.stem" />
              </div>
            </div>

            <Divider>归属与复用</Divider>
            <Descriptions :column="1" size="small">
              <Descriptions.Item label="归属单位">
                {{ selectedOrganizationName }}
              </Descriptions.Item>
              <Descriptions.Item label="主课程">
                {{
                  courseName(selectedItem.metadata.ownership.primaryCourseId)
                }}
              </Descriptions.Item>
              <Descriptions.Item label="维护团队">
                {{ selectedItem.metadata.ownership.maintainerTeam }}
              </Descriptions.Item>
              <Descriptions.Item label="校内可见性">
                {{
                  selectedItem.metadata.ownership.visibility === 'school'
                    ? '全校'
                    : selectedItem.metadata.ownership.visibility
                }}
              </Descriptions.Item>
            </Descriptions>

            <Alert
              class="reuse-alert"
              :type="selectedMajors.length > 1 ? 'success' : 'info'"
              show-icon
              :message="
                selectedMajors.length > 1
                  ? `已跨 ${selectedMajors.length} 个专业复用`
                  : '专业定向题目'
              "
              :description="selectedReuseCourses.join('、') || '仅用于主课程'"
            />
            <div class="reuse-major-list">
              <Tag
                v-for="major in selectedMajors"
                :key="major?.id"
                color="cyan"
              >
                {{ major?.name }}
              </Tag>
            </div>

            <Divider>分类画像</Divider>
            <div class="detail-section">
              <div>
                <span>认知层级</span>
                <Tag color="purple">
                  {{
                    cognitiveLabel(selectedItem.classification.cognitiveLevel)
                  }}
                </Tag>
              </div>
              <div>
                <span>受控分类</span>
                <div>
                  <Tag
                    v-for="node in selectedTaxonomies"
                    :key="node?.id"
                    color="blue"
                  >
                    {{ node?.name }}
                  </Tag>
                  <Tag v-if="selectedTaxonomies.length === 0" color="warning">
                    待补充
                  </Tag>
                </div>
              </div>
              <div>
                <span>自由标签</span>
                <div>
                  <Tag
                    v-for="tag in selectedItem.classification.freeTags"
                    :key="tag"
                  >
                    {{ tag }}
                  </Tag>
                </div>
              </div>
            </div>

            <Divider>质量与渠道</Divider>
            <div class="quality-overview">
              <Progress
                type="dashboard"
                :percent="selectedQualityScore"
                :width="78"
              />
              <div>
                <strong>质量置信度</strong>
                <span>
                  样本 {{ selectedItem.metadata.quality.sampleSize }} · 使用
                  {{ selectedItem.metadata.quality.usageCount }} 次
                </span>
                <span>
                  难度 p={{
                    selectedItem.metadata.quality.pValue?.toFixed(2) ?? '—'
                  }}
                  · 区分度
                  {{
                    selectedItem.metadata.quality.discrimination?.toFixed(2) ??
                    '—'
                  }}
                </span>
              </div>
            </div>
            <div class="channel-tags">
              <Tag
                v-for="variant in selectedItem.channelVariants"
                :key="variant.channel"
                :color="variant.mode === 'unsupported' ? 'error' : 'green'"
              >
                {{ channelLabel(variant.channel) }} ·
                {{ channelModeLabel(variant.mode) }}
              </Tag>
            </div>

            <Divider>版本链</Divider>
            <Timeline
              :items="
                selectedVersions.map((version) => ({
                  children: `v${version.revision} · ${statusLabel(
                    version.status,
                  )} · ${formatDate(version.createdAt)}`,
                  color:
                    version.id === selectedItem?.id
                      ? 'blue'
                      : version.status === 'published'
                        ? 'green'
                        : 'gray',
                }))
              "
            />

            <Space class="detail-actions">
              <Button block type="primary" @click="openEditor(selectedItem.id)">
                编辑为新版本
              </Button>
              <Button block @click="openReview">进入审核</Button>
            </Space>
          </Card>
          <Card v-else :bordered="false">
            <Empty description="没有符合条件的题目" />
          </Card>
        </aside>
      </div>
    </div>

    <Modal
      v-model:open="batchOpen"
      title="批量添加受控分类"
      ok-text="应用到所选题目"
      width="680px"
      @ok="applyBatchClassification"
    >
      <Alert
        class="mb-4"
        show-icon
        type="info"
        :message="`将更新 ${selectedRowKeys.length} 个最新题目版本`"
        description="只追加分类节点，不会移除题目已有分类。"
      />
      <ClassificationPicker
        v-model="batchClassificationIds"
        :nodes="schoolAssessmentState.taxonomyNodes"
        :schemes="schoolAssessmentState.taxonomySchemes"
      />
    </Modal>
  </Page>
</template>

<style scoped>
.item-bank-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.item-bank-heading {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.item-bank-heading h1 {
  margin: 8px 0 4px;
  font-size: 25px;
}

.item-bank-heading p {
  margin: 0;
  color: hsl(var(--foreground) / 58%);
}

.item-bank-layout {
  display: grid;
  grid-template-columns: 228px minmax(600px, 1fr) 332px;
  gap: 14px;
  align-items: start;
}

.item-bank-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.navigation-button {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 9px 10px;
  margin: 2px 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.navigation-button:hover,
.navigation-button.is-active {
  color: hsl(var(--primary));
  background: hsl(var(--accent));
}

.navigation-button > span {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.navigation-button small {
  color: hsl(var(--foreground) / 48%);
}

.result-heading {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.result-heading > div {
  display: flex;
  flex-direction: column;
}

.result-heading span,
.item-cell > span,
.quality-overview span {
  font-size: 12px;
  color: hsl(var(--foreground) / 50%);
}

.item-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.major-avatar-group {
  display: flex;
  padding-left: 6px;
  margin-bottom: 3px;
}

.major-avatar-group span {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  margin-left: -6px;
  font-size: 11px;
  color: #fff;
  background: #0891b2;
  border: 2px solid hsl(var(--background));
  border-radius: 50%;
}

.item-bank-results :deep(.is-active-row > td) {
  background: hsl(var(--primary) / 7%) !important;
}

.item-bank-results :deep(.ant-table-row) {
  cursor: pointer;
}

.detail-card {
  position: sticky;
  top: 14px;
}

.detail-title > span {
  font-size: 11px;
  color: hsl(var(--foreground) / 45%);
}

.detail-title h2 {
  margin: 5px 0 10px;
  font-size: 18px;
}

.detail-stem {
  max-height: 118px;
  padding: 10px;
  overflow: auto;
  background: hsl(var(--accent) / 35%);
  border-radius: 8px;
}

.reuse-alert {
  margin-top: 12px;
}

.reuse-major-list,
.channel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 10px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-section > div {
  display: grid;
  grid-template-columns: 74px 1fr;
  gap: 8px;
  align-items: start;
}

.detail-section > div > span {
  font-size: 12px;
  color: hsl(var(--foreground) / 52%);
}

.quality-overview {
  display: flex;
  gap: 12px;
  align-items: center;
}

.quality-overview > div {
  display: flex;
  flex-direction: column;
}

.detail-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  margin-top: 4px;
}

@media (max-width: 1500px) {
  .item-bank-layout {
    grid-template-columns: 220px minmax(560px, 1fr);
  }

  .item-bank-detail {
    grid-column: 1 / -1;
  }

  .detail-card {
    position: static;
  }
}

@media (max-width: 900px) {
  .item-bank-layout {
    grid-template-columns: 1fr;
  }

  .item-bank-sidebar,
  .item-bank-results,
  .item-bank-detail {
    grid-column: auto;
  }

  .item-bank-heading {
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .item-bank-heading,
  .result-heading {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
