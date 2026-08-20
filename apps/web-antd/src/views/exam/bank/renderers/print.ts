import type { AssembledPaper, BankQuestion } from '../types';

import { integrityChecksum } from '#/platform/integrity';

import {
  getInteractionPlugin,
  validatePaperCompatibility,
} from '../plugins/registry';

export type PrintArtifactKind = 'answer-key' | 'answer-sheet' | 'question';

export type PrintPublicationPackage = {
  artifacts: Array<{
    checksum: string;
    fileName: string;
    html: string;
    kind: PrintArtifactKind;
  }>;
  blockingIssues: string[];
  checksum: string;
  generatedAt: string;
  manifestVersion: '1.0';
  paperId: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function answerText(question: BankQuestion) {
  if (question.primitive === 'numeric') {
    return [
      question.content.numericAnswer,
      question.content.unit,
      question.content.tolerance
        ? `容差 ±${question.content.tolerance}`
        : undefined,
    ]
      .filter((item) => item !== undefined && item !== '')
      .join(' ');
  }
  if (question.content.answers?.length) {
    return question.content.answers.join('；');
  }
  if (Array.isArray(question.content.answer)) {
    return question.content.answer.join('、');
  }
  return String(
    question.content.answer ??
      question.content.reference ??
      question.content.rubric?.join('；') ??
      '人工评分',
  );
}

function optionHtml(question: BankQuestion) {
  if (!question.content.options?.length) return '';
  return `<ol class="options">${question.content.options
    .map(
      (option) =>
        `<li><span class="option-key">${escapeHtml(option.key)}</span>${escapeHtml(option.text)}</li>`,
    )
    .join('')}</ol>`;
}

function responseArea(question: BankQuestion, score: number) {
  if (question.primitive === 'choice') return '';
  if (question.primitive === 'blank') {
    const count = Math.max(1, question.content.answers?.length ?? 1);
    return `<div class="blank-grid">${Array.from(
      { length: count },
      (_, index) => `<span>（${index + 1}）________________</span>`,
    ).join('')}</div>`;
  }
  if (question.primitive === 'numeric') {
    return '<div class="numeric-answer">数值：____________　单位：____________</div>';
  }
  if (question.primitive === 'file' || question.primitive === 'media') {
    return '<div class="channel-note">本题需提交电子作品；纸质卷仅记录作品编号和考务签字。</div>';
  }
  if (question.primitive === 'rubric') {
    return `<table class="rubric"><tbody>${(
      question.content.rubric ?? ['完成度', '准确性', '规范性']
    )
      .map(
        (criterion) =>
          `<tr><td>${escapeHtml(criterion)}</td><td>得分：　　　　</td><td>证据：　　　　　　　　　</td></tr>`,
      )
      .join('')}</tbody></table>`;
  }
  const lineCount = Math.min(12, Math.max(3, Math.ceil(score / 2)));
  return `<div class="answer-lines">${Array.from(
    { length: lineCount },
    () => '<i></i>',
  ).join('')}</div>`;
}

function questionHtml(
  question: BankQuestion,
  index: number,
  score: number,
  kind: PrintArtifactKind,
) {
  const plugin = getInteractionPlugin(question.primitive);
  if (kind === 'answer-key') {
    return `<section class="question answer-key-item">
  <h4>${index}. ${escapeHtml(question.title)} <small>（${score} 分）</small></h4>
  <p><strong>答案/评分依据：</strong>${escapeHtml(answerText(question))}</p>
  <p><strong>评分方式：</strong>${escapeHtml(plugin.manifest.scoring)}</p>
</section>`;
  }
  if (kind === 'answer-sheet') {
    return `<section class="question answer-sheet-item">
  <h4>${index}. ${escapeHtml(question.title)} <small>（${score} 分）</small></h4>
  ${responseArea(question, score)}
</section>`;
  }
  return `<section class="question">
  <h4>${index}. ${escapeHtml(question.stem)} <small>（${score} 分）</small></h4>
  ${question.content.material ? `<div class="material">${escapeHtml(question.content.material)}</div>` : ''}
  ${question.content.mediaLabel ? `<div class="media-note">考务资源：${escapeHtml(question.content.mediaLabel)}</div>` : ''}
  ${optionHtml(question)}
  ${responseArea(question, score)}
</section>`;
}

function printStyles() {
  return `
@page {
  size: A4 portrait;
  margin: 18mm 16mm 18mm 20mm;
  @bottom-center { content: "第 " counter(page) " 页 / 共 " counter(pages) " 页"; }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  color: #111;
  background: #eceff3;
  font-family: "Noto Serif CJK SC", "Source Han Serif SC", "SimSun", serif;
  font-size: 11pt;
  line-height: 1.65;
}
.toolbar {
  position: sticky; top: 0; z-index: 2; padding: 10px; text-align: center;
  background: #15202b; color: #fff;
}
.toolbar button { padding: 7px 16px; cursor: pointer; }
.page {
  width: 210mm; min-height: 297mm; margin: 12px auto; padding: 18mm 16mm 18mm 20mm;
  background: #fff; box-shadow: 0 2px 12px rgb(0 0 0 / 16%);
}
.seal-line { border-bottom: 1px dashed #444; padding-bottom: 8px; text-align: center; }
.paper-header { margin: 16px 0 22px; text-align: center; }
.paper-header h1 { margin: 4px 0; font-size: 18pt; }
.paper-header p { margin: 3px 0; }
.section { break-before: auto; }
.section > h2 { margin: 18px 0 8px; font-size: 13pt; }
.question { margin: 0 0 14px; break-inside: avoid; page-break-inside: avoid; }
.question h4 { margin: 0 0 6px; font-size: 11pt; font-weight: 400; }
.question small { white-space: nowrap; font-size: 9pt; }
.material, .media-note, .channel-note {
  margin: 6px 0; padding: 6px 8px; border: 1px solid #999; background: #f7f7f7;
}
.options { margin: 5px 0 5px 22px; padding: 0; list-style: none; }
.options li { display: inline-block; min-width: 47%; margin: 3px 1%; vertical-align: top; }
.option-key {
  display: inline-block; width: 19px; height: 19px; margin-right: 6px;
  border: 1px solid #333; border-radius: 50%; text-align: center; line-height: 17px;
}
.blank-grid { display: flex; flex-wrap: wrap; gap: 12px 28px; margin: 8px 0; }
.numeric-answer { margin: 10px 0; }
.answer-lines i { display: block; height: 26px; border-bottom: 1px solid #999; }
.rubric { width: 100%; border-collapse: collapse; }
.rubric td { padding: 6px; border: 1px solid #555; }
.answer-key-item { border-bottom: 1px solid #aaa; }
@media print {
  body { background: #fff; }
  .toolbar { display: none !important; }
  .page { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
}`;
}

export function renderPaperHtml(
  paper: AssembledPaper,
  courseName: string,
  kind: PrintArtifactKind = 'question',
) {
  let index = 0;
  const sections = paper.sections
    .map(
      (section) => `<section class="section">
  <h2>${escapeHtml(section.name)}</h2>
  ${section.items
    .map((item) => questionHtml(item.snapshot, (index += 1), item.score, kind))
    .join('')}
</section>`,
    )
    .join('');
  let titleSuffix = '试题册';
  if (kind === 'answer-key') {
    titleSuffix = '参考答案与评分细则';
  } else if (kind === 'answer-sheet') {
    titleSuffix = '答题册';
  }
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(`${paper.name}-${titleSuffix}`)}</title>
  <style>${printStyles()}</style>
</head>
<body>
  <div class="toolbar">正式打印前请核对纸张、单双面和缩放设置。 <button onclick="window.print()">打印 / 另存为 PDF</button></div>
  <main class="page">
    <div class="seal-line">姓名：____________　学号：____________　考场：________　座位号：________</div>
    <header class="paper-header">
      <p>知测示范大学 · ${escapeHtml(courseName)}</p>
      <h1>${escapeHtml(paper.name)} · ${titleSuffix}</h1>
      <p>考试时长 ${paper.duration} 分钟　满分 ${paper.totalScore} 分　${escapeHtml(paper.variant)} 卷</p>
      <p>试卷编号 ${escapeHtml(paper.id)}</p>
    </header>
    ${sections}
  </main>
</body>
</html>`;
}

export function createPrintPublicationPackage(
  paper: AssembledPaper,
  courseName: string,
): PrintPublicationPackage {
  const generatedAt = new Date().toISOString();
  const artifacts = (
    ['question', 'answer-sheet', 'answer-key'] as PrintArtifactKind[]
  ).map((kind) => {
    const html = renderPaperHtml(paper, courseName, kind);
    return {
      checksum: integrityChecksum(html),
      fileName: `${paper.name}-${kind}.html`,
      html,
      kind,
    };
  });
  const blockingIssues = validatePaperCompatibility(paper)
    .filter((issue) => issue.channel === 'print' && issue.blocking)
    .map((issue) => `${issue.questionTitle}：${issue.message}`);
  return {
    artifacts,
    blockingIssues,
    checksum: integrityChecksum({
      artifacts: artifacts.map(({ checksum, fileName, kind }) => ({
        checksum,
        fileName,
        kind,
      })),
      generatedAt,
      paperId: paper.id,
    }),
    generatedAt,
    manifestVersion: '1.0',
    paperId: paper.id,
  };
}

export function openPrintArtifact(
  paper: AssembledPaper,
  courseName: string,
  kind: PrintArtifactKind = 'question',
) {
  const html = renderPaperHtml(paper, courseName, kind);
  const url = URL.createObjectURL(
    new Blob([html], { type: 'text/html;charset=utf-8' }),
  );
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return Boolean(popup);
}
