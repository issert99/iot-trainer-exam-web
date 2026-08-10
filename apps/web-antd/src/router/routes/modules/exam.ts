import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      authority: ['admin'],
      icon: 'lucide:graduation-cap',
      order: 1,
      title: '考试管理',
    },
    name: 'Exam',
    path: '/exam',
    children: [
      {
        name: 'ExamUsers',
        path: '/exam/users',
        component: () => import('#/views/exam/users/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:users',
          title: '用户与班级',
        },
      },
      {
        name: 'ExamRoles',
        path: '/exam/roles',
        component: () => import('#/views/exam/placeholder/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:shield',
          title: '角色权限',
        },
      },
      {
        name: 'ExamSemesters',
        path: '/exam/semesters',
        component: () => import('#/views/exam/placeholder/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:calendar',
          title: '学期管理',
        },
      },
      {
        name: 'ExamLogs',
        path: '/exam/logs',
        component: () => import('#/views/exam/placeholder/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:scroll-text',
          title: '操作日志',
        },
      },
      {
        name: 'ExamSettings',
        path: '/exam/settings',
        component: () => import('#/views/exam/placeholder/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:settings',
          title: '系统设置',
        },
      },
      {
        name: 'ExamBackup',
        path: '/exam/backup',
        component: () => import('#/views/exam/placeholder/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:database-backup',
          title: '数据备份',
        },
      },
    ],
  },
];

export default routes;
