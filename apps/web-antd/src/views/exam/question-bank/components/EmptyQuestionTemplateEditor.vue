<script lang="ts" setup>
/**
 * 题型模板编辑器：中间就是一道空题模具，点哪里改哪里。
 * 支持打印预览（图大小/位置、题号排版）。
 */
import type {
  BlankBinding,
  BlankMarkStyle,
  ChoiceNode,
  FramePlacement,
  LengthUnit,
  MediaNode,
  OptionMarkerStyle,
  PassageNode,
  PoolNode,
  TemplateDocument,
  TemplateLanguage,
  TemplateNode,
  TemplateNumbering,
} from '../template-document';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Dropdown,
  Input,
  InputNumber,
  message,
  Select,
} from 'ant-design-vue';

import { MOLD_CARDS } from '../mold-cards';
import { paperForDemoPreview } from '../paper-schema';
import {
  applyPassageBinding,
  createChoiceNode,
  createCodeNode,
  createDrawNode,
  createGroupNode,
  createInputNode,
  createMatchNode,
  createMediaNode,
  createPassageNode,
  createPoolNode,
  createRecordNode,
  createTextNode,
  ensureTemplateStyle,
  formatNumbering,
  L,
  lengthToCss,
  resolveSurfaceStyle,
  setPassageBlankCountOnNode,
} from '../template-document';
import { templateDocumentToPaperDocument } from '../template-document.bridge';
import QuestionPreview from './QuestionPreview.vue';

defineOptions({ name: 'EmptyQuestionTemplateEditor' });

const document = defineModel<TemplateDocument>({ required: true });

const mode = ref<'edit' | 'print' | 'screen'>('edit');
const selectedId = ref<string>();
/** 选结构页：点过卡片（含空白自定义）后离开，避免「点了没反应」 */
const moldPicking = ref(document.value.nodes.length === 0);
/** 呈现设置默认收起，避免挡住结构卡片 */
const surfacePanel = ref(false);

const showMoldPicker = computed(
  () => moldPicking.value && mode.value === 'edit',
);

watch(
  () => document.value.nodes.length,
  (n) => {
    if (n > 0) moldPicking.value = false;
  },
);

watch(
  () => document.value,
  (doc) => {
    if (!doc) return;
    doc.style = ensureTemplateStyle(doc.style);
  },
  { immediate: true },
);

const activeSurface = computed(() =>
  mode.value === 'print' ? 'print' : 'screen',
);

const surface = computed(() =>
  resolveSurfaceStyle(document.value.style, activeSurface.value),
);

const sheetCssVars = computed(() => {
  const s = surface.value;
  return {
    '--eq-font': s.fontFamily,
    '--eq-body': lengthToCss(s.bodyFontSize) || '16px',
    '--eq-heading': lengthToCss(s.headingFontSize) || '18px',
    '--eq-lh': String(s.lineHeight),
    '--eq-blank-min': lengthToCss(s.blankMinWidth) || '28px',
    '--eq-opt-gap': lengthToCss(s.optionGap) || '8px',
  } as Record<string, string>;
});

const selected = computed(() =>
  selectedId.value
    ? findNode(document.value.nodes, selectedId.value)
    : undefined,
);

const numberedMap = computed(() => {
  const map = new Map<string, number>();
  let i = 0;
  const walk = (nodes: TemplateNode[]) => {
    for (const n of nodes) {
      if (n.numbered !== false && n.type !== 'pool' && n.type !== 'blank') {
        map.set(n.id, i);
        i += 1;
      }
      if (n.type === 'group') walk(n.children);
    }
  };
  walk(document.value.nodes);
  return map;
});

const demoComponents = computed(() =>
  paperForDemoPreview(templateDocumentToPaperDocument(document.value)),
);

const BLANK_MARK_OPTIONS: Array<{ label: string; value: BlankMarkStyle }> = [
  { label: '下划线 ______', value: 'underline' },
  { label: '方括号 【　】', value: 'brackets' },
  { label: '带号 (1)___', value: 'paren_n' },
  { label: '方框 □□□', value: 'box' },
];

const FONT_OPTIONS = [
  {
    label: '系统黑体（机考）',
    value: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  {
    label: '宋体（卷面常用）',
    value: '"SimSun", "Songti SC", "Times New Roman", serif',
  },
  {
    label: '楷体',
    value: '"KaiTi", "STKaiti", serif',
  },
  {
    label: '仿宋',
    value: '"FangSong", "STFangsong", serif',
  },
  {
    label: 'Times New Roman',
    value: '"Times New Roman", Times, serif',
  },
];

function blankMarkLabel(index: number, mark: BlankMarkStyle) {
  if (mark === 'brackets') return '【　　】';
  if (mark === 'box') return '□□□';
  if (mark === 'paren_n') return `(${index})______`;
  return '________';
}

function fontSizeValue(surfaceKey: 'print' | 'screen') {
  const s =
    surfaceKey === 'print'
      ? document.value.style.print.bodyFontSize ||
        document.value.style.bodyFontSize
      : document.value.style.bodyFontSize;
  return s?.value;
}

function setFontSize(surfaceKey: 'print' | 'screen', v: unknown) {
  const n = Number(v) || 12;
  if (surfaceKey === 'print') {
    const unit =
      document.value.style.print.bodyFontSize?.unit ||
      document.value.style.bodyFontSize.unit ||
      'pt';
    document.value.style.print.bodyFontSize = L(n, unit);
  } else {
    document.value.style.bodyFontSize = L(
      n,
      document.value.style.bodyFontSize.unit || 'px',
    );
  }
}

const BINDING_OPTIONS: Array<{ label: string; value: BlankBinding }> = [
  { label: '手打', value: 'free_text' },
  { label: '每空自带选项', value: 'local_choice' },
  { label: '共用选项池', value: 'shared_pool' },
  { label: '数值', value: 'number' },
  { label: '公式', value: 'formula' },
];

const PLACEMENT_OPTIONS: Array<{ label: string; value: FramePlacement }> = [
  { label: '整行', value: 'block' },
  { label: '靠左', value: 'float_left' },
  { label: '靠右', value: 'float_right' },
  { label: '随文', value: 'inline' },
];

const UNIT_OPTIONS: Array<{ label: string; value: LengthUnit }> = [
  { label: '%', value: '%' },
  { label: 'px', value: 'px' },
  { label: 'mm', value: 'mm' },
];

const LANG_OPTIONS: Array<{ label: string; value: TemplateLanguage }> = [
  { label: '中文', value: 'zh-CN' },
  { label: '英文', value: 'en-US' },
  { label: '双语', value: 'bilingual' },
];

const NUMBERING_OPTIONS: Array<{
  label: string;
  value: TemplateNumbering['scheme'];
}> = [
  { label: '1. 2. 3.', value: 'arabic' },
  { label: '(1)(2)', value: 'paren' },
  { label: 'A. B.', value: 'letter' },
  { label: '一、二', value: 'chinese' },
  { label: '隐藏', value: 'none' },
];

function findNode(nodes: TemplateNode[], id: string): TemplateNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.type === 'group') {
      const f = findNode(n.children, id);
      if (f) return f;
    }
    if (n.type === 'passage') {
      const b = n.blanks.find((x) => x.id === id);
      if (b) return b;
    }
  }
  return undefined;
}

function applyMold(id: string) {
  const card = MOLD_CARDS.find((c) => c.id === id);
  if (!card) {
    message.error('未找到该结构');
    return;
  }
  try {
    const next = card.build();
    // 整份替换，确保 v-model 一定更新
    document.value = {
      version: 3,
      role: 'template',
      meta: next.meta,
      style: ensureTemplateStyle(next.style),
      nodes: [...next.nodes],
    };
    selectedId.value = document.value.nodes[0]?.id;
    moldPicking.value = false;
    mode.value = 'edit';
    surfacePanel.value = false;
  } catch (error) {
    console.error(error);
    message.error('生成模具失败，请重试');
    moldPicking.value = true;
  }
}

function popupContainer() {
  return globalThis.document.body;
}

function rePickMold() {
  document.value.nodes = [];
  selectedId.value = undefined;
  moldPicking.value = true;
  mode.value = 'edit';
}

function selectNode(id: string) {
  if (mode.value === 'screen') return;
  selectedId.value = id;
}

function optionLabels(node: { rules: { mode: string; optionCount: number } }) {
  if (node.rules.mode === 'true_false') return ['对', '错'];
  return optKeys(node.rules.optionCount);
}

function formatOptionKey(key: string, marker: OptionMarkerStyle) {
  if (marker === 'paren') return `(${key})`;
  if (marker === 'letter' || marker === 'circle' || marker === 'square') {
    return `${key}.`;
  }
  return `${key}.`;
}

const materialMenu = {
  items: [] as Array<{ key: string; label: string }>,
  onClick: ({ key }: { key: number | string }) => {
    ADD_MATERIAL.find((x) => x.key === String(key))?.run();
  },
};
const answerMenu = {
  items: [] as Array<{ key: string; label: string }>,
  onClick: ({ key }: { key: number | string }) => {
    ADD_ANSWER.find((x) => x.key === String(key))?.run();
  },
};

function addNode(node: TemplateNode) {
  document.value.nodes.push(node);
  selectedId.value = node.id;
}

function removeSelected() {
  if (!selectedId.value) return;
  const id = selectedId.value;
  const rm = (list: TemplateNode[]): boolean => {
    const i = list.findIndex((x) => x.id === id);
    if (i !== -1) {
      list.splice(i, 1);
      return true;
    }
    for (const x of list) {
      if (x.type === 'group' && rm(x.children)) return true;
    }
    return false;
  };
  rm(document.value.nodes);
  selectedId.value = undefined;
}

function no(node: TemplateNode) {
  const i = numberedMap.value.get(node.id);
  return i === undefined || i === null
    ? ''
    : formatNumbering(i, document.value.meta.numbering);
}

function asPassage(n?: TemplateNode) {
  return n?.type === 'passage' ? (n as PassageNode) : undefined;
}
function asChoice(n?: TemplateNode) {
  return n?.type === 'choice' ? (n as ChoiceNode) : undefined;
}
function asMedia(n?: TemplateNode) {
  return n?.type === 'media' ? (n as MediaNode) : undefined;
}
function asPool(n?: TemplateNode) {
  return n?.type === 'pool' ? (n as PoolNode) : undefined;
}

function ensurePool(passage: PassageNode) {
  if (
    passage.poolId &&
    document.value.nodes.some(
      (x) => x.type === 'pool' && x.id === passage.poolId,
    )
  ) {
    return passage.poolId;
  }
  const pool = createPoolNode(15);
  document.value.nodes.push(pool);
  passage.poolId = pool.id;
  return pool.id;
}

function setBlankCount(passage: PassageNode | undefined, v: unknown) {
  if (!passage) return;
  setPassageBlankCountOnNode(passage, Number(v) || 1, passage.poolId);
}

function setBinding(passage: PassageNode | undefined, b: BlankBinding) {
  if (!passage) return;
  if (b === 'shared_pool') {
    applyPassageBinding(passage, b, ensurePool(passage));
  } else {
    applyPassageBinding(passage, b);
  }
}

function setWidth(
  node: TemplateNode | undefined,
  v: unknown,
  unit?: LengthUnit,
) {
  if (!node) return;
  const cur = node.frame.width;
  const u = unit || (cur && cur !== 'auto' ? cur.unit : ('%' as LengthUnit));
  node.frame.width = L(Number(v) || 0, u);
}

function setHeight(node: TemplateNode | undefined, v: unknown) {
  if (!node) return;
  if (v === '' || v === null || v === undefined) {
    node.frame.height = 'auto';
    return;
  }
  const cur = node.frame.height;
  const u = cur && cur !== 'auto' ? cur.unit : 'px';
  node.frame.height = L(Number(v) || 0, u);
}

function wVal(n?: TemplateNode) {
  const w = n?.frame.width;
  return !w || w === 'auto' ? undefined : w.value;
}
function wUnit(n?: TemplateNode): LengthUnit {
  const w = n?.frame.width;
  return w && w !== 'auto' ? w.unit : '%';
}
function hVal(n?: TemplateNode) {
  const h = n?.frame.height;
  return !h || h === 'auto' ? undefined : h.value;
}

function mediaStyle(node: MediaNode) {
  const style: Record<string, string> = {
    width: lengthToCss(node.frame.width) || '60%',
  };
  if (node.frame.height && node.frame.height !== 'auto') {
    style.height = lengthToCss(node.frame.height);
  } else {
    style.minHeight = '120px';
  }
  if (node.frame.placement === 'float_right') {
    style.float = 'right';
    style.marginLeft = '12px';
    style.maxWidth = '46%';
  }
  if (node.frame.placement === 'float_left') {
    style.float = 'left';
    style.marginRight = '12px';
    style.maxWidth = '46%';
  }
  if (node.frame.align === 'center') style.marginInline = 'auto';
  return style;
}

function optKeys(n: number) {
  return Array.from({ length: Math.max(2, n) }, (_, i) =>
    String.fromCodePoint(65 + i),
  );
}

const ADD_MATERIAL = [
  { key: 'text', label: '文字材料', run: () => addNode(createTextNode()) },
  {
    key: 'image',
    label: '图片',
    run: () => addNode(createMediaNode('image')),
  },
  {
    key: 'audio',
    label: '音频',
    run: () => addNode(createMediaNode('audio')),
  },
  {
    key: 'passage',
    label: '可挖空文字',
    run: () => addNode(createPassageNode('local_choice', 5)),
  },
];

const ADD_ANSWER = [
  {
    key: 'choice',
    label: '单选',
    run: () => addNode(createChoiceNode('single', 4)),
  },
  {
    key: 'multi',
    label: '多选',
    run: () => addNode(createChoiceNode('multi', 5)),
  },
  {
    key: 'tf',
    label: '判断',
    run: () => addNode(createChoiceNode('true_false', 2)),
  },
  {
    key: 'input',
    label: '书写',
    run: () => addNode(createInputNode('long', 800)),
  },
  { key: 'code', label: '代码', run: () => addNode(createCodeNode()) },
  { key: 'draw', label: '绘图', run: () => addNode(createDrawNode()) },
  { key: 'record', label: '录音', run: () => addNode(createRecordNode()) },
  { key: 'match', label: '匹配', run: () => addNode(createMatchNode(5)) },
  {
    key: 'group',
    label: '小题组',
    run: () => {
      const g = createGroupNode('小题');
      g.children = [
        createChoiceNode('single', 4),
        createChoiceNode('single', 4),
      ];
      addNode(g);
    },
  },
  { key: 'pool', label: '选项池', run: () => addNode(createPoolNode(15)) },
];

materialMenu.items = ADD_MATERIAL.map((x) => ({ key: x.key, label: x.label }));
answerMenu.items = ADD_ANSWER.map((x) => ({ key: x.key, label: x.label }));

const OPTION_MARKER_OPTIONS: Array<{
  label: string;
  value: OptionMarkerStyle;
}> = [
  { label: '字母 A. B.（卷面）', value: 'letter' },
  { label: '括号 (A) (B)', value: 'paren' },
  { label: '圆圈 ○（机考）', value: 'circle' },
  { label: '方框 □', value: 'square' },
];
</script>

<template>
  <div class="eq-root">
    <header class="eq-bar">
      <div class="eq-bar-actions">
        <Dropdown
          v-if="mode === 'edit' && !moldPicking"
          :trigger="['click']"
          :menu="materialMenu"
          :get-popup-container="popupContainer"
        >
          <Button size="small">+ 材料</Button>
        </Dropdown>
        <Dropdown
          v-if="mode === 'edit' && !moldPicking"
          :trigger="['click']"
          :menu="answerMenu"
          :get-popup-container="popupContainer"
        >
          <Button size="small" type="primary">+ 作答</Button>
        </Dropdown>
        <Button
          v-if="mode === 'edit' && !moldPicking"
          size="small"
          @click="rePickMold"
        >
          重选结构
        </Button>
        <Button
          v-if="!moldPicking"
          size="small"
          :type="surfacePanel ? 'primary' : 'default'"
          ghost
          @click="surfacePanel = !surfacePanel"
        >
          {{ mode === 'print' ? '卷面设置' : '呈现设置' }}
        </Button>
      </div>
      <div class="eq-mode-switch" role="tablist">
        <button
          type="button"
          role="tab"
          :class="{ active: mode === 'edit' }"
          @click="mode = 'edit'"
        >
          编辑模具
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: mode === 'screen' }"
          @click="mode = 'screen'"
        >
          机考示意
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: mode === 'print' }"
          @click="mode = 'print'"
        >
          打印卷面
        </button>
      </div>
    </header>

    <div class="eq-body">
      <div class="eq-main">
        <!-- 选结构：独立 v-if，避免和卷面 v-else 抢分支 -->
        <div v-if="showMoldPicker" class="eq-molds">
          <div class="eq-molds-hero">
            <h3>选择一种空题结构</h3>
            <p>点卡片生成模具；之后可用「材料 / 作答」继续拼</p>
          </div>
          <div class="eq-mold-grid">
            <div
              v-for="card in MOLD_CARDS"
              :key="card.id"
              role="button"
              tabindex="0"
              class="eq-mold-card"
              @click.stop.prevent="applyMold(card.id)"
              @keydown.enter.prevent="applyMold(card.id)"
              @keydown.space.prevent="applyMold(card.id)"
            >
              <div class="eq-mold-preview" :data-kind="card.id">
                <IconifyIcon :icon="card.icon" class="eq-mold-icon" />
              </div>
              <strong>{{ card.title }}</strong>
              <span>{{ card.desc }}</span>
            </div>
          </div>
        </div>

        <!-- 机考示意 -->
        <div v-else-if="mode === 'screen'" class="eq-demo">
          <p class="eq-tip">
            机考示意（假数据，不写回模板）。字体/空格可在右侧「机考」区改。
          </p>
          <div class="eq-demo-frame" :style="sheetCssVars">
            <QuestionPreview :components="demoComponents" title="" />
          </div>
        </div>

        <!-- 打印 / 编辑：同一空题 -->
        <div
          v-else
          class="eq-stage"
          :class="{ print: mode === 'print' }"
          @click="selectedId = undefined"
        >
          <div
            class="eq-sheet"
            :class="{ a4: mode === 'print' }"
            :style="{
              ...sheetCssVars,
              ...(mode === 'print'
                ? {
                    padding: `${document.meta.layout.margin.top.value}mm ${document.meta.layout.margin.right.value}mm`,
                  }
                : {}),
            }"
            @click.stop
          >
            <div class="eq-sheet-name">
              <Input
                v-if="mode === 'edit'"
                v-model:value="document.meta.title"
                placeholder="题型模板名称（如：材料带小题）"
                variant="borderless"
                class="eq-title-input"
              />
              <span v-else>{{ document.meta.title || '题型模板' }}</span>
            </div>

            <p v-if="document.nodes.length === 0" class="eq-empty-hint">
              还没有结构。切到「编辑模具」选一张卡片，或点「材料 / 作答」添加。
            </p>

            <section
              v-for="node in document.nodes"
              :key="node.id"
              class="eq-block"
              :class="{ on: selectedId === node.id && mode === 'edit' }"
              @click.stop="selectNode(node.id)"
            >
              <span v-if="no(node)" class="eq-no">{{ no(node) }}</span>

              <div v-if="node.type === 'text'" class="eq-ph">
                {{ node.label || '文字材料' }}（出题时填写）
              </div>

              <div
                v-else-if="node.type === 'media'"
                class="eq-media"
                :style="mediaStyle(node)"
              >
                <div>
                  {{
                    node.rules.mediaKind === 'image'
                      ? '图片'
                      : node.rules.mediaKind === 'audio'
                        ? '音频'
                        : '视频'
                  }}
                </div>
                <small>
                  {{ lengthToCss(node.frame.width) }} ×
                  {{ lengthToCss(node.frame.height) }} ·
                  {{ node.frame.placement }}
                </small>
                <small v-if="node.rules.maxPlays">
                  最多 {{ node.rules.maxPlays }} 次
                </small>
              </div>

              <div v-else-if="node.type === 'passage'" class="eq-passage">
                <div class="eq-ph soft">可挖空文字（出题时填写）</div>
                <div class="eq-blanks" :data-mark="surface.blankMark">
                  <button
                    v-for="blank in node.blanks"
                    :key="blank.id"
                    type="button"
                    class="eq-blank"
                    :data-mark="surface.blankMark"
                    @click.stop="selectNode(blank.id)"
                  >
                    {{ blankMarkLabel(blank.rules.index, surface.blankMark) }}
                  </button>
                </div>
                <div
                  v-if="node.rules.defaultBinding === 'local_choice'"
                  class="eq-mini-opts"
                  :class="{ row: surface.optionLayout === 'horizontal' }"
                >
                  <div
                    v-for="blank in node.blanks.slice(0, 3)"
                    :key="blank.id"
                    class="eq-mini-line"
                  >
                    {{ blank.rules.index }}.
                    <span
                      v-for="k in optKeys(
                        blank.rules.optionCount ||
                          node.rules.defaultOptionCount ||
                          4,
                      )"
                      :key="k"
                    >
                      {{ k }}
                    </span>
                  </div>
                  <div v-if="node.blanks.length > 3" class="eq-more">
                    …共 {{ node.blanks.length }} 空
                  </div>
                </div>
                <div
                  v-else-if="node.rules.defaultBinding === 'shared_pool'"
                  class="eq-more"
                >
                  填空方式：共用选项池
                </div>
              </div>

              <div v-else-if="node.type === 'pool'" class="eq-pool">
                选项池 · {{ node.rules.size }} 个（
                {{ node.rules.reuse === 'once' ? '一词一次' : '可重复' }} ）
              </div>

              <div v-else-if="node.type === 'choice'" class="eq-choice">
                <div class="eq-ph soft">小题干（出题时填写）</div>
                <div
                  class="eq-opts"
                  :class="{ row: surface.optionLayout === 'horizontal' }"
                  :data-marker="surface.optionMarker"
                >
                  <div
                    v-for="k in optionLabels(node)"
                    :key="k"
                    class="eq-opt"
                    :data-marker="surface.optionMarker"
                  >
                    <i
                      v-if="
                        surface.optionMarker === 'circle' ||
                        surface.optionMarker === 'square'
                      "
                      :class="surface.optionMarker"
                    ></i>
                    <span class="eq-opt-key">{{
                      formatOptionKey(k, surface.optionMarker)
                    }}</span>
                    <span
                      v-if="mode === 'print' || activeSurface === 'print'"
                      class="eq-opt-blank"
                    >
                      （选项）
                    </span>
                    <span v-else class="eq-opt-ph">选项内容</span>
                  </div>
                </div>
              </div>

              <div v-else-if="node.type === 'input'" class="eq-box">
                {{ node.rules.inputKind === 'long' ? '书写作答区' : '短答区' }}
                <small>最多 {{ node.rules.maxLength }} 字</small>
              </div>

              <div v-else-if="node.type === 'code'" class="eq-box">
                代码作答区
              </div>
              <div v-else-if="node.type === 'draw'" class="eq-box">
                绘图区 {{ node.rules.canvasWidth }}×{{
                  node.rules.canvasHeight
                }}
              </div>
              <div v-else-if="node.type === 'record'" class="eq-box">
                录音 · 最长 {{ node.rules.maxSeconds }}s
              </div>
              <div v-else-if="node.type === 'match'" class="eq-box">
                匹配 · {{ node.rules.pairCount }} 对
              </div>

              <div v-else-if="node.type === 'group'" class="eq-group">
                <div
                  v-for="(child, cidx) in node.children"
                  :key="child.id"
                  class="eq-group-item"
                  :class="{ on: selectedId === child.id }"
                  @click.stop="selectNode(child.id)"
                >
                  <div class="eq-group-hd">
                    <strong>{{ cidx + 1 }}.</strong>
                    <span>{{ child.label || '小题' }}</span>
                  </div>
                  <template v-if="child.type === 'choice'">
                    <div
                      class="eq-opts"
                      :class="{ row: surface.optionLayout === 'horizontal' }"
                      :data-marker="surface.optionMarker"
                    >
                      <div
                        v-for="k in optionLabels(child)"
                        :key="k"
                        class="eq-opt"
                        :data-marker="surface.optionMarker"
                      >
                        <i
                          v-if="
                            surface.optionMarker === 'circle' ||
                            surface.optionMarker === 'square'
                          "
                          :class="surface.optionMarker"
                        ></i>
                        <span class="eq-opt-key">{{
                          formatOptionKey(k, surface.optionMarker)
                        }}</span>
                        <span v-if="mode === 'print'" class="eq-opt-blank">
                          （选项）
                        </span>
                        <span v-else class="eq-opt-ph">选项内容</span>
                      </div>
                    </div>
                  </template>
                  <div v-else class="eq-ph soft">
                    {{ child.type }}（点此改规则）
                  </div>
                </div>
                <Button
                  v-if="mode === 'edit'"
                  size="small"
                  type="dashed"
                  @click.stop="
                    node.children.push(createChoiceNode('single', 4))
                  "
                >
                  + 组内单选
                </Button>
              </div>
            </section>
          </div>
        </div>

        <!-- 点中节点：编辑规则 -->
        <footer
          v-if="(mode === 'edit' || mode === 'print') && selected"
          class="eq-dock"
          @click.stop
        >
          <div class="eq-dock-head">
            <strong>{{ selected.label || selected.type }}</strong>
            <Button size="small" type="link" danger @click="removeSelected">
              删除
            </Button>
          </div>

          <div class="eq-dock-grid">
            <label>
              <span>名称</span>
              <Input v-model:value="selected.label" size="small" />
            </label>

            <template
              v-if="selected.type === 'media' || selected.type === 'text'"
            >
              <label>
                <span>位置</span>
                <Select
                  v-model:value="selected.frame.placement"
                  size="small"
                  :options="PLACEMENT_OPTIONS"
                />
              </label>
              <label>
                <span>宽</span>
                <InputNumber
                  size="small"
                  :value="wVal(selected)"
                  style="width: 100%"
                  @update:value="(v) => setWidth(selected, v)"
                />
              </label>
              <label>
                <span>单位</span>
                <Select
                  size="small"
                  :value="wUnit(selected)"
                  :options="UNIT_OPTIONS"
                  @update:value="
                    (u) =>
                      setWidth(selected, wVal(selected) ?? 60, u as LengthUnit)
                  "
                />
              </label>
              <label>
                <span>高</span>
                <InputNumber
                  size="small"
                  :value="hVal(selected)"
                  placeholder="自动"
                  style="width: 100%"
                  @update:value="(v) => setHeight(selected, v)"
                />
              </label>
              <label v-if="asMedia(selected)?.rules.mediaKind !== 'image'">
                <span>最多播放</span>
                <InputNumber
                  v-model:value="asMedia(selected)!.rules.maxPlays"
                  size="small"
                  :min="1"
                  style="width: 100%"
                />
              </label>
            </template>

            <template v-if="asPassage(selected)">
              <label>
                <span>空数</span>
                <InputNumber
                  size="small"
                  :value="asPassage(selected)!.blanks.length"
                  :min="1"
                  :max="50"
                  style="width: 100%"
                  @update:value="(v) => setBlankCount(asPassage(selected), v)"
                />
              </label>
              <label>
                <span>填法</span>
                <Select
                  size="small"
                  :value="asPassage(selected)!.rules.defaultBinding"
                  :options="BINDING_OPTIONS"
                  @update:value="
                    (v) => setBinding(asPassage(selected), v as BlankBinding)
                  "
                />
              </label>
              <label
                v-if="
                  asPassage(selected)!.rules.defaultBinding === 'local_choice'
                "
              >
                <span>每空几选</span>
                <InputNumber
                  v-model:value="asPassage(selected)!.rules.defaultOptionCount"
                  size="small"
                  :min="2"
                  :max="12"
                  style="width: 100%"
                  @update:value="
                    (v) => {
                      const p = asPassage(selected);
                      if (!p) return;
                      p.rules.defaultOptionCount = Number(v) || 4;
                      applyPassageBinding(p, 'local_choice');
                    }
                  "
                />
              </label>
            </template>

            <template v-if="selected.type === 'blank'">
              <label>
                <span>填法</span>
                <Select
                  v-model:value="selected.rules.binding"
                  size="small"
                  :options="BINDING_OPTIONS"
                />
              </label>
              <label v-if="selected.rules.binding === 'local_choice'">
                <span>选项数</span>
                <InputNumber
                  v-model:value="selected.rules.optionCount"
                  size="small"
                  :min="2"
                  :max="12"
                  style="width: 100%"
                />
              </label>
            </template>

            <template v-if="asPool(selected)">
              <label>
                <span>池大小</span>
                <InputNumber
                  v-model:value="asPool(selected)!.rules.size"
                  size="small"
                  :min="2"
                  style="width: 100%"
                />
              </label>
            </template>

            <template v-if="asChoice(selected)">
              <label v-if="asChoice(selected)!.rules.mode !== 'true_false'">
                <span>选项数</span>
                <InputNumber
                  v-model:value="asChoice(selected)!.rules.optionCount"
                  size="small"
                  :min="2"
                  :max="12"
                  style="width: 100%"
                />
              </label>
            </template>

            <template v-if="selected.scoring">
              <label>
                <span>分值</span>
                <InputNumber
                  v-model:value="selected.scoring.score"
                  size="small"
                  :min="0"
                  :step="0.5"
                  style="width: 100%"
                />
              </label>
            </template>
          </div>
        </footer>
      </div>

      <!-- 机考 / 卷面：始终可点开 -->
      <aside v-if="surfacePanel" class="eq-surface">
        <div class="eq-surface-head">
          <strong>呈现设置</strong>
          <button type="button" class="eq-link" @click="surfacePanel = false">
            收起
          </button>
        </div>
        <p class="eq-surface-tip">
          机考与纸笔卷面分开存：改打印不会冲掉机考样式。
        </p>

        <div class="eq-surface-sec">
          <h4>机考</h4>
          <label>
            <span>字体</span>
            <Select
              v-model:value="document.style.fontFamily"
              size="small"
              :options="FONT_OPTIONS"
            />
          </label>
          <label>
            <span>字号 px</span>
            <InputNumber
              size="small"
              :value="fontSizeValue('screen')"
              :min="12"
              :max="28"
              style="width: 100%"
              @update:value="(v) => setFontSize('screen', v)"
            />
          </label>
          <label>
            <span>行距</span>
            <InputNumber
              v-model:value="document.style.lineHeight"
              size="small"
              :min="1.2"
              :max="3"
              :step="0.05"
              style="width: 100%"
            />
          </label>
          <label>
            <span>空格形式</span>
            <Select
              v-model:value="document.style.blankMark"
              size="small"
              :options="BLANK_MARK_OPTIONS"
            />
          </label>
          <label>
            <span>选项排列</span>
            <Select
              v-model:value="document.style.optionLayout"
              size="small"
              :options="[
                { label: '竖排', value: 'vertical' },
                { label: '横排', value: 'horizontal' },
              ]"
            />
          </label>
          <label>
            <span>选项标记</span>
            <Select
              v-model:value="document.style.optionMarker"
              size="small"
              :options="OPTION_MARKER_OPTIONS"
            />
          </label>
        </div>

        <div class="eq-surface-sec">
          <h4>打印卷面</h4>
          <label>
            <span>字体</span>
            <Select
              size="small"
              :value="
                document.style.print.fontFamily || document.style.fontFamily
              "
              :options="FONT_OPTIONS"
              @update:value="
                (v) => (document.style.print.fontFamily = String(v))
              "
            />
          </label>
          <label>
            <span>字号 pt</span>
            <InputNumber
              size="small"
              :value="fontSizeValue('print')"
              :min="9"
              :max="22"
              style="width: 100%"
              @update:value="(v) => setFontSize('print', v)"
            />
          </label>
          <label>
            <span>行距</span>
            <InputNumber
              size="small"
              :value="
                document.style.print.lineHeight ?? document.style.lineHeight
              "
              :min="1.2"
              :max="3"
              :step="0.05"
              style="width: 100%"
              @update:value="
                (v) => (document.style.print.lineHeight = Number(v) || 1.8)
              "
            />
          </label>
          <label>
            <span>空格形式</span>
            <Select
              size="small"
              :value="
                document.style.print.blankMark || document.style.blankMark
              "
              :options="BLANK_MARK_OPTIONS"
              @update:value="
                (v) => (document.style.print.blankMark = v as BlankMarkStyle)
              "
            />
          </label>
          <label>
            <span>空宽 mm</span>
            <InputNumber
              size="small"
              :value="document.style.print.blankMinWidth?.value ?? 24"
              :min="8"
              :max="80"
              style="width: 100%"
              @update:value="
                (v) =>
                  (document.style.print.blankMinWidth = L(
                    Number(v) || 24,
                    'mm',
                  ))
              "
            />
          </label>
          <label>
            <span>选项排列</span>
            <Select
              size="small"
              :value="
                document.style.print.optionLayout || document.style.optionLayout
              "
              :options="[
                { label: '竖排', value: 'vertical' },
                { label: '横排', value: 'horizontal' },
              ]"
              @update:value="
                (v) =>
                  (document.style.print.optionLayout = v as
                    | 'horizontal'
                    | 'vertical')
              "
            />
          </label>
          <label>
            <span>选项标记</span>
            <Select
              size="small"
              :value="document.style.print.optionMarker || 'letter'"
              :options="OPTION_MARKER_OPTIONS"
              @update:value="
                (v) =>
                  (document.style.print.optionMarker = v as OptionMarkerStyle)
              "
            />
          </label>
          <label>
            <span>题号样式</span>
            <Select
              v-model:value="document.meta.numbering.scheme"
              size="small"
              :options="NUMBERING_OPTIONS"
            />
          </label>
          <label>
            <span>起始号</span>
            <InputNumber
              v-model:value="document.meta.numbering.start"
              size="small"
              :min="0"
              style="width: 100%"
            />
          </label>
          <label>
            <span>页边距 mm</span>
            <InputNumber
              size="small"
              :value="document.meta.layout.margin.top.value"
              :min="0"
              style="width: 100%"
              @update:value="
                (v) => {
                  const n = Number(v) || 0;
                  document.meta.layout.margin = {
                    top: L(n, 'mm'),
                    right: L(n, 'mm'),
                    bottom: L(n, 'mm'),
                    left: L(n, 'mm'),
                  };
                }
              "
            />
          </label>
          <label>
            <span>语言</span>
            <Select
              v-model:value="document.meta.language"
              size="small"
              :options="LANG_OPTIONS"
            />
          </label>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.eq-root {
  --eq-ink: #1f2937;
  --eq-muted: #6b7280;
  --eq-line: #e5e7eb;
  --eq-soft: #f9fafb;
  --eq-paper: #fff;
  --eq-accent: #2563eb;

  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--eq-ink);
  background: #fff;
  border: 1px solid var(--eq-line);
  border-radius: 10px;
}

.eq-bar {
  display: flex;
  flex: none;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid var(--eq-line);
}

.eq-bar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.eq-mode-switch {
  display: inline-flex;
  padding: 3px;
  background: #f3f4f6;
  border-radius: 8px;
}

.eq-mode-switch button {
  min-width: 72px;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--eq-muted);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.eq-mode-switch button.active {
  color: var(--eq-ink);
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
}

.eq-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.eq-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.eq-surface {
  display: flex;
  flex: none;
  flex-direction: column;
  width: 280px;
  padding: 12px 14px 16px;
  overflow: auto;
  background: #fafafa;
  border-left: 1px solid var(--eq-line);
}

.eq-surface-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.eq-surface-head strong {
  font-size: 13px;
}

.eq-link {
  padding: 0;
  font-size: 12px;
  color: var(--eq-accent);
  cursor: pointer;
  background: none;
  border: 0;
}

.eq-surface-tip {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--eq-muted);
}

.eq-surface-sec {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 0 14px;
  border-top: 1px solid var(--eq-line);
}

.eq-surface-sec h4 {
  margin: 0 0 2px;
  font-size: 12px;
  font-weight: 650;
  color: var(--eq-ink);
}

.eq-surface-sec label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: var(--eq-muted);
}

.eq-molds {
  position: relative;
  z-index: 2;
  flex: 1;
  padding: 28px 20px 36px;
  overflow: auto;
  background: #fff;
}

.eq-molds-hero {
  max-width: 560px;
  margin: 0 auto 22px;
  text-align: center;
}

.eq-molds-hero h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
}

.eq-molds-hero p {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--eq-muted);
}

.eq-mold-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 12px;
  max-width: 920px;
  margin: 0 auto;
}

.eq-mold-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  user-select: none;
  background: #fff;
  border: 1px solid var(--eq-line);
  border-radius: 10px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

/* 子节点不抢点击，避免图标把 click 吃掉 */
.eq-mold-card * {
  pointer-events: none;
}

.eq-mold-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 6px 18px rgb(37 99 235 / 10%);
}

.eq-mold-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  color: #334155;
  background: #f8fafc;
  border-radius: 8px;
}

.eq-mold-preview[data-kind='single'] {
  color: #2563eb;
  background: #eff6ff;
}

.eq-mold-preview[data-kind='multi'] {
  color: #059669;
  background: #ecfdf5;
}

.eq-mold-preview[data-kind='judge'] {
  color: #d97706;
  background: #fffbeb;
}

.eq-mold-preview[data-kind='blank_type'] {
  color: #7c3aed;
  background: #f5f3ff;
}

.eq-mold-preview[data-kind='blank_local'] {
  color: #db2777;
  background: #fdf2f8;
}

.eq-mold-preview[data-kind='blank_pool'] {
  color: #0f766e;
  background: #f0fdfa;
}

.eq-mold-preview[data-kind='material_sub'] {
  color: #1d4ed8;
  background: #eef2ff;
}

.eq-mold-preview[data-kind='listening'] {
  color: #b45309;
  background: #fff7ed;
}

.eq-mold-preview[data-kind='image_q'] {
  color: #475569;
  background: #f1f5f9;
}

.eq-mold-preview[data-kind='writing'] {
  color: #be123c;
  background: #fff1f2;
}

.eq-mold-preview[data-kind='code'] {
  color: #0369a1;
  background: #f0f9ff;
}

.eq-mold-preview[data-kind='custom'] {
  color: #64748b;
  background: repeating-linear-gradient(
    -45deg,
    #f8fafc,
    #f8fafc 6px,
    #e2e8f0 6px,
    #e2e8f0 7px
  );
}

.eq-mold-icon {
  font-size: 26px;
}

.eq-mold-card strong {
  font-size: 13px;
  font-weight: 650;
}

.eq-mold-card span {
  font-size: 12px;
  line-height: 1.4;
  color: var(--eq-muted);
}

.eq-stage {
  display: flex;
  flex: 1;
  justify-content: center;
  padding: 20px 16px 28px;
  overflow: auto;
  background: #f3f4f6;
}

.eq-stage.print {
  background: #9ca3af;
}

.eq-sheet {
  width: min(720px, 100%);
  min-height: 420px;
  padding: 32px 36px;
  font-family: var(--eq-font);
  font-size: var(--eq-body);
  line-height: var(--eq-lh);
  background: var(--eq-paper);
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  box-shadow: 0 10px 30px rgb(0 0 0 / 8%);
}

.eq-sheet.a4 {
  width: min(210mm, 100%);
  min-height: 297mm;
  border-radius: 0;
  box-shadow: 0 16px 40px rgb(0 0 0 / 22%);
}

.eq-sheet-name {
  padding-bottom: 12px;
  margin-bottom: 18px;
  font-size: var(--eq-heading);
  font-weight: 650;
  border-bottom: 1px solid var(--eq-line);
}

.eq-title-input {
  font-size: var(--eq-heading);
  font-weight: 650;
}

.eq-empty-hint {
  margin: 40px 0;
  font-size: 13px;
  color: var(--eq-muted);
  text-align: center;
}

.eq-block {
  position: relative;
  clear: both;
  padding: 12px 10px 12px 36px;
  margin-bottom: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 8px;
}

.eq-block:hover {
  background: #f9fafb;
}

.eq-block.on {
  background: #eff6ff;
  border-color: #93c5fd;
}

.eq-no {
  position: absolute;
  top: 14px;
  left: 8px;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.eq-ph {
  padding: 14px;
  font-size: 13px;
  color: var(--eq-muted);
  text-align: center;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
}

.eq-ph.soft {
  padding: 10px;
  background: transparent;
}

.eq-media {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  color: #4b5563;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.eq-media small {
  font-size: 11px;
  color: #9ca3af;
}

.eq-blanks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.eq-blank {
  min-width: var(--eq-blank-min);
  min-height: 28px;
  padding: 2px 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #1d4ed8;
  cursor: pointer;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
}

.eq-blank[data-mark='underline'] {
  color: #111;
  letter-spacing: 0.08em;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #111;
  border-radius: 0;
}

.eq-blank[data-mark='brackets'],
.eq-blank[data-mark='paren_n'],
.eq-blank[data-mark='box'] {
  color: #111;
  background: transparent;
  border: 0;
}

.eq-mini-opts.row,
.eq-opts.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--eq-opt-gap);
}

.eq-mini-line {
  display: flex;
  gap: 10px;
  margin: 4px 0;
  font-size: 12px;
  color: #6b7280;
}

.eq-more {
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.eq-pool {
  padding: 12px 14px;
  font-size: 13px;
  color: #166534;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
}

.eq-opts {
  display: flex;
  flex-direction: column;
  gap: var(--eq-opt-gap);
  margin-top: 8px;
}

.eq-opt {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: inherit;
}

.eq-opt-key {
  flex: none;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.eq-opt-blank,
.eq-opt-ph {
  color: #9ca3af;
}

.eq-opt i.circle,
.eq-opt i.square {
  display: inline-block;
  flex: none;
  width: 14px;
  height: 14px;
  border: 1.5px solid #9ca3af;
}

.eq-opt i.circle {
  border-radius: 50%;
}

.eq-opt i.square {
  border-radius: 2px;
}

.eq-opt[data-marker='letter'] .eq-opt-key,
.eq-opt[data-marker='paren'] .eq-opt-key {
  min-width: 1.6em;
}

.eq-group-hd {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
}

.eq-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 84px;
  padding: 18px;
  font-size: 13px;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
}

.eq-box small {
  font-size: 12px;
  color: #9ca3af;
}

.eq-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.eq-group-item {
  padding: 12px 14px;
  font-size: 13px;
  background: #f9fafb;
  border: 1px solid transparent;
  border-radius: 6px;
}

.eq-group-item.on {
  background: #eff6ff;
  border-color: #93c5fd;
}

.eq-demo {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16px;
  overflow: auto;
  background: #fff;
}

.eq-demo-frame {
  font-family: var(--eq-font);
  font-size: var(--eq-body);
  line-height: var(--eq-lh);
}

.eq-tip {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--eq-muted);
}

.eq-dock {
  z-index: 2;
  flex: none;
  padding: 12px 14px 14px;
  background: #fff;
  border-top: 1px solid var(--eq-line);
  box-shadow: 0 -8px 24px rgb(0 0 0 / 4%);
}

.eq-dock-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.eq-dock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px 10px;
}

.eq-dock-grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: var(--eq-muted);
}

@media (max-width: 960px) {
  .eq-body {
    flex-direction: column;
  }

  .eq-surface {
    width: 100%;
    max-height: 40%;
    border-top: 1px solid var(--eq-line);
    border-left: 0;
  }
}
</style>
