<script lang="ts" setup>
import type { PracticalStation } from '../../domain/types';

import { computed, reactive, ref, watch, watchEffect } from 'vue';
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
  Switch,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import {
  submitPracticalEvidence,
  transitionExamEvent,
} from '../../stores/exam';
import { persistSchoolState, schoolAssessmentState } from '../../stores/state';

defineOptions({ name: 'AssessmentPracticalDelivery' });

type StationRuntime = {
  audioRecorded: boolean;
  evidenceNote: string;
  rubricScores: number[];
  signatures: Record<string, boolean>;
  videoRecorded: boolean;
};

const runtimeStorageKey = 'school-assessment:practical-runtime:v1';

function restoreRuntimes() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(
      window.localStorage.getItem(runtimeStorageKey) ?? '{}',
    ) as Record<string, StationRuntime>;
  } catch {
    return {};
  }
}

const route = useRoute();
const activeTab = ref('schedule');
const practicalEvents = computed(() =>
  schoolAssessmentState.events.filter(
    (event) => event.deliveryMode === 'practical',
  ),
);
const selectedEventId = ref(
  String(route.query.eventId ?? practicalEvents.value[0]?.id ?? ''),
);
const selectedEvent = computed(() =>
  practicalEvents.value.find((event) => event.id === selectedEventId.value),
);
const eventOptions = computed(() =>
  practicalEvents.value.map((event) => ({
    label: `${event.name} · ${event.candidateIds.length} 人`,
    value: event.id,
  })),
);
const stations = computed(() => schoolAssessmentState.practicalStations);
const runtimes = reactive<Record<string, StationRuntime>>(restoreRuntimes());
const rubricCriteria = ['操作规范', '临床判断', '沟通与安全', '证据完整性'];

watchEffect(() => {
  stations.value.forEach((station) => {
    runtimes[station.id] ??= {
      audioRecorded: false,
      evidenceNote: '',
      rubricScores: rubricCriteria.map(() => 0),
      signatures: Object.fromEntries(
        station.examinerIds.map((id) => [id, false]),
      ),
      videoRecorded: false,
    };
  });
});

watch(
  runtimes,
  (value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(runtimeStorageKey, JSON.stringify(value));
    }
  },
  { deep: true },
);

const scheduleRows = computed(() => {
  const event = selectedEvent.value;
  if (!event || stations.value.length === 0) return [];
  const start = new Date(event.startAt).getTime();
  return event.candidateIds.flatMap((candidateId, index) => {
    const station = stations.value[index % stations.value.length];
    if (!station) return [];
    const slot = new Date(start + index * 20 * 60 * 1000);
    return [
      {
        candidateId,
        id: `${candidateId}-${station.id}`,
        room: `实训中心 ${String((index % 6) + 1).padStart(2, '0')} 室`,
        slot: slot.toISOString(),
        station,
      },
    ];
  });
});
const runningCount = computed(
  () => stations.value.filter((station) => station.status === 'running').length,
);
const signedStationCount = computed(
  () =>
    stations.value.filter((station) => {
      const runtime = runtimes[station.id];
      return (
        runtime && station.examinerIds.every((id) => runtime.signatures[id])
      );
    }).length,
);
const archivedStationCount = computed(
  () => stations.value.filter((station) => station.status === 'closed').length,
);

const evidenceLabels: Record<
  PracticalStation['evidenceTypes'][number],
  string
> = {
  audio: '现场录音',
  file: '作品文件',
  image: '现场照片',
  rubric: '考官量规',
  video: '现场录像',
};

const stationStatusMeta: Record<
  PracticalStation['status'],
  { color: string; label: string }
> = {
  closed: { color: 'default', label: '已归档' },
  ready: { color: 'blue', label: '待执行' },
  running: { color: 'processing', label: '执行中' },
};

function stationInfo(value: unknown) {
  return (
    stationStatusMeta[String(value) as PracticalStation['status']] ??
    stationStatusMeta.ready
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function runtimeFor(stationId: string) {
  const runtime = runtimes[stationId];
  if (!runtime) {
    throw new Error(`考站运行时不存在：${stationId}`);
  }
  return runtime;
}

function evidenceChecks(station: PracticalStation) {
  const runtime = runtimeFor(station.id);
  return [
    {
      done: runtime.rubricScores.every((score) => score > 0),
      label: '现场量规',
      required: station.evidenceTypes.includes('rubric'),
    },
    {
      done: runtime.audioRecorded,
      label: '录音',
      required: station.evidenceTypes.includes('audio'),
    },
    {
      done: runtime.videoRecorded,
      label: '录像',
      required: station.evidenceTypes.includes('video'),
    },
    {
      done: runtime.evidenceNote.trim().length > 0,
      label: '考官证据说明',
      required: true,
    },
    {
      done: station.examinerIds.every((id) => runtime.signatures[id]),
      label: '考官签名',
      required: true,
    },
  ].filter((entry) => entry.required);
}

function evidenceProgress(station: PracticalStation) {
  const checks = evidenceChecks(station);
  return checks.length === 0
    ? 100
    : Math.round(
        (checks.filter((entry) => entry.done).length / checks.length) * 100,
      );
}

function startStation(station: PracticalStation) {
  const event = selectedEvent.value;
  try {
    if (event?.status === 'scheduled') {
      transitionExamEvent(event.id, 'ready', 'chief-examiner');
    }
    if (event?.status === 'ready') {
      transitionExamEvent(event.id, 'in-progress', 'chief-examiner');
    }
    station.status = 'running';
    persistSchoolState();
    activeTab.value = 'live';
    message.success(`${station.name} 已开站，现场证据开始留存`);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '考站启动失败');
  }
}

function sign(station: PracticalStation, examinerId: string) {
  const runtime = runtimeFor(station.id);
  runtime.signatures[examinerId] = true;
  message.success(`${examinerId} 已完成数字签名`);
}

function closeStation(station: PracticalStation) {
  const missing = evidenceChecks(station)
    .filter((entry) => !entry.done)
    .map((entry) => entry.label);
  if (missing.length > 0) {
    message.warning(`请先完成：${missing.join('、')}`);
    return;
  }
  const event = selectedEvent.value;
  const candidateId = event?.candidateIds[0];
  if (!event || !candidateId) {
    message.warning('当前考站没有已编排考生');
    return;
  }
  const runtime = runtimeFor(station.id);
  try {
    submitPracticalEvidence({
      candidateId,
      evidence: {
        evidenceNote: runtime.evidenceNote,
        rubricScores: [...runtime.rubricScores],
      },
      eventId: event.id,
      evidenceRefs: [
        `rubric:${station.id}`,
        ...(runtime.audioRecorded ? [`audio:${station.id}`] : []),
        ...(runtime.videoRecorded ? [`video:${station.id}`] : []),
      ],
      stationId: station.id,
    });
    message.success('考站已封存，并形成统一答卷快照进入评分');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '考站封存失败');
  }
}

function averageScore(stationId: string) {
  const scores = runtimeFor(stationId).rubricScores;
  if (scores.length === 0) return 0;
  return (
    scores.reduce((total, score) => total + score, 0) / scores.length
  ).toFixed(1);
}
</script>

<template>
  <Page>
    <div class="practical-page">
      <section class="heading">
        <div>
          <Tag color="purple">实践考试交付台</Tag>
          <h1>考站排程与现场证据</h1>
          <p>
            考生按时段轮转考站，授权考官同步记录量规、音视频与现场说明，并通过签名封存证据。
          </p>
        </div>
        <Select
          v-model:value="selectedEventId"
          class="event-select"
          :options="eventOptions"
          placeholder="选择实践考试场次"
        />
      </section>

      <Alert
        v-if="!selectedEvent"
        show-icon
        type="warning"
        message="暂无实践考试场次"
        description="请先在考试中心创建 deliveryMode 为 practical 的场次。"
      />

      <template v-else>
        <Row :gutter="[16, 16]">
          <Col :xs="12" :xl="6">
            <Card :bordered="false">
              <Statistic title="考站数" :value="stations.length" />
            </Card>
          </Col>
          <Col :xs="12" :xl="6">
            <Card :bordered="false">
              <Statistic title="排程考生" :value="scheduleRows.length" />
            </Card>
          </Col>
          <Col :xs="12" :xl="6">
            <Card :bordered="false">
              <Statistic title="运行中考站" :value="runningCount" />
            </Card>
          </Col>
          <Col :xs="12" :xl="6">
            <Card :bordered="false">
              <Statistic title="签名齐备考站" :value="signedStationCount" />
            </Card>
          </Col>
        </Row>

        <Card :bordered="false">
          <Tabs
            v-model:active-key="activeTab"
            :items="[
              { key: 'schedule', label: '考站排程' },
              { key: 'live', label: '现场执行' },
              {
                key: 'archive',
                label: `证据归档 (${archivedStationCount})`,
              },
            ]"
          />

          <template v-if="activeTab === 'schedule'">
            <Alert
              show-icon
              type="info"
              message="考生按 20 分钟时段轮转"
              description="每个时段绑定考站、考场和考官组；高风险实践考试必须保留双考官签名。"
            />
            <Table
              class="mt-4"
              row-key="id"
              :pagination="false"
              :scroll="{ x: 860 }"
              :data-source="scheduleRows"
              :columns="[
                { title: '考生编号', dataIndex: 'candidateId', minWidth: 170 },
                { title: '到站时间', key: 'slot', width: 180 },
                { title: '考站', key: 'station', minWidth: 190 },
                { title: '考场', dataIndex: 'room', width: 150 },
                { title: '考官', key: 'examiners', minWidth: 220 },
                { title: '状态', key: 'status', width: 110 },
              ]"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'slot'">
                  {{ formatDate(record.slot) }}
                </template>
                <template v-else-if="column.key === 'station'">
                  {{ record.station.name }}
                </template>
                <template v-else-if="column.key === 'examiners'">
                  <Space wrap>
                    <Tag v-for="id in record.station.examinerIds" :key="id">
                      {{ id }}
                    </Tag>
                  </Space>
                </template>
                <template v-else-if="column.key === 'status'">
                  <Tag :color="stationInfo(record.station.status).color">
                    {{ stationInfo(record.station.status).label }}
                  </Tag>
                </template>
              </template>
            </Table>
          </template>

          <template v-else-if="activeTab === 'live'">
            <div class="station-list">
              <Card
                v-for="station in stations"
                :key="station.id"
                :bordered="false"
                class="station-card"
              >
                <template #title>
                  <Space wrap>
                    <span>{{ station.name }}</span>
                    <Tag :color="stationStatusMeta[station.status].color">
                      {{ stationStatusMeta[station.status].label }}
                    </Tag>
                  </Space>
                </template>
                <template #extra>
                  <Space>
                    <Button
                      v-if="station.status === 'ready'"
                      type="primary"
                      @click="startStation(station)"
                    >
                      启动考站
                    </Button>
                    <Button
                      v-if="station.status === 'running'"
                      type="primary"
                      danger
                      @click="closeStation(station)"
                    >
                      签名并封存
                    </Button>
                  </Space>
                </template>

                <div class="station-meta">
                  <div>
                    <span>考官组</span>
                    <Space wrap>
                      <Tag
                        v-for="id in station.examinerIds"
                        :key="id"
                        color="blue"
                      >
                        {{ id }}
                      </Tag>
                    </Space>
                  </div>
                  <div>
                    <span>要求证据</span>
                    <Space wrap>
                      <Tag
                        v-for="type in station.evidenceTypes"
                        :key="type"
                        color="purple"
                      >
                        {{ evidenceLabels[type] }}
                      </Tag>
                    </Space>
                  </div>
                </div>

                <div class="live-grid">
                  <div class="rubric-panel">
                    <h3>现场量规</h3>
                    <div
                      v-for="(criterion, index) in rubricCriteria"
                      :key="criterion"
                      class="rubric-row"
                    >
                      <span>{{ criterion }}</span>
                      <InputNumber
                        v-model:value="
                          runtimeFor(station.id).rubricScores[index]
                        "
                        :min="0"
                        :max="5"
                        :disabled="station.status !== 'running'"
                        addon-after="/ 5"
                      />
                    </div>
                    <Input.TextArea
                      v-model:value="runtimeFor(station.id).evidenceNote"
                      :rows="4"
                      :disabled="station.status !== 'running'"
                      placeholder="记录关键行为、判断依据与扣分证据"
                    />
                  </div>

                  <div class="evidence-panel">
                    <h3>录音录像与签名</h3>
                    <div class="switch-row">
                      <span>现场录音</span>
                      <Switch
                        v-model:checked="runtimeFor(station.id).audioRecorded"
                        :disabled="
                          station.status !== 'running' ||
                          !station.evidenceTypes.includes('audio')
                        "
                        checked-children="已留存"
                        un-checked-children="未开始"
                      />
                    </div>
                    <div class="switch-row">
                      <span>现场录像</span>
                      <Switch
                        v-model:checked="runtimeFor(station.id).videoRecorded"
                        :disabled="
                          station.status !== 'running' ||
                          !station.evidenceTypes.includes('video')
                        "
                        checked-children="已留存"
                        un-checked-children="未开始"
                      />
                    </div>
                    <div class="signature-list">
                      <div
                        v-for="examinerId in station.examinerIds"
                        :key="examinerId"
                      >
                        <div>
                          <strong>{{ examinerId }}</strong>
                          <small>考官数字签名</small>
                        </div>
                        <Button
                          size="small"
                          :disabled="
                            Boolean(
                              runtimeFor(station.id).signatures[examinerId],
                            ) || station.status !== 'running'
                          "
                          :type="
                            runtimeFor(station.id).signatures[examinerId]
                              ? 'default'
                              : 'primary'
                          "
                          @click="sign(station, examinerId)"
                        >
                          {{
                            runtimeFor(station.id).signatures[examinerId]
                              ? '已签名'
                              : '确认签名'
                          }}
                        </Button>
                      </div>
                    </div>
                    <Progress
                      :percent="evidenceProgress(station)"
                      :status="
                        station.status === 'running' ? 'active' : 'normal'
                      "
                    />
                    <small>证据包完整度</small>
                  </div>
                </div>
              </Card>
            </div>
          </template>

          <template v-else>
            <Alert
              show-icon
              :type="archivedStationCount > 0 ? 'success' : 'info'"
              :message="
                archivedStationCount > 0
                  ? `${archivedStationCount} 个考站证据包已封存`
                  : '尚无已封存考站'
              "
              description="封存后量规得分、原始音视频引用、现场说明和考官签名共同构成不可拆分的评分证据。"
            />
            <div class="archive-grid">
              <Card
                v-for="station in stations"
                :key="station.id"
                :bordered="false"
                :title="station.name"
              >
                <Descriptions bordered size="small" :column="1">
                  <Descriptions.Item label="归档状态">
                    <Tag
                      :color="
                        station.status === 'closed' ? 'success' : 'warning'
                      "
                    >
                      {{
                        station.status === 'closed'
                          ? '证据已封存'
                          : '证据采集中'
                      }}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="量规均分">
                    {{ averageScore(station.id) }} / 5
                  </Descriptions.Item>
                  <Descriptions.Item label="录音 / 录像">
                    {{
                      runtimeFor(station.id).audioRecorded ? '已留存' : '缺失'
                    }}
                    /
                    {{
                      runtimeFor(station.id).videoRecorded ? '已留存' : '缺失'
                    }}
                  </Descriptions.Item>
                  <Descriptions.Item label="考官签名">
                    <Space wrap>
                      <Tag
                        v-for="id in station.examinerIds"
                        :key="id"
                        :color="
                          runtimeFor(station.id).signatures[id]
                            ? 'success'
                            : 'default'
                        "
                      >
                        {{ id }} ·
                        {{
                          runtimeFor(station.id).signatures[id]
                            ? '已签'
                            : '待签'
                        }}
                      </Tag>
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </div>
          </template>
        </Card>
      </template>
    </div>
  </Page>
</template>

<style scoped>
.practical-page {
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
  max-width: 840px;
  margin: 0;
  line-height: 1.65;
  color: hsl(var(--foreground) / 60%);
}

.event-select {
  width: 360px;
}

.station-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.station-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 18px;
  border-bottom: 1px solid hsl(var(--border));
}

.station-meta > div {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.station-meta span,
.evidence-panel > small {
  font-size: 12px;
  color: hsl(var(--foreground) / 58%);
}

.live-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
  gap: 24px;
}

.live-grid h3 {
  margin: 0 0 14px;
}

.rubric-panel,
.evidence-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rubric-row,
.switch-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.rubric-row > span {
  flex: 1;
}

.signature-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: hsl(var(--accent) / 45%);
  border-radius: 10px;
}

.signature-list > div {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.signature-list > div > div {
  display: flex;
  flex-direction: column;
}

.signature-list small {
  color: hsl(var(--foreground) / 55%);
}

.archive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
  margin-top: 16px;
}

@media (max-width: 900px) {
  .heading {
    flex-direction: column;
    align-items: stretch;
  }

  .event-select {
    width: 100%;
  }

  .live-grid,
  .station-meta {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .station-card :deep(.ant-card-head) {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
}
</style>
