<script lang="ts" setup>
import type { Sortable } from '@vben/hooks';

import type {
  PaperBlock,
  PaperBlockType,
  PaperDocument,
  PaperPaletteItem,
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
  Textarea,
} from 'ant-design-vue';

import {
  clonePaperBlock,
  countResponseBlocks,
  createPaperBlock,
  findPaperBlock,
  PAPER_KIND_LABEL,
  PAPER_PALETTE,
  PAPER_PRESETS,
  paperBlockLabel,
  paperToBuilderComponents,
  removePaperBlock,
} from '../paper-schema';
import QuestionPreview from './QuestionPreview.vue';

defineOptions({ name: 'PaperCanvasDesigner' });

const document = defineModel<PaperDocument>({ required: true });

type DesignerMode = 'design' | 'preview';

const mode = ref<DesignerMode>('design');
const selectedId = ref<string>();
const paletteKeyword = ref('');
const canvasRoot = ref<HTMLElement>();

const sortableInstances: Sortable[] = [];

const selectedBlock = computed(() => {
  if (!selectedId.value) return undefined;
  return findPaperBlock(document.value.blocks, selectedId.value);
});

const previewComponents = computed(() =>
  paperToBuilderComponents(document.value),
);

const responseCount = computed(() =>
  countResponseBlocks(document.value.blocks),
);

const filteredPalette = computed(() => {
  const keyword = paletteKeyword.value.trim().toLowerCase();
  const groups: Array<{
    items: PaperPaletteItem[];
    kind: PaperPaletteItem['kind'];
    label: string;
  }> = (['content', 'response', 'structure'] as PaperPaletteItem['kind'][]).map(
    (kind) => ({
      kind,
      label: PAPER_KIND_LABEL[kind],
      items: PAPER_PALETTE.filter((item) => {
        if (item.kind !== kind) return false;
        if (!keyword) return true;
        return (
          item.label.toLowerCase().includes(keyword) ||
          item.hint.toLowerCase().includes(keyword) ||
          item.type.includes(keyword)
        );
      }),
    }),
  );
  return groups.filter((group) => group.items.length > 0);
});

function selectBlock(id: string) {
  selectedId.value = id;
  const block = findPaperBlock(document.value.blocks, id);
  if (block) ensureScoring(block);
}

function addBlock(type: PaperBlockType, parent?: PaperBlock) {
  const block = createPaperBlock(type);
  ensureScoring(block);
  if (parent?.kind === 'structure') {
    parent.children = parent.children || [];
    parent.children.push(block);
  } else {
    document.value.blocks.push(block);
  }
  selectedId.value = block.id;
  void nextTick(() => setupAllSortables());
}

function applyPreset(id: string) {
  const preset = PAPER_PRESETS.find((item) => item.id === id);
  if (!preset) return;
  document.value.blocks = preset.build();
  selectedId.value = document.value.blocks[0]?.id;
  void nextTick(() => setupAllSortables());
}

function duplicateSelected() {
  const block = selectedBlock.value;
  if (!block) return;
  const cloned = clonePaperBlock(block);
  const parentList = findParentList(document.value.blocks, block.id);
  const list = parentList || document.value.blocks;
  const index = list.findIndex((item) => item.id === block.id);
  list.splice(index + 1, 0, cloned);
  selectedId.value = cloned.id;
  void nextTick(() => setupAllSortables());
}

function deleteSelected() {
  if (!selectedId.value) return;
  removePaperBlock(document.value.blocks, selectedId.value);
  selectedId.value = document.value.blocks[0]?.id;
  void nextTick(() => setupAllSortables());
}

function findParentList(
  blocks: PaperBlock[],
  id: string,
): PaperBlock[] | undefined {
  for (const block of blocks) {
    if (block.id === id) return blocks;
    if (block.children?.length) {
      const found = findParentList(block.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function moveBlock(list: PaperBlock[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= list.length) return;
  const [item] = list.splice(from, 1);
  if (!item) return;
  list.splice(to, 0, item);
}

function destroySortables() {
  while (sortableInstances.length > 0) {
    const instance = sortableInstances.pop();
    instance?.destroy?.();
  }
}

async function bindSortable(
  element: HTMLElement,
  options: {
    group?: any;
    onAdd?: (event: any) => void;
    onEnd?: (event: any) => void;
  } = {},
) {
  const { initializeSortable } = useSortable(element, {
    animation: 180,
    delay: 0,
    draggable: '.paper-block',
    handle: '.paper-block-handle',
    ghostClass: 'paper-block-ghost',
    chosenClass: 'paper-block-chosen',
    dragClass: 'paper-block-drag',
    fallbackOnBody: true,
    swapThreshold: 0.65,
    group: options.group || {
      name: 'paper-blocks',
      pull: true,
      put: true,
    },
    onAdd: options.onAdd,
    onEnd: options.onEnd,
  });
  const instance = await initializeSortable();
  if (instance) sortableInstances.push(instance);
}

async function bindCanvasSortables() {
  const root = canvasRoot.value;
  if (!root) return;

  const lists = root.querySelectorAll<HTMLElement>('[data-paper-list]');
  for (const listEl of lists) {
    await bindSortable(listEl, {
      onAdd(event) {
        const type = String(
          event.item?.dataset?.paperType || '',
        ) as PaperBlockType;
        const fromPalette = event.from?.dataset?.paperPalette === '1';
        if (fromPalette && type) {
          event.item?.remove?.();
          const parentId = listEl.dataset.parentId;
          const parent = parentId
            ? findPaperBlock(document.value.blocks, parentId)
            : undefined;
          const block = createPaperBlock(type);
          const index = event.newIndex ?? 0;
          if (parent?.kind === 'structure') {
            parent.children = parent.children || [];
            parent.children.splice(index, 0, block);
          } else {
            document.value.blocks.splice(index, 0, block);
          }
          selectedId.value = block.id;
          void nextTick(() => setupAllSortables());
          return;
        }

        syncListFromDom(listEl);
        void nextTick(() => setupAllSortables());
      },
      onEnd(event) {
        if (event.from === event.to) {
          const parentId = listEl.dataset.parentId;
          const parent = parentId
            ? findPaperBlock(document.value.blocks, parentId)
            : undefined;
          const list =
            parent?.kind === 'structure'
              ? parent.children || (parent.children = [])
              : document.value.blocks;
          moveBlock(list, event.oldIndex ?? 0, event.newIndex ?? 0);
        } else {
          syncCrossListMove(event);
        }
        void nextTick(() => setupAllSortables());
      },
    });
  }
}

function syncListFromDom(listEl: HTMLElement) {
  const parentId = listEl.dataset.parentId;
  const parent = parentId
    ? findPaperBlock(document.value.blocks, parentId)
    : undefined;
  const targetList =
    parent?.kind === 'structure'
      ? parent.children || (parent.children = [])
      : document.value.blocks;

  const ids = [...listEl.querySelectorAll<HTMLElement>(':scope > .paper-block')]
    .map((el) => el.dataset.blockId)
    .filter(Boolean) as string[];

  const next: PaperBlock[] = [];
  for (const id of ids) {
    const block = findPaperBlock(document.value.blocks, id);
    if (block) next.push(block);
  }
  targetList.splice(0, targetList.length, ...next);
}

function syncCrossListMove(event: any) {
  const itemId = String(event.item?.dataset?.blockId || '');
  if (!itemId) return;
  const block = findPaperBlock(document.value.blocks, itemId);
  if (!block) return;

  removePaperBlock(document.value.blocks, itemId);

  const toListEl = event.to as HTMLElement;
  const parentId = toListEl?.dataset?.parentId;
  const parent = parentId
    ? findPaperBlock(document.value.blocks, parentId)
    : undefined;
  const targetList =
    parent?.kind === 'structure'
      ? parent.children || (parent.children = [])
      : document.value.blocks;
  const index = event.newIndex ?? targetList.length;
  targetList.splice(index, 0, block);
  selectedId.value = block.id;
}

async function bindPaletteSortables() {
  const paletteRoot = documentPaletteRoot.value;
  if (!paletteRoot) return;
  const lists = paletteRoot.querySelectorAll<HTMLElement>(
    '[data-paper-palette="1"]',
  );
  for (const listEl of lists) {
    const { initializeSortable } = useSortable(listEl, {
      animation: 150,
      sort: false,
      draggable: '.paper-palette-item',
      group: {
        name: 'paper-blocks',
        pull: 'clone',
        put: false,
      },
      ghostClass: 'paper-block-ghost',
    });
    const instance = await initializeSortable();
    if (instance) sortableInstances.push(instance);
  }
}

const documentPaletteRoot = ref<HTMLElement>();

async function setupAllSortables() {
  destroySortables();
  await nextTick();
  await bindPaletteSortables();
  await bindCanvasSortables();
}

function ensureScoring(block: PaperBlock) {
  if (block.kind !== 'response') return;
  if (!block.scoring) {
    block.scoring = { score: 2, judgeMode: 'auto' };
  }
}

function addOption(block: PaperBlock) {
  const options = block.props.options || [];
  const nextKey = String.fromCodePoint(65 + options.length);
  options.push({ key: nextKey, text: `选项 ${nextKey}` });
  block.props.options = options;
}

function removeOption(block: PaperBlock, index: number) {
  const options = [...(block.props.options || [])];
  options.splice(index, 1);
  block.props.options = options;
}

watch(mode, () => {
  if (mode.value === 'design') void setupAllSortables();
  else destroySortables();
});

watch(
  () => document.value.blocks.length,
  () => {
    if (mode.value === 'design') void nextTick(() => setupAllSortables());
  },
);

onMounted(() => {
  if (!selectedId.value) {
    selectedId.value = document.value.blocks[0]?.id;
  }
  void setupAllSortables();
});

onBeforeUnmount(() => {
  destroySortables();
});
</script>

<template>
  <div class="paper-designer">
    <div class="paper-designer-toolbar">
      <div class="paper-designer-toolbar-left">
        <strong>卷面编辑</strong>
        <span class="paper-designer-meta">
          {{ document.blocks.length }} 块 · {{ responseCount }} 处作答
        </span>
      </div>
      <Space>
        <Button
          :type="mode === 'design' ? 'primary' : 'default'"
          @click="mode = 'design'"
        >
          编辑
        </Button>
        <Button
          :type="mode === 'preview' ? 'primary' : 'default'"
          @click="mode = 'preview'"
        >
          预览
        </Button>
      </Space>
    </div>

    <div v-if="mode === 'preview'" class="paper-designer-preview">
      <QuestionPreview :components="previewComponents" title="预览" />
    </div>

    <div v-else ref="canvasRoot" class="paper-designer-body">
      <aside ref="documentPaletteRoot" class="paper-palette">
        <Input
          v-model:value="paletteKeyword"
          allow-clear
          placeholder="搜索组件"
          size="small"
        />

        <div class="paper-preset-row">
          <div class="paper-section-title">常用组合</div>
          <button
            v-for="preset in PAPER_PRESETS"
            :key="preset.id"
            class="paper-preset"
            type="button"
            @click="applyPreset(preset.id)"
          >
            <strong>{{ preset.label }}</strong>
            <span>{{ preset.hint }}</span>
          </button>
        </div>

        <div
          v-for="group in filteredPalette"
          :key="group.kind"
          class="paper-palette-group"
        >
          <div class="paper-section-title">{{ group.label }}</div>
          <div class="paper-palette-list" data-paper-palette="1">
            <div
              v-for="item in group.items"
              :key="item.type"
              class="paper-palette-item"
              :data-paper-type="item.type"
              @dblclick="addBlock(item.type)"
            >
              <IconifyIcon :icon="item.icon" class="paper-palette-icon" />
              <div>
                <strong>{{ item.label }}</strong>
                <span>{{ item.hint }}</span>
              </div>
              <Button
                size="small"
                type="link"
                @click.stop="addBlock(item.type)"
              >
                添加
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <main class="paper-canvas">
        <div class="paper-canvas-list" data-paper-list="root" data-parent-id="">
          <Empty
            v-if="document.blocks.length === 0"
            description="从左侧添加组件"
          />

          <template v-for="block in document.blocks" :key="block.id">
            <div
              class="paper-block"
              :class="{
                active: selectedId === block.id,
                structure: block.kind === 'structure',
              }"
              :data-block-id="block.id"
              @click.stop="selectBlock(block.id)"
            >
              <div class="paper-block-bar">
                <button class="paper-block-handle" type="button" title="拖动">
                  ⋮⋮
                </button>
                <Tag>{{ PAPER_KIND_LABEL[block.kind] }}</Tag>
                <strong>{{ paperBlockLabel(block) }}</strong>
                <span class="paper-block-type">{{ block.type }}</span>
              </div>

              <div class="paper-block-body">
                <div
                  v-if="block.type === 'stem' || block.type === 'tip'"
                  class="paper-block-html"
                  v-html="block.props.html"
                ></div>
                <div
                  v-else-if="block.type === 'media'"
                  class="paper-block-muted"
                >
                  {{ block.props.mediaType }} ·
                  {{ block.props.url || '未设置地址' }}
                </div>
                <div
                  v-else-if="
                    block.type === 'choice' ||
                    block.type === 'multi_choice' ||
                    block.type === 'true_false'
                  "
                  class="paper-block-options"
                >
                  <div
                    v-for="option in block.props.options || []"
                    :key="option.key"
                  >
                    {{ option.key }}. {{ option.text }}
                  </div>
                </div>
                <div
                  v-else-if="block.kind === 'response'"
                  class="paper-block-muted"
                >
                  作答区 ·
                  {{ block.scoring?.score ?? 0 }} 分 ·
                  {{ block.scoring?.judgeMode || 'none' }}
                </div>

                <div
                  v-if="block.kind === 'structure'"
                  class="paper-section-nest"
                  data-paper-list="section"
                  :data-parent-id="block.id"
                >
                  <Empty
                    v-if="!(block.children && block.children.length > 0)"
                    description="添加子题"
                    :image-style="{ height: '48px' }"
                  />
                  <div
                    v-for="child in block.children || []"
                    :key="child.id"
                    class="paper-block nested"
                    :class="{ active: selectedId === child.id }"
                    :data-block-id="child.id"
                    @click.stop="selectBlock(child.id)"
                  >
                    <div class="paper-block-bar">
                      <button
                        class="paper-block-handle"
                        type="button"
                        title="拖动"
                      >
                        ⋮⋮
                      </button>
                      <Tag>{{ PAPER_KIND_LABEL[child.kind] }}</Tag>
                      <strong>{{ paperBlockLabel(child) }}</strong>
                    </div>
                    <div class="paper-block-body">
                      <div
                        v-if="child.type === 'stem' || child.type === 'tip'"
                        class="paper-block-html"
                        v-html="child.props.html"
                      ></div>
                      <div
                        v-else-if="
                          child.type === 'choice' ||
                          child.type === 'multi_choice' ||
                          child.type === 'true_false'
                        "
                        class="paper-block-options"
                      >
                        <div
                          v-for="option in child.props.options || []"
                          :key="option.key"
                        >
                          {{ option.key }}. {{ option.text }}
                        </div>
                      </div>
                      <div v-else class="paper-block-muted">
                        {{ child.type }}
                        <template v-if="child.scoring">
                          · {{ child.scoring.score }} 分
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </main>

      <aside class="paper-props">
        <template v-if="selectedBlock">
          <div class="paper-section-title">属性</div>
          <div class="paper-props-head">
            <Tag color="processing">
              {{ PAPER_KIND_LABEL[selectedBlock.kind] }}
            </Tag>
            <strong>{{ paperBlockLabel(selectedBlock) }}</strong>
          </div>

          <label class="paper-field">
            <span>标题</span>
            <Input v-model:value="selectedBlock.props.title" />
          </label>

          <template
            v-if="selectedBlock.type === 'stem' || selectedBlock.type === 'tip'"
          >
            <label class="paper-field">
              <span>内容 HTML</span>
              <Textarea v-model:value="selectedBlock.props.html" :rows="8" />
            </label>
          </template>

          <template v-else-if="selectedBlock.type === 'media'">
            <label class="paper-field">
              <span>类型</span>
              <Select
                v-model:value="selectedBlock.props.mediaType"
                :options="[
                  { label: '图片', value: 'image' },
                  { label: '音频', value: 'audio' },
                  { label: '视频', value: 'video' },
                ]"
              />
            </label>
            <label class="paper-field">
              <span>地址</span>
              <Input v-model:value="selectedBlock.props.url" />
            </label>
          </template>

          <template
            v-else-if="
              selectedBlock.type === 'choice' ||
              selectedBlock.type === 'multi_choice' ||
              selectedBlock.type === 'true_false'
            "
          >
            <div
              v-for="(option, index) in selectedBlock.props.options || []"
              :key="option.key"
              class="paper-option-edit"
            >
              <Input v-model:value="option.key" style="width: 56px" />
              <Input v-model:value="option.text" />
              <Button
                danger
                size="small"
                type="text"
                @click="removeOption(selectedBlock, Number(index))"
              >
                删
              </Button>
            </div>
            <Button size="small" @click="addOption(selectedBlock)">
              添加选项
            </Button>
          </template>

          <template
            v-else-if="
              selectedBlock.type === 'text_short' ||
              selectedBlock.type === 'text_long'
            "
          >
            <label class="paper-field">
              <span>占位提示</span>
              <Input v-model:value="selectedBlock.props.placeholder" />
            </label>
            <label class="paper-field">
              <span>最大字数</span>
              <InputNumber
                v-model:value="selectedBlock.props.maxLength"
                :min="1"
                style="width: 100%"
              />
            </label>
          </template>

          <template v-else-if="selectedBlock.type === 'number'">
            <label class="paper-field">
              <span>单位</span>
              <Input v-model:value="selectedBlock.props.unit" />
            </label>
            <label class="paper-field">
              <span>容差</span>
              <InputNumber
                v-model:value="selectedBlock.props.tolerance"
                :min="0"
                style="width: 100%"
              />
            </label>
          </template>

          <template v-else-if="selectedBlock.type === 'code'">
            <label class="paper-field">
              <span>语言</span>
              <Input v-model:value="selectedBlock.props.language" />
            </label>
            <label class="paper-field">
              <span>起始代码</span>
              <Textarea
                v-model:value="selectedBlock.props.starterCode"
                :rows="6"
              />
            </label>
          </template>

          <template v-else-if="selectedBlock.type === 'drawing'">
            <label class="paper-field">
              <span>提示语</span>
              <Input v-model:value="selectedBlock.props.prompt" />
            </label>
            <label class="paper-field">
              <span>宽度</span>
              <InputNumber
                v-model:value="selectedBlock.props.width"
                :min="320"
                style="width: 100%"
              />
            </label>
            <label class="paper-field">
              <span>高度</span>
              <InputNumber
                v-model:value="selectedBlock.props.height"
                :min="240"
                style="width: 100%"
              />
            </label>
          </template>

          <template v-else-if="selectedBlock.type === 'section'">
            <label class="paper-field">
              <span>说明</span>
              <Textarea
                v-model:value="selectedBlock.props.description"
                :rows="3"
              />
            </label>
            <Button
              size="small"
              type="dashed"
              @click="addBlock('choice', selectedBlock)"
            >
              在组内添加单选
            </Button>
          </template>

          <template
            v-if="selectedBlock.kind === 'response' && selectedBlock.scoring"
          >
            <div class="paper-section-title" style="margin-top: 16px">评分</div>
            <label class="paper-field">
              <span>分值</span>
              <InputNumber
                v-model:value="selectedBlock.scoring.score"
                :min="0"
                style="width: 100%"
              />
            </label>
            <label class="paper-field">
              <span>判分</span>
              <Select
                v-model:value="selectedBlock.scoring.judgeMode"
                :options="[
                  { label: '自动', value: 'auto' },
                  { label: '人工', value: 'manual' },
                  { label: '不判', value: 'none' },
                ]"
              />
            </label>
          </template>

          <Space style="margin-top: 16px">
            <Button @click="duplicateSelected">复制</Button>
            <Button danger @click="deleteSelected">删除</Button>
          </Space>
        </template>
        <Empty v-else description="选择组件进行编辑" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.paper-designer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 720px;
}

.paper-designer-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: hsl(var(--muted) / 35%);
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.paper-designer-toolbar-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.paper-designer-meta {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.paper-designer-body {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 300px;
  gap: 12px;
  min-height: 680px;
}

.paper-palette,
.paper-props,
.paper-canvas {
  overflow: auto;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.paper-palette,
.paper-props {
  padding: 12px;
}

.paper-canvas {
  padding: 16px;
  background:
    linear-gradient(hsl(var(--background)), hsl(var(--background))),
    radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0);
  background-size:
    auto,
    18px 18px;
}

.paper-section-title {
  margin: 12px 0 8px;
  font-size: 12px;
  font-weight: 650;
  color: hsl(var(--muted-foreground));
}

.paper-preset-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.paper-preset {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  background: hsl(var(--muted) / 35%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.paper-preset strong {
  font-size: 13px;
}

.paper-preset span {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.paper-palette-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 8px;
}

.paper-palette-item {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 8px;
  cursor: grab;
  background: hsl(var(--card, var(--background)));
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
}

.paper-palette-item strong {
  display: block;
  font-size: 13px;
}

.paper-palette-item span {
  display: block;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.paper-palette-icon {
  font-size: 16px;
  color: hsl(var(--primary));
}

.paper-palette-tip {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.paper-canvas-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 560px;
  padding: 8px;
  border: 1px dashed transparent;
  border-radius: 10px;
}

.paper-block {
  background: #fff;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  box-shadow: 0 8px 24px hsl(var(--foreground) / 4%);
}

.paper-block.active {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 18%);
}

.paper-block.nested {
  margin-top: 8px;
  background: hsl(var(--muted) / 18%);
}

.paper-block-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid hsl(var(--border));
}

.paper-block-handle {
  padding: 0 4px;
  font-size: 14px;
  line-height: 1;
  color: hsl(var(--muted-foreground));
  cursor: grab;
  background: transparent;
  border: 0;
}

.paper-block-type {
  margin-left: auto;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.paper-block-body {
  padding: 12px;
}

.paper-block-html {
  font-size: 14px;
  line-height: 1.6;
}

.paper-block-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.paper-block-muted {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.paper-section-nest {
  min-height: 72px;
  padding: 8px;
  margin-top: 8px;
  background: hsl(var(--muted) / 25%);
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
}

.paper-props-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.paper-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.paper-option-edit {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.paper-block-ghost {
  opacity: 0.45;
}

.paper-block-chosen {
  opacity: 0.92;
}

.paper-designer-preview {
  padding: 12px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

@media (max-width: 1100px) {
  .paper-designer-body {
    grid-template-columns: 1fr;
  }
}
</style>
