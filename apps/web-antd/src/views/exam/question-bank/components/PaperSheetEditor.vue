<script lang="ts" setup>
/**
 * 卷面编辑器（重新设计）：中间就是一张试卷。
 * 插入物件 → 在纸上直接编辑 → 点空设答法。无「题型配置表」感。
 */
import type { Sortable } from '@vben/hooks';

import type {
  PaperBlock,
  PaperBlockType,
  PaperDocument,
  PassageProps,
} from '../paper-schema';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import { useSortable } from '@vben/hooks';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Empty,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
} from 'ant-design-vue';

import {
  clonePaperBlock,
  countResponseBlocks,
  createPaperBlock,
  findPaperBlock,
  paperForDemoPreview,
  removePaperBlock,
  syncChoiceOptionShells,
} from '../paper-schema';
import PassageProseEditor from './PassageProseEditor.vue';
import QuestionPreview from './QuestionPreview.vue';

defineOptions({ name: 'PaperSheetEditor' });

const document = defineModel<PaperDocument>({ required: true });

type Mode = 'edit' | 'preview';
const mode = ref<Mode>('edit');
const selectedId = ref<string>();
const sheetRoot = ref<HTMLElement>();
const sortableInstances: Sortable[] = [];

const INSERTS: Array<{
  hint: string;
  icon: string;
  label: string;
  type: PaperBlockType;
}> = [
  {
    type: 'passage',
    label: '挖空文',
    hint: '打字挖空',
    icon: 'lucide:text-select',
  },
  { type: 'stem', label: '文本', hint: '说明材料', icon: 'lucide:type' },
  {
    type: 'listening',
    label: '音频',
    hint: '听力材料',
    icon: 'lucide:headphones',
  },
  { type: 'media', label: '图片', hint: '图/视频', icon: 'lucide:image' },
  {
    type: 'choice',
    label: '单选',
    hint: '独立小题',
    icon: 'lucide:circle-dot',
  },
  {
    type: 'multi_choice',
    label: '多选',
    hint: '多选小题',
    icon: 'lucide:check-square',
  },
  {
    type: 'true_false',
    label: '判断',
    hint: '对/错',
    icon: 'lucide:toggle-left',
  },
  {
    type: 'text_short',
    label: '短答',
    hint: '短填写',
    icon: 'lucide:text-cursor-input',
  },
  {
    type: 'text_long',
    label: '写作',
    hint: '长答',
    icon: 'lucide:align-left',
  },
  { type: 'matching', label: '匹配', hint: '连线', icon: 'lucide:git-compare' },
  { type: 'code', label: '代码', hint: '编程', icon: 'lucide:code-2' },
  { type: 'drawing', label: '绘图', hint: '画图', icon: 'lucide:pen-tool' },
  {
    type: 'audio_record',
    label: '录音',
    hint: '口语',
    icon: 'lucide:mic',
  },
  {
    type: 'section',
    label: '小题组',
    hint: '下面挂多题',
    icon: 'lucide:layers',
  },
];

const selected = computed(() =>
  selectedId.value
    ? findPaperBlock(document.value.blocks, selectedId.value)
    : undefined,
);

const previewComponents = computed(() => paperForDemoPreview(document.value));

const responseCount = computed(() =>
  countResponseBlocks(document.value.blocks),
);

function select(id: string) {
  selectedId.value = id;
}

function add(type: PaperBlockType) {
  const block = createPaperBlock(type);
  document.value.role = 'template';
  document.value.blocks.push(block);
  selectedId.value = block.id;
  void nextTick(() => setupSortable());
}

function quickLocalCloze() {
  const block = createPaperBlock('passage');
  const props = block.props as PassageProps;
  props.defaultBinding = 'local_choice';
  props.defaultOptionCount = 4;
  props.text = '';
  props.slots = Array.from({ length: 10 }, (_, index) => ({
    marker: index + 1,
    binding: 'local_choice' as const,
    optionCount: 4,
    options: ['A', 'B', 'C', 'D'].map((key) => ({ key, text: '' })),
  }));
  props.pool = null;
  props.title = '挖空文';
  document.value.blocks = [block];
  selectedId.value = block.id;
  void nextTick(() => setupSortable());
}

function quickBankCloze() {
  const block = createPaperBlock('passage');
  const props = block.props as PassageProps;
  props.defaultBinding = 'shared_pool';
  props.text = '';
  props.slots = Array.from({ length: 10 }, (_, index) => ({
    marker: index + 1,
    binding: 'shared_pool' as const,
  }));
  props.pool = { size: 15, reuse: 'once', items: [] };
  props.title = '挖空文';
  document.value.blocks = [block];
  selectedId.value = block.id;
  void nextTick(() => setupSortable());
}

function quickReading() {
  const stem = createPaperBlock('stem');
  stem.props.title = '阅读材料';
  const section = createPaperBlock('section');
  section.props.title = '小题';
  section.children = [
    createPaperBlock('choice'),
    createPaperBlock('choice'),
    createPaperBlock('choice'),
  ];
  document.value.blocks = [stem, section];
  selectedId.value = stem.id;
  void nextTick(() => setupSortable());
}

function removeSelected() {
  if (!selectedId.value) return;
  removePaperBlock(document.value.blocks, selectedId.value);
  selectedId.value = document.value.blocks[0]?.id;
  void nextTick(() => setupSortable());
}

function duplicateSelected() {
  const block = selected.value;
  if (!block) return;
  const cloned = clonePaperBlock(block);
  const index = document.value.blocks.findIndex((item) => item.id === block.id);
  document.value.blocks.splice(index + 1, 0, cloned);
  selectedId.value = cloned.id;
  void nextTick(() => setupSortable());
}

function setOptionCount(block: PaperBlock, count: null | number | string) {
  block.props.optionCount = Number(count) || 4;
  syncChoiceOptionShells(block.props);
}

function destroySortables() {
  while (sortableInstances.length > 0) {
    sortableInstances.pop()?.destroy?.();
  }
}

async function setupSortable() {
  destroySortables();
  await nextTick();
  const root = sheetRoot.value?.querySelector(
    '[data-sheet-list="root"]',
  ) as HTMLElement | null;
  if (!root) return;
  const { initializeSortable } = useSortable(root, {
    animation: 160,
    handle: '.sheet-piece-handle',
    draggable: '.sheet-piece',
    ghostClass: 'sheet-piece-ghost',
    onEnd(event) {
      const list = document.value.blocks;
      const from = event.oldIndex ?? 0;
      const to = event.newIndex ?? 0;
      if (from === to) return;
      const [item] = list.splice(from, 1);
      if (item) list.splice(to, 0, item);
    },
  });
  const instance = await initializeSortable();
  if (instance) sortableInstances.push(instance);
}

watch(mode, (value) => {
  if (value === 'edit') void setupSortable();
  else destroySortables();
});

onMounted(() => {
  selectedId.value = document.value.blocks[0]?.id;
  void setupSortable();
});

onBeforeUnmount(() => destroySortables());

function updatePassage(block: PaperBlock, value: PassageProps) {
  Object.assign(block.props, value);
}

function asPassage(block: PaperBlock): PassageProps {
  return block.props as PassageProps;
}

function optionKeys(block: PaperBlock) {
  if (block.type === 'true_false') return ['T', 'F'];
  const n = Math.max(
    2,
    Number(block.props.optionCount || block.props.options?.length || 4),
  );
  return Array.from({ length: n }, (_, i) => String.fromCodePoint(65 + i));
}
</script>

<template>
  <div class="sheet-editor">
    <header class="sheet-top">
      <div class="sheet-top-left">
        <strong>试卷编辑</strong>
        <span class="sheet-meta">
          {{ document.blocks.length }} 段 · {{ responseCount }} 处作答
        </span>
      </div>
      <Space>
        <Button
          :type="mode === 'edit' ? 'primary' : 'default'"
          @click="mode = 'edit'"
        >
          编辑
        </Button>
        <Button
          :type="mode === 'preview' ? 'primary' : 'default'"
          @click="mode = 'preview'"
        >
          示例预览
        </Button>
      </Space>
    </header>

    <div v-if="mode === 'preview'" class="sheet-preview">
      <div class="sheet-banner">假数据示意，不写回模板</div>
      <QuestionPreview :components="previewComponents" title="示例预览" />
    </div>

    <template v-else>
      <div class="sheet-insert">
        <button
          v-for="item in INSERTS"
          :key="item.type"
          class="sheet-insert-btn"
          type="button"
          :title="item.hint"
          @click="add(item.type)"
        >
          <IconifyIcon :icon="item.icon" />
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div v-if="document.blocks.length === 0" class="sheet-empty">
        <Empty description="一张空白卷纸">
          <template #description>
            <div class="sheet-empty-copy">
              <p>直接插入物件，或一键铺好常见结构（之后仍可随便改）</p>
              <Space wrap>
                <Button type="primary" @click="quickLocalCloze">
                  挖空 · 每空四选一
                </Button>
                <Button type="primary" ghost @click="quickBankCloze">
                  挖空 · 共享词库
                </Button>
                <Button @click="quickReading">材料 + 小题</Button>
                <Button @click="add('passage')">从挖空文开始</Button>
              </Space>
            </div>
          </template>
        </Empty>
      </div>

      <div v-else class="sheet-workspace">
        <main ref="sheetRoot" class="sheet-paper">
          <div class="sheet-paper-inner" data-sheet-list="root">
            <article
              v-for="(block, index) in document.blocks"
              :key="block.id"
              class="sheet-piece"
              :class="{ active: selectedId === block.id }"
              @click="select(block.id)"
            >
              <div class="sheet-piece-bar">
                <button
                  class="sheet-piece-handle"
                  type="button"
                  title="拖动排序"
                >
                  ⋮⋮
                </button>
                <span class="sheet-piece-index">{{ index + 1 }}</span>
                <strong>{{ block.props.title || block.type }}</strong>
                <Tag v-if="block.scoring" color="blue">
                  {{ block.scoring.score }} 分
                </Tag>
                <div class="sheet-piece-actions">
                  <Button
                    size="small"
                    type="text"
                    @click.stop="
                      selectedId = block.id;
                      duplicateSelected();
                    "
                  >
                    复制
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    danger
                    @click.stop="
                      selectedId = block.id;
                      removeSelected();
                    "
                  >
                    删
                  </Button>
                </div>
              </div>

              <!-- 挖空文：正文优先 -->
              <PassageProseEditor
                v-if="block.type === 'passage'"
                :model-value="asPassage(block)"
                @update:model-value="(v) => updatePassage(block, v)"
                @select="select(block.id)"
              />

              <!-- 纯文本 -->
              <textarea
                v-else-if="block.type === 'stem' || block.type === 'tip'"
                v-model="block.props.html"
                class="sheet-textarea"
                rows="4"
                placeholder="在这里写说明 / 材料（可先留空）"
                @focus="select(block.id)"
              ></textarea>

              <!-- 音频 / 媒体 -->
              <div
                v-else-if="block.type === 'listening' || block.type === 'media'"
                class="sheet-media"
              >
                <div class="sheet-media-face">
                  {{
                    block.type === 'listening'
                      ? '音频材料位'
                      : '图片/视频材料位'
                  }}
                  <span>· 创建题目时上传</span>
                </div>
                <label class="sheet-inline-field">
                  最多播放
                  <InputNumber
                    v-model:value="block.props.maxPlays"
                    :min="1"
                    size="small"
                  />
                  次
                </label>
              </div>

              <!-- 选择题壳 -->
              <div
                v-else-if="
                  block.type === 'choice' ||
                  block.type === 'multi_choice' ||
                  block.type === 'true_false'
                "
                class="sheet-choice"
              >
                <Input
                  v-model:value="block.props.title"
                  placeholder="小题题干（可空）"
                  class="sheet-q-title"
                  @focus="select(block.id)"
                />
                <div
                  v-for="key in optionKeys(block)"
                  :key="key"
                  class="sheet-choice-opt"
                >
                  <span class="sheet-radio"></span>
                  {{ key }}.
                  <span class="sheet-muted">选项（创建题时填）</span>
                </div>
                <label
                  v-if="block.type !== 'true_false'"
                  class="sheet-inline-field"
                >
                  选项数
                  <InputNumber
                    size="small"
                    :min="2"
                    :max="12"
                    :value="block.props.optionCount || 4"
                    @update:value="(v) => setOptionCount(block, v)"
                  />
                </label>
              </div>

              <!-- 写作 -->
              <div
                v-else-if="
                  block.type === 'text_long' || block.type === 'text_short'
                "
                class="sheet-write"
              >
                <div class="sheet-write-box">
                  {{
                    block.type === 'text_long'
                      ? '写作 / 长答作答区'
                      : '短答作答区'
                  }}
                </div>
                <label class="sheet-inline-field">
                  最多字数
                  <InputNumber
                    v-model:value="block.props.maxLength"
                    :min="1"
                    size="small"
                  />
                </label>
              </div>

              <!-- 小题组 -->
              <div v-else-if="block.type === 'section'" class="sheet-section">
                <Input
                  v-model:value="block.props.title"
                  placeholder="组标题，如：根据材料作答"
                />
                <div class="sheet-section-kids">
                  <div
                    v-for="child in block.children || []"
                    :key="child.id"
                    class="sheet-kid"
                    :class="{ active: selectedId === child.id }"
                    @click.stop="select(child.id)"
                  >
                    <strong>{{ child.props.title || child.type }}</strong>
                    <span class="sheet-muted">
                      {{ child.scoring?.score ?? 0 }} 分
                    </span>
                  </div>
                  <Button
                    size="small"
                    type="dashed"
                    @click.stop="
                      block.children = block.children || [];
                      block.children.push(createPaperBlock('choice'));
                    "
                  >
                    + 组内单选
                  </Button>
                </div>
              </div>

              <!-- 其它作答 -->
              <div v-else class="sheet-generic">
                <Input
                  v-model:value="block.props.title"
                  placeholder="标题"
                  class="sheet-q-title"
                />
                <div class="sheet-muted">
                  {{
                    INSERTS.find((item) => item.type === block.type)?.hint ||
                    block.type
                  }}
                  <template v-if="block.scoring">
                    ·
                    <InputNumber
                      v-model:value="block.scoring.score"
                      :min="0"
                      size="small"
                      style="width: 72px"
                    />
                    分
                  </template>
                </div>
                <template v-if="block.type === 'matching'">
                  <label class="sheet-inline-field">
                    对数
                    <InputNumber
                      v-model:value="block.props.pairCount"
                      :min="2"
                      size="small"
                    />
                  </label>
                </template>
                <template v-if="block.type === 'audio_record'">
                  <label class="sheet-inline-field">
                    最长秒数
                    <InputNumber
                      v-model:value="block.props.maxSeconds"
                      :min="10"
                      size="small"
                    />
                  </label>
                </template>
              </div>
            </article>
          </div>
        </main>

        <aside v-if="selected" class="sheet-side">
          <div class="sheet-side-title">当前选中</div>
          <p class="sheet-side-name">
            {{ selected.props.title || selected.type }}
          </p>
          <label class="sheet-side-field">
            <span>标题</span>
            <Input v-model:value="selected.props.title" />
          </label>
          <template v-if="selected.scoring">
            <label class="sheet-side-field">
              <span>分值</span>
              <InputNumber
                v-model:value="selected.scoring.score"
                :min="0"
                style="width: 100%"
              />
            </label>
            <label class="sheet-side-field">
              <span>判分</span>
              <Select
                v-model:value="selected.scoring.judgeMode"
                :options="[
                  { label: '自动', value: 'auto' },
                  { label: '人工', value: 'manual' },
                  { label: '不判', value: 'none' },
                ]"
              />
            </label>
          </template>
          <p class="sheet-side-tip">
            挖空文：在正文里挖空，点蓝色/绿色空芯片设置「这个空怎么答」。
          </p>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sheet-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 640px;
}

.sheet-top {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.sheet-top-left {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.sheet-meta {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.sheet-insert {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  background: hsl(var(--muted) / 35%);
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.sheet-insert-btn {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  background: #fff;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
}

.sheet-insert-btn:hover {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgb(59 130 246 / 12%);
}

.sheet-empty {
  padding: 48px 24px;
  background: linear-gradient(180deg, #fffefb 0%, #f5f5f4 100%);
  border: 1px dashed #d6d3d1;
  border-radius: 16px;
}

.sheet-empty-copy p {
  margin: 0 0 16px;
  color: #57534e;
}

.sheet-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 12px;
  align-items: start;
}

.sheet-paper {
  padding: 20px 18px 28px;
  background:
    linear-gradient(180deg, #fffef8 0%, #fafaf9 100%),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 27px,
      rgb(231 229 228 / 35%) 28px
    );
  border: 1px solid #e7e5e4;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgb(28 25 23 / 6%);
}

.sheet-paper-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 820px;
  margin: 0 auto;
}

.sheet-piece {
  padding: 12px 14px 14px;
  background: rgb(255 255 255 / 92%);
  border: 1px solid transparent;
  border-radius: 12px;
  transition: border-color 0.15s ease;
}

.sheet-piece.active {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgb(147 197 253 / 25%);
}

.sheet-piece-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.sheet-piece-handle {
  padding: 0 4px;
  color: #a8a29e;
  cursor: grab;
  background: none;
  border: 0;
}

.sheet-piece-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 12px;
  font-weight: 700;
  color: #44403c;
  background: #f5f5f4;
  border-radius: 999px;
}

.sheet-piece-actions {
  margin-left: auto;
}

.sheet-textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 15px;
  line-height: 1.7;
  resize: vertical;
  border: 1px solid #e7e5e4;
  border-radius: 8px;
}

.sheet-media-face,
.sheet-write-box {
  padding: 18px;
  margin-bottom: 8px;
  color: #57534e;
  text-align: center;
  background: #fafaf9;
  border: 1px dashed #d6d3d1;
  border-radius: 8px;
}

.sheet-inline-field {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: #78716c;
}

.sheet-choice-opt {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 6px 0;
  font-size: 14px;
}

.sheet-radio {
  width: 14px;
  height: 14px;
  border: 1.5px solid #a8a29e;
  border-radius: 50%;
}

.sheet-q-title {
  margin-bottom: 8px;
}

.sheet-muted {
  font-size: 12px;
  color: #a8a29e;
}

.sheet-section-kids {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.sheet-kid {
  display: flex;
  justify-content: space-between;
  padding: 8px 10px;
  cursor: pointer;
  background: #fafaf9;
  border-radius: 8px;
}

.sheet-kid.active {
  outline: 2px solid #93c5fd;
}

.sheet-side {
  position: sticky;
  top: 12px;
  padding: 14px;
  background: #fff;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.sheet-side-title {
  margin-bottom: 4px;
  font-size: 12px;
  color: #a8a29e;
}

.sheet-side-name {
  margin: 0 0 12px;
  font-weight: 650;
}

.sheet-side-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 12px;
  color: #78716c;
}

.sheet-side-tip {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #a8a29e;
}

.sheet-preview {
  padding: 12px;
  background: #fff;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.sheet-banner {
  padding: 8px 12px;
  margin-bottom: 10px;
  font-size: 12px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}

.sheet-piece-ghost {
  opacity: 0.4;
}

.sheet-generic {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 960px) {
  .sheet-workspace {
    grid-template-columns: 1fr;
  }
}
</style>
