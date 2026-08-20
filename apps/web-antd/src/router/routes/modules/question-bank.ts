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
    redirect: '/question-bank/courses',
    children: [
      {
        name: 'BankCourses',
        path: '/question-bank/courses',
        component: () => import('#/views/exam/bank/course-bank/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:book-open',
          order: 1,
          title: '课程题库',
        },
      },
      {
        name: 'BankKnowledge',
        path: '/question-bank/knowledge',
        component: () => import('#/views/exam/bank/knowledge/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:network',
          order: 2,
          title: '知识点',
        },
      },
      {
        name: 'BankEditor',
        path: '/question-bank/editor',
        component: () => import('#/views/exam/bank/editor/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          hideInMenu: true,
          title: '题目编辑',
        },
      },
      {
        name: 'BankImport',
        path: '/question-bank/import',
        component: () => import('#/views/exam/bank/import/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:file-up',
          order: 3,
          title: '导入',
        },
      },
      {
        name: 'BankExport',
        path: '/question-bank/export',
        component: () => import('#/views/exam/bank/export/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:file-down',
          order: 4,
          title: '导出',
        },
      },
      {
        name: 'BankBlueprint',
        path: '/question-bank/blueprint',
        component: () => import('#/views/exam/bank/blueprint/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:list-tree',
          order: 5,
          title: '组卷蓝图',
        },
      },
      {
        name: 'BankAssemble',
        path: '/question-bank/assemble',
        component: () => import('#/views/exam/bank/assemble/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:shuffle',
          order: 6,
          title: '智能组卷',
        },
      },
      {
        name: 'BankStudio',
        path: '/question-bank/studio',
        component: () => import('#/views/exam/bank/studio/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:file-pen-line',
          order: 7,
          title: '试卷工作室',
        },
      },
      {
        name: 'BankPreview',
        path: '/question-bank/preview',
        component: () => import('#/views/exam/bank/preview/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:columns-2',
          order: 8,
          title: '双通道预览',
        },
      },
      {
        name: 'BankLayouts',
        path: '/question-bank/layouts',
        component: () => import('#/views/exam/bank/layouts/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:layout-template',
          order: 9,
          title: '版式模板',
        },
      },
      {
        name: 'QuestionTemplates',
        path: '/question-bank/templates',
        redirect: '/question-bank/layouts',
        meta: {
          authority: ['admin', 'teacher'],
          hideInMenu: true,
          title: '题型模板',
        },
      },
      {
        name: 'QuestionList',
        path: '/question-bank/questions',
        redirect: '/question-bank/courses',
        meta: {
          authority: ['admin', 'teacher'],
          hideInMenu: true,
          title: '题目管理',
        },
      },
      {
        name: 'PaperStudio',
        path: '/question-bank/paper-studio',
        redirect: '/question-bank/studio',
        meta: {
          authority: ['admin', 'teacher'],
          hideInMenu: true,
          title: '试卷工作室',
        },
      },
    ],
  },
];

export default routes;
