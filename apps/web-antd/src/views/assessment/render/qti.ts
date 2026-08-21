import type { TestFormRevision } from '../domain/types';

import { getPlugin } from '../plugins/registry';

export const QTI_VERSION = '3.0.1';

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function createQtiPackage(form: TestFormRevision) {
  const items = form.sections.flatMap((section) => section.items);
  const test = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="${escapeXml(form.id)}"
  title="${escapeXml(form.name)}">
${form.sections
  .map(
    (
      section,
    ) => `<qti-assessment-section identifier="${escapeXml(section.id)}" title="${escapeXml(section.name)}" visible="true">
${section.items
  .map(
    (entry) =>
      `  <qti-assessment-item-ref identifier="ref-${escapeXml(entry.itemRevision.id)}" href="items/${escapeXml(entry.itemRevision.id)}.xml" />`,
  )
  .join('\n')}
</qti-assessment-section>`,
  )
  .join('\n')}
</qti-assessment-test>`;
  return {
    files: [
      {
        mediaType: 'application/xml',
        name: 'assessment-test.xml',
        text: test,
      },
      ...items.map((entry) => ({
        mediaType: 'application/xml',
        name: `items/${entry.itemRevision.id}.xml`,
        text: getPlugin(entry.itemRevision.interaction.pluginId).toQti(
          entry.itemRevision,
        ),
      })),
    ],
    profile: `QTI ${QTI_VERSION}`,
    warnings: items
      .filter(
        (entry) =>
          !getPlugin(entry.itemRevision.interaction.pluginId).manifest
            .qtiInteraction,
      )
      .map(
        (entry) =>
          `${entry.itemRevision.title} 使用平台扩展交互，需要目标系统提供等价插件。`,
      ),
  };
}

export function downloadQtiTest(form: TestFormRevision) {
  const packageData = createQtiPackage(form);
  const test = packageData.files.find(
    (file) => file.name === 'assessment-test.xml',
  );
  if (!test) throw new Error('QTI 测试文件生成失败');
  const url = URL.createObjectURL(
    new Blob([test.text], { type: 'application/xml;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${form.name}-QTI-${QTI_VERSION}.xml`;
  anchor.click();
  URL.revokeObjectURL(url);
  return packageData;
}
