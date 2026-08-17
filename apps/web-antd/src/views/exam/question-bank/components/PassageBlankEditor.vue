<script lang="ts" setup>
/**
 * 挖空文编辑：所见即空壳。改空数、改「怎么答」、挂词库 —— 不写真实文章。
 */
import type { PassageProps, SlotBinding } from '../passage-model';

import { computed } from 'vue';

import { Button, InputNumber, Select, Space } from 'ant-design-vue';

import {
  applyBindingToAll,
  setDefaultOptionCount,
  setPassageBlankCount,
  setSlotBinding,
  SLOT_BINDING_OPTIONS,
  syncPassageSlots,
} from '../passage-model';

const props = defineProps<{
  modelValue: PassageProps;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: PassageProps];
}>();

const passage = computed({
  get: () => {
    const value = props.modelValue;
    if (!value.slots) syncPassageSlots(value);
    return value;
  },
  set: (value: PassageProps) => emit('update:modelValue', value),
});

function patch(mutator: (next: PassageProps) => void) {
  // eslint-disable-next-line unicorn/prefer-structured-clone
  const next = JSON.parse(JSON.stringify(passage.value)) as PassageProps;
  mutator(next);
  emit('update:modelValue', next);
}

function bindingLabel(binding: SlotBinding) {
  return (
    SLOT_BINDING_OPTIONS.find((item) => item.value === binding)?.label ||
    binding
  );
}

function optionKeys(count: number) {
  return Array.from({ length: Math.max(2, count) }, (_, index) =>
    String.fromCodePoint(65 + index),
  );
}
</script>

<template>
  <div class="passage-editor">
    <div class="passage-sheet">
      <div class="passage-sheet-hint">文章区（创建题目时填写正文）</div>
      <div class="passage-blanks">
        <button
          v-for="slot in passage.slots"
          :key="slot.marker"
          class="passage-blank"
          :class="{
            pool: slot.binding === 'shared_pool',
            local: slot.binding === 'local_choice',
          }"
          type="button"
          :title="bindingLabel(slot.binding)"
          @click.stop
        >
          <span class="passage-blank-no">{{ slot.marker }}</span>
          <span class="passage-blank-mode">{{
            slot.binding === 'local_choice'
              ? `${slot.optionCount || passage.defaultOptionCount || 4} 选`
              : slot.binding === 'shared_pool'
                ? '词库'
                : bindingLabel(slot.binding)
          }}</span>
        </button>
      </div>

      <div
        v-if="passage.slots.some((s) => s.binding === 'local_choice')"
        class="passage-local-shells"
      >
        <div
          v-for="slot in passage.slots.filter(
            (s) => s.binding === 'local_choice',
          )"
          :key="`opt-${slot.marker}`"
          class="passage-local-row"
        >
          <strong>空{{ slot.marker }}</strong>
          <span
            v-for="key in optionKeys(
              slot.optionCount || passage.defaultOptionCount || 4,
            )"
            :key="key"
            class="passage-opt-chip"
          >
            {{ key }}
          </span>
        </div>
      </div>

      <div v-if="passage.pool" class="passage-pool">
        <div class="passage-pool-title">
          共享词库 · 约 {{ passage.pool.size }} 词 ·
          {{ passage.pool.reuse === 'repeatable' ? '可重复' : '一词一次' }}
        </div>
        <div class="passage-pool-chips">
          <span
            v-for="index in Math.min(passage.pool.size, 12)"
            :key="index"
            class="passage-pool-chip"
          >
            词{{ index }}
          </span>
          <span v-if="passage.pool.size > 12" class="passage-muted">
            …共 {{ passage.pool.size }}
          </span>
        </div>
      </div>
    </div>

    <div class="passage-toolbar">
      <label class="passage-field">
        <span>空位数</span>
        <InputNumber
          :value="passage.slots?.length || 1"
          :min="1"
          :max="50"
          style="width: 100%"
          @update:value="
            (value) =>
              patch((next) => setPassageBlankCount(next, Number(value) || 1))
          "
        />
      </label>
      <label class="passage-field">
        <span>全部空的答法</span>
        <Select
          :value="passage.defaultBinding"
          :options="SLOT_BINDING_OPTIONS"
          @update:value="
            (value) =>
              patch((next) => applyBindingToAll(next, value as SlotBinding))
          "
        />
      </label>
    </div>

    <template v-if="passage.defaultBinding === 'local_choice'">
      <label class="passage-field">
        <span>每空选项数</span>
        <InputNumber
          :value="passage.defaultOptionCount || 4"
          :min="2"
          :max="12"
          style="width: 100%"
          @update:value="
            (value) =>
              patch((next) => setDefaultOptionCount(next, Number(value) || 4))
          "
        />
      </label>
    </template>

    <template v-if="passage.pool">
      <Space style="width: 100%">
        <label class="passage-field" style="flex: 1">
          <span>词库规模</span>
          <InputNumber
            :value="passage.pool.size"
            :min="2"
            :max="100"
            style="width: 100%"
            @update:value="
              (value) =>
                patch((next) => {
                  if (next.pool) next.pool.size = Number(value) || 2;
                })
            "
          />
        </label>
        <label class="passage-field" style="flex: 1">
          <span>词库复用</span>
          <Select
            :value="passage.pool.reuse"
            :options="[
              { label: '一词一次', value: 'once' },
              { label: '可重复', value: 'repeatable' },
            ]"
            @update:value="
              (value) =>
                patch((next) => {
                  if (next.pool)
                    next.pool.reuse = value as 'once' | 'repeatable';
                })
            "
          />
        </label>
      </Space>
    </template>

    <div class="passage-section-title">逐空微调（可选）</div>
    <div
      v-for="slot in passage.slots"
      :key="`edit-${slot.marker}`"
      class="passage-slot-row"
    >
      <span>空{{ slot.marker }}</span>
      <Select
        size="small"
        :value="slot.binding"
        :options="SLOT_BINDING_OPTIONS"
        style="flex: 1"
        @update:value="
          (value) =>
            patch((next) =>
              setSlotBinding(next, slot.marker, value as SlotBinding),
            )
        "
      />
    </div>

    <div class="passage-quick">
      <Button
        size="small"
        @click="patch((next) => applyBindingToAll(next, 'local_choice'))"
      >
        全部改为每空选项
      </Button>
      <Button
        size="small"
        @click="patch((next) => applyBindingToAll(next, 'shared_pool'))"
      >
        全部挂到词库
      </Button>
    </div>
  </div>
</template>

<style scoped>
.passage-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.passage-sheet {
  padding: 12px;
  background: #fffef8;
  border: 1px solid #e7e5e4;
  border-radius: 10px;
}

.passage-sheet-hint {
  margin-bottom: 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.passage-blanks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.passage-blank {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  min-width: 52px;
  padding: 6px 8px;
  cursor: default;
  background: #eff6ff;
  border: 1px dashed #3b82f6;
  border-radius: 10px;
}

.passage-blank.pool {
  background: #f0fdf4;
  border-color: #16a34a;
}

.passage-blank.local {
  background: #eff6ff;
  border-color: #3b82f6;
}

.passage-blank-no {
  font-size: 14px;
  font-weight: 700;
  color: #1e3a8a;
}

.passage-blank.pool .passage-blank-no {
  color: #14532d;
}

.passage-blank-mode {
  font-size: 10px;
  color: hsl(var(--muted-foreground));
}

.passage-local-shells {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}

.passage-local-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  font-size: 12px;
}

.passage-opt-chip {
  padding: 1px 7px;
  font-size: 11px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
}

.passage-pool {
  padding: 10px;
  margin-top: 12px;
  background: #f0fdf4;
  border: 1px dashed #86efac;
  border-radius: 8px;
}

.passage-pool-title {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #166534;
}

.passage-pool-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.passage-pool-chip {
  padding: 2px 8px;
  font-size: 11px;
  background: #fff;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
}

.passage-muted {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.passage-toolbar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.passage-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.passage-section-title {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 650;
}

.passage-slot-row {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.passage-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
