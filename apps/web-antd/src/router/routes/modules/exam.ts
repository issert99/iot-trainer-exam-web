import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      authority: ['admin'],
      icon: 'lucide:network',
      order: 1,
      title: '教务组织',
    },
    name: 'Exam',
    path: '/exam',
    redirect: '/exam/org',
    children: [
      {
        name: 'ExamOrg',
        path: '/exam/org',
        component: () => import('#/views/exam/org/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:git-branch-plus',
          order: 1,
          title: '组织人员',
        },
      },
      {
        name: 'ExamOfferings',
        path: '/exam/offerings',
        component: () => import('#/views/exam/offerings/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:layers',
          order: 2,
          title: '开课安排',
        },
      },
    ],
  },
];

export default routes;
