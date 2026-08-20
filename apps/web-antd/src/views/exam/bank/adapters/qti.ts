import type { AssembledPaper, BankQuestion, Primitive } from '../types';

import { getInteractionPlugin } from '../plugins/registry';

export const QTI_PROFILE_VERSION = '3.0.1';

export type QtiExportFile = {
  mediaType: 'application/xml';
  name: string;
  text: string;
};

export type QtiExportPackage = {
  files: QtiExportFile[];
  profile: `QTI ${typeof QTI_PROFILE_VERSION}`;
  warnings: string[];
};

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function responseDeclaration(question: BankQuestion) {
  if (question.primitive === 'choice') {
    const answers = Array.isArray(question.content.answer)
      ? question.content.answer
      : [question.content.answer ?? ''];
    return `<qti-response-declaration identifier="RESPONSE" cardinality="${question.content.multi ? 'multiple' : 'single'}" base-type="identifier">
  <qti-correct-response>${answers
    .map((answer) => `<qti-value>${escapeXml(answer)}</qti-value>`)
    .join('')}</qti-correct-response>
</qti-response-declaration>`;
  }
  if (question.primitive === 'numeric') {
    return `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="float">
  <qti-correct-response><qti-value>${escapeXml(question.content.numericAnswer)}</qti-value></qti-correct-response>
</qti-response-declaration>`;
  }
  return `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string" />`;
}

function interactionBody(question: BankQuestion) {
  if (question.primitive === 'choice') {
    const maxChoices = question.content.multi
      ? Math.max(1, question.content.options?.length ?? 1)
      : 1;
    return `<qti-choice-interaction response-identifier="RESPONSE" max-choices="${maxChoices}">
${(question.content.options ?? [])
  .map(
    (option) =>
      `  <qti-simple-choice identifier="${escapeXml(option.key)}">${escapeXml(option.text)}</qti-simple-choice>`,
  )
  .join('\n')}
</qti-choice-interaction>`;
  }
  if (question.primitive === 'blank' || question.primitive === 'numeric') {
    return `<qti-text-entry-interaction response-identifier="RESPONSE" expected-length="24" />`;
  }
  if (question.primitive === 'file' || question.primitive === 'media') {
    return `<qti-upload-interaction response-identifier="RESPONSE" />`;
  }
  return `<qti-extended-text-interaction response-identifier="RESPONSE" expected-lines="${question.primitive === 'text' ? 8 : 4}" />`;
}

export function exportQtiItem(question: BankQuestion) {
  const plugin = getInteractionPlugin(question.primitive);
  return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="${escapeXml(question.id)}"
  title="${escapeXml(question.title)}"
  adaptive="false"
  time-dependent="false">
${responseDeclaration(question)}
<qti-item-body>
  <div class="qti-layout-row">
    <p>${escapeXml(question.stem)}</p>
    ${interactionBody(question)}
  </div>
</qti-item-body>
<qti-modal-feedback outcome-identifier="FEEDBACK" identifier="plugin" show-hide="show">
  ${escapeXml(`${plugin.manifest.id}@${plugin.manifest.version}`)}
</qti-modal-feedback>
</qti-assessment-item>`;
}

export function exportQtiTest(paper: AssembledPaper) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="${escapeXml(paper.id)}"
  title="${escapeXml(paper.name)}">
${paper.sections
  .map(
    (section, sectionIndex) => `<qti-assessment-section
  identifier="section-${sectionIndex + 1}"
  title="${escapeXml(section.name)}"
  visible="true">
${section.items
  .map(
    (item) =>
      `  <qti-assessment-item-ref identifier="ref-${escapeXml(item.questionId)}" href="items/${escapeXml(item.questionId)}.xml" />`,
  )
  .join('\n')}
</qti-assessment-section>`,
  )
  .join('\n')}
</qti-assessment-test>`;
}

export function buildQtiPackage(paper: AssembledPaper): QtiExportPackage {
  const items = paper.sections.flatMap((section) => section.items);
  const warnings = items
    .filter(
      (item) =>
        !getInteractionPlugin(item.snapshot.primitive).manifest.qtiInteraction,
    )
    .map(
      (item) =>
        `${item.snapshot.title} 使用平台扩展交互，导入其他系统后需要等价替换。`,
    );
  return {
    files: [
      {
        mediaType: 'application/xml',
        name: 'assessment-test.xml',
        text: exportQtiTest(paper),
      },
      ...items.map((item) => ({
        mediaType: 'application/xml' as const,
        name: `items/${item.questionId}.xml`,
        text: exportQtiItem(item.snapshot),
      })),
    ],
    profile: `QTI ${QTI_PROFILE_VERSION}`,
    warnings,
  };
}

function textOf(element: Element | null) {
  return element?.textContent?.trim() ?? '';
}

/**
 * 轻量 QTI 3 导入器，仅覆盖首版内置交互；生产环境仍需 XSD、资源包和安全校验。
 */
export function importQtiItem(
  xml: string,
  defaults: {
    courseId: string;
    source?: string;
  },
): BankQuestion {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror'))
    throw new Error('QTI XML 无法解析');
  const root = document.documentElement;
  const choice = root.querySelector(
    'qti-choice-interaction, choiceInteraction',
  );
  const upload = root.querySelector(
    'qti-upload-interaction, uploadInteraction',
  );
  const numericDeclaration = root.querySelector(
    'qti-response-declaration[base-type="float"], responseDeclaration[baseType="float"]',
  );
  let primitive: Primitive = 'text';
  if (choice) {
    primitive = 'choice';
  } else if (upload) {
    primitive = 'file';
  } else if (numericDeclaration) {
    primitive = 'numeric';
  }
  const answers = [
    ...root.querySelectorAll(
      'qti-correct-response qti-value, correctResponse value',
    ),
  ].map((element) => textOf(element));
  const options = choice
    ? [...choice.querySelectorAll('qti-simple-choice, simpleChoice')].map(
        (element, index) => ({
          key:
            element.getAttribute('identifier') ??
            String.fromCodePoint(65 + index),
          text: textOf(element),
        }),
      )
    : undefined;
  const id =
    root.getAttribute('identifier') ??
    `qti-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const bodyText = textOf(root.querySelector('qti-item-body p, itemBody p'));
  const numericAnswer =
    primitive === 'numeric' && answers[0] !== undefined
      ? Number(answers[0])
      : undefined;
  let answer: string | string[] | undefined;
  if (primitive === 'choice') {
    answer = answers.length > 1 ? answers : answers[0];
  }
  return {
    channel: primitive === 'file' ? 'cbt' : 'both',
    content: {
      answer,
      allowedFileTypes: primitive === 'file' ? ['application/pdf'] : undefined,
      numericAnswer:
        typeof numericAnswer === 'number' && Number.isFinite(numericAnswer)
          ? numericAnswer
          : undefined,
      options,
    },
    courseId: defaults.courseId,
    difficulty: 3,
    exposure: 0,
    id,
    knowledgeIds: [],
    layer: 'course',
    primitive,
    score: 1,
    source: defaults.source ?? `QTI ${QTI_PROFILE_VERSION} 导入`,
    status: 'review',
    stem: bodyText || root.getAttribute('title') || '导入题目',
    title: root.getAttribute('title') || id,
    typeName: getInteractionPlugin(primitive).manifest.title,
    typePackVersion: `${primitive}@1.0.0`,
  };
}
