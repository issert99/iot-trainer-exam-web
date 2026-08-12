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

function addGroupChild(group: BuilderComponent) {
  const allowed = group.config.allowedResponseTypes || ['choice'];
  const responseType = group.config.newChildType || allowed[0];
  const definition = createEmptyTemplateDefinition();
  definition.responseTypes = [responseType];
  const child = createTemplateResponseComponent(responseType, definition);
  group.children = [...(group.children || []), child];
}

function removeGroupChild(group: BuilderComponent, id: string) {
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

        <!-- 共享选项完形填空 -->
        <template v-else-if="comp.type === 'cloze'">
          <Form.Item label="文章内容">
            <Input.TextArea
              v-model:value="comp.config.passage"
              :rows="8"
              placeholder="输入文章，并用 [[1]]、[[2]]、[[3]] 标记空位"
            />
          </Form.Item>
          <Form.Item label="空位数量">
            <InputNumber
              v-model:value="comp.config.blankCount"
              :min="1"
              :max="200"
            />
          </Form.Item>
          <Form.Item label="共享选项（一行一个）">
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
          <Form.Item label="正确答案">
            <Input
              :value="(comp.config.answers || []).join(',')"
              placeholder="按空位顺序填写选项编号，例如 A,C,B,D"
              @update:value="
                (value) =>
                  (comp.config.answers = String(value)
                    .split(/[,，\s]+/)
                    .map((item) => item.trim())
                    .filter(Boolean))
              "
            />
          </Form.Item>
          <Form.Item label="选项使用规则">
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
            以下为该材料下的小题。可以在模板允许的范围内继续添加小题：
          </div>
          <Space class="qb-group-actions">
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
