<script lang="ts" setup>
import type { BuilderComponent } from '../mock';

import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { QbTemplate } from '#/api/core';

import { nextTick, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Card, Form, Input, message, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createQbTemplateApi,
  deleteQbTemplateApi,
  listQbTemplatesApi,
  updateQbTemplateApi,
} from '#/api/core';

import QuestionBuilder from '../components/QuestionBuilder.vue';

defineOptions({ name: 'QuestionTemplates' });

function cloneComponents(list: unknown): BuilderComponent[] {
  try {
    return structuredClone(list || []) as BuilderComponent[];
  } catch {
    return [];
  }
}

const view = ref<'edit' | 'list'>('list');
const selectedId = ref<string>();
const saving = ref(false);
const form = reactive({
  id: '',
  name: '',
  description: '',
  components: [] as BuilderComponent[],
});

const formOptions: VbenFormProps = {
  collapsed: false,
  showCollapseButton: false,
  schema: [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: '关键词',
      componentProps: {
        allowClear: true,
        placeholder: '模板名称 / 说明',
      },
    },
  ],
};

const gridOptions: VxeTableGridOptions<QbTemplate> = {
  columns: [
    { type: 'seq', title: '序号', width: 60 },
    { field: 'name', title: '模板名称', minWidth: 160 },
    { field: 'description', title: '说明', minWidth: 220 },
    {
      field: 'component_count',
      title: '组件数',
      width: 90,
      formatter: ({ row }) =>
        String(
          row.component_count ??
            (Array.isArray(row.components) ? row.components.length : 0),
        ),
    },
    { field: 'updated_at', title: '更新', width: 120 },
    {
      field: 'action',
      title: '操作',
      width: 160,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  height: 'auto',
  pagerConfig: { pageSize: 20, pageSizes: [10, 20, 50] },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        return listQbTemplatesApi({
          keyword: formValues?.keyword || '',
          page: page.currentPage,
          pageSize: page.pageSize,
        });
      },
    },
  },
  rowConfig: { keyField: 'id' },
  toolbarConfig: { refresh: true, search: true, zoom: true },
};

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

async function openCreate() {
  form.id = '';
  form.name = '';
  form.description = '';
  form.components = [];
  selectedId.value = undefined;
  view.value = 'edit';
  await nextTick();
}

async function openEdit(row: QbTemplate) {
  form.id = row.id;
  form.name = row.name;
  form.description = row.description || '';
  form.components = cloneComponents(row.components);
  selectedId.value = form.components[0]?.id;
  view.value = 'edit';
  await nextTick();
}

async function saveTemplate() {
  if (!form.name.trim()) {
    message.warning('请填写模板名称');
    return;
  }
  if (form.components.length === 0) {
    message.warning('请先添加备选组件');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      components: form.components,
    };
    await (form.id
      ? updateQbTemplateApi(form.id, payload)
      : createQbTemplateApi(payload));
    message.success('模板已保存');
    view.value = 'list';
    await nextTick();
    await gridApi.reload();
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function removeTemplate(row: QbTemplate) {
  try {
    await deleteQbTemplateApi(row.id);
    message.success('已删除');
    await gridApi.reload();
  } catch {
    message.error('删除失败');
  }
}

function backToList() {
  view.value = 'list';
}
</script>

<template>
  <Page auto-content-height content-class="h-full">
    <div v-show="view === 'list'" class="qb-pane">
      <Grid class="qb-grid" table-title="题型模板">
        <template #toolbar-tools>
          <Space>
            <Button type="primary" @click.stop="openCreate">新建模板</Button>
          </Space>
        </template>
        <template #action="{ row }">
          <Space>
            <Button type="link" size="small" @click.stop="openEdit(row)">
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger
              @click.stop="removeTemplate(row)"
            >
              删除
            </Button>
          </Space>
        </template>
      </Grid>
    </div>

    <div v-show="view === 'edit'" class="qb-pane qb-editor">
      <Card :bordered="false" class="qb-editor-card">
        <div class="qb-editor-bar">
          <Space>
            <Button @click="backToList">返回</Button>
            <Button type="primary" :loading="saving" @click="saveTemplate">
              保存模板
            </Button>
          </Space>
        </div>
        <Form layout="vertical" class="qb-meta">
          <Form.Item label="模板名称" required>
            <Input
              v-model:value="form.name"
              class="max-w-md"
              placeholder="如：阅读理解、网络拓扑连线"
            />
          </Form.Item>
          <Form.Item label="说明">
            <Input
              v-model:value="form.description"
              class="max-w-xl"
              placeholder="模板用途说明"
            />
          </Form.Item>
        </Form>
        <QuestionBuilder
          v-model:components="form.components"
          v-model:selected-id="selectedId"
        />
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.qb-pane {
  height: 100%;
  min-height: 0;
}

.qb-grid {
  height: 100%;
}

.qb-editor {
  overflow: auto;
}

.qb-editor-card {
  min-height: 100%;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.qb-editor-bar {
  margin-bottom: 12px;
}

.qb-meta {
  max-width: 720px;
}
</style>
