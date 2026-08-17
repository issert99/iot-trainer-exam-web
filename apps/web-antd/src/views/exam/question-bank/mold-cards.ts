/**
 * 题型模板「空题模具」常用结构（全专业）
 */
import type { TemplateDocument } from './template-document';

import {
  createChoiceNode,
  createCodeNode,
  createDefaultMeta,
  createDefaultStyle,
  createEmptyTemplateDocument,
  createGroupNode,
  createInputNode,
  createMediaNode,
  createPassageNode,
  createPoolNode,
  createTextNode,
  L,
} from './template-document';

export type MoldCard = {
  build: () => TemplateDocument;
  desc: string;
  /** Iconify 图标，卡片视觉区分 */
  icon: string;
  id: string;
  title: string;
};

function wrap(
  title: string,
  nodes: TemplateDocument['nodes'],
): TemplateDocument {
  const doc = createEmptyTemplateDocument();
  doc.meta = createDefaultMeta({ title });
  doc.style = createDefaultStyle();
  doc.role = 'template';
  doc.nodes = nodes;
  return doc;
}

export const MOLD_CARDS: MoldCard[] = [
  {
    id: 'single',
    title: '单选',
    desc: '题干 + 选项',
    icon: 'lucide:circle-dot',
    build: () =>
      wrap('单选题', [createTextNode(), createChoiceNode('single', 4)]),
  },
  {
    id: 'multi',
    title: '多选',
    desc: '题干 + 多选',
    icon: 'lucide:square-check',
    build: () =>
      wrap('多选题', [createTextNode(), createChoiceNode('multi', 5)]),
  },
  {
    id: 'judge',
    title: '判断',
    desc: '题干 + 对错',
    icon: 'lucide:toggle-left',
    build: () =>
      wrap('判断题', [createTextNode(), createChoiceNode('true_false', 2)]),
  },
  {
    id: 'blank_type',
    title: '填空·手打',
    desc: '文内挖空',
    icon: 'lucide:text-cursor-input',
    build: () => wrap('填空题', [createPassageNode('free_text', 5)]),
  },
  {
    id: 'blank_local',
    title: '填空·每空选项',
    desc: '每空自带选项',
    icon: 'lucide:list-checks',
    build: () => {
      const p = createPassageNode('local_choice', 10);
      p.rules.defaultOptionCount = 4;
      return wrap('填空·每空选项', [p]);
    },
  },
  {
    id: 'blank_pool',
    title: '填空·共用选项池',
    desc: '多空共用选项',
    icon: 'lucide:library',
    build: () => {
      const pool = createPoolNode(15);
      const p = createPassageNode('shared_pool', 10);
      p.poolId = pool.id;
      p.blanks.forEach((b) => {
        b.rules.poolRef = pool.id;
      });
      return wrap('填空·共用选项池', [p, pool]);
    },
  },
  {
    id: 'material_sub',
    title: '材料 + 小题',
    desc: '阅读/案例等同构',
    icon: 'lucide:book-open-text',
    build: () => {
      const text = createTextNode();
      text.label = '材料';
      const group = createGroupNode('小题');
      group.children = [
        createChoiceNode('single', 4),
        createChoiceNode('single', 4),
        createChoiceNode('single', 4),
      ];
      return wrap('材料带小题', [text, group]);
    },
  },
  {
    id: 'listening',
    title: '音频 + 小题',
    desc: '听力类',
    icon: 'lucide:headphones',
    build: () => {
      const audio = createMediaNode('audio');
      audio.rules.maxPlays = 2;
      const group = createGroupNode('小题');
      group.children = [
        createChoiceNode('single', 4),
        createChoiceNode('single', 4),
      ];
      return wrap('音频带小题', [audio, group]);
    },
  },
  {
    id: 'image_q',
    title: '读图',
    desc: '图可调大小位置',
    icon: 'lucide:image',
    build: () => {
      const img = createMediaNode('image');
      img.frame = {
        placement: 'block',
        width: L(60, '%'),
        height: L(180, 'px'),
        align: 'center',
        aspectLock: true,
      };
      return wrap('读图题', [
        createTextNode(),
        img,
        createChoiceNode('single', 4),
      ]);
    },
  },
  {
    id: 'writing',
    title: '书写/论述',
    desc: '长文本作答',
    icon: 'lucide:pen-line',
    build: () =>
      wrap('书写题', [createTextNode(), createInputNode('long', 800)]),
  },
  {
    id: 'code',
    title: '编程',
    desc: '代码作答',
    icon: 'lucide:code-2',
    build: () => wrap('编程题', [createTextNode(), createCodeNode()]),
  },
  {
    id: 'custom',
    title: '空白自定义',
    desc: '从零拼',
    icon: 'lucide:plus-square',
    build: () => {
      const doc = createEmptyTemplateDocument();
      doc.meta = createDefaultMeta({ title: '自定义题型' });
      return doc;
    },
  },
];
