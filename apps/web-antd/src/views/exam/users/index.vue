<script lang="ts" setup>
import type { AdminUserRow, ExamUserRole, ExamUserStatus } from './mock';

import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page } from '@vben/common-ui';

import { Button, message, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import { MOCK_USERS, ROLE_LABEL, STATUS_LABEL } from './mock';

defineOptions({ name: 'ExamUsers' });

const formOptions: VbenFormProps = {
  collapsed: false,
  schema: [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '姓名 / 账号 / 组织',
      },
      fieldName: 'keyword',
      label: '关键词',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '学生', value: 'student' },
          { label: '教师', value: 'teacher' },
          { label: '管理', value: 'admin' },
        ],
        placeholder: '全部角色',
      },
      fieldName: 'role',
      label: '角色',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '正常', value: 'active' },
          { label: '已禁用', value: 'inactive' },
          { label: '已锁定', value: 'locked' },
        ],
        placeholder: '全部状态',
      },
      fieldName: 'status',
      label: '状态',
    },
  ],
  showCollapseButton: true,
  submitOnChange: true,
  submitOnEnter: true,
};

function filterUsers(formValues: Record<string, any> = {}) {
  const keyword = String(formValues.keyword || '')
    .trim()
    .toLowerCase();
  return MOCK_USERS.filter((row) => {
    const matchKeyword =
      !keyword ||
      row.realName.toLowerCase().includes(keyword) ||
      row.username.toLowerCase().includes(keyword) ||
      row.org.toLowerCase().includes(keyword);
    const matchRole = !formValues.role || row.role === formValues.role;
    const matchStatus = !formValues.status || row.status === formValues.status;
    return matchKeyword && matchRole && matchStatus;
  });
}

const gridOptions: VxeTableGridOptions<AdminUserRow> = {
  checkboxConfig: {
    highlight: true,
    reserve: true,
  },
  columns: [
    { type: 'checkbox', width: 50 },
    { type: 'seq', title: '序号', width: 60 },
    { field: 'realName', minWidth: 120, title: '姓名' },
    { field: 'username', minWidth: 140, title: '账号' },
    {
      field: 'role',
      minWidth: 100,
      slots: { default: 'role' },
      title: '角色',
    },
    { field: 'org', minWidth: 160, showOverflow: true, title: '组织' },
    { field: 'lastLogin', minWidth: 140, title: '最近登录' },
    {
      field: 'status',
      minWidth: 110,
      slots: { default: 'status' },
      title: '状态',
    },
    {
      field: 'action',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 160,
    },
  ],
  exportConfig: {},
  height: 'auto',
  keepSource: true,
  pagerConfig: {
    pageSize: 10,
    pageSizes: [10, 20, 50],
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const list = filterUsers(formValues);
        const start = (page.currentPage - 1) * page.pageSize;
        return {
          items: list.slice(start, start + page.pageSize),
          total: list.length,
        };
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  toolbarConfig: {
    custom: true,
    export: true,
    refresh: true,
    search: true,
    zoom: true,
  },
};

const [Grid] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

function statusColor(status: ExamUserStatus) {
  if (status === 'active') return 'success';
  if (status === 'locked') return 'error';
  return 'default';
}

function notifySoon(action: string) {
  message.info(`${action}即将接入`);
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="用户列表">
      <template #toolbar-tools>
        <Space>
          <Button @click="notifySoon('批量导入')">导入学生</Button>
          <Button type="primary" @click="notifySoon('新建用户')">
            新建用户
          </Button>
        </Space>
      </template>
      <template #role="{ row }">
        {{ ROLE_LABEL[row.role as ExamUserRole] }}
      </template>
      <template #status="{ row }">
        <Tag :color="statusColor(row.status as ExamUserStatus)">
          {{ STATUS_LABEL[row.status as ExamUserStatus] }}
        </Tag>
      </template>
      <template #action>
        <Space>
          <Button size="small" type="link" @click="notifySoon('编辑')">
            编辑
          </Button>
          <Button size="small" type="link" @click="notifySoon('重置密码')">
            重置
          </Button>
        </Space>
      </template>
    </Grid>
  </Page>
</template>
