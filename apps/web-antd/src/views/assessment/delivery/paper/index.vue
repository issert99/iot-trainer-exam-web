<script lang="ts" setup>
import type { PaperBatch, ScanJob } from '../../domain/types';

import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  InputNumber,
  message,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
} from 'ant-design-vue';

import { uid } from '../../domain/integrity';
import {
  advancePaperBatch,
  completeScanReview,
  createPaperBatch,
} from '../../stores/exam';
import { persistSchoolState, schoolAssessmentState } from '../../stores/state';

defineOptions({ name: 'AssessmentPaperDelivery' });

const route = useRoute();
const paperEvents = computed(() =>
  schoolAssessmentState.events.filter(
    (event) => event.deliveryMode === 'paper',
  ),
);
const selectedEventId = ref(
  String(route.query.eventId ?? paperEvents.value[0]?.id ?? ''),
);
const selectedBatchId = ref('');
const bookletCount = ref(30);

const eventOptions = computed(() =>
  paperEvents.value.map((event) => ({
    label: `${event.name} · ${event.candidateIds.length} 人`,
    value: event.id,
  })),
);
const selectedEvent = computed(() =>
  paperEvents.value.find((event) => event.id === selectedEventId.value),
);
const batches = computed(() =>
  schoolAssessmentState.paperBatches.filter(
    (batch) => batch.eventId === selectedEventId.value,
  ),
);
const selectedBatch = computed(
  () =>
    batches.value.find((batch) => batch.id === selectedBatchId.value) ??
    batches.value[0],
);
const scanJobs = computed(() => {
  const batchIds = new Set(batches.value.map((batch) => batch.id));
  return schoolAssessmentState.scanJobs.filter((job) =>
    batchIds.has(job.batchId),
  );
});
const selectedScanJob = computed(() =>
  schoolAssessmentState.scanJobs.find(
    (job) => job.batchId === selectedBatch.value?.id,
  ),
);
const totalBooklets = computed(() =>
  batches.value.reduce((total, batch) => total + batch.bookletCount, 0),
);
const collectedBooklets = computed(() =>
  batches.value.reduce((total, batch) => total + batch.collectedCount, 0),
);
const exceptionCount = computed(() =>
  scanJobs.value.reduce((total, job) => total + job.errorCount, 0),
);
const formedAnswerSheets = computed(() => {
  let total = 0;
  for (const batch of batches.value) {
    const completed = schoolAssessmentState.scanJobs.some(
      (job) => job.batchId === batch.id && job.status === 'completed',
    );
    if (completed) total += batch.collectedCount;
  }
  return total;
});

const workflowItems = [
  {
    description: '生成密号、份数与印制任务',
    title: '印制批次',
  },
  {
    description: '双人核验后完成保密交接',
    title: '保密交接',
  },
  {
    description: '考场发卷、清点并回收',
    title: '发卷回收',
  },
  {
    description: '拆卷、扫描并上传图像',
    title: '扫描上传',
  },
  {
    description: '客观题识别与异常标记',
    title: 'OMR 识别',
  },
  {
    description: '处理涂改、缺页和识别冲突',
    title: '人工校对',
  },
  {
    description: '按密号形成可评分答卷',
    title: '形成答卷',
  },
];

const batchStatusMeta: Record<
  PaperBatch['status'],
  { color: string; label: string }
> = {
  collected: { color: 'cyan', label: '已回收' },
  distributed: { color: 'processing', label: '已发卷' },
  printing: { color: 'default', label: '印制中' },
  ready: { color: 'blue', label: '待交接' },
  scanning: { color: 'purple', label: '扫描处理中' },
};

const scanStatusMeta: Record<
  ScanJob['status'],
  { color: string; label: string }
> = {
  completed: { color: 'success', label: '答卷已形成' },
  recognizing: { color: 'processing', label: 'OMR 识别中' },
  reviewing: { color: 'warning', label: '人工校对中' },
  uploaded: { color: 'blue', label: '图像已上传' },
};

const workflowCurrent = computed(() => {
  const batch = selectedBatch.value;
  const job = selectedScanJob.value;
  if (!batch) return 0;
  if (batch.status === 'printing') return 0;
  if (batch.status === 'ready') return 1;
  if (batch.status === 'distributed') return 2;
  if (batch.status === 'collected') return 3;
  if (!job || job.status === 'uploaded') return 3;
  if (job.status === 'recognizing') return 4;
  if (job.status === 'reviewing') return 5;
  return 6;
});

watch(
  batches,
  (items) => {
    if (!items.some((batch) => batch.id === selectedBatchId.value)) {
      selectedBatchId.value = items[0]?.id ?? '';
    }
  },
  { immediate: true },
);

function formatDate(value?: string) {
  if (!value) return '尚未交接';
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function createBatch() {
  if (!selectedEvent.value) {
    message.warning('请先选择纸笔考试场次');
    return;
  }
  try {
    const batch = createPaperBatch(
      selectedEvent.value.id,
      Math.max(1, bookletCount.value ?? 1),
    );
    selectedBatchId.value = batch.id;
    message.success('印制批次已创建，密号与份数已冻结');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建批次失败');
  }
}

function ensureScanJob(batch: PaperBatch) {
  const existing = schoolAssessmentState.scanJobs.find(
    (job) => job.batchId === batch.id,
  );
  if (existing) return existing;
  const job: ScanJob = {
    batchId: batch.id,
    errorCount: Math.max(1, Math.round(batch.bookletCount * 0.04)),
    id: uid('scan-job'),
    pageCount: batch.bookletCount * 6,
    reviewedCount: 0,
    status: 'uploaded',
  };
  schoolAssessmentState.scanJobs.unshift(job);
  persistSchoolState();
  return job;
}

function advanceBatch(value: unknown) {
  const batch = value as PaperBatch;
  try {
    const advanced = advancePaperBatch(batch.id);
    if (advanced.status === 'scanning') ensureScanJob(advanced);
    message.success(`批次已推进至“${batchStatusMeta[advanced.status].label}”`);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '推进批次失败');
  }
}

function batchInfo(value: unknown) {
  return (
    batchStatusMeta[String(value) as PaperBatch['status']] ??
    batchStatusMeta.printing
  );
}

function batchActionLabel(value: unknown) {
  const batch = value as PaperBatch;
  if (batch.status === 'printing') return '完成印制';
  if (batch.status === 'ready') return '确认双人交接';
  if (batch.status === 'distributed') return '清点回收';
  if (batch.status === 'collected') return '送交扫描';
  return '';
}

function advanceScan(value: unknown) {
  const job = value as ScanJob;
  if (!scanReady(job)) {
    message.warning('批次完成回收并送交扫描后，才能处理识别任务');
    return;
  }
  if (job.status === 'completed') return;
  if (job.status === 'uploaded') {
    job.status = 'recognizing';
    message.success('OMR 识别任务已启动');
  } else if (job.status === 'recognizing') {
    job.status = 'reviewing';
    job.reviewedCount = Math.max(0, Math.round(job.pageCount * 0.85));
    message.warning(`发现 ${job.errorCount} 项异常，已进入人工校对`);
  } else {
    completeScanReview(job.id);
    message.success('异常已校对，已形成标准答卷快照并进入评分');
  }
  persistSchoolState();
}

function scanInfo(value: unknown) {
  return (
    scanStatusMeta[String(value) as ScanJob['status']] ??
    scanStatusMeta.uploaded
  );
}

function scanReady(value: unknown) {
  const job = value as ScanJob;
  return schoolAssessmentState.paperBatches.some(
    (batch) => batch.id === job.batchId && batch.status === 'scanning',
  );
}

function scanActionLabel(value: unknown) {
  const job = value as ScanJob;
  if (!scanReady(job)) return '等待批次送扫';
  if (job.status === 'uploaded') return '启动 OMR 识别';
  if (job.status === 'recognizing') return '完成识别';
  if (job.status === 'reviewing') return '完成校对并形成答卷';
  return '已完成';
}

function scanProgress(value: unknown) {
  const job = value as ScanJob;
  if (job.status === 'completed') return 100;
  if (job.pageCount === 0) return 0;
  if (job.status === 'recognizing') return 45;
  if (job.status === 'uploaded') return 15;
  return Math.min(95, Math.round((job.reviewedCount / job.pageCount) * 100));
}
</script>

<template>
  <Page>
    <div class="paper-page">
      <section class="heading">
        <div>
          <Tag color="orange">纸笔交付工作台</Tag>
          <h1>印制、回收与扫描闭环</h1>
          <p>
            从保密印制到 OMR
            与人工校对，每一步都围绕同一批次和密号追踪，最终形成可评分答卷。
          </p>
        </div>
        <Select
          v-model:value="selectedEventId"
          class="event-select"
          :options="eventOptions"
          placeholder="选择纸笔场次"
        />
      </section>

      <Alert
        v-if="!selectedEvent"
        show-icon
        type="warning"
        message="暂无纸笔考试场次"
        description="请先在考试中心创建 deliveryMode 为 paper 的场次。"
      />

      <template v-else>
        <Row :gutter="[16, 16]">
          <Col :xs="12" :xl="6">
            <Card :bordered="false">
              <Statistic title="批次数" :value="batches.length" />
            </Card>
          </Col>
          <Col :xs="12" :xl="6">
            <Card :bordered="false">
              <Statistic title="计划印制" :value="totalBooklets" suffix="份" />
            </Card>
          </Col>
          <Col :xs="12" :xl="6">
            <Card :bordered="false">
              <Statistic
                title="已回收"
                :value="collectedBooklets"
                suffix="份"
              />
            </Card>
          </Col>
          <Col :xs="12" :xl="6">
            <Card :bordered="false">
              <Statistic
                title="已形成答卷"
                :value="formedAnswerSheets"
                suffix="份"
              />
            </Card>
          </Col>
        </Row>

        <Card :bordered="false" title="纸笔交付全流程">
          <Steps
            responsive
            :current="workflowCurrent"
            :items="workflowItems"
            size="small"
          />
          <Alert
            class="mt-5"
            show-icon
            :type="exceptionCount > 0 ? 'warning' : 'success'"
            :message="
              exceptionCount > 0
                ? `当前有 ${exceptionCount} 项识别异常待人工校对`
                : '扫描与校对链路无未处理异常'
            "
          />
        </Card>

        <Row :gutter="[16, 16]">
          <Col :xs="24" :xl="16">
            <Card :bordered="false" title="印制与交接批次">
              <template #extra>
                <Space>
                  <InputNumber
                    v-model:value="bookletCount"
                    :min="1"
                    :max="5000"
                    addon-after="份"
                  />
                  <Button type="primary" @click="createBatch">
                    新建印制批次
                  </Button>
                </Space>
              </template>
              <Table
                row-key="id"
                :pagination="false"
                :scroll="{ x: 820 }"
                :data-source="batches"
                :row-class-name="
                  (record) =>
                    record.id === selectedBatch?.id ? 'selected-row' : ''
                "
                :custom-row="
                  (record) => ({
                    onClick: () => (selectedBatchId = record.id),
                  })
                "
                :columns="[
                  { title: '批次号', dataIndex: 'id', minWidth: 180 },
                  { title: '印制', key: 'printed', width: 110 },
                  { title: '回收', key: 'collected', width: 110 },
                  { title: '保密交接', key: 'handover', width: 180 },
                  { title: '状态', key: 'status', width: 120 },
                  { title: '下一步', key: 'action', width: 160 },
                ]"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'printed'">
                    {{ record.printedCount }} / {{ record.bookletCount }}
                  </template>
                  <template v-else-if="column.key === 'collected'">
                    {{ record.collectedCount }} / {{ record.bookletCount }}
                  </template>
                  <template v-else-if="column.key === 'handover'">
                    {{ formatDate(record.handedOverAt) }}
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <Tag :color="batchInfo(record.status).color">
                      {{ batchInfo(record.status).label }}
                    </Tag>
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <Button
                      v-if="batchActionLabel(record)"
                      size="small"
                      type="primary"
                      @click.stop="advanceBatch(record)"
                    >
                      {{ batchActionLabel(record) }}
                    </Button>
                    <Tag v-else color="purple">转扫描任务</Tag>
                  </template>
                </template>
              </Table>
            </Card>
          </Col>

          <Col :xs="24" :xl="8">
            <Card :bordered="false" title="当前批次链路">
              <Descriptions
                v-if="selectedBatch"
                bordered
                size="small"
                :column="1"
              >
                <Descriptions.Item label="批次号">
                  {{ selectedBatch.id }}
                </Descriptions.Item>
                <Descriptions.Item label="所属场次">
                  {{ selectedEvent.name }}
                </Descriptions.Item>
                <Descriptions.Item label="密号答卷">
                  {{
                    selectedScanJob?.status === 'completed'
                      ? `${selectedBatch.collectedCount} 份已形成`
                      : '尚未形成'
                  }}
                </Descriptions.Item>
                <Descriptions.Item label="扫描任务">
                  {{ selectedScanJob?.id || '待送扫描' }}
                </Descriptions.Item>
                <Descriptions.Item label="交接凭证">
                  {{
                    selectedBatch.handedOverAt
                      ? `双人签收 · ${formatDate(selectedBatch.handedOverAt)}`
                      : '待双人签收'
                  }}
                </Descriptions.Item>
              </Descriptions>
              <Alert v-else show-icon type="info" message="请创建或选择批次" />
            </Card>
          </Col>
        </Row>

        <Card :bordered="false" title="扫描、OMR 与人工校对">
          <Table
            row-key="id"
            :pagination="false"
            :scroll="{ x: 920 }"
            :data-source="scanJobs"
            :columns="[
              { title: '扫描任务', dataIndex: 'id', minWidth: 180 },
              { title: '关联批次', dataIndex: 'batchId', width: 190 },
              { title: '页数', dataIndex: 'pageCount', width: 90 },
              { title: '处理进度', key: 'progress', width: 210 },
              { title: '异常', dataIndex: 'errorCount', width: 80 },
              { title: '状态', key: 'status', width: 140 },
              { title: '操作', key: 'action', width: 200 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'progress'">
                <Progress
                  :percent="scanProgress(record)"
                  size="small"
                  :status="
                    record.errorCount > 0 && record.status === 'reviewing'
                      ? 'exception'
                      : 'normal'
                  "
                />
              </template>
              <template v-else-if="column.key === 'status'">
                <Tag :color="scanInfo(record.status).color">
                  {{ scanInfo(record.status).label }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <Button
                  size="small"
                  :disabled="
                    record.status === 'completed' || !scanReady(record)
                  "
                  :type="record.status === 'reviewing' ? 'primary' : 'default'"
                  @click="advanceScan(record)"
                >
                  {{ scanActionLabel(record) }}
                </Button>
              </template>
            </template>
          </Table>
          <Alert
            v-if="scanJobs.length === 0"
            class="mt-4"
            show-icon
            type="info"
            message="批次完成回收并送交扫描后，将自动创建扫描任务"
          />
        </Card>
      </template>
    </div>
  </Page>
</template>

<style scoped>
.paper-page {
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
  max-width: 820px;
  margin: 0;
  line-height: 1.65;
  color: hsl(var(--foreground) / 60%);
}

.event-select {
  width: 360px;
}

:deep(.selected-row > td) {
  background: hsl(var(--primary) / 7%) !important;
}

@media (max-width: 760px) {
  .heading {
    flex-direction: column;
    align-items: stretch;
  }

  .event-select {
    width: 100%;
  }

  :deep(.ant-card-extra) {
    width: 100%;
    margin-top: 10px;
    margin-left: 0;
  }
}
</style>
