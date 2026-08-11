<script lang="ts" setup>
import type { CourseRow } from '../org/mock';

import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page } from '@vben/common-ui';

import { Button, message, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { MOCK_COURSES, MOCK_MAJORS } from '../org/mock';

defineOptions({ name: 'ExamCourses' });

const formOptions: VbenFormProps = {
  collapsed: false,
  schema: [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '课程名 / 代码',
      },
      fieldName: 'keyword',
      label: '关键词',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: MOCK_MAJORS.map((m) => ({ label: m.name, value: m.id })),
        placeholder: '全部专业',
      },
      fieldName: 'majorId',
      label: '专业',
    },
  ],
  showCollapseButton: false,
  submitOnChange: true,
};

function filterCourses(formValues: Record<string, any> = {}) {
  const keyword = String(formValues.keyword || '')
    .trim()
    .toLowerCase();
  return MOCK_COURSES.filter((row) => {
    const matchKeyword =
      !keyword ||
      row.name.toLowerCase().includes(keyword) ||
      row.code.toLowerCase().includes(keyword);
    const matchMajor =
      !formValues.majorId || row.majorId === formValues.majorId;
    return matchKeyword && matchMajor;
  });
}

const gridOptions: VxeTableGridOptions<CourseRow> = {
  columns: [
    { type: 'seq', title: '序号', width: 60 },
    { field: 'code', minWidth: 110, title: '课程代码' },
    { field: 'name', minWidth: 180, title: '课程名称' },
    { field: 'majorName', minWidth: 140, title: '所属专业' },
    { field: 'collegeName', minWidth: 140, title: '学院' },
    { field: 'credit', minWidth: 80, title: '学分' },
    { field: 'suggestTerm', minWidth: 110, title: '建议学期' },
    {
      field: 'isActive',
      minWidth: 90,
      slots: { default: 'status' },
      title: '状态',
    },
    {
      field: 'action',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 140,
    },
  ],
  height: 'auto',
  pagerConfig: {
    pageSize: 10,
    pageSizes: [10, 20],
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const list = filterCourses(formValues);
        const start = (page.currentPage - 1) * page.pageSize;
        return {
          items: list.slice(start, start + page.pageSize),
          total: list.length,
        };
      },
    },
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    search: true,
    zoom: true,
  },
};

const [Grid] = useVbenVxeGrid({ formOptions, gridOptions });

function notifySoon(action: string) {
  message.info(`${action}即将接入接口`);
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="课程列表（培养方案）">
      <template #toolbar-tools>
        <Space>
          <Button @click="notifySoon('导入课程')">导入</Button>
          <Button type="primary" @click="notifySoon('新建课程')">
            新建课程
          </Button>
        </Space>
      </template>
      <template #status="{ row }">
        <Tag :color="row.isActive ? 'success' : 'default'">
          {{ row.isActive ? '启用' : '停用' }}
        </Tag>
      </template>
      <template #action>
        <Button size="small" type="link" @click="notifySoon('编辑课程')">
          编辑
        </Button>
      </template>
    </Grid>
  </Page>
</template>
