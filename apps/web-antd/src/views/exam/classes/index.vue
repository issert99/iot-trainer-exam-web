<script lang="ts" setup>
import type { AdminClassRow } from '../org/mock';

import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, message, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { MOCK_ADMIN_CLASSES, MOCK_MAJORS } from '../org/mock';

defineOptions({ name: 'ExamClasses' });

const classes = ref<AdminClassRow[]>([...MOCK_ADMIN_CLASSES]);

const formOptions: VbenFormProps = {
  collapsed: false,
  schema: [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '班级名称',
      },
      fieldName: 'keyword',
      label: '关键词',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: MOCK_MAJORS.filter((m) => m.classCount > 0).map((m) => ({
          label: m.name,
          value: m.id,
        })),
        placeholder: '全部专业',
      },
      fieldName: 'majorId',
      label: '专业',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '2024 级', value: '2024' },
          { label: '2023 级', value: '2023' },
        ],
        placeholder: '入学年级',
      },
      fieldName: 'grade',
      label: '年级',
    },
  ],
  showCollapseButton: false,
  submitOnChange: true,
};

function filterClasses(formValues: Record<string, any> = {}) {
  const keyword = String(formValues.keyword || '')
    .trim()
    .toLowerCase();
  return classes.value.filter((row) => {
    const matchKeyword = !keyword || row.name.toLowerCase().includes(keyword);
    const matchMajor =
      !formValues.majorId || row.majorId === formValues.majorId;
    const matchGrade = !formValues.grade || row.grade === formValues.grade;
    return matchKeyword && matchMajor && matchGrade;
  });
}

const gridOptions: VxeTableGridOptions<AdminClassRow> = {
  columns: [
    { type: 'seq', title: '序号', width: 60 },
    { field: 'name', minWidth: 140, title: '行政班' },
    { field: 'grade', minWidth: 90, title: '入学年' },
    { field: 'majorName', minWidth: 140, title: '专业' },
    { field: 'collegeName', minWidth: 140, title: '学院' },
    { field: 'studentCount', minWidth: 100, title: '学生人数' },
    { field: 'headTeacherName', minWidth: 120, title: '班主任' },
    {
      field: 'action',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 180,
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
        const list = filterClasses(formValues);
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

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

function notifySoon(action: string) {
  message.info(`${action}即将接入接口`);
}

function handleCreateClass() {
  const next = classes.value.length + 1;
  classes.value.push({
    id: `c-new-${next}`,
    name: `新建班级 ${next}`,
    grade: '2024',
    majorId: 'maj-iot',
    majorName: '物联网工程',
    collegeName: '信息工程学院',
    studentCount: 0,
    headTeacherName: '待指定',
  });
  gridApi.reload();
  message.success('已创建行政班（本地示意）');
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="行政班列表（学籍归属）">
      <template #toolbar-tools>
        <Space>
          <Button @click="notifySoon('导入学生')">导入学生</Button>
          <Button type="primary" @click="handleCreateClass">新建行政班</Button>
        </Space>
      </template>
      <template #action>
        <Button size="small" type="link" @click="notifySoon('编辑班级')">
          编辑
        </Button>
        <Button size="small" type="link" @click="notifySoon('查看学生')">
          学生
        </Button>
      </template>
    </Grid>
  </Page>
</template>
