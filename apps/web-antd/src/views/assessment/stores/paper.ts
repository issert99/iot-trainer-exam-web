import type {
  AssessmentBlueprint,
  AssessmentItemRevision,
  CompatibilityIssue,
  DeliveryChannel,
  TestFormRevision,
} from '../domain/types';

import { computed, reactive } from 'vue';

import { checksum, clone } from '../domain/integrity';
import {
  appendSchoolAudit,
  persistSchoolState,
  schoolAssessmentState,
} from './state';

export const paperBasket = reactive<{
  itemIds: string[];
  name: string;
}>({
  itemIds: ['item-calculus-choice@2', 'item-integral-numeric@1'],
  name: '工程基础临时选题篮',
});

export const publishedItems = computed(() =>
  schoolAssessmentState.itemRevisions.filter(
    (item) => item.status === 'published',
  ),
);

function matchesTaxonomy(item: AssessmentItemRevision, selectedNodeId: string) {
  return item.classification.taxonomyNodeIds.some((itemNodeId) => {
    let current = schoolAssessmentState.taxonomyNodes.find(
      (node) => node.id === itemNodeId,
    );
    while (current) {
      if (current.id === selectedNodeId) return true;
      current = current.parentId
        ? schoolAssessmentState.taxonomyNodes.find(
            (node) => node.id === current?.parentId,
          )
        : undefined;
    }
    return false;
  });
}

function matchesBlueprintRule(
  item: AssessmentItemRevision,
  rule: AssessmentBlueprint['sections'][number]['rules'][number],
) {
  const difficulty = item.metadata.difficulty;
  return (
    difficulty >= rule.difficultyRange[0] &&
    difficulty <= rule.difficultyRange[1] &&
    (rule.interactionIds.length === 0 ||
      rule.interactionIds.includes(item.interaction.pluginId)) &&
    (rule.applicabilityMajorIds.length === 0 ||
      rule.applicabilityMajorIds.some((majorId) =>
        item.metadata.applicability.majorIds.includes(majorId),
      )) &&
    (rule.taxonomyNodeIds.length === 0 ||
      rule.taxonomyNodeIds.some((nodeId) => matchesTaxonomy(item, nodeId)))
  );
}

function compatibilityIssues(
  items: AssessmentItemRevision[],
  channels: DeliveryChannel[],
) {
  const issues: CompatibilityIssue[] = [];
  items.forEach((item) => {
    channels.forEach((channel) => {
      const variant = item.channelVariants.find(
        (entry) => entry.channel === channel,
      );
      if (!variant || variant.mode === 'unsupported') {
        issues.push({
          blocking: true,
          channel,
          code: 'CHANNEL_UNSUPPORTED',
          itemRevisionId: item.id,
          message: `${item.title} 不支持 ${channel} 渠道`,
        });
      } else if (variant.mode !== 'native') {
        issues.push({
          blocking: false,
          channel,
          code: 'CHANNEL_EQUIVALENT',
          itemRevisionId: item.id,
          message: `${item.title} 将使用 ${variant.mode} 呈现`,
        });
      }
    });
  });
  return issues;
}

export function addToPaperBasket(itemId: string) {
  if (!paperBasket.itemIds.includes(itemId)) {
    paperBasket.itemIds.push(itemId);
  }
}

export function removeFromPaperBasket(itemId: string) {
  paperBasket.itemIds = paperBasket.itemIds.filter((id) => id !== itemId);
}

export function assembleFromBlueprint(
  blueprintId: string,
  variant = 'A',
  actorId = 'paper-editor',
) {
  const blueprint = schoolAssessmentState.blueprints.find(
    (entry) => entry.id === blueprintId,
  );
  if (!blueprint) throw new Error('命题蓝图不存在');
  const used = new Set<string>();
  const assemblyIssues: CompatibilityIssue[] = [];
  const sections = blueprint.sections.map((section) => ({
    id: section.id,
    items: section.rules.flatMap((rule) => {
      const selected = publishedItems.value
        .filter((item) => !used.has(item.id))
        .filter((item) => matchesBlueprintRule(item, rule))
        .toSorted(
          (left, right) =>
            left.metadata.quality.exposureCount -
            right.metadata.quality.exposureCount,
        )
        .slice(0, rule.count);
      if (selected.length < rule.count) {
        assemblyIssues.push({
          blocking: true,
          channel: rule.channels[0] ?? blueprint.channels[0] ?? 'online',
          code: 'BLUEPRINT_QUOTA_MISSING',
          itemRevisionId: section.id,
          message: `${section.name} 缺少 ${rule.count - selected.length} 道满足规则的已发布题目`,
        });
      }
      selected.forEach((item) => used.add(item.id));
      return selected.map((item) => ({
        itemRevision: clone(item),
        score: rule.scorePerItem,
      }));
    }),
    name: section.name,
  }));
  const selectedItems = sections.flatMap((section) =>
    section.items.map((entry) => entry.itemRevision),
  );
  if (selectedItems.length === 0) throw new Error('蓝图没有匹配到可用题目');
  const revision =
    Math.max(
      0,
      ...schoolAssessmentState.forms
        .filter((form) => form.blueprintId === blueprintId)
        .map((form) => form.revision),
    ) + 1;
  const assembledScore = sections
    .flatMap((section) => section.items)
    .reduce((total, entry) => total + entry.score, 0);
  if (assembledScore !== blueprint.totalScore) {
    assemblyIssues.push({
      blocking: true,
      channel: blueprint.channels[0] ?? 'online',
      code: 'BLUEPRINT_SCORE_MISMATCH',
      itemRevisionId: blueprint.id,
      message: `组卷总分 ${assembledScore} 与蓝图总分 ${blueprint.totalScore} 不一致`,
    });
  }
  const form: TestFormRevision = {
    blueprintId,
    channels: [...blueprint.channels],
    checksum: '',
    compatibility: [
      ...assemblyIssues,
      ...compatibilityIssues(selectedItems, blueprint.channels),
    ],
    createdAt: new Date().toISOString(),
    createdBy: actorId,
    durationMinutes: blueprint.durationMinutes,
    id: `form-${blueprintId}-${variant}@${revision}`,
    name: `${blueprint.name} · ${variant} 卷`,
    onlineProfile: {
      allowBacktrack: true,
      calculator: true,
      id: 'online-standard',
      name: '标准机考',
      navigation: 'one-per-page',
    },
    printProfile: {
      answerArea: 'separate-booklet',
      bindingEdgeMillimeters: 12,
      columns: 1,
      duplex: true,
      fontSizePoints: 11,
      id: 'print-a4-standard',
      name: 'A4 双面标准卷',
      pageSize: 'A4',
    },
    revision,
    sections,
    status: 'draft',
    totalScore: assembledScore,
    variant,
  };
  form.checksum = checksum({ ...form, checksum: undefined });
  schoolAssessmentState.forms.unshift(form);
  appendSchoolAudit({
    action: 'paper.assembled',
    actorId,
    metadata: {
      blueprintId,
      itemCount: selectedItems.length,
      variant,
    },
    resourceId: form.id,
    resourceType: 'test-form',
  });
  persistSchoolState();
  return form;
}

export function createFormFromBasket(actorId = 'paper-editor') {
  const revisions =
    schoolAssessmentState.itemRevisions as unknown as AssessmentItemRevision[];
  const items: AssessmentItemRevision[] = paperBasket.itemIds.flatMap((id) => {
    const item = revisions.find((entry) => entry.id === id);
    return item ? [item] : [];
  });
  if (items.length === 0) throw new Error('选题篮为空');
  const revision = schoolAssessmentState.forms.length + 1;
  const form: TestFormRevision = {
    blueprintId: 'manual',
    channels: ['online', 'print'],
    checksum: '',
    compatibility: compatibilityIssues(items, ['online', 'print']),
    createdAt: new Date().toISOString(),
    createdBy: actorId,
    durationMinutes: 90,
    id: `form-manual@${revision}`,
    name: paperBasket.name,
    onlineProfile: {
      allowBacktrack: true,
      calculator: false,
      id: 'online-manual',
      name: '手工组卷机考',
      navigation: 'scroll',
    },
    printProfile: {
      answerArea: 'lines',
      bindingEdgeMillimeters: 12,
      columns: 1,
      duplex: true,
      fontSizePoints: 11,
      id: 'print-manual',
      name: '手工组卷打印',
      pageSize: 'A4',
    },
    revision,
    sections: [
      {
        id: 'manual-section',
        items: items.map((item) => ({
          itemRevision: clone(item),
          score: item.maxScore,
        })),
        name: '选题篮试题',
      },
    ],
    status: 'draft',
    totalScore: items.reduce((total, item) => total + item.maxScore, 0),
    variant: '自定义',
  };
  form.checksum = checksum({ ...form, checksum: undefined });
  schoolAssessmentState.forms.unshift(form);
  persistSchoolState();
  return form;
}

export function setFormStatus(
  formId: string,
  nextStatus: TestFormRevision['status'],
  actorId = 'paper-approver',
) {
  const form = schoolAssessmentState.forms.find((entry) => entry.id === formId);
  if (!form) throw new Error('试卷不存在');
  if (form.status !== nextStatus) {
    const transitions: Record<
      TestFormRevision['status'],
      TestFormRevision['status'][]
    > = {
      archived: [],
      draft: ['proofing'],
      proofing: ['draft', 'under-approval'],
      sealed: ['archived'],
      'under-approval': ['proofing', 'sealed'],
    };
    if (!transitions[form.status].includes(nextStatus)) {
      throw new Error(`试卷不能从 ${form.status} 直接转换为 ${nextStatus}`);
    }
  }
  if (
    nextStatus === 'sealed' &&
    form.compatibility.some((issue) => issue.blocking)
  ) {
    throw new Error('仍有渠道阻断项，不能封存');
  }
  form.status = nextStatus;
  appendSchoolAudit({
    action: `paper.${nextStatus}`,
    actorId,
    metadata: { checksum: form.checksum },
    resourceId: form.id,
    resourceType: 'test-form',
  });
  persistSchoolState();
  return form;
}
