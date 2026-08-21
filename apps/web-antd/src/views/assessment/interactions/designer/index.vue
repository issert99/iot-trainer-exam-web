<script lang="ts" setup>
import type {
  InteractionControl,
  InteractionScoreRule,
  JsonObject,
  JsonValue,
  PrimitiveControlType,
} from '../../domain/types';

import { computed, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Radio,
  Rate,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Upload,
} from 'ant-design-vue';

import {
  addInteractionControl,
  duplicateInteractionControl,
  enableInteractionTemplate,
  interactionDesignerDraft,
  interactionPalette,
  loadInteractionTemplate,
  removeInteractionControl,
  saveInteractionTemplate,
} from '../../stores/interaction-designer';
import { schoolAssessmentState } from '../../stores/state';

defineOptions({ name: 'AssessmentInteractionDesigner' });

const selectedControlId = ref(interactionDesignerDraft.controls[0]?.id ?? '');
const paletteKeyword = ref('');
const activePreviewTab = ref('try');
const selectedTemplateId = ref(interactionDesignerDraft.id);
const candidateResponse = ref<JsonObject>({
  'ctrl-judgement': '安全',
  'ctrl-reason': '正应力小于材料许用应力，满足强度条件。',
  'ctrl-stress': 248,
});
const configDraft = ref('{}');
const configError = ref('');

const controlGlyphs: Record<PrimitiveControlType, string> = {
  audio: '◉',
  drawing: '✎',
  file: '⇧',
  formula: '∑',
  hotspot: '⌖',
  matrix: '▦',
  'multi-choice': '☑',
  number: '#',
  rating: '★',
  select: '⌄',
  'single-choice': '◉',
  table: '▤',
  text: 'T',
  textarea: '¶',
  video: '▶',
};

const statusMeta = computed(() => {
  const map = {
    draft: { color: 'default', label: '草稿' },
    enabled: { color: 'success', label: '已启用' },
    retired: { color: 'default', label: '已归档' },
    testing: { color: 'processing', label: '测试版' },
  };
  return map[interactionDesignerDraft.status];
});

const selectedControl = computed(() =>
  interactionDesignerDraft.controls.find(
    (control) => control.id === selectedControlId.value,
  ),
);

const templateOptions = computed(() =>
  schoolAssessmentState.interactionTemplates.map((template) => ({
    label: `${template.name} · r${template.revision} · ${template.status}`,
    value: template.id,
  })),
);

const groupedPalette = computed(() => {
  const keyword = paletteKeyword.value.trim().toLocaleLowerCase();
  const filtered = interactionPalette.filter((entry) =>
    `${entry.label} ${entry.description} ${entry.category} ${entry.type}`
      .toLocaleLowerCase()
      .includes(keyword),
  );
  const groups = new Map<string, typeof interactionPalette>();
  filtered.forEach((entry) => {
    const group = groups.get(entry.category) ?? [];
    group.push(entry);
    groups.set(entry.category, group);
  });
  return [...groups.entries()].map(([category, entries]) => ({
    category,
    entries,
  }));
});

const responseJson = computed(() =>
  JSON.stringify(
    {
      pluginId: 'builder.no-code',
      templateRevisionId: interactionDesignerDraft.id,
      value: candidateResponse.value,
    },
    null,
    2,
  ),
);

const templateJson = computed(() =>
  JSON.stringify(interactionDesignerDraft, null, 2),
);

const scoringWeight = computed(() =>
  interactionDesignerDraft.scoreRules.reduce(
    (total, rule) => total + rule.weight,
    0,
  ),
);

const previewScoring = computed(() => {
  let awardedWeight = 0;
  let humanWeight = 0;
  const evidence: string[] = [];
  interactionDesignerDraft.scoreRules.forEach((rule) => {
    const value = candidateResponse.value[rule.controlId];
    if (['human', 'rubric'].includes(rule.type)) {
      humanWeight += rule.weight;
      evidence.push(`${controlLabel(rule.controlId)}：等待人工量规`);
      return;
    }
    let matched = false;
    switch (rule.type) {
      case 'exact': {
        matched =
          String(value ?? '')
            .trim()
            .toLocaleLowerCase() ===
          String(rule.config.expected ?? '')
            .trim()
            .toLocaleLowerCase();

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
          matched = new RegExp(String(rule.config.expected ?? '')).test(
            String(value ?? ''),
          );
        } catch {
          matched = false;
        }

        break;
      }
      case 'set-match': {
        const expected = Array.isArray(rule.config.expected)
          ? rule.config.expected.map(String).toSorted()
          : [String(rule.config.expected ?? '')].filter(Boolean);
        const actual = Array.isArray(value) ? value.map(String).toSorted() : [];
        matched = JSON.stringify(actual) === JSON.stringify(expected);

        break;
      }
      // No default
    }
    if (matched) awardedWeight += rule.weight;
    evidence.push(
      `${controlLabel(rule.controlId)}：${matched ? '规则命中' : '规则未命中'}`,
    );
  });
  return {
    automaticPercent: Math.round(awardedWeight * 100),
    evidence,
    humanPercent: Math.round(humanWeight * 100),
  };
});

const scoringRuleTypes = [
  { label: '精确匹配', value: 'exact' },
  { label: '范围容差', value: 'range' },
  { label: '集合匹配', value: 'set-match' },
  { label: '正则表达式', value: 'regex' },
  { label: '人工评分', value: 'human' },
  { label: '量规评分', value: 'rubric' },
];

function options(control: InteractionControl) {
  const values = control.config.options;
  return Array.isArray(values) ? values.map(String) : [];
}

function stringArray(value: JsonValue | undefined) {
  return Array.isArray(value) ? value.map(String) : [];
}

function numberConfig(control: InteractionControl, key: string, fallback = 0) {
  const value = Number(control.config[key] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function addControl(type: PrimitiveControlType) {
  const control = addInteractionControl(type);
  selectedControlId.value = control.id;
  message.success(`已添加“${control.label}”控件`);
}

function selectControl(id: string) {
  selectedControlId.value = id;
}

function duplicateControl(id: string) {
  duplicateInteractionControl(id);
  selectedControlId.value =
    interactionDesignerDraft.controls.at(-1)?.id ?? selectedControlId.value;
  message.success('控件副本已添加到画布末尾');
}

function deleteControl(id: string) {
  const index = interactionDesignerDraft.controls.findIndex(
    (control) => control.id === id,
  );
  removeInteractionControl(id);
  selectedControlId.value =
    interactionDesignerDraft.controls[index]?.id ??
    interactionDesignerDraft.controls[index - 1]?.id ??
    '';
}

function loadTemplate(id: string) {
  try {
    loadInteractionTemplate(id);
    selectedTemplateId.value = id;
    selectedControlId.value = interactionDesignerDraft.controls[0]?.id ?? '';
    candidateResponse.value = {};
    message.success('已载入模板快照');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '模板载入失败');
  }
}

function saveTemplate() {
  if (!interactionDesignerDraft.name.trim()) {
    message.warning('请先填写模板名称');
    return;
  }
  if (interactionDesignerDraft.controls.length === 0) {
    message.warning('模板至少需要一个作答控件');
    return;
  }
  const saved = saveInteractionTemplate();
  selectedTemplateId.value = saved.id;
  message.success(`测试版 r${saved.revision} 已保存`);
}

function enableTemplate() {
  try {
    enableInteractionTemplate(interactionDesignerDraft.id);
    loadInteractionTemplate(interactionDesignerDraft.id);
    message.success('当前模板版本已启用，可用于正式题目');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '启用失败');
  }
}

function setControlConfig(key: string, value: JsonValue) {
  if (!selectedControl.value) return;
  selectedControl.value.config = {
    ...selectedControl.value.config,
    [key]: value,
  };
}

function setControlTags(key: string, value: unknown) {
  setControlConfig(key, Array.isArray(value) ? value.map(String) : []);
}

function normalizedNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function setControlNumber(key: string, value: unknown) {
  setControlConfig(key, normalizedNumber(value));
}

function updateControlWeight(value: unknown) {
  if (!selectedControl.value) return;
  const weight = normalizedNumber(value);
  selectedControl.value.scoreWeight = weight;
  const rule = interactionDesignerDraft.scoreRules.find(
    (entry) => entry.controlId === selectedControl.value?.id,
  );
  if (rule) rule.weight = weight;
}

function syncConfigDraft() {
  configDraft.value = JSON.stringify(
    selectedControl.value?.config ?? {},
    null,
    2,
  );
  configError.value = '';
}

function commitConfigDraft() {
  if (!selectedControl.value) return;
  try {
    const parsed = JSON.parse(configDraft.value) as JsonValue;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      configError.value = '配置必须是 JSON 对象。';
      return;
    }
    selectedControl.value.config = parsed as JsonObject;
    configError.value = '';
  } catch {
    configError.value = 'JSON 格式无效。';
  }
}

function updateCandidate(controlId: string, value: JsonValue) {
  candidateResponse.value = {
    ...candidateResponse.value,
    [controlId]: value,
  };
}

function responseString(controlId: string) {
  return String(candidateResponse.value[controlId] ?? '');
}

function responseNumber(controlId: string) {
  const value = candidateResponse.value[controlId];
  return typeof value === 'number' ? value : undefined;
}

function responseArray(controlId: string) {
  const value = candidateResponse.value[controlId];
  return Array.isArray(value) ? value.map(String) : [];
}

function updateCandidateNumber(controlId: string, value: unknown) {
  updateCandidate(controlId, normalizedNumber(value));
}

function updateCandidateArray(controlId: string, value: unknown) {
  updateCandidate(controlId, Array.isArray(value) ? value.map(String) : []);
}

function defaultRule(control: InteractionControl, index: number) {
  const isNumber = control.type === 'number';
  const isChoice = ['multi-choice', 'select', 'single-choice'].includes(
    control.type,
  );
  let type: InteractionScoreRule['type'] = 'human';
  let config: JsonObject = { rubric: '教师评分量规' };
  if (isNumber) {
    type = 'range';
    config = { expected: 0, tolerance: 0 };
  } else if (isChoice) {
    type = control.type === 'multi-choice' ? 'set-match' : 'exact';
    config = { expected: options(control)[0] ?? '' };
  }
  return {
    config,
    controlId: control.id,
    id: `rule-${Date.now()}-${index}`,
    type,
    weight:
      control.scoreWeight ||
      1 / Math.max(1, interactionDesignerDraft.controls.length),
  } satisfies InteractionScoreRule;
}

function ensureScoringRules() {
  interactionDesignerDraft.controls.forEach((control, index) => {
    const exists = interactionDesignerDraft.scoreRules.some(
      (rule) => rule.controlId === control.id,
    );
    if (!exists) {
      interactionDesignerDraft.scoreRules.push(defaultRule(control, index));
    }
  });
  message.success('已为未配置控件生成默认评分规则');
}

function controlLabel(controlId: string) {
  return (
    interactionDesignerDraft.controls.find(
      (control) => control.id === controlId,
    )?.label ?? '已删除控件'
  );
}

function setRuleType(rule: InteractionScoreRule, value: unknown) {
  rule.type = String(value) as InteractionScoreRule['type'];
}

function setRuleWeight(rule: InteractionScoreRule, value: unknown) {
  rule.weight = normalizedNumber(value);
}

function setRuleExpected(rule: InteractionScoreRule, value: unknown) {
  rule.config = {
    ...rule.config,
    expected: rule.type === 'range' ? Number(value ?? 0) : String(value ?? ''),
  };
}

function setRuleTolerance(rule: InteractionScoreRule, value: unknown) {
  rule.config = {
    ...rule.config,
    tolerance: normalizedNumber(value),
  };
}

function removeRule(id: string) {
  interactionDesignerDraft.scoreRules =
    interactionDesignerDraft.scoreRules.filter((rule) => rule.id !== id);
}

watch(() => selectedControl.value?.id, syncConfigDraft, { immediate: true });
</script>

<template>
  <Page>
    <div class="designer-page">
      <section class="designer-header">
        <div class="designer-brand">
          <div class="brand-mark">▦</div>
          <div>
            <div class="eyebrow">
              教师无代码设计器
              <Tag :color="statusMeta.color">{{ statusMeta.label }}</Tag>
            </div>
            <h1>无代码交互设计器</h1>
            <Input
              v-model:value="interactionDesignerDraft.name"
              class="template-name"
              placeholder="交互模板名称"
            />
            <Input
              v-model:value="interactionDesignerDraft.description"
              class="template-description"
              placeholder="一句话说明模板用途"
            />
          </div>
        </div>

        <div class="header-meta">
          <span>
            版本 <strong>r{{ interactionDesignerDraft.revision }}</strong>
          </span>
          <span>
            控件
            <strong>{{ interactionDesignerDraft.controls.length }}</strong>
          </span>
          <span>
            评分规则
            <strong>{{ interactionDesignerDraft.scoreRules.length }}</strong>
          </span>
        </div>

        <Space wrap class="header-actions">
          <Select
            v-model:value="selectedTemplateId"
            :options="templateOptions"
            style="width: 240px"
            @change="loadTemplate(String($event))"
          />
          <Button @click="saveTemplate">保存测试版</Button>
          <Button
            type="primary"
            :disabled="interactionDesignerDraft.status !== 'testing'"
            @click="enableTemplate"
          >
            启用当前版本
          </Button>
        </Space>
      </section>

      <Alert
        type="info"
        show-icon
        message="当前示例：材料强度复合计算"
        description="把数值计算、状态判断和分析说明组合为一个可复用交互；教师只配置控件与规则，不编写代码。"
      />

      <div class="designer-grid">
        <aside class="designer-panel palette-panel">
          <div class="panel-heading">
            <div>
              <small>STEP 1</small>
              <h3>添加作答控件</h3>
            </div>
            <Tag>{{ interactionPalette.length }} 种</Tag>
          </div>
          <Input
            v-model:value="paletteKeyword"
            allow-clear
            placeholder="搜索控件"
            class="palette-search"
          />
          <div class="palette-scroll">
            <section
              v-for="group in groupedPalette"
              :key="group.category"
              class="palette-group"
            >
              <h4>{{ group.category }}</h4>
              <button
                v-for="entry in group.entries"
                :key="entry.type"
                type="button"
                class="palette-item"
                @click="addControl(entry.type)"
              >
                <span>{{ controlGlyphs[entry.type] }}</span>
                <b>{{ entry.label }}</b>
                <small>{{ entry.description }}</small>
                <i>＋</i>
              </button>
            </section>
            <Empty
              v-if="groupedPalette.length === 0"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              description="没有匹配控件"
            />
          </div>
        </aside>

        <main class="designer-panel canvas-panel">
          <div class="panel-heading canvas-heading">
            <div>
              <small>STEP 2</small>
              <h3>设计画布</h3>
            </div>
            <Space>
              <Tag color="blue">4 列响应式网格</Tag>
              <Tag color="green">自动保存草稿</Tag>
            </Space>
          </div>

          <div class="material-context">
            <div class="context-order">题干材料</div>
            <div>
              <h2>杆件强度综合分析</h2>
              <p>
                圆截面钢杆承受轴向拉力
                <strong>F = 50 kN</strong>，截面积
                <strong>A = 200 mm²</strong>，材料许用应力为
                <strong>[σ] = 260 MPa</strong>。
              </p>
              <div class="formula-strip">
                <span>提示公式</span>
                <code>σ = F / A</code>
                <i></i>
                <span>请计算、判断并说明依据</span>
              </div>
            </div>
          </div>

          <div
            v-if="interactionDesignerDraft.controls.length > 0"
            class="control-grid"
          >
            <article
              v-for="(control, index) in interactionDesignerDraft.controls"
              :key="control.id"
              class="canvas-control"
              :class="[
                `span-${control.width}`,
                { selected: selectedControlId === control.id },
              ]"
              @click="selectControl(control.id)"
            >
              <div class="control-order">{{ index + 1 }}</div>
              <header>
                <div>
                  <strong>{{ control.label }}</strong>
                  <Tag v-if="control.required" color="red">必填</Tag>
                </div>
                <span>{{ Math.round(control.scoreWeight * 100) }}% 权重</span>
              </header>

              <Input
                v-if="['formula', 'text'].includes(control.type)"
                disabled
                :placeholder="
                  control.type === 'formula' ? '输入数学表达式' : '输入答案'
                "
              />
              <Input.TextArea
                v-else-if="control.type === 'textarea'"
                disabled
                :rows="Number(control.config.rows ?? 4)"
                placeholder="输入分析过程与判断依据"
              />
              <div v-else-if="control.type === 'number'" class="number-preview">
                <InputNumber
                  disabled
                  :min="numberConfig(control, 'min')"
                  :max="numberConfig(control, 'max', 100)"
                  :precision="numberConfig(control, 'precision', 2)"
                  placeholder="0.00"
                />
                <span>{{ control.config.unit || '单位' }}</span>
              </div>
              <Radio.Group
                v-else-if="control.type === 'single-choice'"
                disabled
              >
                <Space wrap>
                  <Radio
                    v-for="option in options(control)"
                    :key="option"
                    :value="option"
                  >
                    {{ option }}
                  </Radio>
                </Space>
              </Radio.Group>
              <Checkbox.Group
                v-else-if="control.type === 'multi-choice'"
                disabled
                :options="options(control)"
              />
              <Select
                v-else-if="control.type === 'select'"
                disabled
                class="w-full"
                :options="
                  options(control).map((option) => ({
                    label: option,
                    value: option,
                  }))
                "
                placeholder="请选择"
              />
              <Rate v-else-if="control.type === 'rating'" disabled />
              <div v-else-if="control.type === 'matrix'" class="matrix-preview">
                <span
                  v-for="row in stringArray(control.config.rows)"
                  :key="row"
                >
                  {{ row }} <i></i><i></i><i></i>
                </span>
              </div>
              <Upload
                v-else-if="control.type === 'file'"
                disabled
                :show-upload-list="false"
              >
                <Button disabled>选择作品文件</Button>
              </Upload>
              <div v-else class="special-preview">
                <b>{{ controlGlyphs[control.type] }}</b>
                <span>{{ control.type }} 受控画布</span>
              </div>

              <div
                v-if="selectedControlId === control.id"
                class="control-tools"
              >
                <button
                  type="button"
                  title="复制控件"
                  @click.stop="duplicateControl(control.id)"
                >
                  ⧉
                </button>
                <button
                  type="button"
                  title="删除控件"
                  @click.stop="deleteControl(control.id)"
                >
                  ×
                </button>
              </div>
            </article>
          </div>
          <Empty
            v-else
            class="empty-canvas"
            description="从左侧选择控件，开始搭建交互"
          />

          <div class="canvas-hint">
            <span>＋</span>
            点击左侧控件即可添加到此处，画布会按宽度自动排版
          </div>
        </main>

        <aside class="designer-panel property-panel">
          <div class="panel-heading">
            <div>
              <small>STEP 3</small>
              <h3>属性与行为</h3>
            </div>
            <Tag v-if="selectedControl" color="processing">
              {{ selectedControl.type }}
            </Tag>
          </div>

          <Form v-if="selectedControl" layout="vertical" class="property-form">
            <Form.Item label="字段标题">
              <Input v-model:value="selectedControl.label" />
            </Form.Item>
            <div class="property-two-cols">
              <Form.Item label="是否必填">
                <Switch
                  v-model:checked="selectedControl.required"
                  checked-children="必填"
                  un-checked-children="可选"
                />
              </Form.Item>
              <Form.Item label="评分权重">
                <InputNumber
                  :value="selectedControl.scoreWeight"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  @update:value="updateControlWeight"
                />
              </Form.Item>
            </div>
            <Form.Item label="画布宽度">
              <Radio.Group
                v-model:value="selectedControl.width"
                button-style="solid"
              >
                <Radio.Button :value="1">1/4</Radio.Button>
                <Radio.Button :value="2">1/2</Radio.Button>
                <Radio.Button :value="3">3/4</Radio.Button>
                <Radio.Button :value="4">整行</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <template
              v-if="
                ['multi-choice', 'select', 'single-choice'].includes(
                  selectedControl.type,
                )
              "
            >
              <Form.Item label="选项">
                <Select
                  mode="tags"
                  :value="options(selectedControl)"
                  placeholder="输入后按回车添加"
                  @update:value="setControlTags('options', $event)"
                />
              </Form.Item>
            </template>

            <template v-else-if="selectedControl.type === 'number'">
              <div class="property-two-cols">
                <Form.Item label="最小值">
                  <InputNumber
                    :value="numberConfig(selectedControl, 'min')"
                    @update:value="setControlNumber('min', $event)"
                  />
                </Form.Item>
                <Form.Item label="最大值">
                  <InputNumber
                    :value="numberConfig(selectedControl, 'max', 100)"
                    @update:value="setControlNumber('max', $event)"
                  />
                </Form.Item>
              </div>
              <div class="property-two-cols">
                <Form.Item label="小数位">
                  <InputNumber
                    :value="numberConfig(selectedControl, 'precision', 2)"
                    :min="0"
                    :max="8"
                    @update:value="setControlNumber('precision', $event)"
                  />
                </Form.Item>
                <Form.Item label="单位">
                  <Input
                    :value="String(selectedControl.config.unit ?? '')"
                    @update:value="setControlConfig('unit', String($event))"
                  />
                </Form.Item>
              </div>
            </template>

            <template v-else-if="selectedControl.type === 'textarea'">
              <div class="property-two-cols">
                <Form.Item label="显示行数">
                  <InputNumber
                    :value="numberConfig(selectedControl, 'rows', 4)"
                    :min="2"
                    :max="16"
                    @update:value="setControlNumber('rows', $event)"
                  />
                </Form.Item>
                <Form.Item label="字数上限">
                  <InputNumber
                    :value="numberConfig(selectedControl, 'maxLength', 500)"
                    :min="20"
                    @update:value="setControlNumber('maxLength', $event)"
                  />
                </Form.Item>
              </div>
            </template>

            <template v-else-if="selectedControl.type === 'matrix'">
              <Form.Item label="评价行">
                <Select
                  mode="tags"
                  :value="stringArray(selectedControl.config.rows)"
                  @update:value="setControlTags('rows', $event)"
                />
              </Form.Item>
              <Form.Item label="评价列">
                <Select
                  mode="tags"
                  :value="stringArray(selectedControl.config.columns)"
                  @update:value="setControlTags('columns', $event)"
                />
              </Form.Item>
            </template>

            <template v-else-if="selectedControl.type === 'file'">
              <Form.Item label="允许扩展名">
                <Select
                  mode="tags"
                  :value="stringArray(selectedControl.config.extensions)"
                  @update:value="setControlTags('extensions', $event)"
                />
              </Form.Item>
              <Form.Item label="文件上限（MB）">
                <InputNumber
                  :value="numberConfig(selectedControl, 'maxSizeMb', 20)"
                  :min="1"
                  @update:value="setControlNumber('maxSizeMb', $event)"
                />
              </Form.Item>
            </template>

            <Form.Item label="高级配置 JSON">
              <Input.TextArea
                v-model:value="configDraft"
                :rows="7"
                class="config-editor"
                @blur="commitConfigDraft"
              />
              <p v-if="configError" class="config-error">{{ configError }}</p>
            </Form.Item>

            <Space class="property-actions">
              <Button @click="duplicateControl(selectedControl.id)">
                复制控件
              </Button>
              <Button danger @click="deleteControl(selectedControl.id)">
                删除
              </Button>
            </Space>
          </Form>

          <div v-else class="template-property">
            <Empty
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              description="请选择画布中的控件"
            />
            <Form layout="vertical">
              <Form.Item label="无障碍说明">
                <Input.TextArea
                  v-model:value="interactionDesignerDraft.accessibilityNotes"
                  :rows="4"
                />
              </Form.Item>
              <Form.Item label="纸面替代说明">
                <Input.TextArea
                  v-model:value="interactionDesignerDraft.paperFallback.note"
                  :rows="4"
                />
              </Form.Item>
            </Form>
          </div>
        </aside>
      </div>

      <Card :bordered="false" class="preview-workbench">
        <Tabs v-model:active-key="activePreviewTab">
          <Tabs.TabPane key="try" tab="考生试答">
            <div class="preview-layout">
              <section class="candidate-paper">
                <header>
                  <Tag color="blue">考生视图</Tag>
                  <span>本题 15 分 · 建议 12 分钟</span>
                </header>
                <h2>杆件强度综合分析</h2>
                <p class="candidate-stem">
                  已知杆件载荷与截面积，请计算正应力、判断是否满足强度条件并说明依据。
                </p>
                <div class="runtime-grid">
                  <div
                    v-for="control in interactionDesignerDraft.controls"
                    :key="control.id"
                    class="runtime-field"
                    :class="`span-${control.width}`"
                  >
                    <label>
                      {{ control.label }}
                      <i v-if="control.required">*</i>
                    </label>
                    <Input
                      v-if="['formula', 'text'].includes(control.type)"
                      :value="responseString(control.id)"
                      @update:value="
                        updateCandidate(control.id, String($event))
                      "
                    />
                    <Input.TextArea
                      v-else-if="control.type === 'textarea'"
                      :value="responseString(control.id)"
                      :rows="Number(control.config.rows ?? 4)"
                      @update:value="
                        updateCandidate(control.id, String($event))
                      "
                    />
                    <div
                      v-else-if="control.type === 'number'"
                      class="number-preview"
                    >
                      <InputNumber
                        :value="responseNumber(control.id)"
                        :min="numberConfig(control, 'min')"
                        :max="numberConfig(control, 'max', 1000)"
                        :precision="numberConfig(control, 'precision', 2)"
                        @update:value="
                          updateCandidateNumber(control.id, $event)
                        "
                      />
                      <span>{{ control.config.unit || '单位' }}</span>
                    </div>
                    <Radio.Group
                      v-else-if="control.type === 'single-choice'"
                      :value="responseString(control.id)"
                      @update:value="
                        updateCandidate(control.id, String($event))
                      "
                    >
                      <Space wrap>
                        <Radio
                          v-for="option in options(control)"
                          :key="option"
                          :value="option"
                        >
                          {{ option }}
                        </Radio>
                      </Space>
                    </Radio.Group>
                    <Checkbox.Group
                      v-else-if="control.type === 'multi-choice'"
                      :value="responseArray(control.id)"
                      :options="options(control)"
                      @update:value="updateCandidateArray(control.id, $event)"
                    />
                    <Select
                      v-else-if="control.type === 'select'"
                      :value="responseString(control.id)"
                      :options="
                        options(control).map((option) => ({
                          label: option,
                          value: option,
                        }))
                      "
                      class="w-full"
                      @update:value="
                        updateCandidate(control.id, String($event))
                      "
                    />
                    <Rate
                      v-else-if="control.type === 'rating'"
                      :value="Number(candidateResponse[control.id] ?? 0)"
                      @update:value="
                        updateCandidate(control.id, Number($event))
                      "
                    />
                    <div v-else class="candidate-special">
                      <span>{{ controlGlyphs[control.type] }}</span>
                      {{ control.label }}作答区
                    </div>
                  </div>
                </div>
              </section>
              <aside class="preview-tip">
                <strong>试答检查</strong>
                <p>
                  响应会实时写入结构化 JSON，不包含任何页面 DOM 或插件私有状态。
                </p>
                <Tag color="success">3 个字段可序列化</Tag>
                <Tag color="blue">自动 + 人工混合评分</Tag>
              </aside>
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane key="response" tab="响应 JSON">
            <div class="code-panel">
              <div class="code-panel-heading">
                <span>ResponseEnvelope</span>
                <Tag color="green">Schema valid</Tag>
              </div>
              <pre>{{ responseJson }}</pre>
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane key="scoring" tab="评分规则">
            <div class="rules-header">
              <div>
                <h3>评分规则编排</h3>
                <p>规则绑定控件 ID；模板启用后版本与规则一起冻结。</p>
              </div>
              <Space>
                <Tag
                  :color="
                    Math.abs(scoringWeight - 1) < 0.001 ? 'success' : 'warning'
                  "
                >
                  总权重 {{ Math.round(scoringWeight * 100) }}%
                </Tag>
                <Button @click="ensureScoringRules">补齐默认规则</Button>
              </Space>
            </div>
            <Alert
              class="mb-3"
              show-icon
              type="info"
              :message="`当前试答自动得分 ${previewScoring.automaticPercent}%，人工复核权重 ${previewScoring.humanPercent}%`"
              :description="
                previewScoring.evidence.join('；') ||
                '配置规则后可即时查看评分结果'
              "
            />
            <div
              v-if="interactionDesignerDraft.scoreRules.length > 0"
              class="rules-grid"
            >
              <article
                v-for="rule in interactionDesignerDraft.scoreRules"
                :key="rule.id"
                class="rule-card"
              >
                <header>
                  <div>
                    <span>绑定控件</span>
                    <strong>{{ controlLabel(rule.controlId) }}</strong>
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    @click="removeRule(rule.id)"
                  >
                    删除
                  </Button>
                </header>
                <Form layout="vertical">
                  <Form.Item label="规则类型">
                    <Select
                      :value="rule.type"
                      :options="scoringRuleTypes"
                      @update:value="setRuleType(rule, $event)"
                    />
                  </Form.Item>
                  <div class="rule-two-cols">
                    <Form.Item label="答案 / 量规">
                      <Input
                        :value="
                          String(
                            rule.config.expected ?? rule.config.rubric ?? '',
                          )
                        "
                        @update:value="setRuleExpected(rule, $event)"
                      />
                    </Form.Item>
                    <Form.Item label="规则权重">
                      <InputNumber
                        :value="rule.weight"
                        :min="0"
                        :max="1"
                        :step="0.1"
                        @update:value="setRuleWeight(rule, $event)"
                      />
                    </Form.Item>
                  </div>
                  <Form.Item v-if="rule.type === 'range'" label="允许容差">
                    <InputNumber
                      :value="Number(rule.config.tolerance ?? 0)"
                      :min="0"
                      @update:value="setRuleTolerance(rule, $event)"
                    />
                  </Form.Item>
                </Form>
              </article>
            </div>
            <Empty v-else description="暂无评分规则" />
          </Tabs.TabPane>

          <Tabs.TabPane key="paper" tab="纸面预览">
            <div class="paper-preview-wrap">
              <article class="paper-sheet">
                <header>
                  <span>知测大学 · 工程力学</span>
                  <b>第 4 题（15 分）</b>
                </header>
                <h2>杆件强度综合分析</h2>
                <p>
                  圆截面钢杆承受轴向拉力 F = 50 kN，截面积 A = 200
                  mm²，材料许用应力 [σ] = 260 MPa。请完成下列作答。
                </p>
                <ol>
                  <li
                    v-for="control in interactionDesignerDraft.controls"
                    :key="control.id"
                  >
                    <strong>{{ control.label }}</strong>
                    <template v-if="control.type === 'single-choice'">
                      <span class="paper-options">
                        <i v-for="option in options(control)" :key="option">
                          □ {{ option }}
                        </i>
                      </span>
                    </template>
                    <template v-else-if="control.type === 'number'">
                      <span class="paper-blank">
                        __________________ {{ control.config.unit }}
                      </span>
                    </template>
                    <template v-else>
                      <span
                        v-for="line in Math.min(
                          5,
                          Number(control.config.rows ?? 2),
                        )"
                        :key="line"
                        class="paper-line"
                      ></span>
                    </template>
                  </li>
                </ol>
                <footer>
                  {{ interactionDesignerDraft.paperFallback.note }}
                </footer>
              </article>
              <aside class="paper-settings">
                <Tag color="green">纸面等价</Tag>
                <h3>A4 单栏适配</h3>
                <p>作答线数</p>
                <InputNumber
                  v-model:value="
                    interactionDesignerDraft.paperFallback.answerLines
                  "
                  :min="1"
                  :max="30"
                />
                <p>替代说明</p>
                <Input.TextArea
                  v-model:value="interactionDesignerDraft.paperFallback.note"
                  :rows="5"
                />
              </aside>
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane key="schema" tab="模板 JSON">
            <div class="code-panel">
              <div class="code-panel-heading">
                <span>InteractionTemplateRevision</span>
                <Tag>{{ interactionDesignerDraft.checksum || '未保存' }}</Tag>
              </div>
              <pre>{{ templateJson }}</pre>
            </div>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.designer-page {
  --designer-blue: #2563eb;
  --designer-border: hsl(var(--border));

  display: flex;
  flex-direction: column;
  gap: 14px;
}

.designer-header {
  display: grid;
  grid-template-columns: minmax(340px, 1fr) auto auto;
  gap: 24px;
  align-items: center;
  padding: 18px 20px;
  background: hsl(var(--card));
  border: 1px solid var(--designer-border);
  border-radius: 14px;
  box-shadow: 0 8px 30px rgb(15 23 42 / 5%);
}

.designer-brand {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  font-size: 24px;
  color: #fff;
  background: linear-gradient(145deg, #2563eb, #06b6d4);
  border-radius: 13px;
  box-shadow: 0 8px 18px rgb(37 99 235 / 24%);
}

.eyebrow {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 2px;
  font-size: 11px;
  color: hsl(var(--foreground) / 52%);
}

.designer-brand h1 {
  margin: 2px 0;
  font-size: 20px;
}

.template-name,
.template-description {
  max-width: 560px;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.template-name {
  height: 28px;
  font-size: 19px;
  font-weight: 700;
}

.template-description {
  height: 22px;
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.template-name:focus,
.template-description:focus {
  box-shadow: inset 0 -1px 0 var(--designer-blue);
}

.header-meta {
  display: flex;
  gap: 18px;
  padding: 0 18px;
  border-right: 1px solid var(--designer-border);
  border-left: 1px solid var(--designer-border);
}

.header-meta span {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 10px;
  color: hsl(var(--foreground) / 48%);
  text-align: center;
}

.header-meta strong {
  font-size: 16px;
  color: hsl(var(--foreground));
}

.designer-grid {
  display: grid;
  grid-template-columns: 230px minmax(460px, 1fr) 300px;
  gap: 12px;
  align-items: stretch;
  min-height: 680px;
}

.designer-panel {
  min-width: 0;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid var(--designer-border);
  border-radius: 14px;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--designer-border);
}

.panel-heading small {
  display: block;
  margin-bottom: 3px;
  font-size: 9px;
  color: var(--designer-blue);
  letter-spacing: 0.12em;
}

.panel-heading h3 {
  margin: 0;
  font-size: 14px;
}

.palette-panel,
.property-panel {
  display: flex;
  flex-direction: column;
}

.palette-search {
  width: calc(100% - 24px);
  margin: 12px;
}

.palette-scroll {
  flex: 1;
  max-height: 670px;
  padding: 0 10px 18px;
  overflow: auto;
}

.palette-group h4 {
  margin: 14px 5px 7px;
  font-size: 10px;
  color: hsl(var(--foreground) / 42%);
  letter-spacing: 0.08em;
}

.palette-item {
  position: relative;
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 1px 9px;
  width: 100%;
  padding: 9px;
  margin-bottom: 6px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: hsl(var(--accent) / 42%);
  border: 1px solid transparent;
  border-radius: 9px;
  transition: 150ms ease;
}

.palette-item:hover {
  background: hsl(var(--accent) / 75%);
  border-color: rgb(37 99 235 / 35%);
  transform: translateY(-1px);
}

.palette-item > span {
  display: grid;
  grid-row: span 2;
  place-items: center;
  width: 34px;
  height: 34px;
  font-family: Georgia, serif;
  color: var(--designer-blue);
  background: rgb(37 99 235 / 9%);
  border-radius: 8px;
}

.palette-item b {
  font-size: 12px;
}

.palette-item small {
  font-size: 10px;
  color: hsl(var(--foreground) / 45%);
}

.palette-item > i {
  position: absolute;
  top: 16px;
  right: 8px;
  font-style: normal;
  color: var(--designer-blue);
  opacity: 0;
}

.palette-item:hover > i {
  opacity: 1;
}

.canvas-panel {
  padding-bottom: 18px;
  background:
    radial-gradient(circle at 90% 10%, rgb(59 130 246 / 5%), transparent 24%),
    hsl(var(--card));
}

.canvas-heading {
  padding-right: 18px;
  padding-left: 18px;
}

.material-context {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  padding: 20px;
  margin: 16px;
  background: linear-gradient(
    135deg,
    rgb(239 246 255 / 88%),
    rgb(240 253 250 / 78%)
  );
  border: 1px solid rgb(59 130 246 / 16%);
  border-radius: 12px;
}

:global(.dark) .material-context {
  background: linear-gradient(
    135deg,
    rgb(30 58 138 / 16%),
    rgb(13 148 136 / 10%)
  );
}

.context-order,
.control-order {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  font-size: 10px;
  color: #fff;
  background: var(--designer-blue);
  border-radius: 7px;
}

.material-context h2 {
  margin: 0 0 8px;
  font-size: 17px;
}

.material-context p {
  margin: 0;
  font-size: 12px;
  line-height: 1.8;
  color: hsl(var(--foreground) / 70%);
}

.formula-strip {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  margin-top: 12px;
  font-size: 10px;
  color: hsl(var(--foreground) / 56%);
  background: hsl(var(--background) / 72%);
  border-radius: 7px;
}

.formula-strip code {
  font-family: Georgia, serif;
  font-size: 14px;
  color: var(--designer-blue);
}

.formula-strip i {
  flex: 1;
  height: 1px;
  background: var(--designer-border);
}

.control-grid,
.runtime-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.control-grid {
  padding: 0 16px 16px;
}

.canvas-control {
  position: relative;
  grid-column: span 4;
  min-width: 0;
  padding: 14px;
  cursor: pointer;
  background: hsl(var(--background));
  border: 1px solid var(--designer-border);
  border-radius: 11px;
  transition: 140ms ease;
}

.canvas-control.span-1,
.runtime-field.span-1 {
  grid-column: span 1;
}

.canvas-control.span-2,
.runtime-field.span-2 {
  grid-column: span 2;
}

.canvas-control.span-3,
.runtime-field.span-3 {
  grid-column: span 3;
}

.canvas-control:hover {
  border-color: rgb(37 99 235 / 40%);
}

.canvas-control.selected {
  border-color: var(--designer-blue);
  box-shadow:
    0 0 0 2px rgb(37 99 235 / 10%),
    0 8px 22px rgb(37 99 235 / 8%);
}

.canvas-control > .control-order {
  position: absolute;
  top: -8px;
  left: -7px;
  width: 20px;
  height: 20px;
  background: #94a3b8;
}

.canvas-control.selected > .control-order {
  background: var(--designer-blue);
}

.canvas-control > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 11px;
}

.canvas-control > header > div {
  display: flex;
  gap: 6px;
  align-items: center;
}

.canvas-control > header strong {
  font-size: 12px;
}

.canvas-control > header > span {
  font-size: 9px;
  color: hsl(var(--foreground) / 42%);
}

.number-preview {
  display: flex;
  gap: 8px;
  align-items: center;
}

.number-preview :deep(.ant-input-number) {
  flex: 1;
  width: auto;
}

.number-preview > span {
  flex: 0 0 auto;
  min-width: 44px;
  font-size: 11px;
  color: hsl(var(--foreground) / 55%);
}

.control-tools {
  position: absolute;
  top: -13px;
  right: 8px;
  display: flex;
  gap: 3px;
  padding: 3px;
  background: var(--designer-blue);
  border-radius: 7px;
  box-shadow: 0 4px 12px rgb(37 99 235 / 25%);
}

.control-tools button {
  display: grid;
  place-items: center;
  width: 22px;
  height: 20px;
  padding: 0;
  color: #fff;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.control-tools button:hover {
  background: rgb(255 255 255 / 14%);
  border-radius: 4px;
}

.matrix-preview {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.matrix-preview span {
  display: grid;
  grid-template-columns: 1fr repeat(3, 12px);
  gap: 8px;
  align-items: center;
  font-size: 10px;
}

.matrix-preview i {
  width: 10px;
  height: 10px;
  border: 1px solid #94a3b8;
  border-radius: 50%;
}

.special-preview,
.candidate-special {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 42px;
  padding: 10px;
  font-size: 11px;
  color: hsl(var(--foreground) / 55%);
  background: hsl(var(--accent) / 48%);
  border: 1px dashed var(--designer-border);
  border-radius: 8px;
}

.special-preview b {
  font-size: 18px;
  color: var(--designer-blue);
}

.empty-canvas {
  padding: 80px 20px;
}

.canvas-hint {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 11px;
  margin: 0 16px;
  font-size: 10px;
  color: hsl(var(--foreground) / 42%);
  background: hsl(var(--accent) / 28%);
  border: 1px dashed var(--designer-border);
  border-radius: 9px;
}

.canvas-hint span {
  font-size: 16px;
  color: var(--designer-blue);
}

.property-form,
.template-property {
  flex: 1;
  max-height: 670px;
  padding: 16px;
  overflow: auto;
}

.property-two-cols,
.rule-two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.property-form :deep(.ant-form-item) {
  margin-bottom: 15px;
}

.property-form :deep(.ant-input-number),
.property-form :deep(.ant-radio-group) {
  width: 100%;
}

.property-form :deep(.ant-radio-button-wrapper) {
  width: 25%;
  padding: 0;
  text-align: center;
}

.config-editor,
.code-panel pre {
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
}

.config-error {
  margin: 5px 0 0;
  font-size: 11px;
  color: #ef4444;
}

.property-actions {
  justify-content: flex-end;
  width: 100%;
}

.preview-workbench {
  overflow: hidden;
  border-radius: 14px;
}

.preview-workbench :deep(.ant-card-body) {
  padding: 0 20px 20px;
}

.preview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 230px;
  gap: 16px;
  align-items: start;
}

.candidate-paper {
  padding: 26px;
  background: hsl(var(--background));
  border: 1px solid var(--designer-border);
  border-radius: 12px;
}

.candidate-paper > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  font-size: 11px;
  color: hsl(var(--foreground) / 48%);
}

.candidate-paper h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.candidate-stem {
  padding-bottom: 15px;
  margin: 0 0 17px;
  color: hsl(var(--foreground) / 65%);
  border-bottom: 1px solid var(--designer-border);
}

.runtime-field {
  grid-column: span 4;
}

.runtime-field > label {
  display: block;
  margin-bottom: 7px;
  font-size: 12px;
  font-weight: 600;
}

.runtime-field > label i {
  margin-left: 3px;
  font-style: normal;
  color: #ef4444;
}

.preview-tip {
  padding: 18px;
  background: linear-gradient(145deg, rgb(37 99 235 / 8%), rgb(6 182 212 / 7%));
  border: 1px solid rgb(37 99 235 / 15%);
  border-radius: 12px;
}

.preview-tip strong {
  font-size: 13px;
}

.preview-tip p {
  margin: 9px 0 14px;
  font-size: 11px;
  line-height: 1.7;
  color: hsl(var(--foreground) / 55%);
}

.preview-tip :deep(.ant-tag) {
  margin-bottom: 6px;
}

.code-panel {
  overflow: hidden;
  color: #cbd5e1;
  background: #07111f;
  border-radius: 12px;
}

.code-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 11px;
  background: #101b2d;
  border-bottom: 1px solid #1e293b;
}

.code-panel pre {
  max-height: 520px;
  padding: 18px;
  margin: 0;
  overflow: auto;
  line-height: 1.7;
  white-space: pre-wrap;
}

.rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.rules-header h3 {
  margin: 0 0 4px;
}

.rules-header p {
  margin: 0;
  font-size: 11px;
  color: hsl(var(--foreground) / 50%);
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.rule-card {
  padding: 14px;
  border: 1px solid var(--designer-border);
  border-radius: 10px;
}

.rule-card > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--designer-border);
}

.rule-card > header > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rule-card > header span {
  font-size: 9px;
  color: hsl(var(--foreground) / 44%);
}

.rule-card > header strong {
  font-size: 12px;
}

.rule-card :deep(.ant-form-item) {
  margin-bottom: 10px;
}

.rule-card :deep(.ant-input-number) {
  width: 100%;
}

.paper-preview-wrap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  gap: 18px;
  align-items: start;
  padding: 22px;
  background: #e5e7eb;
  border-radius: 12px;
}

.paper-sheet {
  width: min(720px, 100%);
  min-height: 760px;
  padding: 50px 58px;
  margin: auto;
  color: #111827;
  background: #fff;
  box-shadow: 0 16px 45px rgb(15 23 42 / 18%);
}

.paper-sheet > header {
  display: flex;
  justify-content: space-between;
  padding-bottom: 10px;
  font-size: 11px;
  border-bottom: 2px solid #111827;
}

.paper-sheet h2 {
  margin: 28px 0 12px;
  font-family: SimSun, serif;
  font-size: 18px;
}

.paper-sheet > p,
.paper-sheet li {
  font-family: SimSun, serif;
  font-size: 13px;
  line-height: 2;
}

.paper-sheet li {
  margin-bottom: 18px;
}

.paper-sheet li > strong {
  display: block;
}

.paper-options {
  display: flex;
  gap: 26px;
}

.paper-options i {
  font-style: normal;
}

.paper-blank {
  display: block;
  margin-top: 10px;
}

.paper-line {
  display: block;
  height: 24px;
  border-bottom: 1px solid #9ca3af;
}

.paper-sheet footer {
  padding-top: 12px;
  margin-top: 30px;
  font-size: 10px;
  color: #6b7280;
  border-top: 1px solid #d1d5db;
}

.paper-settings {
  padding: 18px;
  color: hsl(var(--foreground));
  background: hsl(var(--card));
  border-radius: 10px;
}

.paper-settings h3 {
  margin: 10px 0 18px;
}

.paper-settings p {
  margin: 13px 0 6px;
  font-size: 11px;
  color: hsl(var(--foreground) / 56%);
}

.paper-settings :deep(.ant-input-number) {
  width: 100%;
}

@media (max-width: 1400px) {
  .designer-header {
    grid-template-columns: 1fr auto;
  }

  .header-meta {
    display: none;
  }

  .designer-grid {
    grid-template-columns: 210px minmax(420px, 1fr);
  }

  .property-panel {
    grid-column: 1 / -1;
  }

  .property-form,
  .template-property {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0 14px;
    max-height: none;
  }
}

@media (max-width: 900px) {
  .designer-header,
  .designer-grid,
  .preview-layout,
  .paper-preview-wrap {
    grid-template-columns: 1fr;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .palette-scroll {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    max-height: none;
  }

  .property-form,
  .template-property,
  .rules-grid {
    grid-template-columns: 1fr;
  }

  .paper-settings {
    order: -1;
  }
}

@media (max-width: 620px) {
  .designer-brand {
    grid-template-columns: 1fr;
  }

  .brand-mark {
    display: none;
  }

  .header-actions :deep(.ant-select) {
    width: 100% !important;
  }

  .material-context {
    grid-template-columns: 1fr;
  }

  .control-grid,
  .runtime-grid {
    grid-template-columns: 1fr;
  }

  .canvas-control,
  .canvas-control.span-1,
  .canvas-control.span-2,
  .canvas-control.span-3,
  .runtime-field,
  .runtime-field.span-1,
  .runtime-field.span-2,
  .runtime-field.span-3 {
    grid-column: span 1;
  }

  .paper-sheet {
    min-height: 0;
    padding: 28px 24px;
  }
}
</style>
