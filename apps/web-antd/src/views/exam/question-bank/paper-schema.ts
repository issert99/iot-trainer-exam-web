import type { BuilderComponent, JudgeMode } from './mock';
import type { PassageProps, SlotBinding } from './passage-model';

import { uid } from './mock';
import {
  applyBindingToAll,
  createDefaultPassageProps,
  fillPassageDemo,
  passageToClozeConfig,
  setDefaultOptionCount,
  setPassageBlankCount,
  syncPassageSlots,
} from './passage-model';
import {
  createEmptyTemplateDefinition,
  materializeTemplate,
} from './template-schema';

export type {
  PaperSlot,
  PassagePool,
  PassageProps,
  SlotBinding,
} from './passage-model';
export {
  addPassageBlank,
  applyBindingToAll,
  bindingToBlankType,
  clozeMarkerIndexes,
  clozeParts,
  createDefaultPassageProps,
  createDefaultPool,
  fillPassageDemo,
  insertBlankAtEnd,
  passageDisplayText,
  passageToClozeConfig,
  removeLastPassageBlank,
  setDefaultOptionCount,
  setPassageBlankCount,
  setSlotBinding,
  SLOT_BINDING_OPTIONS,
  syncPassageSlots,
} from './passage-model';

/** 卷面自由拼装：纸上物件，无题型天花板 */

export type PaperBlockKind = 'content' | 'response' | 'structure';

export type PaperBlockType =
  | 'audio_record'
  | 'choice'
  | 'classify'
  | 'cloze'
  | 'code'
  | 'drawing'
  | 'formula'
  | 'hotspot'
  | 'listening'
  | 'matching'
  | 'media'
  | 'multi_choice'
  | 'number'
  | 'passage'
  | 'section'
  | 'sorting'
  | 'stem'
  | 'table'
  | 'text_long'
  | 'text_short'
  | 'tip'
  /** @deprecated 旧数据，解码时迁为 passage */
  | 'true_false';

export type PaperScoring = {
  judgeMode: JudgeMode;
  score: number;
};

export type PaperBlock = {
  children?: PaperBlock[];
  id: string;
  kind: PaperBlockKind;
  props: Record<string, any>;
  scoring?: PaperScoring;
  type: PaperBlockType;
};

export type PaperDocument = {
  /** template：只编骨架与规则；question：填入真实内容 */
  blocks: PaperBlock[];
  role: 'question' | 'template';
  version: 2;
};

export type PaperPaletteItem = {
  hint: string;
  icon: string;
  kind: PaperBlockKind;
  label: string;
  type: PaperBlockType;
};

export type PaperPreset = {
  build: () => PaperBlock[];
  hint: string;
  id: string;
  label: string;
};

export const PAPER_PALETTE: PaperPaletteItem[] = [
  {
    type: 'stem',
    kind: 'content',
    label: '文本',
    hint: '题干 / 说明',
    icon: 'lucide:file-text',
  },
  {
    type: 'passage',
    kind: 'response',
    label: '挖空文',
    hint: '文内插空，每空可自选怎么答',
    icon: 'lucide:text-select',
  },
  {
    type: 'tip',
    kind: 'content',
    label: '提示',
    hint: '考试说明',
    icon: 'lucide:info',
  },
  {
    type: 'media',
    kind: 'content',
    label: '图片/视频',
    hint: '材料位',
    icon: 'lucide:image',
  },
  {
    type: 'listening',
    kind: 'content',
    label: '音频',
    hint: '可限次播放',
    icon: 'lucide:headphones',
  },
  {
    type: 'choice',
    kind: 'response',
    label: '单选',
    hint: '独立选择题',
    icon: 'lucide:circle-dot',
  },
  {
    type: 'multi_choice',
    kind: 'response',
    label: '多选',
    hint: '多选 / 不定项',
    icon: 'lucide:check-square',
  },
  {
    type: 'true_false',
    kind: 'response',
    label: '判断',
    hint: '正确 / 错误',
    icon: 'lucide:toggle-left',
  },
  {
    type: 'text_short',
    kind: 'response',
    label: '短答',
    hint: '独立短答区',
    icon: 'lucide:text-cursor-input',
  },
  {
    type: 'text_long',
    kind: 'response',
    label: '写作/长答',
    hint: '长文本作答区',
    icon: 'lucide:align-left',
  },
  {
    type: 'number',
    kind: 'response',
    label: '数值',
    hint: '数值 + 单位',
    icon: 'lucide:hash',
  },
  {
    type: 'formula',
    kind: 'response',
    label: '公式',
    hint: 'LaTeX',
    icon: 'lucide:sigma',
  },
  {
    type: 'code',
    kind: 'response',
    label: '代码',
    hint: '编程 / SQL',
    icon: 'lucide:code-2',
  },
  {
    type: 'matching',
    kind: 'response',
    label: '匹配',
    hint: '左右匹配 / 连线',
    icon: 'lucide:git-compare',
  },
  {
    type: 'classify',
    kind: 'response',
    label: '分类',
    hint: '拖入分类筐',
    icon: 'lucide:layout-grid',
  },
  {
    type: 'sorting',
    kind: 'response',
    label: '排序',
    hint: '步骤排序',
    icon: 'lucide:list-ordered',
  },
  {
    type: 'table',
    kind: 'response',
    label: '表格填写',
    hint: '单元格作答',
    icon: 'lucide:table',
  },
  {
    type: 'drawing',
    kind: 'response',
    label: '绘图',
    hint: '画图 / 连线',
    icon: 'lucide:pen-tool',
  },
  {
    type: 'hotspot',
    kind: 'response',
    label: '图片标注',
    hint: '热点 / 读图',
    icon: 'lucide:crosshair',
  },
  {
    type: 'audio_record',
    kind: 'response',
    label: '录音',
    hint: '口语作答区',
    icon: 'lucide:mic',
  },
  {
    type: 'section',
    kind: 'structure',
    label: '小题组',
    hint: '下面挂多道小题',
    icon: 'lucide:layers',
  },
];

export const PAPER_KIND_LABEL: Record<PaperBlockKind, string> = {
  content: '材料',
  response: '作答',
  structure: '结构',
};

function defaultOptions() {
  return [
    { key: 'A', text: '选项 A' },
    { key: 'B', text: '选项 B' },
    { key: 'C', text: '选项 C' },
    { key: 'D', text: '选项 D' },
  ];
}

function migrateLegacyClozeProps(raw: Record<string, any>): PassageProps {
  const interaction = String(
    raw.blankInteraction || raw.blankType || 'shared_options',
  );
  let binding: SlotBinding = 'local_choice';
  switch (interaction) {
    case 'choice': {
      binding = 'local_choice';
      break;
    }
    case 'formula': {
      binding = 'formula';
      break;
    }
    case 'number': {
      binding = 'number';
      break;
    }
    case 'shared_options': {
      binding = 'shared_pool';
      break;
    }
    case 'text_short': {
      binding = 'free_text';
      break;
    }
  }
  const count = Math.max(1, Number(raw.blankCount || 10));
  const props = createDefaultPassageProps(binding, count);
  props.title = raw.title || '挖空文';
  props.text = raw.passage || raw.text || '';
  if (raw.bankSize && props.pool) props.pool.size = Number(raw.bankSize);
  if (raw.reuse && props.pool) props.pool.reuse = raw.reuse;
  if (Array.isArray(raw.options) && props.pool) props.pool.items = raw.options;
  syncPassageSlots(props);
  return props;
}

export function createPaperBlock(type: PaperBlockType): PaperBlock {
  const id = uid('pb');
  const resolved = type === 'cloze' ? 'passage' : type;
  switch (resolved) {
    case 'audio_record': {
      return {
        id,
        kind: 'response',
        type: 'audio_record',
        props: {
          title: '口语录音',
          tip: '',
          maxSeconds: 120,
        },
        scoring: { score: 5, judgeMode: 'manual' },
      };
    }
    case 'choice': {
      return {
        id,
        kind: 'response',
        type: 'choice',
        props: {
          title: '单选',
          optionCount: 4,
          options: [
            { key: 'A', text: '' },
            { key: 'B', text: '' },
            { key: 'C', text: '' },
            { key: 'D', text: '' },
          ],
          answer: [],
        },
        scoring: { score: 2, judgeMode: 'auto' },
      };
    }
    case 'classify': {
      return {
        id,
        kind: 'response',
        type: 'classify',
        props: {
          title: '分类',
          binCount: 2,
          itemCount: 4,
          bins: [
            { id: 'B1', title: '' },
            { id: 'B2', title: '' },
          ],
          items: [],
        },
        scoring: { score: 4, judgeMode: 'auto' },
      };
    }
    case 'code': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '代码作答',
          language: 'python',
          starterCode: '',
          languages: ['python', 'c', 'cpp', 'java', 'javascript', 'sql'],
        },
        scoring: { score: 10, judgeMode: 'manual' },
      };
    }
    case 'drawing': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '绘图作答',
          mode: 'draw',
          width: 1280,
          height: 720,
          prompt: '',
        },
        scoring: { score: 5, judgeMode: 'manual' },
      };
    }
    case 'formula': {
      return {
        id,
        kind: 'response',
        type,
        props: { title: '公式作答', latex: '' },
        scoring: { score: 3, judgeMode: 'manual' },
      };
    }
    case 'hotspot': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '图片标注',
          imageUrl: '',
          prompt: '',
          hotspots: [],
        },
        scoring: { score: 4, judgeMode: 'manual' },
      };
    }
    case 'listening': {
      return {
        id,
        kind: 'content',
        type,
        props: {
          title: '音频材料',
          mediaType: 'audio',
          url: '',
          maxPlays: 2,
        },
      };
    }
    case 'matching': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '匹配',
          pairCount: 4,
          left: [],
          right: [],
          answer: {},
        },
        scoring: { score: 4, judgeMode: 'auto' },
      };
    }
    case 'media': {
      return {
        id,
        kind: 'content',
        type,
        props: {
          mediaType: 'image',
          title: '图片/视频材料',
          url: '',
          maxPlays: 2,
        },
      };
    }
    case 'multi_choice': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '多选',
          optionCount: 4,
          options: [
            { key: 'A', text: '' },
            { key: 'B', text: '' },
            { key: 'C', text: '' },
            { key: 'D', text: '' },
          ],
          answer: [],
        },
        scoring: { score: 2, judgeMode: 'auto' },
      };
    }
    case 'number': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '数值作答',
          unit: '',
          tolerance: 0,
          answer: undefined as number | undefined,
        },
        scoring: { score: 2, judgeMode: 'auto' },
      };
    }
    case 'passage': {
      return {
        id,
        kind: 'response',
        type: 'passage',
        props: createDefaultPassageProps('local_choice', 10),
        scoring: { score: 10, judgeMode: 'auto' },
      };
    }
    case 'section': {
      return {
        id,
        kind: 'structure',
        type,
        props: { title: '子题组', description: '' },
        children: [],
      };
    }
    case 'sorting': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '排序',
          itemCount: 4,
          items: [],
        },
        scoring: { score: 3, judgeMode: 'auto' },
      };
    }
    case 'stem': {
      return {
        id,
        kind: 'content',
        type,
        props: { html: '', title: '材料/题干' },
      };
    }
    case 'table': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '表格填写',
          rows: 3,
          cols: 3,
          headers: [],
        },
        scoring: { score: 4, judgeMode: 'manual' },
      };
    }
    case 'text_long': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '写作/长答',
          placeholder: '',
          maxLength: 2000,
        },
        scoring: { score: 15, judgeMode: 'manual' },
      };
    }
    case 'text_short': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '短答',
          placeholder: '',
          maxLength: 200,
        },
        scoring: { score: 2, judgeMode: 'manual' },
      };
    }
    case 'tip': {
      return {
        id,
        kind: 'content',
        type,
        props: { html: '', title: '提示' },
      };
    }
    case 'true_false': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '判断',
          options: [
            { key: 'T', text: '正确' },
            { key: 'F', text: '错误' },
          ],
          answer: [],
        },
        scoring: { score: 1, judgeMode: 'auto' },
      };
    }
  }
}

export function createEmptyPaperDocument(): PaperDocument {
  return {
    version: 2,
    role: 'template',
    blocks: [],
  };
}

/** 结构捷径：只铺空壳，可继续改 */
export const PAPER_PRESETS: PaperPreset[] = [
  {
    id: 'blank_paper',
    label: '空白卷纸',
    hint: '从零自己拼',
    build: () => [],
  },
  {
    id: 'local_cloze',
    label: '挖空 · 每空选项',
    hint: '传统完形：每空独立选项',
    build: () => {
      const block = createPaperBlock('passage');
      applyBindingToAll(block.props as PassageProps, 'local_choice');
      setPassageBlankCount(block.props as PassageProps, 20);
      setDefaultOptionCount(block.props as PassageProps, 4);
      block.props.title = '挖空文（每空选项）';
      return [block];
    },
  },
  {
    id: 'banked_cloze',
    label: '挖空 · 共享词库',
    hint: '选词填空：空挂同一词库',
    build: () => {
      const block = createPaperBlock('passage');
      applyBindingToAll(block.props as PassageProps, 'shared_pool');
      setPassageBlankCount(block.props as PassageProps, 10);
      if (block.props.pool) block.props.pool.size = 15;
      block.props.title = '挖空文（共享词库）';
      return [block];
    },
  },
  {
    id: 'single_choice',
    label: '文本 + 单选',
    hint: '材料 + 一道单选',
    build: () => [createPaperBlock('stem'), createPaperBlock('choice')],
  },
  {
    id: 'audio_objective',
    label: '音频 + 小题组',
    hint: '听力材料下挂客观题',
    build: () => {
      const section = createPaperBlock('section');
      section.props.title = '根据音频作答';
      section.children = [
        createPaperBlock('choice'),
        createPaperBlock('choice'),
        createPaperBlock('choice'),
      ];
      return [createPaperBlock('listening'), section];
    },
  },
  {
    id: 'passage_objective',
    label: '材料 + 小题组',
    hint: '阅读理解式',
    build: () => {
      const section = createPaperBlock('section');
      section.props.title = '根据材料作答';
      section.children = [
        createPaperBlock('choice'),
        createPaperBlock('choice'),
        createPaperBlock('choice'),
      ];
      return [createPaperBlock('stem'), section];
    },
  },
  {
    id: 'matching_block',
    label: '匹配',
    hint: '说明 + 匹配',
    build: () => [createPaperBlock('stem'), createPaperBlock('matching')],
  },
  {
    id: 'writing_block',
    label: '写作/长答',
    hint: '材料 + 长文本',
    build: () => [createPaperBlock('stem'), createPaperBlock('text_long')],
  },
  {
    id: 'case_series',
    label: '案例串题',
    hint: '材料 + 多问',
    build: () => {
      const section = createPaperBlock('section');
      section.props.title = '根据案例作答';
      section.children = [
        createPaperBlock('choice'),
        createPaperBlock('choice'),
        createPaperBlock('text_short'),
      ];
      return [createPaperBlock('stem'), section];
    },
  },
  {
    id: 'coding',
    label: '编程作答',
    hint: '材料 + 代码',
    build: () => [createPaperBlock('stem'), createPaperBlock('code')],
  },
];

/** @deprecated 兼容旧调用 */
export function clozeDisplayCount(props: Record<string, any>) {
  if (Array.isArray(props.slots) && props.slots.length > 0) {
    return props.slots.length;
  }
  if (props.blankCountMode === 'range') {
    return Math.max(1, Number(props.blankMin || props.blankCount || 1));
  }
  return Math.max(1, Number(props.blankCount || props.slots?.length || 1));
}

/** 按 optionCount 同步空壳选项（模板侧不写选项文案） */
export function syncChoiceOptionShells(props: Record<string, any>) {
  const count = Math.max(2, Number(props.optionCount || 4));
  props.optionCount = count;
  const previous = Array.isArray(props.options) ? props.options : [];
  props.options = Array.from({ length: count }, (_, index) => ({
    key: previous[index]?.key || String.fromCodePoint(65 + index),
    text: previous[index]?.text || '',
  }));
  return props;
}

/** 用占位假数据生成预览，不写回模板 */
export function fillDemoContent(document: PaperDocument): PaperDocument {
  // eslint-disable-next-line unicorn/prefer-structured-clone
  const cloned = JSON.parse(JSON.stringify(document)) as PaperDocument;
  cloned.role = 'question';

  const fill = (block: PaperBlock) => {
    switch (block.type) {
      case 'audio_record': {
        block.props.tip = block.props.tip || '（示例）请开始录音作答';
        break;
      }
      case 'choice':
      case 'multi_choice': {
        const count = Math.max(
          2,
          Number(block.props.optionCount || block.props.options?.length || 4),
        );
        block.props.options = Array.from({ length: count }, (_, index) => ({
          key: String.fromCodePoint(65 + index),
          text:
            block.props.options?.[index]?.text ||
            `示例选项 ${String.fromCodePoint(65 + index)}`,
        }));
        break;
      }
      case 'classify': {
        const binCount = Math.max(2, Number(block.props.binCount || 2));
        const itemCount = Math.max(3, Number(block.props.itemCount || 4));
        block.props.bins = Array.from({ length: binCount }, (_, index) => ({
          id: `B${index + 1}`,
          title: `类别 ${index + 1}`,
        }));
        block.props.items = Array.from(
          { length: itemCount },
          (_, index) => `条目 ${index + 1}`,
        );
        break;
      }
      case 'cloze':
      case 'passage': {
        const props =
          block.type === 'cloze' || !block.props.slots
            ? migrateLegacyClozeProps(block.props)
            : (block.props as PassageProps);
        const filled = fillPassageDemo(props);
        Object.assign(block.props, filled);
        block.type = 'passage';
        break;
      }
      case 'code': {
        block.props.starterCode = block.props.starterCode || '# 示例起始代码\n';
        break;
      }
      case 'hotspot': {
        block.props.prompt = block.props.prompt || '（示例）请标注图中位置';
        break;
      }
      case 'listening':
      case 'media': {
        if (!block.props.url) {
          block.props.url = '';
        }
        break;
      }
      case 'matching': {
        const count = Math.max(2, Number(block.props.pairCount || 3));
        block.props.left = Array.from({ length: count }, (_, index) => ({
          id: `L${index + 1}`,
          text: `左项 ${index + 1}`,
        }));
        block.props.right = Array.from({ length: count }, (_, index) => ({
          id: `R${index + 1}`,
          text: `右项 ${index + 1}`,
        }));
        break;
      }
      case 'sorting': {
        const count = Math.max(3, Number(block.props.itemCount || 4));
        block.props.items = Array.from(
          { length: count },
          (_, index) => `步骤 ${index + 1}`,
        );
        break;
      }
      case 'stem':
      case 'tip': {
        if (!block.props.html) {
          block.props.html = `<p>（示例）${paperBlockLabel(block)}内容，创建题目时由出题人填写。</p>`;
        }
        break;
      }
      case 'text_long':
      case 'text_short': {
        block.props.placeholder =
          block.props.placeholder || '（示例）请在此作答';
        break;
      }
      default: {
        break;
      }
    }
    block.children?.forEach((child) => fill(child));
  };

  cloned.blocks.forEach((block) => fill(block));
  return cloned;
}

export function paperForDemoPreview(document: PaperDocument) {
  return paperToBuilderComponents(fillDemoContent(document));
}

export function clonePaperBlock(block: PaperBlock): PaperBlock {
  // eslint-disable-next-line unicorn/prefer-structured-clone
  const cloned = JSON.parse(JSON.stringify(block)) as PaperBlock;
  const reId = (node: PaperBlock) => {
    node.id = uid('pb');
    node.children?.forEach((child) => reId(child));
  };
  reId(cloned);
  return cloned;
}

export function findPaperBlock(
  blocks: PaperBlock[],
  id: string,
): PaperBlock | undefined {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.children?.length) {
      const found = findPaperBlock(block.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function removePaperBlock(blocks: PaperBlock[], id: string): boolean {
  const index = blocks.findIndex((item) => item.id === id);
  if (index !== -1) {
    blocks.splice(index, 1);
    return true;
  }
  for (const block of blocks) {
    if (block.children && removePaperBlock(block.children, id)) return true;
  }
  return false;
}

export function countResponseBlocks(blocks: PaperBlock[]): number {
  let count = 0;
  const walk = (list: PaperBlock[]) => {
    for (const block of list) {
      if (block.kind === 'response') count += 1;
      if (block.children?.length) walk(block.children);
    }
  };
  walk(blocks);
  return count;
}

export function paperBlockLabel(block: PaperBlock): string {
  const fromProps = String(block.props.title || '').trim();
  if (fromProps) return fromProps;
  return (
    PAPER_PALETTE.find((item) => item.type === block.type)?.label || block.type
  );
}

function mapBlockToBuilder(block: PaperBlock): BuilderComponent {
  const score = block.scoring?.score ?? 0;
  const judgeMode = block.scoring?.judgeMode ?? 'none';
  const label = paperBlockLabel(block);

  switch (block.type) {
    case 'audio_record': {
      return {
        id: block.id,
        type: 'audio_record',
        label,
        score,
        judgeMode,
        config: {
          tip: block.props.tip || '',
          maxSeconds: block.props.maxSeconds ?? 120,
        },
      };
    }
    case 'choice':
    case 'multi_choice':
    case 'true_false': {
      return {
        id: block.id,
        type: 'option_group',
        label,
        score,
        judgeMode,
        config: {
          mode: block.type === 'multi_choice' ? 'multi' : 'single',
          options: block.props.options || defaultOptions(),
          answer: block.props.answer || [],
        },
      };
    }
    case 'classify': {
      return {
        id: block.id,
        type: 'sorting',
        label,
        score,
        judgeMode,
        config: {
          mode: 'classify',
          bins: block.props.bins || [],
          items: block.props.items || [],
        },
      };
    }
    case 'cloze':
    case 'passage': {
      const passageProps =
        block.type === 'passage' && Array.isArray(block.props.slots)
          ? (block.props as PassageProps)
          : migrateLegacyClozeProps(block.props);
      return {
        id: block.id,
        type: 'cloze',
        label,
        score,
        judgeMode,
        config: passageToClozeConfig(passageProps),
      };
    }
    case 'code': {
      return {
        id: block.id,
        type: 'code_editor',
        label,
        score,
        judgeMode,
        config: {
          language: block.props.language || 'python',
          starterCode: block.props.starterCode || '',
          languages: block.props.languages,
        },
      };
    }
    case 'drawing': {
      return {
        id: block.id,
        type: 'canvas',
        label,
        score,
        judgeMode,
        config: {
          mode: block.props.mode || 'draw',
          width: block.props.width || 1280,
          height: block.props.height || 720,
          prompt: block.props.prompt || '',
        },
      };
    }
    case 'formula': {
      return {
        id: block.id,
        type: 'formula',
        label,
        score,
        judgeMode,
        config: { latex: block.props.latex || '' },
      };
    }
    case 'hotspot': {
      return {
        id: block.id,
        type: 'image_hotspot',
        label,
        score,
        judgeMode,
        config: {
          imageUrl: block.props.imageUrl || '',
          prompt: block.props.prompt || '',
          hotspots: block.props.hotspots || [],
        },
      };
    }
    case 'listening':
    case 'media': {
      return {
        id: block.id,
        type: 'media_player',
        label,
        score: 0,
        judgeMode: 'none',
        config: {
          mediaType:
            block.type === 'listening'
              ? 'audio'
              : block.props.mediaType || 'image',
          url: block.props.url || '',
          maxPlays: block.props.maxPlays ?? 2,
        },
      };
    }
    case 'matching': {
      return {
        id: block.id,
        type: 'matching',
        label,
        score,
        judgeMode,
        config: {
          left: block.props.left || [],
          right: block.props.right || [],
          answer: block.props.answer || {},
        },
      };
    }
    case 'number': {
      return {
        id: block.id,
        type: 'text_input',
        label,
        score,
        judgeMode,
        config: {
          mode: 'number',
          unit: block.props.unit || '',
          tolerance: block.props.tolerance ?? 0,
          placeholder: '请输入数值',
        },
      };
    }
    case 'section': {
      return {
        id: block.id,
        type: 'group',
        label,
        score: 0,
        judgeMode: 'none',
        config: {
          title: block.props.title || '子题组',
          description: block.props.description || '',
        },
        children: (block.children || []).map((child) =>
          mapBlockToBuilder(child),
        ),
      };
    }
    case 'sorting': {
      return {
        id: block.id,
        type: 'sorting',
        label,
        score,
        judgeMode,
        config: { items: block.props.items || [] },
      };
    }
    case 'stem':
    case 'tip': {
      return {
        id: block.id,
        type: 'rich_stem',
        label,
        score: 0,
        judgeMode: 'none',
        config: {
          html: block.props.html || '',
          allowImage: true,
          allowAttachment: true,
        },
      };
    }
    case 'table': {
      return {
        id: block.id,
        type: 'table_fill',
        label,
        score,
        judgeMode,
        config: {
          rows: block.props.rows || 3,
          cols: block.props.cols || 3,
          headers: block.props.headers || [],
        },
      };
    }
    case 'text_long':
    case 'text_short': {
      return {
        id: block.id,
        type: 'text_input',
        label,
        score,
        judgeMode,
        config: {
          mode: block.type === 'text_long' ? 'long' : 'short',
          placeholder: block.props.placeholder || '请输入答案',
          maxLength: block.props.maxLength || 500,
        },
      };
    }
  }
}

export function paperToBuilderComponents(
  document: PaperDocument,
): BuilderComponent[] {
  return document.blocks.map((block) => mapBlockToBuilder(block));
}

function mapBuilderToBlock(component: BuilderComponent): PaperBlock {
  const scoring =
    component.judgeMode === 'none'
      ? undefined
      : { score: component.score, judgeMode: component.judgeMode };

  switch (component.type) {
    case 'audio_record': {
      return {
        id: component.id,
        kind: 'response',
        type: 'audio_record',
        props: {
          title: component.label,
          tip: component.config.tip || '',
          maxSeconds: component.config.maxSeconds ?? 120,
        },
        scoring,
      };
    }
    case 'canvas': {
      return {
        id: component.id,
        kind: 'response',
        type: 'drawing',
        props: {
          title: component.label,
          mode: component.config.mode || 'draw',
          width: component.config.width || 1280,
          height: component.config.height || 720,
          prompt: component.config.prompt || '',
        },
        scoring,
      };
    }
    case 'cloze': {
      const props = migrateLegacyClozeProps({
        title: component.label,
        passage: component.config.passage || '',
        blankType: component.config.blankType || 'shared_options',
        blankInteraction:
          component.config.blankInteraction ||
          component.config.blankType ||
          'shared_options',
        blankCount: component.config.blankCount || 1,
        bankSize: component.config.bankSize || component.config.poolSize || 15,
        blanks: component.config.blanks || [],
        options: component.config.options || [],
        reuse: component.config.reuse || 'once',
      });
      // 若 blanks 带 per-blank type，尽量还原
      if (Array.isArray(component.config.blanks)) {
        for (const blank of component.config.blanks) {
          const slot = props.slots.find((item) => item.marker === blank.marker);
          if (!slot) continue;
          const t = blank.type || component.config.blankType;
          switch (t) {
            case 'choice': {
              slot.binding = 'local_choice';
              break;
            }
            case 'formula': {
              slot.binding = 'formula';
              break;
            }
            case 'number': {
              slot.binding = 'number';
              break;
            }
            case 'shared_options': {
              slot.binding = 'shared_pool';
              break;
            }
            case 'text_short': {
              slot.binding = 'free_text';
              break;
            }
          }
          if (blank.options) {
            slot.options = blank.options;
            slot.optionCount = blank.options.length;
          }
        }
        syncPassageSlots(props);
      }
      return {
        id: component.id,
        kind: 'response',
        type: 'passage',
        props,
        scoring,
      };
    }
    case 'code_editor': {
      return {
        id: component.id,
        kind: 'response',
        type: 'code',
        props: {
          title: component.label,
          language: component.config.language || 'python',
          starterCode: component.config.starterCode || '',
          languages: component.config.languages,
        },
        scoring,
      };
    }
    case 'formula': {
      return {
        id: component.id,
        kind: 'response',
        type: 'formula',
        props: { title: component.label, latex: component.config.latex || '' },
        scoring,
      };
    }
    case 'group': {
      return {
        id: component.id,
        kind: 'structure',
        type: 'section',
        props: {
          title: component.config.title || component.label || '子题组',
          description: component.config.description || '',
        },
        children: (component.children || []).map((child) =>
          mapBuilderToBlock(child),
        ),
      };
    }
    case 'image_hotspot': {
      return {
        id: component.id,
        kind: 'response',
        type: 'hotspot',
        props: {
          title: component.label,
          imageUrl: component.config.imageUrl || '',
          prompt: component.config.prompt || '',
          hotspots: component.config.hotspots || [],
        },
        scoring,
      };
    }
    case 'matching': {
      return {
        id: component.id,
        kind: 'response',
        type: 'matching',
        props: {
          title: component.label,
          left: component.config.left || [],
          right: component.config.right || [],
          answer: component.config.answer || {},
        },
        scoring,
      };
    }
    case 'media_player': {
      const isAudio = component.config.mediaType === 'audio';
      return {
        id: component.id,
        kind: 'content',
        type: isAudio ? 'listening' : 'media',
        props: {
          title: component.label || (isAudio ? '听力材料' : '媒体材料'),
          mediaType: component.config.mediaType || 'image',
          url: component.config.url || '',
          maxPlays: component.config.maxPlays ?? 2,
        },
      };
    }
    case 'option_group': {
      const mode =
        component.config.mode === 'multi' ? 'multi_choice' : 'choice';
      const options = component.config.options || defaultOptions();
      const isTf =
        options.length === 2 &&
        options.some((item: { text?: string }) => item.text === '正确');
      return {
        id: component.id,
        kind: 'response',
        type: isTf ? 'true_false' : mode,
        props: {
          title: component.label,
          options,
          answer: component.config.answer || [],
        },
        scoring,
      };
    }
    case 'rich_stem': {
      return {
        id: component.id,
        kind: 'content',
        type: 'stem',
        props: {
          title: component.label || '题干',
          html: component.config.html || '',
        },
      };
    }
    case 'sorting': {
      if (component.config.mode === 'classify') {
        return {
          id: component.id,
          kind: 'response',
          type: 'classify',
          props: {
            title: component.label,
            bins: component.config.bins || [],
            items: component.config.items || [],
          },
          scoring,
        };
      }
      return {
        id: component.id,
        kind: 'response',
        type: 'sorting',
        props: {
          title: component.label,
          items: component.config.items || [],
        },
        scoring,
      };
    }
    case 'table_fill': {
      return {
        id: component.id,
        kind: 'response',
        type: 'table',
        props: {
          title: component.label,
          rows: component.config.rows || 3,
          cols: component.config.cols || 3,
          headers: component.config.headers || [],
        },
        scoring,
      };
    }
    case 'text_input': {
      if (component.config.mode === 'number') {
        return {
          id: component.id,
          kind: 'response',
          type: 'number',
          props: {
            title: component.label,
            unit: component.config.unit || '',
            tolerance: component.config.tolerance ?? 0,
          },
          scoring,
        };
      }
      return {
        id: component.id,
        kind: 'response',
        type: component.config.mode === 'long' ? 'text_long' : 'text_short',
        props: {
          title: component.label,
          placeholder: component.config.placeholder || '',
          maxLength: component.config.maxLength || 500,
        },
        scoring,
      };
    }
    default: {
      return {
        id: component.id,
        kind: 'content',
        type: 'tip',
        props: {
          title: component.label || component.type,
          html: `<p>暂未映射的组件：${component.type}</p>`,
        },
      };
    }
  }
}

export function builderComponentsToPaper(
  components: BuilderComponent[],
): PaperDocument {
  const usable = components.filter(
    (item) => item.type !== 'template_definition',
  );
  if (usable.length === 0) return createEmptyPaperDocument();
  return {
    version: 2,
    role: 'template',
    blocks: usable.map((item) => mapBuilderToBlock(item)),
  };
}

export function encodePaperDocument(
  document: PaperDocument,
): BuilderComponent[] {
  return [
    {
      id: 'paper_document',
      type: 'template_definition',
      label: '卷面模板 v2',
      score: 0,
      judgeMode: 'none',
      config: {
        // eslint-disable-next-line unicorn/prefer-structured-clone
        paper: JSON.parse(JSON.stringify(document)) as PaperDocument,
      },
    },
  ];
}

function normalizePaperBlocks(blocks: PaperBlock[]): PaperBlock[] {
  return blocks.map((block) => {
    if (
      block.type === 'cloze' ||
      (block.type === 'passage' && !block.props.slots)
    ) {
      return {
        ...block,
        type: 'passage',
        props: migrateLegacyClozeProps(block.props),
        children: block.children
          ? normalizePaperBlocks(block.children)
          : undefined,
      };
    }
    if (block.children?.length) {
      return {
        ...block,
        children: normalizePaperBlocks(block.children),
      };
    }
    return block;
  });
}

export function decodePaperDocument(raw: unknown): PaperDocument {
  const list = Array.isArray(raw) ? raw : [];
  const stored = list.find(
    (item) =>
      item &&
      typeof item === 'object' &&
      (item as BuilderComponent).type === 'template_definition',
  ) as BuilderComponent | undefined;

  const paper = stored?.config?.paper as PaperDocument | undefined;
  if (paper?.version === 2 && Array.isArray(paper.blocks)) {
    // eslint-disable-next-line unicorn/prefer-structured-clone
    const cloned = JSON.parse(JSON.stringify(paper)) as PaperDocument;
    cloned.role = cloned.role || 'template';
    cloned.blocks = normalizePaperBlocks(cloned.blocks);
    return cloned;
  }

  if (stored?.config?.definition?.version === 1) {
    const materialized = materializeTemplate(stored.config.definition);
    return builderComponentsToPaper(materialized);
  }

  if (list.length > 0) {
    return builderComponentsToPaper(list as BuilderComponent[]);
  }

  return createEmptyPaperDocument();
}

export function paperSummary(document: PaperDocument) {
  const responseCount = countResponseBlocks(document.blocks);
  const blockCount = document.blocks.length;
  return {
    blockCount,
    responseCount,
    label:
      responseCount > 0
        ? `${blockCount} 块 · ${responseCount} 处作答`
        : `${blockCount} 块`,
  };
}

/** 兼容：旧列表页若仍读 definition，给一个弱摘要 */
export function paperAsLegacyHint() {
  return createEmptyTemplateDefinition();
}
