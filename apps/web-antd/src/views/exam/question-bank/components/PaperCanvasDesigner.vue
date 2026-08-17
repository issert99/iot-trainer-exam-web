<script lang="ts" setup>
import type { Sortable } from '@vben/hooks';

import type {
  PaperBlock,
  PaperBlockType,
  PaperDocument,
  PaperPaletteItem,
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
  paperForDemoPreview,
  removePaperBlock,
  syncChoiceOptionShells,
} from '../paper-schema';
import PassageBlankEditor from './PassageBlankEditor.vue';
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

const previewComponents = computed(() => paperForDemoPreview(document.value));

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
  document.value.role = 'template';
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

function setOptionCount(block: PaperBlock, count: null | number | string) {
  block.props.optionCount = Number(count) || 4;
  syncChoiceOptionShells(block.props);
}

function shellOptionKeys(block: PaperBlock) {
  if (block.type === 'true_false') {
    return (block.props.options || [{ key: 'T' }, { key: 'F' }]).map(
      (item: { key: string }) => item.key,
    );
  }
  const count = Math.max(
    2,
    Number(block.props.optionCount || block.props.options?.length || 4),
  );
  return Array.from({ length: count }, (_, index) =>
    String.fromCodePoint(65 + index),
  );
}

function shellPairIndexes(block: PaperBlock) {
  const count = Math.max(2, Number(block.props.pairCount || 4));
  return Array.from({ length: count }, (_, index) => index + 1);
}

function asPassage(block: PaperBlock): PassageProps {
  return block.props as PassageProps;
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
        <strong>空白卷纸</strong>
        <span class="paper-designer-meta">
          {{ document.blocks.length }} 块 · {{ responseCount }} 处作答
        </span>
      </div>
      <Space>
        <Button
          :type="mode === 'design' ? 'primary' : 'default'"
          @click="mode = 'design'"
        >
          编辑卷面
        </Button>
        <Button
          :type="mode === 'preview' ? 'primary' : 'default'"
          @click="mode = 'preview'"
        >
          示例预览
        </Button>
      </Space>
    </div>

    <div v-if="mode === 'preview'" class="paper-designer-preview">
      <div class="paper-demo-banner">
        假数据示意，不会写回模板。学生看到的交互与此类似。
      </div>
      <QuestionPreview :components="previewComponents" title="示例预览" />
    </div>

    <div v-else ref="canvasRoot" class="paper-designer-body">
      <aside ref="documentPaletteRoot" class="paper-palette">
        <Input
          v-model:value="paletteKeyword"
          allow-clear
          placeholder="搜索插入项"
          size="small"
        />

        <div class="paper-preset-row">
          <div class="paper-section-title">快捷配方（可再改）</div>
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
            description="空白卷纸：从左侧插入，或点快捷配方"
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
                <strong>{{ paperBlockLabel(block) }}</strong>
                <Tag v-if="block.scoring">{{ block.scoring.score }} 分</Tag>
              </div>

              <div class="paper-block-body">
                <div
                  v-if="block.type === 'stem' || block.type === 'tip'"
                  class="paper-face-shell"
                >
                  {{
                    block.props.html
                      ? '已有占位说明（题目侧可替换）'
                      : '文本区（创建题目时填写）'
                  }}
                </div>
                <div
                  v-else-if="block.type === 'passage'"
                  class="paper-face-passage"
                >
                  <div class="paper-face-shell-line">
                    挖空文 · {{ asPassage(block).slots?.length || 0 }} 空
                  </div>
                  <div class="paper-face-blanks">
                    <span
                      v-for="slot in asPassage(block).slots || []"
                      :key="slot.marker"
                      class="paper-face-blank"
                      :class="{
                        pool: slot.binding === 'shared_pool',
                        local: slot.binding === 'local_choice',
                      }"
                    >
                      {{ slot.marker }}
                      <small v-if="slot.binding === 'local_choice'">
                        {{ slot.optionCount || 4 }}选
                      </small>
                      <small v-else-if="slot.binding === 'shared_pool'">
                        词库
                      </small>
                    </span>
                  </div>
                  <div v-if="asPassage(block).pool" class="paper-face-pool-box">
                    词库约 {{ asPassage(block).pool?.size }} 词
                  </div>
                </div>
                <div
                  v-else-if="
                    block.type === 'listening' || block.type === 'media'
                  "
                  class="paper-face-media"
                >
                  {{ block.type === 'listening' ? '音频材料位' : '媒体材料位' }}
                  <span v-if="block.props.maxPlays">
                    · 最多 {{ block.props.maxPlays }} 次
                  </span>
                  <div class="paper-muted">创建题目时上传</div>
                </div>
                <div
                  v-else-if="
                    block.type === 'choice' ||
                    block.type === 'multi_choice' ||
                    block.type === 'true_false'
                  "
                  class="paper-face-options"
                >
                  <div
                    v-for="key in shellOptionKeys(block)"
                    :key="key"
                    class="paper-face-option"
                  >
                    <span class="paper-face-radio"></span>
                    {{ key }}.
                    <span class="paper-muted">选项文案（创建题时填）</span>
                  </div>
                </div>
                <div
                  v-else-if="block.type === 'matching'"
                  class="paper-face-options"
                >
                  <div class="paper-muted">
                    匹配 · {{ block.props.pairCount || 4 }} 对
                  </div>
                  <div
                    v-for="index in shellPairIndexes(block)"
                    :key="index"
                    class="paper-face-option"
                  >
                    L{{ index }} —— R{{ index }}
                  </div>
                </div>
                <div
                  v-else-if="block.type === 'text_long'"
                  class="paper-face-write"
                >
                  写作/长答作答区
                </div>
                <div
                  v-else-if="block.type === 'text_short'"
                  class="paper-face-write"
                >
                  短答作答区
                </div>
                <div
                  v-else-if="block.type === 'audio_record'"
                  class="paper-face-write"
                >
                  录音作答区 · 最长 {{ block.props.maxSeconds || 120 }}s
                </div>
                <div
                  v-else-if="block.type === 'hotspot'"
                  class="paper-face-media"
                >
                  图片标注区（创建题时上传底图）
                </div>
                <div
                  v-else-if="block.type === 'classify'"
                  class="paper-face-classify"
                >
                  <span class="paper-muted">
                    {{ block.props.binCount || 2 }} 类 ·
                    {{ block.props.itemCount || 4 }} 条目
                  </span>
                </div>
                <div
                  v-else-if="block.type === 'sorting'"
                  class="paper-face-classify"
                >
                  <span class="paper-muted">
                    排序 · {{ block.props.itemCount || 4 }} 项
                  </span>
                </div>
                <div v-else-if="block.kind === 'response'" class="paper-muted">
                  {{
                    PAPER_PALETTE.find((item) => item.type === block.type)
                      ?.label || block.type
                  }}
                  · {{ block.scoring?.score ?? 0 }} 分
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
                        class="paper-face-shell"
                      >
                        材料区（创建题目时填写）
                      </div>
                      <div
                        v-else-if="
                          child.type === 'choice' ||
                          child.type === 'multi_choice' ||
                          child.type === 'true_false'
                        "
                        class="paper-face-options"
                      >
                        <div
                          v-for="key in shellOptionKeys(child)"
                          :key="key"
                          class="paper-face-option"
                        >
                          <span class="paper-face-radio"></span>
                          {{ key }}.
                          <span class="paper-muted">选项</span>
                        </div>
                      </div>
                      <div v-else class="paper-block-muted">
                        {{ paperBlockLabel(child) }}
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
          <div class="paper-section-title">规则</div>
          <div class="paper-props-head">
            <Tag color="processing">
              {{ PAPER_KIND_LABEL[selectedBlock.kind] }}
            </Tag>
            <strong>{{ paperBlockLabel(selectedBlock) }}</strong>
          </div>

          <label class="paper-field">
            <span>块标题</span>
            <Input v-model:value="selectedBlock.props.title" />
          </label>

          <template
            v-if="selectedBlock.type === 'stem' || selectedBlock.type === 'tip'"
          >
            <div class="paper-rule-note">
              模板阶段只占位；文章/说明在创建题目时填写。可选填默认提示文案。
            </div>
            <label class="paper-field">
              <span>默认提示（可选）</span>
              <Textarea v-model:value="selectedBlock.props.html" :rows="4" />
            </label>
          </template>

          <template v-else-if="selectedBlock.type === 'passage'">
            <PassageBlankEditor
              :model-value="asPassage(selectedBlock)"
              @update:model-value="
                (value) => {
                  if (selectedBlock) Object.assign(selectedBlock.props, value);
                }
              "
            />
          </template>

          <template
            v-else-if="
              selectedBlock.type === 'media' ||
              selectedBlock.type === 'listening'
            "
          >
            <div class="paper-rule-note">
              音频/媒体文件在创建题目时上传；此处只配置播放规则。
            </div>
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
              <span>最多播放次数</span>
              <InputNumber
                v-model:value="selectedBlock.props.maxPlays"
                :min="1"
                style="width: 100%"
              />
            </label>
          </template>

          <template
            v-else-if="
              selectedBlock.type === 'choice' ||
              selectedBlock.type === 'multi_choice'
            "
          >
            <label class="paper-field">
              <span>选项数量</span>
              <InputNumber
                :value="selectedBlock.props.optionCount || 4"
                :min="2"
                :max="12"
                style="width: 100%"
                @update:value="
                  (value) => {
                    if (selectedBlock) setOptionCount(selectedBlock, value);
                  }
                "
              />
            </label>
            <div class="paper-rule-note">选项文案在创建题目时填写</div>
          </template>

          <template v-else-if="selectedBlock.type === 'true_false'">
            <div class="paper-rule-note">判断题固定「正确 / 错误」</div>
          </template>

          <template
            v-else-if="
              selectedBlock.type === 'text_short' ||
              selectedBlock.type === 'text_long'
            "
          >
            <label class="paper-field">
              <span>占位提示（可选）</span>
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
              <span>单位（可选）</span>
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

          <template v-else-if="selectedBlock.type === 'matching'">
            <label class="paper-field">
              <span>匹配对数</span>
              <InputNumber
                v-model:value="selectedBlock.props.pairCount"
                :min="2"
                :max="20"
                style="width: 100%"
              />
            </label>
            <div class="paper-rule-note">左右项文案在创建题目时填写</div>
          </template>

          <template v-else-if="selectedBlock.type === 'audio_record'">
            <label class="paper-field">
              <span>提示语（可选）</span>
              <Input v-model:value="selectedBlock.props.tip" />
            </label>
            <label class="paper-field">
              <span>最长秒数</span>
              <InputNumber
                v-model:value="selectedBlock.props.maxSeconds"
                :min="10"
                style="width: 100%"
              />
            </label>
          </template>

          <template v-else-if="selectedBlock.type === 'hotspot'">
            <label class="paper-field">
              <span>提示语（可选）</span>
              <Input v-model:value="selectedBlock.props.prompt" />
            </label>
            <div class="paper-rule-note">底图在创建题目时上传</div>
          </template>

          <template v-else-if="selectedBlock.type === 'classify'">
            <label class="paper-field">
              <span>分类数</span>
              <InputNumber
                v-model:value="selectedBlock.props.binCount"
                :min="2"
                style="width: 100%"
              />
            </label>
            <label class="paper-field">
              <span>条目数</span>
              <InputNumber
                v-model:value="selectedBlock.props.itemCount"
                :min="2"
                style="width: 100%"
              />
            </label>
            <div class="paper-rule-note">类名与条目在创建题目时填写</div>
          </template>

          <template v-else-if="selectedBlock.type === 'sorting'">
            <label class="paper-field">
              <span>条目数</span>
              <InputNumber
                v-model:value="selectedBlock.props.itemCount"
                :min="2"
                style="width: 100%"
              />
            </label>
            <div class="paper-rule-note">条目文案在创建题目时填写</div>
          </template>

          <template v-else-if="selectedBlock.type === 'code'">
            <label class="paper-field">
              <span>默认语言</span>
              <Input v-model:value="selectedBlock.props.language" />
            </label>
            <div class="paper-rule-note">起始代码可在创建题目时提供</div>
          </template>

          <template v-else-if="selectedBlock.type === 'drawing'">
            <label class="paper-field">
              <span>画布宽度</span>
              <InputNumber
                v-model:value="selectedBlock.props.width"
                :min="320"
                style="width: 100%"
              />
            </label>
            <label class="paper-field">
              <span>画布高度</span>
              <InputNumber
                v-model:value="selectedBlock.props.height"
                :min="240"
                style="width: 100%"
              />
            </label>
          </template>

          <template v-else-if="selectedBlock.type === 'section'">
            <label class="paper-field">
              <span>说明（可选）</span>
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

.paper-face-html,
.paper-face-shell {
  min-height: 48px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: hsl(var(--muted-foreground));
  background: #fffef8;
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
}

.paper-face-cloze,
.paper-face-passage {
  font-size: 15px;
  line-height: 1.9;
  color: #111827;
}

.paper-face-blanks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.paper-face-blank.pool {
  color: #14532d;
  background: #dcfce7;
  border-color: #16a34a;
}

.paper-face-blank.local small,
.paper-face-blank.pool small {
  margin-left: 2px;
  font-size: 10px;
  font-weight: 500;
  opacity: 0.75;
}

.paper-face-pool-box {
  padding: 8px 10px;
  margin-top: 10px;
  font-size: 12px;
  color: #166534;
  background: #f0fdf4;
  border: 1px dashed #86efac;
  border-radius: 8px;
}

.paper-face-shell-line {
  margin-bottom: 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.paper-face-blank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.8em;
  padding: 0 8px;
  margin: 0 3px;
  font-size: 12px;
  font-weight: 700;
  color: #1d4ed8;
  background: #dbeafe;
  border: 1px dashed #3b82f6;
  border-radius: 999px;
}

.paper-face-bank,
.paper-face-classify {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.paper-face-bank-item {
  padding: 3px 8px;
  font-size: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
}

.paper-face-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.paper-face-option {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
}

.paper-face-radio {
  width: 14px;
  height: 14px;
  border: 1.5px solid #94a3b8;
  border-radius: 50%;
}

.paper-face-media,
.paper-face-write {
  padding: 14px;
  font-size: 14px;
  color: #334155;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
}

.paper-muted {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
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

.paper-demo-banner {
  padding: 8px 12px;
  margin-bottom: 10px;
  font-size: 12px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}

.paper-rule-note {
  padding: 8px 10px;
  margin: 4px 0 8px;
  font-size: 12px;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 40%);
  border-radius: 8px;
}

@media (max-width: 1100px) {
  .paper-designer-body {
    grid-template-columns: 1fr;
  }
}
</style>
