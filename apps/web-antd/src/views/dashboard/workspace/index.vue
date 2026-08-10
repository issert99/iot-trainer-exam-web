<script lang="ts" setup>
import type {
  WorkbenchProjectItem,
  WorkbenchQuickNavItem,
  WorkbenchTodoItem,
  WorkbenchTrendItem,
} from '@vben/common-ui';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import {
  AnalysisChartCard,
  WorkbenchHeader,
  WorkbenchProject,
  WorkbenchQuickNav,
  WorkbenchTodo,
  WorkbenchTrends,
} from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

defineOptions({ name: 'Workspace' });

const userStore = useUserStore();
const router = useRouter();

const roleLabel = computed(() => {
  const role = userStore.userInfo?.roles?.[0] || '';
  if (role === 'admin') return '管理员';
  if (role === 'teacher') return '教师';
  if (role === 'student') return '学生';
  return '工作台';
});

const projectItems: WorkbenchProjectItem[] = [
  {
    color: '',
    content: '查看系统运行概览与访问趋势。',
    date: '今天',
    group: '管理',
    icon: 'lucide:area-chart',
    title: '系统概览',
    url: '/analytics',
  },
  {
    color: '#3fb27f',
    content: '维护账号目录与教学班级。',
    date: '今天',
    group: '组织',
    icon: 'lucide:users',
    title: '用户与班级',
    url: '/exam/users',
  },
  {
    color: '#e18525',
    content: '配置角色与权限策略。',
    date: '本周',
    group: '权限',
    icon: 'lucide:shield',
    title: '角色权限',
    url: '/exam/roles',
  },
  {
    color: '#00d8ff',
    content: '查看近期操作审计记录。',
    date: '本周',
    group: '审计',
    icon: 'lucide:scroll-text',
    title: '操作日志',
    url: '/exam/logs',
  },
];

const quickNavItems: WorkbenchQuickNavItem[] = [
  {
    color: '#1fdaca',
    icon: 'ion:home-outline',
    title: '系统概览',
    url: '/analytics',
  },
  {
    color: '#bf0c2c',
    icon: 'ion:people-outline',
    title: '用户与班级',
    url: '/exam/users',
  },
  {
    color: '#e18525',
    icon: 'ion:shield-checkmark-outline',
    title: '角色权限',
    url: '/exam/roles',
  },
  {
    color: '#3fb27f',
    icon: 'ion:calendar-outline',
    title: '学期管理',
    url: '/exam/semesters',
  },
  {
    color: '#4daf1bc9',
    icon: 'ion:settings-outline',
    title: '系统设置',
    url: '/exam/settings',
  },
  {
    color: '#00d8ff',
    icon: 'ion:server-outline',
    title: '数据备份',
    url: '/exam/backup',
  },
];

const todoItems: WorkbenchTodoItem[] = [
  {
    completed: false,
    content: `完成 <a>本学期开课班级</a> 核对`,
    date: '今天',
    title: '班级核对',
  },
  {
    completed: false,
    content: `复核 <a>教师账号</a> 权限分配`,
    date: '明天',
    title: '权限复核',
  },
  {
    completed: true,
    content: `导入 <a>新生账号</a> 名单`,
    date: '昨天',
    title: '账号导入',
  },
];

const trendItems = computed<WorkbenchTrendItem[]>(() => [
  {
    avatar: 'svg:avatar-1',
    content: `创建了班级 <a>物联2401</a>`,
    date: '刚刚',
    title: '王老师',
  },
  {
    avatar: 'svg:avatar-2',
    content: `更新了用户 <a>20240001</a> 状态`,
    date: '1 小时前',
    title: '系统管理员',
  },
  {
    avatar: 'lucide:user',
    content: `登录了管理台`,
    date: '今天',
    title: userStore.userInfo?.realName || '当前用户',
  },
]);

function navTo(nav: WorkbenchProjectItem | WorkbenchQuickNavItem) {
  if (nav.url?.startsWith('http')) {
    window.open(nav.url, '_blank');
    return;
  }
  if (nav.url?.startsWith('/')) {
    router.push(nav.url).catch(() => {});
  }
}
</script>

<template>
  <div class="p-5">
    <WorkbenchHeader
      :avatar="userStore.userInfo?.avatar || preferences.app.defaultAvatar"
    >
      <template #title>
        早安，{{ userStore.userInfo?.realName || '用户' }}，开始您一天的工作吧！
      </template>
      <template #description> 知测考试平台 · {{ roleLabel }} </template>
    </WorkbenchHeader>

    <div class="mt-5 flex flex-col lg:flex-row">
      <div class="mr-4 w-full lg:w-3/5">
        <WorkbenchProject :items="projectItems" title="项目" @click="navTo" />
        <WorkbenchTrends :items="trendItems" class="mt-5" title="最新动态" />
      </div>
      <div class="w-full lg:w-2/5">
        <WorkbenchQuickNav
          :items="quickNavItems"
          class="mt-5 lg:mt-0"
          title="快捷导航"
          @click="navTo"
        />
        <WorkbenchTodo :items="todoItems" class="mt-5" title="待办" />
        <AnalysisChartCard class="mt-5" title="说明">
          <div class="text-foreground/80 text-sm leading-6">
            本页沿用 Vben
            工作台布局组件。管理员可从快捷导航进入考试管理模块；后续将在此接入考试、成绩等业务入口。
          </div>
        </AnalysisChartCard>
      </div>
    </div>
  </div>
</template>
