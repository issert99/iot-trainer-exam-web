import type { TestFormRevision } from '../domain/types';

import { checksum } from '../domain/integrity';
import { getPlugin } from '../plugins/registry';

export type PublicationArtifactKind =
  | 'answer-key'
  | 'answer-sheet'
  | 'question';

export type PublicationPackage = {
  artifacts: Array<{
    checksum: string;
    fileName: string;
    html: string;
    kind: PublicationArtifactKind;
  }>;
  blockingIssues: string[];
  checksum: string;
  formChecksum: string;
  generatedAt: string;
  manifestVersion: '1.0';
  testFormRevisionId: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function artifactTitle(kind: PublicationArtifactKind) {
  if (kind === 'answer-key') return '参考答案与评分细则';
  if (kind === 'answer-sheet') return '答题册';
  return '试题册';
}

function styles(form: TestFormRevision) {
  const pageSize = form.printProfile.pageSize;
  const columns = form.printProfile.columns;
  const fontSize = form.printProfile.fontSizePoints;
  const binding = form.printProfile.bindingEdgeMillimeters;
  return `
@page {
  size: ${pageSize} portrait;
  margin: 18mm 16mm 18mm ${Math.max(16, binding)}mm;
  @bottom-center { content: "第 " counter(page) " 页 / 共 " counter(pages) " 页"; }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  color: #111;
  background: #edf0f3;
  font-family: "Noto Serif CJK SC", "Source Han Serif SC", "SimSun", serif;
  font-size: ${fontSize}pt;
  line-height: 1.65;
}
.toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 10px;
  color: #fff;
  text-align: center;
  background: #17212b;
}
.toolbar button { padding: 7px 16px; cursor: pointer; }
.paper {
  width: min(210mm, 100%);
  min-height: 297mm;
  padding: 18mm 16mm 18mm ${Math.max(16, binding)}mm;
  margin: 12px auto;
  background: #fff;
  box-shadow: 0 2px 12px rgb(0 0 0 / 14%);
}
.seal { padding-bottom: 8px; text-align: center; border-bottom: 1px dashed #333; }
.paper-header { margin: 14px 0 22px; text-align: center; }
.paper-header h1 { margin: 4px 0; font-size: 18pt; }
.section-body { column-count: ${columns}; column-gap: 12mm; }
.section h2 { margin: 18px 0 8px; font-size: 13pt; break-after: avoid; }
.assessment-item { margin: 0 0 14px; break-inside: avoid; page-break-inside: avoid; }
.assessment-item h4 { margin: 0 0 6px; font-size: ${fontSize}pt; font-weight: 400; }
.assessment-item small { font-size: 9pt; white-space: nowrap; }
.choices { padding: 0; margin: 5px 0 5px 22px; list-style: none; }
.choices li { display: inline-block; width: 47%; margin: 3px 1%; vertical-align: top; }
.choices b, .omr i {
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  margin-right: 5px;
  font-style: normal;
  border: 1px solid #333;
  border-radius: 50%;
}
.blanks { display: flex; flex-wrap: wrap; gap: 12px 28px; margin: 8px 0; }
.numeric, .surrogate { padding: 8px; margin: 8px 0; border: 1px solid #888; }
.answer-lines i { display: block; height: 26px; border-bottom: 1px solid #999; }
.rubric { width: 100%; border-collapse: collapse; }
.rubric td { padding: 6px; border: 1px solid #555; }
@media print {
  body { background: #fff; }
  .toolbar { display: none !important; }
  .paper { width: auto; min-height: auto; padding: 0; margin: 0; box-shadow: none; }
}`;
}

export function renderPrintDocument(
  form: TestFormRevision,
  kind: PublicationArtifactKind,
) {
  let index = 0;
  const sections = form.sections
    .map(
      (section) => `<section class="section">
  <h2>${escapeHtml(section.name)}</h2>
  <div class="section-body">
    ${section.items
      .map((entry) =>
        getPlugin(entry.itemRevision.interaction.pluginId).renderPrint(
          entry.itemRevision,
          {
            answerMode: kind,
            index: (index += 1),
            score: entry.score,
          },
        ),
      )
      .join('')}
  </div>
</section>`,
    )
    .join('');
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(`${form.name}-${artifactTitle(kind)}`)}</title>
  <style>${styles(form)}</style>
</head>
<body>
  <div class="toolbar">
    校样编号 ${escapeHtml(form.checksum)}
    <button onclick="window.print()">打印 / 另存为 PDF</button>
  </div>
  <main class="paper">
    <div class="seal">姓名：____________　学号：____________　考场：________　座位号：________</div>
    <header class="paper-header">
      <p>全专业通用考试平台</p>
      <h1>${escapeHtml(form.name)} · ${artifactTitle(kind)}</h1>
      <p>考试时长 ${form.durationMinutes} 分钟　满分 ${form.totalScore} 分</p>
      <p>冻结版本 ${escapeHtml(form.id)}　校验值 ${escapeHtml(form.checksum)}</p>
    </header>
    ${sections}
  </main>
</body>
</html>`;
}

export function createPublicationPackage(
  form: TestFormRevision,
): PublicationPackage {
  const generatedAt = new Date().toISOString();
  const artifacts = (
    ['question', 'answer-sheet', 'answer-key'] as PublicationArtifactKind[]
  ).map((kind) => {
    const html = renderPrintDocument(form, kind);
    return {
      checksum: checksum(html),
      fileName: `${form.name}-${artifactTitle(kind)}.html`,
      html,
      kind,
    };
  });
  const manifest = {
    artifacts: artifacts.map(({ checksum: value, fileName, kind }) => ({
      checksum: value,
      fileName,
      kind,
    })),
    formChecksum: form.checksum,
    generatedAt,
    testFormRevisionId: form.id,
  };
  return {
    artifacts,
    blockingIssues: form.compatibility
      .filter((issue) => issue.blocking && issue.channel === 'print')
      .map((issue) => issue.message),
    checksum: checksum(manifest),
    formChecksum: form.checksum,
    generatedAt,
    manifestVersion: '1.0',
    testFormRevisionId: form.id,
  };
}

export function openPrintArtifact(
  form: TestFormRevision,
  kind: PublicationArtifactKind,
) {
  const html = renderPrintDocument(form, kind);
  const url = URL.createObjectURL(
    new Blob([html], { type: 'text/html;charset=utf-8' }),
  );
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return Boolean(popup);
}
