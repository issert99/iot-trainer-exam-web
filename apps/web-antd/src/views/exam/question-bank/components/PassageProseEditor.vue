<script lang="ts" setup>
/**
 * 正文优先挖空：像改试卷一样打字，选中挖空，点空设答法。
 */
import type { PassageProps, SlotBinding } from '../passage-model';

import { nextTick, onMounted, ref, watch } from 'vue';

import {
  Button,
  InputNumber,
  Radio,
  RadioGroup,
  Select,
  Space,
} from 'ant-design-vue';

import {
  applyBindingToAll,
  clozeParts,
  createDefaultPool,
  ensurePoolForSlots,
  insertBlankAtEnd,
  makeSlot,
  setDefaultOptionCount,
  setSlotBinding,
  SLOT_BINDING_OPTIONS,
  syncPassageSlots,
} from '../passage-model';

const props = defineProps<{
  modelValue: PassageProps;
}>();

const emit = defineEmits<{
  select: [];
  'update:modelValue': [value: PassageProps];
}>();

const proseEl = ref<HTMLElement>();
const activeMarker = ref<null | number>(null);
const painting = ref(false);

function cloneProps(): PassageProps {
  // eslint-disable-next-line unicorn/prefer-structured-clone
  return JSON.parse(JSON.stringify(props.modelValue)) as PassageProps;
}

function commit(next: PassageProps) {
  syncPassageSlots(next);
  ensurePoolForSlots(next);
  emit('update:modelValue', next);
}

function bindingShort(binding: SlotBinding) {
  switch (binding) {
    case 'formula': {
      return '公式';
    }
    case 'free_text': {
      return '手打';
    }
    case 'local_choice': {
      return '选项';
    }
    case 'number': {
      return '数值';
    }
    case 'shared_pool': {
      return '词库';
    }
    default: {
      return '';
    }
  }
}

function blankLabel(
  marker: number,
  binding: SlotBinding,
  optionCount?: number,
) {
  return binding === 'local_choice'
    ? `${marker}·${optionCount || 4}选`
    : `${marker}·${bindingShort(binding)}`;
}

function createBlankNode(
  marker: number,
  binding: SlotBinding,
  optionCount?: number,
) {
  const span = window.document.createElement('span');
  span.className = `sheet-blank sheet-blank--${binding.replaceAll('_', '-')}`;
  span.contentEditable = 'false';
  span.dataset.marker = String(marker);
  span.dataset.binding = binding;
  span.textContent = blankLabel(marker, binding, optionCount);
  span.title = '点击设置这个空怎么答';
  span.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    activeMarker.value = marker;
    emit('select');
  });
  return span;
}

function renderProse(
  root: HTMLElement,
  text: string,
  slots: PassageProps['slots'],
) {
  root.replaceChildren();
  if (!text?.trim() && slots?.length) {
    for (const slot of slots) {
      root.append(window.document.createTextNode('……'));
      root.append(createBlankNode(slot.marker, slot.binding, slot.optionCount));
      root.append(window.document.createTextNode(' '));
    }
    return;
  }
  for (const part of clozeParts(text || '')) {
    const match = part.match(/^\[\[(\d+)\]\]$/);
    if (match) {
      const marker = Number(match[1]);
      const slot = slots?.find((item) => item.marker === marker);
      root.append(
        createBlankNode(
          marker,
          slot?.binding || 'local_choice',
          slot?.optionCount,
        ),
      );
    } else if (part) {
      root.append(window.document.createTextNode(part));
    }
  }
}

function serializeProse(root: HTMLElement): string {
  let text = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.dataset?.marker) {
      text += `[[${el.dataset.marker}]]`;
      return;
    }
    if (el.tagName === 'BR') {
      text += '\n';
      return;
    }
    if (
      (el.tagName === 'DIV' || el.tagName === 'P') &&
      text &&
      !text.endsWith('\n')
    )
      text += '\n';
    for (const child of el.childNodes) walk(child);
  };
  for (const child of root.childNodes) walk(child);
  return text.replaceAll('\u00A0', ' ');
}

function refreshBlankLabels() {
  if (!proseEl.value) return;
  const slots = props.modelValue.slots || [];
  proseEl.value.querySelectorAll<HTMLElement>('.sheet-blank').forEach((el) => {
    const marker = Number(el.dataset.marker);
    const slot = slots.find((item) => item.marker === marker);
    if (!slot) return;
    el.dataset.binding = slot.binding;
    el.className = `sheet-blank sheet-blank--${slot.binding.replaceAll('_', '-')}`;
    el.textContent = blankLabel(marker, slot.binding, slot.optionCount);
  });
}

function paint() {
  if (!proseEl.value) return;
  painting.value = true;
  renderProse(proseEl.value, props.modelValue.text, props.modelValue.slots);
  painting.value = false;
}

function syncFromDom() {
  if (!proseEl.value || painting.value) return;
  const next = cloneProps();
  next.text = serializeProse(proseEl.value);
  const markers = [...next.text.matchAll(/\[\[(\d+)\]\]/g)].map((m) =>
    Number(m[1]),
  );
  const unique = [...new Set(markers)];
  const previous = next.slots || [];
  next.slots = unique.map((marker) => {
    const old = previous.find((item) => item.marker === marker);
    return (
      old ||
      makeSlot(
        marker,
        next.defaultBinding || 'local_choice',
        next.defaultOptionCount || 4,
      )
    );
  });
  commit(next);
}

onMounted(() => {
  paint();
});

watch(
  () => props.modelValue.text,
  (text) => {
    if (!proseEl.value || painting.value) return;
    const current = serializeProse(proseEl.value);
    if (current === text) {
      refreshBlankLabels();
      return;
    }
    paint();
  },
);

watch(
  () => props.modelValue.slots,
  () => refreshBlankLabels(),
  { deep: true },
);

function digSelection() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !proseEl.value) {
    insertAtEnd();
    return;
  }
  if (!proseEl.value.contains(sel.anchorNode)) {
    insertAtEnd();
    return;
  }
  const next = cloneProps();
  const marker =
    Math.max(0, ...(next.slots || []).map((item) => item.marker), 0) + 1;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const node = createBlankNode(
    marker,
    next.defaultBinding || 'local_choice',
    next.defaultOptionCount || 4,
  );
  range.insertNode(node);
  const after = window.document.createTextNode(' ');
  node.after(after);
  range.setStartAfter(after);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  next.text = serializeProse(proseEl.value);
  next.slots = [
    ...(next.slots || []).filter((item) => item.marker !== marker),
    makeSlot(
      marker,
      next.defaultBinding || 'local_choice',
      next.defaultOptionCount || 4,
    ),
  ].toSorted((a, b) => a.marker - b.marker);
  commit(next);
  activeMarker.value = marker;
}

function insertAtEnd() {
  const next = cloneProps();
  insertBlankAtEnd(next);
  commit(next);
  activeMarker.value = next.slots[next.slots.length - 1]?.marker ?? null;
  void nextTick(() => paint());
}

function activeSlot() {
  if (activeMarker.value === undefined || activeMarker.value === null)
    return undefined;
  return props.modelValue.slots?.find(
    (item) => item.marker === activeMarker.value,
  );
}

function setActiveBinding(binding: SlotBinding) {
  if (activeMarker.value === undefined || activeMarker.value === null) return;
  const next = cloneProps();
  setSlotBinding(next, activeMarker.value, binding);
  if (binding === 'shared_pool' && !next.pool)
    next.pool = createDefaultPool(15);
  commit(next);
}

function setActiveOptionCount(count: number) {
  if (activeMarker.value === undefined || activeMarker.value === null) return;
  const next = cloneProps();
  const slot = next.slots.find((item) => item.marker === activeMarker.value);
  if (!slot || slot.binding !== 'local_choice') return;
  slot.optionCount = count;
  slot.options = Array.from({ length: count }, (_, index) => ({
    key: String.fromCodePoint(65 + index),
    text: slot.options?.[index]?.text || '',
  }));
  commit(next);
}

function allLocal() {
  const next = cloneProps();
  applyBindingToAll(next, 'local_choice');
  setDefaultOptionCount(next, next.defaultOptionCount || 4);
  commit(next);
}

function allPool() {
  const next = cloneProps();
  applyBindingToAll(next, 'shared_pool');
  commit(next);
}

function updatePoolSize(size: number) {
  const next = cloneProps();
  if (!next.pool) next.pool = createDefaultPool(size);
  next.pool.size = size;
  commit(next);
}
</script>

<template>
  <div class="passage-prose-wrap" @click="$emit('select')">
    <div class="passage-prose-tools">
      <Button size="small" type="primary" @click.stop="digSelection">
        挖空（选中文字或插在光标处）
      </Button>
      <Button size="small" @click.stop="allLocal">全部改成每空选项</Button>
      <Button size="small" @click.stop="allPool">全部挂到共享词库</Button>
    </div>

    <div
      ref="proseEl"
      class="passage-prose"
      contenteditable="true"
      data-placeholder="在这里打字或粘贴文章，选中要挖的词后点「挖空」…"
      @input="syncFromDom"
      @mouseup="$emit('select')"
    ></div>

    <div v-if="activeSlot()" class="blank-panel">
      <div class="blank-panel-title">
        空 {{ activeMarker }} 怎么答？
        <Button size="small" type="link" @click="activeMarker = null">
          收起
        </Button>
      </div>
      <RadioGroup
        :value="activeSlot()!.binding"
        @update:value="(v) => setActiveBinding(v as SlotBinding)"
      >
        <Radio
          v-for="opt in SLOT_BINDING_OPTIONS"
          :key="opt.value"
          :value="opt.value"
          style="display: block; margin: 4px 0"
        >
          {{ opt.label }}
        </Radio>
      </RadioGroup>
      <div
        v-if="activeSlot()!.binding === 'local_choice'"
        class="blank-panel-row"
      >
        <span>选项数</span>
        <InputNumber
          size="small"
          :min="2"
          :max="12"
          :value="activeSlot()!.optionCount || 4"
          @update:value="(v) => setActiveOptionCount(Number(v) || 4)"
        />
      </div>
    </div>

    <div v-if="modelValue.pool" class="passage-pool-bar">
      <strong>共享词库</strong>
      <Space>
        <span>约</span>
        <InputNumber
          size="small"
          :min="2"
          :max="100"
          :value="modelValue.pool.size"
          @update:value="(v) => updatePoolSize(Number(v) || 2)"
        />
        <span>词</span>
        <Select
          size="small"
          style="width: 110px"
          :value="modelValue.pool.reuse"
          :options="[
            { label: '一词一次', value: 'once' },
            { label: '可重复', value: 'repeatable' },
          ]"
          @update:value="
            (v) => {
              const next = cloneProps();
              if (next.pool) next.pool.reuse = v as 'once' | 'repeatable';
              commit(next);
            }
          "
        />
      </Space>
    </div>

    <div
      v-if="(modelValue.slots || []).some((s) => s.binding === 'local_choice')"
      class="passage-option-preview"
    >
      <div
        v-for="slot in (modelValue.slots || []).filter(
          (s) => s.binding === 'local_choice',
        )"
        :key="slot.marker"
        class="passage-option-row"
      >
        <span>空{{ slot.marker }}</span>
        <span
          v-for="i in slot.optionCount || modelValue.defaultOptionCount || 4"
          :key="i"
          class="opt"
        >
          {{ String.fromCodePoint(64 + i) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.passage-prose-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.passage-prose-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.passage-prose {
  min-height: 140px;
  padding: 14px 16px;
  font-size: 16px;
  line-height: 1.85;
  color: #1c1917;
  word-break: normal;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  outline: none;
  background: #fff;
  border: 1px solid #e7e5e4;
  border-radius: 8px;
}

.passage-prose:empty::before {
  color: #a8a29e;
  pointer-events: none;
  content: attr(data-placeholder);
}

.passage-prose :deep(.sheet-blank) {
  display: inline-flex;
  align-items: center;
  min-width: 2em;
  padding: 0 8px;
  margin: 0 3px;
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
  cursor: pointer;
  user-select: none;
  background: #dbeafe;
  border: 1px dashed #3b82f6;
  border-radius: 999px;
}

.passage-prose :deep(.sheet-blank--shared-pool) {
  color: #166534;
  background: #dcfce7;
  border-color: #16a34a;
}

.passage-prose :deep(.sheet-blank--free-text),
.passage-prose :deep(.sheet-blank--number),
.passage-prose :deep(.sheet-blank--formula) {
  color: #9a3412;
  background: #ffedd5;
  border-color: #f97316;
}

.blank-panel {
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.blank-panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 650;
}

.blank-panel-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.passage-pool-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: #f0fdf4;
  border: 1px dashed #86efac;
  border-radius: 8px;
}

.passage-option-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.passage-option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: #57534e;
}

.passage-option-row .opt {
  padding: 1px 8px;
  background: #fff;
  border: 1px solid #d6d3d1;
  border-radius: 999px;
}
</style>
