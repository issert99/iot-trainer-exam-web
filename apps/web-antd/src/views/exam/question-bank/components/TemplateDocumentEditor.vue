<script lang="ts" setup>
/**
 * 干净卷纸编辑器：中间是纸，左侧插入，右侧点选才出属性。
 */
import type {
  BlankBinding,
  ChoiceNode,
  FramePlacement,
  LengthUnit,
  MediaNode,
  PassageNode,
  PoolNode,
  TemplateDocument,
  TemplateLanguage,
  TemplateNode,
  TemplateNumbering,
} from '../template-document';

import { computed, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Drawer,
  Dropdown,
  Empty,
  Input,
  InputNumber,
  Menu,
  Select,
  Space,
  Switch,
} from 'ant-design-vue';

import { paperForDemoPreview } from '../paper-schema';
import {
  applyPassageBinding,
  createChoiceNode,
  createGroupNode,
  createMediaNode,
  createPassageNode,
  createPoolNode,
  createTextNode,
  formatNumbering,
  L,
  lengthToCss,
  setPassageBlankCountOnNode,
} from '../template-document';
import { templateDocumentToPaperDocument } from '../template-document.bridge';
import {
  exampleImageWithFrame,
  exampleListening,
  exampleLocalChoiceCloze,
  exampleSharedPoolCloze,
} from '../template-document.examples';
import QuestionPreview from './QuestionPreview.vue';

defineOptions({ name: 'TemplateDocumentEditor' });

const document = defineModel<TemplateDocument>({ required: true });

const mode = ref<'edit' | 'preview'>('edit');
const selectedId = ref<string>();
const metaOpen = ref(false);

const selected = computed(() =>
  selectedId.value
    ? findNode(document.value.nodes, selectedId.value)
    : undefined,
);

const propsOpen = computed({
  get: () => Boolean(selected.value) && mode.value === 'edit',
  set: (open: boolean) => {
    if (!open) selectedId.value = undefined;
  },
});

const numberedIndexMap = computed(() => {
  const map = new Map<string, number>();
  let i = 0;
  const walk = (nodes: TemplateNode[]) => {
    for (const node of nodes) {
      if (
        node.numbered !== false &&
        node.type !== 'pool' &&
        node.type !== 'blank'
      ) {
        map.set(node.id, i);
        i += 1;
      }
      if (node.type === 'group') walk(node.children);
    }
  };
  walk(document.value.nodes);
  return map;
});

const previewComponents = computed(() =>
  paperForDemoPreview(templateDocumentToPaperDocument(document.value)),
);

const PRIMARY_INSERTS = [
  {
    key: 'passage',
    label: '挖空',
    icon: 'lucide:text-select',
    run: () => addNode(createPassageNode('local_choice', 10)),
  },
  {
    key: 'text',
    label: '文本',
    icon: 'lucide:type',
    run: () => addNode(createTextNode()),
  },
  {
    key: 'image',
    label: '图片',
    icon: 'lucide:image',
    run: () => addNode(createMediaNode('image')),
  },
  {
    key: 'choice',
    label: '单选',
    icon: 'lucide:circle-dot',
    run: () => addNode(createChoiceNode('single', 4)),
  },
  {
    key: 'audio',
    label: '音频',
    icon: 'lucide:headphones',
    run: () => addNode(createMediaNode('audio')),
  },
];

const MORE_INSERTS = [
  {
    key: 'pool',
    label: '词库',
    run: () => addNode(createPoolNode(15)),
  },
  {
    key: 'multi',
    label: '多选',
    run: () => addNode(createChoiceNode('multi', 5)),
  },
  {
    key: 'tf',
    label: '判断',
    run: () => addNode(createChoiceNode('true_false', 2)),
  },
  {
    key: 'group',
    label: '小题组',
    run: () => {
      const group = createGroupNode('小题');
      group.children = [
        createChoiceNode('single', 4),
        createChoiceNode('single', 4),
      ];
      addNode(group);
    },
  },
];

const LANG_OPTIONS: Array<{ label: string; value: TemplateLanguage }> = [
  { label: '中文', value: 'zh-CN' },
  { label: '英文', value: 'en-US' },
  { label: '双语', value: 'bilingual' },
];

const NUMBERING_OPTIONS: Array<{
  label: string;
  value: TemplateNumbering['scheme'];
}> = [
  { label: '1. 2. 3.', value: 'arabic' },
  { label: '(1)(2)', value: 'paren' },
  { label: 'A. B.', value: 'letter' },
  { label: '一、二', value: 'chinese' },
  { label: '隐藏', value: 'none' },
];

const PLACEMENT_OPTIONS: Array<{ label: string; value: FramePlacement }> = [
  { label: '整行', value: 'block' },
  { label: '随文', value: 'inline' },
  { label: '靠左', value: 'float_left' },
  { label: '靠右', value: 'float_right' },
];

const UNIT_OPTIONS: Array<{ label: string; value: LengthUnit }> = [
  { label: '%', value: '%' },
  { label: 'px', value: 'px' },
  { label: 'mm', value: 'mm' },
];

const BINDING_OPTIONS: Array<{ label: string; value: BlankBinding }> = [
  { label: '每空自己选', value: 'local_choice' },
  { label: '共用词库', value: 'shared_pool' },
  { label: '手打', value: 'free_text' },
];

function findNode(nodes: TemplateNode[], id: string): TemplateNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === 'group') {
      const found = findNode(node.children, id);
      if (found) return found;
    }
    if (node.type === 'passage') {
      const blank = node.blanks.find((item) => item.id === id);
      if (blank) return blank;
    }
  }
  return undefined;
}

function addNode(node: TemplateNode) {
  document.value.role = 'template';
  document.value.nodes.push(node);
  selectedId.value = node.id;
}

function removeSelected() {
  if (!selectedId.value) return;
  const id = selectedId.value;
  const remove = (list: TemplateNode[]): boolean => {
    const index = list.findIndex((item) => item.id === id);
    if (index !== -1) {
      list.splice(index, 1);
      return true;
    }
    for (const item of list) {
      if (item.type === 'group' && remove(item.children)) return true;
    }
    return false;
  };
  remove(document.value.nodes);
  selectedId.value = undefined;
}

function applyRecipe(kind: 'image' | 'listen' | 'local' | 'pool') {
  const map = {
    local: exampleLocalChoiceCloze,
    pool: exampleSharedPoolCloze,
    image: exampleImageWithFrame,
    listen: exampleListening,
  };
  const next = map[kind]();
  document.value.meta = next.meta;
  document.value.style = next.style;
  document.value.nodes = next.nodes;
  document.value.role = 'template';
  selectedId.value = next.nodes[0]?.id;
}

function displayNo(node: TemplateNode) {
  const index = numberedIndexMap.value.get(node.id);
  if (index === undefined || index === null) return '';
  return formatNumbering(index, document.value.meta.numbering);
}

function asPassage(node?: TemplateNode) {
  return node?.type === 'passage' ? (node as PassageNode) : undefined;
}
function asChoice(node?: TemplateNode) {
  return node?.type === 'choice' ? (node as ChoiceNode) : undefined;
}
function asMedia(node?: TemplateNode) {
  return node?.type === 'media' ? (node as MediaNode) : undefined;
}
function asPool(node?: TemplateNode) {
  return node?.type === 'pool' ? (node as PoolNode) : undefined;
}

function ensurePoolForPassage(passage: PassageNode) {
  if (
    passage.poolId &&
    document.value.nodes.some(
      (item) => item.type === 'pool' && item.id === passage.poolId,
    )
  ) {
    return passage.poolId;
  }
  const pool = createPoolNode(15);
  document.value.nodes.push(pool);
  passage.poolId = pool.id;
  applyPassageBinding(passage, 'shared_pool', pool.id);
  return pool.id;
}

function setPassageCount(passage: PassageNode | undefined, count: unknown) {
  if (!passage) return;
  setPassageBlankCountOnNode(passage, Number(count) || 1, passage.poolId);
}

function setPassageBinding(
  passage: PassageNode | undefined,
  binding: BlankBinding,
) {
  if (!passage) return;
  if (binding === 'shared_pool') {
    applyPassageBinding(passage, binding, ensurePoolForPassage(passage));
  } else {
    applyPassageBinding(passage, binding);
  }
}

function setFrameWidth(
  node: TemplateNode | undefined,
  value: unknown,
  unit?: LengthUnit,
) {
  if (!node) return;
  const current = node.frame.width;
  const u =
    unit ||
    (current && current !== 'auto' ? current.unit : ('%' as LengthUnit));
  node.frame.width = L(Number(value) || 0, u);
}

function setFrameHeight(node: TemplateNode | undefined, value: unknown) {
  if (!node) return;
  if (value === '' || value === null || value === undefined) {
    node.frame.height = 'auto';
    return;
  }
  const current = node.frame.height;
  const u = current && current !== 'auto' ? current.unit : 'px';
  node.frame.height = L(Number(value) || 0, u);
}

function frameWidthValue(node?: TemplateNode) {
  const w = node?.frame.width;
  return !w || w === 'auto' ? undefined : w.value;
}
function frameWidthUnit(node?: TemplateNode): LengthUnit {
  const w = node?.frame.width;
  return w && w !== 'auto' ? w.unit : '%';
}
function frameHeightValue(node?: TemplateNode) {
  const h = node?.frame.height;
  return !h || h === 'auto' ? undefined : h.value;
}

function nodeShellStyle(node: TemplateNode) {
  const width = lengthToCss(node.frame.width);
  const style: Record<string, string> = {
    width: width === 'auto' ? '100%' : width,
  };
  if (node.frame.placement === 'float_right') {
    style.float = 'right';
    style.marginLeft = '16px';
    style.maxWidth = '42%';
  }
  if (node.frame.placement === 'float_left') {
    style.float = 'left';
    style.marginRight = '16px';
    style.maxWidth = '42%';
  }
  if (node.frame.align === 'center') style.marginInline = 'auto';
  return style;
}

function optionKeys(count: number) {
  return Array.from({ length: Math.max(2, count) }, (_, i) =>
    String.fromCodePoint(65 + i),
  );
}

function onPaperClick() {
  selectedId.value = undefined;
}
</script>

<template>
  <div class="clean-editor">
    <!-- 顶栏极简 -->
    <div class="clean-bar">
      <div class="clean-bar-left">
        <template v-if="mode === 'edit'">
          <button
            v-for="item in PRIMARY_INSERTS"
            :key="item.key"
            class="clean-tool"
            type="button"
            @click="item.run()"
          >
            <IconifyIcon :icon="item.icon" />
            {{ item.label }}
          </button>
          <Dropdown>
            <button class="clean-tool ghost" type="button">更多</button>
            <template #overlay>
              <Menu
                @click="
                  ({ key }) =>
                    MORE_INSERTS.find((item) => item.key === key)?.run()
                "
              >
                <Menu.Item v-for="item in MORE_INSERTS" :key="item.key">
                  {{ item.label }}
                </Menu.Item>
              </Menu>
            </template>
          </Dropdown>
        </template>
      </div>
      <Space :size="8">
        <Button size="small" type="text" @click="metaOpen = true">
          卷面
        </Button>
        <Button
          size="small"
          :type="mode === 'edit' ? 'primary' : 'default'"
          @click="mode = 'edit'"
        >
          编辑
        </Button>
        <Button
          size="small"
          :type="mode === 'preview' ? 'primary' : 'default'"
          @click="mode = 'preview'"
        >
          预览
        </Button>
      </Space>
    </div>

    <!-- 预览 -->
    <div v-if="mode === 'preview'" class="clean-preview">
      <p class="clean-hint">示例数据，不会写进模板</p>
      <QuestionPreview :components="previewComponents" title="" />
    </div>

    <!-- 编辑：一张纸 -->
    <div v-else class="clean-stage" @click="onPaperClick">
      <div
        class="clean-paper"
        :style="{
          paddingTop: `${Math.max(24, document.meta.layout.margin.top.value)}px`,
          paddingBottom: `${Math.max(24, document.meta.layout.margin.bottom.value)}px`,
        }"
        @click.stop
      >
        <Empty v-if="document.nodes.length === 0" class="clean-empty">
          <template #description>
            <p class="clean-empty-title">从一张白纸开始</p>
            <p class="clean-empty-desc">点上方插入，或选一个常用结构</p>
            <div class="clean-recipes">
              <button type="button" @click="applyRecipe('local')">
                挖空 · 每空选项
              </button>
              <button type="button" @click="applyRecipe('pool')">
                挖空 · 词库
              </button>
              <button type="button" @click="applyRecipe('image')">
                图 + 小题
              </button>
              <button type="button" @click="applyRecipe('listen')">听力</button>
            </div>
          </template>
        </Empty>

        <template v-else>
          <section
            v-for="node in document.nodes"
            :key="node.id"
            class="clean-block"
            :class="{ on: selectedId === node.id }"
            :style="nodeShellStyle(node)"
            @click.stop="selectedId = node.id"
          >
            <div v-if="displayNo(node)" class="clean-no">
              {{ displayNo(node) }}
            </div>

            <div v-if="node.type === 'text'" class="clean-placeholder">
              文本材料
            </div>

            <div v-else-if="node.type === 'passage'" class="clean-passage">
              <div class="clean-placeholder soft">文章（出题时填写）</div>
              <div class="clean-blanks">
                <button
                  v-for="blank in node.blanks"
                  :key="blank.id"
                  type="button"
                  class="clean-blank"
                  :class="{ pool: blank.rules.binding === 'shared_pool' }"
                  @click.stop="selectedId = blank.id"
                >
                  {{ blank.rules.index }}
                </button>
              </div>
              <div
                v-if="node.rules.defaultBinding === 'local_choice'"
                class="clean-opts"
              >
                <div
                  v-for="blank in node.blanks.slice(0, 4)"
                  :key="`s-${blank.id}`"
                  class="clean-opt-line"
                >
                  <span>{{ blank.rules.index }}.</span>
                  <span
                    v-for="key in optionKeys(
                      blank.rules.optionCount ||
                        node.rules.defaultOptionCount ||
                        4,
                    )"
                    :key="key"
                  >
                    {{ key }}
                  </span>
                </div>
                <div v-if="node.blanks.length > 4" class="clean-more-blanks">
                  …共 {{ node.blanks.length }} 空
                </div>
              </div>
              <div
                v-else-if="node.rules.defaultBinding === 'shared_pool'"
                class="clean-pool-line"
              >
                词库选填
              </div>
            </div>

            <div v-else-if="node.type === 'pool'" class="clean-pool">
              词库 · {{ node.rules.size }} 个
            </div>

            <div v-else-if="node.type === 'media'" class="clean-media">
              <span>{{
                node.rules.mediaKind === 'image'
                  ? '图片'
                  : node.rules.mediaKind === 'audio'
                    ? '音频'
                    : '视频'
              }}</span>
              <small>
                {{ lengthToCss(node.frame.width) }} ×
                {{ lengthToCss(node.frame.height) }}
              </small>
            </div>

            <div v-else-if="node.type === 'choice'" class="clean-choice">
              <div class="clean-placeholder soft">小题</div>
              <div
                v-for="key in optionKeys(node.rules.optionCount)"
                :key="key"
                class="clean-choice-row"
              >
                <i></i>{{ key }}
              </div>
            </div>

            <div v-else-if="node.type === 'group'" class="clean-group">
              <div
                v-for="child in node.children"
                :key="child.id"
                class="clean-group-item"
                :class="{ on: selectedId === child.id }"
                @click.stop="selectedId = child.id"
              >
                {{ child.label || '小题' }}
              </div>
            </div>
          </section>
        </template>
      </div>
    </div>

    <!-- 卷面设置抽屉 -->
    <Drawer v-model:open="metaOpen" title="卷面" placement="right" :width="320">
      <label class="clean-field">
        <span>语言</span>
        <Select
          v-model:value="document.meta.language"
          :options="LANG_OPTIONS"
        />
      </label>
      <label class="clean-field">
        <span>题号</span>
        <Select
          v-model:value="document.meta.numbering.scheme"
          :options="NUMBERING_OPTIONS"
        />
      </label>
      <label class="clean-field">
        <span>起始</span>
        <InputNumber
          v-model:value="document.meta.numbering.start"
          :min="0"
          style="width: 100%"
        />
      </label>
      <div class="clean-row">
        <label class="clean-field">
          <span>前缀</span>
          <Input v-model:value="document.meta.numbering.prefix" />
        </label>
        <label class="clean-field">
          <span>后缀</span>
          <Input v-model:value="document.meta.numbering.suffix" />
        </label>
      </div>
      <label class="clean-field">
        <span>默认分</span>
        <InputNumber
          v-model:value="document.meta.defaultScore"
          :min="0"
          :step="0.5"
          style="width: 100%"
        />
      </label>
      <label class="clean-field">
        <span>页边距 mm</span>
        <InputNumber
          :value="document.meta.layout.margin.top.value"
          :min="0"
          style="width: 100%"
          @update:value="
            (v) => {
              const n = Number(v) || 0;
              document.meta.layout.margin = {
                top: L(n, 'mm'),
                right: L(n, 'mm'),
                bottom: L(n, 'mm'),
                left: L(n, 'mm'),
              };
            }
          "
        />
      </label>
    </Drawer>

    <!-- 选中属性抽屉 -->
    <Drawer
      v-model:open="propsOpen"
      :title="selected?.label || '属性'"
      placement="right"
      :width="340"
    >
      <template v-if="selected">
        <label class="clean-field">
          <span>名称</span>
          <Input v-model:value="selected.label" />
        </label>

        <p class="clean-sec">位置大小</p>
        <label class="clean-field">
          <span>摆放</span>
          <Select
            v-model:value="selected.frame.placement"
            :options="PLACEMENT_OPTIONS"
          />
        </label>
        <div class="clean-row">
          <label class="clean-field">
            <span>宽</span>
            <InputNumber
              :value="frameWidthValue(selected)"
              style="width: 100%"
              @update:value="(v) => setFrameWidth(selected, v)"
            />
          </label>
          <label class="clean-field">
            <span>单位</span>
            <Select
              :value="frameWidthUnit(selected)"
              :options="UNIT_OPTIONS"
              @update:value="
                (u) =>
                  setFrameWidth(
                    selected,
                    frameWidthValue(selected) ?? 100,
                    u as LengthUnit,
                  )
              "
            />
          </label>
        </div>
        <div class="clean-row">
          <label class="clean-field">
            <span>高</span>
            <InputNumber
              :value="frameHeightValue(selected)"
              placeholder="自动"
              style="width: 100%"
              @update:value="(v) => setFrameHeight(selected, v)"
            />
          </label>
          <label class="clean-field">
            <span>锁比例</span>
            <Switch v-model:checked="selected.frame.aspectLock" />
          </label>
        </div>

        <template v-if="asPassage(selected)">
          <p class="clean-sec">挖空</p>
          <label class="clean-field">
            <span>空数</span>
            <InputNumber
              :value="asPassage(selected)!.blanks.length"
              :min="1"
              :max="50"
              style="width: 100%"
              @update:value="(v) => setPassageCount(asPassage(selected), v)"
            />
          </label>
          <label class="clean-field">
            <span>怎么答</span>
            <Select
              :value="asPassage(selected)!.rules.defaultBinding"
              :options="BINDING_OPTIONS"
              @update:value="
                (v) => setPassageBinding(asPassage(selected), v as BlankBinding)
              "
            />
          </label>
          <label
            v-if="asPassage(selected)!.rules.defaultBinding === 'local_choice'"
            class="clean-field"
          >
            <span>每空几选</span>
            <InputNumber
              v-model:value="asPassage(selected)!.rules.defaultOptionCount"
              :min="2"
              :max="12"
              style="width: 100%"
              @update:value="
                (v) => {
                  const p = asPassage(selected);
                  if (!p) return;
                  p.rules.defaultOptionCount = Number(v) || 4;
                  applyPassageBinding(p, 'local_choice');
                }
              "
            />
          </label>
        </template>

        <template v-if="selected.type === 'blank'">
          <p class="clean-sec">空 {{ selected.rules.index }}</p>
          <label class="clean-field">
            <span>怎么答</span>
            <Select
              v-model:value="selected.rules.binding"
              :options="BINDING_OPTIONS"
            />
          </label>
          <label
            v-if="selected.rules.binding === 'local_choice'"
            class="clean-field"
          >
            <span>选项数</span>
            <InputNumber
              v-model:value="selected.rules.optionCount"
              :min="2"
              :max="12"
              style="width: 100%"
            />
          </label>
        </template>

        <template v-if="asPool(selected)">
          <p class="clean-sec">词库</p>
          <label class="clean-field">
            <span>数量</span>
            <InputNumber
              v-model:value="asPool(selected)!.rules.size"
              :min="2"
              style="width: 100%"
            />
          </label>
          <label class="clean-field">
            <span>复用</span>
            <Select
              v-model:value="asPool(selected)!.rules.reuse"
              :options="[
                { label: '一词一次', value: 'once' },
                { label: '可重复', value: 'repeatable' },
              ]"
            />
          </label>
        </template>

        <template v-if="asMedia(selected)">
          <p class="clean-sec">媒体</p>
          <label
            v-if="asMedia(selected)!.rules.mediaKind !== 'image'"
            class="clean-field"
          >
            <span>最多播放</span>
            <InputNumber
              v-model:value="asMedia(selected)!.rules.maxPlays"
              :min="1"
              style="width: 100%"
            />
          </label>
        </template>

        <template v-if="asChoice(selected)">
          <p class="clean-sec">选项</p>
          <label
            v-if="asChoice(selected)!.rules.mode !== 'true_false'"
            class="clean-field"
          >
            <span>数量</span>
            <InputNumber
              v-model:value="asChoice(selected)!.rules.optionCount"
              :min="2"
              :max="12"
              style="width: 100%"
            />
          </label>
        </template>

        <template v-if="selected.scoring">
          <p class="clean-sec">分数</p>
          <label class="clean-field">
            <span>分值</span>
            <InputNumber
              v-model:value="selected.scoring.score"
              :min="0"
              :step="0.5"
              style="width: 100%"
            />
          </label>
        </template>

        <Button danger block style="margin-top: 20px" @click="removeSelected">
          删除这块
        </Button>
      </template>
    </Drawer>
  </div>
</template>

<style scoped>
.clean-editor {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 560px;
  overflow: hidden;
  background: #f3f1ec;
  border: 1px solid #e7e5e4;
  border-radius: 16px;
}

.clean-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #fff;
  border-bottom: 1px solid #ebe8e3;
}

.clean-bar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.clean-tool {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 5px 10px;
  font-size: 13px;
  color: #44403c;
  cursor: pointer;
  background: #fafaf9;
  border: 1px solid transparent;
  border-radius: 8px;
}

.clean-tool:hover {
  background: #f5f5f4;
  border-color: #d6d3d1;
}

.clean-tool.ghost {
  color: #78716c;
}

.clean-stage {
  display: flex;
  flex: 1;
  justify-content: center;
  padding: 28px 16px 40px;
  overflow: auto;
}

.clean-paper {
  width: min(720px, 100%);
  min-height: 520px;
  padding-right: 40px;
  padding-left: 40px;
  background: #fffefb;
  border: 1px solid #e7e5e4;
  border-radius: 2px;
  box-shadow:
    0 1px 2px rgb(28 25 23 / 4%),
    0 16px 40px rgb(28 25 23 / 6%);
}

.clean-empty {
  padding: 80px 20px;
}

.clean-empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #292524;
}

.clean-empty-desc {
  margin: 6px 0 18px;
  font-size: 13px;
  color: #a8a29e;
}

.clean-recipes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.clean-recipes button {
  padding: 8px 14px;
  font-size: 13px;
  color: #44403c;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d6d3d1;
  border-radius: 999px;
}

.clean-recipes button:hover {
  border-color: #78716c;
}

.clean-block {
  position: relative;
  clear: both;
  padding: 14px 12px 14px 36px;
  margin-bottom: 8px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.clean-block:hover {
  background: rgb(28 25 23 / 2.5%);
}

.clean-block.on {
  outline: 1px solid rgb(59 130 246 / 35%);
  background: rgb(59 130 246 / 6%);
}

.clean-no {
  position: absolute;
  top: 14px;
  left: 4px;
  font-size: 13px;
  font-weight: 650;
  color: #57534e;
}

.clean-placeholder {
  padding: 18px 14px;
  font-size: 14px;
  color: #a8a29e;
  text-align: center;
  border: 1px dashed #d6d3d1;
  border-radius: 6px;
}

.clean-placeholder.soft {
  padding: 12px;
  font-size: 13px;
}

.clean-blanks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.clean-blank {
  min-width: 28px;
  padding: 2px 8px;
  font-size: 13px;
  font-weight: 650;
  color: #1d4ed8;
  cursor: pointer;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
}

.clean-blank.pool {
  color: #166534;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.clean-opts {
  margin-top: 10px;
}

.clean-opt-line {
  display: flex;
  gap: 10px;
  margin: 4px 0;
  font-size: 12px;
  color: #78716c;
}

.clean-more-blanks,
.clean-pool-line {
  margin-top: 6px;
  font-size: 12px;
  color: #a8a29e;
}

.clean-pool {
  padding: 12px;
  font-size: 13px;
  color: #166534;
  background: #f7fef9;
  border-radius: 6px;
}

.clean-media {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  padding: 20px;
  color: #78716c;
  background: #f5f5f4;
  border-radius: 6px;
}

.clean-media small {
  font-size: 12px;
  color: #a8a29e;
}

.clean-choice-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  font-size: 14px;
  color: #57534e;
}

.clean-choice-row i {
  width: 14px;
  height: 14px;
  border: 1.5px solid #a8a29e;
  border-radius: 50%;
}

.clean-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.clean-group-item {
  padding: 10px 12px;
  font-size: 13px;
  background: #fafaf9;
  border-radius: 6px;
}

.clean-group-item.on {
  background: #eff6ff;
}

.clean-preview {
  padding: 16px;
  overflow: auto;
  background: #fff;
}

.clean-hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: #a8a29e;
}

.clean-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #78716c;
}

.clean-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.clean-sec {
  margin: 16px 0 8px;
  font-size: 12px;
  font-weight: 650;
  color: #44403c;
}
</style>
