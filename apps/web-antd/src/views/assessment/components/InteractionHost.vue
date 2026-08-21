<script lang="ts" setup>
import type { AssessmentItemRevision, JsonValue } from '../domain/types';

import { computed } from 'vue';

import { Alert } from 'ant-design-vue';

import { getPlugin } from '../plugins/registry';

const props = defineProps<{
  disabled?: boolean;
  item: AssessmentItemRevision;
  modelValue: JsonValue;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: JsonValue];
}>();

const plugin = computed(() => {
  try {
    return getPlugin(props.item.interaction.pluginId);
  } catch {
    return undefined;
  }
});
</script>

<template>
  <component
    v-if="plugin"
    :is="plugin.onlineComponent"
    :disabled="disabled"
    :item="item"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <Alert
    v-else
    type="error"
    show-icon
    :message="`交互插件未就绪：${item.interaction.pluginId}`"
    description="题目内容仍可查看，但必须启用被锁定的插件版本后才能作答。"
  />
</template>
