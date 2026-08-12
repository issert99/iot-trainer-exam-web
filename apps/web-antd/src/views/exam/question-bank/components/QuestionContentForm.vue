<script lang="ts" setup>
import type { BuilderComponent } from '../mock';

import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
} from 'ant-design-vue';

import { paletteMeta } from '../mock';
import {
  createEmptyTemplateDefinition,
  createTemplateResponseComponent,
  RESPONSE_OPTIONS,
} from '../template-schema';

defineOptions({ name: 'QuestionContentForm' });

const INLINE_RESPONSE_TYPES = new Set([
  'choice',
  'formula',
  'multi_choice',
  'number',
  'shared_options',
  'text_short',
  'true_false',
]);

const components = defineModel<BuilderComponent[]>('components', {
  required: true,
});

function addOption(comp: BuilderComponent) {
  const options = [...(comp.config.options || [])];
  const nextKey = String.fromCodePoint(65 + options.length);
  options.push({ key: nextKey, text: `选项 ${nextKey}` });
  comp.config.options = options;
}

function linesOf(value: unknown) {
  return Array.isArray(value) ? value.join('\n') : String(value || '');
}

function setLines(comp: BuilderComponent, key: string, text: string) {
  comp.config[key] = String(text)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function setClozeOptions(comp: BuilderComponent, text: string) {
  comp.config.options = String(text)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((text, index) => ({
      key: String.fromCodePoint(65 + index),
      text,
    }));
}

function inlineResponseOptions(comp: BuilderComponent) {
  const allowed = Array.isArray(comp.config.allowedBlankTypes)
    ? comp.config.allowedBlankTypes
    : [];
  return RESPONSE_OPTIONS.filter(
    (item) =>
      INLINE_RESPONSE_TYPES.has(item.value) &&
      (allowed.length === 0 || allowed.includes(item.value)),
  );
}

function inlineResponseLabel(type: string) {
  const labels: Record<string, string> = {
    choice: '独立四选一',
    formula: '公式',
    multi_choice: '独立多选',
    number: '数值',
    shared_options: '共享词库',
    text_short: '文本',
    true_false: '判断',
  };
  return labels[type] || type;
}

function setClozeBlankType(comp: BuilderComponent, value: unknown) {
  comp.config.blankType = String(value);
  if (comp.config.blankTypeMode !== 'per_blank') {
    comp.config.blanks = (comp.config.blanks || []).map((blank: any) => ({
      ...blank,
      type: comp.config.blankType,
    }));
  }
  if (
    ['choice', 'multi_choice', 'shared_options'].includes(
      comp.config.blankType,
    ) &&
    (!Array.isArray(comp.config.options) || comp.config.options.length === 0)
  ) {
    comp.config.options = ['A', 'B', 'C', 'D'].map((key) => ({
      key,
      text: `选项 ${key}`,
    }));
  }
}

function setClozeBlankCount(comp: BuilderComponent, value: unknown) {
  const count = Math.max(1, Number(value || 1));
  const current = Array.isArray(comp.config.blanks) ? comp.config.blanks : [];
  comp.config.blankCount = count;
  comp.config.blanks = Array.from({ length: count }, (_, index) => ({
    marker: index + 1,
    type: comp.config.blankType || 'text_short',
    answer: '',
    ...current[index],
  }));
}

function setClozePassage(comp: BuilderComponent, value: unknown) {
  const passage = String(value || '');
  comp.config.passage = passage;
  const markers = [...passage.matchAll(/\[\[(\d+)\]\]/g)].map((match) =>
    Number(match[1]),
  );
  if (markers.length > 0) {
    setClozeBlankCount(
      comp,
      Math.max(Number(comp.config.blankCount || 1), ...markers),
    );
  }
}

function addClozeMarker(comp: BuilderComponent) {
  const passage = String(comp.config.passage || '');
  const markers = [...passage.matchAll(/\[\[(\d+)\]\]/g)].map((match) =>
    Number(match[1]),
  );
  const next = markers.length > 0 ? Math.max(...markers) + 1 : 1;
  comp.config.passage = `${passage}${passage ? ' ' : ''}[[${next}]]`;
  setClozeBlankCount(comp, Math.max(Number(comp.config.blankCount || 1), next));
}

function setClozeItemType(blank: Record<string, any>, value: unknown) {
  blank.type = String(value);
  if (
    ['choice', 'multi_choice'].includes(blank.type) &&
    (!Array.isArray(blank.options) || blank.options.length === 0)
  ) {
    blank.options = ['A', 'B', 'C', 'D'].map((key) => ({
      key,
      text: `选项 ${key}`,
    }));
  }
}

function setClozeItemOptions(blank: Record<string, any>, value: unknown) {
  blank.options = String(value || '')
    .split('\n')
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({
      key: String.fromCodePoint(65 + index),
      text,
    }));
}

function clozeBlanks(comp: BuilderComponent) {
  const count = Math.max(1, Number(comp.config.blankCount || 1));
  if (
    !Array.isArray(comp.config.blanks) ||
    comp.config.blanks.length !== count
  ) {
    setClozeBlankCount(comp, count);
  }
  return comp.config.blanks;
}

function clozeAnswerPlaceholder(type: string) {
  if (type === 'multi_choice') {
    return '按空位填写，多选用 + 连接，例如 A+C,B+D';
  }
  if (type === 'true_false') return '按空位填写：正确,错误,正确';
  if (type === 'number') return '按空位填写数值，例如 12.5,30';
  if (type === 'formula') {
    return String.raw`按空位填写 LaTeX，例如 x^2,\frac{1}{2}`;
  }
  if (type === 'text_short') return '按空位填写答案，例如 路由器,TCP';
  return '按空位填写选项编号，例如 A,C,B,D';
}

function clozeUsesType(comp: BuilderComponent, types: string[]) {
  if (types.includes(comp.config.blankType)) return true;
  return (comp.config.blanks || []).some((blank: any) =>
    types.includes(blank.type),
  );
}

function addGroupChild(group: BuilderComponent) {
  if (group.config.countMode === 'fixed') return;
  const allowed = group.config.allowedResponseTypes || ['choice'];
  const responseType = group.config.newChildType || allowed[0];
  const definition = createEmptyTemplateDefinition();
  definition.responseTypes = [responseType];
  const child = createTemplateResponseComponent(responseType, definition);
  group.children = [...(group.children || []), child];
}

function removeGroupChild(group: BuilderComponent, id: string) {
  if (group.config.countMode === 'fixed') return;
  group.children = (group.children || []).filter((item) => item.id !== id);
}
</script>

<template>
  <div class="qb-content">
    <div class="qb-content-tip">
      已套用模板结构，请直接填写题目内容（不必再选组件）。
    </div>

    <div v-if="components.length === 0" class="qb-empty">
      请先选择题型模板。
    </div>

    <div v-for="(comp, index) in components" :key="comp.id" class="qb-block">
      <div class="qb-block-head">
        <Space>
          <span class="qb-block-index">{{ index + 1 }}</span>
          <strong>{{ comp.label }}</strong>
          <Tag>{{ paletteMeta(comp.type as any)?.name || comp.type }}</Tag>
          <Tag v-if="comp.score > 0" color="blue">{{ comp.score }} 分</Tag>
        </Space>
      </div>

      <Form layout="vertical" class="qb-block-body">
        <!-- 题干 -->
        <template v-if="comp.type === 'rich_stem'">
          <Form.Item label="题目材料 / 题干">
            <Input.TextArea
              v-model:value="comp.config.html"
              :rows="5"
              placeholder="在此输入题目文字，可说明附图/拓扑图位置"
            />
          </Form.Item>
          <Form.Item label="附图地址（可选）">
            <Input
              v-model:value="comp.config.imageUrl"
              placeholder="示意图、拓扑图 URL（后续可接上传）"
            />
          </Form.Item>
        </template>

        <!-- 选项 -->
        <template v-else-if="comp.type === 'option_group'">
          <Form.Item label="题干（小题）">
            <Input
              v-model:value="comp.config.prompt"
              placeholder="如：下列说法正确的是"
            />
          </Form.Item>
          <Form.Item label="选项">
            <div
              v-for="(opt, oi) in comp.config.options || []"
              :key="oi"
              class="qb-option-row"
            >
              <Input v-model:value="opt.key" style="width: 64px" />
              <Input v-model:value="opt.text" placeholder="选项内容" />
            </div>
            <a class="qb-link" @click.prevent="addOption(comp)">+ 添加选项</a>
          </Form.Item>
          <Form.Item label="正确答案">
            <Input
              :value="(comp.config.answer || []).join(',')"
              placeholder="如 A 或 A,C"
              @update:value="
                (v) =>
                  (comp.config.answer = String(v)
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean))
              "
            />
          </Form.Item>
          <Form.Item label="分值">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>

        <!-- 题干内多空 -->
        <template v-else-if="comp.type === 'cloze'">
          <Form.Item label="题干内容">
            <Input.TextArea
              :value="comp.config.passage"
              :rows="8"
              placeholder="输入题干，并用 [[1]]、[[2]]、[[3]] 标记答案空"
              @update:value="(value) => setClozePassage(comp, value)"
            />
            <Button class="mt-2" size="small" @click="addClozeMarker(comp)">
              ＋ 在末尾插入下一个空位
            </Button>
          </Form.Item>
          <Form.Item label="每个空的作答方式">
            <Select
              :value="comp.config.blankType || 'shared_options'"
              :options="inlineResponseOptions(comp)"
              style="width: 260px"
              @update:value="(value) => setClozeBlankType(comp, value)"
            />
          </Form.Item>
          <Form.Item label="空位数量">
            <InputNumber
              :value="comp.config.blankCount"
              :min="1"
              :max="200"
              @update:value="(value) => setClozeBlankCount(comp, value)"
            />
          </Form.Item>
          <Form.Item
            :label="
              comp.config.blankTypeMode === 'per_blank'
                ? '分别设置每个空的类型、选项和答案'
                : '分别设置每个空的选项和答案'
            "
          >
            <div class="qb-blank-list">
              <div
                v-for="(blank, blankIndex) in clozeBlanks(comp)"
                :key="blank.marker || blankIndex"
                class="qb-blank-card"
              >
                <div class="qb-blank-row">
                  <Tag color="blue">空 {{ Number(blankIndex) + 1 }}</Tag>
                  <Select
                    v-if="comp.config.blankTypeMode === 'per_blank'"
                    :value="blank.type"
                    :options="inlineResponseOptions(comp)"
                    style="width: 190px"
                    @update:value="(value) => setClozeItemType(blank, value)"
                  />
                  <Tag v-else>{{ inlineResponseLabel(blank.type) }}</Tag>
                  <Select
                    v-if="blank.type === 'true_false'"
                    v-model:value="blank.answer"
                    :options="[
                      { label: '正确', value: 'true' },
                      { label: '错误', value: 'false' },
                    ]"
                    placeholder="设置正确答案"
                  />
                  <Input
                    v-else
                    v-model:value="blank.answer"
                    :placeholder="clozeAnswerPlaceholder(blank.type)"
                  />
                </div>
                <Input.TextArea
                  v-if="['choice', 'multi_choice'].includes(blank.type)"
                  :value="
                    (blank.options || [])
                      .map((item: any) => item.text)
                      .join('\n')
                  "
                  :rows="4"
                  placeholder="该空的独立选项，一行一个，例如四行分别为 A/B/C/D 的内容"
                  @update:value="(value) => setClozeItemOptions(blank, value)"
                />
              </div>
            </div>
          </Form.Item>
          <Form.Item
            v-if="clozeUsesType(comp, ['shared_options'])"
            label="所有空共用的词库（一行一个）"
          >
            <Input.TextArea
              :value="
                (comp.config.options || [])
                  .map((item: any) => item.text)
                  .join('\n')
              "
              :rows="8"
              @update:value="(value) => setClozeOptions(comp, String(value))"
            />
          </Form.Item>
          <Form.Item
            v-if="clozeUsesType(comp, ['shared_options'])"
            label="共享选项使用规则"
          >
            <Select
              v-model:value="comp.config.reuse"
              style="width: 220px"
              :options="[
                { label: '每个选项只能使用一次', value: 'once' },
                { label: '允许重复使用', value: 'repeatable' },
              ]"
            />
          </Form.Item>
          <Form.Item label="总分">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>

        <!-- 文本作答 -->
        <template v-else-if="comp.type === 'text_input'">
          <Form.Item label="作答提示">
            <Input v-model:value="comp.config.placeholder" />
          </Form.Item>
          <Form.Item label="参考答案（阅卷用）">
            <Input.TextArea v-model:value="comp.config.refAnswer" :rows="3" />
          </Form.Item>
          <Form.Item label="分值">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>

        <!-- 代码 -->
        <template v-else-if="comp.type === 'code_editor'">
          <Form.Item label="题目补充说明">
            <Input.TextArea v-model:value="comp.config.prompt" :rows="3" />
          </Form.Item>
          <Form.Item label="初始代码">
            <Input.TextArea
              v-model:value="comp.config.starterCode"
              :rows="5"
              class="qb-code"
            />
          </Form.Item>
          <Form.Item label="测试用例说明">
            <Input.TextArea v-model:value="comp.config.testCases" :rows="3" />
          </Form.Item>
          <Form.Item label="分值">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>

        <!-- 音视频材料 -->
        <template v-else-if="comp.type === 'media_player'">
          <Form.Item label="媒体类型">
            <Select
              v-model:value="comp.config.mediaType"
              :options="[
                { label: '音频', value: 'audio' },
                { label: '视频', value: 'video' },
              ]"
              style="width: 160px"
            />
          </Form.Item>
          <Form.Item label="媒体地址">
            <Input
              v-model:value="comp.config.url"
              placeholder="上传后的文件 URL"
            />
          </Form.Item>
          <Form.Item label="最大播放次数">
            <InputNumber v-model:value="comp.config.maxPlays" :min="0" />
          </Form.Item>
        </template>

        <!-- 画布 -->
        <template v-else-if="comp.type === 'canvas'">
          <Form.Item label="作答要求说明">
            <Input.TextArea
              v-model:value="comp.config.prompt"
              :rows="3"
              placeholder="如：请按要求完成拓扑连线"
            />
          </Form.Item>
          <Form.Item label="背景底图（拓扑/电路示意图）">
            <Input
              v-model:value="comp.config.backgroundImage"
              placeholder="底图 URL"
            />
          </Form.Item>
          <Form.Item label="画布模式">
            <Select
              v-model:value="comp.config.mode"
              style="width: 200px"
              :options="[
                { label: '自由绘图', value: 'draw' },
                { label: '连线', value: 'connect' },
                { label: '框图', value: 'block' },
                { label: '电路图', value: 'circuit' },
                { label: '网络拓扑', value: 'topology' },
              ]"
            />
          </Form.Item>
          <Form.Item label="分值">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>

        <!-- 公式 -->
        <template v-else-if="comp.type === 'formula'">
          <Form.Item label="题目提示">
            <Input v-model:value="comp.config.placeholder" />
          </Form.Item>
          <Form.Item label="参考答案（LaTeX）">
            <Input v-model:value="comp.config.refAnswer" placeholder="如 x^2" />
          </Form.Item>
          <Form.Item label="分值">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>

        <!-- 匹配 -->
        <template v-else-if="comp.type === 'matching'">
          <Form.Item label="左侧项（一行一个）">
            <Input.TextArea
              :value="linesOf(comp.config.left)"
              :rows="4"
              @update:value="(v) => setLines(comp, 'left', String(v))"
            />
          </Form.Item>
          <Form.Item label="右侧项（一行一个）">
            <Input.TextArea
              :value="linesOf(comp.config.right)"
              :rows="4"
              @update:value="(v) => setLines(comp, 'right', String(v))"
            />
          </Form.Item>
          <Form.Item label="分值">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>

        <!-- 排序 -->
        <template v-else-if="comp.type === 'sorting'">
          <Form.Item label="待排序项（一行一个，按正确顺序填写）">
            <Input.TextArea
              :value="linesOf(comp.config.items)"
              :rows="4"
              @update:value="(v) => setLines(comp, 'items', String(v))"
            />
          </Form.Item>
          <Form.Item label="分值">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>

        <!-- 口语 -->
        <template v-else-if="comp.type === 'audio_record'">
          <Form.Item label="口语题目提示">
            <Input.TextArea v-model:value="comp.config.tip" :rows="3" />
          </Form.Item>
          <Form.Item label="最长秒数">
            <InputNumber v-model:value="comp.config.maxSeconds" :min="10" />
          </Form.Item>
          <Form.Item label="分值">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>

        <!-- 图片标注 -->
        <template v-else-if="comp.type === 'image_hotspot'">
          <Form.Item label="题目图片">
            <Input
              v-model:value="comp.config.imageUrl"
              placeholder="图片 URL"
            />
          </Form.Item>
          <Form.Item label="作答说明">
            <Input v-model:value="comp.config.prompt" />
          </Form.Item>
          <Form.Item label="分值">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>

        <!-- 上传 -->
        <template v-else-if="comp.type === 'file_upload'">
          <Form.Item label="提交要求说明">
            <Input.TextArea v-model:value="comp.config.prompt" :rows="3" />
          </Form.Item>
          <Form.Item label="允许格式">
            <Input v-model:value="comp.config.accept" />
          </Form.Item>
          <Form.Item label="分值">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>

        <!-- 表格 -->
        <template v-else-if="comp.type === 'table_fill'">
          <Form.Item label="填写说明">
            <Input v-model:value="comp.config.prompt" />
          </Form.Item>
          <Form.Item label="行数 / 列数">
            <Space>
              <InputNumber v-model:value="comp.config.rows" :min="1" />
              <InputNumber v-model:value="comp.config.cols" :min="1" />
            </Space>
          </Form.Item>
          <Form.Item label="分值">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>

        <!-- 小题容器：递归渲染子题 -->
        <template v-else-if="comp.type === 'group'">
          <div class="qb-group-tip">
            <template v-if="comp.config.countMode === 'fixed'">
              本题组固定包含
              {{ comp.config.fixedCount }} 道小题，只能编辑内容和答案。
            </template>
            <template v-else>
              以下为该大题的小题，可以在模板允许的数量范围内继续添加。
            </template>
          </div>
          <Space
            v-if="comp.config.countMode !== 'fixed'"
            class="qb-group-actions"
          >
            <Select
              v-model:value="comp.config.newChildType"
              style="width: 220px"
              :options="
                RESPONSE_OPTIONS.filter((item) =>
                  (comp.config.allowedResponseTypes || []).includes(item.value),
                )
              "
              placeholder="选择新增小题的作答方式"
            />
            <Button
              type="dashed"
              :disabled="
                (comp.children?.length || 0) >= Number(comp.config.max || 100)
              "
              @click="addGroupChild(comp)"
            >
              添加小题
            </Button>
          </Space>
          <div
            v-for="(child, ci) in comp.children || []"
            :key="child.id"
            class="qb-sub"
          >
            <div class="qb-sub-head">
              <span>
                小题 {{ ci + 1 }} ·
                {{ paletteMeta(child.type as any)?.name || child.type }}
              </span>
              <Button
                v-if="comp.config.countMode !== 'fixed'"
                size="small"
                danger
                :disabled="
                  (comp.children?.length || 0) <= Number(comp.config.min || 0)
                "
                @click="removeGroupChild(comp, child.id)"
              >
                删除
              </Button>
            </div>
            <!-- 复用同页逻辑：内联简化版 -->
            <template v-if="child.type === 'option_group'">
              <Form.Item label="小题题干">
                <Input v-model:value="child.config.prompt" />
              </Form.Item>
              <Form.Item label="选项">
                <div
                  v-for="(opt, oi) in child.config.options || []"
                  :key="oi"
                  class="qb-option-row"
                >
                  <Input v-model:value="opt.key" style="width: 64px" />
                  <Input v-model:value="opt.text" />
                </div>
                <a class="qb-link" @click.prevent="addOption(child)">
                  + 添加选项
                </a>
              </Form.Item>
              <Form.Item label="正确答案">
                <Input
                  :value="(child.config.answer || []).join(',')"
                  @update:value="
                    (v) =>
                      (child.config.answer = String(v)
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean))
                  "
                />
              </Form.Item>
              <Form.Item label="分值">
                <InputNumber v-model:value="child.score" :min="0" />
              </Form.Item>
            </template>
            <template v-else-if="child.type === 'text_input'">
              <Form.Item label="作答提示">
                <Input v-model:value="child.config.placeholder" />
              </Form.Item>
              <Form.Item label="参考答案">
                <Input.TextArea
                  v-model:value="child.config.refAnswer"
                  :rows="2"
                />
              </Form.Item>
              <Form.Item label="分值">
                <InputNumber v-model:value="child.score" :min="0" />
              </Form.Item>
            </template>
            <template v-else-if="child.type === 'cloze'">
              <Form.Item label="文章内容">
                <Input.TextArea
                  v-model:value="child.config.passage"
                  :rows="6"
                  placeholder="用 [[1]]、[[2]] 标记空位"
                />
              </Form.Item>
              <Form.Item label="共享选项（一行一个）">
                <Input.TextArea
                  :value="
                    (child.config.options || [])
                      .map((item: any) => item.text)
                      .join('\n')
                  "
                  :rows="6"
                  @update:value="
                    (value) => setClozeOptions(child, String(value))
                  "
                />
              </Form.Item>
              <Form.Item label="正确答案">
                <Input
                  :value="(child.config.answers || []).join(',')"
                  @update:value="
                    (value) =>
                      (child.config.answers = String(value)
                        .split(/[,，\s]+/)
                        .filter(Boolean))
                  "
                />
              </Form.Item>
              <Form.Item label="总分">
                <InputNumber v-model:value="child.score" :min="0" />
              </Form.Item>
            </template>
            <template v-else>
              <Form.Item label="内容配置">
                <Input.TextArea
                  v-model:value="child.config.prompt"
                  :rows="2"
                  placeholder="填写该小题内容"
                />
              </Form.Item>
              <Form.Item label="分值">
                <InputNumber v-model:value="child.score" :min="0" />
              </Form.Item>
            </template>
          </div>
        </template>

        <template v-else>
          <Form.Item label="内容">
            <Input.TextArea
              v-model:value="comp.config.prompt"
              :rows="3"
              placeholder="填写该组件内容"
            />
          </Form.Item>
          <Form.Item label="分值">
            <InputNumber v-model:value="comp.score" :min="0" />
          </Form.Item>
        </template>
      </Form>
    </div>
  </div>
</template>

<style scoped>
.qb-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.qb-content-tip {
  padding: 10px 12px;
  font-size: 13px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 8%);
  border: 1px solid hsl(var(--primary) / 20%);
  border-radius: 8px;
}

.qb-empty {
  padding: 32px;
  color: hsl(var(--muted-foreground));
  text-align: center;
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
}

.qb-block {
  padding: 14px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.qb-block-head {
  margin-bottom: 10px;
}

.qb-block-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 12px;
  font-weight: 600;
  background: hsl(var(--accent));
  border-radius: 999px;
}

.qb-option-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.qb-blank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qb-blank-card {
  padding: 9px;
  background: hsl(var(--muted) / 25%);
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
}

.qb-blank-row {
  display: grid;
  grid-template-columns: auto 190px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.qb-blank-card :deep(textarea) {
  margin-top: 8px;
}

.qb-link {
  font-size: 13px;
  color: hsl(var(--primary));
  cursor: pointer;
}

.qb-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.qb-group-tip {
  margin-bottom: 10px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.qb-group-actions {
  margin-bottom: 12px;
}

.qb-sub {
  padding: 12px;
  margin-bottom: 10px;
  background: hsl(var(--background));
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
}

.qb-sub-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}
</style>
