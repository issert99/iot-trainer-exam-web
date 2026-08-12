<script lang="ts" setup>
import type { BuilderComponent, ComponentType } from '../mock';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
} from 'ant-design-vue';

import { createComponent, paletteByCategory, paletteMeta } from '../mock';

const components = defineModel<BuilderComponent[]>('components', {
  required: true,
});

const selectedId = defineModel<string | undefined>('selectedId');

const categories = paletteByCategory();

/** 扁平查找（含嵌套 children） */
function findNode(
  list: BuilderComponent[],
  id?: string,
): BuilderComponent | undefined {
  if (!id) return undefined;
  for (const item of list) {
    if (item.id === id) return item;
    if (item.children?.length) {
      const hit = findNode(item.children, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

function findParentList(
  list: BuilderComponent[],
  id: string,
): BuilderComponent[] | undefined {
  for (const item of list) {
    if (item.id === id) return list;
    if (item.children?.length) {
      if (item.children.some((c) => c.id === id)) return item.children;
      const hit = findParentList(item.children, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

const selected = computed(() => findNode(components.value, selectedId.value));

function addToRoot(type: ComponentType) {
  const item = createComponent(type);
  components.value = [...components.value, item];
  selectedId.value = item.id;
}

function addChildToSelected(type: ComponentType) {
  const parent = selected.value;
  if (!parent || parent.type !== 'group') {
    addToRoot(type);
    return;
  }
  const child = createComponent(type);
  parent.children = [...(parent.children || []), child];
  selectedId.value = child.id;
}

function removeNode(id: string) {
  const parentList = findParentList(components.value, id);
  if (!parentList) return;
  const index = parentList.findIndex((item) => item.id === id);
  if (index === -1) return;
  parentList.splice(index, 1);
  components.value = [...components.value];
  if (selectedId.value === id) selectedId.value = components.value[0]?.id;
}

function moveNode(id: string, delta: number) {
  const parentList = findParentList(components.value, id);
  if (!parentList) return;
  const index = parentList.findIndex((item) => item.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= parentList.length) return;
  const [row] = parentList.splice(index, 1);
  if (!row) return;
  parentList.splice(target, 0, row);
  components.value = [...components.value];
}

function addOption() {
  if (!selected.value || selected.value.type !== 'option_group') return;
  const options = [...(selected.value.config.options || [])];
  const nextKey = String.fromCodePoint(65 + options.length);
  options.push({ key: nextKey, text: `选项 ${nextKey}` });
  selected.value.config.options = options;
}

function setClozeOptions(text: string) {
  if (!selected.value || selected.value.type !== 'cloze') return;
  selected.value.config.options = String(text)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => ({
      key: String.fromCodePoint(65 + index),
      text: item,
    }));
}

function flatRows(
  list: BuilderComponent[],
  depth = 0,
): Array<{ depth: number; index: number; item: BuilderComponent }> {
  const rows: Array<{ depth: number; index: number; item: BuilderComponent }> =
    [];
  list.forEach((item, index) => {
    rows.push({ item, depth, index });
    if (item.children?.length) {
      rows.push(...flatRows(item.children, depth + 1));
    }
  });
  return rows;
}

const selectedRows = computed(() => flatRows(components.value));
</script>

<template>
  <div class="qb-builder">
    <div class="qb-block">
      <div class="qb-block-title">
        备选组件
        <span class="qb-block-sub">
          点击添加到题目；若当前选中「小题容器」，新组件会加到容器内部
        </span>
      </div>

      <div v-for="group in categories" :key="group.category" class="qb-cat">
        <div class="qb-cat-title">{{ group.label }}</div>
        <Row :gutter="[12, 12]">
          <Col
            v-for="item in group.items"
            :key="item.type"
            :xs="12"
            :sm="8"
            :md="6"
            :lg="6"
            :xl="4"
          >
            <button
              type="button"
              class="qb-palette-card"
              @click="
                selected?.type === 'group'
                  ? addChildToSelected(item.type)
                  : addToRoot(item.type)
              "
            >
              <IconifyIcon :icon="item.icon" class="qb-palette-icon" />
              <div class="qb-palette-name">{{ item.name }}</div>
              <div class="qb-palette-hint">{{ item.hint }}</div>
            </button>
          </Col>
        </Row>
      </div>
    </div>

    <div class="qb-block">
      <div class="qb-block-title">
        已选组件配置
        <Tag v-if="components.length > 0" color="processing">
          {{ selectedRows.length }} 块
        </Tag>
      </div>

      <div v-if="components.length === 0" class="qb-empty">
        还没有组件。请点击上方备选组件开始拼装。
      </div>

      <div v-else class="qb-selected-layout">
        <div class="qb-selected-list">
          <div
            v-for="row in selectedRows"
            :key="row.item.id"
            class="qb-selected-item"
            :class="{ active: row.item.id === selectedId }"
            :style="{ marginLeft: `${row.depth * 16}px` }"
            @click="selectedId = row.item.id"
          >
            <div class="qb-selected-main">
              <span class="qb-idx">{{ row.index + 1 }}</span>
              <div>
                <div class="qb-selected-name">
                  {{ row.item.label }}
                  <Tag>{{ paletteMeta(row.item.type)?.name }}</Tag>
                  <Tag v-if="row.item.type === 'group'" color="purple">
                    容器
                  </Tag>
                </div>
                <div class="qb-selected-meta">
                  分值 {{ row.item.score }} ·
                  {{
                    row.item.judgeMode === 'auto'
                      ? '自动判'
                      : row.item.judgeMode === 'manual'
                        ? '人工判'
                        : '不判分'
                  }}
                </div>
              </div>
            </div>
            <Space>
              <Button
                size="small"
                :disabled="row.index === 0"
                @click.stop="moveNode(row.item.id, -1)"
              >
                上移
              </Button>
              <Button size="small" @click.stop="moveNode(row.item.id, 1)">
                下移
              </Button>
              <Button size="small" danger @click.stop="removeNode(row.item.id)">
                删除
              </Button>
            </Space>
          </div>
        </div>

        <Card
          v-if="selected"
          size="small"
          class="qb-config-panel"
          :bordered="false"
          title="当前组件参数"
        >
          <Form layout="vertical" size="small">
            <Form.Item label="显示名称">
              <Input v-model:value="selected.label" />
            </Form.Item>
            <Form.Item label="分值">
              <InputNumber
                v-model:value="selected.score"
                :min="0"
                class="w-full"
              />
            </Form.Item>
            <Form.Item label="判分方式">
              <Select
                v-model:value="selected.judgeMode"
                :options="[
                  { label: '自动判分', value: 'auto' },
                  { label: '人工阅卷', value: 'manual' },
                  { label: '不判分（材料）', value: 'none' },
                ]"
              />
            </Form.Item>

            <template v-if="selected.type === 'group'">
              <div class="qb-group-tip">
                已选中小题容器。继续点击上方备选组件，会加到这个容器里（适合阅读理解多小题）。
              </div>
              <Button
                type="dashed"
                block
                @click="addChildToSelected('option_group')"
              >
                快速添加一道单选小题
              </Button>
            </template>

            <template v-else-if="selected.type === 'rich_stem'">
              <Form.Item label="题干内容">
                <Input.TextArea
                  v-model:value="selected.config.html"
                  :rows="4"
                />
              </Form.Item>
              <Form.Item label="允许插图">
                <Switch v-model:checked="selected.config.allowImage" />
              </Form.Item>
              <Form.Item label="允许附件">
                <Switch v-model:checked="selected.config.allowAttachment" />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'option_group'">
              <Form.Item label="选择模式">
                <Select
                  v-model:value="selected.config.mode"
                  :options="[
                    { label: '单选', value: 'single' },
                    { label: '多选', value: 'multi' },
                    { label: '下拉', value: 'select' },
                  ]"
                />
              </Form.Item>
              <Form.Item label="选项">
                <div
                  v-for="(opt, oi) in selected.config.options"
                  :key="oi"
                  class="qb-option-row"
                >
                  <Input v-model:value="opt.key" style="width: 56px" />
                  <Input v-model:value="opt.text" />
                </div>
                <Button type="dashed" block @click="addOption">添加选项</Button>
              </Form.Item>
              <Form.Item label="参考答案（如 A 或 A,C）">
                <Input
                  :value="(selected.config.answer || []).join(',')"
                  @update:value="
                    (v) =>
                      (selected!.config.answer = String(v)
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean))
                  "
                />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'text_input'">
              <Form.Item label="输入形态">
                <Select
                  v-model:value="selected.config.mode"
                  :options="[
                    { label: '短文本', value: 'short' },
                    { label: '长文本', value: 'long' },
                    { label: '富文本', value: 'rich' },
                  ]"
                />
              </Form.Item>
              <Form.Item label="占位提示">
                <Input v-model:value="selected.config.placeholder" />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'cloze'">
              <Form.Item label="文章内容">
                <Input.TextArea
                  v-model:value="selected.config.passage"
                  :rows="6"
                  placeholder="使用 [[1]]、[[2]] 标记空位"
                />
              </Form.Item>
              <Form.Item label="空位数量">
                <InputNumber
                  v-model:value="selected.config.blankCount"
                  :min="1"
                  :max="200"
                  class="w-full"
                />
              </Form.Item>
              <Form.Item label="共享选项（一行一个）">
                <Input.TextArea
                  :value="
                    (selected.config.options || [])
                      .map((item: any) => item.text)
                      .join('\n')
                  "
                  :rows="6"
                  @update:value="(value) => setClozeOptions(String(value))"
                />
              </Form.Item>
              <Form.Item label="正确答案（按空位顺序）">
                <Input
                  :value="(selected.config.answers || []).join(',')"
                  @update:value="
                    (value) =>
                      (selected!.config.answers = String(value)
                        .split(/[,，\s]+/)
                        .filter(Boolean))
                  "
                />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'code_editor'">
              <Form.Item label="可选语言">
                <Select
                  v-model:value="selected.config.languages"
                  mode="multiple"
                  :options="[
                    { label: 'C', value: 'c' },
                    { label: 'Python', value: 'python' },
                    { label: 'Java', value: 'java' },
                    { label: 'SQL', value: 'sql' },
                    { label: 'HTML', value: 'html' },
                  ]"
                />
              </Form.Item>
              <Form.Item label="默认语言">
                <Select
                  v-model:value="selected.config.defaultLanguage"
                  :options="
                    (selected.config.languages || []).map((l: string) => ({
                      label: l,
                      value: l,
                    }))
                  "
                />
              </Form.Item>
              <Form.Item label="初始代码">
                <Input.TextArea
                  v-model:value="selected.config.starterCode"
                  :rows="4"
                />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'media_player'">
              <Form.Item label="媒体类型">
                <Select
                  v-model:value="selected.config.mediaType"
                  :options="[
                    { label: '音频', value: 'audio' },
                    { label: '视频', value: 'video' },
                  ]"
                />
              </Form.Item>
              <Form.Item label="最大播放次数">
                <InputNumber
                  v-model:value="selected.config.maxPlays"
                  :min="0"
                  class="w-full"
                />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'canvas'">
              <Form.Item label="画布模式">
                <Select
                  v-model:value="selected.config.mode"
                  :options="[
                    { label: '自由绘图', value: 'draw' },
                    { label: '连线', value: 'connect' },
                    { label: '框图', value: 'block' },
                    { label: '电路图', value: 'circuit' },
                    { label: '网络拓扑', value: 'topology' },
                  ]"
                />
              </Form.Item>
              <Form.Item label="背景图（拓扑底图）">
                <Input v-model:value="selected.config.backgroundImage" />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'formula'">
              <Form.Item label="占位提示">
                <Input v-model:value="selected.config.placeholder" />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'matching'">
              <Form.Item label="左侧项（换行分隔）">
                <Input.TextArea
                  :value="(selected.config.left || []).join('\n')"
                  :rows="3"
                  @update:value="
                    (v) =>
                      (selected!.config.left = String(v)
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean))
                  "
                />
              </Form.Item>
              <Form.Item label="右侧项（换行分隔）">
                <Input.TextArea
                  :value="(selected.config.right || []).join('\n')"
                  :rows="3"
                  @update:value="
                    (v) =>
                      (selected!.config.right = String(v)
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean))
                  "
                />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'sorting'">
              <Form.Item label="待排序项（换行分隔）">
                <Input.TextArea
                  :value="(selected.config.items || []).join('\n')"
                  :rows="4"
                  @update:value="
                    (v) =>
                      (selected!.config.items = String(v)
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean))
                  "
                />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'audio_record'">
              <Form.Item label="最长秒数">
                <InputNumber
                  v-model:value="selected.config.maxSeconds"
                  :min="10"
                  class="w-full"
                />
              </Form.Item>
              <Form.Item label="提示语">
                <Input v-model:value="selected.config.tip" />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'image_hotspot'">
              <Form.Item label="图片地址">
                <Input v-model:value="selected.config.imageUrl" />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'file_upload'">
              <Form.Item label="允许格式">
                <Input v-model:value="selected.config.accept" />
              </Form.Item>
              <Form.Item label="最多文件数">
                <InputNumber
                  v-model:value="selected.config.maxCount"
                  :min="1"
                  class="w-full"
                />
              </Form.Item>
            </template>

            <template v-else-if="selected.type === 'table_fill'">
              <Form.Item label="行数">
                <InputNumber
                  v-model:value="selected.config.rows"
                  :min="1"
                  class="w-full"
                />
              </Form.Item>
              <Form.Item label="列数">
                <InputNumber
                  v-model:value="selected.config.cols"
                  :min="1"
                  class="w-full"
                />
              </Form.Item>
            </template>
          </Form>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qb-builder {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.qb-block-title {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.qb-block-sub {
  font-size: 12px;
  font-weight: 400;
  color: hsl(var(--muted-foreground));
}

.qb-cat {
  margin-bottom: 14px;
}

.qb-cat-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}

.qb-palette-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-height: 100px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.qb-palette-card:hover {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 1px hsl(var(--primary) / 20%);
}

.qb-palette-icon {
  width: 20px;
  height: 20px;
  color: hsl(var(--primary));
}

.qb-palette-name {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.qb-palette-hint {
  font-size: 12px;
  line-height: 1.45;
  color: hsl(var(--muted-foreground));
}

.qb-empty {
  padding: 28px;
  color: hsl(var(--muted-foreground));
  text-align: center;
  background: hsl(var(--background));
  border: 1px dashed hsl(var(--border));
  border-radius: 10px;
}

.qb-selected-layout {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(300px, 1fr);
  gap: 12px;
}

@media (max-width: 960px) {
  .qb-selected-layout {
    grid-template-columns: 1fr;
  }
}

.qb-selected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qb-selected-item {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.qb-selected-item.active {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 1px hsl(var(--primary) / 25%);
}

.qb-selected-main {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.qb-idx {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 12px;
  font-weight: 600;
  background: hsl(var(--accent));
  border-radius: 999px;
}

.qb-selected-name {
  font-size: 14px;
  font-weight: 600;
}

.qb-selected-meta {
  margin-top: 2px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.qb-option-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.qb-group-tip {
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.qb-config-panel {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.w-full {
  width: 100%;
}
</style>
