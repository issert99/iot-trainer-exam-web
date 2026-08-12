import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      authority: ['admin', 'teacher'],
      icon: 'lucide:library-big',
      order: 2,
      title: '题库中心',
    },
    name: 'QuestionBank',
    path: '/question-bank',
    redirect: '/question-bank/templates',
    children: [
      {
        name: 'QuestionTemplates',
        path: '/question-bank/templates',
        component: () =>
          import('#/views/exam/question-bank/templates/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:blocks',
          order: 1,
          title: '题型模板',
        },
      },
      {
        name: 'QuestionList',
        path: '/question-bank/questions',
        component: () =>
          import('#/views/exam/question-bank/questions/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:file-question',
          order: 2,
          title: '题目管理',
        },
      },
    ],
  },
];

export default routes;
