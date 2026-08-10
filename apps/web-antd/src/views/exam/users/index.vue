<script lang="ts" setup>
import type { AnalysisOverviewItem } from '@vben/common-ui';
import type { TabOption } from '@vben/types';
import type { TableColumnsType } from 'ant-design-vue';

import { computed, reactive, ref } from 'vue';

import {
  AnalysisChartCard,
  AnalysisChartsTabs,
  AnalysisOverview,
} from '@vben/common-ui';
import {
  SvgBellIcon,
  SvgCakeIcon,
  SvgCardIcon,
  SvgDownloadIcon,
} from '@vben/icons';

import {
  Button,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  type AdminClassCard,
  type AdminUserRow,
  type ExamUserRole,
  type ExamUserStatus,
  MOCK_CLASSES,
  MOCK_USERS,
  ROLE_LABEL,
  STATUS_LABEL,
  USER_STATS,
} from './mock';

defineOptions({ name: 'ExamUsers' });

const classes = ref<AdminClassCard[]>([...MOCK_CLASSES]);
const keyword = ref('');
const roleFilter = ref<'all' | ExamUserRole>('all');
const statusFilter = ref<'all' | ExamUserStatus>('all');
const pagination = reactive({
  current: 1,
  pageSize: 8,
});

const overviewItems: AnalysisOverviewItem[] = [
  {
    icon: SvgCardIcon,
    title: '用户总量',
    totalTitle: '目录规模',
    totalValue: USER_STATS.total,
    value: USER_STATS.activeToday,
  },
  {
    icon: SvgCakeIcon,
    title: '学生',
    totalTitle: '学生总数',
    totalValue: USER_STATS.students,
    value: Math.round(USER_STATS.students * 0.12),
  },
  {
    icon: SvgDownloadIcon,
    title: '教师',
    totalTitle: '教师总数',
    totalValue: USER_STATS.teachers,
    value: Math.round(USER_STATS.teachers * 0.35),
  },
  {
    icon: SvgBellIcon,
    title: '班级',
    totalTitle: '班级总数',
    totalValue: MOCK_CLASSES.length,
    value: MOCK_CLASSES.length,
  },
];

const chartTabs: TabOption[] = [
  { label: '用户', value: 'users' },
  { label: '班级', value: 'classes' },
];

const filteredUsers = computed(() => {
  return MOCK_USERS.filter((row) => {
    const q = keyword.value.trim().toLowerCase();
    const matchKeyword =
      !q ||
      row.realName.toLowerCase().includes(q) ||
      row.username.toLowerCase().includes(q) ||
      row.org.toLowerCase().includes(q);
    const matchRole =
      roleFilter.value === 'all' || row.role === roleFilter.value;
    const matchStatus =
      statusFilter.value === 'all' || row.status === statusFilter.value;
    return matchKeyword && matchRole && matchStatus;
  });
});

const pagedUsers = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize;
  return filteredUsers.value.slice(start, start + pagination.pageSize);
});

const columns: TableColumnsType<AdminUserRow> = [
  { dataIndex: 'realName', key: 'realName', title: '姓名' },
  { dataIndex: 'username', key: 'username', title: '账号' },
  { dataIndex: 'role', key: 'role', title: '角色' },
  { dataIndex: 'org', key: 'org', title: '组织' },
  { dataIndex: 'lastLogin', key: 'lastLogin', title: '最近登录' },
  { dataIndex: 'status', key: 'status', title: '状态' },
];

function statusColor(status: ExamUserStatus) {
  if (status === 'active') return 'success';
  if (status === 'locked') return 'error';
  return 'default';
}

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
  message.success('已创建班级（本地示意）');
}
</script>

<template>
  <div class="p-5">
    <AnalysisOverview :items="overviewItems" />

    <AnalysisChartsTabs :tabs="chartTabs" class="mt-5">
      <template #users>
        <div class="pt-1">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Space wrap>
              <Input
                v-model:value="keyword"
                allow-clear
                placeholder="搜索姓名 / 账号 / 组织"
                style="width: 240px"
                @change="pagination.current = 1"
              />
              <Select
                v-model:value="roleFilter"
                :options="[
                  { label: '全部角色', value: 'all' },
                  { label: '学生', value: 'student' },
                  { label: '教师', value: 'teacher' },
                  { label: '管理', value: 'admin' },
                ]"
                style="width: 140px"
                @change="pagination.current = 1"
              />
              <Select
                v-model:value="statusFilter"
                :options="[
                  { label: '全部状态', value: 'all' },
                  { label: '正常', value: 'active' },
                  { label: '已禁用', value: 'inactive' },
                  { label: '已锁定', value: 'locked' },
                ]"
                style="width: 140px"
                @change="pagination.current = 1"
              />
            </Space>
            <Space>
              <Button @click="notifySoon('批量导入')">导入学生</Button>
              <Button type="primary" @click="notifySoon('新建用户')">
                新建用户
              </Button>
            </Space>
          </div>

          <Table
            :columns="columns"
            :data-source="pagedUsers"
            :pagination="{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: filteredUsers.length,
              showSizeChanger: false,
              onChange: (page: number) => {
                pagination.current = page;
              },
            }"
            :row-key="(row: AdminUserRow) => row.id"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'role'">
                {{ ROLE_LABEL[record.role as ExamUserRole] }}
              </template>
              <template v-else-if="column.key === 'status'">
                <Tag :color="statusColor(record.status as ExamUserStatus)">
                  {{ STATUS_LABEL[record.status as ExamUserStatus] }}
                </Tag>
              </template>
            </template>
          </Table>
        </div>
      </template>

      <template #classes>
        <div class="pt-1">
          <div class="mb-4 flex justify-end">
            <Button type="primary" @click="handleCreateClass">新建班级</Button>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnalysisChartCard
              v-for="item in classes"
              :key="item.id"
              :title="item.name"
            >
              <div class="text-foreground/80 text-sm leading-6">
                <div>学生人数：{{ item.studentCount }}</div>
                <div>班主任：{{ item.teacherName }}</div>
              </div>
            </AnalysisChartCard>
          </div>
        </div>
      </template>
    </AnalysisChartsTabs>
  </div>
</template>
