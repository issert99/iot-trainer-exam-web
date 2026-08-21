import type {
  AssessmentItemRevision,
  ContentDocument,
  ItemClassification,
  ItemMetadata,
  JsonObject,
} from '../domain/types';

import { computed } from 'vue';

import { checksum, clone, uid } from '../domain/integrity';
import {
  appendSchoolAudit,
  persistSchoolState,
  schoolAssessmentState,
} from './state';

export const itemReviewQueue = computed(() =>
  schoolAssessmentState.itemRevisions.filter((item) =>
    ['rejected', 'review'].includes(item.status),
  ),
);

export function getItemRevision(id: string) {
  return schoolAssessmentState.itemRevisions.find((item) => item.id === id);
}

export function getItemFamily(familyId: string) {
  return schoolAssessmentState.itemRevisions
    .filter((item) => item.familyId === familyId)
    .toSorted((left, right) => right.revision - left.revision);
}

export function createItemDraft(input: {
  classification: ItemClassification;
  document?: ContentDocument;
  interaction: AssessmentItemRevision['interaction'];
  maxScore: number;
  metadata: ItemMetadata;
  stemText: string;
  title: string;
}) {
  const familyId = uid('item-family');
  const item: AssessmentItemRevision = {
    channelVariants: [
      { channel: 'online', mode: 'native' },
      { channel: 'print', mode: 'equivalent' },
      { channel: 'practical', mode: 'equivalent' },
    ],
    checksum: '',
    classification: clone(input.classification),
    createdAt: new Date().toISOString(),
    createdBy: 'teacher-demo',
    familyId,
    id: `${familyId}@1`,
    interaction: clone(input.interaction),
    language: 'zh-CN',
    maxScore: input.maxScore,
    metadata: clone(input.metadata),
    revision: 1,
    scoring: {
      config: {},
      mode: 'hybrid',
      policyVersion: '1.0',
    },
    status: 'draft',
    stem: input.document
      ? clone(input.document)
      : {
          blocks: [
            {
              data: { text: input.stemText },
              id: uid('block'),
              type: 'paragraph',
            },
          ],
          schemaVersion: '1.0',
        },
    title: input.title,
  };
  item.checksum = checksum({ ...item, checksum: undefined });
  schoolAssessmentState.itemRevisions.unshift(item);
  schoolAssessmentState.activeItemId = item.id;
  appendSchoolAudit({
    action: 'item.created',
    actorId: item.createdBy,
    metadata: {
      primaryCourseId: item.metadata.ownership.primaryCourseId,
    },
    resourceId: item.id,
    resourceType: 'item-revision',
  });
  persistSchoolState();
  return item;
}

export function createItemRevision(
  sourceId: string,
  patch: {
    classification?: ItemClassification;
    document?: ContentDocument;
    interaction?: AssessmentItemRevision['interaction'];
    interactionConfig?: JsonObject;
    maxScore?: number;
    metadata?: ItemMetadata;
    stemText?: string;
    title?: string;
  },
) {
  const source = getItemRevision(sourceId);
  if (!source) throw new Error('题目版本不存在');
  const revision =
    Math.max(...getItemFamily(source.familyId).map((item) => item.revision)) +
    1;
  const item = clone(source);
  item.id = `${item.familyId}@${revision}`;
  item.revision = revision;
  item.status = 'draft';
  item.reviewComment = undefined;
  item.createdAt = new Date().toISOString();
  item.createdBy = 'teacher-demo';
  item.title = patch.title ?? item.title;
  item.maxScore = patch.maxScore ?? item.maxScore;
  item.classification = patch.classification ?? item.classification;
  item.metadata = patch.metadata ?? item.metadata;
  item.interaction = patch.interaction
    ? clone(patch.interaction)
    : {
        ...item.interaction,
        config: patch.interactionConfig ?? item.interaction.config,
      };
  if (patch.document) {
    item.stem = clone(patch.document);
  } else if (patch.stemText !== undefined) {
    item.stem.blocks = [
      {
        data: { text: patch.stemText },
        id: uid('block'),
        type: 'paragraph',
      },
    ];
  }
  item.checksum = checksum({ ...item, checksum: undefined });
  schoolAssessmentState.itemRevisions.unshift(item);
  schoolAssessmentState.activeItemId = item.id;
  appendSchoolAudit({
    action: 'item.revision-created',
    actorId: item.createdBy,
    metadata: { sourceId },
    resourceId: item.id,
    resourceType: 'item-revision',
  });
  persistSchoolState();
  return item;
}

export function updateItemDraft(
  id: string,
  patch: {
    classification?: ItemClassification;
    document?: ContentDocument;
    interaction?: AssessmentItemRevision['interaction'];
    maxScore?: number;
    metadata?: ItemMetadata;
    stemText?: string;
    title?: string;
  },
) {
  const item = getItemRevision(id);
  if (!item || !['draft', 'rejected'].includes(item.status)) {
    throw new Error('只有草稿或退回版本可以继续编辑');
  }
  item.title = patch.title ?? item.title;
  item.maxScore = patch.maxScore ?? item.maxScore;
  item.classification = patch.classification ?? item.classification;
  item.metadata = patch.metadata ?? item.metadata;
  item.interaction = patch.interaction
    ? clone(patch.interaction)
    : item.interaction;
  if (patch.document) {
    item.stem = clone(patch.document);
  } else if (patch.stemText !== undefined) {
    item.stem.blocks = [
      {
        data: { text: patch.stemText },
        id: uid('block'),
        type: 'paragraph',
      },
    ];
  }
  item.status = 'draft';
  item.reviewComment = undefined;
  item.checksum = checksum({ ...item, checksum: undefined });
  appendSchoolAudit({
    action: 'item.draft-saved',
    actorId: item.createdBy,
    resourceId: item.id,
    resourceType: 'item-revision',
  });
  persistSchoolState();
  return item;
}

export function submitItemReview(id: string, actorId = 'teacher-demo') {
  const item = getItemRevision(id);
  if (!item || !['draft', 'rejected'].includes(item.status)) {
    throw new Error('当前版本不能提交审核');
  }
  if (item.classification.taxonomyNodeIds.length === 0) {
    throw new Error('至少关联一个受控分类节点');
  }
  if (item.metadata.applicability.majorIds.length === 0) {
    throw new Error('至少声明一个适用专业');
  }
  item.status = 'review';
  item.reviewComment = undefined;
  appendSchoolAudit({
    action: 'item.review-submitted',
    actorId,
    resourceId: item.id,
    resourceType: 'item-revision',
  });
  persistSchoolState();
  return item;
}

export function reviewItem(
  id: string,
  decision: 'approve' | 'reject',
  comment: string,
  actorId = 'reviewer-demo',
) {
  const item = getItemRevision(id);
  if (!item || item.status !== 'review') {
    throw new Error('题目不在待审核状态');
  }
  item.status = decision === 'approve' ? 'approved' : 'rejected';
  item.reviewComment = comment;
  appendSchoolAudit({
    action: `item.review-${decision}`,
    actorId,
    metadata: { comment },
    resourceId: item.id,
    resourceType: 'item-revision',
  });
  persistSchoolState();
  return item;
}

export function publishItem(id: string, actorId = 'publisher-demo') {
  const item = getItemRevision(id);
  if (!item || item.status !== 'approved') {
    throw new Error('只有批准后的题目可以发布');
  }
  const plugin = schoolAssessmentState.pluginPackages.find(
    (entry) => entry.id === item.interaction.pluginId,
  );
  if (!plugin || plugin.status !== 'enabled') {
    throw new Error('题目引用的交互插件尚未启用');
  }
  if (item.interaction.kind === 'template') {
    const template = schoolAssessmentState.interactionTemplates.find(
      (entry) => entry.id === item.interaction.templateRevisionId,
    );
    if (!template || template.status !== 'enabled') {
      throw new Error('题目引用的无代码交互模板尚未启用');
    }
  }
  item.status = 'published';
  appendSchoolAudit({
    action: 'item.published',
    actorId,
    metadata: { checksum: item.checksum },
    resourceId: item.id,
    resourceType: 'item-revision',
  });
  persistSchoolState();
  return item;
}

export function suspendItem(id: string, actorId = 'quality-manager') {
  const item = getItemRevision(id);
  if (!item || item.status !== 'published') {
    throw new Error('只有已发布题目可以暂停');
  }
  item.status = 'suspended';
  appendSchoolAudit({
    action: 'item.suspended',
    actorId,
    resourceId: item.id,
    resourceType: 'item-revision',
  });
  persistSchoolState();
}
