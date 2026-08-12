<script lang="ts" setup>
import type {
  TemplateDefinition,
  TemplateResponseType,
  TemplateStructure,
} from '../template-schema';

import { computed, ref } from 'vue';

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
  PROFESSIONAL_TOOL_OPTIONS,
  RESPONSE_OPTIONS,
  STRUCTURE_OPTIONS,
} from '../template-schema';

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

const structureHelp: Record<TemplateStructure, string> = {
  single: '一个题干配一个主要作答区',
  inline: '答案空直接出现在题干内容中',
  stimulus: '一份共享材料带多道独立小题',
  steps: '多个步骤前后关联并分别计分',
  visual: '在图片、画布或专业图形上作答',
  submission: '提交文件、录音、报告或实践成果',
};

const responseLabels = computed(() =>
  definition.value.responseTypes.map(
    (value) =>
      RESPONSE_OPTIONS.find((item) => item.value === value)?.label || value,
  ),
);

const contentLabels = computed(() =>
  definition.value.stimulus.allowedContent.map(
    (value) =>
      CONTENT_OPTIONS.find((item) => item.value === value)?.label || value,
  ),
);

const selectedResponse = computed(
  () => definition.value.responseTypes[0] || 'text_long',
);

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
  definition.value.structure = value;
  switch (value) {
    case 'inline': {
      definition.value.stimulus.enabled = false;
      definition.value.subQuestions.enabled = false;
      definition.value.inlineAnswers.enabled = true;
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
      definition.value.subQuestions.enabled = true;
      definition.value.subQuestions.repeatable = true;
      definition.value.dependencies.allowPreviousAnswerReference = true;
      selectedZone.value = 'subQuestions';

      break;
    }
    case 'stimulus': {
      definition.value.stimulus.enabled = true;
      definition.value.stimulus.required = true;
      definition.value.subQuestions.enabled = true;
      definition.value.subQuestions.repeatable = true;
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
    case 'visual': {
      ensureResponse('drawing');
      selectedZone.value = 'response';

      break;
    }
    default: {
      ensureResponse('file');
      selectedZone.value = 'response';
    }
  }
}

function ensureResponse(type: TemplateResponseType) {
  if (!definition.value.responseTypes.includes(type)) {
    definition.value.responseTypes.push(type);
  }
}

function onResponseChange(values: TemplateResponseType[]) {
  definition.value.responseTypes = values;
  if (values.includes('shared_options')) {
    definition.value.inlineAnswers.enabled = true;
    definition.value.optionPool.enabled = true;
  }
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
                最多 {{ definition.inlineAnswers.maxBlanks }} 个空
                <span v-if="definition.optionPool.enabled">· 共用选项池</span>
              </small>
            </button>
          </div>

          <div
            v-else-if="definition.subQuestions.enabled"
            class="td-question-list"
          >
            <div
              v-for="index in 2"
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
              type="button"
              class="td-add-question"
              :class="{ selected: selectedZone === 'subQuestions' }"
              @click="selectZone('subQuestions')"
            >
              ＋ 教师可继续添加小题
            </button>
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
              <span
                v-if="definition.structure === 'visual'"
                class="td-placeholder"
              >
                图形、标注或绘图操作区域
              </span>
              <span
                v-else-if="definition.structure === 'submission'"
                class="td-placeholder"
              >
                文件、录音或实践成果提交区域
              </span>
              <span v-else class="td-response-tags">
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

        <div v-else class="td-paper td-preview">
          <section
            v-if="definition.stimulus.enabled"
            class="td-preview-material"
          >
            <strong>阅读下面的材料，完成后面各题。</strong>
            <p>
              这是一段用于展示模板效果的示例材料。实际创建题目时，教师可以在这里录入文章、病例、实验数据、图片或音视频。
            </p>
          </section>

          <template v-if="definition.structure === 'inline'">
            <h3>请根据题意完成下列填空。</h3>
            <p class="td-preview-paragraph">
              在计算机网络中，负责路径选择的设备是
              <span class="td-fake-input">请选择</span>
              ，常用的传输层协议包括
              <span class="td-fake-input">请输入答案</span>
              。
            </p>
            <div
              v-if="definition.optionPool.enabled"
              class="td-preview-options"
            >
              选项池：A. 路由器 / B. 交换机 / C. TCP / D. UDP
            </div>
          </template>

          <template v-else-if="definition.subQuestions.enabled">
            <section
              v-for="index in 2"
              :key="index"
              class="td-preview-question"
            >
              <strong>第 {{ index }} 小题：这是题干示例。</strong>
              <div class="td-preview-answer">
                <template v-if="selectedResponse === 'choice'">
                  <span>○ A. 选项一</span><span>○ B. 选项二</span>
                  <span>○ C. 选项三</span><span>○ D. 选项四</span>
                </template>
                <textarea
                  v-else
                  disabled
                  placeholder="学生在这里作答"
                ></textarea>
              </div>
            </section>
          </template>

          <template v-else>
            <h3>1. 这是使用该模板创建出来的题目示例。</h3>
            <div
              v-if="definition.structure === 'visual'"
              class="td-preview-special"
            >
              图形 / 图片操作画布
            </div>
            <div
              v-else-if="definition.structure === 'submission'"
              class="td-preview-special"
            >
              ＋ 点击上传作业文件或录制音频
            </div>
            <div v-else class="td-preview-answer">
              <template v-if="selectedResponse === 'choice'">
                <span>○ A. 选项一</span><span>○ B. 选项二</span>
                <span>○ C. 选项三</span><span>○ D. 选项四</span>
              </template>
              <textarea v-else disabled placeholder="学生在这里作答"></textarea>
            </div>
          </template>
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
            <div class="td-switch-row">
              <div>
                <strong>允许添加小题</strong>
                <p>每道小题都有自己的题干和作答区。</p>
              </div>
              <Switch v-model:checked="definition.subQuestions.enabled" />
            </div>
            <template v-if="definition.subQuestions.enabled">
              <Form.Item label="出题时允许继续添加和删除">
                <Switch v-model:checked="definition.subQuestions.repeatable" />
              </Form.Item>
              <Space>
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
            <Form.Item label="教师可以选择的作答方式">
              <Checkbox.Group
                :value="definition.responseTypes"
                class="td-response-grid"
                @update:value="
                  (values) => onResponseChange(values as TemplateResponseType[])
                "
              >
                <Checkbox
                  v-for="item in RESPONSE_OPTIONS"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </Checkbox>
              </Checkbox.Group>
            </Form.Item>

            <template
              v-if="
                definition.structure === 'inline' ||
                definition.inlineAnswers.enabled ||
                definition.responseTypes.includes('shared_options')
              "
            >
              <div class="td-divider">题干内答案</div>
              <Form.Item label="允许在题干中插入答案空">
                <Switch v-model:checked="definition.inlineAnswers.enabled" />
              </Form.Item>
              <Form.Item
                v-if="definition.inlineAnswers.enabled"
                label="最多空位数"
              >
                <InputNumber
                  v-model:value="definition.inlineAnswers.maxBlanks"
                  :min="1"
                  :max="200"
                />
              </Form.Item>
              <Form.Item
                v-if="definition.inlineAnswers.enabled"
                label="答案空可以使用"
              >
                <Checkbox.Group
                  v-model:value="definition.inlineAnswers.allowedTypes"
                  :options="[
                    { label: '文本', value: 'text' },
                    { label: '数值', value: 'number' },
                    { label: '下拉选择', value: 'dropdown' },
                    { label: '公式', value: 'formula' },
                    { label: '共享选项', value: 'shared_options' },
                  ]"
                  class="td-check-list"
                />
              </Form.Item>
              <div class="td-switch-row">
                <div>
                  <strong>多个空共用选项池</strong>
                  <p>适合英语选词填空、术语填空。</p>
                </div>
                <Switch v-model:checked="definition.optionPool.enabled" />
              </div>
              <template v-if="definition.optionPool.enabled">
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
  overflow: hidden;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.td-toolbar {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: hsl(var(--muted) / 35%);
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
  grid-template-columns: 228px minmax(420px, 1fr) 330px;
  min-height: 690px;
}

.td-structures,
.td-settings {
  min-width: 0;
  background: hsl(var(--background));
}

.td-structures {
  padding: 14px 12px;
  border-right: 1px solid hsl(var(--border));
}

.td-settings {
  border-left: 1px solid hsl(var(--border));
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
  min-width: 0;
  padding: 18px;
  background: hsl(var(--muted) / 26%);
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
  min-height: 596px;
  padding: 24px;
  background: white;
  border: 1px solid hsl(var(--border));
  border-radius: 9px;
  box-shadow: 0 5px 20px rgb(15 23 42 / 5%);
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

.td-preview {
  color: #1f2937;
}

.dark .td-preview {
  color: hsl(var(--foreground));
}

.td-preview-material {
  padding: 18px;
  margin-bottom: 24px;
  line-height: 1.8;
  background: #f7f9fc;
  border-left: 3px solid #91caff;
}

.dark .td-preview-material {
  background: hsl(var(--muted) / 30%);
}

.td-preview-question {
  padding: 18px 0;
  border-bottom: 1px solid hsl(var(--border));
}

.td-preview-answer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
  margin-top: 16px;
}

.td-preview-answer textarea {
  grid-column: 1 / -1;
  min-height: 100px;
  padding: 10px;
  resize: none;
  background: transparent;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.td-preview-paragraph {
  line-height: 2.8;
}

.td-fake-input {
  display: inline-block;
  min-width: 105px;
  padding: 0 10px;
  line-height: 30px;
  color: #9ca3af;
  border: 1px solid #d1d5db;
  border-radius: 5px;
}

.td-preview-options {
  padding: 12px;
  background: #f7f9fc;
  border-radius: 6px;
}

.td-preview-special {
  display: grid;
  place-items: center;
  min-height: 260px;
  margin-top: 20px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 20%);
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
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
  max-height: 615px;
  padding: 16px;
  overflow-y: auto;
}

.td-setting-intro {
  padding: 14px;
  background: hsl(var(--muted) / 35%);
  border-radius: 7px;
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
