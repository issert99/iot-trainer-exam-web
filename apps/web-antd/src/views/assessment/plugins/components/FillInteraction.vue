<script lang="ts" setup>
import type { AssessmentItemRevision, JsonValue } from '../../domain/types';

import { computed } from 'vue';

import { Input, Space } from 'ant-design-vue';

const props = defineProps<{
  disabled?: boolean;
  item: AssessmentItemRevision;
  modelValue: JsonValue;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: JsonValue];
}>();

const answerCount = computed(() => {
  const answers = props.item.interaction.config.answers;
  return Array.isArray(answers) ? Math.max(1, answers.length) : 1;
});

const values = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue.map(String) : [],
);

function update(index: number, value: string) {
  const next = [...values.value];
  next[index] = value;
  emit('update:modelValue', next);
}
</script>

<template>
  <Space direction="vertical" class="w-full">
    <Input
      v-for="index in answerCount"
      :key="index"
      :disabled="disabled"
      :value="values[index - 1] || ''"
      :placeholder="`第 ${index} 空`"
      @update:value="update(index - 1, String($event))"
    />
  </Space>
</template>
