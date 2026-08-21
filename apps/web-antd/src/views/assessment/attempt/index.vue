<script lang="ts" setup>
import type { JsonValue, ResponseEvent } from '../domain/types';

import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  watchEffect,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  message,
  Modal,
  Progress,
  Space,
  Switch,
  Tag,
} from 'ant-design-vue';

import InteractionHost from '../components/InteractionHost.vue';
import ItemStem from '../components/ItemStem.vue';
import { getPlugin } from '../plugins/registry';
import {
  getAttempt,
  getExamEvent,
  saveAttemptResponse,
  setExamConnection,
  submitAttempt,
} from '../stores/exam';
import { schoolAssessmentState } from '../stores/state';

defineOptions({ name: 'AssessmentAttempt' });

type SaveState = 'error' | 'pending' | 'saved' | 'saving';

const route = useRoute();
const router = useRouter();
const attemptId = computed(() => String(route.query.attemptId ?? ''));
const attempt = computed(() => getAttempt(attemptId.value));
const examEvent = computed(() =>
  attempt.value ? getExamEvent(attempt.value.eventId) : undefined,
);
const form = computed(() =>
  schoolAssessmentState.forms.find(
    (entry) => entry.id === attempt.value?.testFormRevisionId,
  ),
);
const submission = computed(() =>
  schoolAssessmentState.submissions.find(
    (entry) => entry.attemptId === attemptId.value,
  ),
);
const responses = reactive<Record<string, JsonValue>>({});
const saveStates = reactive<Record<string, SaveState>>({});
const editVersions = reactive<Record<string, number>>({});
const currentIndex = ref(0);
const nowTimestamp = ref(Date.now());
const submitting = ref(false);
const autoSubmitted = ref(false);
const saveTimers = new Map<string, number>();
let clockTimer: number | undefined;

const flatItems = computed(() => {
  let number = 0;
  return (form.value?.sections ?? []).flatMap((section) =>
    section.items.map((entry) => {
      number += 1;
      return {
        ...entry,
        number,
        sectionName: section.name,
      };
    }),
  );
});
const currentEntry = computed(() => flatItems.value[currentIndex.value]);

function isAnswered(value: JsonValue | undefined): boolean {
  if (Array.isArray(value)) return value.some((entry) => isAnswered(entry));
  if (value && typeof value === 'object') {
    return Object.values(value).some((entry) => isAnswered(entry));
  }
  if (typeof value === 'boolean' || typeof value === 'number') return true;
  return String(value ?? '').trim().length > 0;
}

const answeredCount = computed(
  () =>
    flatItems.value.filter((entry) =>
      isAnswered(responses[entry.itemRevision.id]),
    ).length,
);
const progress = computed(() =>
  flatItems.value.length === 0
    ? 0
    : Math.round((answeredCount.value / flatItems.value.length) * 100),
);
const pendingEventCount = computed(
  () =>
    (schoolAssessmentState.responseEvents as unknown as ResponseEvent[]).filter(
      (event) =>
        event.attemptId === attemptId.value && event.syncState === 'pending',
    ).length,
);
const remainingSeconds = computed(() => {
  if (!attempt.value?.startedAt || !form.value) return 0;
  const allowedSeconds =
    form.value.durationMinutes *
    60 *
    (1 + (examEvent.value?.settings.extraTimePercent ?? 0) / 100);
  const elapsedSeconds = Math.floor(
    (nowTimestamp.value - new Date(attempt.value.startedAt).getTime()) / 1000,
  );
  return Math.max(0, Math.round(allowedSeconds - elapsedSeconds));
});
const remainingLabel = computed(() => {
  const hours = Math.floor(remainingSeconds.value / 3600);
  const minutes = Math.floor((remainingSeconds.value % 3600) / 60);
  const seconds = remainingSeconds.value % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
});
const overallSaveLabel = computed(() => {
  const states = Object.values(saveStates);
  if (states.includes('error')) return '部分作答保存失败';
  if (states.includes('saving') || states.includes('pending')) {
    return '正在自动保存…';
  }
  if (schoolAssessmentState.connection === 'offline') {
    return `已离线保存，${pendingEventCount.value} 条待同步`;
  }
  return '所有作答均已保存';
});
const canSubmit = computed(
  () => attempt.value?.status === 'in-progress' && !submitting.value,
);

watchEffect(() => {
  for (const entry of flatItems.value) {
    const id = entry.itemRevision.id;
    if (responses[id] !== undefined) continue;
    responses[id] =
      attempt.value?.responses[id]?.value ??
      getPlugin(entry.itemRevision.interaction.pluginId).createInitialValue(
        entry.itemRevision,
      );
    saveStates[id] = 'saved';
    editVersions[id] = attempt.value?.responseSequence ?? 0;
  }
});

watch(
  () => flatItems.value.length,
  (length) => {
    currentIndex.value =
      length === 0 ? 0 : Math.min(currentIndex.value, length - 1);
  },
);

watch(remainingSeconds, (seconds, previous) => {
  if (
    seconds === 0 &&
    previous > 0 &&
    attempt.value?.status === 'in-progress' &&
    !autoSubmitted.value
  ) {
    autoSubmitted.value = true;
    submitNow(true);
  }
});

function persistResponse(
  itemRevisionId: string,
  pluginId: string,
  version: number,
) {
  const activeAttempt = attempt.value;
  saveTimers.delete(itemRevisionId);
  if (!activeAttempt || activeAttempt.status !== 'in-progress') return;
  saveStates[itemRevisionId] = 'saving';
  try {
    saveAttemptResponse(
      activeAttempt.id,
      itemRevisionId,
      pluginId,
      responses[itemRevisionId] ?? '',
      `${activeAttempt.id}:${itemRevisionId}:${version}`,
    );
    saveStates[itemRevisionId] = 'saved';
  } catch (error) {
    saveStates[itemRevisionId] = 'error';
    message.error(error instanceof Error ? error.message : '自动保存失败');
  }
}

function scheduleSave(
  itemRevisionId: string,
  pluginId: string,
  value: JsonValue,
) {
  responses[itemRevisionId] = value;
  if (attempt.value?.status !== 'in-progress') return;
  saveStates[itemRevisionId] = 'pending';
  editVersions[itemRevisionId] = (editVersions[itemRevisionId] ?? 0) + 1;
  const version = editVersions[itemRevisionId] ?? 0;
  const existing = saveTimers.get(itemRevisionId);
  if (existing !== undefined) window.clearTimeout(existing);
  saveTimers.set(
    itemRevisionId,
    window.setTimeout(() => {
      persistResponse(itemRevisionId, pluginId, version);
    }, 650),
  );
}

function flushPendingResponses() {
  for (const entry of flatItems.value) {
    const id = entry.itemRevision.id;
    if (!['error', 'pending'].includes(saveStates[id] ?? 'saved')) continue;
    const timer = saveTimers.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    persistResponse(
      id,
      entry.itemRevision.interaction.pluginId,
      editVersions[id] ?? 0,
    );
  }
}

function changeConnection(online: boolean) {
  setExamConnection(online ? 'online' : 'offline');
  message.info(
    online
      ? '网络已恢复，离线响应已按序同步'
      : '已切换至离线作答，自动保存仍然有效',
  );
}

function goToItem(index: number) {
  if (index < 0 || index >= flatItems.value.length) return;
  currentIndex.value = index;
  window.scrollTo({ behavior: 'smooth', top: 0 });
}

function formatSavedAt(value?: string) {
  if (!value) return '尚未产生保存点';
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

async function submitNow(automatic = false) {
  const activeAttempt = attempt.value;
  if (!activeAttempt) return;
  submitting.value = true;
  try {
    flushPendingResponses();
    const snapshot = submitAttempt(activeAttempt.id);
    message.success(
      automatic
        ? '考试时间已到，答卷已自动提交'
        : `答卷已幂等提交，回执 ${snapshot.checksum.slice(0, 12)}`,
    );
    await router.push({
      path: '/assessment/scoring',
      query: { attemptId: activeAttempt.id },
    });
  } catch (error) {
    message.error(error instanceof Error ? error.message : '提交答卷失败');
  } finally {
    submitting.value = false;
  }
}

function confirmSubmit() {
  Modal.confirm({
    content: `已作答 ${answeredCount.value}/${flatItems.value.length} 题，尚有 ${
      flatItems.value.length - answeredCount.value
    } 题未作答。重复提交会返回同一份冻结快照。`,
    okButtonProps: { danger: true },
    okText: '确认提交',
    title: '提交整份答卷？',
    onOk: () => submitNow(false),
  });
}

async function enterFullscreen() {
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    message.warning('浏览器未允许全屏，请手动切换');
  }
}

onMounted(() => {
  clockTimer = window.setInterval(() => {
    nowTimestamp.value = Date.now();
  }, 1000);
});

onBeforeUnmount(() => {
  flushPendingResponses();
  saveTimers.forEach((timer) => window.clearTimeout(timer));
  saveTimers.clear();
  if (clockTimer !== undefined) window.clearInterval(clockTimer);
});
</script>

<template>
  <Page>
    <Alert
      v-if="!attempt || !form || !examEvent"
      type="error"
      show-icon
      message="无法打开答卷"
      description="请从考试中心进入已编排的考生场次，并确认 URL 中包含 attemptId。"
    />

    <div v-else class="attempt-shell">
      <header class="exam-bar">
        <div>
          <Space wrap>
            <Tag color="blue">{{ examEvent.name }}</Tag>
            <Tag>{{ form.id }}</Tag>
            <Tag :color="form.status === 'sealed' ? 'success' : 'warning'">
              {{ form.status === 'sealed' ? '冻结试卷' : form.status }}
            </Tag>
            <Tag color="success">身份已确认</Tag>
            <Tag color="success">设备检查通过</Tag>
          </Space>
          <h1>{{ form.name }}</h1>
          <p>
            考生 {{ attempt.candidateId }} · 满分 {{ form.totalScore }} ·
            试卷校验值 {{ form.checksum }}
          </p>
        </div>
        <div class="exam-actions">
          <Tag
            :color="
              schoolAssessmentState.connection === 'online'
                ? 'success'
                : 'warning'
            "
          >
            {{
              schoolAssessmentState.connection === 'online' ? '在线' : '离线'
            }}
          </Tag>
          <Button
            v-if="examEvent.settings.requireFullscreen"
            @click="enterFullscreen"
          >
            进入全屏
          </Button>
        </div>
      </header>

      <Alert
        v-if="schoolAssessmentState.connection === 'offline'"
        show-icon
        type="warning"
        message="当前处于离线作答模式"
        description="答案仍会写入本地事件队列；网络恢复后按响应序号同步，不会覆盖已保存记录。"
      />

      <div class="attempt-page">
        <aside class="navigator">
          <div
            class="timer"
            :class="{ urgent: remainingSeconds > 0 && remainingSeconds < 300 }"
          >
            <span>剩余时间</span>
            <strong>{{ remainingLabel }}</strong>
          </div>
          <Progress :percent="progress" size="small" />
          <p>{{ answeredCount }} / {{ flatItems.length }} 题已作答</p>

          <div class="question-grid">
            <button
              v-for="(entry, index) in flatItems"
              :key="entry.itemRevision.id"
              type="button"
              :class="{
                active: currentIndex === index,
                answered: isAnswered(responses[entry.itemRevision.id]),
              }"
              :title="`${entry.sectionName} · ${entry.itemRevision.title}`"
              @click="goToItem(index)"
            >
              {{ index + 1 }}
            </button>
          </div>

          <div class="save-panel">
            <div>
              <span>自动保存</span>
              <strong>{{ overallSaveLabel }}</strong>
            </div>
            <small>
              序号 {{ attempt.responseSequence }} ·
              {{ formatSavedAt(attempt.lastSavedAt) }}
            </small>
          </div>

          <div class="connection-row">
            <span>网络状态</span>
            <Switch
              :checked="schoolAssessmentState.connection === 'online'"
              checked-children="在线"
              un-checked-children="离线"
              @update:checked="changeConnection(Boolean($event))"
            />
          </div>
          <Button
            type="primary"
            danger
            block
            :disabled="!canSubmit"
            :loading="submitting"
            @click="confirmSubmit"
          >
            {{ attempt.status === 'in-progress' ? '提交答卷' : '答卷已锁定' }}
          </Button>
        </aside>

        <main class="paper">
          <Card v-if="currentEntry" :bordered="false" class="item-card">
            <template #title>
              <div class="item-title">
                <div>
                  <Tag color="blue">{{ currentEntry.sectionName }}</Tag>
                  <span>
                    第 {{ currentEntry.number }} 题 ·
                    {{ currentEntry.itemRevision.title }}
                  </span>
                </div>
                <Tag>{{ currentEntry.score }} 分</Tag>
              </div>
            </template>

            <ItemStem :document="currentEntry.itemRevision.stem" />
            <div class="interaction-area">
              <InteractionHost
                :disabled="attempt.status !== 'in-progress'"
                :item="currentEntry.itemRevision"
                :model-value="responses[currentEntry.itemRevision.id] ?? ''"
                @update:model-value="
                  scheduleSave(
                    currentEntry.itemRevision.id,
                    currentEntry.itemRevision.interaction.pluginId,
                    $event,
                  )
                "
              />
            </div>

            <div class="item-footer">
              <Button
                :disabled="currentIndex === 0"
                @click="goToItem(currentIndex - 1)"
              >
                上一题
              </Button>
              <span>
                {{ currentIndex + 1 }} / {{ flatItems.length }}
                <Tag
                  :color="
                    isAnswered(responses[currentEntry.itemRevision.id])
                      ? 'success'
                      : 'default'
                  "
                >
                  {{
                    isAnswered(responses[currentEntry.itemRevision.id])
                      ? '已作答'
                      : '未作答'
                  }}
                </Tag>
              </span>
              <Button
                v-if="currentIndex < flatItems.length - 1"
                type="primary"
                @click="goToItem(currentIndex + 1)"
              >
                下一题
              </Button>
              <Button
                v-else
                type="primary"
                danger
                :disabled="!canSubmit"
                @click="confirmSubmit"
              >
                检查并提交
              </Button>
            </div>
          </Card>

          <Card :bordered="false" class="integrity-card">
            <Descriptions size="small" :column="{ xs: 1, md: 2 }">
              <Descriptions.Item label="答卷 ID">
                {{ attempt.id }}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag>{{ attempt.status }}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="冻结版本">
                {{ attempt.testFormRevisionId }}
              </Descriptions.Item>
              <Descriptions.Item label="提交回执">
                {{ submission?.checksum || '尚未提交' }}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </main>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.attempt-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.exam-bar {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
}

.exam-bar h1 {
  margin: 10px 0 5px;
  font-size: 23px;
}

.exam-bar p {
  margin: 0;
  color: hsl(var(--foreground) / 60%);
}

.exam-actions {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  align-items: center;
}

.attempt-page {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.navigator {
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
}

.timer {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timer span,
.navigator p,
.save-panel span,
.save-panel small {
  margin: 0;
  font-size: 12px;
  color: hsl(var(--foreground) / 58%);
}

.timer strong {
  font-size: 27px;
  font-variant-numeric: tabular-nums;
}

.timer.urgent strong {
  color: hsl(var(--destructive));
}

.question-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 7px;
}

.question-grid button {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
}

.question-grid button.answered {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-color: hsl(var(--primary) / 45%);
}

.question-grid button.active {
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.save-panel {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px;
  background: hsl(var(--accent) / 50%);
  border-radius: 8px;
}

.save-panel div {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.save-panel strong {
  font-size: 12px;
}

.connection-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.paper {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.item-card {
  min-height: 500px;
}

.item-title {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.item-title > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.interaction-area {
  padding: 22px 0;
  margin-top: 20px;
  border-top: 1px solid hsl(var(--border));
}

.item-footer {
  display: grid;
  grid-template-columns: 120px 1fr 120px;
  gap: 12px;
  align-items: center;
  padding-top: 18px;
  margin-top: 24px;
  text-align: center;
  border-top: 1px solid hsl(var(--border));
}

.integrity-card {
  overflow: hidden;
}

@media (max-width: 900px) {
  .exam-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .attempt-page {
    grid-template-columns: 1fr;
  }

  .navigator {
    position: static;
  }

  .question-grid {
    grid-template-columns: repeat(10, minmax(30px, 1fr));
  }
}

@media (max-width: 640px) {
  .question-grid {
    grid-template-columns: repeat(5, 1fr);
  }

  .item-footer {
    grid-template-columns: 1fr 1fr;
  }

  .item-footer > span {
    grid-row: 1;
    grid-column: 1 / -1;
  }
}
</style>
