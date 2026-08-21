<script lang="ts" setup>
import type { ResultAppeal, ScoreRecord, ScoreStatus } from '../domain/types';

import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  InputNumber,
  message,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
} from 'ant-design-vue';

import ItemStem from '../components/ItemStem.vue';
import { checksum } from '../domain/integrity';
import {
  attemptScoreSummary,
  createScoreCorrection,
  ensureAttemptScoreRecords,
  finalizeAttemptScore,
  moderateScore,
  publishAttemptResult,
  recordFirstMark,
  recordSecondMark,
  resolveAppeal,
} from '../stores/scoring';
import { schoolAssessmentState } from '../stores/state';

defineOptions({ name: 'AssessmentScoring' });

type ScoreDraft = {
  first: number;
  firstComment: string;
  moderation: number;
  moderationComment: string;
  second: number;
  secondComment: string;
};

const route = useRoute();
const activeTab = ref('tasks');
const scoreDrafts = reactive<Record<string, ScoreDraft>>({});
const appealDrafts = reactive<Record<string, string>>({});
const correctionRecordId = ref('');
const correctionScore = ref<number>();
const correctionReason = ref('');
const attempts = computed(() =>
  schoolAssessmentState.attempts.filter((attempt) =>
    ['published', 'reviewed', 'scored', 'scoring', 'submitted'].includes(
      attempt.status,
    ),
  ),
);
const selectedAttemptId = ref(
  String(
    route.query.attemptId ??
      attempts.value.find((attempt) => attempt.id === 'attempt-demo-submitted')
        ?.id ??
      attempts.value[0]?.id ??
      '',
  ),
);
const selectedAttempt = computed(() =>
  attempts.value.find((attempt) => attempt.id === selectedAttemptId.value),
);
const selectedForm = computed(() =>
  schoolAssessmentState.forms.find(
    (form) => form.id === selectedAttempt.value?.testFormRevisionId,
  ),
);
const records = computed(() =>
  schoolAssessmentState.scoreRecords
    .filter((record) => record.attemptId === selectedAttemptId.value)
    .toSorted((left, right) => {
      if (left.id === 'score-material') return -1;
      if (right.id === 'score-material') return 1;
      return left.itemRevisionId.localeCompare(right.itemRevisionId);
    }),
);
const automaticRecords = computed(() =>
  records.value.filter((record) => record.method === 'automatic'),
);
const humanRecords = computed(() =>
  records.value.filter((record) => record.method !== 'automatic'),
);
const firstMarkRecords = computed(() =>
  humanRecords.value.filter((record) =>
    ['assigned', 'manual-required'].includes(record.status),
  ),
);
const secondMarkRecords = computed(() =>
  humanRecords.value.filter(
    (record) =>
      record.firstScore !== undefined && record.status === 'first-marked',
  ),
);
const moderationRecords = computed(() =>
  records.value.filter((record) => record.status === 'moderation-required'),
);
const selectedAppeals = computed(() =>
  schoolAssessmentState.appeals.filter(
    (appeal) => appeal.attemptId === selectedAttemptId.value,
  ),
);
const correctableRecords = computed(() =>
  records.value.filter(
    (record) => record.status === 'final' && !record.supersededByRecordId,
  ),
);
const correctionRecordOptions = computed(() =>
  correctableRecords.value.map((record) => ({
    label: `${itemFor(record.itemRevisionId)?.title ?? record.itemRevisionId} · ${record.awardedScore}/${record.maxScore}`,
    value: record.id,
  })),
);
const summary = computed(() => attemptScoreSummary(selectedAttemptId.value));
const completion = computed(() => {
  if (records.value.length === 0) return 0;
  const done = records.value.filter((record) =>
    ['automatic', 'final', 'second-marked'].includes(record.status),
  ).length;
  return Math.round((done / records.value.length) * 100);
});
const readyForReview = computed(
  () =>
    records.value.length > 0 &&
    records.value.every((record) =>
      ['automatic', 'final', 'second-marked'].includes(record.status),
    ),
);
const attemptOptions = computed(() =>
  attempts.value.map((attempt) => ({
    label: `匿名答卷 ${anonymousCode(attempt.candidateId)} · ${attempt.status}`,
    value: attempt.id,
  })),
);

const scoreStatusMeta: Record<ScoreStatus, { color: string; label: string }> = {
  assigned: { color: 'default', label: '待一评' },
  automatic: { color: 'blue', label: '自动评分' },
  final: { color: 'success', label: '已终审' },
  'first-marked': { color: 'processing', label: '一评完成' },
  'manual-required': { color: 'warning', label: '待人工评分' },
  'moderation-required': { color: 'error', label: '待仲裁' },
  'second-marked': { color: 'cyan', label: '二评完成' },
};

watch(
  selectedAttemptId,
  (id) => {
    if (!id) return;
    try {
      ensureAttemptScoreRecords(id);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '无法生成评分任务',
      );
    }
  },
  { immediate: true },
);

watch(
  correctableRecords,
  (items) => {
    if (!items.some((record) => record.id === correctionRecordId.value)) {
      correctionRecordId.value = items[0]?.id ?? '';
      correctionScore.value = items[0]?.awardedScore;
    }
  },
  { immediate: true },
);

watch(
  records,
  (items) => {
    items.forEach((record) => {
      const first = record.firstScore ?? record.awardedScore;
      const second =
        record.secondScore ?? Math.max(0, Math.round((first - 3) * 10) / 10);
      scoreDrafts[record.id] ??= {
        first,
        firstComment:
          record.id === 'score-material'
            ? '应力计算正确，强度判断与分析依据符合量规。'
            : '依据匿名量规完成一评。',
        moderation: Math.round(((first + second) / 2) * 10) / 10,
        moderationComment: '复核原始作答、量规命中项与双评分差后裁定。',
        second,
        secondComment:
          record.id === 'score-material'
            ? '分析说明证据不足，与一评分差超过阈值。'
            : '独立完成二评并记录量规依据。',
      };
    });
  },
  { immediate: true },
);

watch(
  () => schoolAssessmentState.appeals,
  (items) => {
    items.forEach((appeal) => {
      appealDrafts[appeal.id] ??= '已复核原始答卷、评分记录与审计证据。';
    });
  },
  { deep: true, immediate: true },
);

function anonymousCode(candidateId: string) {
  return checksum(candidateId).slice(-8).toUpperCase();
}

function itemFor(itemRevisionId: string) {
  return selectedForm.value?.sections
    .flatMap((section) => section.items)
    .find((entry) => entry.itemRevision.id === itemRevisionId)?.itemRevision;
}

function responseFor(itemRevisionId: string) {
  const value = selectedAttempt.value?.responses[itemRevisionId]?.value;
  return value === undefined ? '未采集到响应' : JSON.stringify(value, null, 2);
}

function statusInfo(value: unknown) {
  return (
    scoreStatusMeta[String(value) as ScoreStatus] ?? scoreStatusMeta.assigned
  );
}

function statusLabel(status: ScoreStatus) {
  return statusInfo(status).label;
}

function submitFirst(record: ScoreRecord) {
  const draft = scoreDrafts[record.id];
  if (!draft) return;
  try {
    recordFirstMark(
      record.id,
      draft.first,
      draft.firstComment,
      'anonymous-marker-A',
    );
    activeTab.value = 'second';
    message.success('匿名一评已提交，评分人身份仅在审计链中可见');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '一评提交失败');
  }
}

function submitSecond(record: ScoreRecord) {
  const draft = scoreDrafts[record.id];
  if (!draft) return;
  try {
    recordSecondMark(
      record.id,
      draft.second,
      draft.secondComment,
      'anonymous-marker-B',
    );
    if (record.status === 'moderation-required') {
      activeTab.value = 'moderation';
      message.warning('双评分差超过阈值，任务已自动转入仲裁');
    } else {
      message.success('二评已完成，双评分差在允许范围内');
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '二评提交失败');
  }
}

function submitModeration(record: ScoreRecord) {
  const draft = scoreDrafts[record.id];
  if (!draft) return;
  try {
    moderateScore(
      record.id,
      draft.moderation,
      draft.moderationComment,
      'chief-moderator',
    );
    message.success('仲裁分已冻结，证据说明已追加到评分链');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '仲裁提交失败');
  }
}

function finalizeResult() {
  try {
    finalizeAttemptScore(selectedAttemptId.value);
    message.success('成绩已完成复核并冻结');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '成绩复核失败');
  }
}

function publishResult() {
  try {
    publishAttemptResult(selectedAttemptId.value);
    message.success('成绩已发布到考生端，审计记录已写入');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '成绩发布失败');
  }
}

function selectCorrectionRecord(value: unknown) {
  correctionRecordId.value = String(value);
  correctionScore.value = correctableRecords.value.find(
    (record) => record.id === correctionRecordId.value,
  )?.awardedScore;
}

function submitCorrection() {
  if (!correctionRecordId.value || correctionScore.value === undefined) {
    message.warning('请选择评分记录并填写更正分数');
    return;
  }
  if (!correctionReason.value.trim()) {
    message.warning('成绩更正必须填写依据');
    return;
  }
  try {
    const correction = createScoreCorrection(
      correctionRecordId.value,
      correctionScore.value,
      correctionReason.value.trim(),
    );
    correctionRecordId.value = correction.id;
    correctionReason.value = '';
    message.success('已创建新的更正记录，原评分证据未被覆盖');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '成绩更正失败');
  }
}

function handleAppeal(appeal: ResultAppeal, accepted: boolean) {
  try {
    resolveAppeal(appeal.id, appealDrafts[appeal.id] ?? '完成复核', accepted);
    message.success(accepted ? '申诉已受理并记录处理意见' : '申诉已驳回');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '申诉处理失败');
  }
}

function evidenceTimeline(record: ScoreRecord) {
  const items: Array<{ children: string; color: string }> = [
    {
      children: `评分任务生成 · 算法/量规版本 ${record.algorithmVersion}`,
      color: 'blue',
    },
    ...record.evidence.map((entry) => ({
      children: entry,
      color: 'gray',
    })),
  ];
  if (record.firstScore !== undefined) {
    items.push({
      children: `匿名一评：${record.firstScore} / ${record.maxScore}`,
      color: 'blue',
    });
  }
  if (record.secondScore !== undefined) {
    items.push({
      children: `匿名二评：${record.secondScore} / ${record.maxScore}`,
      color: record.status === 'moderation-required' ? 'red' : 'green',
    });
  }
  if (record.method === 'moderated') {
    items.push({
      children: `仲裁终分：${record.awardedScore} / ${record.maxScore}`,
      color: 'green',
    });
  }
  if (record.supersedesRecordId) {
    items.push({
      children: `更正自评分记录 ${record.supersedesRecordId}`,
      color: 'orange',
    });
  }
  if (record.supersededByRecordId) {
    items.push({
      children: `已由更正记录 ${record.supersededByRecordId} 取代`,
      color: 'orange',
    });
  }
  schoolAssessmentState.auditRecords
    .filter((audit) => audit.resourceId === record.id)
    .forEach((audit) => {
      items.push({
        children: `${audit.action} · ${audit.actorId} · ${audit.chainHash.slice(
          0,
          12,
        )}`,
        color: 'green',
      });
    });
  return items;
}
</script>

<template>
  <Page>
    <div class="scoring-page">
      <section class="heading">
        <div>
          <Tag color="orange">双评与仲裁</Tag>
          <h1>评分、复核与成绩发布</h1>
          <p>
            自动评分保留算法版本，主观题执行匿名一评、独立二评和超差仲裁，随后复核发布并受理申诉。
          </p>
        </div>
        <Select
          v-model:value="selectedAttemptId"
          class="attempt-select"
          :options="attemptOptions"
          placeholder="选择待评分答卷"
        />
      </section>

      <Alert
        v-if="!selectedAttempt"
        show-icon
        type="info"
        message="暂无已提交答卷"
        description="请先从考试中心进入考生端并提交答卷。"
      />

      <template v-else>
        <Row :gutter="[16, 16]">
          <Col :xs="12" :xl="6">
            <Card :bordered="false">
              <Statistic
                title="当前得分"
                :value="summary.awarded"
                :suffix="`/ ${summary.maximum}`"
              />
            </Card>
          </Col>
          <Col :xs="12" :xl="6">
            <Card :bordered="false">
              <Statistic title="自动评分" :value="automaticRecords.length" />
            </Card>
          </Col>
          <Col :xs="12" :xl="6">
            <Card :bordered="false">
              <Statistic title="人工任务" :value="humanRecords.length" />
            </Card>
          </Col>
          <Col :xs="12" :xl="6">
            <Card :bordered="false">
              <Statistic title="待仲裁" :value="moderationRecords.length" />
            </Card>
          </Col>
        </Row>

        <Card :bordered="false">
          <Tabs
            v-model:active-key="activeTab"
            :items="[
              { key: 'tasks', label: '任务中心' },
              {
                key: 'first',
                label: `匿名一评 (${firstMarkRecords.length})`,
              },
              {
                key: 'second',
                label: `匿名二评 (${secondMarkRecords.length})`,
              },
              {
                key: 'moderation',
                label: `仲裁 (${moderationRecords.length})`,
              },
              { key: 'review', label: '成绩复核发布' },
              {
                key: 'appeals',
                label: `申诉 (${selectedAppeals.length})`,
              },
            ]"
          />

          <template v-if="activeTab === 'tasks'">
            <div class="task-overview">
              <div>
                <strong>
                  匿名答卷 {{ anonymousCode(selectedAttempt.candidateId) }}
                </strong>
                <span>
                  冻结试卷 {{ selectedAttempt.testFormRevisionId }} · 响应序号
                  {{ selectedAttempt.responseSequence }}
                </span>
              </div>
              <div class="completion">
                <span>评分闭环完成度</span>
                <Progress :percent="completion" />
              </div>
            </div>

            <Table
              row-key="id"
              :pagination="false"
              :scroll="{ x: 920 }"
              :data-source="records"
              :columns="[
                { title: '评分任务', key: 'item', minWidth: 220 },
                { title: '方式', key: 'method', width: 110 },
                { title: '一评', key: 'first', width: 90 },
                { title: '二评', key: 'second', width: 90 },
                { title: '当前分', key: 'score', width: 100 },
                { title: '状态', key: 'status', width: 120 },
                { title: '证据条数', key: 'evidence', width: 100 },
              ]"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'item'">
                  <Space wrap>
                    <span>{{ itemFor(record.itemRevisionId)?.title }}</span>
                    <Tag v-if="record.id === 'score-material'" color="purple">
                      双评演示
                    </Tag>
                  </Space>
                </template>
                <template v-else-if="column.key === 'method'">
                  {{
                    record.method === 'automatic'
                      ? '自动'
                      : record.method === 'moderated'
                        ? '仲裁'
                        : '人工'
                  }}
                </template>
                <template v-else-if="column.key === 'first'">
                  {{ record.firstScore ?? '—' }}
                </template>
                <template v-else-if="column.key === 'second'">
                  {{ record.secondScore ?? '—' }}
                </template>
                <template v-else-if="column.key === 'score'">
                  {{ record.awardedScore }} / {{ record.maxScore }}
                </template>
                <template v-else-if="column.key === 'status'">
                  <Tag :color="statusInfo(record.status).color">
                    {{ statusLabel(record.status) }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'evidence'">
                  {{ record.evidence.length }}
                </template>
              </template>
            </Table>
          </template>

          <template v-else-if="activeTab === 'first'">
            <Alert
              show-icon
              type="info"
              message="一评工作台已隐藏考生身份"
              :description="`当前匿名码：${anonymousCode(
                selectedAttempt.candidateId,
              )}。评分人独立依据冻结试卷、响应和量规给分。`"
            />
            <div class="mark-list">
              <article
                v-for="record in firstMarkRecords"
                :key="record.id"
                class="mark-item"
              >
                <div class="response-panel">
                  <Space wrap>
                    <h3>{{ itemFor(record.itemRevisionId)?.title }}</h3>
                    <Tag v-if="record.id === 'score-material'" color="purple">
                      score-material
                    </Tag>
                    <Tag :color="scoreStatusMeta[record.status].color">
                      {{ statusLabel(record.status) }}
                    </Tag>
                  </Space>
                  <ItemStem
                    v-if="itemFor(record.itemRevisionId)"
                    :document="itemFor(record.itemRevisionId)!.stem"
                  />
                  <Card size="small" title="匿名响应" class="mt-3">
                    <pre>{{ responseFor(record.itemRevisionId) }}</pre>
                  </Card>
                </div>
                <div class="score-panel">
                  <strong>匿名一评</strong>
                  <InputNumber
                    v-model:value="scoreDrafts[record.id]!.first"
                    :min="0"
                    :max="record.maxScore"
                    addon-after="分"
                  />
                  <Input.TextArea
                    v-model:value="scoreDrafts[record.id]!.firstComment"
                    :rows="5"
                    placeholder="记录量规命中项与扣分证据"
                  />
                  <Button type="primary" @click="submitFirst(record)">
                    提交一评
                  </Button>
                </div>
              </article>
              <Alert
                v-if="firstMarkRecords.length === 0"
                show-icon
                type="success"
                message="没有待一评任务"
              />
            </div>
          </template>

          <template v-else-if="activeTab === 'second'">
            <Alert
              show-icon
              type="warning"
              message="二评默认不展示一评分数"
              description="演示界面保留一评结果用于超差判断；二评提交后，系统按满分的 10%（最低 1 分）判断是否转仲裁。"
            />
            <div class="mark-list">
              <article
                v-for="record in secondMarkRecords"
                :key="record.id"
                class="mark-item"
              >
                <div class="response-panel">
                  <Space wrap>
                    <h3>{{ itemFor(record.itemRevisionId)?.title }}</h3>
                    <Tag v-if="record.id === 'score-material'" color="purple">
                      调低二评分可触发仲裁
                    </Tag>
                  </Space>
                  <ItemStem
                    v-if="itemFor(record.itemRevisionId)"
                    :document="itemFor(record.itemRevisionId)!.stem"
                  />
                  <Card size="small" title="匿名响应" class="mt-3">
                    <pre>{{ responseFor(record.itemRevisionId) }}</pre>
                  </Card>
                </div>
                <div class="score-panel">
                  <strong>独立二评</strong>
                  <InputNumber
                    v-model:value="scoreDrafts[record.id]!.second"
                    :min="0"
                    :max="record.maxScore"
                    addon-after="分"
                  />
                  <Input.TextArea
                    v-model:value="scoreDrafts[record.id]!.secondComment"
                    :rows="5"
                    placeholder="记录独立量规依据"
                  />
                  <Button type="primary" @click="submitSecond(record)">
                    提交二评并执行超差判断
                  </Button>
                </div>
              </article>
              <Alert
                v-if="secondMarkRecords.length === 0"
                show-icon
                type="info"
                message="暂无待二评任务"
              />
            </div>
          </template>

          <template v-else-if="activeTab === 'moderation'">
            <Alert
              show-icon
              :type="moderationRecords.length > 0 ? 'error' : 'success'"
              :message="
                moderationRecords.length > 0
                  ? '存在双评分差超阈值任务'
                  : '当前没有待仲裁任务'
              "
              description="仲裁人可查看一评、二评、原始响应和完整证据链，裁定后终分立即冻结。"
            />
            <div class="mark-list">
              <article
                v-for="record in moderationRecords"
                :key="record.id"
                class="mark-item"
              >
                <div class="response-panel">
                  <h3>{{ itemFor(record.itemRevisionId)?.title }}</h3>
                  <Descriptions bordered size="small" :column="2">
                    <Descriptions.Item label="一评分">
                      {{ record.firstScore }}
                    </Descriptions.Item>
                    <Descriptions.Item label="二评分">
                      {{ record.secondScore }}
                    </Descriptions.Item>
                    <Descriptions.Item label="评分差">
                      {{
                        Math.abs(
                          (record.firstScore ?? 0) - (record.secondScore ?? 0),
                        ).toFixed(1)
                      }}
                    </Descriptions.Item>
                    <Descriptions.Item label="超差阈值">
                      {{ Math.max(1, record.maxScore * 0.1).toFixed(1) }}
                    </Descriptions.Item>
                  </Descriptions>
                  <Card size="small" title="匿名响应" class="mt-3">
                    <pre>{{ responseFor(record.itemRevisionId) }}</pre>
                  </Card>
                </div>
                <div class="score-panel">
                  <strong>仲裁终分</strong>
                  <InputNumber
                    v-model:value="scoreDrafts[record.id]!.moderation"
                    :min="0"
                    :max="record.maxScore"
                    addon-after="分"
                  />
                  <Input.TextArea
                    v-model:value="scoreDrafts[record.id]!.moderationComment"
                    :rows="5"
                    placeholder="填写裁定依据"
                  />
                  <Button
                    type="primary"
                    danger
                    @click="submitModeration(record)"
                  >
                    冻结仲裁终分
                  </Button>
                </div>
              </article>
            </div>
          </template>

          <template v-else-if="activeTab === 'review'">
            <Row :gutter="[16, 16]">
              <Col :xs="24" :xl="10">
                <Card :bordered="false" title="成绩复核与发布">
                  <Descriptions bordered :column="1">
                    <Descriptions.Item label="匿名答卷">
                      {{ anonymousCode(selectedAttempt.candidateId) }}
                    </Descriptions.Item>
                    <Descriptions.Item label="总分">
                      {{ summary.awarded }} / {{ summary.maximum }}
                    </Descriptions.Item>
                    <Descriptions.Item label="评分完整度">
                      <Progress :percent="completion" size="small" />
                    </Descriptions.Item>
                    <Descriptions.Item label="答卷状态">
                      <Tag>{{ selectedAttempt.status }}</Tag>
                    </Descriptions.Item>
                  </Descriptions>
                  <Space class="mt-4" wrap>
                    <Button
                      type="primary"
                      :disabled="
                        !readyForReview ||
                        ['published', 'reviewed'].includes(
                          selectedAttempt.status,
                        )
                      "
                      @click="finalizeResult"
                    >
                      复核并冻结成绩
                    </Button>
                    <Button
                      type="primary"
                      :disabled="selectedAttempt.status !== 'reviewed'"
                      @click="publishResult"
                    >
                      发布成绩
                    </Button>
                  </Space>
                  <Alert
                    class="mt-4"
                    show-icon
                    :type="readyForReview ? 'success' : 'warning'"
                    :message="
                      readyForReview
                        ? '评分任务已完整，可进入成绩复核'
                        : '仍有一评、二评或仲裁任务未完成'
                    "
                  />
                  <div class="correction-panel">
                    <strong>成绩更正</strong>
                    <small>新增更正记录，不覆盖原评分证据</small>
                    <Select
                      :disabled="correctableRecords.length === 0"
                      :options="correctionRecordOptions"
                      :value="correctionRecordId"
                      placeholder="选择已锁定评分"
                      @update:value="selectCorrectionRecord"
                    />
                    <InputNumber
                      v-model:value="correctionScore"
                      :disabled="!correctionRecordId"
                      :min="0"
                      class="w-full"
                      placeholder="更正分数"
                    />
                    <Input
                      v-model:value="correctionReason"
                      :disabled="!correctionRecordId"
                      placeholder="填写更正依据"
                    />
                    <Button
                      :disabled="
                        !correctionRecordId ||
                        !['published', 'reviewed'].includes(
                          selectedAttempt.status,
                        )
                      "
                      @click="submitCorrection"
                    >
                      创建更正记录
                    </Button>
                  </div>
                </Card>
              </Col>
              <Col :xs="24" :xl="14">
                <Card :bordered="false" title="评分证据链">
                  <div
                    v-for="record in records"
                    :key="record.id"
                    class="evidence-record"
                  >
                    <Space wrap>
                      <strong>{{
                        itemFor(record.itemRevisionId)?.title
                      }}</strong>
                      <Tag :color="scoreStatusMeta[record.status].color">
                        {{ statusLabel(record.status) }}
                      </Tag>
                    </Space>
                    <Timeline class="mt-3" :items="evidenceTimeline(record)" />
                  </div>
                </Card>
              </Col>
            </Row>
          </template>

          <template v-else>
            <Alert
              show-icon
              type="info"
              message="申诉处理保留原申请、复核意见和处理结果"
              description="处理人员基于冻结答卷与评分证据链作出决定，不直接覆盖历史评分记录。"
            />
            <div class="appeal-list">
              <Card
                v-for="appeal in selectedAppeals"
                :key="appeal.id"
                :bordered="false"
                :title="`申诉 ${appeal.id}`"
              >
                <template #extra>
                  <Tag
                    :color="
                      appeal.status === 'pending'
                        ? 'warning'
                        : appeal.status === 'accepted'
                          ? 'success'
                          : 'default'
                    "
                  >
                    {{ appeal.status }}
                  </Tag>
                </template>
                <Descriptions bordered size="small" :column="1">
                  <Descriptions.Item label="申请时间">
                    {{ appeal.createdAt }}
                  </Descriptions.Item>
                  <Descriptions.Item label="申请理由">
                    {{ appeal.reason }}
                  </Descriptions.Item>
                  <Descriptions.Item label="既有结论">
                    {{ appeal.resolution || '待处理' }}
                  </Descriptions.Item>
                </Descriptions>
                <Input.TextArea
                  v-model:value="appealDrafts[appeal.id]"
                  class="mt-4"
                  :rows="3"
                  :disabled="appeal.status !== 'pending'"
                  placeholder="填写复核意见"
                />
                <Space class="mt-3">
                  <Button
                    type="primary"
                    :disabled="appeal.status !== 'pending'"
                    @click="handleAppeal(appeal, true)"
                  >
                    受理申诉
                  </Button>
                  <Button
                    :disabled="appeal.status !== 'pending'"
                    @click="handleAppeal(appeal, false)"
                  >
                    驳回申诉
                  </Button>
                </Space>
              </Card>
              <Alert
                v-if="selectedAppeals.length === 0"
                show-icon
                type="success"
                message="当前答卷没有待处理申诉"
              />
            </div>
          </template>
        </Card>
      </template>
    </div>
  </Page>
</template>

<style scoped>
.scoring-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.heading {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
}

.heading h1 {
  margin: 8px 0 4px;
  font-size: 24px;
}

.heading p {
  max-width: 850px;
  margin: 0;
  line-height: 1.65;
  color: hsl(var(--foreground) / 60%);
}

.attempt-select {
  width: 370px;
}

.task-overview {
  display: grid;
  grid-template-columns: 1fr minmax(280px, 0.6fr);
  gap: 24px;
  align-items: center;
  padding: 16px;
  margin-bottom: 16px;
  background: hsl(var(--accent) / 45%);
  border-radius: 12px;
}

.task-overview > div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-overview span,
.completion > span {
  font-size: 12px;
  color: hsl(var(--foreground) / 58%);
}

.mark-list,
.appeal-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.mark-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 22px;
  padding: 20px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.response-panel {
  min-width: 0;
}

.response-panel h3 {
  margin: 0;
}

.response-panel pre {
  max-height: 260px;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
}

.score-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.correction-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid hsl(var(--border));
}

.correction-panel small {
  color: hsl(var(--foreground) / 55%);
}

.evidence-record {
  padding: 4px 0 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid hsl(var(--border));
}

.evidence-record:last-child {
  margin-bottom: 0;
  border-bottom: 0;
}

@media (max-width: 900px) {
  .heading {
    flex-direction: column;
    align-items: stretch;
  }

  .attempt-select {
    width: 100%;
  }

  .task-overview,
  .mark-item {
    grid-template-columns: 1fr;
  }
}
</style>
