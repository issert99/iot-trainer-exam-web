<script lang="ts" setup>
import type { ContentBlock, ContentDocument } from '../domain/types';

import { computed } from 'vue';

import { Button, Empty, Input, Select, Space, Tag } from 'ant-design-vue';

type EditableBlockType = 'callout' | 'code' | 'formula' | 'paragraph';

const props = defineProps<{
  modelValue: ContentDocument;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ContentDocument];
}>();

const blockTypeOptions: Array<{
  label: string;
  value: EditableBlockType;
}> = [
  { label: '正文段落', value: 'paragraph' },
  { label: '提示块', value: 'callout' },
  { label: '公式', value: 'formula' },
  { label: '代码', value: 'code' },
];

const blocks = computed(() => props.modelValue.blocks);

function valueKey(type: ContentBlock['type']) {
  return type === 'code' || type === 'formula' ? 'source' : 'text';
}

function blockValue(block: ContentBlock) {
  return String(
    block.data[valueKey(block.type)] ??
      block.data.text ??
      block.data.source ??
      '',
  );
}

function emitBlocks(nextBlocks: ContentBlock[]) {
  emit('update:modelValue', {
    blocks: nextBlocks,
    schemaVersion: '1.0',
  });
}

function createBlock(type: EditableBlockType): ContentBlock {
  const key = valueKey(type);
  return {
    data: { [key]: '' },
    id: `draft-block-${Date.now()}-${blocks.value.length + 1}`,
    type,
  };
}

function addBlock(type: EditableBlockType) {
  emitBlocks([...blocks.value, createBlock(type)]);
}

function updateBlockValue(id: string, value: string) {
  emitBlocks(
    blocks.value.map((block) =>
      block.id === id
        ? {
            ...block,
            data: { ...block.data, [valueKey(block.type)]: value },
          }
        : block,
    ),
  );
}

function updateBlockType(id: string, value: unknown) {
  const type = String(value) as EditableBlockType;
  emitBlocks(
    blocks.value.map((block) =>
      block.id === id
        ? {
            ...block,
            data: { [valueKey(type)]: blockValue(block) },
            type,
          }
        : block,
    ),
  );
}

function removeBlock(id: string) {
  emitBlocks(blocks.value.filter((block) => block.id !== id));
}

function moveBlock(index: number, offset: -1 | 1) {
  const target = index + offset;
  if (target < 0 || target >= blocks.value.length) return;
  const next = [...blocks.value];
  const current = next[index];
  const destination = next[target];
  if (!current || !destination) return;
  next[index] = destination;
  next[target] = current;
  emitBlocks(next);
}
</script>

<template>
  <div class="content-block-editor">
    <div class="content-block-editor__toolbar">
      <div>
        <strong>内容画布</strong>
        <span>按块组织题干，预览会同步更新</span>
      </div>
      <Space wrap>
        <Button size="small" @click="addBlock('paragraph')">+ 段落</Button>
        <Button size="small" @click="addBlock('formula')">+ 公式</Button>
        <Button size="small" @click="addBlock('callout')">+ 提示</Button>
        <Button size="small" @click="addBlock('code')">+ 代码</Button>
      </Space>
    </div>

    <Empty
      v-if="blocks.length === 0"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
      description="添加第一个内容块开始命题"
    />

    <article
      v-for="(block, index) in blocks"
      :key="block.id"
      class="content-block-editor__block"
    >
      <header>
        <div class="content-block-editor__block-title">
          <Tag>{{ index + 1 }}</Tag>
          <Select
            :options="blockTypeOptions"
            size="small"
            :value="block.type"
            @update:value="updateBlockType(block.id, $event)"
          />
        </div>
        <Space :size="4">
          <Button
            size="small"
            type="text"
            :disabled="index === 0"
            @click="moveBlock(index, -1)"
          >
            上移
          </Button>
          <Button
            size="small"
            type="text"
            :disabled="index === blocks.length - 1"
            @click="moveBlock(index, 1)"
          >
            下移
          </Button>
          <Button
            danger
            size="small"
            type="text"
            @click="removeBlock(block.id)"
          >
            删除
          </Button>
        </Space>
      </header>

      <Input.TextArea
        :auto-size="{
          minRows: block.type === 'paragraph' ? 4 : 2,
          maxRows: 12,
        }"
        :class="`content-block-editor__input--${block.type}`"
        :placeholder="
          block.type === 'formula'
            ? '输入公式或 LaTeX 表达式'
            : block.type === 'code'
              ? '输入代码、伪代码或配置片段'
              : '输入题干内容'
        "
        :value="blockValue(block)"
        @update:value="updateBlockValue(block.id, $event)"
      />
    </article>
  </div>
</template>

<style scoped>
.content-block-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 320px;
}

.content-block-editor__toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.content-block-editor__toolbar > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.content-block-editor__toolbar span {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.content-block-editor__block {
  padding: 12px;
  background: hsl(var(--accent) / 28%);
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.content-block-editor__block header,
.content-block-editor__block-title {
  display: flex;
  align-items: center;
}

.content-block-editor__block header {
  justify-content: space-between;
  margin-bottom: 10px;
}

.content-block-editor__block-title {
  gap: 6px;
}

.content-block-editor__input--formula :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  text-align: center;
}

.content-block-editor__input--code :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

@media (max-width: 640px) {
  .content-block-editor__toolbar {
    align-items: flex-start;
  }
}
</style>
