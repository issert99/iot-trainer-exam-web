<script lang="ts" setup>
import type { AssessmentItemRevision, JsonValue } from '../../domain/types';

import { computed } from 'vue';

import { Input } from 'ant-design-vue';

const props = defineProps<{
  disabled?: boolean;
  item: AssessmentItemRevision;
  modelValue: JsonValue;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: JsonValue];
}>();

const value = computed(() =>
  typeof props.modelValue === 'string' ? props.modelValue : '',
);
const minimumWords = computed(() =>
  Number(props.item.interaction.config.minimumWords ?? 0),
);
</script>

<template>
  <div>
    <Input.TextArea
      :disabled="disabled"
      :rows="7"
      :value="value"
      :placeholder="`请输入作答内容，建议不少于 ${minimumWords} 字`"
      @update:value="emit('update:modelValue', String($event))"
    />
    <p class="counter">当前 {{ value.trim().length }} 字</p>
  </div>
</template>

<style scoped>
.counter {
  margin: 6px 0 0;
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
  text-align: right;
}
</style>
