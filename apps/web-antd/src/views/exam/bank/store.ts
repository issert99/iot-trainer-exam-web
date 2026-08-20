import type {
  ItemRevision,
  RevisionStatus,
  TestFormRevision,
} from './contracts';
import type {
  AssembledPaper,
  BankCourse,
  BankLayer,
  BankQuestion,
  ChannelFit,
  KnowledgeNode,
  LayoutTemplate,
  PaperBlueprint,
  PaperItem,
  Primitive,
  QuestionFilter,
} from './types';

import { reactive } from 'vue';

import { appendAudit, tenantContext } from '#/platform/exam-governance';

import {
  createItemRevision,
  createTestFormRevision,
  integrityChecksum,
} from './contracts';
import { validatePaperCompatibility } from './plugins/registry';

export const PRIMITIVE_LABEL: Record<Primitive, string> = {
  annotate: '标注',
  blank: '填空槽',
  choice: '选择',
  code: '代码',
  drawing: '空间作答',
  external: '外部回传',
  file: '文件作品',
  formula: '公式',
  match: '配对',
  media: '媒体作品',
  numeric: '数值与单位',
  passage: '材料题',
  rubric: '现场量规',
  sequence: '序列',
  text: '构造文本',
};

export const CHANNEL_LABEL: Record<ChannelFit, string> = {
  both: '机考与纸笔',
  cbt: '仅机考',
  paper: '仅纸笔',
};

export const STATUS_LABEL = {
  draft: '草稿',
  official: '正式',
  retired: '停用',
  review: '待审',
} as const;

export const LAYER_LABEL: Record<BankLayer, string> = {
  course: '课程共建库',
  draft: '个人草稿库',
  official: '正式库',
};

export const DIFFICULTY_LABEL = {
  1: '易',
  2: '较易',
  3: '中',
  4: '较难',
  5: '难',
} as const;

export function clonePlain<T>(value: T): T {
  return structuredClone(value);
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

const courses: BankCourse[] = [
  {
    id: 'cou-cs101',
    code: 'CS101',
    name: '程序设计基础',
    college: '信息工程学院',
    major: '计算机科学',
  },
  {
    id: 'cou-cs201',
    code: 'CS201',
    name: '数据结构',
    college: '信息工程学院',
    major: '计算机科学',
  },
  {
    id: 'cou-eng101',
    code: 'ENG101',
    name: '大学英语',
    college: '外国语学院',
    major: '英语/外语',
  },
  {
    id: 'cou-med201',
    code: 'MED201',
    name: '诊断学',
    college: '医学院',
    major: '医学/护理',
  },
];

const knowledge: KnowledgeNode[] = [
  { id: 'k-cs-base', courseId: 'cou-cs101', parentId: null, name: '语言基础' },
  {
    id: 'k-cs-ptr',
    courseId: 'cou-cs101',
    parentId: 'k-cs-base',
    name: '指针与数组',
  },
  {
    id: 'k-cs-fn',
    courseId: 'cou-cs101',
    parentId: 'k-cs-base',
    name: '函数与递归',
  },
  { id: 'k-cs-algo', courseId: 'cou-cs101', parentId: null, name: '算法入门' },
  {
    id: 'k-cs-comp',
    courseId: 'cou-cs101',
    parentId: 'k-cs-algo',
    name: '复杂度',
  },
  {
    id: 'k-cs-dp',
    courseId: 'cou-cs101',
    parentId: 'k-cs-algo',
    name: '动态规划',
  },
  {
    id: 'k-ds-linear',
    courseId: 'cou-cs201',
    parentId: null,
    name: '线性结构',
  },
  {
    id: 'k-ds-stack',
    courseId: 'cou-cs201',
    parentId: 'k-ds-linear',
    name: '栈与队列',
  },
  { id: 'k-ds-tree', courseId: 'cou-cs201', parentId: null, name: '树' },
  { id: 'k-eng-listen', courseId: 'cou-eng101', parentId: null, name: '听力' },
  { id: 'k-eng-read', courseId: 'cou-eng101', parentId: null, name: '阅读' },
  { id: 'k-eng-write', courseId: 'cou-eng101', parentId: null, name: '写作' },
  { id: 'k-med-ask', courseId: 'cou-med201', parentId: null, name: '问诊' },
  { id: 'k-med-img', courseId: 'cou-med201', parentId: null, name: '读片' },
  {
    id: 'k-med-case',
    courseId: 'cou-med201',
    parentId: null,
    name: '病例分析',
  },
];

function q(partial: BankQuestion): BankQuestion {
  return partial;
}

const seedQuestions: BankQuestion[] = [
  q({
    id: 'q-cs-1',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-comp'],
    title: '时间复杂度叙述',
    stem: '下列算法最坏情况下时间复杂度最低的是？',
    primitive: 'choice',
    typeName: '单项选择',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 2,
    score: 2,
    exposure: 3,
    source: '2024 期末',
    typePackVersion: 'choice@1.0',
    content: {
      options: [
        { key: 'A', text: '冒泡排序' },
        { key: 'B', text: '堆排序' },
        { key: 'C', text: '选择排序' },
        { key: 'D', text: '插入排序（逆序）' },
      ],
      answer: 'B',
    },
  }),
  q({
    id: 'q-cs-2',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-ptr'],
    title: '指针与数组关系',
    stem: '在 C 语言中，若 int a[10]; 则下列说法正确的是？',
    primitive: 'choice',
    typeName: '单项选择',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 2,
    score: 2,
    exposure: 1,
    source: '教研室命题',
    typePackVersion: 'choice@1.0',
    content: {
      options: [
        { key: 'A', text: 'a 与 &a 类型相同' },
        { key: 'B', text: 'a 是指向首元素的指针常量' },
        { key: 'C', text: 'sizeof(a) 等于 sizeof(&a[0])' },
        { key: 'D', text: 'a++ 合法' },
      ],
      answer: 'B',
    },
  }),
  q({
    id: 'q-cs-3',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-fn'],
    title: '递归出口',
    stem: '编写递归函数时必须具备的条件包括（多选）。',
    primitive: 'choice',
    typeName: '多项选择',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 3,
    score: 4,
    exposure: 2,
    source: '题库共建',
    typePackVersion: 'choice@1.0',
    content: {
      multi: true,
      options: [
        { key: 'A', text: '有明确的递归出口' },
        { key: 'B', text: '问题规模必须递减' },
        { key: 'C', text: '必须使用全局变量' },
        { key: 'D', text: '可以转化为递推时优先考虑栈深' },
      ],
      answer: ['A', 'B'],
    },
  }),
  q({
    id: 'q-cs-4',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-ptr'],
    title: '数组越界填空',
    stem: '访问长度为 n 的数组时，合法下标范围是 ____ 到 ____。',
    primitive: 'blank',
    typeName: '填空',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 1,
    score: 2,
    exposure: 4,
    source: '教材配套',
    typePackVersion: 'blank@1.0',
    content: { answers: ['0', 'n-1'] },
  }),
  q({
    id: 'q-cs-5',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-fn'],
    title: '递归与栈',
    stem: '简述递归调用时系统栈中保存了哪些信息，并说明栈溢出的常见原因。',
    primitive: 'text',
    typeName: '简答',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 3,
    score: 8,
    exposure: 1,
    source: '2025 期中',
    typePackVersion: 'text@1.0',
    content: {
      minWords: 80,
      reference: '返回地址、局部变量、参数；无出口或规模不减会导致溢出。',
      rubric: ['写出栈帧内容', '指出溢出原因', '表述清楚'],
    },
  }),
  q({
    id: 'q-cs-6',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-dp'],
    title: '最大子段和',
    stem: '给定整数序列，求最大连续子段和。输入第一行 n，第二行 n 个整数。',
    primitive: 'code',
    typeName: '程序设计',
    channel: 'cbt',
    status: 'official',
    layer: 'official',
    difficulty: 4,
    score: 20,
    exposure: 2,
    source: 'OJ 改编',
    typePackVersion: 'code@1.1',
    content: { codeLang: 'C', reference: 'Kadane 算法 O(n)' },
  }),
  q({
    id: 'q-cs-7',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-comp'],
    title: '复杂度配对',
    stem: '将算法与其平均时间复杂度配对。',
    primitive: 'match',
    typeName: '配对',
    channel: 'both',
    status: 'official',
    layer: 'course',
    difficulty: 2,
    score: 4,
    exposure: 0,
    source: '新建',
    typePackVersion: 'match@1.0',
    content: {
      pairs: [
        { left: '二分查找', right: 'O(log n)' },
        { left: '快速排序平均', right: 'O(n log n)' },
        { left: '朴素矩阵相乘', right: 'O(n³)' },
      ],
    },
  }),
  q({
    id: 'q-cs-8',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-algo'],
    title: '流程图补全',
    stem: '在所给流程图空白处补全判断条件与循环体（纸笔作图）。',
    primitive: 'drawing',
    typeName: '作图',
    channel: 'paper',
    status: 'official',
    layer: 'official',
    difficulty: 3,
    score: 6,
    exposure: 1,
    source: '期末卷',
    typePackVersion: 'drawing@1.0',
    content: { reference: '判断 i<n，循环体累加' },
  }),
  q({
    id: 'q-ds-1',
    courseId: 'cou-cs201',
    knowledgeIds: ['k-ds-stack'],
    title: '栈的特点',
    stem: '栈的操作特性是？',
    primitive: 'choice',
    typeName: '单项选择',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 1,
    score: 2,
    exposure: 6,
    source: '2023 期末',
    typePackVersion: 'choice@1.0',
    content: {
      options: [
        { key: 'A', text: '先进先出' },
        { key: 'B', text: '后进先出' },
        { key: 'C', text: '随机访问' },
        { key: 'D', text: '只能中间插入' },
      ],
      answer: 'B',
    },
  }),
  q({
    id: 'q-ds-2',
    courseId: 'cou-cs201',
    knowledgeIds: ['k-ds-tree'],
    title: '二叉树性质',
    stem: '具有 n 个结点的完全二叉树的高度（根为第 1 层）是 ____。',
    primitive: 'blank',
    typeName: '填空',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 3,
    score: 2,
    exposure: 2,
    source: '严蔚敏习题',
    typePackVersion: 'blank@1.0',
    content: { answers: ['⌊log2 n⌋+1'] },
  }),
  q({
    id: 'q-ds-3',
    courseId: 'cou-cs201',
    knowledgeIds: ['k-ds-tree'],
    title: '层序遍历编程',
    stem: '实现二叉树层序遍历，按层输出结点值。',
    primitive: 'code',
    typeName: '程序设计',
    channel: 'cbt',
    status: 'official',
    layer: 'official',
    difficulty: 3,
    score: 15,
    exposure: 1,
    source: '实验项目',
    typePackVersion: 'code@1.1',
    content: { codeLang: 'C++', reference: '队列实现 BFS' },
  }),
  q({
    id: 'q-ds-4',
    courseId: 'cou-cs201',
    knowledgeIds: ['k-ds-linear'],
    title: '链表与数组对比',
    stem: '从存储结构、插入删除、随机访问三个方面比较顺序表与单链表。',
    primitive: 'text',
    typeName: '论述',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 3,
    score: 10,
    exposure: 2,
    source: '教研室',
    typePackVersion: 'text@1.0',
    content: {
      minWords: 120,
      rubric: ['存储对比', '插入删除', '随机访问'],
    },
  }),
  q({
    id: 'q-en-1',
    courseId: 'cou-eng101',
    knowledgeIds: ['k-eng-listen'],
    title: 'Campus announcement',
    stem: '听录音，选择图书馆周末开放时间。',
    primitive: 'passage',
    typeName: '听力理解',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 2,
    score: 8,
    exposure: 2,
    source: '四级改编',
    typePackVersion: 'passage@1.0',
    content: {
      material: '听力材料：校园广播通知图书馆周末开放安排。',
      mediaLabel: 'listening-campus.mp3',
      children: [
        {
          id: 'q-en-1a',
          primitive: 'choice',
          stem: '周六开放时间是？',
          content: {
            options: [
              { key: 'A', text: '8:00–16:00' },
              { key: 'B', text: '9:00–17:00' },
              { key: 'C', text: '10:00–18:00' },
            ],
            answer: 'B',
          },
        },
        {
          id: 'q-en-1b',
          primitive: 'blank',
          stem: '闭馆前 ____ 分钟停止入馆。',
          content: { answers: ['15'] },
        },
      ],
    },
  }),
  q({
    id: 'q-en-2',
    courseId: 'cou-eng101',
    knowledgeIds: ['k-eng-read'],
    title: 'Climate passage',
    stem: '阅读短文并完成小题。',
    primitive: 'passage',
    typeName: '阅读理解',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 3,
    score: 10,
    exposure: 1,
    source: '专四模拟',
    typePackVersion: 'passage@1.0',
    content: {
      material:
        'Cities are testing cooler pavements and street trees to reduce heat-island effects. Researchers note that community engagement determines whether such projects last.',
      children: [
        {
          id: 'q-en-2a',
          primitive: 'choice',
          stem: 'The main purpose of cooler pavements is to ____.',
          content: {
            options: [
              { key: 'A', text: 'cut traffic' },
              { key: 'B', text: 'reduce urban heat' },
              { key: 'C', text: 'collect rain' },
            ],
            answer: 'B',
          },
        },
        {
          id: 'q-en-2b',
          primitive: 'text',
          stem: '用一句话概括社区参与的作用。',
          content: { minWords: 20 },
        },
      ],
    },
  }),
  q({
    id: 'q-en-3',
    courseId: 'cou-eng101',
    knowledgeIds: ['k-eng-write'],
    title: 'Campus waste essay',
    stem: 'Write an essay of at least 120 words on reducing food waste on campus.',
    primitive: 'text',
    typeName: '写作',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 3,
    score: 15,
    exposure: 0,
    source: '学期作文库',
    typePackVersion: 'text@1.0',
    content: {
      minWords: 120,
      rubric: ['立场清楚', '例证', '结构', '语言'],
    },
  }),
  q({
    id: 'q-en-4',
    courseId: 'cou-eng101',
    knowledgeIds: ['k-eng-write'],
    title: '口语陈述',
    stem: '就“是否应强制晚自习”录制 90 秒陈述。',
    primitive: 'media',
    typeName: '口语',
    channel: 'cbt',
    status: 'official',
    layer: 'official',
    difficulty: 3,
    score: 10,
    exposure: 1,
    source: '口语题库',
    typePackVersion: 'media@1.0',
    content: {
      mediaLabel: '学生录音',
      rubric: ['流利', '论证', '语音'],
    },
  }),
  q({
    id: 'q-med-1',
    courseId: 'cou-med201',
    knowledgeIds: ['k-med-ask'],
    title: '胸痛问诊',
    stem: '男性 56 岁，突发胸骨后压榨性疼痛 2 小时。下列问诊最优先的是？',
    primitive: 'choice',
    typeName: '最佳选择',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 3,
    score: 2,
    exposure: 3,
    source: '执业医师改编',
    typePackVersion: 'choice@1.0',
    content: {
      options: [
        { key: 'A', text: '是否放射至左肩' },
        { key: 'B', text: '童年疫苗史' },
        { key: 'C', text: '职业噪声接触' },
        { key: 'D', text: '饮食口味' },
      ],
      answer: 'A',
    },
  }),
  q({
    id: 'q-med-2',
    courseId: 'cou-med201',
    knowledgeIds: ['k-med-case'],
    title: '胸痛病例',
    stem: '根据主诉与检查完成下列小题。',
    primitive: 'passage',
    typeName: '病例分析',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 4,
    score: 12,
    exposure: 1,
    source: '临床思维训练',
    typePackVersion: 'passage@1.0',
    content: {
      material:
        '患者男，56 岁。突发胸骨后压榨痛 2 小时，伴出汗。BP 90/60 mmHg，双肺无啰音。心电图示 II、III、aVF ST 抬高。',
      children: [
        {
          id: 'q-med-2a',
          primitive: 'blank',
          stem: '最可能的诊断是 ____。',
          content: { answers: ['急性下壁心肌梗死'] },
        },
        {
          id: 'q-med-2b',
          primitive: 'text',
          stem: '列出下一步处理要点（至少 3 条）。',
          content: {
            rubric: ['再灌注', '抗凝抗板', '监护'],
          },
        },
      ],
    },
  }),
  q({
    id: 'q-med-3',
    courseId: 'cou-med201',
    knowledgeIds: ['k-med-img'],
    title: '胸部影像定位',
    stem: '在胸片上标出可能的实变区域并简述依据。',
    primitive: 'annotate',
    typeName: '读片标注',
    channel: 'cbt',
    status: 'official',
    layer: 'official',
    difficulty: 4,
    score: 8,
    exposure: 0,
    source: '影像教研室',
    typePackVersion: 'annotate@0.9',
    content: {
      mediaLabel: 'chest-xray-demo.png',
      rubric: ['定位准确', '描述形态'],
    },
  }),
  q({
    id: 'q-med-4',
    courseId: 'cou-med201',
    knowledgeIds: ['k-med-ask'],
    title: '标准化病人站点',
    stem: 'OSCE：胸痛问诊 8 分钟。考官按量规现场打分。',
    primitive: 'rubric',
    typeName: 'OSCE 站点',
    channel: 'paper',
    status: 'official',
    layer: 'official',
    difficulty: 4,
    score: 20,
    exposure: 1,
    source: '临床技能中心',
    typePackVersion: 'rubric@1.0',
    content: {
      rubric: ['自我介绍', '主诉', '现病史', '共情', '总结'],
    },
  }),
  q({
    id: 'q-cs-9',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-comp'],
    title: '复杂度草稿题',
    stem: '请判断：哈希表平均查找时间是常数级。',
    primitive: 'choice',
    typeName: '判断选择',
    channel: 'both',
    status: 'draft',
    layer: 'draft',
    difficulty: 1,
    score: 2,
    exposure: 0,
    source: '个人草稿',
    typePackVersion: 'choice@1.0',
    content: {
      options: [
        { key: 'A', text: '正确' },
        { key: 'B', text: '错误' },
      ],
      answer: 'A',
    },
  }),
  q({
    id: 'q-cs-10',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-fn'],
    title: '函数参数传递',
    stem: 'C 语言默认的参数传递方式是？',
    primitive: 'choice',
    typeName: '单项选择',
    channel: 'both',
    status: 'review',
    layer: 'course',
    difficulty: 2,
    score: 2,
    exposure: 0,
    source: '待审',
    typePackVersion: 'choice@1.0',
    content: {
      options: [
        { key: 'A', text: '传值' },
        { key: 'B', text: '传名' },
        { key: 'C', text: '一律传引用' },
      ],
      answer: 'A',
    },
  }),
  q({
    id: 'q-cs-11',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-comp'],
    title: '运行时间换算',
    stem: '某算法完成 2,000,000 次基本操作，每次耗时 0.5 μs，计算总耗时。',
    primitive: 'numeric',
    typeName: '数值与单位',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 2,
    score: 4,
    exposure: 0,
    source: '双渠道验收题',
    typePackVersion: 'numeric@1.0',
    content: {
      allowedUnits: ['s', '秒'],
      numericAnswer: 1,
      tolerance: 0.01,
      unit: 's',
    },
  }),
  q({
    id: 'q-cs-12',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-algo'],
    title: '算法分析报告',
    stem: '上传 PDF 格式的算法复杂度分析报告，文件不超过 20 MB。',
    primitive: 'file',
    typeName: '文件作品',
    channel: 'cbt',
    status: 'official',
    layer: 'official',
    difficulty: 3,
    score: 10,
    exposure: 0,
    source: '双渠道验收题',
    typePackVersion: 'file@1.0',
    content: {
      allowedFileTypes: ['application/pdf'],
      maxFileSizeMb: 20,
      rubric: ['论证正确', '结构清晰', '引用规范'],
    },
  }),
  q({
    id: 'q-cs-13',
    courseId: 'cou-cs101',
    knowledgeIds: ['k-cs-algo'],
    title: '算法讲解现场量规',
    stem: '考生现场讲解所选算法，考官依据量规记录证据并评分。',
    primitive: 'rubric',
    typeName: '现场量规',
    channel: 'both',
    status: 'official',
    layer: 'official',
    difficulty: 3,
    score: 10,
    exposure: 0,
    source: '双渠道验收题',
    typePackVersion: 'rubric@1.0',
    content: {
      rubric: ['概念准确', '推理完整', '表达清晰'],
    },
  }),
];

const seedBlueprints: PaperBlueprint[] = [
  {
    id: 'bp-cs-final',
    name: '程序设计基础 · 期末理论+机试',
    courseId: 'cou-cs101',
    duration: 120,
    totalScore: 100,
    channel: 'both',
    layoutCbtId: 'lay-cbt-scroll',
    layoutPaperId: 'lay-paper-classic',
    layoutSheetId: 'lay-sheet-omr',
    sections: [
      {
        id: 'sec-1',
        name: '一、选择题',
        rules: [
          {
            id: 'r1',
            primitive: 'choice',
            count: 3,
            score: 2,
            difficulty: 2,
          },
        ],
      },
      {
        id: 'sec-2',
        name: '二、填空题',
        rules: [{ id: 'r2', primitive: 'blank', count: 1, score: 2 }],
      },
      {
        id: 'sec-3',
        name: '三、简答与作图',
        rules: [
          { id: 'r3', primitive: 'text', count: 1, score: 8 },
          { id: 'r4', primitive: 'drawing', count: 1, score: 6 },
        ],
      },
      {
        id: 'sec-4',
        name: '四、程序设计（机考）',
        rules: [{ id: 'r5', primitive: 'code', count: 1, score: 20 }],
      },
    ],
  },
  {
    id: 'bp-eng-mid',
    name: '大学英语 · 期中',
    courseId: 'cou-eng101',
    duration: 90,
    totalScore: 100,
    channel: 'both',
    layoutCbtId: 'lay-cbt-split',
    layoutPaperId: 'lay-paper-english',
    layoutSheetId: 'lay-sheet-omr',
    sections: [
      {
        id: 'sec-l',
        name: 'Listening',
        rules: [{ id: 'r-l', knowledgeId: 'k-eng-listen', count: 1, score: 8 }],
      },
      {
        id: 'sec-r',
        name: 'Reading',
        rules: [{ id: 'r-r', knowledgeId: 'k-eng-read', count: 1, score: 10 }],
      },
      {
        id: 'sec-w',
        name: 'Writing',
        rules: [{ id: 'r-w', primitive: 'text', count: 1, score: 15 }],
      },
    ],
  },
  {
    id: 'bp-universal-demo',
    name: '通用交互 · 双渠道验收卷',
    courseId: 'cou-cs101',
    duration: 60,
    totalScore: 36,
    channel: 'both',
    layoutCbtId: 'lay-cbt-one',
    layoutPaperId: 'lay-paper-classic',
    layoutSheetId: 'lay-sheet-rubric',
    sections: [
      {
        id: 'sec-demo-auto',
        name: '一、自动评分交互',
        rules: [
          { id: 'r-demo-choice', primitive: 'choice', count: 1, score: 2 },
          { id: 'r-demo-blank', primitive: 'blank', count: 1, score: 2 },
          { id: 'r-demo-numeric', primitive: 'numeric', count: 1, score: 4 },
        ],
      },
      {
        id: 'sec-demo-human',
        name: '二、人工评分交互',
        rules: [
          { id: 'r-demo-text', primitive: 'text', count: 1, score: 8 },
          { id: 'r-demo-file', primitive: 'file', count: 1, score: 10 },
          { id: 'r-demo-rubric', primitive: 'rubric', count: 1, score: 10 },
        ],
      },
    ],
  },
];

const seedLayouts: LayoutTemplate[] = [
  {
    id: 'lay-cbt-scroll',
    kind: 'cbt',
    name: '整卷滚动',
    remark: '一屏连续作答，适合理论课',
  },
  {
    id: 'lay-cbt-one',
    kind: 'cbt',
    name: '一题一页',
    remark: '带题号导航和标记',
  },
  {
    id: 'lay-cbt-split',
    kind: 'cbt',
    name: '左材料右题',
    remark: '阅读 / 听力 / 病例',
  },
  {
    id: 'lay-paper-classic',
    kind: 'paper',
    name: '经典理科卷',
    remark: '密封线、通栏、计算留白',
  },
  {
    id: 'lay-paper-english',
    kind: 'paper',
    name: '外语卷',
    remark: '听力须知 + 阅读先材料后题',
  },
  {
    id: 'lay-paper-wide',
    kind: 'paper',
    name: '大幅作图卷',
    remark: '作图区单独占页',
  },
  {
    id: 'lay-sheet-omr',
    kind: 'sheet',
    name: '客观 OMR + 主观框',
    remark: '场次码、座位码、题号框',
  },
  {
    id: 'lay-sheet-rubric',
    kind: 'sheet',
    name: '现场量规表',
    remark: 'OSCE / 术科评委用',
  },
];

export const bankStore = reactive({
  basket: [] as string[],
  blueprints: clonePlain(seedBlueprints),
  courses: clonePlain(courses),
  itemRevisions: [] as ItemRevision[],
  knowledge: clonePlain(knowledge),
  lastPaperId: 'paper-cs-a',
  layouts: clonePlain(seedLayouts),
  papers: [] as AssembledPaper[],
  questions: clonePlain(seedQuestions),
  testFormRevisions: [] as TestFormRevision[],
});

function knowledgeName(id: string) {
  return bankStore.knowledge.find((item) => item.id === id)?.name || id;
}

export function getCourse(id: string) {
  return bankStore.courses.find((item) => item.id === id);
}

export function getQuestion(id: string) {
  return bankStore.questions.find((item) => item.id === id);
}

export function getBlueprint(id: string) {
  return bankStore.blueprints.find((item) => item.id === id);
}

export function getPaper(id: string) {
  return bankStore.papers.find((item) => item.id === id);
}

export function getLayout(id: string) {
  return bankStore.layouts.find((item) => item.id === id);
}

export function getItemRevision(revisionId: string) {
  return bankStore.itemRevisions.find((item) => item.revisionId === revisionId);
}

export function getTestFormRevision(revisionId: string) {
  return bankStore.testFormRevisions.find(
    (item) => item.revisionId === revisionId,
  );
}

export function publishItemRevision(
  questionId: string,
  options: {
    actorId?: string;
    status?: RevisionStatus;
    tenantId?: string;
  } = {},
) {
  const question = getQuestion(questionId);
  if (!question) throw new Error('题目不存在');
  const tenantId = options.tenantId ?? tenantContext.activeTenantId;
  const existing = bankStore.itemRevisions.filter(
    (item) => item.itemId === questionId && item.tenantId === tenantId,
  );
  const checksum = integrityChecksum(question);
  const unchanged = existing.find((item) => item.checksum === checksum);
  if (unchanged) return unchanged;
  const revision = createItemRevision(question, {
    createdBy: options.actorId ?? 'local-author',
    revision: Math.max(0, ...existing.map((item) => item.revision)) + 1,
    status: options.status,
    tenantId,
  });
  bankStore.itemRevisions.push(revision);
  appendAudit({
    action: 'item.revision.published',
    actorId: options.actorId,
    metadata: {
      checksum: revision.checksum,
      revision: revision.revision,
    },
    resourceId: revision.revisionId,
    resourceType: 'item-revision',
    tenantId,
  });
  return revision;
}

export function freezePaper(
  paperId: string,
  options: {
    actorId?: string;
    tenantId?: string;
  } = {},
) {
  const paper = getPaper(paperId);
  if (!paper) throw new Error('试卷不存在');
  const tenantId = options.tenantId ?? tenantContext.activeTenantId;
  const itemRevisionIds = paper.sections.flatMap((section) =>
    section.items.map(
      (item) =>
        publishItemRevision(item.questionId, {
          actorId: options.actorId,
          tenantId,
        }).revisionId,
    ),
  );
  const issues = validatePaperCompatibility(paper);
  const existing = bankStore.testFormRevisions.filter(
    (item) => item.paperId === paperId && item.tenantId === tenantId,
  );
  const revision = createTestFormRevision(paper, itemRevisionIds, issues, {
    frozenBy: options.actorId ?? 'local-paper-editor',
    revision: Math.max(0, ...existing.map((item) => item.revision)) + 1,
    tenantId,
  });
  const unchanged = existing.find(
    (item) => item.checksum === revision.checksum,
  );
  if (unchanged) return unchanged;
  bankStore.testFormRevisions.push(revision);
  appendAudit({
    action: 'paper.revision.sealed',
    actorId: options.actorId,
    metadata: {
      blockingIssues: issues.filter((issue) => issue.blocking).length,
      checksum: revision.checksum,
      revision: revision.revision,
    },
    resourceId: revision.revisionId,
    resourceType: 'test-form-revision',
    tenantId,
  });
  return revision;
}

export function knowledgePath(ids: string[]) {
  return ids.map((id) => knowledgeName(id)).join(' / ');
}

export function knowledgeTreeData(courseId: string) {
  const nodes = bankStore.knowledge.filter(
    (item) => item.courseId === courseId,
  );
  const walk = (parentId: null | string): any[] =>
    nodes
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        key: item.id,
        title: `${item.name}（${countByKnowledge(item.id)}）`,
        children: walk(item.id),
      }));
  return [
    {
      key: 'all',
      title: `全部题目（${bankStore.questions.filter((item) => item.courseId === courseId).length}）`,
      children: walk(null),
    },
  ];
}

function countByKnowledge(id: string) {
  const ids = collectDescendants(id);
  return bankStore.questions.filter((item) =>
    item.knowledgeIds.some((kid) => ids.has(kid)),
  ).length;
}

export function collectDescendants(id: string) {
  const set = new Set<string>([id]);
  const walk = (parent: string) => {
    bankStore.knowledge
      .filter((item) => item.parentId === parent)
      .forEach((child) => {
        set.add(child.id);
        walk(child.id);
      });
  };
  walk(id);
  return set;
}

export function listQuestions(filter: QuestionFilter = {}) {
  return bankStore.questions.filter((item) => {
    if (filter.courseId && item.courseId !== filter.courseId) return false;
    if (filter.knowledgeId && filter.knowledgeId !== 'all') {
      const ids = collectDescendants(filter.knowledgeId);
      if (!item.knowledgeIds.some((kid) => ids.has(kid))) return false;
    }
    if (filter.primitive && item.primitive !== filter.primitive) return false;
    if (filter.channel && item.channel !== filter.channel) return false;
    if (filter.status && item.status !== filter.status) return false;
    if (filter.layer && item.layer !== filter.layer) return false;
    const keyword = String(filter.keyword || '')
      .trim()
      .toLowerCase();
    if (keyword) {
      const hay = `${item.title} ${item.stem} ${item.id}`.toLowerCase();
      if (!hay.includes(keyword)) return false;
    }
    return true;
  });
}

export function saveQuestion(payload: BankQuestion) {
  const index = bankStore.questions.findIndex((item) => item.id === payload.id);
  if (index === -1) {
    bankStore.questions.unshift(clonePlain(payload));
  } else {
    bankStore.questions[index] = clonePlain(payload);
  }
  return payload;
}

export function createBlankQuestion(courseId: string): BankQuestion {
  return {
    id: uid('q'),
    courseId,
    knowledgeIds: [],
    title: '',
    stem: '',
    primitive: 'choice',
    typeName: '单项选择',
    channel: 'both',
    status: 'draft',
    layer: 'draft',
    difficulty: 2,
    score: 2,
    exposure: 0,
    source: '手工录入',
    typePackVersion: 'choice@1.0',
    content: {
      options: [
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' },
      ],
      answer: 'A',
    },
  };
}

export function removeQuestion(id: string) {
  bankStore.questions = bankStore.questions.filter((item) => item.id !== id);
  bankStore.basket = bankStore.basket.filter((item) => item !== id);
}

export function toggleBasket(id: string) {
  const index = bankStore.basket.indexOf(id);
  if (index === -1) {
    bankStore.basket.push(id);
  } else {
    bankStore.basket.splice(index, 1);
  }
}

export function addKnowledge(
  node: Omit<KnowledgeNode, 'id'> & { id?: string },
) {
  const item: KnowledgeNode = {
    id: node.id || uid('k'),
    courseId: node.courseId,
    parentId: node.parentId,
    name: node.name,
  };
  bankStore.knowledge.push(item);
  return item;
}

export function updateKnowledge(id: string, name: string) {
  const node = bankStore.knowledge.find((item) => item.id === id);
  if (node) node.name = name;
}

export function removeKnowledge(id: string) {
  const ids = collectDescendants(id);
  bankStore.knowledge = bankStore.knowledge.filter((item) => !ids.has(item.id));
  bankStore.questions.forEach((question) => {
    question.knowledgeIds = question.knowledgeIds.filter(
      (kid) => !ids.has(kid),
    );
  });
}

export function saveBlueprint(payload: PaperBlueprint) {
  const index = bankStore.blueprints.findIndex(
    (item) => item.id === payload.id,
  );
  if (index === -1) {
    bankStore.blueprints.unshift(clonePlain(payload));
  } else {
    bankStore.blueprints[index] = clonePlain(payload);
  }
  return payload;
}

export function createBlueprint(courseId: string): PaperBlueprint {
  return {
    id: uid('bp'),
    name: '未命名蓝图',
    courseId,
    duration: 90,
    totalScore: 100,
    channel: 'both',
    layoutCbtId: 'lay-cbt-scroll',
    layoutPaperId: 'lay-paper-classic',
    layoutSheetId: 'lay-sheet-omr',
    sections: [
      {
        id: uid('sec'),
        name: '一、选择题',
        rules: [{ id: uid('r'), primitive: 'choice', count: 5, score: 2 }],
      },
    ],
  };
}

function shuffle<T>(list: T[], seed: number) {
  const copy = [...list];
  let current = seed;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    current = (current * 9301 + 49_297) % 233_280;
    const j = current % (i + 1);
    const left = copy[i];
    const right = copy[j];
    if (left === undefined || right === undefined) continue;
    copy[i] = right;
    copy[j] = left;
  }
  return copy;
}

function matchRule(
  question: BankQuestion,
  blueprint: PaperBlueprint,
  rule: PaperBlueprint['sections'][number]['rules'][number],
) {
  if (question.courseId !== blueprint.courseId) return false;
  if (question.status !== 'official') return false;
  if (
    blueprint.channel !== 'both' &&
    question.channel !== 'both' &&
    question.channel !== blueprint.channel
  )
    return false;
  if (rule.primitive && question.primitive !== rule.primitive) return false;
  if (rule.difficulty && question.difficulty !== rule.difficulty) return false;
  if (rule.knowledgeId) {
    const ids = collectDescendants(rule.knowledgeId);
    if (!question.knowledgeIds.some((kid) => ids.has(kid))) return false;
  }
  return true;
}

export function assembleBlueprint(
  blueprintId: string,
  variant: 'A' | 'B' = 'A',
) {
  const blueprint = getBlueprint(blueprintId);
  if (!blueprint) throw new Error('蓝图不存在');
  const used = new Set<string>();
  const gaps: string[] = [];
  const seed = variant === 'A' ? 17 : 91;
  const sections = blueprint.sections.map((section) => {
    const items: PaperItem[] = [];
    section.rules.forEach((rule) => {
      const pool = shuffle(
        bankStore.questions.filter(
          (question) =>
            matchRule(question, blueprint, rule) && !used.has(question.id),
        ),
        seed + rule.id.length,
      ).toSorted((a, b) => a.exposure - b.exposure);
      const picked = pool.slice(0, rule.count);
      picked.forEach((question) => {
        used.add(question.id);
        items.push({
          questionId: question.id,
          score: rule.score,
          snapshot: clonePlain(question),
        });
      });
      if (picked.length < rule.count) {
        gaps.push(
          `${section.name}：需要 ${rule.count} 道，只抽到 ${picked.length} 道（${rule.primitive ? PRIMITIVE_LABEL[rule.primitive] : '不限题型'}）`,
        );
      }
    });
    return { name: section.name, items };
  });
  const paper: AssembledPaper = {
    id: uid('paper'),
    blueprintId: blueprint.id,
    name: `${blueprint.name} · ${variant}卷`,
    courseId: blueprint.courseId,
    duration: blueprint.duration,
    totalScore: blueprint.totalScore,
    channel: blueprint.channel,
    layoutCbtId: blueprint.layoutCbtId,
    layoutPaperId: blueprint.layoutPaperId,
    layoutSheetId: blueprint.layoutSheetId,
    variant,
    gaps,
    sections,
  };
  bankStore.papers.unshift(paper);
  bankStore.lastPaperId = paper.id;
  return paper;
}

export function swapPaperItem(paperId: string, questionId: string) {
  const paper = getPaper(paperId);
  if (!paper) return;
  const blueprint = getBlueprint(paper.blueprintId);
  for (const section of paper.sections) {
    const index = section.items.findIndex(
      (item) => item.questionId === questionId,
    );
    if (index === -1) continue;
    const current = section.items[index];
    if (!current) continue;
    const used = new Set(
      paper.sections.flatMap((item) => item.items.map((row) => row.questionId)),
    );
    const candidate = bankStore.questions.find(
      (question) =>
        question.courseId === paper.courseId &&
        question.status === 'official' &&
        question.primitive === current.snapshot.primitive &&
        !used.has(question.id) &&
        (blueprint?.channel === 'both' ||
          question.channel === 'both' ||
          question.channel === paper.channel),
    );
    if (!candidate) return false;
    section.items[index] = {
      questionId: candidate.id,
      score: current.score,
      snapshot: clonePlain(candidate),
    };
    return true;
  }
  return false;
}

export function paperStats(paper: AssembledPaper) {
  const items = paper.sections.flatMap((section) => section.items);
  const score = items.reduce((sum, item) => sum + item.score, 0);
  const byPrimitive: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const byKnowledge: Record<string, number> = {};
  items.forEach((item) => {
    const primitive = PRIMITIVE_LABEL[item.snapshot.primitive];
    byPrimitive[primitive] = (byPrimitive[primitive] || 0) + 1;
    const diff = DIFFICULTY_LABEL[item.snapshot.difficulty];
    byDifficulty[diff] = (byDifficulty[diff] || 0) + 1;
    item.snapshot.knowledgeIds.forEach((kid) => {
      const name = knowledgeName(kid);
      byKnowledge[name] = (byKnowledge[name] || 0) + 1;
    });
  });
  return { count: items.length, score, byPrimitive, byDifficulty, byKnowledge };
}

export function importMockQuestions(courseId: string) {
  const created: BankQuestion[] = [
    createBlankQuestion(courseId),
    createBlankQuestion(courseId),
  ];
  const first = created[0];
  const second = created[1];
  if (!first || !second) return [];
  created[0] = {
    ...first,
    title: '导入：循环结构选择',
    stem: '下列循环至少执行一次的是？',
    status: 'review',
    layer: 'course',
    source: 'Word 导入',
    knowledgeIds: bankStore.knowledge
      .filter((item) => item.courseId === courseId && item.parentId)
      .slice(0, 1)
      .map((item) => item.id),
    content: {
      options: [
        { key: 'A', text: 'for' },
        { key: 'B', text: 'while' },
        { key: 'C', text: 'do-while' },
        { key: 'D', text: 'if' },
      ],
      answer: 'C',
    },
  };
  created[1] = {
    ...second,
    title: '导入：简答题',
    stem: '解释编译与解释的区别。',
    primitive: 'text',
    typeName: '简答',
    status: 'review',
    layer: 'course',
    source: 'Word 导入',
    content: { minWords: 60, rubric: ['概念', '对比'] },
  };
  created.forEach((item) => bankStore.questions.unshift(item));
  return created;
}

export function listCourseOptions() {
  return bankStore.courses.map((item) => ({
    label: `${item.name}（${item.code}）`,
    value: item.id,
  }));
}

function bootstrapDefaultPaper() {
  if (bankStore.papers.length === 0) {
    try {
      assembleBlueprint('bp-cs-final', 'A');
      assembleBlueprint('bp-universal-demo', 'A');
    } catch {
      // ignore
    }
  }
}

bootstrapDefaultPaper();
