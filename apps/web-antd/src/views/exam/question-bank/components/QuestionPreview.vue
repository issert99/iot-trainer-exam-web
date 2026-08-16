<script lang="ts" setup>
import type { BuilderComponent } from '../mock';

import { computed, reactive, watch } from 'vue';

import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  Radio,
  Select,
  Upload,
} from 'ant-design-vue';

import CodeEditorBlock from './CodeEditorBlock.vue';
import DrawingAnswer from './DrawingAnswer.vue';
import FormulaEditor from './FormulaEditor.vue';
import MatchingConnect from './MatchingConnect.vue';
import TopologyCanvas from './TopologyCanvas.vue';

const props = defineProps<{
  components: BuilderComponent[];
  title: string;
}>();

/** 预览态作答缓存（仅前端演示，不提交） */
const answers = reactive<Record<string, any>>({});

watch(
  () => props.components,
  (list) => {
    Object.keys(answers).forEach((k) => delete answers[k]);
    const walk = (nodes: BuilderComponent[]) => {
      for (const node of nodes || []) {
        switch (node.type) {
          case 'canvas': {
            answers[node.id] = node.config.mode === 'draw' ? '' : [];

            break;
          }
          case 'cloze': {
            answers[node.id] = Array.from(
              { length: Number(node.config.blankCount || 1) },
              (_, index) =>
                clozeBlankType(node.config, index) === 'multi_choice'
                  ? []
                  : undefined,
            );

            break;
          }
          case 'code_editor':
          case 'formula':
          case 'text_input': {
            answers[node.id] = node.config.starterCode || '';

            break;
          }
          case 'matching': {
            answers[node.id] = {};

            break;
          }
          case 'option_group': {
            answers[node.id] = node.config.mode === 'multi' ? [] : undefined;

            break;
          }
          case 'sorting': {
            answers[node.id] = [...(node.config.items || [])];

            break;
          }
          default: {
            if (node.children?.length) {
              walk(node.children);
            }
          }
        }
      }
    };
    walk(list || []);
  },
  { immediate: true, deep: true },
);

const totalScore = computed(() => {
  const sum = (nodes: BuilderComponent[]): number =>
    (nodes || []).reduce(
      (s, n) => s + Number(n.score || 0) + sum(n.children || []),
      0,
    );
  return sum(props.components || []);
});

function moveSort(id: string, index: number, dir: -1 | 1) {
  const list = [...(answers[id] || [])];
  const j = index + dir;
  if (j < 0 || j >= list.length) return;
  const t = list[index];
  list[index] = list[j];
  list[j] = t;
  answers[id] = list;
}

function clozeParts(text: string) {
  return String(text || '').split(/(\[\[\d+\]\])/g);
}

function clozeIndex(part: string) {
  const match = part.match(/\[\[(\d+)\]\]/);
  return match ? Number(match[1]) - 1 : -1;
}

function clozeBlank(config: BuilderComponent['config'], index: number) {
  return Array.isArray(config.blanks) ? config.blanks[index] || {} : {};
}

function clozeBlankType(config: BuilderComponent['config'], index: number) {
  return clozeBlank(config, index).type || config.blankType || 'shared_options';
}

function clozeOptionItems(
  config: BuilderComponent['config'],
  index: number,
  answerValues: unknown[] = [],
) {
  const blank = clozeBlank(config, index);
  if (clozeBlankType(config, index) === 'true_false') {
    return [
      { label: '正确', value: 'true' },
      { label: '错误', value: 'false' },
    ];
  }
  let options = ['A', 'B', 'C', 'D'].map((key) => ({
    key,
    text: `选项 ${key}`,
  }));
  if (Array.isArray(config.options) && config.options.length > 0) {
    options = config.options;
  }
  if (Array.isArray(blank.options) && blank.options.length > 0) {
    options = blank.options;
  }
  const selectedElsewhere = new Set(
    answerValues
      .filter((_, answerIndex) => answerIndex !== index)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(Boolean),
  );
  return options.map((item: { key: string; text: string }) => ({
    label: `${item.key}. ${item.text}`,
    value: item.key,
    disabled:
      config.reuse === 'once' &&
      clozeBlankType(config, index) === 'shared_options' &&
      selectedElsewhere.has(item.key),
  }));
}

function clozeUsesSharedOptions(config: BuilderComponent['config']) {
  return (
    config.blankType === 'shared_options' ||
    (config.blanks || []).some(
      (blank: Record<string, any>) => blank.type === 'shared_options',
    )
  );
}
</script>

<template>
  <div class="qb-paper">
    <header class="qb-paper-head">
      <h2 class="qb-paper-title">{{ title || '未命名题目' }}</h2>
      <div class="qb-paper-meta">
        <span>学生作答预览</span>
        <span v-if="totalScore > 0">满分 {{ totalScore }} 分</span>
      </div>
    </header>

    <div v-if="!components?.length" class="qb-paper-empty">暂无题目内容</div>

    <article v-else class="qb-paper-body">
      <template v-for="comp in components" :key="comp.id">
        <!-- 题干：直接融入正文，不加「第 N 块」 -->
        <section v-if="comp.type === 'rich_stem'" class="qb-section">
          <div
            v-if="comp.config.html"
            class="qb-stem"
            v-html="comp.config.html"
          ></div>
          <div v-else class="qb-stem qb-stem-empty">（未填写题干）</div>
          <img
            v-if="comp.config.imageUrl"
            :src="comp.config.imageUrl"
            class="qb-stem-img"
            alt="题目配图"
          />
        </section>

        <section v-else-if="comp.type === 'option_group'" class="qb-section">
          <div v-if="comp.config.prompt" class="qb-stem">
            {{ comp.config.prompt }}
          </div>
          <Radio.Group
            v-if="comp.config.mode !== 'multi'"
            v-model:value="answers[comp.id]"
            class="qb-options"
          >
            <div
              v-for="opt in comp.config.options || []"
              :key="opt.key"
              class="qb-option"
            >
              <Radio :value="opt.key">{{ opt.key }}. {{ opt.text }}</Radio>
            </div>
          </Radio.Group>
          <Checkbox.Group
            v-else
            v-model:value="answers[comp.id]"
            class="qb-options"
          >
            <div
              v-for="opt in comp.config.options || []"
              :key="opt.key"
              class="qb-option"
            >
              <Checkbox :value="opt.key">
                {{ opt.key }}. {{ opt.text }}
              </Checkbox>
            </div>
          </Checkbox.Group>
        </section>

        <section v-else-if="comp.type === 'cloze'" class="qb-section">
          <div class="qb-cloze-passage">
            <template
              v-for="(part, partIndex) in clozeParts(comp.config.passage)"
              :key="`${comp.id}-${partIndex}`"
            >
              <Select
                v-if="
                  clozeIndex(part) >= 0 &&
                  ['choice', 'shared_options', 'true_false'].includes(
                    clozeBlankType(comp.config, clozeIndex(part)),
                  )
                "
                v-model:value="answers[comp.id][clozeIndex(part)]"
                class="qb-cloze-select"
                size="small"
                :placeholder="String(clozeIndex(part) + 1)"
                :options="
                  clozeOptionItems(
                    comp.config,
                    clozeIndex(part),
                    answers[comp.id],
                  )
                "
              />
              <Select
                v-else-if="
                  clozeIndex(part) >= 0 &&
                  clozeBlankType(comp.config, clozeIndex(part)) ===
                    'multi_choice'
                "
                v-model:value="answers[comp.id][clozeIndex(part)]"
                class="qb-cloze-multi"
                mode="multiple"
                size="small"
                placeholder="多选"
                :options="
                  clozeOptionItems(
                    comp.config,
                    clozeIndex(part),
                    answers[comp.id],
                  )
                "
              />
              <FormulaEditor
                v-else-if="
                  clozeIndex(part) >= 0 &&
                  clozeBlankType(comp.config, clozeIndex(part)) === 'formula'
                "
                v-model="answers[comp.id][clozeIndex(part)]"
                compact
                placeholder="输入公式"
              />
              <InputNumber
                v-else-if="
                  clozeIndex(part) >= 0 &&
                  clozeBlankType(comp.config, clozeIndex(part)) === 'number'
                "
                v-model:value="answers[comp.id][clozeIndex(part)]"
                class="qb-cloze-input"
                size="small"
                placeholder="输入数值"
              />
              <Input
                v-else-if="clozeIndex(part) >= 0"
                v-model:value="answers[comp.id][clozeIndex(part)]"
                class="qb-cloze-input"
                size="small"
                placeholder="输入答案"
              />
              <span v-else>{{ part }}</span>
            </template>
          </div>
          <div v-if="clozeUsesSharedOptions(comp.config)" class="qb-cloze-pool">
            <span
              v-for="item in comp.config.options || []"
              :key="item.key"
              class="qb-cloze-option"
            >
              {{ item.key }}. {{ item.text }}
            </span>
          </div>
        </section>

        <section v-else-if="comp.type === 'text_input'" class="qb-section">
          <Input.TextArea
            v-if="comp.config.mode !== 'short'"
            v-model:value="answers[comp.id]"
            :rows="4"
            :placeholder="comp.config.placeholder || '请输入答案'"
          />
          <Input
            v-else
            v-model:value="answers[comp.id]"
            :placeholder="comp.config.placeholder || '请输入答案'"
          />
        </section>

        <section v-else-if="comp.type === 'code_editor'" class="qb-section">
          <CodeEditorBlock
            v-model="answers[comp.id]"
            :prompt="comp.config.prompt"
            :languages="comp.config.languages"
            :default-language="comp.config.defaultLanguage"
            :starter-code="comp.config.starterCode"
          />
        </section>

        <section v-else-if="comp.type === 'media_player'" class="qb-section">
          <div class="qb-media">
            <div>
              {{ comp.config.mediaType === 'video' ? '视频' : '音频' }}材料
              <span v-if="comp.config.maxPlays">
                （最多播放 {{ comp.config.maxPlays }} 次）
              </span>
            </div>
            <audio
              v-if="comp.config.url && comp.config.mediaType !== 'video'"
              :src="comp.config.url"
              controls
              class="qb-media-el"
            ></audio>
            <video
              v-else-if="comp.config.url"
              :src="comp.config.url"
              controls
              class="qb-media-el"
            ></video>
            <div v-else class="qb-muted">（未配置媒体地址）</div>
          </div>
        </section>

        <section v-else-if="comp.type === 'canvas'" class="qb-section">
          <DrawingAnswer
            v-if="comp.config.mode === 'draw'"
            v-model="answers[comp.id]"
            :prompt="comp.config.prompt"
          />
          <TopologyCanvas
            v-else
            v-model="answers[comp.id]"
            :mode="comp.config.mode"
            :background-image="comp.config.backgroundImage"
            :prompt="comp.config.prompt"
            :nodes="comp.config.nodes"
          />
        </section>

        <section v-else-if="comp.type === 'formula'" class="qb-section">
          <FormulaEditor
            v-model="answers[comp.id]"
            :placeholder="comp.config.placeholder || '输入公式'"
          />
        </section>

        <section v-else-if="comp.type === 'matching'" class="qb-section">
          <MatchingConnect
            v-model="answers[comp.id]"
            :left="comp.config.left"
            :right="comp.config.right"
            :prompt="comp.config.prompt"
          />
        </section>

        <section v-else-if="comp.type === 'sorting'" class="qb-section">
          <div class="qb-sort-tip">点击上下箭头调整顺序</div>
          <div
            v-for="(item, i) in answers[comp.id] || []"
            :key="`${comp.id}-${i}-${item}`"
            class="qb-sort-item"
          >
            <span class="qb-sort-idx">{{ Number(i) + 1 }}.</span>
            <span class="qb-sort-text">{{ item }}</span>
            <Button
              size="small"
              :disabled="Number(i) === 0"
              @click="moveSort(comp.id, Number(i), -1)"
            >
              上移
            </Button>
            <Button
              size="small"
              :disabled="Number(i) === (answers[comp.id]?.length || 0) - 1"
              @click="moveSort(comp.id, Number(i), 1)"
            >
              下移
            </Button>
          </div>
        </section>

        <section v-else-if="comp.type === 'audio_record'" class="qb-section">
          <div class="qb-stem">{{ comp.config.tip || '请录音作答' }}</div>
          <Button type="primary">
            开始录音（最长 {{ comp.config.maxSeconds || 120 }} 秒）
          </Button>
        </section>

        <section v-else-if="comp.type === 'image_hotspot'" class="qb-section">
          <div v-if="comp.config.prompt" class="qb-stem">
            {{ comp.config.prompt }}
          </div>
          <div class="qb-media">
            <img
              v-if="comp.config.imageUrl"
              :src="comp.config.imageUrl"
              alt="标注图"
              class="qb-stem-img"
            />
            <div v-else class="qb-muted">（未配置图片）</div>
          </div>
        </section>

        <section v-else-if="comp.type === 'file_upload'" class="qb-section">
          <div v-if="comp.config.prompt" class="qb-stem">
            {{ comp.config.prompt }}
          </div>
          <Upload :show-upload-list="false">
            <Button>上传文件（{{ comp.config.accept || '多格式' }}）</Button>
          </Upload>
        </section>

        <section v-else-if="comp.type === 'table_fill'" class="qb-section">
          <div v-if="comp.config.prompt" class="qb-stem">
            {{ comp.config.prompt }}
          </div>
          <table class="qb-table">
            <thead>
              <tr>
                <th
                  v-for="(h, hi) in comp.config.headers ||
                  Array.from(
                    { length: comp.config.cols || 3 },
                    (_, i) => `列${i + 1}`,
                  )"
                  :key="hi"
                >
                  {{ h }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in comp.config.rows || 3" :key="r">
                <td v-for="c in comp.config.cols || 3" :key="c">
                  <Input size="small" placeholder="填写" />
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 复合题：只给小题编号，不给组件块编号 -->
        <section v-else-if="comp.type === 'group'" class="qb-section qb-group">
          <div
            v-for="(child, ci) in comp.children || []"
            :key="child.id"
            class="qb-subq"
          >
            <div class="qb-subq-no">（{{ ci + 1 }}）</div>
            <div class="qb-subq-body">
              <div v-if="child.config.prompt" class="qb-stem">
                {{ child.config.prompt }}
              </div>
              <Radio.Group
                v-if="
                  child.type === 'option_group' && child.config.mode !== 'multi'
                "
                v-model:value="answers[child.id]"
                class="qb-options"
              >
                <div
                  v-for="opt in child.config.options || []"
                  :key="opt.key"
                  class="qb-option"
                >
                  <Radio :value="opt.key">{{ opt.key }}. {{ opt.text }}</Radio>
                </div>
              </Radio.Group>
              <Checkbox.Group
                v-else-if="
                  child.type === 'option_group' && child.config.mode === 'multi'
                "
                v-model:value="answers[child.id]"
                class="qb-options"
              >
                <div
                  v-for="opt in child.config.options || []"
                  :key="opt.key"
                  class="qb-option"
                >
                  <Checkbox :value="opt.key">
                    {{ opt.key }}. {{ opt.text }}
                  </Checkbox>
                </div>
              </Checkbox.Group>
              <Input.TextArea
                v-else-if="child.type === 'text_input'"
                v-model:value="answers[child.id]"
                :rows="3"
                :placeholder="child.config.placeholder || '请输入'"
              />
              <div v-else-if="child.type === 'cloze'" class="qb-cloze-passage">
                <template
                  v-for="(part, partIndex) in clozeParts(child.config.passage)"
                  :key="`${child.id}-${partIndex}`"
                >
                  <Select
                    v-if="clozeIndex(part) >= 0"
                    v-model:value="answers[child.id][clozeIndex(part)]"
                    class="qb-cloze-select"
                    size="small"
                    :placeholder="String(clozeIndex(part) + 1)"
                    :options="
                      (child.config.options || []).map((item: any) => ({
                        label: `${item.key}. ${item.text}`,
                        value: item.key,
                      }))
                    "
                  />
                  <span v-else>{{ part }}</span>
                </template>
              </div>
              <CodeEditorBlock
                v-else-if="child.type === 'code_editor'"
                v-model="answers[child.id]"
                :languages="child.config.languages"
                :default-language="child.config.defaultLanguage"
                height="240px"
              />
              <MatchingConnect
                v-else-if="child.type === 'matching'"
                v-model="answers[child.id]"
                :left="child.config.left"
                :right="child.config.right"
              />
              <TopologyCanvas
                v-else-if="
                  child.type === 'canvas' && child.config.mode !== 'draw'
                "
                v-model="answers[child.id]"
                :mode="child.config.mode"
                :background-image="child.config.backgroundImage"
                :nodes="child.config.nodes"
              />
              <DrawingAnswer
                v-else-if="child.type === 'canvas'"
                v-model="answers[child.id]"
                :prompt="child.config.prompt"
              />
              <FormulaEditor
                v-else-if="child.type === 'formula'"
                v-model="answers[child.id]"
                :placeholder="child.config.placeholder || '输入公式'"
              />
              <table v-else-if="child.type === 'table_fill'" class="qb-table">
                <thead>
                  <tr>
                    <th
                      v-for="(header, headerIndex) in child.config.headers ||
                      []"
                      :key="headerIndex"
                    >
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in child.config.rows || 3" :key="row">
                    <td v-for="column in child.config.cols || 3" :key="column">
                      <Input size="small" placeholder="填写" />
                    </td>
                  </tr>
                </tbody>
              </table>
              <Upload
                v-else-if="child.type === 'file_upload'"
                :show-upload-list="false"
              >
                <Button>
                  上传文件（{{ child.config.accept || '多格式' }}）
                </Button>
              </Upload>
              <Button v-else-if="child.type === 'audio_record'" type="primary">
                开始录音（最长 {{ child.config.maxSeconds || 120 }} 秒）
              </Button>
              <div
                v-else-if="child.type === 'image_hotspot'"
                class="qb-media qb-muted"
              >
                图片热点 / 标注作答区域
              </div>
              <div v-else class="qb-muted">请完成作答</div>
            </div>
          </div>
        </section>

        <section v-else class="qb-section">
          <div class="qb-stem">
            {{ comp.config.prompt || '请完成作答' }}
          </div>
        </section>
      </template>
    </article>
  </div>
</template>

<style scoped>
.qb-paper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.qb-paper-head {
  padding-bottom: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid hsl(var(--border));
}

.qb-paper-title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  line-height: 1.4;
  color: hsl(var(--foreground));
}

.qb-paper-meta {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.qb-paper-empty {
  padding: 40px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.qb-paper-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.qb-stem {
  font-size: 15px;
  line-height: 1.75;
  color: hsl(var(--foreground));
}

.qb-stem :deep(p) {
  margin: 0 0 0.5em;
}

.qb-stem :deep(p:last-child) {
  margin-bottom: 0;
}

.qb-stem-empty {
  color: hsl(var(--muted-foreground));
}

.qb-stem-img {
  display: block;
  max-width: 100%;
  margin-top: 10px;
  border-radius: 6px;
}

.qb-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  margin-top: 8px;
}

.qb-option {
  padding: 4px 0;
}

.qb-cloze-passage {
  font-size: 15px;
  line-height: 2.4;
  white-space: pre-wrap;
}

.qb-cloze-input,
.qb-cloze-select {
  width: 150px;
  min-width: 130px;
  margin: 0 4px;
}

.qb-cloze-passage :deep(.qb-formula-editor) {
  margin: 0 4px;
}

.qb-cloze-multi {
  width: 220px;
  margin: 0 4px;
}

.qb-cloze-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 12px;
  margin-top: 14px;
  background: hsl(var(--muted) / 30%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.qb-cloze-option {
  font-size: 13px;
}

.qb-media {
  padding: 12px 0;
}

.qb-media-el {
  display: block;
  width: 100%;
  max-width: 520px;
  margin-top: 8px;
}

.qb-muted {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.qb-table {
  width: 100%;
  margin-top: 8px;
  border-collapse: collapse;
}

.qb-table th,
.qb-table td {
  padding: 6px;
  border: 1px solid hsl(var(--border));
}

.qb-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 4px;
}

.qb-subq {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.qb-subq-no {
  flex-shrink: 0;
  padding-top: 2px;
  font-weight: 600;
}

.qb-subq-body {
  flex: 1;
  min-width: 0;
}

.qb-sort-tip {
  margin-bottom: 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.qb-sort-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed hsl(var(--border));
}

.qb-sort-idx {
  width: 28px;
  font-weight: 600;
}

.qb-sort-text {
  flex: 1;
  min-width: 0;
}
</style>
