<script lang="ts" setup>
import type {
  AttachmentReference,
  ResponseEnvelope,
  ResponseValue,
} from '../contracts';
import type { BankQuestion } from '../types';

import { computed } from 'vue';

import {
  Alert,
  Checkbox,
  Input,
  InputNumber,
  message,
  Radio,
  Select,
  Space,
  Tag,
} from 'ant-design-vue';

import { integrityChecksum } from '#/platform/integrity';

import { getInteractionPlugin } from '../plugins/registry';

const props = defineProps<{
  disabled?: boolean;
  modelValue?: ResponseEnvelope;
  question: BankQuestion;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ResponseEnvelope];
}>();

const plugin = computed(() => getInteractionPlugin(props.question.primitive));
const current = computed(
  () => props.modelValue ?? plugin.value.createInitialResponse(props.question),
);

const stringValue = computed(() =>
  typeof current.value.value === 'string' ? current.value.value : '',
);
const arrayValue = computed(() =>
  Array.isArray(current.value.value)
    ? current.value.value.map((item) => String(item ?? ''))
    : [],
);
const objectValue = computed<Record<string, unknown>>(() => {
  const value = current.value.value;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
});

function update(value: ResponseValue) {
  emit('update:modelValue', {
    primitive: props.question.primitive,
    value,
  });
}

function updateBlank(index: number, value: string) {
  const next = [...arrayValue.value];
  next[index] = value;
  update(next);
}

function updateNumeric(
  field: 'unit' | 'value',
  value: number | string | undefined,
) {
  update({
    unit: String(objectValue.value.unit ?? props.question.content.unit ?? ''),
    value:
      objectValue.value.value === undefined
        ? ''
        : String(objectValue.value.value),
    [field]: value === undefined ? '' : value,
  });
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const allowed = props.question.content.allowedFileTypes ?? [];
  const maxSize = (props.question.content.maxFileSizeMb ?? 20) * 1024 * 1024;
  if (allowed.length > 0 && !allowed.includes(file.type)) {
    message.error(`文件类型 ${file.type || '未知'} 不在允许范围内`);
    input.value = '';
    return;
  }
  if (file.size > maxSize) {
    message.error(`文件超过 ${props.question.content.maxFileSizeMb ?? 20} MB`);
    input.value = '';
    return;
  }
  const attachment: AttachmentReference = {
    contentHash: integrityChecksum({
      lastModified: file.lastModified,
      name: file.name,
      size: file.size,
      type: file.type,
    }),
    id: `local-file-${Date.now().toString(36)}`,
    mimeType: file.type || 'application/octet-stream',
    name: file.name,
    size: file.size,
  };
  update({ attachments: [attachment] });
}

const attachments = computed(() => {
  const value = objectValue.value.attachments;
  return Array.isArray(value) ? (value as AttachmentReference[]) : [];
});
</script>

<template>
  <div class="interaction" :class="{ 'is-disabled': disabled }">
    <Checkbox.Group
      v-if="question.primitive === 'choice' && question.content.multi"
      :disabled="disabled"
      :value="arrayValue"
      @update:value="update($event.map(String))"
    >
      <Space direction="vertical">
        <Checkbox
          v-for="option in question.content.options"
          :key="option.key"
          :value="option.key"
        >
          {{ option.key }}. {{ option.text }}
        </Checkbox>
      </Space>
    </Checkbox.Group>

    <Radio.Group
      v-else-if="question.primitive === 'choice'"
      :disabled="disabled"
      :value="stringValue"
      @update:value="update(String($event))"
    >
      <Space direction="vertical">
        <Radio
          v-for="option in question.content.options"
          :key="option.key"
          :value="option.key"
        >
          {{ option.key }}. {{ option.text }}
        </Radio>
      </Space>
    </Radio.Group>

    <Space
      v-else-if="question.primitive === 'blank'"
      direction="vertical"
      class="w-full"
    >
      <Input
        v-for="(_, index) in question.content.answers || ['']"
        :key="index"
        :disabled="disabled"
        :value="arrayValue[index] || ''"
        :placeholder="`第 ${index + 1} 空`"
        @update:value="updateBlank(index, String($event))"
      />
    </Space>

    <Space v-else-if="question.primitive === 'numeric'" wrap>
      <InputNumber
        :disabled="disabled"
        :value="Number(objectValue.value)"
        placeholder="输入数值"
        @update:value="updateNumeric('value', $event)"
      />
      <Select
        v-if="question.content.allowedUnits?.length"
        :disabled="disabled"
        :value="String(objectValue.unit || question.content.unit || '')"
        style="min-width: 110px"
        :options="
          question.content.allowedUnits.map((unit) => ({
            label: unit,
            value: unit,
          }))
        "
        @update:value="updateNumeric('unit', String($event))"
      />
      <Input
        v-else
        :disabled="disabled"
        :value="String(objectValue.unit || '')"
        placeholder="单位"
        style="width: 110px"
        @update:value="updateNumeric('unit', String($event))"
      />
    </Space>

    <Input
      v-else-if="question.primitive === 'formula'"
      :disabled="disabled"
      :value="stringValue"
      placeholder="输入 LaTeX 或公式文本"
      @update:value="update(String($event))"
    />

    <Input.TextArea
      v-else-if="question.primitive === 'text' || question.primitive === 'code'"
      :disabled="disabled"
      :rows="question.primitive === 'code' ? 10 : 6"
      :value="stringValue"
      :placeholder="
        question.primitive === 'code'
          ? `输入 ${question.content.codeLang || ''} 代码`
          : `建议不少于 ${question.content.minWords || 0} 字`
      "
      @update:value="update(String($event))"
    />

    <div v-else-if="question.primitive === 'file'" class="file-box">
      <input
        type="file"
        :disabled="disabled"
        :accept="(question.content.allowedFileTypes || []).join(',')"
        @change="onFileChange"
      />
      <Tag v-for="file in attachments" :key="file.id" color="blue">
        {{ file.name }} · {{ Math.ceil(file.size / 1024) }} KB
      </Tag>
      <p>
        允许
        {{ (question.content.allowedFileTypes || ['任意类型']).join('、') }}，
        单文件不超过 {{ question.content.maxFileSizeMb || 20 }} MB。
      </p>
    </div>

    <Alert
      v-else-if="question.primitive === 'rubric'"
      type="info"
      show-icon
      message="本题由考官现场记录"
      :description="`评分维度：${(question.content.rubric || []).join('、')}`"
    />

    <Input.TextArea
      v-else
      :disabled="disabled"
      :rows="5"
      :value="stringValue"
      placeholder="该专业交互当前使用结构化文本替代，正式环境由签名插件接管"
      @update:value="update(String($event))"
    />

    <p class="plugin-meta">
      {{ plugin.manifest.title }} · {{ plugin.manifest.version }} ·
      {{ plugin.manifest.scoring }}
    </p>
  </div>
</template>

<style scoped>
.interaction {
  width: 100%;
}

.file-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px dashed hsl(var(--border));
  border-radius: 6px;
}

.file-box p,
.plugin-meta {
  margin: 0;
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.plugin-meta {
  margin-top: 10px;
}

.is-disabled {
  opacity: 0.72;
}
</style>
