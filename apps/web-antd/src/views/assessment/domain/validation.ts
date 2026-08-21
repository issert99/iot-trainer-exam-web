import type { SchoolAssessmentState } from './types';

export type PrototypeValidation = {
  detail: string;
  id: string;
  name: string;
  passed: boolean;
};

export function validateSchoolPrototype(
  state: SchoolAssessmentState,
): PrototypeValidation[] {
  const sharedItem = state.itemRevisions.find(
    (item) => item.id === 'item-calculus-choice@2',
  );
  const compositeTemplate = state.interactionTemplates.find(
    (template) => template.id === 'template-material@3',
  );
  const deliveryModes = new Set(
    state.events.map((event) => event.deliveryMode),
  );
  const sealedForm = state.forms.find((form) => form.status === 'sealed');
  const historicalItemIds = new Set(
    sealedForm?.sections.flatMap((section) =>
      section.items.map((entry) => entry.itemRevision.id),
    ),
  );

  return [
    {
      detail: sharedItem
        ? `主归属课程 1 个，适用专业 ${sharedItem.metadata.applicability.majorIds.length} 个`
        : '未找到共享基础题',
      id: 'cross-major-item',
      name: '跨专业复用不复制题目',
      passed: (sharedItem?.metadata.applicability.majorIds.length ?? 0) >= 3,
    },
    {
      detail: sharedItem
        ? `关联 ${sharedItem.classification.taxonomyNodeIds.length} 个受控分类节点`
        : '未找到分类数据',
      id: 'faceted-classification',
      name: '课程归属与多维分类并存',
      passed: (sharedItem?.classification.taxonomyNodeIds.length ?? 0) >= 2,
    },
    {
      detail: compositeTemplate
        ? `${compositeTemplate.controls.length} 个控件、${compositeTemplate.scoreRules.length} 条评分规则`
        : '未找到材料计算模板',
      id: 'no-code-template',
      name: '无代码复合交互',
      passed:
        (compositeTemplate?.controls.length ?? 0) >= 3 &&
        (compositeTemplate?.scoreRules.length ?? 0) >= 3,
    },
    {
      detail: `${state.pluginPackages.length} 个插件包具有版本、沙箱与测试摘要`,
      id: 'plugin-sdk',
      name: '代码插件可见、可测、可追溯',
      passed:
        state.pluginPackages.length >= 6 &&
        state.pluginPackages.every(
          (plugin) => plugin.version && plugin.testSummary.lastRunAt,
        ),
    },
    {
      detail: sealedForm
        ? `冻结 ${historicalItemIds.size} 个题目版本，校验值 ${sealedForm.checksum}`
        : '没有封存试卷',
      id: 'immutable-paper',
      name: '试卷固定题目与交互版本',
      passed: Boolean(sealedForm && historicalItemIds.size > 0),
    },
    {
      detail: `已覆盖 ${[...deliveryModes].join('、')}`,
      id: 'delivery-modes',
      name: '在线、纸笔、实践三种交付',
      passed:
        deliveryModes.has('online') &&
        deliveryModes.has('paper') &&
        deliveryModes.has('practical'),
    },
    {
      detail: `${state.scoreRecords.length} 条评分记录，${state.appeals.length} 条申诉`,
      id: 'score-result-loop',
      name: '评分、复核、发布与申诉',
      passed: state.scoreRecords.length > 0 && state.appeals.length > 0,
    },
    {
      detail: `${state.auditRecords.length} 条不可覆盖操作记录`,
      id: 'history-trace',
      name: '历史版本与审计追溯',
      passed: state.auditRecords.length > 0,
    },
  ];
}
