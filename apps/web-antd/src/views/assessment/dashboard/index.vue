<script lang="ts" setup>
import type { ResponseEvent } from '../domain/types';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Alert,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
} from 'ant-design-vue';

import { schoolAssessmentState } from '../stores/state';

defineOptions({ name: 'AssessmentDashboard' });

type AlertKind = 'error' | 'info' | 'success' | 'warning';

const router = useRouter();
const userStore = useUserStore();

const roleLabels: Record<string, string> = {
  admin: '系统管理员',
  student: '学生',
  teacher: '教师',
};

const currentRole = computed(() => userStore.userInfo?.roles?.[0] ?? 'teacher');
const currentRoleLabel = computed(
  () => roleLabels[currentRole.value] ?? '校内用户',
);
const currentUserName = computed(
  () => userStore.userInfo?.realName || '当前用户',
);

const publishedItemCount = computed(
  () =>
    schoolAssessmentState.itemRevisions.filter(
      (item) => item.status === 'published',
    ).length,
);
const sealedFormCount = computed(
  () =>
    schoolAssessmentState.forms.filter((form) => form.status === 'sealed')
      .length,
);
const activeEventCount = computed(
  () =>
    schoolAssessmentState.events.filter((event) =>
      [
        'in-progress',
        'ready',
        'result-pending',
        'scheduled',
        'scoring',
      ].includes(event.status),
    ).length,
);
const manualScoringCount = computed(
  () =>
    schoolAssessmentState.scoreRecords.filter(
      (record) => record.method !== 'automatic' && record.status !== 'final',
    ).length,
);

const workQueue = computed(() => {
  const drafting = schoolAssessmentState.itemRevisions.filter((item) =>
    ['draft', 'rejected'].includes(item.status),
  ).length;
  const reviewing = schoolAssessmentState.itemRevisions.filter(
    (item) => item.status === 'review',
  ).length;
  const paperPreparing = schoolAssessmentState.forms.filter(
    (form) =>
      form.status !== 'archived' &&
      (form.status !== 'sealed' ||
        form.compatibility.some((issue) => issue.blocking)),
  ).length;
  const examOperating = schoolAssessmentState.events.filter((event) =>
    [
      'draft',
      'in-progress',
      'ready',
      'result-pending',
      'scheduled',
      'scoring',
    ].includes(event.status),
  ).length;
  const scoring =
    manualScoringCount.value +
    schoolAssessmentState.appeals.filter(
      (appeal) => appeal.status === 'pending',
    ).length;

  return [
    {
      color: '#2563eb',
      count: drafting,
      description: '补全题干、分类与交互配置',
      label: '命题待完善',
      path: '/assessment/items/editor',
    },
    {
      color: '#7c3aed',
      count: reviewing,
      description: '核对内容质量与适用范围',
      label: '题目待审核',
      path: '/assessment/items/review',
    },
    {
      color: '#0891b2',
      count: paperPreparing,
      description: '处理校样、兼容性与封存',
      label: '试卷待处理',
      path: '/assessment/papers',
    },
    {
      color: '#d97706',
      count: examOperating,
      description: '关注排期、开考与结果发布',
      label: '考试待跟进',
      path: '/assessment/exams',
    },
    {
      color: '#dc2626',
      count: scoring,
      description: '完成主观题评分、复核与申诉',
      label: '阅卷待办',
      path: '/assessment/scoring',
    },
  ];
});

function percentage(current: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

const deliveryOverview = computed(() => {
  const onlineEvents = schoolAssessmentState.events.filter(
    (event) => event.deliveryMode === 'online',
  );
  const onlineEventIds = new Set(onlineEvents.map((event) => event.id));
  const onlineCandidates = onlineEvents.reduce(
    (total, event) => total + event.candidateIds.length,
    0,
  );
  const onlineAttempts = schoolAssessmentState.attempts.filter((attempt) =>
    onlineEventIds.has(attempt.eventId),
  ).length;

  const paperEvents = schoolAssessmentState.events.filter(
    (event) => event.deliveryMode === 'paper',
  );
  const paperEventIds = new Set(paperEvents.map((event) => event.id));
  const paperBatches = schoolAssessmentState.paperBatches.filter((batch) =>
    paperEventIds.has(batch.eventId),
  );
  const bookletCount = paperBatches.reduce(
    (total, batch) => total + batch.bookletCount,
    0,
  );
  const printedCount = paperBatches.reduce(
    (total, batch) => total + batch.printedCount,
    0,
  );

  const practicalEvents = schoolAssessmentState.events.filter(
    (event) => event.deliveryMode === 'practical',
  );
  const readyStations = schoolAssessmentState.practicalStations.filter(
    (station) => station.status !== 'closed',
  ).length;
  const stationCount = schoolAssessmentState.practicalStations.length;

  return [
    {
      color: '#2563eb',
      label: '在线机考',
      metric: `${onlineAttempts}/${onlineCandidates || 0} 份答卷`,
      note: `${onlineEvents.length} 个场次 · ${
        schoolAssessmentState.connection === 'online' ? '网络正常' : '离线演练'
      }`,
      percent: percentage(onlineAttempts, onlineCandidates),
    },
    {
      color: '#0891b2',
      label: '纸笔考试',
      metric: `${printedCount}/${bookletCount || 0} 本已印制`,
      note: `${paperEvents.length} 个场次 · ${paperBatches.length} 个印制批次`,
      percent: percentage(printedCount, bookletCount),
    },
    {
      color: '#7c3aed',
      label: '实践考试',
      metric: `${readyStations}/${stationCount || 0} 个考站可用`,
      note: `${practicalEvents.length} 个场次 · 证据按考站归集`,
      percent: percentage(readyStations, stationCount),
    },
  ];
});

const operationalAlerts = computed(() => {
  const alerts: Array<{
    description: string;
    kind: AlertKind;
    title: string;
  }> = [];
  const blockingIssues = schoolAssessmentState.forms.reduce(
    (total, form) =>
      total + form.compatibility.filter((issue) => issue.blocking).length,
    0,
  );
  const pendingSync = (
    schoolAssessmentState.responseEvents as unknown as ResponseEvent[]
  ).filter((event) => event.syncState === 'pending').length;
  const scanErrors = schoolAssessmentState.scanJobs.reduce(
    (total, job) => total + job.errorCount,
    0,
  );
  const failedPluginTests = schoolAssessmentState.pluginPackages.reduce(
    (total, plugin) => total + plugin.testSummary.failed,
    0,
  );

  if (blockingIssues > 0) {
    alerts.push({
      description: `有 ${blockingIssues} 个渠道兼容性阻断项，封存前需要处理。`,
      kind: 'error',
      title: '试卷存在发布阻断',
    });
  }
  if (pendingSync > 0) {
    alerts.push({
      description: `有 ${pendingSync} 条作答事件等待同步，请检查考场网络。`,
      kind: 'warning',
      title: '作答事件待同步',
    });
  }
  if (scanErrors > 0) {
    alerts.push({
      description: `扫描识别发现 ${scanErrors} 页异常，需人工复核后进入阅卷。`,
      kind: 'warning',
      title: '纸卷扫描待复核',
    });
  }
  if (failedPluginTests > 0) {
    alerts.push({
      description: `交互插件测试共 ${failedPluginTests} 项未通过，相关题型发布前应复测。`,
      kind: 'info',
      title: '插件质量提示',
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      description: '试卷兼容性、作答同步、纸卷扫描和插件测试均无待处理异常。',
      kind: 'success',
      title: '当前运行平稳',
    });
  }
  return alerts;
});

const quickEntries = [
  {
    description: '创建与维护题目版本',
    label: '题目中心',
    path: '/assessment/items',
  },
  {
    description: '配置知识与能力分类',
    label: '教学体系',
    path: '/assessment/foundation',
  },
  {
    description: '组卷、校样与封存',
    label: '试卷中心',
    path: '/assessment/papers',
  },
  {
    description: '排期与场次运行',
    label: '考试中心',
    path: '/assessment/exams',
  },
  {
    description: '阅卷、复核与申诉',
    label: '评分中心',
    path: '/assessment/scoring',
  },
  {
    description: '查看教学质量指标',
    label: '数据分析',
    path: '/assessment/analytics',
  },
];

function navigate(path: string) {
  void router.push(path);
}
</script>

<template>
  <Page>
    <div class="dashboard-page">
      <section class="hero">
        <div class="hero-copy">
          <Space wrap>
            <Tag color="blue">{{ schoolAssessmentState.school.name }}</Tag>
            <Tag>{{ schoolAssessmentState.school.academicYear }}</Tag>
            <Tag>{{ schoolAssessmentState.school.semester }}</Tag>
          </Space>
          <h1>考试业务工作台</h1>
          <p>
            {{ currentUserName }} ·
            {{ currentRoleLabel }}，聚合命题、审核、组卷、考试与阅卷任务。
          </p>
        </div>
        <Space wrap>
          <Button ghost @click="navigate('/assessment/items/editor')">
            新建题目
          </Button>
          <Button type="primary" @click="navigate('/assessment/papers')">
            创建试卷
          </Button>
        </Space>
      </section>

      <Row :gutter="[16, 16]">
        <Col :xs="12" :lg="6">
          <Card :bordered="false">
            <Statistic
              title="已发布题目"
              :value="publishedItemCount"
              suffix="道"
            />
          </Card>
        </Col>
        <Col :xs="12" :lg="6">
          <Card :bordered="false">
            <Statistic
              title="已封存试卷"
              :value="sealedFormCount"
              suffix="份"
            />
          </Card>
        </Col>
        <Col :xs="12" :lg="6">
          <Card :bordered="false">
            <Statistic
              title="运行中场次"
              :value="activeEventCount"
              suffix="场"
            />
          </Card>
        </Col>
        <Col :xs="12" :lg="6">
          <Card :bordered="false">
            <Statistic
              title="待人工阅卷"
              :value="manualScoringCount"
              suffix="题"
            />
          </Card>
        </Col>
      </Row>

      <Card title="业务待办" :bordered="false">
        <div class="task-grid">
          <button
            v-for="task in workQueue"
            :key="task.label"
            type="button"
            class="task-card"
            @click="navigate(task.path)"
          >
            <span
              class="task-accent"
              :style="{ background: task.color }"
            ></span>
            <span class="task-content">
              <span class="task-heading">
                <strong>{{ task.label }}</strong>
                <Tag :color="task.count > 0 ? 'warning' : 'success'">
                  {{ task.count }} 项
                </Tag>
              </span>
              <span>{{ task.description }}</span>
            </span>
          </button>
        </div>
      </Card>

      <Card title="三种交付运行概览" :bordered="false">
        <div class="delivery-grid">
          <article
            v-for="delivery in deliveryOverview"
            :key="delivery.label"
            class="delivery-card"
          >
            <div class="delivery-heading">
              <span>
                <i :style="{ background: delivery.color }"></i>
                <strong>{{ delivery.label }}</strong>
              </span>
              <Tag>{{ delivery.percent }}%</Tag>
            </div>
            <div class="delivery-metric">{{ delivery.metric }}</div>
            <Progress
              :percent="delivery.percent"
              :show-info="false"
              :stroke-color="delivery.color"
            />
            <p>{{ delivery.note }}</p>
          </article>
        </div>
      </Card>

      <div class="bottom-grid">
        <Card title="运行异常与提醒" :bordered="false">
          <div class="alert-list">
            <Alert
              v-for="alert in operationalAlerts"
              :key="alert.title"
              show-icon
              :type="alert.kind"
              :message="alert.title"
              :description="alert.description"
            />
          </div>
        </Card>

        <Card title="快捷入口" :bordered="false">
          <div class="quick-grid">
            <button
              v-for="entry in quickEntries"
              :key="entry.path"
              type="button"
              class="quick-entry"
              @click="navigate(entry.path)"
            >
              <strong>{{ entry.label }}</strong>
              <span>{{ entry.description }}</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero {
  position: relative;
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 28px 30px;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(circle at 86% 18%, rgb(56 189 248 / 28%), transparent 34%),
    radial-gradient(circle at 74% 92%, rgb(124 58 237 / 24%), transparent 32%),
    linear-gradient(125deg, #172554, #0f4c5c);
  border-radius: 16px;
}

.hero-copy {
  position: relative;
  z-index: 1;
}

.hero h1 {
  margin: 12px 0 6px;
  font-size: clamp(24px, 3vw, 30px);
  color: inherit;
}

.hero p {
  margin: 0;
  color: rgb(255 255 255 / 75%);
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.task-card,
.quick-entry {
  width: 100%;
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.task-card {
  position: relative;
  display: flex;
  min-height: 112px;
  overflow: hidden;
  background: hsl(var(--muted) / 35%);
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}

.task-card:hover,
.quick-entry:hover {
  border-color: #1677ff;
  transform: translateY(-2px);
}

.task-accent {
  flex: 0 0 5px;
  width: 5px;
}

.task-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  min-width: 0;
  padding: 16px;
}

.task-heading {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.task-content > span:last-child,
.delivery-card p,
.quick-entry span {
  font-size: 13px;
  color: hsl(var(--foreground) / 58%);
}

.delivery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.delivery-card {
  padding: 18px;
  background: hsl(var(--muted) / 28%);
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.delivery-heading,
.delivery-heading > span {
  display: flex;
  gap: 9px;
  align-items: center;
}

.delivery-heading {
  justify-content: space-between;
}

.delivery-heading i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.delivery-metric {
  margin: 18px 0 10px;
  font-size: 22px;
  font-weight: 600;
}

.delivery-card p {
  margin: 10px 0 0;
}

.bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 16px;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.quick-entry {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  background: hsl(var(--muted) / 28%);
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}

@media (max-width: 1200px) {
  .task-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .delivery-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 22px;
  }

  .task-grid,
  .quick-grid {
    grid-template-columns: 1fr;
  }
}
</style>
