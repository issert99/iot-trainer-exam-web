/**
 * 题目模板 Document v3 —— 全量量化模型
 *
 * 模板 = meta（卷面规则）+ nodes（空壳物件树）+ style（默认视觉）
 * 真实文案 / 图片文件 / 选项字 / 答案 → content 槽，模板阶段可全空
 *
 * 单位约定：Length = { value, unit }，unit 为 px | % | mm | em
 */

import type { JudgeMode } from './mock';

import { uid } from './mock';

// ─── 基础量 ───────────────────────────────────────────────

export type LengthUnit = '%' | 'em' | 'mm' | 'pt' | 'px';

export type Length = {
  unit: LengthUnit;
  value: number;
};

export type Box = {
  bottom: Length;
  left: Length;
  right: Length;
  top: Length;
};

export type Align = 'center' | 'end' | 'start';

/** 物件在卷面上的位置与尺寸（图片必填思路的来源） */
export type Frame = {
  align?: Align;
  aspectLock?: boolean;
  /** 仅 absolute 时有效，相对父节点或页 */
  height?: 'auto' | Length;
  margin?: Partial<Box>;
  padding?: Partial<Box>;
  placement: FramePlacement;
  width?: 'auto' | Length;
  x?: Length;
  y?: Length;
  zIndex?: number;
};

export type FramePlacement =
  | 'absolute'
  | 'block'
  | 'float_left'
  | 'float_right'
  | 'inline';

export function L(value: number, unit: LengthUnit = 'px'): Length {
  return { value, unit };
}

export function boxMm(
  top: number,
  right = top,
  bottom = top,
  left = right,
): Box {
  return {
    top: L(top, 'mm'),
    right: L(right, 'mm'),
    bottom: L(bottom, 'mm'),
    left: L(left, 'mm'),
  };
}

export function defaultFrame(
  partial?: Partial<Frame> & { placement?: FramePlacement },
): Frame {
  return {
    placement: 'block',
    width: L(100, '%'),
    height: 'auto',
    align: 'start',
    aspectLock: false,
    zIndex: 0,
    ...partial,
  };
}

// ─── 卷面 meta（语言、序号、版式）──────────────────────────

export type TemplateLanguage =
  | 'bilingual'
  | 'en-US'
  | 'ja-JP'
  | 'ko-KR'
  | 'zh-CN'
  | 'zh-TW';

export type NumberingScheme =
  | 'arabic' // 1. 2. 3.
  | 'chinese' // 一、二、三
  | 'letter' // A. B. C.
  | 'none'
  | 'paren'; // (1) (2)

export type NumberingScope = 'document' | 'per_group';

export type TemplateNumbering = {
  prefix: string;
  scheme: NumberingScheme;
  scope: NumberingScope;
  start: number;
  step: number;
  suffix: string;
};

export type TemplateLayout = {
  columns: 1 | 2 | 3;
  gap: Length;
  margin: Box;
  pageWidth: Length;
};

export type TemplateMeta = {
  defaultJudge: JudgeMode;
  /** 支持小数分，如 0.5 */
  defaultScore: number;
  direction: 'ltr' | 'rtl';
  language: TemplateLanguage;
  layout: TemplateLayout;
  numbering: TemplateNumbering;
  /** 双语时第二语言 */
  secondaryLanguage?: TemplateLanguage;
  title?: string;
};

/** 文内空在卷面上的样子 */
export type BlankMarkStyle =
  | 'box' // □□□
  | 'brackets' // 【　　】
  | 'paren_n' // (1)____
  | 'underline'; // ______

export type OptionMarkerStyle =
  | 'circle' // 机考：圆点 ○
  | 'letter' // 卷面：A. B. C.
  | 'paren' // (A) (B)
  | 'square'; // □ 多选勾选感

export type PrintSurfaceStyle = {
  blankMark?: BlankMarkStyle;
  blankMinWidth?: Length;
  bodyFontSize?: Length;
  fontFamily?: string;
  headingFontSize?: Length;
  lineHeight?: number;
  optionLayout?: 'horizontal' | 'vertical';
  /** 卷面选项前缀；默认 letter，不要机考圆圈 */
  optionMarker?: OptionMarkerStyle;
};

export type TemplateStyle = {
  blankChipMinWidth: Length;
  /** 空格卷面形态（机考默认也可看） */
  blankMark: BlankMarkStyle;
  bodyFontSize: Length;
  fontFamily: string;
  headingFontSize: Length;
  lineHeight: number;
  optionGap: Length;
  optionLayout: 'horizontal' | 'vertical';
  /** 机考选项标记 */
  optionMarker: OptionMarkerStyle;
  /**
   * 卷面/打印覆盖：纸笔考试与机考差异大，单独可调。
   * 未填字段回落到上面的机考默认值。
   */
  print: PrintSurfaceStyle;
};

// ─── 作答绑定（空 / 小题怎么答）────────────────────────────

export type BlankBinding =
  | 'code'
  | 'draw'
  | 'formula'
  | 'free_text'
  | 'hotspot'
  | 'local_choice'
  | 'match_right'
  | 'number'
  | 'record'
  | 'shared_pool';

export type ScoreRule = {
  judgeMode: JudgeMode;
  /** 部分得分策略 */
  partial?: 'all_or_nothing' | 'per_blank' | 'ratio';
  score: number;
};

// ─── 内容槽（模板可空；题目填充）──────────────────────────

export type ContentText = { html?: string; plain?: string };
export type ContentMedia = {
  alt?: string;
  src?: string;
  transcript?: string;
};
export type ContentOption = { key: string; text: string };
export type ContentPool = { items: ContentOption[] };
export type ContentAnswer = unknown;

export type NodeContent = {
  answer?: ContentAnswer;
  media?: ContentMedia;
  options?: ContentOption[];
  pool?: ContentPool;
  text?: ContentText;
};

// ─── 节点 ─────────────────────────────────────────────────

export type TemplateNodeType =
  | 'blank'
  | 'choice'
  | 'classify'
  | 'code'
  | 'divider'
  | 'draw'
  | 'formula'
  | 'group'
  | 'hotspot'
  | 'input'
  | 'match'
  | 'media'
  | 'number'
  | 'order'
  | 'passage'
  | 'pool'
  | 'record'
  | 'spacer'
  | 'table'
  | 'text';

export type TemplateNodeBase = {
  content?: NodeContent;
  frame: Frame;
  id: string;
  /** 展示用标题（非学科题型名） */
  label?: string;
  /** 是否参与卷面序号 */
  numbered?: boolean;
  scoring?: ScoreRule;
  type: TemplateNodeType;
};

export type TextNode = TemplateNodeBase & {
  rules: {
    language?: TemplateLanguage;
    maxLength?: number;
    rich: boolean;
  };
  type: 'text';
};

export type MediaNode = TemplateNodeBase & {
  rules: {
    maxPlays?: number;
    mediaKind: 'audio' | 'image' | 'video';
    required: boolean;
  };
  type: 'media';
};

export type PassageNode = {
  /** 文内空；marker 对应正文 [[n]]；模板正文可在 content.text */
  blanks: BlankNode[];
  /** 可选：内嵌共享词库（也可使用独立 pool 节点 + poolRef） */
  poolId?: string;
  rules: {
    /** 固定空数；与 blankCountRange 二选一 */
    blankCount?: number;
    blankCountRange?: { max: number; min: number };
    /** 新建空时的默认绑定 */
    defaultBinding: BlankBinding;
    defaultOptionCount: number;
  };
  type: 'passage';
} & TemplateNodeBase;

export type BlankNode = {
  rules: {
    binding: BlankBinding;
    index: number;
    optionCount?: number;
    /** shared_pool 时指向 pool 节点 id */
    poolRef?: string;
    width?: Length;
  };
  type: 'blank';
} & TemplateNodeBase;

export type PoolNode = TemplateNodeBase & {
  rules: {
    distractorCount?: number;
    reuse: 'once' | 'repeatable';
    size: number;
  };
  type: 'pool';
};

export type ChoiceNode = TemplateNodeBase & {
  rules: {
    mode: 'multi' | 'single' | 'true_false';
    optionCount: number;
    shuffle?: boolean;
  };
  type: 'choice';
};

export type MatchNode = TemplateNodeBase & {
  rules: {
    leftWidth?: Length;
    pairCount: number;
    rightWidth?: Length;
  };
  type: 'match';
};

export type OrderNode = TemplateNodeBase & {
  rules: { itemCount: number };
  type: 'order';
};

export type ClassifyNode = TemplateNodeBase & {
  rules: { binCount: number; itemCount: number };
  type: 'classify';
};

export type InputNode = TemplateNodeBase & {
  rules: {
    inputKind: 'long' | 'short';
    maxLength: number;
    rows?: number;
  };
  type: 'input';
};

export type NumberNode = TemplateNodeBase & {
  rules: {
    precision?: number;
    tolerance: number;
    unit?: string;
  };
  type: 'number';
};

export type FormulaNode = TemplateNodeBase & {
  rules: { engine: 'latex' };
  type: 'formula';
};

export type CodeNode = TemplateNodeBase & {
  rules: {
    languages: string[];
    timeLimitSec?: number;
  };
  type: 'code';
};

export type DrawNode = TemplateNodeBase & {
  rules: {
    canvasHeight: number;
    canvasWidth: number;
  };
  type: 'draw';
};

export type HotspotNode = TemplateNodeBase & {
  rules: {
    hotspotCountRange?: { max: number; min: number };
  };
  type: 'hotspot';
};

export type RecordNode = TemplateNodeBase & {
  rules: {
    maxSeconds: number;
    minSeconds?: number;
  };
  type: 'record';
};

export type TableNode = {
  rules: {
    cols: number;
    /** 可作答单元格 [row, col][]；空表示全部 */
    editableCells?: Array<[number, number]>;
    rows: number;
  };
  type: 'table';
} & TemplateNodeBase;

export type GroupNode = TemplateNodeBase & {
  children: TemplateNode[];
  rules: {
    childCount?: number;
    childCountRange?: { max: number; min: number };
    numberingOverride?: Partial<TemplateNumbering>;
  };
  type: 'group';
};

export type DividerNode = TemplateNodeBase & {
  rules: Record<string, never>;
  type: 'divider';
};

export type SpacerNode = TemplateNodeBase & {
  rules: { height: Length };
  type: 'spacer';
};

export type TemplateNode =
  | BlankNode
  | ChoiceNode
  | ClassifyNode
  | CodeNode
  | DividerNode
  | DrawNode
  | FormulaNode
  | GroupNode
  | HotspotNode
  | InputNode
  | MatchNode
  | MediaNode
  | NumberNode
  | OrderNode
  | PassageNode
  | PoolNode
  | RecordNode
  | SpacerNode
  | TableNode
  | TextNode;

// ─── Document ─────────────────────────────────────────────

export type TemplateDocument = {
  meta: TemplateMeta;
  nodes: TemplateNode[];
  /** template：只编规则；question：含 content */
  role: 'question' | 'template';
  style: TemplateStyle;
  version: 3;
};

// ─── 默认工厂 ─────────────────────────────────────────────

export function createDefaultMeta(
  partial?: Partial<TemplateMeta>,
): TemplateMeta {
  return {
    title: '',
    language: 'zh-CN',
    direction: 'ltr',
    numbering: {
      scheme: 'arabic',
      start: 1,
      step: 1,
      scope: 'document',
      prefix: '',
      suffix: '.',
    },
    layout: {
      columns: 1,
      pageWidth: L(210, 'mm'),
      margin: boxMm(15),
      gap: L(12, 'px'),
    },
    defaultScore: 2,
    defaultJudge: 'auto',
    ...partial,
  };
}

export function createDefaultStyle(
  partial?: Partial<TemplateStyle>,
): TemplateStyle {
  const print = {
    fontFamily: '"SimSun", "Songti SC", "Times New Roman", serif',
    bodyFontSize: L(12, 'pt'),
    headingFontSize: L(14, 'pt'),
    lineHeight: 1.85,
    blankMark: 'underline' as BlankMarkStyle,
    blankMinWidth: L(24, 'mm'),
    optionLayout: 'vertical' as const,
    optionMarker: 'letter' as OptionMarkerStyle,
    ...partial?.print,
  };
  return {
    fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
    bodyFontSize: L(16, 'px'),
    headingFontSize: L(18, 'px'),
    lineHeight: 1.75,
    blankChipMinWidth: L(28, 'px'),
    blankMark: 'brackets',
    optionGap: L(8, 'px'),
    optionLayout: 'vertical',
    optionMarker: 'circle',
    ...partial,
    print,
  };
}

/** 兼容旧存档缺字段 */
export function ensureTemplateStyle(
  style?: null | Partial<TemplateStyle>,
): TemplateStyle {
  return createDefaultStyle(style || undefined);
}

/** 按机考 / 卷面解析最终呈现 */
export function resolveSurfaceStyle(
  style: TemplateStyle,
  surface: 'print' | 'screen',
) {
  const s = ensureTemplateStyle(style);
  if (surface === 'screen') {
    return {
      fontFamily: s.fontFamily,
      bodyFontSize: s.bodyFontSize,
      headingFontSize: s.headingFontSize,
      lineHeight: s.lineHeight,
      blankMark: s.blankMark,
      blankMinWidth: s.blankChipMinWidth,
      optionLayout: s.optionLayout,
      optionGap: s.optionGap,
      optionMarker: s.optionMarker || 'circle',
    };
  }
  return {
    fontFamily: s.print.fontFamily || s.fontFamily,
    bodyFontSize: s.print.bodyFontSize || s.bodyFontSize,
    headingFontSize: s.print.headingFontSize || s.headingFontSize,
    lineHeight: s.print.lineHeight ?? s.lineHeight,
    blankMark: s.print.blankMark || s.blankMark,
    blankMinWidth: s.print.blankMinWidth || s.blankChipMinWidth,
    optionLayout: s.print.optionLayout || s.optionLayout,
    optionGap: s.optionGap,
    optionMarker: s.print.optionMarker || 'letter',
  };
}

export function createEmptyTemplateDocument(): TemplateDocument {
  return {
    version: 3,
    role: 'template',
    meta: createDefaultMeta(),
    style: createDefaultStyle(),
    nodes: [],
  };
}

function baseNode(
  type: TemplateNodeType,
  frame?: Partial<Frame>,
): Pick<TemplateNodeBase, 'frame' | 'id' | 'numbered' | 'type'> {
  return {
    id: uid('tn'),
    type,
    numbered: type !== 'blank' && type !== 'pool' && type !== 'spacer',
    frame: defaultFrame(frame),
  };
}

export function createTextNode(): TextNode {
  return {
    ...baseNode('text'),
    type: 'text',
    label: '文本',
    rules: { rich: true },
    content: { text: { html: '', plain: '' } },
  };
}

export function createMediaNode(
  mediaKind: MediaNode['rules']['mediaKind'] = 'image',
): MediaNode {
  let label = '视频';
  if (mediaKind === 'image') label = '图片';
  else if (mediaKind === 'audio') label = '音频';
  return {
    ...baseNode('media', {
      placement: 'block',
      width: L(60, '%'),
      height: 'auto',
      align: 'center',
      aspectLock: true,
    }),
    type: 'media',
    label,
    rules: {
      mediaKind,
      required: true,
      maxPlays: mediaKind === 'audio' || mediaKind === 'video' ? 2 : undefined,
    },
    content: { media: { src: '', alt: '' } },
  };
}

export function createBlankRules(
  index: number,
  binding: BlankBinding,
  optionCount = 4,
  poolRef?: string,
): BlankNode['rules'] {
  return {
    index,
    binding,
    optionCount: binding === 'local_choice' ? optionCount : undefined,
    poolRef: binding === 'shared_pool' ? poolRef : undefined,
    width: L(48, 'px'),
  };
}

export function createBlankNode(
  index: number,
  binding: BlankBinding = 'local_choice',
  optionCount = 4,
  poolRef?: string,
): BlankNode {
  return {
    ...baseNode('blank', { placement: 'inline', width: L(48, 'px') }),
    type: 'blank',
    numbered: false,
    label: `空${index}`,
    rules: createBlankRules(index, binding, optionCount, poolRef),
    scoring: { score: 1, judgeMode: 'auto', partial: 'per_blank' },
    content: {},
  };
}

export function createPoolNode(size = 15): PoolNode {
  return {
    ...baseNode('pool', { placement: 'block', width: L(100, '%') }),
    type: 'pool',
    numbered: false,
    label: '共享词库',
    rules: { size, reuse: 'once', distractorCount: Math.max(0, size - 10) },
    content: { pool: { items: [] } },
  };
}

export function createPassageNode(
  binding: BlankBinding = 'local_choice',
  blankCount = 10,
): PassageNode {
  const blanks = Array.from({ length: blankCount }, (_, i) =>
    createBlankNode(i + 1, binding, 4),
  );
  return {
    ...baseNode('passage'),
    type: 'passage',
    label: '挖空文',
    numbered: true,
    rules: {
      blankCount,
      defaultBinding: binding,
      defaultOptionCount: 4,
    },
    blanks,
    content: { text: { plain: '', html: '' } },
    scoring: { score: blankCount, judgeMode: 'auto', partial: 'per_blank' },
  };
}

/** 调整挖空文空数，保留已有空的 binding */
export function setPassageBlankCountOnNode(
  passage: PassageNode,
  count: number,
  poolId?: string,
) {
  const n = Math.max(1, Math.min(50, Math.floor(count) || 1));
  const binding = passage.rules.defaultBinding;
  const optionCount = passage.rules.defaultOptionCount || 4;
  const previous = passage.blanks || [];
  passage.rules.blankCount = n;
  passage.blanks = Array.from({ length: n }, (_, index) => {
    const old = previous[index];
    if (old) {
      old.rules.index = index + 1;
      old.label = `空${index + 1}`;
      return old;
    }
    return createBlankNode(
      index + 1,
      binding,
      optionCount,
      binding === 'shared_pool' ? poolId || passage.poolId : undefined,
    );
  });
  if (passage.scoring) {
    passage.scoring.score = n * (passage.blanks[0]?.scoring?.score ?? 1);
  }
  return passage;
}

export function applyPassageBinding(
  passage: PassageNode,
  binding: BlankBinding,
  poolId?: string,
) {
  passage.rules.defaultBinding = binding;
  for (const blank of passage.blanks) {
    blank.rules.binding = binding;
    blank.rules.optionCount =
      binding === 'local_choice'
        ? passage.rules.defaultOptionCount || 4
        : undefined;
    blank.rules.poolRef =
      binding === 'shared_pool' ? poolId || passage.poolId : undefined;
  }
  return passage;
}

export function createChoiceNode(
  mode: ChoiceNode['rules']['mode'] = 'single',
  optionCount = 4,
): ChoiceNode {
  let label = '单选';
  if (mode === 'true_false') label = '判断';
  else if (mode === 'multi') label = '多选';
  return {
    ...baseNode('choice'),
    type: 'choice',
    label,
    numbered: true,
    rules: {
      mode,
      optionCount: mode === 'true_false' ? 2 : optionCount,
      shuffle: false,
    },
    scoring: { score: 2, judgeMode: 'auto', partial: 'all_or_nothing' },
    content: { text: { plain: '' }, options: [], answer: [] },
  };
}

export function createGroupNode(title = '小题组'): GroupNode {
  return {
    ...baseNode('group'),
    type: 'group',
    label: title,
    numbered: true,
    rules: { childCount: 3 },
    children: [],
    content: {},
  };
}

export function createInputNode(
  inputKind: InputNode['rules']['inputKind'] = 'long',
  maxLength = 800,
): InputNode {
  return {
    ...baseNode('input'),
    type: 'input',
    label: inputKind === 'long' ? '书写作答' : '短答',
    numbered: true,
    rules: {
      inputKind,
      maxLength,
      rows: inputKind === 'long' ? 6 : 2,
    },
    scoring: { score: 10, judgeMode: 'manual', partial: 'all_or_nothing' },
    content: {},
  };
}

export function createCodeNode(
  languages: string[] = ['python', 'c', 'java'],
): CodeNode {
  return {
    ...baseNode('code'),
    type: 'code',
    label: '代码作答',
    numbered: true,
    rules: { languages, timeLimitSec: undefined },
    scoring: { score: 10, judgeMode: 'manual' },
    content: {},
  };
}

export function createRecordNode(maxSeconds = 120): RecordNode {
  return {
    ...baseNode('record'),
    type: 'record',
    label: '录音作答',
    numbered: true,
    rules: { maxSeconds, minSeconds: 5 },
    scoring: { score: 5, judgeMode: 'manual' },
    content: {},
  };
}

export function createDrawNode(
  canvasWidth = 640,
  canvasHeight = 360,
): DrawNode {
  return {
    ...baseNode('draw'),
    type: 'draw',
    label: '绘图作答',
    numbered: true,
    rules: { canvasWidth, canvasHeight },
    scoring: { score: 5, judgeMode: 'manual' },
    content: {},
  };
}

export function createMatchNode(pairCount = 5): MatchNode {
  return {
    ...baseNode('match'),
    type: 'match',
    label: '匹配',
    numbered: true,
    rules: { pairCount },
    scoring: { score: 5, judgeMode: 'auto', partial: 'per_blank' },
    content: {},
  };
}

/** 格式化题号：依据 meta.numbering */
export function formatNumbering(
  index: number,
  numbering: TemplateNumbering,
): string {
  const n =
    numbering.start + Math.max(0, index) * Math.max(1, numbering.step || 1);
  let core: string;
  switch (numbering.scheme) {
    case 'chinese': {
      const map = '零一二三四五六七八九十';
      core = n <= 10 ? map.charAt(n) || String(n) : String(n);
      break;
    }
    case 'letter': {
      core = String.fromCodePoint(64 + ((n - 1) % 26) + 1);
      break;
    }
    case 'none': {
      return '';
    }
    case 'paren': {
      core = `(${n})`;
      break;
    }
    default: {
      core = String(n);
    }
  }
  if (numbering.scheme === 'paren') {
    return `${numbering.prefix}${core}${numbering.suffix === '.' ? '' : numbering.suffix}`;
  }
  return `${numbering.prefix}${core}${numbering.suffix}`;
}

export function lengthToCss(length: 'auto' | Length | undefined): string {
  if (!length || length === 'auto') return 'auto';
  return `${length.value}${length.unit}`;
}

export function countScoredNodes(nodes: TemplateNode[]): number {
  let count = 0;
  const walk = (list: TemplateNode[]) => {
    for (const node of list) {
      if (node.scoring || node.type === 'blank' || node.type === 'choice') {
        count += 1;
      }
      if (node.type === 'passage') count += node.blanks.length;
      if (node.type === 'group') walk(node.children);
    }
  };
  walk(nodes);
  return count;
}
