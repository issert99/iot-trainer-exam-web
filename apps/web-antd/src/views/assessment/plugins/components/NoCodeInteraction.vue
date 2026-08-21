<script lang="ts" setup>
import type {
  AssessmentItemRevision,
  InteractionControl,
  JsonValue,
} from '../../domain/types';

import { computed } from 'vue';

import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  Radio,
  Rate,
  Select,
  Space,
  Tag,
  Upload,
} from 'ant-design-vue';

import { asObject } from '../../domain/integrity';
import { schoolAssessmentState } from '../../stores/state';

const props = defineProps<{
  disabled?: boolean;
  item: AssessmentItemRevision;
  modelValue: JsonValue;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: JsonValue];
}>();

const template = computed(() =>
  schoolAssessmentState.interactionTemplates.find(
    (entry) => entry.id === props.item.interaction.templateRevisionId,
  ),
);
const response = computed(() => asObject(props.modelValue));

function options(control: InteractionControl) {
  const values = control.config.options;
  return Array.isArray(values) ? values.map(String) : [];
}

function update(controlId: string, value: JsonValue) {
  emit('update:modelValue', {
    ...response.value,
    [controlId]: value,
  });
}

function matrixRows(control: InteractionControl) {
  return Array.isArray(control.config.rows)
    ? control.config.rows.map(String)
    : [];
}

function matrixColumns(control: InteractionControl) {
  return Array.isArray(control.config.columns)
    ? control.config.columns.map(String)
    : [];
}

function stringArray(value: JsonValue | undefined) {
  return Array.isArray(value) ? value.map(String) : [];
}
</script>

<template>
  <div v-if="template" class="no-code-runtime">
    <article
      v-for="control in template.controls"
      :key="control.id"
      class="runtime-control"
      :class="`span-${control.width}`"
    >
      <label>
        {{ control.label }}
        <Tag v-if="control.required" color="red">必填</Tag>
        <small>{{ Math.round(control.scoreWeight * 100) }}% 权重</small>
      </label>

      <Input
        v-if="['formula', 'text'].includes(control.type)"
        :disabled="disabled"
        :value="String(response[control.id] ?? '')"
        :placeholder="control.type === 'formula' ? '输入公式' : '输入答案'"
        @update:value="update(control.id, String($event))"
      />
      <Input.TextArea
        v-else-if="control.type === 'textarea'"
        :disabled="disabled"
        :rows="Number(control.config.rows ?? 4)"
        :value="String(response[control.id] ?? '')"
        @update:value="update(control.id, String($event))"
      />
      <InputNumber
        v-else-if="control.type === 'number'"
        :disabled="disabled"
        :min="Number(control.config.min ?? 0)"
        :max="Number(control.config.max ?? 999999)"
        :precision="Number(control.config.precision ?? 2)"
        :value="
          typeof response[control.id] === 'number'
            ? Number(response[control.id])
            : undefined
        "
        class="w-full"
        @update:value="update(control.id, $event ?? '')"
      />
      <Radio.Group
        v-else-if="control.type === 'single-choice'"
        :disabled="disabled"
        :value="String(response[control.id] ?? '')"
        @update:value="update(control.id, String($event))"
      >
        <Space direction="vertical">
          <Radio
            v-for="option in options(control)"
            :key="option"
            :value="option"
          >
            {{ option }}
          </Radio>
        </Space>
      </Radio.Group>
      <Checkbox.Group
        v-else-if="control.type === 'multi-choice'"
        :disabled="disabled"
        :options="options(control)"
        :value="stringArray(response[control.id])"
        @update:value="update(control.id, $event.map(String))"
      />
      <Select
        v-else-if="control.type === 'select'"
        :disabled="disabled"
        :options="
          options(control).map((option) => ({
            label: option,
            value: option,
          }))
        "
        :value="String(response[control.id] ?? '')"
        class="w-full"
        @update:value="update(control.id, String($event))"
      />
      <Rate
        v-else-if="control.type === 'rating'"
        :disabled="disabled"
        :value="Number(response[control.id] ?? 0)"
        @update:value="update(control.id, Number($event))"
      />
      <div v-else-if="control.type === 'matrix'" class="matrix">
        <div v-for="row in matrixRows(control)" :key="row" class="matrix-row">
          <span>{{ row }}</span>
          <Radio.Group
            :disabled="disabled"
            :options="matrixColumns(control)"
            :value="String(asObject(response[control.id])[row] ?? '')"
            @update:value="
              update(control.id, {
                ...asObject(response[control.id]),
                [row]: String($event),
              })
            "
          />
        </div>
      </div>
      <Upload
        v-else-if="control.type === 'file'"
        :disabled="disabled"
        :before-upload="() => false"
      >
        <Button>选择作品文件</Button>
      </Upload>
      <div
        v-else-if="
          ['audio', 'drawing', 'hotspot', 'table', 'video'].includes(
            control.type,
          )
        "
        class="special-placeholder"
      >
        <strong>{{ control.type }}</strong>
        <span>受控交互画布</span>
        <Button :disabled="disabled" size="small">打开演示</Button>
      </div>
    </article>
  </div>
  <div v-else class="missing-template">交互模板版本不存在</div>
</template>

<style scoped>
.no-code-runtime {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.runtime-control {
  grid-column: span 4;
}

.runtime-control.span-1 {
  grid-column: span 1;
}

.runtime-control.span-2 {
  grid-column: span 2;
}

.runtime-control.span-3 {
  grid-column: span 3;
}

.runtime-control > label {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
}

.runtime-control small {
  margin-left: auto;
  font-weight: 400;
  color: hsl(var(--foreground) / 45%);
}

.matrix {
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.matrix-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.matrix-row:last-child {
  border-bottom: 0;
}

.special-placeholder {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 18px;
  background: hsl(var(--accent) / 45%);
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
}

.special-placeholder span {
  flex: 1;
  color: hsl(var(--foreground) / 55%);
}

.missing-template {
  padding: 16px;
  color: hsl(var(--destructive));
}

@media (max-width: 760px) {
  .runtime-control,
  .runtime-control.span-1,
  .runtime-control.span-2,
  .runtime-control.span-3 {
    grid-column: span 4;
  }
}
</style>
