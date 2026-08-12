/** 题库 · 组件化题型（可扩展组件注册表） */

export type ComponentType =
  | 'audio_record'
  | 'canvas'
  | 'cloze'
  | 'code_editor'
  | 'file_upload'
  | 'formula'
  | 'group'
  | 'image_hotspot'
  | 'matching'
  | 'media_player'
  | 'option_group'
  | 'rich_stem'
  | 'sorting'
  | 'table_fill'
  | 'template_definition'
  | 'text_input';

export type ComponentCategory = 'answer' | 'media' | 'stem' | 'structure';

export type JudgeMode = 'auto' | 'manual' | 'none';

export type BuilderComponent = {
  /** 嵌套子组件（阅读理解小题、复合题） */
  children?: BuilderComponent[];
  config: Record<string, any>;
  id: string;
  /** 判分方式 */
  judgeMode: JudgeMode;
  label: string;
  /** 本块分值 */
  score: number;
  type: ComponentType;
};

export type QuestionTemplate = {
  components: BuilderComponent[];
  description: string;
  id: string;
  name: string;
  updatedAt: string;
};

export type QuestionItem = {
  components: BuilderComponent[];
  courseId: string;
  courseName: string;
  id: string;
  status: 'draft' | 'published';
  templateId?: string;
  templateName?: string;
  title: string;
  updatedAt: string;
};

export type PaletteItem = {
  category: ComponentCategory;
  defaultConfig: () => Record<string, any>;
  defaultJudgeMode: JudgeMode;
  defaultLabel: string;
  defaultScore: number;
  hint: string;
  icon: string;
  name: string;
  type: ComponentType;
};

export const CATEGORY_LABEL: Record<ComponentCategory, string> = {
  stem: '题干 / 材料',
  answer: '作答交互',
  media: '媒体与标注',
  structure: '结构（嵌套）',
};

/**
 * 组件注册表：新题型 = 往这里加一种组件，而不是改业务表结构。
 * 仍做不到「无限自定义交互」，但覆盖大学常见笔试/机试/实操拼装。
 */
export const COMPONENT_PALETTE: PaletteItem[] = [
  {
    type: 'rich_stem',
    name: '题干内容区',
    hint: '富文本 / 插图 / 拓扑示意图说明',
    icon: 'lucide:file-text',
    category: 'stem',
    defaultLabel: '题干',
    defaultScore: 0,
    defaultJudgeMode: 'none',
    defaultConfig: () => ({
      html: '',
      allowImage: true,
      allowAttachment: true,
    }),
  },
  {
    type: 'media_player',
    name: '音视频播放器',
    hint: '听力材料，可限制播放次数',
    icon: 'lucide:play-circle',
    category: 'stem',
    defaultLabel: '音视频材料',
    defaultScore: 0,
    defaultJudgeMode: 'none',
    defaultConfig: () => ({
      mediaType: 'audio',
      maxPlays: 2,
      url: '',
    }),
  },
  {
    type: 'option_group',
    name: '选项组',
    hint: '单选 / 多选 / 下拉',
    icon: 'lucide:list-checks',
    category: 'answer',
    defaultLabel: '选项组',
    defaultScore: 2,
    defaultJudgeMode: 'auto',
    defaultConfig: () => ({
      mode: 'single',
      options: [
        { key: 'A', text: '选项 A' },
        { key: 'B', text: '选项 B' },
        { key: 'C', text: '选项 C' },
        { key: 'D', text: '选项 D' },
      ],
      answer: ['A'],
    }),
  },
  {
    type: 'text_input',
    name: '文本输入',
    hint: '短文本 / 长文本 / 富文本',
    icon: 'lucide:text-cursor-input',
    category: 'answer',
    defaultLabel: '文本作答',
    defaultScore: 5,
    defaultJudgeMode: 'manual',
    defaultConfig: () => ({
      mode: 'short',
      placeholder: '请输入答案',
      maxLength: 500,
    }),
  },
  {
    type: 'cloze',
    name: '共享选项填空',
    hint: '文章内多个空共用一组选项，可设置干扰项和重复规则',
    icon: 'lucide:panel-top-dashed',
    category: 'answer',
    defaultLabel: '共享选项填空',
    defaultScore: 10,
    defaultJudgeMode: 'auto',
    defaultConfig: () => ({
      passage: '在这里输入文章，并使用 [[1]]、[[2]] 标记空位。',
      blankCount: 10,
      options: Array.from({ length: 10 }, (_, index) => ({
        key: String.fromCodePoint(65 + index),
        text: `选项 ${String.fromCodePoint(65 + index)}`,
      })),
      answers: [],
      reuse: 'once',
      allowDistractors: true,
      scoreStrategy: 'partial',
    }),
  },
  {
    type: 'code_editor',
    name: '代码编辑器',
    hint: 'C / Python / Java / SQL / HTML',
    icon: 'lucide:code-2',
    category: 'answer',
    defaultLabel: '编程作答',
    defaultScore: 15,
    defaultJudgeMode: 'auto',
    defaultConfig: () => ({
      languages: ['python', 'c', 'java'],
      defaultLanguage: 'python',
      starterCode: '',
      testCases: '',
    }),
  },
  {
    type: 'canvas',
    name: '画布区',
    hint: '绘图 / 连线 / 框图 / 电路 / 网络拓扑',
    icon: 'lucide:pen-tool',
    category: 'answer',
    defaultLabel: '画布作答',
    defaultScore: 10,
    defaultJudgeMode: 'manual',
    defaultConfig: () => ({
      mode: 'topology',
      backgroundImage: '',
      tools: ['line', 'node', 'text'],
    }),
  },
  {
    type: 'formula',
    name: '公式输入区',
    hint: 'LaTeX 数学公式',
    icon: 'lucide:sigma',
    category: 'answer',
    defaultLabel: '公式作答',
    defaultScore: 5,
    defaultJudgeMode: 'auto',
    defaultConfig: () => ({
      engine: 'latex',
      placeholder: '输入公式',
    }),
  },
  {
    type: 'matching',
    name: '连线匹配',
    hint: '左右项配对（词汇/概念匹配）',
    icon: 'lucide:git-compare',
    category: 'answer',
    defaultLabel: '连线匹配',
    defaultScore: 5,
    defaultJudgeMode: 'auto',
    defaultConfig: () => ({
      left: ['左1', '左2', '左3'],
      right: ['右A', '右B', '右C'],
      answer: { 0: 0, 1: 1, 2: 2 },
    }),
  },
  {
    type: 'sorting',
    name: '排序题',
    hint: '拖拽排序 / 步骤排序',
    icon: 'lucide:arrow-up-down',
    category: 'answer',
    defaultLabel: '排序作答',
    defaultScore: 4,
    defaultJudgeMode: 'auto',
    defaultConfig: () => ({
      items: ['步骤一', '步骤二', '步骤三', '步骤四'],
      answerOrder: [0, 1, 2, 3],
    }),
  },
  {
    type: 'table_fill',
    name: '表格填写区',
    hint: '可编辑表格 / 填空矩阵',
    icon: 'lucide:table',
    category: 'answer',
    defaultLabel: '表格填写',
    defaultScore: 6,
    defaultJudgeMode: 'manual',
    defaultConfig: () => ({
      rows: 3,
      cols: 3,
      headers: ['列1', '列2', '列3'],
    }),
  },
  {
    type: 'audio_record',
    name: '口语录音',
    hint: '学生录音作答（英语口语等）',
    icon: 'lucide:mic',
    category: 'answer',
    defaultLabel: '口语录音',
    defaultScore: 10,
    defaultJudgeMode: 'manual',
    defaultConfig: () => ({
      maxSeconds: 120,
      tip: '请开始录音作答',
    }),
  },
  {
    type: 'image_hotspot',
    name: '图片标注区',
    hint: '热区点击 / 描点标注',
    icon: 'lucide:image',
    category: 'media',
    defaultLabel: '图片标注',
    defaultScore: 4,
    defaultJudgeMode: 'auto',
    defaultConfig: () => ({
      imageUrl: '',
      hotspots: [],
      mode: 'click',
    }),
  },
  {
    type: 'file_upload',
    name: '文件上传区',
    hint: '作品 / 报告 / 压缩包提交',
    icon: 'lucide:upload',
    category: 'media',
    defaultLabel: '附件上传',
    defaultScore: 10,
    defaultJudgeMode: 'manual',
    defaultConfig: () => ({
      accept: '.pdf,.doc,.docx,.zip,.png,.jpg',
      maxCount: 3,
      maxSizeMb: 20,
    }),
  },
  {
    type: 'group',
    name: '小题容器',
    hint: '阅读理解/材料题：下面可再嵌套多个子组件',
    icon: 'lucide:boxes',
    category: 'structure',
    defaultLabel: '材料小题组',
    defaultScore: 0,
    defaultJudgeMode: 'none',
    defaultConfig: () => ({
      sharedStem: true,
    }),
  },
];

export const COURSE_OPTIONS = [
  { label: '大学英语（一）', value: 'eng1' },
  { label: '计算机网络', value: 'net' },
  { label: '数据结构', value: 'ds' },
  { label: '高等数学 A', value: 'math' },
];

export function uid(prefix = 'c') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createComponent(type: ComponentType): BuilderComponent {
  const meta = COMPONENT_PALETTE.find((item) => item.type === type);
  if (!meta) throw new Error(`未知组件: ${type}`);
  return {
    id: uid('cmp'),
    type,
    label: meta.defaultLabel,
    score: meta.defaultScore,
    judgeMode: meta.defaultJudgeMode,
    config: meta.defaultConfig(),
    children: type === 'group' ? [] : undefined,
  };
}

export function paletteMeta(type: ComponentType) {
  return COMPONENT_PALETTE.find((item) => item.type === type);
}

export function paletteByCategory() {
  const order: ComponentCategory[] = ['stem', 'answer', 'media', 'structure'];
  return order.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    items: COMPONENT_PALETTE.filter((item) => item.category === category),
  }));
}

export const INITIAL_TEMPLATES: QuestionTemplate[] = [
  {
    id: 'tpl_reading',
    name: '阅读理解',
    description: '材料题干 + 小题容器（内含多道单选）',
    updatedAt: '2026-08-12',
    components: [
      {
        id: 'c1',
        type: 'rich_stem',
        label: '阅读材料',
        score: 0,
        judgeMode: 'none',
        config: {
          html: '在此粘贴英文文章，可插入配图。',
          allowImage: true,
          allowAttachment: true,
        },
      },
      {
        id: 'c2',
        type: 'group',
        label: '阅读小题',
        score: 0,
        judgeMode: 'none',
        config: { sharedStem: true },
        children: [
          {
            id: 'c2a',
            type: 'option_group',
            label: '小题 1',
            score: 2,
            judgeMode: 'auto',
            config: {
              mode: 'single',
              options: [
                { key: 'A', text: '选项 A' },
                { key: 'B', text: '选项 B' },
                { key: 'C', text: '选项 C' },
                { key: 'D', text: '选项 D' },
              ],
              answer: ['A'],
            },
          },
          {
            id: 'c2b',
            type: 'option_group',
            label: '小题 2',
            score: 2,
            judgeMode: 'auto',
            config: {
              mode: 'single',
              options: [
                { key: 'A', text: '选项 A' },
                { key: 'B', text: '选项 B' },
                { key: 'C', text: '选项 C' },
                { key: 'D', text: '选项 D' },
              ],
              answer: ['B'],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'tpl_topology',
    name: '网络拓扑连线',
    description: '说明 + 拓扑画布',
    updatedAt: '2026-08-12',
    components: [
      {
        id: 'c1',
        type: 'rich_stem',
        label: '题目说明',
        score: 0,
        judgeMode: 'none',
        config: {
          html: '根据拓扑要求，在画布上完成设备连线。',
          allowImage: true,
          allowAttachment: true,
        },
      },
      {
        id: 'c2',
        type: 'canvas',
        label: '拓扑连线区',
        score: 10,
        judgeMode: 'manual',
        config: {
          mode: 'topology',
          backgroundImage: '',
          tools: ['line', 'node', 'text'],
        },
      },
    ],
  },
  {
    id: 'tpl_coding',
    name: '编程题',
    description: '题干 + 代码编辑器',
    updatedAt: '2026-08-12',
    components: [
      {
        id: 'c1',
        type: 'rich_stem',
        label: '题目描述',
        score: 0,
        judgeMode: 'none',
        config: {
          html: '请实现指定算法。',
          allowImage: true,
          allowAttachment: false,
        },
      },
      {
        id: 'c2',
        type: 'code_editor',
        label: '代码作答',
        score: 15,
        judgeMode: 'auto',
        config: {
          languages: ['python', 'c', 'java'],
          defaultLanguage: 'python',
          starterCode: '',
          testCases: '',
        },
      },
    ],
  },
];

export const INITIAL_QUESTIONS: QuestionItem[] = [
  {
    id: 'q_demo_1',
    courseId: 'net',
    courseName: '计算机网络',
    title: '三层交换机与路由器互联拓扑',
    templateId: 'tpl_topology',
    templateName: '网络拓扑连线',
    status: 'draft',
    updatedAt: '2026-08-12',
    components: structuredClone(
      INITIAL_TEMPLATES.find((t) => t.id === 'tpl_topology')?.components || [],
    ),
  },
];
