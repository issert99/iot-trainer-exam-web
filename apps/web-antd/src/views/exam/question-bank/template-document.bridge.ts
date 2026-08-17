/**
 * TemplateDocument v3 ↔ 存储 / 旧 paper v2 桥接
 */
import type { BuilderComponent } from './mock';
import type { PaperDocument } from './paper-schema';
import type {
  BlankBinding,
  PassageNode,
  TemplateDocument,
  TemplateNode,
} from './template-document';

import {
  createEmptyPaperDocument,
  createPaperBlock,
  decodePaperDocument,
  encodePaperDocument,
} from './paper-schema';
import {
  applyBindingToAll,
  createDefaultPassageProps,
  setPassageBlankCount,
} from './passage-model';
import {
  countScoredNodes,
  createBlankNode,
  createChoiceNode,
  createDefaultMeta,
  createDefaultStyle,
  createEmptyTemplateDocument,
  createGroupNode,
  createMediaNode,
  createPassageNode,
  createPoolNode,
  createTextNode,
  ensureTemplateStyle,
} from './template-document';

export function encodeTemplateDocument(
  doc: TemplateDocument,
): BuilderComponent[] {
  return [
    {
      id: 'template_document_v3',
      type: 'template_definition',
      label: '题目模板 v3',
      score: 0,
      judgeMode: 'none',
      config: {
        // eslint-disable-next-line unicorn/prefer-structured-clone
        templateDocument: JSON.parse(JSON.stringify(doc)) as TemplateDocument,
      },
    },
  ];
}

export function decodeTemplateDocument(raw: unknown): TemplateDocument {
  const list = Array.isArray(raw) ? raw : [];
  const stored = list.find(
    (item) =>
      item &&
      typeof item === 'object' &&
      (item as BuilderComponent).type === 'template_definition',
  ) as BuilderComponent | undefined;

  const v3 = stored?.config?.templateDocument as TemplateDocument | undefined;
  if (v3?.version === 3 && Array.isArray(v3.nodes)) {
    // eslint-disable-next-line unicorn/prefer-structured-clone
    const doc = JSON.parse(JSON.stringify(v3)) as TemplateDocument;
    doc.style = ensureTemplateStyle(doc.style);
    doc.meta = { ...createDefaultMeta(), ...doc.meta };
    return doc;
  }

  // 回落：从 paper v2 升级
  const paper = decodePaperDocument(raw);
  return paperDocumentToTemplateDocument(paper);
}

/** paper v2 → template v3（尽力升级，保留结构） */
export function paperDocumentToTemplateDocument(
  paper: PaperDocument,
): TemplateDocument {
  const doc = createEmptyTemplateDocument();
  doc.role = paper.role || 'template';
  doc.meta = createDefaultMeta();
  doc.style = createDefaultStyle();
  doc.nodes = paper.blocks.flatMap((block) => paperBlockToNode(block));
  return doc;
}

function paperBlockToNode(block: {
  children?: any[];
  id: string;
  props: Record<string, any>;
  scoring?: { judgeMode: any; score: number };
  type: string;
}): TemplateNode[] {
  switch (block.type) {
    case 'choice':
    case 'multi_choice':
    case 'true_false': {
      let mode: 'multi' | 'single' | 'true_false' = 'single';
      if (block.type === 'multi_choice') mode = 'multi';
      else if (block.type === 'true_false') mode = 'true_false';
      const node = createChoiceNode(
        mode,
        block.props.optionCount || block.props.options?.length || 4,
      );
      node.id = block.id;
      if (block.scoring) {
        node.scoring = {
          score: block.scoring.score,
          judgeMode: block.scoring.judgeMode,
          partial: 'all_or_nothing',
        };
      }
      return [node];
    }
    case 'cloze':
    case 'passage': {
      return [legacyPassageToNode(block)];
    }
    case 'listening': {
      const node = createMediaNode('audio');
      node.id = block.id;
      node.rules.maxPlays = block.props.maxPlays ?? 2;
      return [node];
    }
    case 'media': {
      let kind: 'audio' | 'image' | 'video' = 'image';
      if (block.props.mediaType === 'audio') kind = 'audio';
      else if (block.props.mediaType === 'video') kind = 'video';
      const node = createMediaNode(kind);
      node.id = block.id;
      return [node];
    }
    case 'section': {
      const group = createGroupNode(block.props.title || '小题组');
      group.id = block.id;
      group.children = (block.children || []).flatMap((child: any) =>
        paperBlockToNode(child),
      );
      group.rules.childCount = group.children.length;
      return [group];
    }
    case 'stem':
    case 'tip': {
      const node = createTextNode();
      node.id = block.id;
      node.label = block.props.title || node.label;
      node.content = {
        text: { html: block.props.html || '', plain: '' },
      };
      return [node];
    }
    default: {
      const text = createTextNode();
      text.id = block.id;
      text.label = block.props.title || block.type;
      return [text];
    }
  }
}

function legacyPassageToNode(block: {
  id: string;
  props: Record<string, any>;
  scoring?: { judgeMode: any; score: number };
}): PassageNode {
  const props = block.props;
  const slots = Array.isArray(props.slots) ? props.slots : [];
  const hasSlots = slots.length > 0;
  let binding: BlankBinding = 'local_choice';
  if (hasSlots) {
    binding = (slots[0]?.binding as BlankBinding) || 'local_choice';
  } else if (
    props.blankInteraction === 'shared_options' ||
    props.blankType === 'shared_options'
  ) {
    binding = 'shared_pool';
  }

  const count = hasSlots
    ? slots.length
    : Math.max(1, Number(props.blankCount || 10));
  const passage = createPassageNode(binding, count);
  passage.id = block.id;
  passage.label = props.title || passage.label;
  passage.content = {
    text: { plain: props.text || props.passage || '', html: '' },
  };

  if (binding === 'shared_pool') {
    const pool = createPoolNode(
      Number(props.pool?.size || props.bankSize || 15),
    );
    pool.rules.reuse = props.pool?.reuse || props.reuse || 'once';
    passage.poolId = pool.id;
    passage.blanks = Array.from({ length: count }, (_, i) =>
      createBlankNode(i + 1, 'shared_pool', 4, pool.id),
    );
    (passage as PassageNode & { _embeddedPool?: typeof pool })._embeddedPool =
      pool;
  } else if (hasSlots) {
    passage.blanks = slots.map((slot: any) =>
      createBlankNode(
        slot.marker,
        (slot.binding as BlankBinding) || 'local_choice',
        slot.optionCount || props.defaultOptionCount || 4,
      ),
    );
  }

  if (block.scoring) {
    passage.scoring = {
      score: block.scoring.score,
      judgeMode: block.scoring.judgeMode,
      partial: 'per_blank',
    };
  }
  return passage;
}

/** 展开 passage 上临时挂的词库节点 */
export function flattenTemplateNodes(nodes: TemplateNode[]): TemplateNode[] {
  const result: TemplateNode[] = [];
  for (const node of nodes) {
    result.push(node);
    const embedded = (node as any)._embeddedPool;
    if (embedded) {
      result.push(embedded);
      delete (node as any)._embeddedPool;
    }
    if (node.type === 'group') {
      node.children = flattenTemplateNodes(node.children);
    }
  }
  return result;
}

/** template v3 → paper v2（供现有 PaperSheetEditor / 预览过渡） */
export function templateDocumentToPaperDocument(
  doc: TemplateDocument,
): PaperDocument {
  const paper = createEmptyPaperDocument();
  paper.role = doc.role;
  paper.blocks = [];

  for (const node of doc.nodes) {
    switch (node.type) {
      case 'choice': {
        let type: 'choice' | 'multi_choice' | 'true_false' = 'choice';
        if (node.rules.mode === 'multi') type = 'multi_choice';
        else if (node.rules.mode === 'true_false') type = 'true_false';
        const block = createPaperBlock(type);
        block.id = node.id;
        block.props.title = node.label;
        block.props.optionCount = node.rules.optionCount;
        if (node.scoring) {
          block.scoring = {
            score: node.scoring.score,
            judgeMode: node.scoring.judgeMode,
          };
        }
        paper.blocks.push(block);
        break;
      }
      case 'group': {
        const block = createPaperBlock('section');
        block.id = node.id;
        block.props.title = node.label || '小题组';
        const childDoc: TemplateDocument = {
          ...doc,
          nodes: node.children,
        };
        block.children = templateDocumentToPaperDocument(childDoc).blocks;
        paper.blocks.push(block);
        break;
      }
      case 'media': {
        const block = createPaperBlock(
          node.rules.mediaKind === 'audio' ? 'listening' : 'media',
        );
        block.id = node.id;
        block.props.title = node.label;
        block.props.mediaType = node.rules.mediaKind;
        block.props.maxPlays = node.rules.maxPlays;
        block.props.url = node.content?.media?.src || '';
        // frame 暂挂 props，供后续编辑器读取
        block.props.frame = node.frame;
        paper.blocks.push(block);
        break;
      }
      case 'passage': {
        const block = createPaperBlock('passage');
        block.id = node.id;
        let passageBinding: BlankBinding = 'local_choice';
        switch (node.rules.defaultBinding) {
          case 'formula': {
            passageBinding = 'formula';

            break;
          }
          case 'free_text': {
            passageBinding = 'free_text';

            break;
          }
          case 'number': {
            passageBinding = 'number';

            break;
          }
          case 'shared_pool': {
            passageBinding = 'shared_pool';

            break;
          }
          // No default
        }
        const props = createDefaultPassageProps(
          passageBinding,
          node.blanks.length || node.rules.blankCount || 10,
        );
        props.title = node.label || '挖空文';
        props.text = node.content?.text?.plain || '';
        props.defaultOptionCount = node.rules.defaultOptionCount;
        applyBindingToAll(props, props.defaultBinding);
        setPassageBlankCount(props, node.blanks.length || 10);
        if (node.rules.defaultBinding === 'shared_pool' || node.poolId) {
          const poolNode = doc.nodes.find(
            (item) => item.type === 'pool' && item.id === node.poolId,
          );
          props.pool = {
            size:
              poolNode && poolNode.type === 'pool'
                ? poolNode.rules.size
                : Math.max(15, node.blanks.length + 3),
            reuse:
              poolNode && poolNode.type === 'pool'
                ? poolNode.rules.reuse
                : 'once',
            items: [],
          };
        }
        block.props = props;
        if (node.scoring) {
          block.scoring = {
            score: node.scoring.score,
            judgeMode: node.scoring.judgeMode,
          };
        }
        paper.blocks.push(block);
        break;
      }
      case 'pool': {
        // pool 已并入 passage；独立 pool 忽略或挂到最近 passage
        break;
      }
      case 'text': {
        const block = createPaperBlock('stem');
        block.id = node.id;
        block.props.title = node.label || '文本';
        block.props.html = node.content?.text?.html || '';
        paper.blocks.push(block);
        break;
      }
      default: {
        break;
      }
    }
  }

  return paper;
}

export function templateSummary(doc: TemplateDocument) {
  const scored = countScoredNodes(doc.nodes);
  return {
    nodeCount: doc.nodes.length,
    scoredCount: scored,
    language: doc.meta.language,
    numbering: doc.meta.numbering.scheme,
    label: `${doc.nodes.length} 节点 · ${scored} 处计分 · ${doc.meta.language}`,
  };
}

/** 存盘：优先 v3；同时带 paper 兼容字段方便旧预览 */
export function encodeTemplateDocumentCompatible(doc: TemplateDocument) {
  const paper = templateDocumentToPaperDocument(doc);
  const components = encodePaperDocument(paper);
  const head = components[0];
  if (head?.config) {
    // eslint-disable-next-line unicorn/prefer-structured-clone
    head.config.templateDocument = JSON.parse(
      JSON.stringify(doc),
    ) as TemplateDocument;
    head.label = '题目模板 v3';
  }
  return components;
}
