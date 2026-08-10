<script lang="ts" setup>
import type { AdminClassCard } from '../users/mock';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { MOCK_CLASSES } from '../users/mock';

defineOptions({ name: 'ExamClasses' });

const classes = ref<AdminClassCard[]>([...MOCK_CLASSES]);

const gridOptions: VxeTableGridOptions<AdminClassCard> = {
  columns: [
    { type: 'seq', title: '序号', width: 60 },
    { field: 'name', minWidth: 180, title: '班级名称' },
    { field: 'studentCount', minWidth: 120, title: '学生人数' },
    { field: 'teacherName', minWidth: 140, title: '班主任' },
    {
      field: 'action',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 140,
    },
  ],
  data: classes.value,
  height: 'auto',
  pagerConfig: {
    enabled: false,
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    zoom: true,
  },
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
});

function notifySoon(action: string) {
  message.info(`${action}即将接入`);
}

function handleCreateClass() {
  const next = classes.value.length + 1;
  classes.value.push({
    id: `c-new-${next}`,
    name: `新建班级 ${next}`,
    studentCount: 0,
    teacherName: '待指定',
  });
  gridApi.setGridOptions({ data: [...classes.value] });
  message.success('已创建班级（本地示意）');
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="班级列表">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreateClass">新建班级</Button>
      </template>
      <template #action>
        <Button size="small" type="link" @click="notifySoon('编辑班级')">
          编辑
        </Button>
      </template>
    </Grid>
  </Page>
</template>
