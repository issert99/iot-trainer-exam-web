<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Card, Space, Tag, Tree } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import {
  MOCK_ADMIN_CLASSES,
  MOCK_COLLEGES,
  MOCK_MAJORS,
  MOCK_OFFERINGS,
  OFFERING_STATUS_LABEL,
  TEACHER_ROLE_LABEL,
} from '../org/mock';

defineOptions({ name: 'ExamOfferings' });

type NodeType = 'all' | 'class' | 'college' | 'major';
const selectedNode = ref<{ key: string; type: NodeType }>({
  key: 'all',
  type: 'all',
});

const semesterOptions = [
  { label: '2025-2026-1', value: '2025-2026-1' },
  { label: '2025-2026-2', value: '2025-2026-2' },
];

const treeData = computed(() => [
  {
    key: 'all',
    title: '全部组织',
    children: MOCK_COLLEGES.map((college) => ({
      key: `college:${college.id}`,
      title: college.name,
      children: MOCK_MAJORS.filter((m) => m.collegeId === college.id).map(
        (major) => ({
          key: `major:${major.id}`,
          title: major.name,
          children: MOCK_ADMIN_CLASSES.filter(
            (c) => c.majorId === major.id,
          ).map((clazz) => ({
            key: `class:${clazz.id}`,
            title: clazz.name,
          })),
        }),
      ),
    })),
  },
]);

const selectedLabel = computed(() => {
  const { key, type } = selectedNode.value;
  if (type === 'all') return '全部组织';
  if (type === 'college')
    return MOCK_COLLEGES.find((x) => x.id === key)?.name || '学院';
  if (type === 'major')
    return MOCK_MAJORS.find((x) => x.id === key)?.name || '专业';
  return MOCK_ADMIN_CLASSES.find((x) => x.id === key)?.name || '行政班';
});

const formOptions: VbenFormProps = {
  collapsed: false,
  schema: [
    {
      component: 'Select',
      componentProps: {
        allowClear: false,
        options: semesterOptions,
      },
      defaultValue: '2025-2026-1',
      fieldName: 'semester',
      label: '学期',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '开课中', value: 'active' },
          { label: '已结课', value: 'closed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
      fieldName: 'status',
      label: '状态',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '仅合班', value: 'combined' },
          { label: '仅单班', value: 'single' },
        ],
      },
      fieldName: 'mode',
      label: '类型',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '课程 / 教学班 / 老师' },
      fieldName: 'keyword',
      label: '关键词',
    },
  ],
  showCollapseButton: false,
  submitOnChange: true,
};

function getFilteredOfferings(formValues: Record<string, any> = {}) {
  let list = MOCK_OFFERINGS.filter(
    (o) => o.semester === String(formValues.semester || '2025-2026-1'),
  );
  const keyword = String(formValues.keyword || '')
    .trim()
    .toLowerCase();
  if (keyword) {
    list = list.filter((row) =>
      [
        row.name,
        row.courseName,
        row.courseCode,
        ...row.classNames,
        ...row.teachers.map((t) => t.name),
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }
  if (formValues.status)
    list = list.filter((o) => o.status === formValues.status);
  if (formValues.mode === 'combined')
    list = list.filter((o) => o.classNames.length > 1);
  if (formValues.mode === 'single')
    list = list.filter((o) => o.classNames.length === 1);

  switch (selectedNode.value.type) {
    case 'class': {
      const className =
        MOCK_ADMIN_CLASSES.find((c) => c.id === selectedNode.value.key)?.name ||
        '';
      list = list.filter((o) => o.classNames.includes(className));

      break;
    }
    case 'college': {
      const majorNames = new Set(
        MOCK_MAJORS.filter((m) => m.collegeId === selectedNode.value.key).map(
          (m) => m.name,
        ),
      );
      list = list.filter((o) => majorNames.has(o.majorName));

      break;
    }
    case 'major': {
      const majorName =
        MOCK_MAJORS.find((m) => m.id === selectedNode.value.key)?.name || '';
      list = list.filter((o) => o.majorName === majorName);

      break;
    }
    // No default
  }
  return list;
}

const gridOptions: VxeTableGridOptions<any> = {
  columns: [
    { type: 'seq', title: '序号', width: 60 },
    { field: 'name', title: '教学班', minWidth: 220 },
    { field: 'courseName', title: '课程', minWidth: 140 },
    { field: 'courseCode', title: '代码', minWidth: 100 },
    {
      field: 'classNames',
      title: '合班行政班',
      minWidth: 220,
      slots: { default: 'classes' },
    },
    {
      field: 'teachers',
      title: '授课老师',
      minWidth: 220,
      slots: { default: 'teachers' },
    },
    { field: 'studentCount', title: '学生数', minWidth: 90 },
    {
      field: 'status',
      title: '状态',
      minWidth: 100,
      slots: { default: 'status' },
    },
  ],
  height: 'auto',
  pagerConfig: { pageSize: 10, pageSizes: [10, 20, 50] },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const list = getFilteredOfferings(formValues);
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
  const raw = String(keys[0] || 'all');
  if (raw === 'all') {
    selectedNode.value = { key: 'all', type: 'all' };
  } else {
    const [type, id = ''] = raw.split(':');
    selectedNode.value = { key: id, type: type as NodeType };
  }
  gridApi.reload();
}
</script>

<template>
  <Page auto-content-height content-class="h-full">
    <div class="offer-page">
      <Card class="offer-tree-card" title="组织树" :bordered="false">
        <Tree
          :default-expand-all="true"
          :selected-keys="[
            selectedNode.type === 'all'
              ? 'all'
              : `${selectedNode.type}:${selectedNode.key}`,
          ]"
          :tree-data="treeData"
          @select="onSelect"
        />
      </Card>
      <Grid :table-title="`${selectedLabel} · 开课安排`" class="offer-grid">
        <template #toolbar-tools>
          <Space>
            <Button>复制上学期</Button>
            <Button type="primary">新建开课</Button>
          </Space>
        </template>
        <template #classes="{ row }">
          <Space :size="4" wrap>
            <Tag
              v-for="name in row.classNames"
              :key="name"
              :color="row.classNames.length > 1 ? 'blue' : 'default'"
            >
              {{ name }}
            </Tag>
            <Tag v-if="row.classNames.length > 1" color="geekblue">合班</Tag>
          </Space>
        </template>
        <template #teachers="{ row }">
          <Space :size="4" wrap>
            <Tag
              v-for="t in row.teachers"
              :key="t.id"
              :color="t.role === 'instructor' ? 'green' : 'orange'"
            >
              {{ t.name }} ·
              {{ TEACHER_ROLE_LABEL[t.role as 'instructor' | 'assistant'] }}
            </Tag>
          </Space>
        </template>
        <template #status="{ row }">
          <Tag
            :color="
              row.status === 'active'
                ? 'processing'
                : row.status === 'cancelled'
                  ? 'error'
                  : 'default'
            "
          >
            {{
              OFFERING_STATUS_LABEL[
                row.status as 'active' | 'closed' | 'cancelled'
              ]
            }}
          </Tag>
        </template>
      </Grid>
    </div>
  </Page>
</template>

<style scoped>
.offer-page {
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.offer-tree-card {
  flex-shrink: 0;
  width: 280px;
  height: 100%;
}

.offer-main-card {
  flex: 1;
  min-width: 0;
  height: 100%;
}

.offer-grid {
  flex: 1;
  min-width: 0;
}

.offer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

:deep(.offer-tree-card .ant-card-body) {
  height: calc(100% - 57px);
  overflow: auto;
}
</style>
