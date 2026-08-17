/**
 * TemplateDocument v3 示例配方（模板态：content 可空）
 * 运行时可直接 createXxxExample() 拿到完整文档。
 */
import type { TemplateDocument } from './template-document';

import {
  createBlankNode,
  createChoiceNode,
  createDefaultMeta,
  createDefaultStyle,
  createGroupNode,
  createMediaNode,
  createPassageNode,
  createPoolNode,
  createTextNode,
  L,
} from './template-document';

/** ① 挖空 · 每空四选一（传统完形） */
export function exampleLocalChoiceCloze(): TemplateDocument {
  const passage = createPassageNode('local_choice', 20);
  passage.label = '挖空文（每空选项）';
  passage.rules.defaultOptionCount = 4;
  passage.blanks = Array.from({ length: 20 }, (_, i) =>
    createBlankNode(i + 1, 'local_choice', 4),
  );

  return {
    version: 3,
    role: 'template',
    meta: createDefaultMeta({
      title: '挖空·每空四选一',
      language: 'en-US',
      secondaryLanguage: 'zh-CN',
      numbering: {
        scheme: 'arabic',
        start: 1,
        step: 1,
        scope: 'document',
        prefix: '',
        suffix: '.',
      },
      defaultScore: 0.5,
      defaultJudge: 'auto',
    }),
    style: createDefaultStyle(),
    nodes: [passage],
  };
}

/** ② 挖空 · 共享词库（选词填空） */
export function exampleSharedPoolCloze(): TemplateDocument {
  const pool = createPoolNode(15);
  pool.rules.reuse = 'once';
  pool.rules.distractorCount = 5;

  const passage = createPassageNode('shared_pool', 10);
  passage.label = '挖空文（共享词库）';
  passage.poolId = pool.id;
  passage.blanks = Array.from({ length: 10 }, (_, i) =>
    createBlankNode(i + 1, 'shared_pool', 4, pool.id),
  );
  passage.scoring = {
    score: 10,
    judgeMode: 'auto',
    partial: 'per_blank',
  };

  return {
    version: 3,
    role: 'template',
    meta: createDefaultMeta({
      title: '挖空·共享词库',
      language: 'zh-CN',
      numbering: {
        scheme: 'paren',
        start: 1,
        step: 1,
        scope: 'document',
        prefix: '',
        suffix: '',
      },
    }),
    style: createDefaultStyle(),
    nodes: [passage, pool],
  };
}

/** ③ 材料图（量化位置/大小）+ 小题组 */
export function exampleImageWithFrame(): TemplateDocument {
  const text = createTextNode();
  text.label = '题干说明';
  text.rules.rich = true;

  const image = createMediaNode('image');
  image.label = '示意图';
  /** 图在说明下方，居中，宽 60%，锁比例 —— 全是量化 */
  image.frame = {
    placement: 'block',
    width: L(60, '%'),
    height: 'auto',
    align: 'center',
    aspectLock: true,
    margin: {
      top: L(8, 'px'),
      bottom: L(12, 'px'),
      left: L(0, 'px'),
      right: L(0, 'px'),
    },
    zIndex: 0,
  };
  image.rules.required = true;
  // 模板不填 src；创建题目时灌 content.media.src

  const group = createGroupNode('根据图示作答');
  group.rules.childCount = 3;
  group.children = [
    createChoiceNode('single', 4),
    createChoiceNode('single', 4),
    createChoiceNode('single', 4),
  ];
  group.rules.numberingOverride = {
    scheme: 'paren',
    start: 1,
    prefix: '',
    suffix: '',
  };

  return {
    version: 3,
    role: 'template',
    meta: createDefaultMeta({
      title: '读图·材料+小题',
      language: 'zh-CN',
      layout: {
        columns: 1,
        pageWidth: L(210, 'mm'),
        margin: {
          top: L(15, 'mm'),
          right: L(15, 'mm'),
          bottom: L(15, 'mm'),
          left: L(15, 'mm'),
        },
        gap: L(16, 'px'),
      },
    }),
    style: createDefaultStyle(),
    nodes: [text, image, group],
  };
}

/** ④ 图浮于题干右侧（float_right + 绝对量化宽） */
export function exampleFloatRightImage(): TemplateDocument {
  const image = createMediaNode('image');
  image.frame = {
    placement: 'float_right',
    width: L(40, '%'),
    height: L(180, 'px'),
    align: 'end',
    aspectLock: true,
    zIndex: 1,
  };

  const text = createTextNode();
  text.label = '题干（图在右侧）';
  text.frame = {
    placement: 'block',
    width: L(100, '%'),
    height: 'auto',
    align: 'start',
  };

  const choice = createChoiceNode('single', 4);

  return {
    version: 3,
    role: 'template',
    meta: createDefaultMeta({
      title: '图右文左',
      language: 'zh-CN',
    }),
    style: createDefaultStyle(),
    nodes: [image, text, choice],
  };
}

/** ⑤ 听力：音频限播 + 小题 */
export function exampleListening(): TemplateDocument {
  const audio = createMediaNode('audio');
  audio.label = '听力音频';
  audio.rules.maxPlays = 2;
  audio.frame = {
    placement: 'block',
    width: L(100, '%'),
    height: L(48, 'px'),
    align: 'start',
  };

  const group = createGroupNode('根据音频作答');
  group.children = [
    createChoiceNode('single', 4),
    createChoiceNode('single', 4),
    createChoiceNode('true_false', 2),
  ];

  return {
    version: 3,
    role: 'template',
    meta: createDefaultMeta({
      title: '听力',
      language: 'en-US',
    }),
    style: createDefaultStyle(),
    nodes: [audio, group],
  };
}

/** 便于调试：导出纯 JSON（无函数） */
export const TEMPLATE_DOCUMENT_EXAMPLES: Record<
  string,
  () => TemplateDocument
> = {
  local_choice_cloze: exampleLocalChoiceCloze,
  shared_pool_cloze: exampleSharedPoolCloze,
  image_with_frame: exampleImageWithFrame,
  float_right_image: exampleFloatRightImage,
  listening: exampleListening,
};
