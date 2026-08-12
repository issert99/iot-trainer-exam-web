import type { BuilderComponent, ComponentType, JudgeMode } from './mock';

import { uid } from './mock';

export type TemplateScopeType = 'college' | 'major' | 'public';
export type TemplateStructure =
  | 'group'
  | 'inline'
  | 'single'
  | 'steps'
  | 'stimulus';

export type TemplateContentType =
  | 'audio'
  | 'code'
  | 'image'
  | 'table'
  | 'text'
  | 'video';

export type TemplateResponseType =
  | 'audio'
  | 'choice'
  | 'code'
  | 'drawing'
  | 'file'
  | 'formula'
  | 'hotspot'
  | 'matching'
  | 'multi_choice'
  | 'number'
  | 'shared_options'
  | 'sorting'
  | 'table'
  | 'text_long'
  | 'text_short'
  | 'true_false';

export type TemplateDefinition = {
  defaultScoring: {
    judgeMode: JudgeMode;
    score: number;
    scoreStrategy: 'all_or_nothing' | 'partial';
  };
  dependencies: {
    allowCarryForward: boolean;
    allowPreviousAnswerReference: boolean;
  };
  inlineAnswers: {
    allowedTypes: Array<
      'dropdown' | 'formula' | 'number' | 'shared_options' | 'text'
    >;
    enabled: boolean;
    maxBlanks: number;
  };
  name?: string;
  optionPool: {
    allowDistractors: boolean;
    enabled: boolean;
    maxOptions: number;
    minOptions: number;
    reuse: 'once' | 'repeatable';
  };
  professionalTools: Array<
    | 'cad'
    | 'chemistry'
    | 'circuit'
    | 'gis'
    | 'graphing'
    | 'music'
    | 'simulation'
  >;
  responseSelection: {
    fixedType: TemplateResponseType;
    mode: 'fixed' | 'selectable';
  };
  responseTypes: TemplateResponseType[];
  stimulus: {
    allowedContent: TemplateContentType[];
    enabled: boolean;
    required: boolean;
  };
  structure: TemplateStructure;
  subQuestions: {
    countMode: 'fixed' | 'range';
    enabled: boolean;
    fixedCount: number;
    max: number;
    min: number;
    repeatable: boolean;
  };
  version: 1;
};

export type StoredTemplateDefinition = BuilderComponent & {
  config: {
    definition: TemplateDefinition;
  };
  type: 'template_definition';
};

export const STRUCTURE_OPTIONS = [
  { label: '普通单题', value: 'single' },
  { label: '题组 / 批量小题', value: 'group' },
  { label: '题干内多空', value: 'inline' },
  { label: '共享材料 + 多小题', value: 'stimulus' },
  { label: '分步骤综合题', value: 'steps' },
];

export const RESPONSE_OPTIONS: Array<{
  label: string;
  value: TemplateResponseType;
}> = [
  { label: '单选', value: 'choice' },
  { label: '多选 / 不定项', value: 'multi_choice' },
  { label: '判断', value: 'true_false' },
  { label: '短文本填空', value: 'text_short' },
  { label: '长文本 / 论述', value: 'text_long' },
  { label: '数值与单位', value: 'number' },
  { label: '公式', value: 'formula' },
  { label: '共享选项填空', value: 'shared_options' },
  { label: '匹配', value: 'matching' },
  { label: '排序', value: 'sorting' },
  { label: '代码 / SQL', value: 'code' },
  { label: '表格填写', value: 'table' },
  { label: '绘图 / 连线', value: 'drawing' },
  { label: '图片热点 / 标注', value: 'hotspot' },
  { label: '文件上传', value: 'file' },
  { label: '录音', value: 'audio' },
];

export const CONTENT_OPTIONS: Array<{
  label: string;
  value: TemplateContentType;
}> = [
  { label: '富文本', value: 'text' },
  { label: '图片', value: 'image' },
  { label: '音频', value: 'audio' },
  { label: '视频', value: 'video' },
  { label: '表格', value: 'table' },
  { label: '代码', value: 'code' },
];

export const PROFESSIONAL_TOOL_OPTIONS = [
  { label: '数学坐标与函数图', value: 'graphing' },
  { label: '化学式 / 反应式', value: 'chemistry' },
  { label: '电路设计与仿真', value: 'circuit' },
  { label: 'CAD / 工程制图', value: 'cad' },
  { label: '地图 / GIS', value: 'gis' },
  { label: '五线谱 / 音乐', value: 'music' },
  { label: '虚拟实验', value: 'simulation' },
];

export function createEmptyTemplateDefinition(): TemplateDefinition {
  return {
    version: 1,
    structure: 'single',
    stimulus: {
      enabled: false,
      required: false,
      allowedContent: ['text', 'image'],
    },
    subQuestions: {
      countMode: 'range',
      enabled: false,
      fixedCount: 1,
      repeatable: false,
      min: 0,
      max: 1,
    },
    responseSelection: {
      mode: 'fixed',
      fixedType: 'choice',
    },
    responseTypes: ['choice'],
    inlineAnswers: {
      enabled: false,
      allowedTypes: ['text'],
      maxBlanks: 10,
    },
    optionPool: {
      enabled: false,
      minOptions: 2,
      maxOptions: 20,
      reuse: 'once',
      allowDistractors: true,
    },
    dependencies: {
      allowPreviousAnswerReference: false,
      allowCarryForward: false,
    },
    defaultScoring: {
      score: 2,
      judgeMode: 'auto',
      scoreStrategy: 'partial',
    },
    professionalTools: [],
  };
}

export function encodeTemplateDefinition(
  definition: TemplateDefinition,
): StoredTemplateDefinition[] {
  return [
    {
      id: 'template_definition',
      type: 'template_definition',
      label: '模板规则',
      score: 0,
      judgeMode: 'none',
      config: {
        // Vue reactive proxies cannot be cloned with structuredClone.
        // eslint-disable-next-line unicorn/prefer-structured-clone
        definition: JSON.parse(
          JSON.stringify(definition),
        ) as TemplateDefinition,
      },
    },
  ];
}

export function decodeTemplateDefinition(raw: unknown): TemplateDefinition {
  const list = Array.isArray(raw) ? raw : [];
  const stored = list.find(
    (item) =>
      item &&
      typeof item === 'object' &&
      (item as BuilderComponent).type === 'template_definition',
  ) as StoredTemplateDefinition | undefined;
  if (stored?.config?.definition?.version === 1) {
    return normalizeStoredDefinition(stored.config.definition);
  }
  return inferLegacyDefinition(list as BuilderComponent[]);
}

function normalizeStoredDefinition(
  raw: TemplateDefinition,
): TemplateDefinition {
  const defaults = createEmptyTemplateDefinition();
  // Keep this compatible with reactive values passed by form models.
  // eslint-disable-next-line unicorn/prefer-structured-clone
  const source = JSON.parse(JSON.stringify(raw)) as Partial<TemplateDefinition>;
  const sourceSubQuestions = source.subQuestions as
    | Partial<TemplateDefinition['subQuestions']>
    | undefined;
  const responseTypes =
    source.responseTypes && source.responseTypes.length > 0
      ? source.responseTypes
      : defaults.responseTypes;
  const legacyStructure = String(source.structure || 'single');
  const structure: TemplateStructure =
    legacyStructure === 'visual' || legacyStructure === 'submission'
      ? 'single'
      : (legacyStructure as TemplateStructure);
  if (legacyStructure === 'visual' && !responseTypes.includes('drawing')) {
    responseTypes.push('drawing');
  }
  if (legacyStructure === 'submission' && !responseTypes.includes('file')) {
    responseTypes.push('file');
  }
  const repeatable =
    sourceSubQuestions?.repeatable ?? defaults.subQuestions.repeatable;
  const min = sourceSubQuestions?.min ?? defaults.subQuestions.min;
  const max = sourceSubQuestions?.max ?? defaults.subQuestions.max;
  const countMode =
    sourceSubQuestions?.countMode || (repeatable ? 'range' : 'fixed');
  const fixedCount =
    sourceSubQuestions?.fixedCount || Math.max(1, min === max ? min : min || 1);
  return {
    ...defaults,
    ...source,
    structure,
    responseTypes,
    responseSelection: source.responseSelection || {
      mode: responseTypes.length === 1 ? 'fixed' : 'selectable',
      fixedType: responseTypes[0] || 'choice',
    },
    stimulus: {
      ...defaults.stimulus,
      ...source.stimulus,
    },
    subQuestions: {
      ...defaults.subQuestions,
      ...sourceSubQuestions,
      countMode,
      fixedCount,
      min,
      max,
      repeatable,
    },
    inlineAnswers: {
      ...defaults.inlineAnswers,
      ...source.inlineAnswers,
    },
    optionPool: {
      ...defaults.optionPool,
      ...source.optionPool,
    },
    dependencies: {
      ...defaults.dependencies,
      ...source.dependencies,
    },
    defaultScoring: {
      ...defaults.defaultScoring,
      ...source.defaultScoring,
    },
  };
}

function inferLegacyDefinition(
  components: BuilderComponent[],
): TemplateDefinition {
  const definition = createEmptyTemplateDefinition();
  const flat = flattenComponents(components);
  const hasGroup = flat.some((item) => item.type === 'group');
  const hasMedia = flat.some((item) => item.type === 'media_player');
  definition.structure = hasGroup ? 'stimulus' : 'single';
  definition.stimulus.enabled = hasGroup || hasMedia;
  definition.stimulus.required = hasGroup;
  definition.subQuestions.enabled = hasGroup;
  definition.subQuestions.countMode = hasGroup ? 'range' : 'fixed';
  definition.subQuestions.fixedCount = hasGroup ? 1 : 0;
  definition.subQuestions.repeatable = hasGroup;
  definition.subQuestions.min = hasGroup ? 1 : 0;
  definition.subQuestions.max = hasGroup ? 50 : 1;
  definition.responseTypes = [
    ...new Set(
      flat
        .map((item) => componentToResponse(item.type))
        .filter((item): item is TemplateResponseType => !!item),
    ),
  ];
  if (definition.responseTypes.length === 0) {
    definition.responseTypes = ['choice'];
  }
  definition.responseSelection = {
    mode: definition.responseTypes.length === 1 ? 'fixed' : 'selectable',
    fixedType: definition.responseTypes[0] || 'choice',
  };
  return definition;
}

function flattenComponents(nodes: BuilderComponent[]): BuilderComponent[] {
  return nodes.flatMap((item) => [
    item,
    ...flattenComponents(item.children || []),
  ]);
}

function componentToResponse(
  type: BuilderComponent['type'],
): TemplateResponseType | undefined {
  const map: Partial<Record<BuilderComponent['type'], TemplateResponseType>> = {
    audio_record: 'audio',
    canvas: 'drawing',
    cloze: 'shared_options',
    code_editor: 'code',
    file_upload: 'file',
    formula: 'formula',
    image_hotspot: 'hotspot',
    matching: 'matching',
    option_group: 'choice',
    sorting: 'sorting',
    table_fill: 'table',
    text_input: 'text_long',
  };
  return map[type];
}

export function formatTemplateScope(
  type: TemplateScopeType,
  id?: string,
): string {
  return type === 'public' ? 'public' : `${type}:${id || ''}`;
}

export function parseTemplateScope(scope?: string): {
  id: string;
  type: TemplateScopeType;
} {
  if (!scope || scope === 'public' || scope === 'global') {
    return { type: 'public', id: '' };
  }
  const [rawType, id = ''] = scope.split(':');
  return {
    type: rawType === 'major' ? 'major' : 'college',
    id,
  };
}

function createInlineBlank(type: TemplateResponseType, index: number) {
  return {
    marker: index + 1,
    type,
    answer: '',
    options: ['choice', 'multi_choice'].includes(type)
      ? defaultOptions()
      : undefined,
  };
}

export function materializeTemplate(
  definition: TemplateDefinition,
): BuilderComponent[] {
  const result: BuilderComponent[] = [];
  const responseType =
    definition.responseSelection.mode === 'fixed'
      ? definition.responseSelection.fixedType
      : definition.responseTypes[0] || 'text_long';
  if (definition.structure === 'inline') {
    const inlineResponse = createTemplateResponseComponent(
      'shared_options',
      definition,
    );
    inlineResponse.config.blankType = responseType;
    inlineResponse.config.blankTypeMode =
      definition.responseSelection.mode === 'fixed' ? 'uniform' : 'per_blank';
    inlineResponse.config.allowedBlankTypes =
      definition.responseSelection.mode === 'fixed'
        ? [definition.responseSelection.fixedType]
        : [...definition.responseTypes];
    inlineResponse.config.blanks = Array.from(
      { length: inlineResponse.config.blankCount },
      (_, index) => createInlineBlank(responseType, index),
    );
    result.push(inlineResponse);
    return result;
  }

  if (definition.stimulus.enabled) {
    result.push({
      id: uid('cmp'),
      type: 'rich_stem',
      label: definition.structure === 'stimulus' ? '共享材料' : '题干',
      score: 0,
      judgeMode: 'none',
      config: {
        html: '',
        allowImage: definition.stimulus.allowedContent.includes('image'),
        allowAttachment: true,
        allowedContent: [...definition.stimulus.allowedContent],
      },
    });
    if (
      definition.stimulus.allowedContent.includes('audio') ||
      definition.stimulus.allowedContent.includes('video')
    ) {
      result.push({
        id: uid('cmp'),
        type: 'media_player',
        label: '音视频材料',
        score: 0,
        judgeMode: 'none',
        config: {
          mediaType: definition.stimulus.allowedContent.includes('audio')
            ? 'audio'
            : 'video',
          maxPlays: 2,
          url: '',
        },
      });
    }
  } else {
    result.push({
      id: uid('cmp'),
      type: 'rich_stem',
      label: '题干',
      score: 0,
      judgeMode: 'none',
      config: { html: '', allowImage: true, allowAttachment: true },
    });
  }

  if (definition.inlineAnswers.enabled) {
    const inlineResponse = createTemplateResponseComponent(
      'shared_options',
      definition,
    );
    inlineResponse.config.blankType = responseType;
    inlineResponse.config.blankTypeMode =
      definition.responseSelection.mode === 'fixed' ? 'uniform' : 'per_blank';
    inlineResponse.config.allowedBlankTypes =
      definition.responseSelection.mode === 'fixed'
        ? [definition.responseSelection.fixedType]
        : [...definition.responseTypes];
    inlineResponse.config.blanks = Array.from(
      { length: inlineResponse.config.blankCount },
      (_, index) => createInlineBlank(responseType, index),
    );
    result.push(inlineResponse);
    return result;
  }

  if (definition.subQuestions.enabled) {
    const fixedCount = Math.max(1, definition.subQuestions.fixedCount);
    const isFixed = definition.subQuestions.countMode === 'fixed';
    const initialCount = isFixed
      ? fixedCount
      : Math.max(1, definition.subQuestions.min);
    const allowedResponseTypes =
      definition.responseSelection.mode === 'fixed'
        ? [definition.responseSelection.fixedType]
        : [...definition.responseTypes];
    result.push({
      id: uid('cmp'),
      type: 'group',
      label: '小题组',
      score: 0,
      judgeMode: 'none',
      config: {
        sharedStem: true,
        countMode: definition.subQuestions.countMode,
        repeatable: !isFixed && definition.subQuestions.repeatable,
        min: isFixed ? fixedCount : definition.subQuestions.min,
        max: isFixed ? fixedCount : definition.subQuestions.max,
        fixedCount: isFixed ? fixedCount : undefined,
        allowedResponseTypes,
      },
      children: Array.from({ length: initialCount }, () =>
        createTemplateResponseComponent(responseType, definition),
      ),
    });
  } else {
    result.push(createTemplateResponseComponent(responseType, definition));
  }
  return result;
}

export function createTemplateResponseComponent(
  responseType: TemplateResponseType,
  definition: TemplateDefinition,
): BuilderComponent {
  const base = {
    id: uid('cmp'),
    score: definition.defaultScoring.score,
    judgeMode: definition.defaultScoring.judgeMode,
  };
  if (responseType === 'shared_options') {
    return {
      ...base,
      type: 'cloze',
      label: '共享选项填空',
      config: {
        passage: '',
        blankType: 'shared_options',
        blankCount: Math.max(1, definition.inlineAnswers.maxBlanks || 10),
        options: Array.from(
          { length: Math.max(1, definition.optionPool.minOptions) },
          (_, index) => ({
            key: String.fromCodePoint(65 + index),
            text: `词库选项 ${String.fromCodePoint(65 + index)}`,
          }),
        ),
        answers: [],
        reuse: definition.optionPool.reuse,
        allowDistractors: definition.optionPool.allowDistractors,
        scoreStrategy: definition.defaultScoring.scoreStrategy,
      },
    };
  }
  const mapping: Record<
    Exclude<TemplateResponseType, 'shared_options'>,
    ComponentType
  > = {
    audio: 'audio_record',
    choice: 'option_group',
    code: 'code_editor',
    drawing: 'canvas',
    file: 'file_upload',
    formula: 'formula',
    hotspot: 'image_hotspot',
    matching: 'matching',
    multi_choice: 'option_group',
    number: 'text_input',
    sorting: 'sorting',
    table: 'table_fill',
    text_long: 'text_input',
    text_short: 'text_input',
    true_false: 'option_group',
  };
  const type = mapping[responseType];
  const configs: Partial<Record<TemplateResponseType, Record<string, any>>> = {
    choice: {
      mode: 'single',
      options: defaultOptions(),
      answer: ['A'],
    },
    multi_choice: {
      mode: 'multi',
      options: defaultOptions(),
      answer: ['A'],
    },
    true_false: {
      mode: 'single',
      options: [
        { key: 'A', text: '正确' },
        { key: 'B', text: '错误' },
      ],
      answer: ['A'],
    },
    text_short: { mode: 'short', placeholder: '请输入答案' },
    text_long: { mode: 'long', placeholder: '请输入答案' },
    number: { mode: 'short', valueType: 'number', tolerance: 0, unit: '' },
    code: {
      languages: ['python', 'c', 'java'],
      defaultLanguage: 'python',
      starterCode: '',
      testCases: '',
    },
    formula: { engine: 'latex', placeholder: '输入公式' },
    drawing: { mode: 'draw', backgroundImage: '', tools: ['line', 'text'] },
    matching: {
      left: ['左1', '左2'],
      right: ['右A', '右B'],
      answer: { 0: 0, 1: 1 },
    },
    sorting: {
      items: ['步骤一', '步骤二', '步骤三'],
      answerOrder: [0, 1, 2],
    },
    table: { rows: 3, cols: 3, headers: ['列1', '列2', '列3'] },
    hotspot: { imageUrl: '', hotspots: [], mode: 'click' },
    file: { accept: '.pdf,.doc,.docx,.zip,.png,.jpg', maxCount: 3 },
    audio: { maxSeconds: 120, tip: '请开始录音作答' },
  };
  return {
    ...base,
    type,
    label:
      RESPONSE_OPTIONS.find((item) => item.value === responseType)?.label ||
      '作答区',
    config: configs[responseType] || {},
  };
}

function defaultOptions() {
  return ['A', 'B', 'C', 'D'].map((key) => ({
    key,
    text: `选项 ${key}`,
  }));
}
