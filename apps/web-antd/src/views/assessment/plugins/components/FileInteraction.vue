<script lang="ts" setup>
import type {
  AssessmentItemRevision,
  JsonObject,
  JsonValue,
} from '../../domain/types';

import { computed } from 'vue';

import { Alert, message, Tag } from 'ant-design-vue';

import { asObject, checksum, uid } from '../../domain/integrity';

const props = defineProps<{
  disabled?: boolean;
  item: AssessmentItemRevision;
  modelValue: JsonValue;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: JsonValue];
}>();

const allowedTypes = computed(() => {
  const value = props.item.interaction.config.allowedTypes;
  return Array.isArray(value) ? value.map(String) : [];
});
const maximumMegabytes = computed(() =>
  Number(props.item.interaction.config.maximumMegabytes ?? 20),
);
const files = computed(() => {
  const value = asObject(props.modelValue).files;
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is JsonObject =>
          Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
      )
    : [];
});

function onChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (
    allowedTypes.value.length > 0 &&
    !allowedTypes.value.includes(file.type)
  ) {
    message.error(`不允许上传 ${file.type || '未知类型'} 文件`);
    input.value = '';
    return;
  }
  if (file.size > maximumMegabytes.value * 1024 * 1024) {
    message.error(`文件不能超过 ${maximumMegabytes.value} MB`);
    input.value = '';
    return;
  }
  const metadata = {
    checksum: checksum({
      lastModified: file.lastModified,
      name: file.name,
      size: file.size,
      type: file.type,
    }),
    id: uid('attachment'),
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
  };
  emit('update:modelValue', { files: [metadata] });
}
</script>

<template>
  <div class="upload-box">
    <input
      type="file"
      :accept="allowedTypes.join(',')"
      :disabled="disabled"
      @change="onChange"
    />
    <div>
      <Tag v-for="file in files" :key="String(file.id)" color="blue">
        {{ file.name }} · {{ Math.ceil(Number(file.size) / 1024) }} KB
      </Tag>
    </div>
    <Alert
      type="info"
      show-icon
      :message="`允许 ${allowedTypes.join('、') || '任意类型'}，最大 ${maximumMegabytes} MB`"
      description="原型仅保存文件元数据；生产环境由对象存储、病毒扫描和内容哈希服务接管。"
    />
  </div>
</template>

<style scoped>
.upload-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
}
</style>
