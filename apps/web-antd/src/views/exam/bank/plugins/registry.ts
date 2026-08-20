import type {
  ChannelCompatibilityIssue,
  DeliveryChannel,
  ResponseEnvelope,
} from '../contracts';
import type {
  AssembledPaper,
  BankQuestion,
  Primitive,
  QuestionContent,
} from '../types';
import type {
  InteractionPlugin,
  InteractionPluginManifest,
  PluginScoreResult,
} from './types';

const registry = new Map<Primitive, InteractionPlugin>();

function humanScore(
  detail = '该交互需要授权评分人依据量规评分',
): PluginScoreResult {
  return {
    awardedScore: 0,
    evidence: [{ code: 'HUMAN_REVIEW_REQUIRED', detail }],
    requiresHumanReview: true,
  };
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .replaceAll(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function responseObject(response: ResponseEnvelope | undefined) {
  const value = response?.value;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function exactChoiceScore(
  question: BankQuestion,
  response: ResponseEnvelope | undefined,
  maxScore: number,
): PluginScoreResult {
  const expected = Array.isArray(question.content.answer)
    ? question.content.answer
    : [question.content.answer ?? ''];
  const actual = Array.isArray(response?.value)
    ? response.value
    : [response?.value ?? ''];
  const left = expected.map((item) => normalizeText(item)).toSorted();
  const right = actual.map((item) => normalizeText(item)).toSorted();
  const matched =
    left.length === right.length &&
    left.every((item, index) => item === right[index]);
  return {
    awardedScore: matched ? maxScore : 0,
    evidence: [
      {
        code: matched ? 'EXACT_MATCH' : 'ANSWER_MISMATCH',
        detail: matched ? '选项与标准答案一致' : '选项与标准答案不一致',
      },
    ],
    requiresHumanReview: false,
  };
}

function blankScore(
  question: BankQuestion,
  response: ResponseEnvelope | undefined,
  maxScore: number,
): PluginScoreResult {
  const expected = question.content.answers ?? [];
  const actual = Array.isArray(response?.value) ? response.value : [];
  const matched = expected.reduce(
    (total, answer, index) =>
      total + (normalizeText(answer) === normalizeText(actual[index]) ? 1 : 0),
    0,
  );
  const awardedScore =
    expected.length === 0
      ? 0
      : Math.round((maxScore * matched * 100) / expected.length) / 100;
  return {
    awardedScore,
    evidence: [
      {
        code: 'BLANK_MATCH_COUNT',
        detail: `命中 ${matched}/${expected.length} 个空`,
      },
    ],
    requiresHumanReview: false,
  };
}

function numericScore(
  question: BankQuestion,
  response: ResponseEnvelope | undefined,
  maxScore: number,
): PluginScoreResult {
  const value = responseObject(response);
  const actual = Number(value.value);
  const expected = question.content.numericAnswer;
  const tolerance = Math.max(0, question.content.tolerance ?? 0);
  const allowedUnits =
    question.content.allowedUnits ??
    (question.content.unit ? [question.content.unit] : []);
  const actualUnit = normalizeText(value.unit);
  const unitMatched =
    allowedUnits.length === 0 ||
    allowedUnits.some((unit) => normalizeText(unit) === actualUnit);
  const valueMatched =
    Number.isFinite(actual) &&
    typeof expected === 'number' &&
    Math.abs(actual - expected) <= tolerance;
  const matched = valueMatched && unitMatched;
  return {
    awardedScore: matched ? maxScore : 0,
    evidence: [
      {
        code: valueMatched
          ? 'NUMERIC_WITHIN_TOLERANCE'
          : 'NUMERIC_OUT_OF_RANGE',
        detail:
          typeof expected === 'number'
            ? `目标 ${expected}，容差 ±${tolerance}`
            : '题目未配置数值答案',
      },
      {
        code: unitMatched ? 'UNIT_ACCEPTED' : 'UNIT_REJECTED',
        detail:
          allowedUnits.length > 0
            ? `允许单位：${allowedUnits.join('、')}`
            : '本题不校验单位',
      },
    ],
    requiresHumanReview: false,
  };
}

function formulaScore(
  question: BankQuestion,
  response: ResponseEnvelope | undefined,
  maxScore: number,
): PluginScoreResult {
  const expected = normalizeText(question.content.answer);
  const actual = normalizeText(response?.value);
  const exact = expected.length > 0 && expected === actual;
  return {
    awardedScore: exact ? maxScore : 0,
    evidence: [
      {
        code: exact ? 'FORMULA_EXACT_MATCH' : 'FORMULA_REVIEW_REQUIRED',
        detail: exact
          ? '规范化字符串完全一致'
          : '符号等价需要受限 CAS 或人工复核',
      },
    ],
    requiresHumanReview: !exact,
  };
}

function baseValidation(question: BankQuestion) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!question.title.trim()) errors.push('缺少题目标题');
  if (!question.stem.trim()) errors.push('缺少题干');
  if (question.score <= 0) errors.push('建议分必须大于 0');
  return { errors, warnings };
}

function createPlugin(
  manifest: InteractionPluginManifest,
  options: {
    createDefaultContent?: () => QuestionContent;
    initial?: (question: BankQuestion) => ResponseEnvelope;
    score?: InteractionPlugin['score'];
    validate?: InteractionPlugin['validate'];
  } = {},
): InteractionPlugin {
  return {
    createDefaultContent: options.createDefaultContent ?? (() => ({})),
    createInitialResponse:
      options.initial ??
      ((question) => ({ primitive: question.primitive, value: '' })),
    manifest,
    score: options.score ?? (() => humanScore()),
    validate: options.validate ?? baseValidation,
  };
}

function manifest(
  id: Primitive,
  title: string,
  options: Partial<InteractionPluginManifest> & {
    printMode?: InteractionPluginManifest['channels']['print']['mode'];
  } = {},
): InteractionPluginManifest {
  const printMode = options.printMode ?? 'native';
  return {
    accessibility: options.accessibility ?? {
      keyboard: true,
      screenReader: true,
    },
    channels: options.channels ?? {
      online: { mode: 'native', renderer: `interaction/${id}/online` },
      print: { mode: printMode, renderer: `interaction/${id}/print` },
    },
    description: options.description ?? `${title}交互插件`,
    id,
    qtiInteraction: options.qtiInteraction,
    responseKind: options.responseKind ?? 'structured',
    sandbox: options.sandbox ?? 'none',
    scoring: options.scoring ?? 'human',
    title,
    version: options.version ?? '1.0.0',
  };
}

const builtins: InteractionPlugin[] = [
  createPlugin(
    manifest('choice', '选择题', {
      qtiInteraction: 'qti-choice-interaction',
      responseKind: 'choice',
      scoring: 'automatic',
    }),
    {
      createDefaultContent: () => ({
        answer: 'A',
        options: [
          { key: 'A', text: '' },
          { key: 'B', text: '' },
        ],
      }),
      initial: (question) => ({
        primitive: question.primitive,
        value: question.content.multi ? [] : '',
      }),
      score: exactChoiceScore,
      validate: (question) => {
        const result = baseValidation(question);
        if ((question.content.options?.length ?? 0) < 2) {
          result.errors.push('选择题至少需要两个选项');
        }
        if (!question.content.answer) result.errors.push('缺少标准答案');
        return result;
      },
    },
  ),
  createPlugin(
    manifest('blank', '填空题', {
      qtiInteraction: 'qti-text-entry-interaction',
      responseKind: 'text',
      scoring: 'automatic',
    }),
    {
      createDefaultContent: () => ({ answers: [''] }),
      initial: (question) => ({
        primitive: question.primitive,
        value: (question.content.answers ?? ['']).map(() => ''),
      }),
      score: blankScore,
    },
  ),
  createPlugin(
    manifest('numeric', '数值与单位', {
      qtiInteraction: 'qti-text-entry-interaction',
      responseKind: 'number-unit',
      scoring: 'automatic',
    }),
    {
      createDefaultContent: () => ({
        allowedUnits: [''],
        numericAnswer: 0,
        tolerance: 0,
        unit: '',
      }),
      initial: (question) => ({
        primitive: question.primitive,
        value: { unit: question.content.unit ?? '', value: '' },
      }),
      score: numericScore,
      validate: (question) => {
        const result = baseValidation(question);
        if (typeof question.content.numericAnswer !== 'number') {
          result.errors.push('数值题缺少数值答案');
        }
        return result;
      },
    },
  ),
  createPlugin(
    manifest('formula', '公式题', {
      qtiInteraction: 'qti-extended-text-interaction',
      responseKind: 'text',
      scoring: 'hybrid',
    }),
    {
      createDefaultContent: () => ({ answer: '' }),
      score: formulaScore,
    },
  ),
  createPlugin(
    manifest('text', '论述与简答', {
      qtiInteraction: 'qti-extended-text-interaction',
      responseKind: 'text',
      scoring: 'human',
    }),
  ),
  createPlugin(
    manifest('file', '文件作品', {
      channels: {
        online: { mode: 'native', renderer: 'interaction/file/online' },
        print: { mode: 'unsupported', renderer: 'interaction/file/print-note' },
      },
      qtiInteraction: 'qti-upload-interaction',
      responseKind: 'attachment',
      scoring: 'human',
    }),
    {
      createDefaultContent: () => ({
        allowedFileTypes: ['application/pdf'],
        maxFileSizeMb: 20,
      }),
      initial: (question) => ({
        primitive: question.primitive,
        value: { attachments: [] },
      }),
    },
  ),
  createPlugin(
    manifest('rubric', '现场量规', {
      channels: {
        online: {
          mode: 'examiner-recorded',
          renderer: 'interaction/rubric/examiner',
        },
        print: {
          mode: 'examiner-recorded',
          renderer: 'interaction/rubric/print',
        },
      },
      responseKind: 'structured',
      scoring: 'human',
    }),
    {
      createDefaultContent: () => ({ rubric: ['完成度', '准确性', '规范性'] }),
      initial: (question) => ({
        primitive: question.primitive,
        value: { examinerEvidence: '', scores: [] },
      }),
    },
  ),
  createPlugin(
    manifest('code', '程序设计', {
      channels: {
        online: { mode: 'native', renderer: 'interaction/code/editor' },
        print: { mode: 'equivalent', renderer: 'interaction/code/draft' },
      },
      responseKind: 'text',
      sandbox: 'isolated-container',
      scoring: 'external',
    }),
    { initial: (question) => ({ primitive: question.primitive, value: '' }) },
  ),
  createPlugin(
    manifest('drawing', '绘图与空间作答', {
      qtiInteraction: 'portable-custom-interaction',
      responseKind: 'attachment',
      scoring: 'human',
    }),
  ),
  createPlugin(
    manifest('media', '音视频作品', {
      channels: {
        online: { mode: 'native', renderer: 'interaction/media/recorder' },
        print: {
          mode: 'unsupported',
          renderer: 'interaction/media/print-note',
        },
      },
      qtiInteraction: 'qti-upload-interaction',
      responseKind: 'attachment',
      scoring: 'human',
    }),
  ),
  createPlugin(
    manifest('external', '外部专业工具', {
      channels: {
        online: {
          mode: 'native',
          renderer: 'interaction/external/signed-iframe',
        },
        print: {
          mode: 'examiner-recorded',
          renderer: 'interaction/external/checklist',
        },
      },
      responseKind: 'structured',
      sandbox: 'signed-iframe',
      scoring: 'external',
    }),
  ),
  createPlugin(
    manifest('annotate', '标注题', {
      qtiInteraction: 'qti-hotspot-interaction',
      responseKind: 'structured',
      scoring: 'hybrid',
    }),
  ),
  createPlugin(
    manifest('match', '配对题', {
      qtiInteraction: 'qti-match-interaction',
      responseKind: 'structured',
      scoring: 'automatic',
    }),
  ),
  createPlugin(
    manifest('sequence', '排序题', {
      qtiInteraction: 'qti-order-interaction',
      responseKind: 'structured',
      scoring: 'automatic',
    }),
  ),
  createPlugin(
    manifest('passage', '材料复合题', {
      qtiInteraction: 'qti-assessment-section',
      responseKind: 'composite',
      scoring: 'hybrid',
    }),
  ),
];

for (const plugin of builtins) registry.set(plugin.manifest.id, plugin);

export function registerInteractionPlugin(
  plugin: InteractionPlugin,
  options: { replace?: boolean } = {},
) {
  const id = plugin.manifest.id;
  if (registry.has(id) && !options.replace) {
    throw new Error(`交互插件 ${id} 已注册`);
  }
  if (!plugin.manifest.version.trim()) throw new Error('插件必须声明版本');
  registry.set(id, plugin);
  return plugin;
}

export function getInteractionPlugin(primitive: Primitive) {
  const plugin = registry.get(primitive);
  if (!plugin) throw new Error(`未注册交互插件：${primitive}`);
  return plugin;
}

export function listInteractionPlugins() {
  return [...registry.values()].toSorted((left, right) =>
    left.manifest.title.localeCompare(right.manifest.title, 'zh-CN'),
  );
}

export function scoreResponseWithPlugin(
  question: BankQuestion,
  response: ResponseEnvelope | undefined,
  maxScore: number,
) {
  return getInteractionPlugin(question.primitive).score(
    question,
    response,
    maxScore,
  );
}

export function validateQuestionForChannel(
  question: BankQuestion,
  channel: DeliveryChannel,
): ChannelCompatibilityIssue[] {
  const plugin = getInteractionPlugin(question.primitive);
  const issues: ChannelCompatibilityIssue[] = [];
  const validation = plugin.validate(question);
  validation.errors.forEach((message) => {
    issues.push({
      blocking: true,
      channel,
      code: 'VALIDATION_FAILED',
      message,
      questionId: question.id,
      questionTitle: question.title,
    });
  });
  const questionUnsupported =
    (channel === 'online' && question.channel === 'paper') ||
    (channel === 'print' && question.channel === 'cbt');
  if (questionUnsupported) {
    issues.push({
      blocking: true,
      channel,
      code: 'CHANNEL_NOT_SUPPORTED',
      message: `题目声明为${question.channel === 'cbt' ? '仅机考' : '仅纸笔'}`,
      questionId: question.id,
      questionTitle: question.title,
    });
  }
  const capability = plugin.manifest.channels[channel];
  if (capability.mode === 'unsupported') {
    issues.push({
      blocking: true,
      channel,
      code: 'RENDERER_MISSING',
      message: `${plugin.manifest.title}没有${channel === 'online' ? '机考' : '纸质'}原生呈现器`,
      questionId: question.id,
      questionTitle: question.title,
    });
  } else if (capability.mode === 'equivalent') {
    issues.push({
      blocking: false,
      channel,
      code: 'PRINT_FALLBACK_REQUIRED',
      message: `${plugin.manifest.title}将使用等价呈现，需要命题人确认`,
      questionId: question.id,
      questionTitle: question.title,
    });
  }
  return issues;
}

export function validatePaperCompatibility(paper: AssembledPaper) {
  const channels: DeliveryChannel[] =
    paper.channel === 'both'
      ? ['online', 'print']
      : [paper.channel === 'cbt' ? 'online' : 'print'];
  return paper.sections.flatMap((section) =>
    section.items.flatMap((item) =>
      channels.flatMap((channel) =>
        validateQuestionForChannel(item.snapshot, channel),
      ),
    ),
  );
}
