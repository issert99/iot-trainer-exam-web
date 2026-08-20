<script lang="ts" setup>
import type { PaperBlueprint, Primitive } from '../types';

import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router';

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
} from 'ant-design-vue';

import {
  bankStore,
  CHANNEL_LABEL,
  clonePlain,
  createBlueprint,
  listCourseOptions,
  PRIMITIVE_LABEL,
  saveBlueprint,
} from '../store';

defineOptions({ name: 'BankBlueprint' });

const router = useRouter();
const form = reactive<PaperBlueprint>(
  clonePlain(
    bankStore.blueprints[0] || createBlueprint(bankStore.courses[0]?.id ?? ''),
  ),
);

const knowledgeOptions = computed(() =>
  bankStore.knowledge
    .filter((item) => item.courseId === form.courseId)
    .map((item) => ({ label: item.name, value: item.id })),
);

const layoutOptions = (kind: 'cbt' | 'paper' | 'sheet') =>
  bankStore.layouts
    .filter((item) => item.kind === kind)
    .map((item) => ({ label: item.name, value: item.id }));

function load(id: string) {
  const found = bankStore.blueprints.find((item) => item.id === id);
  if (!found) return;
  Object.assign(form, clonePlain(found));
}

function onNew() {
  const created = createBlueprint(form.courseId);
  saveBlueprint(created);
  load(created.id);
}

function onSave() {
  saveBlueprint(clonePlain(form));
  message.success('蓝图已保存');
}

function addSection() {
  form.sections.push({
    id: `sec-${Date.now()}`,
    name: '新大题',
    rules: [{ id: `r-${Date.now()}`, count: 5, score: 2, primitive: 'choice' }],
  });
}

function addRule(sectionIndex: number) {
  form.sections[sectionIndex]?.rules.push({
    id: `r-${Date.now()}`,
    count: 1,
    score: 2,
  });
}

function removeSection(index: number) {
  form.sections.splice(index, 1);
}

function onRulePrimitive(
  rule: PaperBlueprint['sections'][number]['rules'][number],
  value: unknown,
) {
  rule.primitive = value ? (String(value) as Primitive) : undefined;
}

function assemble() {
  onSave();
  router.push({
    path: '/question-bank/assemble',
    query: { blueprintId: form.id },
  });
}

const primitiveOptions = [
  { label: '不限', value: '' },
  ...Object.entries(PRIMITIVE_LABEL).map(([value, label]) => ({
    label,
    value: value as Primitive,
  })),
];
</script>

<template>
  <Page>
    <div class="bp-page">
      <Card class="bp-list" title="蓝图" :bordered="false">
        <Button type="dashed" block class="mb-3" @click="onNew">
          新建蓝图
        </Button>
        <button
          v-for="item in bankStore.blueprints"
          :key="item.id"
          type="button"
          class="bp-item"
          :class="{ active: item.id === form.id }"
          @click="load(item.id)"
        >
          <strong>{{ item.name }}</strong>
          <span>{{
            listCourseOptions().find((c) => c.value === item.courseId)?.label
          }}</span>
        </button>
      </Card>
      <Card class="bp-form" title="抽题规则" :bordered="false">
        <Form layout="vertical">
          <div class="grid-2">
            <Form.Item label="名称">
              <Input v-model:value="form.name" />
            </Form.Item>
            <Form.Item label="课程">
              <Select
                v-model:value="form.courseId"
                :options="listCourseOptions()"
              />
            </Form.Item>
            <Form.Item label="时长（分钟）">
              <InputNumber v-model:value="form.duration" class="w-full" />
            </Form.Item>
            <Form.Item label="卷面总分">
              <InputNumber v-model:value="form.totalScore" class="w-full" />
            </Form.Item>
            <Form.Item label="渠道过滤">
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
            <Form.Item label="机考布局">
              <Select
                v-model:value="form.layoutCbtId"
                :options="layoutOptions('cbt')"
              />
            </Form.Item>
            <Form.Item label="纸笔卷面">
              <Select
                v-model:value="form.layoutPaperId"
                :options="layoutOptions('paper')"
              />
            </Form.Item>
            <Form.Item label="答题卡">
              <Select
                v-model:value="form.layoutSheetId"
                :options="layoutOptions('sheet')"
              />
            </Form.Item>
          </div>
        </Form>

        <div
          v-for="(section, sIndex) in form.sections"
          :key="section.id"
          class="sec"
        >
          <Space class="mb-2">
            <Input v-model:value="section.name" style="width: 240px" />
            <Button size="small" @click="addRule(sIndex)">加规则</Button>
            <Button size="small" danger @click="removeSection(sIndex)">
              删大题
            </Button>
          </Space>
          <div v-for="rule in section.rules" :key="rule.id" class="rule">
            <Select
              :value="rule.primitive || ''"
              allow-clear
              placeholder="原语"
              style="width: 140px"
              :options="primitiveOptions"
              @change="(value) => onRulePrimitive(rule, value)"
            />
            <Select
              v-model:value="rule.knowledgeId"
              allow-clear
              placeholder="知识点"
              style="width: 160px"
              :options="knowledgeOptions"
            />
            <InputNumber
              v-model:value="rule.difficulty"
              :min="1"
              :max="5"
              placeholder="难度"
            />
            <InputNumber
              v-model:value="rule.count"
              :min="1"
              addon-before="抽"
            />
            <InputNumber
              v-model:value="rule.score"
              :min="1"
              addon-before="每题分"
            />
          </div>
        </div>
        <Space class="mt-4">
          <Button @click="addSection">加大题</Button>
          <Button @click="onSave">保存蓝图</Button>
          <Button type="primary" @click="assemble">按蓝图组卷</Button>
        </Space>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.bp-page {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.bp-list {
  flex-shrink: 0;
  width: 280px;
}

.bp-form {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.bp-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 10px;
  margin-bottom: 8px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.bp-item.active {
  border-color: hsl(var(--primary));
}

.bp-item span {
  font-size: 12px;
  opacity: 0.65;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 12px;
}

.sec {
  padding: 12px;
  margin: 16px 0;
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
}

.rule {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
