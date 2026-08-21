<script lang="ts" setup>
import type {
  AssessmentItemRevision,
  JsonObject,
  JsonValue,
} from '../../domain/types';

import { computed } from 'vue';

import { Checkbox, Radio, Space } from 'ant-design-vue';

const props = defineProps<{
  disabled?: boolean;
  item: AssessmentItemRevision;
  modelValue: JsonValue;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: JsonValue];
}>();

const options = computed(() => {
  const raw = props.item.interaction.config.options;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (entry): entry is JsonObject =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
    )
    .map((entry) => ({
      key: String(entry.key ?? ''),
      text: String(entry.text ?? ''),
    }));
});

const multiple = computed(
  () => props.item.interaction.config.multiple === true,
);
const arrayValue = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue.map(String) : [],
);
const stringValue = computed(() =>
  typeof props.modelValue === 'string' ? props.modelValue : '',
);
</script>

<template>
  <Checkbox.Group
    v-if="multiple"
    :disabled="disabled"
    :value="arrayValue"
    @update:value="emit('update:modelValue', $event.map(String))"
  >
    <Space direction="vertical">
      <Checkbox v-for="option in options" :key="option.key" :value="option.key">
        {{ option.key }}. {{ option.text }}
      </Checkbox>
    </Space>
  </Checkbox.Group>
  <Radio.Group
    v-else
    :disabled="disabled"
    :value="stringValue"
    @update:value="emit('update:modelValue', String($event))"
  >
    <Space direction="vertical">
      <Radio v-for="option in options" :key="option.key" :value="option.key">
        {{ option.key }}. {{ option.text }}
      </Radio>
    </Space>
  </Radio.Group>
</template>
