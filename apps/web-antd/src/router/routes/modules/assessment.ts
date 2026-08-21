import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const hiddenMeta = {
  authority: ['admin', 'teacher'],
  hideInMenu: true,
};

const routes: RouteRecordRaw[] = [
  {
    children: [
      {
        component: () => import('#/views/assessment/dashboard/index.vue'),
        meta: {
          authority: ['admin', 'student', 'teacher'],
          icon: 'lucide:gauge',
          order: 1,
          title: '考试工作台',
        },
        name: 'AssessmentDashboard',
        path: '/assessment/dashboard',
      },
      {
        component: () => import('#/views/assessment/curriculum/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:network',
          order: 2,
          title: '基础与分类',
        },
        name: 'AssessmentFoundation',
        path: '/assessment/foundation',
      },
      {
        meta: { ...hiddenMeta, title: '旧教学体系地址兼容' },
        name: 'LegacyAssessmentCurriculum',
        path: '/assessment/curriculum',
        redirect: '/assessment/foundation',
      },
      {
        component: () => import('#/views/assessment/items/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:library-big',
          order: 3,
          title: '全校题库',
        },
        name: 'AssessmentItems',
        path: '/assessment/items',
      },
      {
        component: () => import('#/views/assessment/items/editor/index.vue'),
        meta: { ...hiddenMeta, title: '命题工作台' },
        name: 'AssessmentItemEditor',
        path: '/assessment/items/editor',
      },
      {
        component: () => import('#/views/assessment/items/review/index.vue'),
        meta: { ...hiddenMeta, title: '题目审核中心' },
        name: 'AssessmentItemReview',
        path: '/assessment/items/review',
      },
      {
        component: () => import('#/views/assessment/plugins-page/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:blocks',
          order: 4,
          title: '交互设计',
        },
        name: 'AssessmentInteractions',
        path: '/assessment/interactions',
      },
      {
        meta: { ...hiddenMeta, title: '旧插件地址兼容' },
        name: 'LegacyAssessmentPlugins',
        path: '/assessment/plugins',
        redirect: '/assessment/interactions',
      },
      {
        component: () =>
          import('#/views/assessment/interactions/designer/index.vue'),
        meta: { ...hiddenMeta, title: '无代码交互设计器' },
        name: 'AssessmentInteractionDesigner',
        path: '/assessment/interactions/designer',
      },
      {
        component: () =>
          import('#/views/assessment/interactions/lab/index.vue'),
        meta: { ...hiddenMeta, title: '插件测试实验室' },
        name: 'AssessmentInteractionLab',
        path: '/assessment/interactions/lab',
      },
      {
        component: () => import('#/views/assessment/papers/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:files',
          order: 5,
          title: '试卷中心',
        },
        name: 'AssessmentPapers',
        path: '/assessment/papers',
      },
      {
        component: () => import('#/views/assessment/exams/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:monitor-check',
          order: 6,
          title: '考试运行',
        },
        name: 'AssessmentExams',
        path: '/assessment/exams',
      },
      {
        component: () => import('#/views/assessment/delivery/paper/index.vue'),
        meta: { ...hiddenMeta, title: '纸笔交付' },
        name: 'AssessmentPaperDelivery',
        path: '/assessment/delivery/paper',
      },
      {
        component: () =>
          import('#/views/assessment/delivery/practical/index.vue'),
        meta: { ...hiddenMeta, title: '实践与口试' },
        name: 'AssessmentPracticalDelivery',
        path: '/assessment/delivery/practical',
      },
      {
        component: () => import('#/views/assessment/attempt/index.vue'),
        meta: {
          authority: ['admin', 'student', 'teacher'],
          hideInMenu: true,
          title: '在线作答',
        },
        name: 'AssessmentAttempt',
        path: '/assessment/attempt',
      },
      {
        component: () => import('#/views/assessment/scoring/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:list-checks',
          order: 7,
          title: '评分与成绩',
        },
        name: 'AssessmentScoring',
        path: '/assessment/scoring',
      },
      {
        component: () => import('#/views/assessment/analytics/index.vue'),
        meta: {
          authority: ['admin', 'teacher'],
          icon: 'lucide:chart-no-axes-combined',
          order: 8,
          title: '质量分析',
        },
        name: 'AssessmentAnalytics',
        path: '/assessment/analytics',
      },
      {
        component: () => import('#/views/assessment/governance/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:settings',
          order: 9,
          title: '系统设置',
        },
        name: 'AssessmentSettings',
        path: '/assessment/settings',
      },
      {
        meta: { ...hiddenMeta, title: '旧治理地址兼容' },
        name: 'LegacyAssessmentGovernance',
        path: '/assessment/governance',
        redirect: '/assessment/settings',
      },
    ],
    component: BasicLayout,
    meta: {
      authority: ['admin', 'student', 'teacher'],
      icon: 'lucide:graduation-cap',
      order: 2,
      title: '全校考试',
    },
    name: 'SchoolAssessmentPlatform',
    path: '/assessment',
    redirect: '/assessment/dashboard',
  },
  {
    children: [
      {
        meta: {
          authority: ['admin', 'teacher'],
          hideInMenu: true,
          title: '旧题库地址兼容',
        },
        name: 'LegacyQuestionBankChild',
        path: '/question-bank/:pathMatch(.*)*',
        redirect: '/assessment/items',
      },
    ],
    component: BasicLayout,
    meta: {
      authority: ['admin', 'teacher'],
      hideInMenu: true,
      title: '旧题库地址兼容',
    },
    name: 'LegacyQuestionBank',
    path: '/question-bank',
    redirect: '/assessment/items',
  },
];

export default routes;
