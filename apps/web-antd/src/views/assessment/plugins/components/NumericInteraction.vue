<script lang="ts" setup>
import type { AssessmentItemRevision, JsonValue } from '../../domain/types';

import { computed } from 'vue';

import { Input, InputNumber, Select, Space } from 'ant-design-vue';

import { asObject } from '../../domain/integrity';

const props = defineProps<{
  disabled?: boolean;
  item: AssessmentItemRevision;
  modelValue: JsonValue;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: JsonValue];
}>();

const response = computed(() => asObject(props.modelValue));
const numericValue = computed(() => {
  const value = Number(response.value.value);
  return Number.isFinite(value) ? value : undefined;
});
const units = computed(() => {
  const value = props.item.interaction.config.units;
  return Array.isArray(value) ? value.map(String) : [];
});

function update(field: 'unit' | 'value', value: JsonValue) {
  emit('update:modelValue', {
    unit: String(response.value.unit ?? ''),
    value: response.value.value ?? '',
    [field]: value,
  });
}
</script>

<template>
  <Space wrap>
    <InputNumber
      :disabled="disabled"
      :value="numericValue"
      placeholder="输入数值"
      @update:value="update('value', $event ?? '')"
    />
    <Select
      v-if="units.length > 0"
      :disabled="disabled"
      :value="String(response.unit || '')"
      style="min-width: 110px"
      :options="units.map((unit) => ({ label: unit, value: unit }))"
      @update:value="update('unit', String($event))"
    />
    <Input
      v-else
      :disabled="disabled"
      :value="String(response.unit || '')"
      placeholder="单位"
      style="width: 110px"
      @update:value="update('unit', String($event))"
    />
  </Space>
</template>
