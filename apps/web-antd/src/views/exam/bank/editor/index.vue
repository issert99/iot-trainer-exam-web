<script lang="ts" setup>
import type { BankQuestion, Primitive } from '../types';

import { computed, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Switch,
} from 'ant-design-vue';

import QuestionRender from '../components/QuestionRender.vue';
import {
  getInteractionPlugin,
  listInteractionPlugins,
} from '../plugins/registry';
import {
  bankStore,
  CHANNEL_LABEL,
  clonePlain,
  createBlankQuestion,
  getQuestion,
  LAYER_LABEL,
  listCourseOptions,
  saveQuestion,
  STATUS_LABEL,
} from '../store';

defineOptions({ name: 'BankEditor' });

const route = useRoute();
const router = useRouter();

const form = reactive<BankQuestion>(
  createBlankQuestion(String(route.query.courseId || bankStore.courses[0]?.id)),
);

function load() {
  const id = String(route.query.id || '');
  const found = id ? getQuestion(id) : null;
  const courseId = String(
    route.query.courseId || found?.courseId || bankStore.courses[0]?.id,
  );
  Object.assign(
    form,
    found ? clonePlain(found) : createBlankQuestion(courseId),
  );
}

watch(() => route.query.id, load, { immediate: true });

const knowledgeOptions = computed(() =>
  bankStore.knowledge
    .filter((item) => item.courseId === form.courseId)
    .map((item) => ({ label: item.name, value: item.id })),
);

const options = computed(() => form.content.options || []);
const pluginOptions = computed(() =>
  listInteractionPlugins().map((plugin) => ({
    label: `${plugin.manifest.title} · ${plugin.manifest.version}`,
    value: plugin.manifest.id,
  })),
);

function onPrimitiveChange(value: unknown) {
  if (!value) return;
  const primitive = String(value) as Primitive;
  const plugin = getInteractionPlugin(primitive);
  form.primitive = primitive;
  form.typeName = plugin.manifest.title;
  form.typePackVersion = `${primitive}@${plugin.manifest.version}`;
  form.content = plugin.createDefaultContent();
}

function onAnswersChange(value: string) {
  form.content.answers = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function onAllowedUnitsChange(value: string) {
  form.content.allowedUnits = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function onFileTypesChange(value: string) {
  form.content.allowedFileTypes = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function addOption() {
  const next = String.fromCodePoint(65 + options.value.length);
  form.content.options = [...options.value, { key: next, text: '' }];
}

function removeOption(index: number) {
  form.content.options = options.value.filter((_, i) => i !== index);
}

function onSave() {
  if (!form.title.trim() || !form.stem.trim()) {
    message.warning('请填写标题和题干');
    return;
  }
  saveQuestion(clonePlain(form));
  message.success('已写入本地题库');
  router.push('/question-bank/courses');
}

const previewMode = reactive({ paper: true });
</script>

<template>
  <Page>
    <div class="editor-page">
      <Card class="editor-form" title="题目编辑" :bordered="false">
        <Form layout="vertical">
          <div class="grid-2">
            <Form.Item label="课程">
              <Select
                v-model:value="form.courseId"
                :options="listCourseOptions()"
              />
            </Form.Item>
            <Form.Item label="知识点（可多挂）">
              <Select
                v-model:value="form.knowledgeIds"
                mode="multiple"
                :options="knowledgeOptions"
              />
            </Form.Item>
            <Form.Item label="原语">
              <Select
                :value="form.primitive"
                :options="pluginOptions"
                @change="onPrimitiveChange"
              />
            </Form.Item>
            <Form.Item label="显示名">
              <Input
                v-model:value="form.typeName"
                placeholder="如：最佳选择题"
              />
            </Form.Item>
            <Form.Item label="渠道">
              <Select
                v-model:value="form.channel"
                :options="
                  Object.entries(CHANNEL_LABEL).map(([value, label]) => ({
                    label,
                    value,
                  }))
                "
              />
            </Form.Item>
            <Form.Item label="所在库">
              <Select
                v-model:value="form.layer"
                :options="
                  Object.entries(LAYER_LABEL).map(([value, label]) => ({
                    label,
                    value,
                  }))
                "
              />
            </Form.Item>
            <Form.Item label="状态">
              <Select
                v-model:value="form.status"
                :options="
                  Object.entries(STATUS_LABEL).map(([value, label]) => ({
                    label,
                    value,
                  }))
                "
              />
            </Form.Item>
            <Form.Item label="难度">
              <InputNumber
                v-model:value="form.difficulty"
                :min="1"
                :max="5"
                class="w-full"
              />
            </Form.Item>
            <Form.Item label="建议分">
              <InputNumber v-model:value="form.score" :min="1" class="w-full" />
            </Form.Item>
            <Form.Item label="来源">
              <Input v-model:value="form.source" />
            </Form.Item>
          </div>
          <Form.Item label="标题">
            <Input v-model:value="form.title" />
          </Form.Item>
          <Form.Item label="题干">
            <Input.TextArea v-model:value="form.stem" :rows="3" />
          </Form.Item>
          <Form.Item v-if="form.primitive === 'passage'" label="材料">
            <Input.TextArea v-model:value="form.content.material" :rows="4" />
          </Form.Item>
          <Form.Item
            v-if="form.primitive === 'media' || form.primitive === 'annotate'"
            label="媒体标识"
          >
            <Input v-model:value="form.content.mediaLabel" />
          </Form.Item>
          <Form.Item v-if="form.primitive === 'choice'" label="选项">
            <div class="opt-row" v-for="(opt, index) in options" :key="opt.key">
              <Input v-model:value="opt.text">
                <template #addonBefore>{{ opt.key }}</template>
              </Input>
              <Button @click="removeOption(index)">删</Button>
            </div>
            <Space class="mt-2">
              <Button @click="addOption">加选项</Button>
              <span class="text-xs opacity-60">多选</span>
              <Switch
                :checked="!!form.content.multi"
                @update:checked="form.content.multi = Boolean($event)"
              />
            </Space>
            <Input
              v-if="!form.content.multi"
              :value="String(form.content.answer || '')"
              class="mt-2"
              placeholder="正确答案，如 A"
              @update:value="form.content.answer = $event"
            />
          </Form.Item>
          <Form.Item
            v-if="form.primitive === 'blank'"
            label="填空答案（逗号分隔）"
          >
            <Input
              :value="(form.content.answers || []).join(',')"
              @update:value="onAnswersChange"
            />
          </Form.Item>
          <template v-if="form.primitive === 'numeric'">
            <div class="grid-2">
              <Form.Item label="标准数值">
                <InputNumber
                  v-model:value="form.content.numericAnswer"
                  class="w-full"
                />
              </Form.Item>
              <Form.Item label="绝对容差">
                <InputNumber
                  v-model:value="form.content.tolerance"
                  :min="0"
                  class="w-full"
                />
              </Form.Item>
              <Form.Item label="显示单位">
                <Input v-model:value="form.content.unit" />
              </Form.Item>
              <Form.Item label="允许单位（逗号分隔）">
                <Input
                  :value="(form.content.allowedUnits || []).join(',')"
                  @update:value="onAllowedUnitsChange"
                />
              </Form.Item>
            </div>
          </template>
          <template v-if="form.primitive === 'file'">
            <div class="grid-2">
              <Form.Item label="允许 MIME 类型（逗号分隔）">
                <Input
                  :value="(form.content.allowedFileTypes || []).join(',')"
                  @update:value="onFileTypesChange"
                />
              </Form.Item>
              <Form.Item label="单文件上限（MB）">
                <InputNumber
                  v-model:value="form.content.maxFileSizeMb"
                  :min="1"
                  class="w-full"
                />
              </Form.Item>
            </div>
          </template>
          <Form.Item v-if="form.primitive === 'text'" label="参考要点">
            <Input.TextArea v-model:value="form.content.reference" :rows="3" />
          </Form.Item>
          <Form.Item v-if="form.primitive === 'code'" label="语言">
            <Input v-model:value="form.content.codeLang" />
          </Form.Item>
          <Space>
            <Button type="primary" @click="onSave">保存到本地题库</Button>
            <Button @click="router.push('/question-bank/courses')">返回</Button>
          </Space>
        </Form>
      </Card>
      <Card class="editor-preview" :bordered="false">
        <template #title>
          <Space>
            双通道预览
            <Button
              size="small"
              @click="previewMode.paper = !previewMode.paper"
            >
              {{ previewMode.paper ? '看机考块' : '看印刷块' }}
            </Button>
          </Space>
        </template>
        <QuestionRender
          :mode="previewMode.paper ? 'paper' : 'cbt'"
          :question="form"
          :score="form.score"
          :index="1"
        />
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.editor-page {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.editor-form,
.editor-preview {
  flex: 1;
  min-width: 0;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 12px;
}

.opt-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
