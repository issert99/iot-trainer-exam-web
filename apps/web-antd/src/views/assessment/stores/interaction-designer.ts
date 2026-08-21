import type {
  InteractionControl,
  InteractionTemplateRevision,
  JsonObject,
  PluginPackage,
  PrimitiveControlType,
} from '../domain/types';

import { computed, reactive } from 'vue';

import { checksum, clone, uid } from '../domain/integrity';
import {
  appendSchoolAudit,
  persistSchoolState,
  schoolAssessmentState,
} from './state';

export const interactionPalette: Array<{
  category: string;
  description: string;
  label: string;
  type: PrimitiveControlType;
}> = [
  {
    category: '基础输入',
    description: '单行文本',
    label: '文本',
    type: 'text',
  },
  {
    category: '基础输入',
    description: '多行论述',
    label: '长文本',
    type: 'textarea',
  },
  {
    category: '基础输入',
    description: '数值与精度',
    label: '数字',
    type: 'number',
  },
  {
    category: '基础输入',
    description: '数学公式',
    label: '公式',
    type: 'formula',
  },
  {
    category: '选择判断',
    description: '唯一选项',
    label: '单选',
    type: 'single-choice',
  },
  {
    category: '选择判断',
    description: '多个选项',
    label: '多选',
    type: 'multi-choice',
  },
  {
    category: '选择判断',
    description: '下拉选项',
    label: '下拉框',
    type: 'select',
  },
  {
    category: '选择判断',
    description: '行列评价',
    label: '矩阵',
    type: 'matrix',
  },
  {
    category: '作品证据',
    description: '文件作品',
    label: '文件',
    type: 'file',
  },
  {
    category: '作品证据',
    description: '绘图画布',
    label: '绘图',
    type: 'drawing',
  },
  {
    category: '作品证据',
    description: '现场录音',
    label: '录音',
    type: 'audio',
  },
  {
    category: '作品证据',
    description: '现场录像',
    label: '录像',
    type: 'video',
  },
  {
    category: '专业交互',
    description: '图像热点',
    label: '热点',
    type: 'hotspot',
  },
  {
    category: '专业交互',
    description: '结构化表格',
    label: '表格',
    type: 'table',
  },
  {
    category: '专业交互',
    description: '等级量规',
    label: '评级',
    type: 'rating',
  },
];

const initial =
  schoolAssessmentState.interactionTemplates.find(
    (template) => template.id === 'template-material@3',
  ) ?? schoolAssessmentState.interactionTemplates[0];

export const interactionDesignerDraft = reactive<InteractionTemplateRevision>(
  clone(
    initial ?? {
      accessibilityNotes: '',
      checksum: '',
      controls: [],
      createdAt: new Date().toISOString(),
      createdBy: 'teacher-demo',
      description: '',
      familyId: uid('template-family'),
      id: 'template-new@1',
      name: '未命名交互',
      paperFallback: { answerLines: 4, mode: 'equivalent', note: '' },
      revision: 1,
      scoreRules: [],
      status: 'draft',
    },
  ),
);

export const enabledInteractionTemplates = computed(() =>
  schoolAssessmentState.interactionTemplates.filter(
    (template) => template.status === 'enabled',
  ),
);

export function loadInteractionTemplate(id: string) {
  const template = schoolAssessmentState.interactionTemplates.find(
    (entry) => entry.id === id,
  );
  if (!template) throw new Error('交互模板不存在');
  Object.assign(interactionDesignerDraft, clone(template));
}

function defaultConfig(type: PrimitiveControlType): JsonObject {
  if (['multi-choice', 'select', 'single-choice'].includes(type)) {
    return { options: ['选项 A', '选项 B', '选项 C'] };
  }
  if (type === 'number') {
    return { max: 100, min: 0, precision: 2, unit: '' };
  }
  if (type === 'textarea') {
    return { maxLength: 500, rows: 4 };
  }
  if (type === 'matrix') {
    return {
      columns: ['优秀', '合格', '待改进'],
      rows: ['指标 1', '指标 2'],
    };
  }
  if (type === 'file') {
    return { extensions: ['pdf'], maxSizeMb: 20 };
  }
  return {};
}

export function addInteractionControl(type: PrimitiveControlType) {
  const palette = interactionPalette.find((entry) => entry.type === type);
  const control: InteractionControl = {
    config: defaultConfig(type),
    id: uid('control'),
    label: palette?.label ?? '新控件',
    required: false,
    scoreWeight: 0,
    type,
    width: 4,
  };
  interactionDesignerDraft.controls.push(control);
  return control;
}

export function removeInteractionControl(id: string) {
  interactionDesignerDraft.controls = interactionDesignerDraft.controls.filter(
    (control) => control.id !== id,
  );
  interactionDesignerDraft.scoreRules =
    interactionDesignerDraft.scoreRules.filter((rule) => rule.controlId !== id);
}

export function duplicateInteractionControl(id: string) {
  const source = interactionDesignerDraft.controls.find(
    (control) => control.id === id,
  );
  if (!source) return;
  interactionDesignerDraft.controls.push({
    ...clone(source),
    id: uid('control'),
    label: `${source.label} 副本`,
  });
}

export function saveInteractionTemplate() {
  const familyTemplates = schoolAssessmentState.interactionTemplates.filter(
    (template) => template.familyId === interactionDesignerDraft.familyId,
  );
  const revision =
    Math.max(0, ...familyTemplates.map((template) => template.revision)) + 1;
  const saved = clone(interactionDesignerDraft);
  saved.revision = revision;
  saved.id = `${saved.familyId}@${revision}`;
  saved.status = 'testing';
  saved.createdAt = new Date().toISOString();
  saved.checksum = checksum({ ...saved, checksum: undefined });
  schoolAssessmentState.interactionTemplates.unshift(saved);
  Object.assign(interactionDesignerDraft, clone(saved));
  appendSchoolAudit({
    action: 'interaction-template.saved',
    actorId: saved.createdBy,
    metadata: { revision },
    resourceId: saved.id,
    resourceType: 'interaction-template',
  });
  persistSchoolState();
  return saved;
}

export function enableInteractionTemplate(id: string) {
  const template = schoolAssessmentState.interactionTemplates.find(
    (entry) => entry.id === id,
  );
  if (!template) throw new Error('交互模板不存在');
  if (template.status !== 'testing') {
    throw new Error('只有通过测试中的模板版本可以启用');
  }
  if (template.controls.length === 0) throw new Error('模板至少包含一个控件');
  template.status = 'enabled';
  appendSchoolAudit({
    action: 'interaction-template.enabled',
    actorId: 'interaction-admin',
    resourceId: template.id,
    resourceType: 'interaction-template',
  });
  persistSchoolState();
}

export function setPluginStatus(id: string, status: PluginPackage['status']) {
  const plugin = schoolAssessmentState.pluginPackages.find(
    (entry) => entry.id === id,
  );
  if (!plugin) throw new Error('插件不存在');
  if (plugin.status === status) return plugin;
  const transitions: Record<
    PluginPackage['status'],
    PluginPackage['status'][]
  > = {
    deprecated: ['disabled'],
    disabled: ['testing'],
    draft: ['testing'],
    enabled: ['deprecated', 'disabled', 'testing'],
    testing: ['draft', 'enabled', 'disabled'],
  };
  if (!transitions[plugin.status].includes(status)) {
    throw new Error(`插件不能从 ${plugin.status} 直接转换为 ${status}`);
  }
  if (status === 'enabled' && plugin.testSummary.failed > 0) {
    throw new Error('仍有失败测试，不能启用插件');
  }
  plugin.status = status;
  appendSchoolAudit({
    action: `plugin.${status}`,
    actorId: 'plugin-admin',
    metadata: { version: plugin.version },
    resourceId: plugin.id,
    resourceType: 'plugin-package',
  });
  persistSchoolState();
  return plugin;
}

export function runPluginTests(id: string) {
  const plugin = schoolAssessmentState.pluginPackages.find(
    (entry) => entry.id === id,
  );
  if (!plugin) throw new Error('插件不存在');
  plugin.testSummary.lastRunAt = new Date().toISOString();
  if (plugin.status === 'draft') {
    plugin.testSummary.passed += 2;
    plugin.testSummary.failed = Math.max(0, plugin.testSummary.failed - 1);
  }
  persistSchoolState();
  return plugin.testSummary;
}
