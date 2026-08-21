<script lang="ts" setup>
import type {
  AssessmentItemRevision,
  DeliveryChannel,
} from '../../domain/types';

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
  Input,
  message,
  Progress,
  Space,
  Statistic,
  Tabs,
  Tag,
} from 'ant-design-vue';

import ItemStem from '../../components/ItemStem.vue';
import {
  courseName,
  majorName,
  taxonomyName,
} from '../../stores/classification';
import {
  getItemFamily,
  itemReviewQueue,
  reviewItem,
} from '../../stores/item-bank';
import { schoolAssessmentState } from '../../stores/state';

defineOptions({ name: 'AssessmentItemReview' });

type ReviewTab = 'rejected' | 'review';

const router = useRouter();
const activeTab = ref<ReviewTab>('review');
const selectedItemId = ref('');
const reviewComment = ref('');

const pendingItems = computed(() =>
  itemReviewQueue.value.filter((item) => item.status === 'review'),
);
const rejectedItems = computed(() =>
  itemReviewQueue.value.filter((item) => item.status === 'rejected'),
);
const visibleQueue = computed(() =>
  activeTab.value === 'review' ? pendingItems.value : rejectedItems.value,
);
const tabItems = computed(() => [
  { key: 'review', label: `待审核 ${pendingItems.value.length}` },
  { key: 'rejected', label: `已退回 ${rejectedItems.value.length}` },
]);

const selectedItem = computed(
  () =>
    visibleQueue.value.find((item) => item.id === selectedItemId.value) ??
    visibleQueue.value[0],
);

watch(
  [activeTab, visibleQueue],
  () => {
    if (!visibleQueue.value.some((item) => item.id === selectedItemId.value)) {
      selectedItemId.value = visibleQueue.value[0]?.id ?? '';
    }
    reviewComment.value = '';
  },
  { immediate: true },
);

const selectedFamily = computed(() =>
  selectedItem.value ? getItemFamily(selectedItem.value.familyId) : [],
);

const previousRevision = computed(() => {
  const current = selectedItem.value;
  if (!current) return undefined;
  return selectedFamily.value.find((item) => item.revision < current.revision);
});

function itemStemText(item: AssessmentItemRevision | undefined) {
  return (
    item?.stem.blocks
      .map((block) =>
        String(block.data.text ?? block.data.source ?? block.data.label ?? ''),
      )
      .join('\n') ?? ''
  );
}

function classificationText(item: AssessmentItemRevision | undefined) {
  return (
    item?.classification.taxonomyNodeIds
      .map((id) => taxonomyName(id))
      .filter(Boolean)
      .join('、') || '未分类'
  );
}

function majorText(item: AssessmentItemRevision | undefined) {
  return (
    item?.metadata.applicability.majorIds
      .map((id) => majorName(id))
      .filter(Boolean)
      .join('、') || '未声明'
  );
}

const diffRows = computed(() => {
  const current = selectedItem.value;
  const previous = previousRevision.value;
  if (!current) return [];
  const rows = [
    {
      current: current.title,
      field: '题目标题',
      previous: previous?.title ?? '新题家族',
    },
    {
      current: itemStemText(current),
      field: '题干内容',
      previous: itemStemText(previous) || '无',
    },
    {
      current: current.interaction.pluginId,
      field: '答题交互',
      previous: previous?.interaction.pluginId ?? '无',
    },
    {
      current: `${current.maxScore} 分`,
      field: '最大分值',
      previous: previous ? `${previous.maxScore} 分` : '无',
    },
    {
      current: courseName(current.metadata.ownership.primaryCourseId) ?? '无',
      field: '主课程',
      previous:
        courseName(previous?.metadata.ownership.primaryCourseId ?? '') ?? '无',
    },
    {
      current: majorText(current),
      field: '适用专业',
      previous: majorText(previous),
    },
    {
      current: classificationText(current),
      field: '受控分类',
      previous: classificationText(previous),
    },
  ];
  return rows.map((row) => ({
    ...row,
    changed: row.current !== row.previous,
  }));
});

const classificationChecks = computed(() => {
  const item = selectedItem.value;
  if (!item) return [];
  const classifiedNodes = item.classification.taxonomyNodeIds
    .map((id) =>
      schoolAssessmentState.taxonomyNodes.find((node) => node.id === id),
    )
    .filter(Boolean);
  const scopes = new Set(
    classifiedNodes
      .map(
        (node) =>
          schoolAssessmentState.taxonomySchemes.find(
            (scheme) => scheme.id === node?.schemeId,
          )?.scope,
      )
      .filter(Boolean),
  );
  const primaryCourse = schoolAssessmentState.courses.find(
    (course) => course.id === item.metadata.ownership.primaryCourseId,
  );
  return [
    {
      detail: primaryCourse?.name ?? '主课程不存在',
      label: '主课程归属',
      passed: Boolean(primaryCourse),
      required: true,
    },
    {
      detail: `${item.metadata.applicability.majorIds.length} 个适用专业`,
      label: '适用范围',
      passed: item.metadata.applicability.majorIds.length > 0,
      required: true,
    },
    {
      detail: `${classifiedNodes.length} 个受控节点`,
      label: '受控分类',
      passed: classifiedNodes.length > 0,
      required: true,
    },
    {
      detail: scopes.has('knowledge') ? '已关联课程知识' : '建议补充知识节点',
      label: '知识覆盖',
      passed: scopes.has('knowledge'),
      required: false,
    },
  ];
});

const classificationPercent = computed(() => {
  if (classificationChecks.value.length === 0) return 0;
  return Math.round(
    (classificationChecks.value.filter((check) => check.passed).length /
      classificationChecks.value.length) *
      100,
  );
});

const channels: DeliveryChannel[] = ['online', 'print', 'practical'];

function channelCheckDetail(capability: boolean, mode: string | undefined) {
  if (!capability) return '交互包未声明支持';
  return mode ? modeLabel(mode) : '缺少渠道变体';
}

const channelChecks = computed(() => {
  const item = selectedItem.value;
  if (!item) return [];
  const plugin = schoolAssessmentState.pluginPackages.find(
    (entry) => entry.id === item.interaction.pluginId,
  );
  return channels.map((channel) => {
    const variant = item.channelVariants.find(
      (entry) => entry.channel === channel,
    );
    const capability = plugin?.capabilities[channel] ?? false;
    const passed =
      capability && Boolean(variant) && variant?.mode !== 'unsupported';
    return {
      channel,
      detail: channelCheckDetail(capability, variant?.mode),
      label: channelLabel(channel),
      passed,
    };
  });
});

const canApprove = computed(
  () =>
    selectedItem.value?.status === 'review' &&
    classificationChecks.value.every(
      (check) => !check.required || check.passed,
    ),
);

function channelLabel(value: DeliveryChannel) {
  return {
    online: '机考',
    practical: '实践',
    print: '纸笔',
  }[value];
}

function modeLabel(value: string) {
  return (
    {
      equivalent: '等价变体',
      'examiner-recorded': '考官记录',
      native: '原生呈现',
      unsupported: '不支持',
    }[value] ?? value
  );
}

function pluginName(id: string) {
  return (
    schoolAssessmentState.pluginPackages.find((plugin) => plugin.id === id)
      ?.name ?? id
  );
}

function checkStatusLabel(check: { passed: boolean; required: boolean }) {
  if (check.passed) return '通过';
  return check.required ? '待补' : '建议';
}

function selectItem(item: AssessmentItemRevision) {
  selectedItemId.value = item.id;
  reviewComment.value = '';
}

function approve() {
  const item = selectedItem.value;
  if (!item) return;
  if (!canApprove.value) {
    message.warning('请先补齐必需分类信息');
    return;
  }
  try {
    reviewItem(
      item.id,
      'approve',
      reviewComment.value.trim() || '分类、渠道与版本差异检查通过',
    );
    message.success(`${item.id} 已批准`);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '批准失败');
  }
}

function reject() {
  const item = selectedItem.value;
  if (!item) return;
  if (!reviewComment.value.trim()) {
    message.warning('退回时必须填写修改意见');
    return;
  }
  try {
    reviewItem(item.id, 'reject', reviewComment.value.trim());
    message.success(`${item.id} 已退回命题人`);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '退回失败');
  }
}

function editSelected() {
  if (!selectedItem.value) return;
  void router.push({
    path: '/assessment/items/editor',
    query: { itemId: selectedItem.value.id },
  });
}

function backToItems() {
  void router.push('/assessment/items');
}
</script>

<template>
  <Page>
    <div class="review-page">
      <section class="review-heading">
        <div>
          <Tag color="gold">校级审核中心</Tag>
          <h1>题目审核</h1>
          <p>集中核验分类完整性、交付渠道与版本差异，再决定批准或退回。</p>
        </div>
        <Space>
          <Button @click="backToItems">返回题库</Button>
          <Button :disabled="!selectedItem" @click="editSelected">
            编辑为新版本
          </Button>
        </Space>
      </section>

      <div class="review-summary">
        <Card :bordered="false">
          <Statistic title="待审核" :value="pendingItems.length" suffix="题" />
        </Card>
        <Card :bordered="false">
          <Statistic title="已退回" :value="rejectedItems.length" suffix="题" />
        </Card>
        <Card :bordered="false">
          <Statistic
            title="审核队列覆盖课程"
            :value="
              new Set(
                itemReviewQueue.map(
                  (item) => item.metadata.ownership.primaryCourseId,
                ),
              ).size
            "
            suffix="门"
          />
        </Card>
      </div>

      <div class="review-layout">
        <aside class="review-queue">
          <Card :bordered="false">
            <Tabs
              v-model:active-key="activeTab"
              :items="tabItems"
              size="small"
            />
            <div v-if="visibleQueue.length > 0" class="queue-list">
              <button
                v-for="item in visibleQueue"
                :key="item.id"
                class="queue-item"
                :class="{ 'is-active': item.id === selectedItem?.id }"
                type="button"
                @click="selectItem(item)"
              >
                <span>
                  <strong>{{ item.title }}</strong>
                  <small>
                    {{ courseName(item.metadata.ownership.primaryCourseId) }}
                    · v{{ item.revision }}
                  </small>
                </span>
                <Tag :color="item.status === 'review' ? 'blue' : 'red'">
                  {{ item.status === 'review' ? '待审' : '退回' }}
                </Tag>
              </button>
            </div>
            <Empty v-else description="当前队列为空" />
          </Card>
        </aside>

        <main v-if="selectedItem" class="review-content">
          <Card :bordered="false" title="审核内容">
            <template #extra>
              <Tag color="blue">{{ selectedItem.id }}</Tag>
            </template>
            <h2>{{ selectedItem.title }}</h2>
            <div class="review-stem">
              <ItemStem :document="selectedItem.stem" />
            </div>
            <Descriptions class="mt-4" :column="2" size="small">
              <Descriptions.Item label="主课程">
                {{
                  courseName(selectedItem.metadata.ownership.primaryCourseId)
                }}
              </Descriptions.Item>
              <Descriptions.Item label="答题交互">
                {{ pluginName(selectedItem.interaction.pluginId) }}
              </Descriptions.Item>
              <Descriptions.Item label="适用专业">
                {{ majorText(selectedItem) }}
              </Descriptions.Item>
              <Descriptions.Item label="分值 / 难度">
                {{ selectedItem.maxScore }} 分 · D{{
                  selectedItem.metadata.difficulty
                }}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card :bordered="false" title="版本差异">
            <template #extra>
              <span class="muted">
                {{
                  previousRevision
                    ? `对比 v${previousRevision.revision}`
                    : '题目家族首版'
                }}
              </span>
            </template>
            <div class="diff-list">
              <article
                v-for="row in diffRows"
                :key="row.field"
                :class="{ 'is-changed': row.changed }"
              >
                <header>
                  <strong>{{ row.field }}</strong>
                  <Tag :color="row.changed ? 'orange' : 'default'">
                    {{ row.changed ? '有变化' : '未变化' }}
                  </Tag>
                </header>
                <div>
                  <span>上一版</span>
                  <p>{{ row.previous }}</p>
                </div>
                <div>
                  <span>当前版</span>
                  <p>{{ row.current }}</p>
                </div>
              </article>
            </div>
          </Card>
        </main>

        <aside v-if="selectedItem" class="review-checks">
          <Card :bordered="false" size="small" title="分类完整性">
            <div class="check-progress">
              <Progress
                type="circle"
                :percent="classificationPercent"
                :width="74"
              />
              <span>
                <strong>{{ classificationPercent }}%</strong>
                <small>必需分类完成度</small>
              </span>
            </div>
            <div class="check-list">
              <div v-for="check in classificationChecks" :key="check.label">
                <Tag :color="check.passed ? 'success' : 'warning'">
                  {{ checkStatusLabel(check) }}
                </Tag>
                <span>
                  <strong>{{ check.label }}</strong>
                  <small>{{ check.detail }}</small>
                </span>
              </div>
            </div>
          </Card>

          <Card :bordered="false" size="small" title="渠道检查">
            <div class="check-list">
              <div v-for="check in channelChecks" :key="check.channel">
                <Tag :color="check.passed ? 'success' : 'default'">
                  {{ check.passed ? '可交付' : '不可用' }}
                </Tag>
                <span>
                  <strong>{{ check.label }}</strong>
                  <small>{{ check.detail }}</small>
                </span>
              </div>
            </div>
            <Alert
              class="mt-3"
              show-icon
              type="info"
              message="渠道不支持不阻断审核"
              description="题目可限定用于受支持渠道，组卷时会再次执行兼容性校验。"
            />
          </Card>

          <Card :bordered="false" size="small" title="审核结论">
            <Alert
              v-if="selectedItem.status === 'rejected'"
              class="mb-3"
              show-icon
              type="warning"
              message="该版本已退回"
              :description="selectedItem.reviewComment || '未填写退回说明'"
            />
            <template v-else>
              <Input.TextArea
                v-model:value="reviewComment"
                :rows="4"
                placeholder="填写审核意见；退回时为必填"
              />
              <Divider />
              <Space class="decision-actions">
                <Button danger block @click="reject">退回修改</Button>
                <Button
                  block
                  type="primary"
                  :disabled="!canApprove"
                  @click="approve"
                >
                  批准版本
                </Button>
              </Space>
            </template>
          </Card>
        </aside>

        <Card v-if="!selectedItem" :bordered="false" class="review-empty">
          <Empty description="请选择一个待审核题目" />
        </Card>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.review-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-heading {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.review-heading h1 {
  margin: 8px 0 4px;
  font-size: 25px;
}

.review-heading p {
  margin: 0;
  color: hsl(var(--foreground) / 58%);
}

.review-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.review-layout {
  display: grid;
  grid-template-columns: 252px minmax(520px, 1fr) 320px;
  gap: 14px;
  align-items: start;
}

.review-queue,
.review-checks {
  position: sticky;
  top: 14px;
}

.queue-list,
.review-content,
.review-checks {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.queue-item {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 11px;
  margin-bottom: 5px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
}

.queue-item:hover,
.queue-item.is-active {
  background: hsl(var(--accent));
  border-color: hsl(var(--primary) / 24%);
}

.queue-item > span {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.queue-item strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-item small,
.muted {
  margin-top: 3px;
  color: hsl(var(--foreground) / 50%);
}

.review-content h2 {
  margin: 0 0 14px;
}

.review-stem {
  padding: 16px;
  background: hsl(var(--accent) / 30%);
  border-radius: 10px;
}

.diff-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.diff-list article {
  display: grid;
  grid-template-columns: 120px 1fr 1fr;
  gap: 12px;
  padding: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.diff-list article.is-changed {
  background: hsl(var(--accent) / 24%);
  border-color: hsl(var(--primary) / 20%);
}

.diff-list header,
.diff-list article > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.diff-list article span {
  font-size: 11px;
  color: hsl(var(--foreground) / 48%);
}

.diff-list article p {
  max-height: 84px;
  margin: 0;
  overflow: auto;
  line-height: 1.65;
  white-space: pre-wrap;
}

.check-progress {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 4px 0 14px;
}

.check-progress > span,
.check-list span {
  display: flex;
  flex-direction: column;
}

.check-progress small,
.check-list small {
  color: hsl(var(--foreground) / 50%);
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.check-list > div {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.decision-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
}

.review-empty {
  grid-column: 2 / -1;
  min-height: 360px;
}

@media (max-width: 1350px) {
  .review-layout {
    grid-template-columns: 240px minmax(520px, 1fr);
  }

  .review-checks {
    position: static;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-column: 1 / -1;
  }
}

@media (max-width: 850px) {
  .review-layout {
    grid-template-columns: 1fr;
  }

  .review-queue,
  .review-checks {
    position: static;
    grid-column: auto;
  }

  .review-checks {
    display: flex;
  }

  .diff-list article {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .review-heading {
    flex-direction: column;
    align-items: stretch;
  }

  .review-summary {
    grid-template-columns: 1fr;
  }
}
</style>
