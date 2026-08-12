<script lang="ts" setup>
import type {
  TemplateDefinition,
  TemplateResponseType,
  TemplateStructure,
} from '../template-schema';

import { computed, ref, toRaw } from 'vue';

import {
  Button,
  Checkbox,
  Form,
  InputNumber,
  Radio,
  Select,
  Space,
  Switch,
  Tag,
} from 'ant-design-vue';

import {
  CONTENT_OPTIONS,
  materializeTemplate,
  PROFESSIONAL_TOOL_OPTIONS,
  RESPONSE_OPTIONS,
  STRUCTURE_OPTIONS,
} from '../template-schema';
import QuestionPreview from './QuestionPreview.vue';

defineOptions({ name: 'TemplateDesigner' });

type DesignerMode = 'design' | 'preview';
type SelectedZone =
  | 'advanced'
  | 'response'
  | 'stem'
  | 'stimulus'
  | 'subQuestions';

const definition = defineModel<TemplateDefinition>({ required: true });
const mode = ref<DesignerMode>('design');
const selectedZone = ref<SelectedZone>('stem');
const previewResponseType = ref<TemplateResponseType>();

const INLINE_RESPONSE_LABELS: Partial<Record<TemplateResponseType, string>> = {
  choice: '每空独立四选一（A/B/C/D）',
  formula: '公式填空',
  multi_choice: '每空独立多选',
  number: '数值填空',
  shared_options: '共享词库选词填空（如15选10）',
  text_short: '文本填空',
  true_false: '每空判断',
};

function responseLabel(value: TemplateResponseType) {
  const inlineLabel = INLINE_RESPONSE_LABELS[value];
  if (definition.value.structure === 'inline' && inlineLabel) {
    return inlineLabel;
  }
  return RESPONSE_OPTIONS.find((item) => item.value === value)?.label || value;
}

const structureHelp: Record<TemplateStructure, string> = {
  group: '一大题内包含多道同类或混合小题',
  inline: '答案空直接出现在题干内容中',
  single: '一个题干配一个主要作答区',
  steps: '多个步骤前后关联并分别计分',
  stimulus: '一份共享材料带多道独立小题',
};

const responseLabels = computed(() =>
  definition.value.responseTypes.map((value) => responseLabel(value)),
);

const availableResponseOptions = computed(() => {
  if (definition.value.structure !== 'inline') return RESPONSE_OPTIONS;
  const inlineTypes = new Set<TemplateResponseType>([
    'choice',
    'formula',
    'multi_choice',
    'number',
    'shared_options',
    'text_short',
    'true_false',
  ]);
  return RESPONSE_OPTIONS.filter((item) => inlineTypes.has(item.value)).map(
    (item) => ({
      ...item,
      label: INLINE_RESPONSE_LABELS[item.value] || item.label,
    }),
  );
});

const isQuestionGroup = computed(
  () =>
    definition.value.structure === 'group' ||
    definition.value.structure === 'steps' ||
    definition.value.structure === 'stimulus',
);

const isInlineQuestion = computed(
  () => definition.value.structure === 'inline',
);

const fixedResponseLabel = computed(() =>
  responseLabel(definition.value.responseSelection.fixedType),
);

const contentLabels = computed(() =>
  definition.value.stimulus.allowedContent.map(
    (value) =>
      CONTENT_OPTIONS.find((item) => item.value === value)?.label || value,
  ),
);

const previewResponseOptions = computed(() =>
  definition.value.responseTypes.map((value) => ({
    label: responseLabel(value),
    value,
  })),
);

const activePreviewResponse = computed<TemplateResponseType>(
  () =>
    (previewResponseType.value &&
    definition.value.responseTypes.includes(previewResponseType.value)
      ? previewResponseType.value
      : definition.value.responseTypes[0]) || 'text_long',
);

const skeletonQuestionCount = computed(() =>
  definition.value.subQuestions.countMode === 'fixed'
    ? Math.min(3, Math.max(1, definition.value.subQuestions.fixedCount))
    : 2,
);

const previewComponents = computed(() => {
  const snapshot = structuredClone(toRaw(definition.value));
  snapshot.responseTypes = [activePreviewResponse.value];
  snapshot.responseSelection = {
    mode: 'fixed',
    fixedType: activePreviewResponse.value,
  };
  if (snapshot.subQuestions.enabled) {
    const count =
      snapshot.subQuestions.countMode === 'fixed'
        ? snapshot.subQuestions.fixedCount
        : Math.max(3, snapshot.subQuestions.min);
    snapshot.subQuestions.countMode = 'fixed';
    snapshot.subQuestions.fixedCount = Math.min(4, Math.max(1, count));
  }
  const components = materializeTemplate(snapshot);
  for (const component of components) {
    if (component.type === 'rich_stem') {
      component.config.html = snapshot.stimulus.enabled
        ? '阅读下面的示例材料，并完成后面各小题。这里可以放置文章、病例、实验数据、图片或音视频。'
        : '这是使用当前模板创建的题目示例，请按要求完成作答。';
    }
    if (component.type === 'cloze') {
      const blankCount = Math.max(1, snapshot.inlineAnswers.maxBlanks);
      component.config.passage = `请完成下面各空：${Array.from(
        { length: blankCount },
        (_, index) => `第 ${index + 1} 空 [[${index + 1}]]`,
      ).join('；')}。`;
      if (activePreviewResponse.value === 'shared_options') {
        const optionCount = Math.min(
          snapshot.optionPool.maxOptions,
          Math.max(snapshot.optionPool.minOptions, blankCount + 5),
        );
        component.config.options = Array.from(
          { length: optionCount },
          (_, index) => ({
            key: String.fromCodePoint(65 + index),
            text: `词库选项 ${String.fromCodePoint(65 + index)}`,
          }),
        );
      }
      if (
        ['choice', 'multi_choice'].includes(activePreviewResponse.value) &&
        Array.isArray(component.config.blanks)
      ) {
        component.config.blanks.forEach((blank: any, blankIndex: number) => {
          blank.options = ['A', 'B', 'C', 'D'].map((key) => ({
            key,
            text: `第 ${blankIndex + 1} 空选项 ${key}`,
          }));
        });
      }
      component.config.blankCount = blankCount;
    }
    if (component.type === 'code_editor') {
      component.config.starterCode =
        '# 请在这里编写代码\n\ndef solve():\n    pass';
    }
    component.children?.forEach((child, index) => {
      child.config.prompt = `第 ${index + 1} 小题：请判断或完成下面的问题。`;
      if (child.type === 'code_editor') {
        child.config.starterCode =
          '# 请在这里编写代码\n\ndef solve():\n    pass';
      }
    });
  }
  return components;
});

const zoneTitle = computed(() => {
  const titles: Record<SelectedZone, string> = {
    stem: '题干区域',
    stimulus: '共享材料区域',
    subQuestions: '小题结构',
    response: '作答区域',
    advanced: '评分与专业能力',
  };
  return titles[selectedZone.value];
});

function onStructureChange(value: TemplateStructure) {
  mode.value = 'design';
  definition.value.structure = value;
  switch (value) {
    case 'group': {
      definition.value.stimulus.enabled = false;
      definition.value.subQuestions.enabled = true;
      definition.value.subQuestions.countMode = 'fixed';
      definition.value.subQuestions.fixedCount = Math.max(
        2,
        definition.value.subQuestions.fixedCount,
      );
      definition.value.subQuestions.repeatable = false;
      definition.value.subQuestions.min = Math.max(
        2,
        definition.value.subQuestions.min,
      );
      definition.value.subQuestions.max = Math.max(
        20,
        definition.value.subQuestions.max,
      );
      definition.value.inlineAnswers.enabled = false;
      definition.value.dependencies.allowPreviousAnswerReference = false;
      definition.value.dependencies.allowCarryForward = false;
      selectedZone.value = 'subQuestions';

      break;
    }
    case 'inline': {
      definition.value.stimulus.enabled = false;
      definition.value.subQuestions.enabled = false;
      definition.value.inlineAnswers.enabled = true;
      definition.value.responseSelection.mode = 'fixed';
      definition.value.responseSelection.fixedType = 'shared_options';
      definition.value.responseTypes = ['shared_options'];
      previewResponseType.value = 'shared_options';
      selectedZone.value = 'response';

      break;
    }
    case 'single': {
      definition.value.stimulus.enabled = false;
      definition.value.subQuestions.enabled = false;
      definition.value.inlineAnswers.enabled = false;
      selectedZone.value = 'stem';

      break;
    }
    case 'steps': {
      definition.value.stimulus.enabled = false;
      definition.value.subQuestions.enabled = true;
      definition.value.subQuestions.countMode = 'range';
      definition.value.subQuestions.repeatable = true;
      definition.value.inlineAnswers.enabled = false;
      definition.value.dependencies.allowPreviousAnswerReference = true;
      selectedZone.value = 'subQuestions';

      break;
    }
    case 'stimulus': {
      definition.value.stimulus.enabled = true;
      definition.value.stimulus.required = true;
      definition.value.subQuestions.enabled = true;
      definition.value.subQuestions.countMode = 'range';
      definition.value.subQuestions.repeatable = true;
      definition.value.inlineAnswers.enabled = false;
      definition.value.subQuestions.min = Math.max(
        1,
        definition.value.subQuestions.min,
      );
      definition.value.subQuestions.max = Math.max(
        10,
        definition.value.subQuestions.max,
      );
      selectedZone.value = 'stimulus';

      break;
    }
  }
}

function onResponseModeChange(mode: 'fixed' | 'selectable') {
  definition.value.responseSelection.mode = mode;
  if (mode === 'fixed') {
    const fixedType =
      definition.value.responseSelection.fixedType ||
      definition.value.responseTypes[0] ||
      'choice';
    definition.value.responseSelection.fixedType = fixedType;
    definition.value.responseTypes = [fixedType];
    previewResponseType.value = fixedType;
  }
}

function onFixedResponseChange(type: TemplateResponseType) {
  definition.value.responseSelection.fixedType = type;
  definition.value.responseTypes = [type];
  previewResponseType.value = type;
  if (definition.value.structure === 'inline') {
    definition.value.inlineAnswers.enabled = true;
    definition.value.optionPool.enabled = type === 'shared_options';
  }
}

function onResponseChange(values: TemplateResponseType[]) {
  definition.value.responseTypes = values;
  if (definition.value.structure === 'inline') {
    definition.value.inlineAnswers.enabled = true;
    definition.value.optionPool.enabled = values.includes('shared_options');
  }
}

function onSubQuestionCountModeChange(mode: 'fixed' | 'range') {
  definition.value.subQuestions.countMode = mode;
  if (mode === 'fixed') {
    const count = Math.max(
      1,
      definition.value.subQuestions.fixedCount ||
        definition.value.subQuestions.min ||
        1,
    );
    definition.value.subQuestions.fixedCount = count;
    definition.value.subQuestions.min = count;
    definition.value.subQuestions.max = count;
    definition.value.subQuestions.repeatable = false;
  } else {
    definition.value.subQuestions.repeatable = true;
    definition.value.subQuestions.min = Math.max(
      1,
      definition.value.subQuestions.min,
    );
    definition.value.subQuestions.max = Math.max(
      definition.value.subQuestions.min,
      definition.value.subQuestions.max,
    );
  }
}

function onFixedSubQuestionCountChange(value: unknown) {
  const count = Math.max(1, Number(value || 1));
  definition.value.subQuestions.fixedCount = count;
  definition.value.subQuestions.min = count;
  definition.value.subQuestions.max = count;
}

function selectZone(zone: SelectedZone) {
  selectedZone.value = zone;
  mode.value = 'design';
}
</script>

<template>
  <div class="td">
    <div class="td-toolbar">
      <div>
        <strong>先搭出题目骨架，再设置每个区域的规则</strong>
        <p>中间就是教师以后创建题目时看到的结构，点击任一区域可配置。</p>
      </div>
      <Space>
        <Button
          :type="mode === 'design' ? 'primary' : 'default'"
          @click="mode = 'design'"
        >
          设计模板
        </Button>
        <Button
          :type="mode === 'preview' ? 'primary' : 'default'"
          @click="mode = 'preview'"
        >
          示例预览
        </Button>
      </Space>
    </div>

    <div class="td-workbench">
      <aside class="td-structures">
        <div class="td-panel-title">
          <strong>选择题目骨架</strong>
          <span>选择最接近的结构作为起点</span>
        </div>
        <button
          v-for="item in STRUCTURE_OPTIONS"
          :key="item.value"
          type="button"
          class="td-structure"
          :class="{ active: definition.structure === item.value }"
          @click="onStructureChange(item.value as TemplateStructure)"
        >
          <span class="td-miniature" :class="`is-${item.value}`">
            <i></i><i></i><i></i>
          </span>
          <span>
            <strong>{{ item.label }}</strong>
            <small>{{ structureHelp[item.value as TemplateStructure] }}</small>
          </span>
        </button>
      </aside>

      <main class="td-canvas">
        <div class="td-canvas-head">
          <div>
            <span class="td-eyebrow">
              {{ mode === 'design' ? '题目骨架' : '学生端效果示例' }}
            </span>
            <strong>
              {{
                STRUCTURE_OPTIONS.find(
                  (item) => item.value === definition.structure,
                )?.label
              }}
            </strong>
          </div>
          <Tag v-if="mode === 'design'" color="blue">点击区域进行设置</Tag>
          <Tag v-else color="green">仅用于说明最终形态</Tag>
        </div>

        <div v-if="mode === 'design'" class="td-paper">
          <button
            v-if="definition.stimulus.enabled"
            type="button"
            class="td-zone td-material"
            :class="{ selected: selectedZone === 'stimulus' }"
            @click="selectZone('stimulus')"
          >
            <span class="td-zone-name">
              共享材料
              <Tag v-if="definition.stimulus.required" color="red">必填</Tag>
            </span>
            <strong>文章、病例、实验背景或图表</strong>
            <small>
              允许：{{
                contentLabels.length > 0 ? contentLabels.join('、') : '未设置'
              }}
            </small>
          </button>

          <div
            v-if="definition.structure === 'inline'"
            class="td-question-frame"
          >
            <button
              type="button"
              class="td-zone td-inline-stem"
              :class="{ selected: selectedZone === 'stem' }"
              @click="selectZone('stem')"
            >
              <span class="td-zone-name">题干内容</span>
              <p>
                教师在这里录入题目内容，答案空将直接嵌入句子中：
                <b class="td-blank">答案空 1</b>
                ，然后继续录入内容
                <b class="td-blank">答案空 2</b>
                。
              </p>
            </button>
            <button
              type="button"
              class="td-zone td-option-pool"
              :class="{ selected: selectedZone === 'response' }"
              @click="selectZone('response')"
            >
              <span class="td-zone-name">题干内答案规则</span>
              <small>
                {{ definition.inlineAnswers.maxBlanks }} 个空
                <span v-if="definition.optionPool.enabled">· 共用选项池</span>
              </small>
            </button>
          </div>

          <div
            v-else-if="definition.subQuestions.enabled"
            class="td-question-list"
          >
            <div
              v-for="index in skeletonQuestionCount"
              :key="index"
              class="td-question-frame td-sub-question"
            >
              <button
                type="button"
                class="td-zone td-stem"
                :class="{ selected: selectedZone === 'subQuestions' }"
                @click="selectZone('subQuestions')"
              >
                <span class="td-question-number">{{ index }}</span>
                <span>
                  <span class="td-zone-name">
                    {{
                      definition.structure === 'steps'
                        ? `第 ${index} 步`
                        : `第 ${index} 小题`
                    }}
                  </span>
                  <small>每道小题都有独立题干</small>
                </span>
              </button>
              <button
                type="button"
                class="td-zone td-answer"
                :class="{ selected: selectedZone === 'response' }"
                @click="selectZone('response')"
              >
                <span class="td-zone-name">作答区</span>
                <span class="td-response-tags">
                  <Tag v-for="label in responseLabels.slice(0, 3)" :key="label">
                    {{ label }}
                  </Tag>
                  <small v-if="responseLabels.length > 3">
                    +{{ responseLabels.length - 3 }}
                  </small>
                </span>
              </button>
            </div>
            <button
              v-if="definition.subQuestions.countMode === 'range'"
              type="button"
              class="td-add-question"
              :class="{ selected: selectedZone === 'subQuestions' }"
              @click="selectZone('subQuestions')"
            >
              ＋ 教师可继续添加小题
            </button>
            <div v-else class="td-fixed-question-count">
              已固定
              {{ definition.subQuestions.fixedCount }} 道小题，创建后不可增删
            </div>
          </div>

          <div v-else class="td-question-frame">
            <button
              type="button"
              class="td-zone td-stem"
              :class="{ selected: selectedZone === 'stem' }"
              @click="selectZone('stem')"
            >
              <span class="td-zone-name">题干</span>
              <strong>教师在这里录入具体题目内容</strong>
              <small>支持文字、图片和附件</small>
            </button>
            <button
              type="button"
              class="td-zone td-answer td-answer-large"
              :class="{ selected: selectedZone === 'response' }"
              @click="selectZone('response')"
            >
              <span class="td-zone-name">作答区</span>
              <span class="td-response-tags">
                <Tag v-for="label in responseLabels" :key="label">{{
                  label
                }}</Tag>
              </span>
            </button>
          </div>

          <button
            type="button"
            class="td-advanced-entry"
            :class="{ selected: selectedZone === 'advanced' }"
            @click="selectZone('advanced')"
          >
            评分、步骤关联和专业工具
            <span>默认 {{ definition.defaultScoring.score }} 分</span>
          </button>
        </div>

        <div v-else class="td-preview-shell">
          <div class="td-preview-toolbar">
            <div>
              <strong>真实作答组件预览</strong>
              <span>可以直接操作，效果与学生答题页面一致</span>
            </div>
            <Select
              v-model:value="previewResponseType"
              style="width: 190px"
              :options="previewResponseOptions"
              :placeholder="
                previewResponseOptions.length > 0
                  ? '选择要预览的作答方式'
                  : '尚未选择作答方式'
              "
            />
          </div>
          <div class="td-paper td-preview">
            <QuestionPreview
              title="题目模板效果示例"
              :components="previewComponents"
            />
          </div>
        </div>
      </main>

      <aside class="td-settings">
        <div class="td-panel-title">
          <strong>{{ zoneTitle }}</strong>
          <span>这里只设置当前区域</span>
        </div>
        <div class="td-zone-nav">
          <button
            type="button"
            :class="{ active: selectedZone === 'stem' }"
            @click="selectZone('stem')"
          >
            题干
          </button>
          <button
            type="button"
            :class="{ active: selectedZone === 'stimulus' }"
            @click="selectZone('stimulus')"
          >
            材料
          </button>
          <button
            type="button"
            :class="{ active: selectedZone === 'subQuestions' }"
            @click="selectZone('subQuestions')"
          >
            小题
          </button>
          <button
            type="button"
            :class="{ active: selectedZone === 'response' }"
            @click="selectZone('response')"
          >
            作答
          </button>
          <button
            type="button"
            :class="{ active: selectedZone === 'advanced' }"
            @click="selectZone('advanced')"
          >
            高级
          </button>
        </div>

        <div class="td-setting-body">
          <div v-if="selectedZone === 'stem'" class="td-setting-intro">
            <strong>每道题都包含题干</strong>
            <p>
              模板只规定题干位置，不填写具体内容。教师创建题目时再录入文字、图片或附件。
            </p>
          </div>

          <Form v-else-if="selectedZone === 'stimulus'" layout="vertical">
            <div class="td-switch-row">
              <div>
                <strong>启用共享材料</strong>
                <p>文章、病例、实验背景可被多道小题共同使用。</p>
              </div>
              <Switch v-model:checked="definition.stimulus.enabled" />
            </div>
            <template v-if="definition.stimulus.enabled">
              <Form.Item label="创建题目时材料必须填写">
                <Switch v-model:checked="definition.stimulus.required" />
              </Form.Item>
              <Form.Item label="材料允许包含">
                <Checkbox.Group
                  v-model:value="definition.stimulus.allowedContent"
                  :options="CONTENT_OPTIONS"
                  class="td-check-list"
                />
              </Form.Item>
            </template>
          </Form>

          <Form v-else-if="selectedZone === 'subQuestions'" layout="vertical">
            <div class="td-setting-intro">
              <strong>一大题内包含多道小题</strong>
              <p>每道小题都有自己的题干、答案和分值。</p>
            </div>
            <template v-if="definition.subQuestions.enabled">
              <Form.Item label="小题数量方式" class="mt-4">
                <Radio.Group
                  :value="definition.subQuestions.countMode"
                  button-style="solid"
                  @update:value="
                    (value) =>
                      onSubQuestionCountModeChange(value as 'fixed' | 'range')
                  "
                >
                  <Radio.Button value="fixed">固定数量</Radio.Button>
                  <Radio.Button value="range">允许增减</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item
                v-if="definition.subQuestions.countMode === 'fixed'"
                label="固定小题数量"
              >
                <InputNumber
                  :value="definition.subQuestions.fixedCount"
                  :min="1"
                  :max="200"
                  style="width: 100%"
                  @update:value="onFixedSubQuestionCountChange"
                />
                <p class="td-field-help">
                  创建题目时自动生成指定数量的小题，教师不能增加或删除。
                </p>
              </Form.Item>
              <Space v-else>
                <Form.Item label="最少">
                  <InputNumber
                    v-model:value="definition.subQuestions.min"
                    :min="0"
                    :max="100"
                  />
                </Form.Item>
                <Form.Item label="最多">
                  <InputNumber
                    v-model:value="definition.subQuestions.max"
                    :min="1"
                    :max="200"
                  />
                </Form.Item>
              </Space>
            </template>
          </Form>

          <Form v-else-if="selectedZone === 'response'" layout="vertical">
            <div class="td-response-rule-title">
              <strong>作答区如何生成？</strong>
              <span>选择后，下方会直接说明创建题目时的效果。</span>
            </div>

            <div class="td-response-rule-list">
              <div
                class="td-response-rule-card"
                :class="{
                  active: definition.responseSelection.mode === 'fixed',
                }"
                @click="onResponseModeChange('fixed')"
              >
                <div class="td-response-rule-head">
                  <Radio
                    :checked="definition.responseSelection.mode === 'fixed'"
                  />
                  <span>
                    <strong>
                      {{
                        isInlineQuestion
                          ? '所有空位统一使用一种方式'
                          : isQuestionGroup
                            ? '所有小题使用同一种题型'
                            : '模板直接生成指定作答区'
                      }}
                    </strong>
                    <small>
                      {{
                        isInlineQuestion
                          ? '例如所有空都是 A/B/C/D 单选，或全部为文本填空'
                          : isQuestionGroup
                            ? '适合整组判断题、整组单选题等统一题型'
                            : '适合明确的单选、判断、代码或绘图模板'
                      }}
                    </small>
                  </span>
                </div>
                <Select
                  v-if="definition.responseSelection.mode === 'fixed'"
                  :value="definition.responseSelection.fixedType"
                  :options="availableResponseOptions"
                  style="width: 100%"
                  @click.stop
                  @update:value="
                    (value) =>
                      onFixedResponseChange(value as TemplateResponseType)
                  "
                />
                <div
                  v-if="definition.responseSelection.mode === 'fixed'"
                  class="td-response-result"
                >
                  最终效果：
                  <template v-if="isInlineQuestion">
                    每个空位都生成“{{ fixedResponseLabel }}”作答控件
                  </template>
                  <template v-else-if="isQuestionGroup">
                    每一道小题都直接生成“{{ fixedResponseLabel }}”作答区
                  </template>
                  <template v-else>
                    创建题目后直接显示“{{ fixedResponseLabel }}”作答区
                  </template>
                </div>
              </div>

              <div
                class="td-response-rule-card"
                :class="{
                  active: definition.responseSelection.mode === 'selectable',
                }"
                @click="onResponseModeChange('selectable')"
              >
                <div class="td-response-rule-head">
                  <Radio
                    :checked="
                      definition.responseSelection.mode === 'selectable'
                    "
                  />
                  <span>
                    <strong>
                      {{
                        isInlineQuestion
                          ? '每个空位可以分别选择方式'
                          : isQuestionGroup
                            ? '每道小题可以分别选择题型'
                            : '创建具体题目时再选择作答区'
                      }}
                    </strong>
                    <small>
                      {{
                        isInlineQuestion
                          ? '适合一题中同时包含文本空、公式空和 A/B/C/D 选择空'
                          : isQuestionGroup
                            ? '适合一道大题中混合单选、判断、填空等题型'
                            : '适合作为通用单题模板，由教师创建题目时决定'
                      }}
                    </small>
                  </span>
                </div>
                <Checkbox.Group
                  v-if="definition.responseSelection.mode === 'selectable'"
                  :value="definition.responseTypes"
                  class="td-response-grid"
                  @click.stop
                  @update:value="
                    (values) =>
                      onResponseChange(values as TemplateResponseType[])
                  "
                >
                  <Checkbox
                    v-for="item in availableResponseOptions"
                    :key="item.value"
                    :value="item.value"
                  >
                    {{ item.label }}
                  </Checkbox>
                </Checkbox.Group>
                <div
                  v-if="definition.responseSelection.mode === 'selectable'"
                  class="td-response-result"
                >
                  最终效果：
                  {{
                    isInlineQuestion
                      ? '创建题目时，可以为每个空分别选择一种允许的方式'
                      : isQuestionGroup
                        ? '创建每道小题时，从勾选的题型中分别选择'
                        : '创建题目时，从勾选的题型中选择一种'
                  }}
                </div>
              </div>
            </div>

            <div
              v-if="
                definition.responseSelection.mode === 'fixed' &&
                definition.responseSelection.fixedType === 'true_false'
              "
              class="td-judgment-preview"
            >
              <strong>实际生成的判断作答区</strong>
              <Radio.Group>
                <Radio value="true">正确</Radio>
                <Radio value="false">错误</Radio>
              </Radio.Group>
            </div>

            <template
              v-if="
                definition.structure === 'inline' ||
                definition.inlineAnswers.enabled ||
                definition.responseTypes.includes('shared_options')
              "
            >
              <div class="td-divider">空位规则</div>
              <Form.Item label="空位数量">
                <InputNumber
                  v-model:value="definition.inlineAnswers.maxBlanks"
                  :min="1"
                  :max="200"
                />
              </Form.Item>
              <div
                v-if="definition.responseTypes.includes('shared_options')"
                class="td-switch-row"
              >
                <div>
                  <strong>多个空共用选项池</strong>
                  <p>已选择共享选项作答，所有空位共用同一组选项。</p>
                </div>
                <Tag color="blue">已启用</Tag>
              </div>
              <template
                v-if="definition.responseTypes.includes('shared_options')"
              >
                <Space>
                  <Form.Item label="最少选项">
                    <InputNumber
                      v-model:value="definition.optionPool.minOptions"
                      :min="1"
                    />
                  </Form.Item>
                  <Form.Item label="最多选项">
                    <InputNumber
                      v-model:value="definition.optionPool.maxOptions"
                      :min="1"
                    />
                  </Form.Item>
                </Space>
                <Form.Item label="选项使用规则">
                  <Radio.Group v-model:value="definition.optionPool.reuse">
                    <Radio value="once">只能使用一次</Radio>
                    <Radio value="repeatable">允许重复使用</Radio>
                  </Radio.Group>
                </Form.Item>
                <Form.Item label="允许多余干扰项">
                  <Switch
                    v-model:checked="definition.optionPool.allowDistractors"
                  />
                </Form.Item>
              </template>
            </template>
          </Form>

          <Form v-else layout="vertical">
            <div class="td-divider">默认评分</div>
            <Space wrap>
              <Form.Item label="默认分值">
                <InputNumber
                  v-model:value="definition.defaultScoring.score"
                  :min="0"
                />
              </Form.Item>
              <Form.Item label="评分方式">
                <Select
                  v-model:value="definition.defaultScoring.judgeMode"
                  style="width: 130px"
                  :options="[
                    { label: '自动评分', value: 'auto' },
                    { label: '人工评分', value: 'manual' },
                    { label: '不评分', value: 'none' },
                  ]"
                />
              </Form.Item>
            </Space>
            <Form.Item label="多空或多步骤计分">
              <Select
                v-model:value="definition.defaultScoring.scoreStrategy"
                :options="[
                  { label: '按空或步骤部分给分', value: 'partial' },
                  { label: '全部正确才给分', value: 'all_or_nothing' },
                ]"
              />
            </Form.Item>

            <div class="td-divider">步骤关联</div>
            <Form.Item label="后一步可引用前一步答案">
              <Switch
                v-model:checked="
                  definition.dependencies.allowPreviousAnswerReference
                "
              />
            </Form.Item>
            <Form.Item label="错误答案可带入后续步骤继续评分">
              <Switch
                v-model:checked="definition.dependencies.allowCarryForward"
              />
            </Form.Item>

            <div class="td-divider">专业工具</div>
            <Checkbox.Group
              v-model:value="definition.professionalTools"
              :options="PROFESSIONAL_TOOL_OPTIONS"
              class="td-check-list"
            />
          </Form>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.td {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  box-shadow: 0 8px 30px rgb(15 23 42 / 6%);
}

.td-toolbar {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background:
    linear-gradient(90deg, hsl(var(--primary) / 7%), transparent 35%),
    hsl(var(--muted) / 28%);
  border-bottom: 1px solid hsl(var(--border));
}

.td-toolbar p,
.td-panel-title span,
.td-setting-intro p,
.td-switch-row p {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: hsl(var(--muted-foreground));
}

.td-workbench {
  display: grid;
  flex: 1;
  grid-template-columns: 228px minmax(420px, 1fr) 330px;
  min-height: 0;
  overflow: hidden;
}

.td-structures,
.td-settings {
  min-width: 0;
  background: hsl(var(--background));
}

.td-structures {
  padding: 14px 12px;
  overflow-y: auto;
  border-right: 1px solid hsl(var(--border));
}

.td-settings {
  overflow-y: auto;
  border-left: 1px solid hsl(var(--border));
}

.td-structures,
.td-settings,
.td-setting-body {
  scrollbar-width: none;
}

.td-structures::-webkit-scrollbar,
.td-settings::-webkit-scrollbar,
.td-setting-body::-webkit-scrollbar {
  display: none;
}

.td-panel-title {
  display: flex;
  flex-direction: column;
  padding: 2px 4px 14px;
}

.td-structure {
  display: grid;
  grid-template-columns: 46px 1fr;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 10px;
  margin-bottom: 8px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
}

.td-structure:hover {
  background: hsl(var(--muted) / 45%);
}

.td-structure.active {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 7%);
  border-color: hsl(var(--primary) / 45%);
}

.td-structure strong,
.td-structure small {
  display: block;
}

.td-structure small {
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.35;
  color: hsl(var(--muted-foreground));
}

.td-miniature {
  display: flex;
  flex-direction: column;
  gap: 3px;
  justify-content: center;
  width: 44px;
  height: 38px;
  padding: 5px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 5px;
}

.td-miniature i {
  display: block;
  height: 4px;
  background: hsl(var(--muted-foreground) / 30%);
  border-radius: 3px;
}

.td-miniature.is-inline i:nth-child(2) {
  width: 45%;
  margin-left: 16px;
  background: hsl(var(--primary) / 55%);
}

.td-miniature.is-stimulus i:first-child {
  height: 11px;
}

.td-miniature.is-stimulus i:not(:first-child),
.td-miniature.is-group i,
.td-miniature.is-steps i {
  width: 75%;
  margin-left: 8px;
}

.td-miniature.is-visual i:nth-child(2) {
  height: 13px;
  background: hsl(var(--primary) / 24%);
}

.td-miniature.is-submission i:last-child {
  width: 50%;
  height: 10px;
  margin: auto;
  background: transparent;
  border: 1px dashed hsl(var(--primary) / 55%);
}

.td-canvas {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 0, hsl(var(--primary) / 7%), transparent 42%),
    hsl(var(--muted) / 24%);
}

.td-canvas-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.td-canvas-head > div {
  display: flex;
  flex-direction: column;
}

.td-eyebrow {
  margin-bottom: 2px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.td-paper {
  flex: 1;
  min-height: 0;
  padding: 24px;
  overflow-y: auto;
  scrollbar-width: none;
  background: white;
  border: 1px solid hsl(var(--border));
  border-radius: 9px;
  box-shadow: 0 5px 20px rgb(15 23 42 / 5%);
}

.td-paper::-webkit-scrollbar {
  display: none;
}

.dark .td-paper {
  background: hsl(var(--card));
}

.td-zone {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
}

.td-zone:hover,
.td-zone.selected,
.td-add-question.selected,
.td-advanced-entry.selected {
  background: hsl(var(--primary) / 5%);
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 8%);
}

.td-zone small {
  color: hsl(var(--muted-foreground));
}

.td-zone-name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--primary));
}

.td-material {
  min-height: 116px;
  margin-bottom: 16px;
  background: hsl(210deg 80% 98%);
}

.dark .td-material {
  background: hsl(var(--muted) / 30%);
}

.td-question-frame {
  padding: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 9px;
}

.td-question-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.td-sub-question {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42%;
  gap: 10px;
}

.td-stem {
  min-height: 88px;
}

.td-stem > span:nth-child(2) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.td-question-number {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 25px;
  height: 25px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 50%;
}

.td-sub-question .td-stem {
  flex-direction: row;
}

.td-answer {
  justify-content: space-between;
  min-height: 88px;
}

.td-answer-large {
  min-height: 210px;
  margin-top: 10px;
}

.td-response-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.td-placeholder {
  display: grid;
  flex: 1;
  place-items: center;
  color: hsl(var(--muted-foreground));
  border: 1px dashed hsl(var(--border));
  border-radius: 6px;
}

.td-inline-stem {
  min-height: 165px;
  margin-bottom: 10px;
}

.td-inline-stem p {
  margin: 16px 0;
  line-height: 2.4;
}

.td-blank {
  display: inline-block;
  padding: 0 12px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 8%);
  border-bottom: 1px solid hsl(var(--primary));
  border-radius: 4px 4px 0 0;
}

.td-option-pool {
  min-height: 72px;
}

.td-add-question {
  padding: 10px;
  color: hsl(var(--primary));
  cursor: pointer;
  background: transparent;
  border: 1px dashed hsl(var(--primary) / 55%);
  border-radius: 7px;
}

.td-fixed-question-count {
  padding: 10px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-align: center;
  background: hsl(var(--muted) / 28%);
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
}

.td-advanced-entry {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  margin-top: 16px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: hsl(var(--muted) / 25%);
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
}

.td-preview-shell {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.td-preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: hsl(var(--background) / 88%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  box-shadow: 0 3px 12px rgb(15 23 42 / 4%);
  backdrop-filter: blur(8px);
}

.td-preview-toolbar > div {
  display: flex;
  flex-direction: column;
}

.td-preview-toolbar span {
  margin-top: 2px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.td-preview {
  color: hsl(var(--foreground));
}

.td-zone-nav {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border-top: 1px solid hsl(var(--border));
  border-bottom: 1px solid hsl(var(--border));
}

.td-zone-nav button {
  padding: 9px 2px;
  font-size: 12px;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-right: 1px solid hsl(var(--border));
}

.td-zone-nav button:last-child {
  border-right: 0;
}

.td-zone-nav button.active {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 8%);
}

.td-setting-body {
  padding: 16px;
}

.td-setting-intro {
  padding: 14px;
  background: hsl(var(--muted) / 35%);
  border-radius: 7px;
}

.td-field-help {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.td-response-rule-title {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

.td-response-rule-title span {
  margin-top: 3px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.td-response-rule-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.td-response-rule-card {
  padding: 13px;
  cursor: pointer;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 9px;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.td-response-rule-card:hover {
  border-color: hsl(var(--primary) / 45%);
}

.td-response-rule-card.active {
  background: hsl(var(--primary) / 5%);
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 8%);
}

.td-response-rule-head {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 11px;
}

.td-response-rule-head > span {
  display: flex;
  flex-direction: column;
}

.td-response-rule-head small {
  margin-top: 3px;
  line-height: 1.45;
  color: hsl(var(--muted-foreground));
}

.td-response-result {
  padding: 8px 10px;
  margin-top: 10px;
  font-size: 11px;
  line-height: 1.5;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 7%);
  border-radius: 6px;
}

.td-judgment-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  margin-bottom: 18px;
  background: hsl(var(--primary) / 5%);
  border: 1px solid hsl(var(--primary) / 22%);
  border-radius: 8px;
}

.td-switch-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.td-response-grid,
.td-check-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}

.td-response-grid :deep(.ant-checkbox-wrapper),
.td-check-list :deep(.ant-checkbox-wrapper) {
  margin-inline-start: 0;
}

.td-divider {
  padding-bottom: 8px;
  margin: 8px 0 14px;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  border-bottom: 1px solid hsl(var(--border));
}

@media (max-width: 1280px) {
  .td-workbench {
    grid-template-columns: 205px minmax(400px, 1fr) 300px;
  }
}

@media (max-width: 1050px) {
  .td-workbench {
    grid-template-columns: 190px minmax(0, 1fr);
  }

  .td-settings {
    grid-column: 1 / -1;
    border-top: 1px solid hsl(var(--border));
    border-left: 0;
  }

  .td-setting-body {
    max-height: none;
  }
}

@media (max-width: 720px) {
  .td-toolbar {
    align-items: flex-start;
  }

  .td-workbench {
    display: block;
  }

  .td-structures {
    border-right: 0;
    border-bottom: 1px solid hsl(var(--border));
  }

  .td-structure {
    display: inline-grid;
    width: calc(50% - 4px);
  }

  .td-canvas {
    padding: 10px;
  }

  .td-paper {
    padding: 14px;
  }

  .td-sub-question {
    grid-template-columns: 1fr;
  }
}
</style>
