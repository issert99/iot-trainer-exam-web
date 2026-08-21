<script lang="ts" setup>
import type {
  ExamDeliveryMode,
  ExamEvent,
  ExamEventStatus,
  ResponseEvent,
} from '../domain/types';

import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import {
  createExamEvent,
  setExamConnection,
  startAttempt,
  transitionExamEvent,
} from '../stores/exam';
import { persistSchoolState, schoolAssessmentState } from '../stores/state';

defineOptions({ name: 'AssessmentExams' });

const router = useRouter();
const activeTab = ref('plans');
const createOpen = ref(false);
const candidateOpen = ref(false);
const candidateEventId = ref('');
const candidateId = ref('');

const createModel = reactive({
  candidateIds: 'student-20250042, student-20250043',
  deliveryMode: 'online' as ExamDeliveryMode,
  endAt: '2026-09-08T11:00',
  name: '2025-2026 学年课程考试',
  startAt: '2026-09-08T09:00',
  testFormRevisionId: '',
});

const events = computed(() => schoolAssessmentState.events);
const attempts = computed(() => schoolAssessmentState.attempts);
const sealedForms = computed(() =>
  schoolAssessmentState.forms.filter((form) => form.status === 'sealed'),
);
const formOptions = computed(() =>
  sealedForms.value.map((form) => ({
    label: `${form.name} · ${form.totalScore} 分`,
    value: form.id,
  })),
);
const pendingSyncCount = computed(
  () =>
    (schoolAssessmentState.responseEvents as unknown as ResponseEvent[]).filter(
      (event) => event.syncState === 'pending',
    ).length,
);
const runningEvents = computed(() =>
  events.value.filter((event) =>
    ['in-progress', 'ready', 'scheduled'].includes(event.status),
  ),
);
const candidateTotal = computed(() =>
  events.value.reduce((total, event) => total + event.candidateIds.length, 0),
);

const deliveryCards: Array<{
  color: string;
  description: string;
  mode: ExamDeliveryMode;
  title: string;
}> = [
  {
    color: 'blue',
    description: '冻结试卷、身份核验、计时作答、断网续作与自动保存。',
    mode: 'online',
    title: '在线机考',
  },
  {
    color: 'orange',
    description: '印制交接、发卷回收、扫描识别与人工校对闭环。',
    mode: 'paper',
    title: '纸笔考试',
  },
  {
    color: 'purple',
    description: '考站轮转、现场量规、音视频证据与考官签名。',
    mode: 'practical',
    title: '实践考试',
  },
];

const statusMeta: Record<ExamEventStatus, { color: string; label: string }> = {
  cancelled: { color: 'default', label: '已取消' },
  closed: { color: 'default', label: '已归档' },
  draft: { color: 'default', label: '草稿' },
  'in-progress': { color: 'processing', label: '考试中' },
  published: { color: 'success', label: '成绩已发布' },
  ready: { color: 'cyan', label: '准备就绪' },
  'result-pending': { color: 'gold', label: '待发布成绩' },
  scheduled: { color: 'blue', label: '已排期' },
  scoring: { color: 'orange', label: '评分中' },
};

const nextTransitions: Partial<
  Record<ExamEventStatus, { label: string; status: ExamEventStatus }>
> = {
  draft: { label: '确认排期', status: 'scheduled' },
  'in-progress': { label: '结束考试', status: 'scoring' },
  published: { label: '归档场次', status: 'closed' },
  ready: { label: '开启考试', status: 'in-progress' },
  'result-pending': { label: '发布成绩', status: 'published' },
  scheduled: { label: '完成考前检查', status: 'ready' },
  scoring: { label: '评分完成', status: 'result-pending' },
};

function asEvent(value: unknown) {
  return value as ExamEvent;
}

function deliveryLabel(mode: ExamDeliveryMode) {
  return (
    deliveryCards.find((entry) => entry.mode === mode)?.title ?? String(mode)
  );
}

function deliveryColor(mode: ExamDeliveryMode) {
  return deliveryCards.find((entry) => entry.mode === mode)?.color ?? 'default';
}

function eventStatusInfo(value: unknown) {
  return statusMeta[String(value) as ExamEventStatus] ?? statusMeta.draft;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function eventAttemptCount(eventId: string) {
  return attempts.value.filter((attempt) => attempt.eventId === eventId).length;
}

function eventAnsweredCount(eventId: string) {
  return attempts.value.filter(
    (attempt) => attempt.eventId === eventId && attempt.responseSequence > 0,
  ).length;
}

function eventProgress(event: ExamEvent) {
  if (event.candidateIds.length === 0) return 0;
  return Math.round(
    (eventAttemptCount(event.id) / event.candidateIds.length) * 100,
  );
}

function resetCreateModel(mode: ExamDeliveryMode = 'online') {
  const sessionNames: Record<ExamDeliveryMode, string> = {
    online: '2025-2026 学年课程考试',
    paper: '2025-2026 学年纸笔补考',
    practical: '2025-2026 学年实践技能考核',
  };
  createModel.name = sessionNames[mode];
  createModel.deliveryMode = mode;
  createModel.testFormRevisionId = sealedForms.value[0]?.id ?? '';
}

function openCreate(mode?: ExamDeliveryMode) {
  resetCreateModel(mode);
  createOpen.value = true;
}

function createSession() {
  try {
    const startAt = new Date(createModel.startAt);
    const endAt = new Date(createModel.endAt);
    const candidates = createModel.candidateIds
      .split(/[,，\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (!createModel.name.trim()) throw new Error('请填写场次名称');
    if (!createModel.testFormRevisionId) throw new Error('请选择冻结试卷');
    if (candidates.length === 0) throw new Error('至少编排一名考生');
    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      endAt <= startAt
    ) {
      throw new Error('考试结束时间必须晚于开始时间');
    }
    createExamEvent({
      candidateIds: [...new Set(candidates)],
      deliveryMode: createModel.deliveryMode,
      endAt: endAt.toISOString(),
      name: createModel.name.trim(),
      startAt: startAt.toISOString(),
      testFormRevisionId: createModel.testFormRevisionId,
    });
    createOpen.value = false;
    activeTab.value = 'sessions';
    message.success('场次已创建，等待确认排期');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建场次失败');
  }
}

function advanceEvent(value: unknown) {
  const event = asEvent(value);
  const next = nextTransitions[event.status];
  if (!next) return;
  try {
    transitionExamEvent(event.id, next.status);
    message.success(`场次已推进至“${statusMeta[next.status].label}”`);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '状态推进失败');
  }
}

function openCandidateEditor(value: unknown) {
  const event = asEvent(value);
  candidateEventId.value = event.id;
  candidateId.value = '';
  candidateOpen.value = true;
}

function addCandidate() {
  const event = events.value.find(
    (entry) => entry.id === candidateEventId.value,
  );
  const normalized = candidateId.value.trim();
  if (!event || !normalized) {
    message.warning('请输入考生编号');
    return;
  }
  if (event.candidateIds.includes(normalized)) {
    message.info('该考生已在当前场次');
    return;
  }
  event.candidateIds.push(normalized);
  persistSchoolState();
  candidateOpen.value = false;
  message.success('考生已加入场次');
}

async function enterCandidate(value: unknown, id?: string) {
  const event = asEvent(value);
  if (event.deliveryMode === 'paper') {
    await router.push({
      path: '/assessment/delivery/paper',
      query: { eventId: event.id },
    });
    return;
  }
  if (event.deliveryMode === 'practical') {
    await router.push({
      path: '/assessment/delivery/practical',
      query: { eventId: event.id },
    });
    return;
  }
  const selectedId = id ?? event.candidateIds[0] ?? '';
  try {
    const existing = attempts.value.find(
      (attempt) =>
        attempt.eventId === event.id && attempt.candidateId === selectedId,
    );
    const attempt = existing ?? startAttempt(event.id, selectedId);
    await router.push({
      path: '/assessment/attempt',
      query: { attemptId: attempt.id },
    });
  } catch (error) {
    message.error(error instanceof Error ? error.message : '无法进入考生端');
  }
}

function canEnter(event: ExamEvent, id: string) {
  return (
    Boolean(getAttemptForCandidate(event.id, id)) ||
    ['in-progress', 'ready'].includes(event.status)
  );
}

function getAttemptForCandidate(eventId: string, id: string) {
  return attempts.value.find(
    (attempt) => attempt.eventId === eventId && attempt.candidateId === id,
  );
}

function toggleConnection(online: boolean) {
  setExamConnection(online ? 'online' : 'offline');
  message.info(
    online
      ? '网络已恢复，待同步作答事件已回传'
      : '已进入离线演练，作答将保存在本机',
  );
}
</script>

<template>
  <Page>
    <div class="exams-page">
      <section class="heading">
        <div>
          <Tag color="blue">单校考试运行中心</Tag>
          <h1>考试计划、编排与监考</h1>
          <p>
            同一套冻结试卷支持在线、纸笔和实践三种交付模式，并沿统一状态机进入评分与发布。
          </p>
        </div>
        <Button type="primary" @click="openCreate()">创建场次</Button>
      </section>

      <Row :gutter="[16, 16]">
        <Col :xs="12" :xl="6">
          <Card :bordered="false">
            <Statistic title="考试计划" :value="events.length" />
          </Card>
        </Col>
        <Col :xs="12" :xl="6">
          <Card :bordered="false">
            <Statistic title="运行中场次" :value="runningEvents.length" />
          </Card>
        </Col>
        <Col :xs="12" :xl="6">
          <Card :bordered="false">
            <Statistic title="已编排考生" :value="candidateTotal" />
          </Card>
        </Col>
        <Col :xs="12" :xl="6">
          <Card :bordered="false">
            <Statistic title="离线待同步事件" :value="pendingSyncCount" />
          </Card>
        </Col>
      </Row>

      <Card :bordered="false" class="workspace">
        <Tabs
          v-model:active-key="activeTab"
          :items="[
            { key: 'plans', label: '考试计划' },
            { key: 'sessions', label: '场次与考生编排' },
            { key: 'proctor', label: '监考控制台' },
          ]"
        />

        <template v-if="activeTab === 'plans'">
          <div class="delivery-grid">
            <article
              v-for="entry in deliveryCards"
              :key="entry.mode"
              class="delivery-card"
            >
              <div>
                <Tag :color="entry.color">{{ entry.title }}</Tag>
                <strong>
                  {{
                    events.filter((event) => event.deliveryMode === entry.mode)
                      .length
                  }}
                  个计划
                </strong>
              </div>
              <p>{{ entry.description }}</p>
              <Button size="small" @click="openCreate(entry.mode)">
                新建{{ entry.title }}场次
              </Button>
            </article>
          </div>

          <Table
            class="mt-4"
            row-key="id"
            :pagination="false"
            :scroll="{ x: 900 }"
            :data-source="events"
            :columns="[
              { title: '考试计划', dataIndex: 'name', minWidth: 240 },
              { title: '交付模式', key: 'delivery', width: 110 },
              { title: '考试时间', key: 'time', width: 220 },
              {
                title: '冻结试卷',
                dataIndex: 'testFormRevisionId',
                width: 210,
              },
              { title: '状态', key: 'status', width: 110 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'delivery'">
                <Tag :color="deliveryColor(record.deliveryMode)">
                  {{ deliveryLabel(record.deliveryMode) }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'time'">
                {{ formatDate(record.startAt) }} —
                {{ formatDate(record.endAt) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <Tag :color="eventStatusInfo(record.status).color">
                  {{ eventStatusInfo(record.status).label }}
                </Tag>
              </template>
            </template>
          </Table>
        </template>

        <template v-else-if="activeTab === 'sessions'">
          <div class="session-toolbar">
            <Alert
              show-icon
              type="info"
              message="场次使用已封存的试卷版本"
              description="创建后依次完成排期、考前检查和开考；已开始作答的考生会获得独立答卷。"
            />
            <Button type="primary" @click="openCreate()">新增场次</Button>
          </div>

          <div class="session-list">
            <Card
              v-for="event in events"
              :key="event.id"
              :bordered="false"
              class="session-card"
            >
              <template #title>
                <Space wrap>
                  <span>{{ event.name }}</span>
                  <Tag :color="deliveryColor(event.deliveryMode)">
                    {{ deliveryLabel(event.deliveryMode) }}
                  </Tag>
                  <Tag :color="statusMeta[event.status].color">
                    {{ statusMeta[event.status].label }}
                  </Tag>
                </Space>
              </template>
              <template #extra>
                <Space wrap>
                  <Button size="small" @click="openCandidateEditor(event)">
                    加入考生
                  </Button>
                  <Button
                    v-if="nextTransitions[event.status]"
                    size="small"
                    type="primary"
                    @click="advanceEvent(event)"
                  >
                    {{ nextTransitions[event.status]?.label }}
                  </Button>
                  <Button
                    v-if="event.deliveryMode !== 'online'"
                    size="small"
                    @click="enterCandidate(event)"
                  >
                    进入交付台
                  </Button>
                </Space>
              </template>

              <div class="session-meta">
                <span>
                  时间：{{ formatDate(event.startAt) }} 至
                  {{ formatDate(event.endAt) }}
                </span>
                <span>冻结试卷：{{ event.testFormRevisionId }}</span>
                <span>
                  审批人：{{
                    event.approvalActorIds.join('、') || '待确认排期'
                  }}
                </span>
              </div>
              <Table
                size="small"
                row-key="id"
                :pagination="false"
                :scroll="{ x: 660 }"
                :data-source="
                  event.candidateIds.map((id) => ({
                    id,
                    attempt: getAttemptForCandidate(event.id, id),
                  }))
                "
                :columns="[
                  { title: '考生编号', dataIndex: 'id' },
                  { title: '答卷状态', key: 'attempt', width: 130 },
                  { title: '保存序号', key: 'sequence', width: 100 },
                  { title: '操作', key: 'action', width: 130 },
                ]"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'attempt'">
                    <Tag :color="record.attempt ? 'processing' : 'default'">
                      {{ record.attempt?.status || '未进入' }}
                    </Tag>
                  </template>
                  <template v-else-if="column.key === 'sequence'">
                    {{ record.attempt?.responseSequence ?? 0 }}
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <Button
                      v-if="
                        event.deliveryMode === 'online' &&
                        canEnter(event, record.id)
                      "
                      type="link"
                      size="small"
                      @click="enterCandidate(event, record.id)"
                    >
                      进入考生端
                    </Button>
                    <span v-else class="muted">由交付台处理</span>
                  </template>
                </template>
              </Table>
            </Card>
          </div>
        </template>

        <template v-else>
          <div class="proctor-toolbar">
            <div>
              <strong>考场网络演练</strong>
              <p>断网时响应事件保留序号与幂等键，恢复后统一同步。</p>
            </div>
            <Space>
              <Switch
                :checked="schoolAssessmentState.connection === 'online'"
                checked-children="在线"
                un-checked-children="离线"
                @update:checked="toggleConnection(Boolean($event))"
              />
              <Tag
                :color="
                  schoolAssessmentState.connection === 'online'
                    ? 'success'
                    : 'warning'
                "
              >
                {{
                  schoolAssessmentState.connection === 'online'
                    ? '链路正常'
                    : '离线运行'
                }}
              </Tag>
            </Space>
          </div>

          <Alert
            v-if="runningEvents.length === 0"
            show-icon
            type="info"
            message="暂无待监考场次"
          />
          <div v-else class="proctor-grid">
            <Card
              v-for="event in runningEvents"
              :key="event.id"
              :bordered="false"
              class="proctor-card"
            >
              <template #title>
                <Space wrap>
                  <span>{{ event.name }}</span>
                  <Tag :color="statusMeta[event.status].color">
                    {{ statusMeta[event.status].label }}
                  </Tag>
                </Space>
              </template>
              <template #extra>
                <Button
                  v-if="nextTransitions[event.status]"
                  type="primary"
                  size="small"
                  @click="advanceEvent(event)"
                >
                  {{ nextTransitions[event.status]?.label }}
                </Button>
              </template>
              <div class="monitor-stats">
                <div>
                  <strong>{{ event.candidateIds.length }}</strong>
                  <span>应到</span>
                </div>
                <div>
                  <strong>{{ eventAttemptCount(event.id) }}</strong>
                  <span>已进入</span>
                </div>
                <div>
                  <strong>{{ eventAnsweredCount(event.id) }}</strong>
                  <span>已作答</span>
                </div>
                <div>
                  <strong>{{ pendingSyncCount }}</strong>
                  <span>待同步</span>
                </div>
              </div>
              <Progress
                :percent="eventProgress(event)"
                :status="event.status === 'in-progress' ? 'active' : 'normal'"
              />
              <div class="candidate-chips">
                <Tag
                  v-for="id in event.candidateIds"
                  :key="id"
                  :color="
                    getAttemptForCandidate(event.id, id)
                      ? 'processing'
                      : 'default'
                  "
                >
                  {{ id }}
                </Tag>
              </div>
            </Card>
          </div>
        </template>
      </Card>
    </div>

    <Modal
      v-model:open="createOpen"
      title="创建考试场次"
      ok-text="创建草稿"
      width="640px"
      @ok="createSession"
    >
      <Form layout="vertical">
        <Form.Item label="场次名称" required>
          <Input v-model:value="createModel.name" />
        </Form.Item>
        <Row :gutter="12">
          <Col :xs="24" :md="12">
            <Form.Item label="交付模式" required>
              <Select
                v-model:value="createModel.deliveryMode"
                :options="
                  deliveryCards.map((entry) => ({
                    label: entry.title,
                    value: entry.mode,
                  }))
                "
              />
            </Form.Item>
          </Col>
          <Col :xs="24" :md="12">
            <Form.Item label="冻结试卷" required>
              <Select
                v-model:value="createModel.testFormRevisionId"
                :options="formOptions"
                placeholder="选择已封存试卷"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row :gutter="12">
          <Col :xs="24" :md="12">
            <Form.Item label="开始时间" required>
              <Input
                v-model:value="createModel.startAt"
                type="datetime-local"
              />
            </Form.Item>
          </Col>
          <Col :xs="24" :md="12">
            <Form.Item label="结束时间" required>
              <Input v-model:value="createModel.endAt" type="datetime-local" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="考生编排" required>
          <Input.TextArea
            v-model:value="createModel.candidateIds"
            :rows="3"
            placeholder="使用逗号或换行分隔考生编号"
          />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="candidateOpen"
      title="加入考生"
      ok-text="加入场次"
      @ok="addCandidate"
    >
      <Input
        v-model:value="candidateId"
        placeholder="输入校内考生编号"
        @press-enter="addCandidate"
      />
    </Modal>
  </Page>
</template>

<style scoped>
.exams-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.heading,
.proctor-toolbar,
.session-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.heading h1 {
  margin: 8px 0 4px;
  font-size: 24px;
}

.heading p,
.proctor-toolbar p {
  margin: 0;
  color: hsl(var(--foreground) / 60%);
}

.workspace :deep(.ant-tabs-nav) {
  margin-bottom: 20px;
}

.delivery-grid,
.proctor-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.delivery-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.delivery-card > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.delivery-card p {
  flex: 1;
  margin: 0;
  line-height: 1.65;
  color: hsl(var(--foreground) / 60%);
}

.session-toolbar :deep(.ant-alert) {
  flex: 1;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
}

.session-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  margin-bottom: 14px;
  font-size: 13px;
  color: hsl(var(--foreground) / 60%);
}

.proctor-toolbar {
  padding: 16px;
  margin-bottom: 16px;
  background: hsl(var(--accent) / 45%);
  border-radius: 12px;
}

.proctor-card {
  min-width: 0;
}

.monitor-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.monitor-stats > div {
  display: flex;
  flex-direction: column;
  padding: 10px;
  text-align: center;
  background: hsl(var(--accent) / 45%);
  border-radius: 8px;
}

.monitor-stats strong {
  font-size: 20px;
}

.monitor-stats span,
.muted {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.candidate-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

@media (max-width: 1100px) {
  .delivery-grid,
  .proctor-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .heading,
  .proctor-toolbar,
  .session-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .heading > button,
  .session-toolbar > button {
    width: 100%;
  }

  .monitor-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .session-card :deep(.ant-card-head) {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
}
</style>
