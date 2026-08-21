import type {
  AssessmentItemRevision,
  CompatibilityIssue,
  DeliveryChannel,
  JsonObject,
  JsonValue,
  ResponseEnvelope,
} from '../domain/types';
import type {
  InteractionPlugin,
  PluginManifest,
  PluginScoreResult,
  SchemaProperty,
} from './types';

import { asObject } from '../domain/integrity';
import { schoolAssessmentState } from '../stores/state';
import ChoiceInteraction from './components/ChoiceInteraction.vue';
import EssayInteraction from './components/EssayInteraction.vue';
import FileInteraction from './components/FileInteraction.vue';
import FillInteraction from './components/FillInteraction.vue';
import NoCodeInteraction from './components/NoCodeInteraction.vue';
import NumericInteraction from './components/NumericInteraction.vue';
import RubricInteraction from './components/RubricInteraction.vue';

const plugins = new Map<string, InteractionPlugin>();

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stemText(item: AssessmentItemRevision) {
  return item.stem.blocks
    .map((block) => String(block.data.text ?? block.data.source ?? ''))
    .filter((value) => value.length > 0)
    .join('\n');
}

function responseValue(response: ResponseEnvelope | undefined) {
  return response?.value;
}

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .replaceAll(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function manualScore(reason: string): PluginScoreResult {
  return {
    awardedScore: 0,
    evidence: [reason],
    requiresHumanReview: true,
  };
}

function baseValidation(item: AssessmentItemRevision) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (item.title.trim().length === 0) errors.push('题目标题不能为空');
  if (stemText(item).trim().length === 0) errors.push('题干不能为空');
  if (item.maxScore <= 0) errors.push('题目分值必须大于 0');
  return { errors, warnings };
}

function manifest(
  input: Omit<
    PluginManifest,
    | 'accessibility'
    | 'configSchema'
    | 'examples'
    | 'migrations'
    | 'responseSchema'
    | 'sandbox'
    | 'testCases'
    | 'uiSchema'
  > &
    Partial<
      Pick<
        PluginManifest,
        | 'accessibility'
        | 'configSchema'
        | 'examples'
        | 'migrations'
        | 'responseSchema'
        | 'sandbox'
        | 'testCases'
        | 'uiSchema'
      >
    >,
): PluginManifest {
  const properties: Record<string, SchemaProperty> = Object.fromEntries(
    input.authoringFields.map((field) => {
      let type = field.type as SchemaProperty['type'];
      if (field.type === 'strings') type = 'array';
      if (field.type === 'options') type = 'string';
      return [
        field.key,
        {
          title: field.label,
          type,
        },
      ];
    }),
  );
  return {
    accessibility: input.accessibility ?? {
      keyboard: true,
      screenReader: true,
      supportsAlternativeContent: true,
    },
    authoringFields: input.authoringFields,
    channels: input.channels,
    configSchema: input.configSchema ?? {
      properties,
      required: input.authoringFields
        .filter((field) => field.required)
        .map((field) => field.key),
      type: 'object',
    },
    description: input.description,
    examples: input.examples ?? [],
    id: input.id,
    migrations: input.migrations ?? [],
    qtiInteraction: input.qtiInteraction,
    responseSchema: input.responseSchema ?? {
      description: `${input.title} 标准响应`,
      type: 'object',
    },
    sandbox: input.sandbox ?? 'none',
    scoring: input.scoring,
    testCases: input.testCases ?? [],
    title: input.title,
    uiSchema: input.uiSchema ?? {},
    version: input.version,
  };
}

function printShell(
  item: AssessmentItemRevision,
  options: {
    answerMode: 'answer-key' | 'answer-sheet' | 'question';
    index: number;
    score: number;
  },
  body: string,
) {
  return `<section class="assessment-item">
  <h4>${options.index}. ${escapeHtml(
    options.answerMode === 'answer-sheet' ? item.title : stemText(item),
  )} <small>（${options.score} 分）</small></h4>
  ${body}
</section>`;
}

function qtiShell(
  item: AssessmentItemRevision,
  interaction: string,
  responseDeclaration = '',
) {
  return `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}" adaptive="false" time-dependent="false">
${responseDeclaration}
<qti-item-body>
  <p>${escapeHtml(stemText(item))}</p>
  ${interaction}
</qti-item-body>
</qti-assessment-item>`;
}

const choicePlugin: InteractionPlugin = {
  createDefaultConfig: () => ({
    correct: 'A',
    multiple: false,
    options: [
      { key: 'A', text: '选项 A' },
      { key: 'B', text: '选项 B' },
    ],
  }),
  createInitialValue: (item) =>
    item.interaction.config.multiple === true ? [] : '',
  manifest: manifest({
    authoringFields: [
      { key: 'options', label: '选项', required: true, type: 'options' },
      { key: 'correct', label: '正确答案', required: true, type: 'strings' },
      { key: 'multiple', label: '允许多选', required: true, type: 'boolean' },
    ],
    channels: {
      online: { mode: 'native', renderer: 'choice.online.v1' },
      print: { mode: 'native', renderer: 'choice.print.v1' },
    },
    description: '单选、多选与判断均由选项和响应基数配置表达。',
    id: 'core.choice',
    qtiInteraction: 'qti-choice-interaction',
    scoring: 'automatic',
    title: '选择交互',
    version: '1.0.0',
  }),
  onlineComponent: ChoiceInteraction,
  renderPrint: (item, options) => {
    const config = item.interaction.config;
    if (options.answerMode === 'answer-key') {
      const answer = config.correct;
      return printShell(
        item,
        options,
        `<p><strong>答案：</strong>${escapeHtml(
          Array.isArray(answer) ? answer.join('、') : answer,
        )}</p>`,
      );
    }
    if (options.answerMode === 'answer-sheet') {
      const rawOptions = config.options;
      const keys = Array.isArray(rawOptions)
        ? rawOptions.map((entry) =>
            String(
              entry &&
                typeof entry === 'object' &&
                !Array.isArray(entry) &&
                'key' in entry
                ? entry.key
                : '',
            ),
          )
        : [];
      return printShell(
        item,
        options,
        `<div class="omr">${keys.map((key) => `<i>${escapeHtml(key)}</i>`).join('')}</div>`,
      );
    }
    const rawOptions = config.options;
    const optionList = Array.isArray(rawOptions)
      ? rawOptions
          .filter(
            (entry): entry is JsonObject =>
              Boolean(entry) &&
              typeof entry === 'object' &&
              !Array.isArray(entry),
          )
          .map(
            (entry) =>
              `<li><b>${escapeHtml(entry.key)}</b> ${escapeHtml(entry.text)}</li>`,
          )
          .join('')
      : '';
    return printShell(item, options, `<ol class="choices">${optionList}</ol>`);
  },
  score: (item, response, maxScore) => {
    const expected = Array.isArray(item.interaction.config.correct)
      ? item.interaction.config.correct
      : [item.interaction.config.correct ?? ''];
    const actual = Array.isArray(responseValue(response))
      ? (responseValue(response) as JsonValue[])
      : [responseValue(response) ?? ''];
    const left = expected.map((value) => normalize(value)).toSorted();
    const right = actual.map((value) => normalize(value)).toSorted();
    const matched =
      left.length === right.length &&
      left.every((value, index) => value === right[index]);
    return {
      awardedScore: matched ? maxScore : 0,
      evidence: [matched ? '选项完全匹配' : '选项与标准答案不一致'],
      requiresHumanReview: false,
    };
  },
  toQti: (item) => {
    const options = item.interaction.config.options;
    const choices = Array.isArray(options)
      ? options
          .filter(
            (entry): entry is JsonObject =>
              Boolean(entry) &&
              typeof entry === 'object' &&
              !Array.isArray(entry),
          )
          .map(
            (entry) =>
              `<qti-simple-choice identifier="${escapeHtml(entry.key)}">${escapeHtml(entry.text)}</qti-simple-choice>`,
          )
          .join('')
      : '';
    return qtiShell(
      item,
      `<qti-choice-interaction response-identifier="RESPONSE">${choices}</qti-choice-interaction>`,
      '<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier" />',
    );
  },
  validate: (item) => {
    const result = baseValidation(item);
    const options = item.interaction.config.options;
    if (!Array.isArray(options) || options.length < 2) {
      result.errors.push('选择交互至少需要两个选项');
    }
    if (item.interaction.config.correct === undefined) {
      result.errors.push('选择交互缺少正确答案');
    }
    return result;
  },
};

const fillPlugin: InteractionPlugin = {
  createDefaultConfig: () => ({
    answers: [''],
    caseSensitive: false,
  }),
  createInitialValue: (item) => {
    const answers = item.interaction.config.answers;
    return Array.isArray(answers) ? answers.map(() => '') : [''];
  },
  manifest: manifest({
    authoringFields: [
      { key: 'answers', label: '逐空答案', required: true, type: 'strings' },
      {
        key: 'caseSensitive',
        label: '区分大小写',
        required: true,
        type: 'boolean',
      },
    ],
    channels: {
      online: { mode: 'native', renderer: 'fill.online.v1' },
      print: { mode: 'native', renderer: 'fill.print.v1' },
    },
    description: '一个交互可包含多个空位，并支持逐空部分得分。',
    id: 'core.fill',
    qtiInteraction: 'qti-text-entry-interaction',
    scoring: 'automatic',
    title: '填空交互',
    version: '1.0.0',
  }),
  onlineComponent: FillInteraction,
  renderPrint: (item, options) => {
    const answers = item.interaction.config.answers;
    if (options.answerMode === 'answer-key') {
      return printShell(
        item,
        options,
        `<p><strong>答案：</strong>${escapeHtml(
          Array.isArray(answers) ? answers.join('；') : '',
        )}</p>`,
      );
    }
    const count = Array.isArray(answers) ? Math.max(1, answers.length) : 1;
    const blanks = Array.from(
      { length: count },
      (_, index) => `<span>（${index + 1}）________________</span>`,
    ).join('');
    return printShell(item, options, `<div class="blanks">${blanks}</div>`);
  },
  score: (item, response, maxScore) => {
    const expected = Array.isArray(item.interaction.config.answers)
      ? item.interaction.config.answers.map(String)
      : [];
    const actual = Array.isArray(responseValue(response))
      ? (responseValue(response) as JsonValue[]).map(String)
      : [];
    const matched = expected.reduce<number>(
      (count, answer, index) =>
        count + (normalize(answer) === normalize(actual[index]) ? 1 : 0),
      0,
    );
    return {
      awardedScore:
        expected.length === 0
          ? 0
          : Math.round((matched / expected.length) * maxScore * 100) / 100,
      evidence: [`命中 ${matched}/${expected.length} 个空`],
      requiresHumanReview: false,
    };
  },
  toQti: (item) =>
    qtiShell(
      item,
      '<qti-text-entry-interaction response-identifier="RESPONSE" />',
      '<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="string" />',
    ),
  validate: (item) => {
    const result = baseValidation(item);
    if (!Array.isArray(item.interaction.config.answers)) {
      result.errors.push('填空交互必须配置答案数组');
    }
    return result;
  },
};

const numericPlugin: InteractionPlugin = {
  createDefaultConfig: () => ({
    answer: 0,
    tolerance: 0,
    units: [''],
  }),
  createInitialValue: () => ({ unit: '', value: '' }),
  manifest: manifest({
    authoringFields: [
      { key: 'answer', label: '标准数值', required: true, type: 'number' },
      { key: 'tolerance', label: '绝对容差', required: true, type: 'number' },
      { key: 'units', label: '允许单位', required: false, type: 'strings' },
    ],
    channels: {
      online: { mode: 'native', renderer: 'numeric.online.v1' },
      print: { mode: 'native', renderer: 'numeric.print.v1' },
    },
    description: '统一处理精度、容差和单位集合。',
    id: 'core.numeric',
    qtiInteraction: 'qti-text-entry-interaction',
    scoring: 'automatic',
    title: '数值与单位',
    version: '1.0.0',
  }),
  onlineComponent: NumericInteraction,
  renderPrint: (item, options) => {
    const config = item.interaction.config;
    if (options.answerMode === 'answer-key') {
      return printShell(
        item,
        options,
        `<p><strong>答案：</strong>${escapeHtml(config.answer)} ${escapeHtml(
          Array.isArray(config.units) ? config.units.join('/') : '',
        )}，容差 ±${escapeHtml(config.tolerance)}</p>`,
      );
    }
    return printShell(
      item,
      options,
      '<div class="numeric">数值：____________　单位：____________</div>',
    );
  },
  score: (item, response, maxScore) => {
    const expected = Number(item.interaction.config.answer);
    const tolerance = Math.max(
      0,
      Number(item.interaction.config.tolerance ?? 0),
    );
    const units = Array.isArray(item.interaction.config.units)
      ? item.interaction.config.units.map((unit) => normalize(unit))
      : [];
    const value = asObject(responseValue(response));
    const actual = Number(value.value);
    const unit = normalize(value.unit);
    const valueMatches =
      Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
    const unitMatches = units.length === 0 || units.includes(unit);
    return {
      awardedScore: valueMatches && unitMatches ? maxScore : 0,
      evidence: [
        valueMatches ? '数值在容差内' : '数值超出容差',
        unitMatches ? '单位有效' : '单位不在允许集合',
      ],
      requiresHumanReview: false,
    };
  },
  toQti: (item) =>
    qtiShell(
      item,
      '<qti-text-entry-interaction response-identifier="RESPONSE" />',
      '<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="float" />',
    ),
  validate: (item) => {
    const result = baseValidation(item);
    if (!Number.isFinite(Number(item.interaction.config.answer))) {
      result.errors.push('数值交互必须配置有限数值答案');
    }
    return result;
  },
};

const essayPlugin: InteractionPlugin = {
  createDefaultConfig: () => ({
    minimumWords: 100,
    reference: '',
    rubric: ['观点', '论证', '表达'],
  }),
  createInitialValue: () => '',
  manifest: manifest({
    authoringFields: [
      {
        key: 'minimumWords',
        label: '建议字数',
        required: false,
        type: 'number',
      },
      { key: 'rubric', label: '评分量规', required: true, type: 'strings' },
      { key: 'reference', label: '参考要点', required: false, type: 'string' },
    ],
    channels: {
      online: { mode: 'native', renderer: 'essay.online.v1' },
      print: { mode: 'native', renderer: 'essay.print.v1' },
    },
    description: '短答、论述和案例分析共用文本响应与量规评分。',
    id: 'core.essay',
    qtiInteraction: 'qti-extended-text-interaction',
    scoring: 'human',
    title: '论述交互',
    version: '1.0.0',
  }),
  onlineComponent: EssayInteraction,
  renderPrint: (item, options) => {
    if (options.answerMode === 'answer-key') {
      return printShell(
        item,
        options,
        `<p><strong>参考要点：</strong>${escapeHtml(
          item.interaction.config.reference,
        )}</p><p><strong>量规：</strong>${escapeHtml(
          Array.isArray(item.interaction.config.rubric)
            ? item.interaction.config.rubric.join('；')
            : '',
        )}</p>`,
      );
    }
    const lines = Array.from({ length: 6 }, () => '<i></i>').join('');
    return printShell(
      item,
      options,
      `<div class="answer-lines">${lines}</div>`,
    );
  },
  score: () => manualScore('论述题需要匿名人工评分'),
  toQti: (item) =>
    qtiShell(
      item,
      '<qti-extended-text-interaction response-identifier="RESPONSE" expected-lines="8" />',
      '<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string" />',
    ),
  validate: baseValidation,
};

const filePlugin: InteractionPlugin = {
  createDefaultConfig: () => ({
    allowedTypes: ['application/pdf'],
    maximumMegabytes: 20,
    printSurrogate: '记录电子作品编号并由考务员签字',
    rubric: ['完成度', '准确性', '规范性'],
  }),
  createInitialValue: () => ({ files: [] }),
  manifest: manifest({
    authoringFields: [
      {
        key: 'allowedTypes',
        label: '允许类型',
        required: true,
        type: 'strings',
      },
      {
        key: 'maximumMegabytes',
        label: '文件上限',
        required: true,
        type: 'number',
      },
      {
        key: 'printSurrogate',
        label: '纸质替代策略',
        required: true,
        type: 'string',
      },
    ],
    channels: {
      online: { mode: 'native', renderer: 'file.online.v1' },
      print: { mode: 'examiner-recorded', renderer: 'file.registry.v1' },
    },
    description: '文件元数据、对象存储引用与扫描状态分离。',
    id: 'core.file',
    qtiInteraction: 'qti-upload-interaction',
    scoring: 'human',
    title: '文件作品',
    version: '1.0.0',
  }),
  onlineComponent: FileInteraction,
  renderPrint: (item, options) => {
    if (options.answerMode === 'answer-key') {
      return printShell(
        item,
        options,
        `<p><strong>量规：</strong>${escapeHtml(
          Array.isArray(item.interaction.config.rubric)
            ? item.interaction.config.rubric.join('；')
            : '人工评分',
        )}</p>`,
      );
    }
    return printShell(
      item,
      options,
      `<div class="surrogate">${escapeHtml(
        item.interaction.config.printSurrogate,
      )}：____________</div>`,
    );
  },
  score: () => manualScore('文件作品需完成病毒扫描后按量规人工评分'),
  toQti: (item) =>
    qtiShell(
      item,
      '<qti-upload-interaction response-identifier="RESPONSE" />',
      '<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="file" />',
    ),
  validate: (item) => {
    const result = baseValidation(item);
    if (!item.interaction.config.printSurrogate) {
      result.warnings.push('没有配置纸质替代策略');
    }
    return result;
  },
};

const rubricPlugin: InteractionPlugin = {
  createDefaultConfig: () => ({
    criteria: ['完成度', '准确性', '规范性'],
    examinerCount: 1,
  }),
  createInitialValue: () => ({ examinerEvidence: '', scores: [] }),
  manifest: manifest({
    authoringFields: [
      { key: 'criteria', label: '评分维度', required: true, type: 'strings' },
      {
        key: 'examinerCount',
        label: '考官人数',
        required: true,
        type: 'number',
      },
    ],
    channels: {
      online: {
        mode: 'examiner-recorded',
        renderer: 'rubric.examiner.v1',
      },
      print: {
        mode: 'examiner-recorded',
        renderer: 'rubric.print.v1',
      },
    },
    description: '支持 OSCE、实验、演奏和实操等考官观察评分。',
    id: 'core.rubric',
    scoring: 'human',
    title: '现场量规',
    version: '1.0.0',
  }),
  onlineComponent: RubricInteraction,
  renderPrint: (item, options) => {
    const criteria = Array.isArray(item.interaction.config.criteria)
      ? item.interaction.config.criteria
      : [];
    const rows = criteria
      .map(
        (criterion) =>
          `<tr><td>${escapeHtml(criterion)}</td><td>得分：　　　</td><td>证据：　　　　　　　　　</td></tr>`,
      )
      .join('');
    return printShell(
      item,
      options,
      `<table class="rubric"><tbody>${rows}</tbody></table>`,
    );
  },
  score: () => manualScore('现场量规必须由授权考官记录证据'),
  toQti: (item) =>
    qtiShell(
      item,
      '<qti-extended-text-interaction response-identifier="EXAMINER_EVIDENCE" />',
      '<qti-response-declaration identifier="EXAMINER_EVIDENCE" cardinality="single" base-type="string" />',
    ),
  validate: (item) => {
    const result = baseValidation(item);
    if (!Array.isArray(item.interaction.config.criteria)) {
      result.errors.push('现场量规必须配置评分维度');
    }
    return result;
  },
};

function professionalPlugin(input: {
  description: string;
  id: string;
  printMode: 'equivalent' | 'examiner-recorded';
  sandbox: PluginManifest['sandbox'];
  scoring: PluginManifest['scoring'];
  title: string;
}): InteractionPlugin {
  return {
    createDefaultConfig: () => ({
      instructions: '',
      printSurrogate: '由考官记录专业作品编号与评分证据',
    }),
    createInitialValue: () => '',
    manifest: manifest({
      authoringFields: [
        {
          key: 'instructions',
          label: '专业说明',
          required: true,
          type: 'string',
        },
        {
          key: 'printSurrogate',
          label: '纸质替代策略',
          required: true,
          type: 'string',
        },
      ],
      channels: {
        online: { mode: 'native', renderer: `${input.id}.online.v1` },
        print: {
          mode: input.printMode,
          renderer: `${input.id}.print.v1`,
        },
      },
      description: input.description,
      id: input.id,
      qtiInteraction: 'portable-custom-interaction',
      sandbox: input.sandbox,
      scoring: input.scoring,
      title: input.title,
      version: '1.0.0',
    }),
    onlineComponent:
      input.scoring === 'external' ? EssayInteraction : FileInteraction,
    renderPrint: (item, options) =>
      printShell(
        item,
        options,
        `<div class="surrogate">${escapeHtml(
          item.interaction.config.printSurrogate,
        )}：____________</div>`,
      ),
    score: () => manualScore(`${input.title}由隔离服务或授权考官评分`),
    toQti: (item) =>
      qtiShell(
        item,
        '<qti-custom-interaction response-identifier="RESPONSE" />',
      ),
    validate: baseValidation,
  };
}

const noCodePlugin: InteractionPlugin = {
  createDefaultConfig: () => ({
    templateRevisionId: '',
  }),
  createInitialValue: () => ({}),
  manifest: manifest({
    authoringFields: [
      {
        key: 'templateRevisionId',
        label: '交互模板版本',
        required: true,
        type: 'string',
      },
    ],
    channels: {
      online: { mode: 'native', renderer: 'builder.no-code.online.v1' },
      practical: {
        mode: 'examiner-recorded',
        renderer: 'builder.no-code.practical.v1',
      },
      print: {
        mode: 'equivalent',
        renderer: 'builder.no-code.print.v1',
      },
    },
    description: '教师通过受控基础控件组合交互、评分规则和纸面替代方案。',
    id: 'builder.no-code',
    scoring: 'hybrid',
    title: '无代码组合交互',
    version: '1.0.0',
  }),
  onlineComponent: NoCodeInteraction,
  renderPrint: (item, options) =>
    printShell(
      item,
      options,
      '<div class="no-code-paper-answer">按模板纸面配置作答：________________________________</div>',
    ),
  score: (item, response, maxScore) => {
    const template = schoolAssessmentState.interactionTemplates.find(
      (entry) => entry.id === item.interaction.templateRevisionId,
    );
    if (!template) return manualScore('无代码交互模板版本不存在');
    const values = asObject(response?.value);
    let awardedScore = 0;
    let requiresHumanReview = false;
    const evidence: string[] = [];
    template.scoreRules.forEach((rule) => {
      const value = values[rule.controlId];
      if (['human', 'rubric'].includes(rule.type)) {
        requiresHumanReview = true;
        evidence.push(`${rule.controlId} 等待人工量规评分`);
        return;
      }
      let matched = false;
      switch (rule.type) {
        case 'exact': {
          matched = normalize(value) === normalize(rule.config.expected);

          break;
        }
        case 'range': {
          const expected = Number(rule.config.expected ?? 0);
          const tolerance = Number(rule.config.tolerance ?? 0);
          matched =
            Number.isFinite(Number(value)) &&
            Math.abs(Number(value) - expected) <= tolerance;

          break;
        }
        case 'regex': {
          try {
            matched = new RegExp(String(rule.config.pattern ?? '')).test(
              String(value ?? ''),
            );
          } catch {
            matched = false;
          }

          break;
        }
        case 'set-match': {
          const expected = Array.isArray(rule.config.expected)
            ? rule.config.expected.map((entry) => normalize(entry)).toSorted()
            : [];
          const actual = Array.isArray(value)
            ? value.map((entry) => normalize(entry)).toSorted()
            : [];
          matched = JSON.stringify(expected) === JSON.stringify(actual);

          break;
        }
        // No default
      }
      if (matched) {
        awardedScore += maxScore * rule.weight;
        evidence.push(`${rule.controlId} 规则命中`);
      } else {
        evidence.push(`${rule.controlId} 规则未命中`);
      }
    });
    return {
      awardedScore: Math.round(awardedScore * 100) / 100,
      evidence,
      requiresHumanReview,
    };
  },
  toQti: (item) =>
    qtiShell(item, '<qti-custom-interaction response-identifier="RESPONSE" />'),
  validate: baseValidation,
};

[
  choicePlugin,
  fillPlugin,
  numericPlugin,
  essayPlugin,
  filePlugin,
  rubricPlugin,
  noCodePlugin,
  professionalPlugin({
    description:
      '代码执行请求只包含代码、语言和测试集引用，由无网络一次性容器判定。',
    id: 'professional.programming',
    printMode: 'equivalent',
    sandbox: 'isolated-container',
    scoring: 'external',
    title: '程序设计沙箱',
  }),
  professionalPlugin({
    description:
      '医学影像资源通过受控查看器呈现，标注坐标与窗宽窗位结构化保存。',
    id: 'professional.medical-imaging',
    printMode: 'examiner-recorded',
    sandbox: 'signed-iframe',
    scoring: 'human',
    title: '医学影像标注',
  }),
  professionalPlugin({
    description:
      'CAD 文件交由签名专业工具处理，主平台只保存作品引用和评分证据。',
    id: 'professional.cad',
    printMode: 'examiner-recorded',
    sandbox: 'signed-iframe',
    scoring: 'external',
    title: '工程 CAD 作品',
  }),
  professionalPlugin({
    description: '录音上传、转码和语音证据由媒体服务处理，最终成绩需人工确认。',
    id: 'professional.oral',
    printMode: 'examiner-recorded',
    sandbox: 'none',
    scoring: 'hybrid',
    title: '语言口试',
  }),
].forEach((plugin) => plugins.set(plugin.manifest.id, plugin));

export function getPlugin(id: string) {
  const plugin = plugins.get(id);
  if (!plugin) throw new Error(`交互插件未注册：${id}`);
  return plugin;
}

export function listPlugins() {
  return [...plugins.values()].toSorted((left, right) =>
    left.manifest.title.localeCompare(right.manifest.title, 'zh-CN'),
  );
}

export function registerPlugin(
  plugin: InteractionPlugin,
  options: { replace?: boolean } = {},
) {
  if (plugins.has(plugin.manifest.id) && !options.replace) {
    throw new Error(`交互插件已存在：${plugin.manifest.id}`);
  }
  if (plugin.manifest.version.trim().length === 0) {
    throw new Error('插件必须声明语义化版本');
  }
  plugins.set(plugin.manifest.id, plugin);
  return plugin;
}

export function scoreWithPlugin(
  item: AssessmentItemRevision,
  response: ResponseEnvelope | undefined,
  maxScore: number,
) {
  return getPlugin(item.interaction.pluginId).score(item, response, maxScore);
}

export function validateItemChannels(
  item: AssessmentItemRevision,
  channels: DeliveryChannel[],
) {
  const plugin = getPlugin(item.interaction.pluginId);
  const issues: CompatibilityIssue[] = [];
  const validation = plugin.validate(item);
  validation.errors.forEach((message) => {
    issues.push({
      blocking: true,
      channel: channels[0] ?? 'online',
      code: 'ITEM_INVALID',
      itemRevisionId: item.id,
      message,
    });
  });
  for (const channel of channels) {
    const variant = item.channelVariants.find(
      (entry) => entry.channel === channel,
    );
    const capability = plugin.manifest.channels[channel];
    if (!variant || variant.mode === 'unsupported') {
      issues.push({
        blocking: true,
        channel,
        code: 'VARIANT_MISSING',
        itemRevisionId: item.id,
        message: `题目没有${channel === 'online' ? '机考' : '纸质'}变体`,
      });
      continue;
    }
    if (!capability || capability.mode === 'unsupported') {
      issues.push({
        blocking: true,
        channel,
        code: 'RENDERER_MISSING',
        itemRevisionId: item.id,
        message: `插件没有${channel === 'online' ? '机考' : '纸质'}呈现器`,
      });
    } else if (
      capability.mode === 'equivalent' ||
      variant.mode === 'equivalent'
    ) {
      issues.push({
        blocking: false,
        channel,
        code: 'EQUIVALENT_REVIEW',
        itemRevisionId: item.id,
        message: '使用等价变体，发布前需要命题人确认',
      });
    }
  }
  return issues;
}
