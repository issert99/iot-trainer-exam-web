<script lang="ts" setup>
import type { BankQuestion } from '../types';

import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  message,
  Select,
  Space,
  Tag,
  Tree,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import {
  bankStore,
  CHANNEL_LABEL,
  DIFFICULTY_LABEL,
  knowledgeTreeData,
  LAYER_LABEL,
  listCourseOptions,
  listQuestions,
  PRIMITIVE_LABEL,
  removeQuestion,
  STATUS_LABEL,
  toggleBasket,
} from '../store';

defineOptions({ name: 'BankCourses' });

const router = useRouter();
const courseId = ref(bankStore.courses[0]?.id || '');
const knowledgeId = ref('all');

const treeData = computed(() => knowledgeTreeData(courseId.value));
const selectedKeys = computed(() => [knowledgeId.value]);

const formOptions: VbenFormProps = {
  collapsed: false,
  schema: [
    {
      component: 'Select',
      componentProps: {
        options: listCourseOptions(),
        showSearch: true,
        optionFilterProp: 'label',
      },
      defaultValue: courseId.value,
      fieldName: 'courseId',
      label: '课程',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '题干 / 标题 / 编号' },
      fieldName: 'keyword',
      label: '关键词',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.entries(PRIMITIVE_LABEL).map(([value, label]) => ({
          label,
          value,
        })),
        placeholder: '全部原语',
      },
      fieldName: 'primitive',
      label: '原语',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.entries(CHANNEL_LABEL).map(([value, label]) => ({
          label,
          value,
        })),
        placeholder: '全部渠道',
      },
      fieldName: 'channel',
      label: '渠道',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.entries(STATUS_LABEL).map(([value, label]) => ({
          label,
          value,
        })),
        placeholder: '全部状态',
      },
      fieldName: 'status',
      label: '状态',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.entries(LAYER_LABEL).map(([value, label]) => ({
          label,
          value,
        })),
        placeholder: '全部库',
      },
      fieldName: 'layer',
      label: '所在库',
    },
  ],
  showCollapseButton: false,
  submitOnChange: true,
};

const gridOptions: VxeTableGridOptions<BankQuestion> = {
  columns: [
    { type: 'checkbox', width: 48 },
    { field: 'title', minWidth: 180, title: '标题' },
    {
      field: 'primitive',
      minWidth: 90,
      slots: { default: 'primitive' },
      title: '原语',
    },
    { field: 'typeName', minWidth: 100, title: '显示名' },
    {
      field: 'channel',
      minWidth: 110,
      slots: { default: 'channel' },
      title: '渠道',
    },
    {
      field: 'difficulty',
      minWidth: 70,
      slots: { default: 'difficulty' },
      title: '难度',
    },
    { field: 'score', minWidth: 70, title: '建议分' },
    {
      field: 'status',
      minWidth: 80,
      slots: { default: 'status' },
      title: '状态',
    },
    { field: 'exposure', minWidth: 70, title: '曝光' },
    {
      field: 'action',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 200,
    },
  ],
  height: 'auto',
  pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50] },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        if (formValues?.courseId && formValues.courseId !== courseId.value) {
          courseId.value = formValues.courseId;
          knowledgeId.value = 'all';
        }
        const list = listQuestions({
          ...formValues,
          courseId: courseId.value,
          knowledgeId: knowledgeId.value,
        });
        const start = (page.currentPage - 1) * page.pageSize;
        return {
          items: list.slice(start, start + page.pageSize),
          total: list.length,
        };
      },
    },
  },
  rowConfig: { keyField: 'id' },
  toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
};

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

function onSelect(keys: (number | string)[]) {
  knowledgeId.value = String(keys[0] || 'all');
  gridApi.reload();
}

function openEditor(id?: string) {
  router.push({
    path: '/question-bank/editor',
    query: id ? { id, courseId: courseId.value } : { courseId: courseId.value },
  });
}

function onBasket(id: string) {
  toggleBasket(id);
  message.success(
    bankStore.basket.includes(id) ? '已加入组卷篮' : '已移出组卷篮',
  );
}

function onRemove(id: string) {
  removeQuestion(id);
  message.success('已从本地题库移除');
  gridApi.reload();
}

function goImport() {
  router.push({
    path: '/question-bank/import',
    query: { courseId: courseId.value },
  });
}

function onCourseChange(value: unknown) {
  const nextCourseId = String(value ?? '');
  courseId.value = nextCourseId;
  knowledgeId.value = 'all';
  gridApi.formApi?.setValues?.({ courseId: nextCourseId });
  gridApi.reload();
}
</script>

<template>
  <Page auto-content-height content-class="h-full">
    <div class="bank-page">
      <Card class="bank-tree" title="知识树" :bordered="false">
        <Select
          :value="courseId"
          class="mb-3 w-full"
          :options="listCourseOptions()"
          @change="onCourseChange"
        />
        <Tree
          :selected-keys="selectedKeys"
          :tree-data="treeData"
          :default-expand-all="true"
          :field-names="{ title: 'title', key: 'key', children: 'children' }"
          @select="onSelect"
        />
      </Card>
      <Grid table-title="课程题库（本地数据）" class="bank-grid">
        <template #toolbar-tools>
          <Space>
            <Button @click="goImport">导入</Button>
            <Button type="primary" @click="openEditor()">新建题目</Button>
          </Space>
        </template>
        <template #primitive="{ row }">
          {{ PRIMITIVE_LABEL[row.primitive] }}
        </template>
        <template #channel="{ row }">
          <Tag
            :color="
              row.channel === 'both'
                ? 'blue'
                : row.channel === 'cbt'
                  ? 'purple'
                  : 'gold'
            "
          >
            {{ CHANNEL_LABEL[row.channel] }}
          </Tag>
        </template>
        <template #difficulty="{ row }">
          {{ DIFFICULTY_LABEL[row.difficulty] }}
        </template>
        <template #status="{ row }">
          <Tag
            :color="
              row.status === 'official'
                ? 'success'
                : row.status === 'review'
                  ? 'processing'
                  : row.status === 'retired'
                    ? 'default'
                    : 'warning'
            "
          >
            {{ STATUS_LABEL[row.status] }}
          </Tag>
        </template>
        <template #action="{ row }">
          <Button size="small" type="link" @click="openEditor(row.id)">
            编辑
          </Button>
          <Button size="small" type="link" @click="onBasket(row.id)">
            {{ bankStore.basket.includes(row.id) ? '移出篮' : '入组卷篮' }}
          </Button>
          <Button size="small" type="link" danger @click="onRemove(row.id)">
            删除
          </Button>
        </template>
      </Grid>
    </div>
  </Page>
</template>

<style scoped>
.bank-page {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  min-height: 520px;
}

.bank-tree {
  flex-shrink: 0;
  width: 280px;
}

.bank-grid {
  flex: 1;
  min-width: 0;
}
</style>
