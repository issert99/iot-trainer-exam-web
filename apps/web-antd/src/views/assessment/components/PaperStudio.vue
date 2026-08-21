<script lang="ts" setup>
import type { TestFormRevision } from '../domain/types';

import { computed, ref, watchEffect } from 'vue';

import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { checksum, uid } from '../domain/integrity';
import { persistSchoolState, schoolAssessmentState } from '../stores/state';

const props = defineProps<{
  selectedFormId?: string;
}>();

const emit = defineEmits<{
  'update:selectedFormId': [formId: string];
}>();

const formOptions = computed(() =>
  schoolAssessmentState.forms.map((form) => ({
    label: `${form.name} · ${statusLabel(form.status)}`,
    value: form.id,
  })),
);

const activeFormId = computed({
  get: () => props.selectedFormId || schoolAssessmentState.forms[0]?.id || '',
  set: (value: string) => emit('update:selectedFormId', value),
});

watchEffect(() => {
  const firstId = schoolAssessmentState.forms[0]?.id;
  if (!props.selectedFormId && firstId) {
    emit('update:selectedFormId', firstId);
  }
});

const selectedForm = computed(() =>
  schoolAssessmentState.forms.find((form) => form.id === activeFormId.value),
);

const editable = computed(() => selectedForm.value?.status === 'draft');

const itemCount = computed(
  () =>
    selectedForm.value?.sections.reduce(
      (total, section) => total + section.items.length,
      0,
    ) ?? 0,
);

const averageDifficulty = computed(() => {
  const items =
    selectedForm.value?.sections.flatMap((section) => section.items) ?? [];
  if (items.length === 0) return 0;
  return Number(
    (
      items.reduce(
        (total, entry) => total + entry.itemRevision.metadata.difficulty,
        0,
      ) / items.length
    ).toFixed(1),
  );
});

const draggedSectionIndex = ref<number>();
const draggedItem = ref<{
  itemIndex: number;
  sectionIndex: number;
}>();

function statusLabel(status: TestFormRevision['status']) {
  return (
    {
      archived: '已归档',
      draft: '草稿',
      proofing: '校样中',
      sealed: '已封存',
      'under-approval': '审批中',
    }[status] ?? status
  );
}

function statusColor(status: TestFormRevision['status']) {
  return (
    {
      archived: 'default',
      draft: 'blue',
      proofing: 'orange',
      sealed: 'success',
      'under-approval': 'purple',
    }[status] ?? 'default'
  );
}

function itemTotal(form: TestFormRevision) {
  return form.sections.reduce(
    (total, section) => total + section.items.length,
    0,
  );
}

function sectionScore(section: TestFormRevision['sections'][number]) {
  return section.items.reduce((total, entry) => total + entry.score, 0);
}

function stemText(
  entry: TestFormRevision['sections'][number]['items'][number],
) {
  return entry.itemRevision.stem.blocks
    .map((block) => String(block.data.text ?? block.data.source ?? ''))
    .filter(Boolean)
    .join(' ');
}

function refreshCompatibility(form: TestFormRevision) {
  const issues: TestFormRevision['compatibility'] = [];
  form.sections
    .flatMap((section) => section.items)
    .forEach(({ itemRevision }) => {
      form.channels.forEach((channel) => {
        const variant = itemRevision.channelVariants.find(
          (entry) => entry.channel === channel,
        );
        if (!variant || variant.mode === 'unsupported') {
          issues.push({
            blocking: true,
            channel,
            code: 'CHANNEL_UNSUPPORTED',
            itemRevisionId: itemRevision.id,
            message: `${itemRevision.title} 不支持 ${channel} 渠道`,
          });
        } else if (variant.mode !== 'native') {
          issues.push({
            blocking: false,
            channel,
            code: 'CHANNEL_EQUIVALENT',
            itemRevisionId: itemRevision.id,
            message: `${itemRevision.title} 将使用 ${variant.mode} 呈现`,
          });
        }
      });
    });
  form.compatibility = issues;
}

function persistForm(showMessage = false) {
  const form = selectedForm.value;
  if (!form || form.status !== 'draft') return;
  form.totalScore = form.sections.reduce(
    (total, section) => total + sectionScore(section),
    0,
  );
  refreshCompatibility(form);
  form.checksum = checksum({ ...form, checksum: undefined });
  persistSchoolState();
  if (showMessage) message.success('章节、题序与分值已保存');
}

function addSection() {
  const form = selectedForm.value;
  if (!form || !editable.value) return;
  form.sections.push({
    id: uid('form-section'),
    items: [],
    name: `第 ${form.sections.length + 1} 部分`,
  });
  persistForm();
}

function removeSection(sectionIndex: number) {
  const form = selectedForm.value;
  const section = form?.sections[sectionIndex];
  if (!form || !section || !editable.value) return;
  if (form.sections.length === 1) {
    message.warning('试卷至少保留一个章节');
    return;
  }
  if (section.items.length > 0) {
    message.warning('请先将本章节题目拖到其他章节');
    return;
  }
  form.sections.splice(sectionIndex, 1);
  persistForm();
}

function removeItem(sectionIndex: number, itemIndex: number) {
  const form = selectedForm.value;
  if (!form || !editable.value) return;
  form.sections[sectionIndex]?.items.splice(itemIndex, 1);
  persistForm();
}

function startSectionDrag(index: number, event: DragEvent) {
  if (!editable.value) return;
  draggedSectionIndex.value = index;
  draggedItem.value = undefined;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `section:${index}`);
  }
}

function dropSection(targetIndex: number) {
  const form = selectedForm.value;
  const sourceIndex = draggedSectionIndex.value;
  if (
    !form ||
    !editable.value ||
    sourceIndex === undefined ||
    sourceIndex === targetIndex
  ) {
    draggedSectionIndex.value = undefined;
    return;
  }
  const [section] = form.sections.splice(sourceIndex, 1);
  if (!section) return;
  form.sections.splice(targetIndex, 0, section);
  draggedSectionIndex.value = undefined;
  persistForm();
  message.success('章节顺序已更新');
}

function startItemDrag(
  sectionIndex: number,
  itemIndex: number,
  event: DragEvent,
) {
  if (!editable.value) return;
  draggedItem.value = { itemIndex, sectionIndex };
  draggedSectionIndex.value = undefined;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'text/plain',
      `item:${sectionIndex}:${itemIndex}`,
    );
  }
}

function dropItem(targetSectionIndex: number, targetItemIndex: number) {
  const form = selectedForm.value;
  const source = draggedItem.value;
  if (!form || !editable.value || !source) return;
  const sourceSection = form.sections[source.sectionIndex];
  const targetSection = form.sections[targetSectionIndex];
  if (!sourceSection || !targetSection) return;
  const [entry] = sourceSection.items.splice(source.itemIndex, 1);
  if (!entry) return;
  let insertionIndex = targetItemIndex;
  if (
    source.sectionIndex === targetSectionIndex &&
    source.itemIndex < targetItemIndex
  ) {
    insertionIndex -= 1;
  }
  insertionIndex = Math.max(
    0,
    Math.min(insertionIndex, targetSection.items.length),
  );
  targetSection.items.splice(insertionIndex, 0, entry);
  draggedItem.value = undefined;
  persistForm();
  message.success('题目顺序已更新');
}

function finishDragging() {
  draggedSectionIndex.value = undefined;
  draggedItem.value = undefined;
}
</script>

<template>
  <div class="studio-layout">
    <aside class="result-panel">
      <Card :bordered="false" title="组卷结果">
        <Select
          v-model:value="activeFormId"
          class="form-selector"
          :options="formOptions"
          placeholder="选择试卷"
        />
        <div class="form-list">
          <button
            v-for="form in schoolAssessmentState.forms"
            :key="form.id"
            type="button"
            class="form-result"
            :class="{ active: form.id === activeFormId }"
            @click="activeFormId = form.id"
          >
            <span>
              <Tag :color="statusColor(form.status)">
                {{ statusLabel(form.status) }}
              </Tag>
              <Tag>{{ form.variant }} 卷</Tag>
            </span>
            <strong>{{ form.name }}</strong>
            <small>
              {{ itemTotal(form) }} 题 · {{ form.totalScore }} 分 ·
              {{ form.sections.length }} 章
            </small>
          </button>
        </div>
      </Card>
    </aside>

    <main class="studio-canvas">
      <Card v-if="selectedForm" :bordered="false">
        <template #title>
          <div class="canvas-title">
            <div>
              <Tag :color="statusColor(selectedForm.status)">
                {{ statusLabel(selectedForm.status) }}
              </Tag>
              <Tag color="geekblue">{{ selectedForm.variant }} 卷</Tag>
              <h2>{{ selectedForm.name }}</h2>
            </div>
            <Space wrap>
              <Button :disabled="!editable" @click="addSection">
                新增章节
              </Button>
              <Button
                type="primary"
                :disabled="!editable"
                @click="persistForm(true)"
              >
                保存工作室
              </Button>
            </Space>
          </div>
        </template>

        <Alert
          v-if="!editable"
          class="lock-alert"
          show-icon
          type="info"
          message="当前版本已进入校样或封存流程"
          description="为保持审批证据一致，章节、题序和分值只允许在草稿阶段调整。"
        />

        <div class="form-settings">
          <label>
            <span>试卷名称</span>
            <Input
              v-model:value="selectedForm.name"
              :disabled="!editable"
              @blur="persistForm()"
            />
          </label>
          <label>
            <span>考试时长</span>
            <InputNumber
              v-model:value="selectedForm.durationMinutes"
              :disabled="!editable"
              :min="15"
              :step="15"
              addon-after="分钟"
              @change="persistForm()"
            />
          </label>
          <div class="channel-tags">
            <span>交付渠道</span>
            <div>
              <Tag
                v-for="channel in selectedForm.channels"
                :key="channel"
                color="blue"
              >
                {{ channel }}
              </Tag>
            </div>
          </div>
        </div>

        <div class="studio-statistics">
          <Statistic
            title="章节"
            :value="selectedForm.sections.length"
            suffix="章"
          />
          <Statistic title="题量" :value="itemCount" suffix="题" />
          <Statistic
            title="总分"
            :value="selectedForm.totalScore"
            suffix="分"
          />
          <Statistic title="平均难度" :value="averageDifficulty" suffix="/ 5" />
          <Statistic
            title="兼容问题"
            :value="selectedForm.compatibility.length"
            suffix="项"
          />
        </div>

        <div class="sections">
          <section
            v-for="(section, sectionIndex) in selectedForm.sections"
            :key="section.id"
            class="paper-section"
          >
            <header
              class="section-header"
              @dragover.prevent
              @drop.stop="dropSection(sectionIndex)"
            >
              <Tooltip title="拖拽调整章节顺序">
                <span
                  class="drag-handle"
                  :class="{ disabled: !editable }"
                  :draggable="editable"
                  @dragend="finishDragging"
                  @dragstart.stop="startSectionDrag(sectionIndex, $event)"
                >
                  ⋮⋮
                </span>
              </Tooltip>
              <span class="section-number">{{ sectionIndex + 1 }}</span>
              <Input
                v-model:value="section.name"
                class="section-name"
                :disabled="!editable"
                @blur="persistForm()"
              />
              <Tag>{{ section.items.length }} 题</Tag>
              <Tag color="blue">{{ sectionScore(section) }} 分</Tag>
              <Button
                danger
                size="small"
                type="text"
                :disabled="!editable"
                @click="removeSection(sectionIndex)"
              >
                删除章节
              </Button>
            </header>

            <div v-if="section.items.length > 0" class="section-items">
              <article
                v-for="(entry, itemIndex) in section.items"
                :key="entry.itemRevision.id"
                class="studio-item"
                :draggable="editable"
                @dragend="finishDragging"
                @dragover.prevent.stop
                @dragstart.stop="startItemDrag(sectionIndex, itemIndex, $event)"
                @drop.stop="dropItem(sectionIndex, itemIndex)"
              >
                <span
                  class="drag-handle item-drag"
                  :class="{ disabled: !editable }"
                >
                  ⠿
                </span>
                <span class="item-index">{{ itemIndex + 1 }}</span>
                <div class="item-content">
                  <div class="item-heading">
                    <strong>{{ entry.itemRevision.title }}</strong>
                    <Space size="small" wrap>
                      <Tag> D{{ entry.itemRevision.metadata.difficulty }} </Tag>
                      <Tag color="cyan">
                        {{ entry.itemRevision.interaction.pluginId }}
                      </Tag>
                      <Tag>{{ entry.itemRevision.id }}</Tag>
                    </Space>
                  </div>
                  <p>{{ stemText(entry) }}</p>
                </div>
                <div class="score-editor">
                  <InputNumber
                    v-model:value="entry.score"
                    :disabled="!editable"
                    :min="0.5"
                    :step="0.5"
                    addon-after="分"
                    @change="persistForm()"
                  />
                  <Button
                    danger
                    size="small"
                    type="text"
                    :disabled="!editable"
                    @click="removeItem(sectionIndex, itemIndex)"
                  >
                    移除
                  </Button>
                </div>
              </article>
            </div>
            <div
              v-else
              class="empty-section"
              @dragover.prevent
              @drop.stop="dropItem(sectionIndex, 0)"
            >
              将其他章节的题目拖到这里
            </div>
            <div
              v-if="section.items.length > 0 && editable"
              class="drop-tail"
              @dragover.prevent
              @drop.stop="dropItem(sectionIndex, section.items.length)"
            >
              拖到此处移至章节末尾
            </div>
          </section>
        </div>
      </Card>
      <Card v-else :bordered="false">
        <Empty description="请先通过蓝图或选题篮创建试卷" />
      </Card>
    </main>
  </div>
</template>

<style scoped>
.studio-layout {
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.result-panel {
  position: sticky;
  top: 16px;
}

.form-selector {
  width: 100%;
  margin-bottom: 12px;
}

.form-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 660px;
  overflow: auto;
}

.form-result {
  display: flex;
  gap: 7px;
  width: 100%;
  padding: 12px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.form-result:hover,
.form-result.active {
  background: hsl(var(--accent) / 48%);
  border-color: #1677ff;
}

.form-result,
.form-result > span {
  flex-direction: column;
  align-items: flex-start;
}

.form-result > span {
  display: flex;
  flex-flow: row wrap;
}

.form-result small {
  color: hsl(var(--foreground) / 50%);
}

.studio-canvas {
  min-width: 0;
}

.canvas-title {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.canvas-title h2 {
  margin: 8px 0 0;
  font-size: 20px;
}

.lock-alert {
  margin-bottom: 16px;
}

.form-settings {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 180px minmax(180px, 0.6fr);
  gap: 14px;
  align-items: end;
}

.form-settings label,
.channel-tags {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.form-settings label > span,
.channel-tags > span {
  color: hsl(var(--foreground) / 60%);
}

.studio-statistics {
  display: grid;
  grid-template-columns: repeat(5, minmax(110px, 1fr));
  gap: 12px;
  padding: 16px;
  margin: 18px 0;
  background: hsl(var(--accent) / 38%);
  border-radius: 12px;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.paper-section {
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.section-header {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  background: hsl(var(--accent) / 50%);
  border-bottom: 1px solid hsl(var(--border));
}

.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  min-height: 28px;
  color: hsl(var(--foreground) / 45%);
  cursor: grab;
  user-select: none;
  border: 1px dashed hsl(var(--border));
  border-radius: 6px;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-handle.disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.section-number,
.item-index {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #1677ff;
  border-radius: 50%;
}

.section-number {
  width: 28px;
  height: 28px;
}

.item-index {
  width: 24px;
  height: 24px;
  font-size: 12px;
}

.section-name {
  flex: 1;
  min-width: 150px;
  font-weight: 600;
}

.section-items {
  display: flex;
  flex-direction: column;
}

.studio-item {
  display: grid;
  grid-template-columns: 28px 26px minmax(0, 1fr) 150px;
  gap: 10px;
  align-items: flex-start;
  padding: 14px;
  background: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
}

.studio-item:last-child {
  border-bottom: 0;
}

.studio-item[draggable='true']:hover {
  background: hsl(var(--accent) / 35%);
}

.item-drag {
  border: 0;
}

.item-content {
  min-width: 0;
}

.item-heading {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
}

.item-content p {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  -webkit-line-clamp: 2;
  line-height: 1.6;
  color: hsl(var(--foreground) / 58%);
  -webkit-box-orient: vertical;
}

.score-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.empty-section,
.drop-tail {
  padding: 22px;
  color: hsl(var(--foreground) / 45%);
  text-align: center;
  background: hsl(var(--accent) / 25%);
  border: 1px dashed transparent;
}

.drop-tail {
  padding: 8px;
  font-size: 12px;
  border-top-color: hsl(var(--border));
}

.empty-section:hover,
.drop-tail:hover {
  color: #1677ff;
  border-color: #1677ff;
}

@media (max-width: 1100px) {
  .studio-layout {
    grid-template-columns: 1fr;
  }

  .result-panel {
    position: static;
  }

  .form-list {
    max-height: 260px;
  }
}

@media (max-width: 760px) {
  .canvas-title,
  .section-header,
  .item-heading {
    align-items: flex-start;
  }

  .canvas-title,
  .section-header {
    flex-wrap: wrap;
  }

  .form-settings,
  .studio-statistics {
    grid-template-columns: 1fr 1fr;
  }

  .studio-item {
    grid-template-columns: 24px 24px minmax(0, 1fr);
  }

  .score-editor {
    flex-flow: row wrap;
    grid-column: 3;
    align-items: center;
  }
}
</style>
