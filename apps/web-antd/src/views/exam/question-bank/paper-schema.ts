import type { BuilderComponent, JudgeMode } from './mock';

import { uid } from './mock';
import {
  createEmptyTemplateDefinition,
  materializeTemplate,
} from './template-schema';

/** 卷面自由拼装 v2：一块画布树，无题型天花板 */

export type PaperBlockKind = 'content' | 'response' | 'structure';

export type PaperBlockType =
  | 'choice'
  | 'code'
  | 'drawing'
  | 'formula'
  | 'matching'
  | 'media'
  | 'multi_choice'
  | 'number'
  | 'section'
  | 'sorting'
  | 'stem'
  | 'table'
  | 'text_long'
  | 'text_short'
  | 'tip'
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
  blocks: PaperBlock[];
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
    label: '题干',
    hint: '富文本题目说明',
    icon: 'lucide:file-text',
  },
  {
    type: 'tip',
    kind: 'content',
    label: '提示',
    hint: '考试说明 / 评分提示',
    icon: 'lucide:info',
  },
  {
    type: 'media',
    kind: 'content',
    label: '媒体材料',
    hint: '图片 / 音频 / 视频',
    icon: 'lucide:image',
  },
  {
    type: 'choice',
    kind: 'response',
    label: '单选',
    hint: '四选一等',
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
    label: '短填空',
    hint: '一句话作答',
    icon: 'lucide:text-cursor-input',
  },
  {
    type: 'text_long',
    kind: 'response',
    label: '简答论述',
    hint: '长文本 / 人工阅',
    icon: 'lucide:align-left',
  },
  {
    type: 'number',
    kind: 'response',
    label: '数值',
    hint: '数值 + 单位 + 容差',
    icon: 'lucide:hash',
  },
  {
    type: 'formula',
    kind: 'response',
    label: '公式',
    hint: 'LaTeX 作答',
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
    hint: '左右连线',
    icon: 'lucide:git-compare',
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
    type: 'section',
    kind: 'structure',
    label: '子题组',
    hint: '可嵌套子题',
    icon: 'lucide:layers',
  },
];

export const PAPER_KIND_LABEL: Record<PaperBlockKind, string> = {
  content: '内容',
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

export function createPaperBlock(type: PaperBlockType): PaperBlock {
  const id = uid('pb');
  switch (type) {
    case 'choice': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '单选题',
          options: defaultOptions(),
          answer: ['A'],
        },
        scoring: { score: 2, judgeMode: 'auto' },
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
          starterCode: '# 在此编写代码\n',
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
    case 'matching': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '匹配题',
          left: [
            { id: 'L1', text: '左侧 1' },
            { id: 'L2', text: '左侧 2' },
          ],
          right: [
            { id: 'R1', text: '右侧 1' },
            { id: 'R2', text: '右侧 2' },
          ],
          answer: { L1: 'R1', L2: 'R2' },
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
          title: '媒体材料',
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
          title: '多选题',
          options: defaultOptions(),
          answer: ['A', 'B'],
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
          title: '排序题',
          items: ['步骤一', '步骤二', '步骤三'],
        },
        scoring: { score: 3, judgeMode: 'auto' },
      };
    }
    case 'stem': {
      return {
        id,
        kind: 'content',
        type,
        props: { html: '<p>请输入题干内容</p>', title: '题干' },
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
          headers: ['列1', '列2', '列3'],
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
          title: '简答',
          placeholder: '请输入论述内容',
          maxLength: 2000,
        },
        scoring: { score: 5, judgeMode: 'manual' },
      };
    }
    case 'text_short': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '填空',
          placeholder: '请输入答案',
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
        props: { html: '<p>提示信息</p>', title: '提示' },
      };
    }
    case 'true_false': {
      return {
        id,
        kind: 'response',
        type,
        props: {
          title: '判断题',
          options: [
            { key: 'T', text: '正确' },
            { key: 'F', text: '错误' },
          ],
          answer: ['T'],
        },
        scoring: { score: 1, judgeMode: 'auto' },
      };
    }
  }
}

export function createEmptyPaperDocument(): PaperDocument {
  return {
    version: 2,
    blocks: [createPaperBlock('stem'), createPaperBlock('choice')],
  };
}

export const PAPER_PRESETS: PaperPreset[] = [
  {
    id: 'single_choice',
    label: '单选快装',
    hint: '题干 + 单选',
    build: () => [createPaperBlock('stem'), createPaperBlock('choice')],
  },
  {
    id: 'reading',
    label: '阅读理解',
    hint: '材料 + 子题组（两道单选）',
    build: () => {
      const section = createPaperBlock('section');
      section.props.title = '根据材料作答';
      section.children = [
        createPaperBlock('choice'),
        createPaperBlock('choice'),
      ];
      const media = createPaperBlock('stem');
      media.props.title = '阅读材料';
      media.props.html = '<p>在此粘贴阅读材料……</p>';
      return [media, section];
    },
  },
  {
    id: 'mixed',
    label: '综合题',
    hint: '题干 + 选择 + 简答 + 绘图',
    build: () => [
      createPaperBlock('stem'),
      createPaperBlock('choice'),
      createPaperBlock('text_long'),
      createPaperBlock('drawing'),
    ],
  },
  {
    id: 'coding',
    label: '编程题',
    hint: '题干 + 代码编辑器',
    build: () => [createPaperBlock('stem'), createPaperBlock('code')],
  },
];

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
    case 'media': {
      return {
        id: block.id,
        type: 'media_player',
        label,
        score: 0,
        judgeMode: 'none',
        config: {
          mediaType: block.props.mediaType || 'image',
          url: block.props.url || '',
          maxPlays: block.props.maxPlays ?? 2,
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
      return {
        id: component.id,
        kind: 'content',
        type: 'media',
        props: {
          title: component.label || '媒体材料',
          mediaType: component.config.mediaType || 'audio',
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
    return JSON.parse(JSON.stringify(paper)) as PaperDocument;
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
