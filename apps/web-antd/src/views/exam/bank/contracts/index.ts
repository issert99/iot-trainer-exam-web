import type {
  AssembledPaper,
  BankQuestion,
  ChannelFit,
  Primitive,
} from '../types';

import { integrityChecksum } from '#/platform/integrity';

export { integrityChecksum } from '#/platform/integrity';

export const ASSESSMENT_CONTRACT_VERSION = '1.0.0';

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type DeliveryChannel = 'online' | 'print';
export type RevisionStatus = 'approved' | 'draft' | 'published' | 'retired';

export type ChannelVariantMode =
  | 'equivalent'
  | 'examiner-recorded'
  | 'native'
  | 'unsupported';

export type ChannelVariant = {
  channel: DeliveryChannel;
  mode: ChannelVariantMode;
  note?: string;
  sourceRevisionId?: string;
};

export type ChannelCompatibilityIssue = {
  blocking: boolean;
  channel: DeliveryChannel;
  code:
    | 'CHANNEL_NOT_SUPPORTED'
    | 'PRINT_FALLBACK_REQUIRED'
    | 'RENDERER_MISSING'
    | 'VALIDATION_FAILED';
  message: string;
  questionId: string;
  questionTitle: string;
};

export type ItemRevision = {
  channelVariants: ChannelVariant[];
  checksum: string;
  contractVersion: typeof ASSESSMENT_CONTRACT_VERSION;
  createdAt: string;
  createdBy: string;
  itemId: string;
  question: BankQuestion;
  revision: number;
  revisionId: string;
  status: RevisionStatus;
  tenantId: string;
};

export type TestFormRevision = {
  checksum: string;
  compatibilityIssues: ChannelCompatibilityIssue[];
  contractVersion: typeof ASSESSMENT_CONTRACT_VERSION;
  frozenAt: string;
  frozenBy: string;
  itemRevisionIds: string[];
  paper: AssembledPaper;
  paperId: string;
  revision: number;
  revisionId: string;
  status: 'sealed';
  tenantId: string;
};

export type AttachmentReference = {
  contentHash: string;
  id: string;
  mimeType: string;
  name: string;
  size: number;
};

export type ResponseValue =
  | JsonValue
  | {
      attachments: AttachmentReference[];
      note?: string;
    };

export type ResponseEnvelope = {
  primitive: Primitive;
  value: ResponseValue;
};

export type ResponseEvent = {
  attemptId: string;
  clientTimestamp: string;
  eventId: string;
  eventType: 'answer-cleared' | 'answer-saved' | 'flag-changed';
  payload: ResponseEnvelope | { flagged: boolean };
  questionId: string;
  sequence: number;
  serverTimestamp: string;
  tenantId: string;
};

export type SubmissionSnapshot = {
  attemptId: string;
  checksum: string;
  createdAt: string;
  eventSequence: number;
  responses: Record<string, ResponseEnvelope>;
  snapshotId: string;
  tenantId: string;
  testFormRevisionId: string;
};

export type ScoreMethod = 'automatic' | 'human' | 'moderated';
export type ScoreStatus =
  | 'auto-scored'
  | 'final'
  | 'manual-required'
  | 'moderation-required';

export type ScoreEvidence = {
  code: string;
  detail: string;
};

export type ScoreRecord = {
  algorithmVersion?: string;
  attemptId: string;
  awardedScore: number;
  evidence: ScoreEvidence[];
  maxScore: number;
  method: ScoreMethod;
  questionId: string;
  recordId: string;
  reviewedAt?: string;
  scorerId?: string;
  status: ScoreStatus;
  tenantId: string;
};

export type ExamAssuranceLevel = 'course' | 'high-stakes' | 'standard';
export type ExamEventStatus =
  | 'closed'
  | 'draft'
  | 'in-progress'
  | 'published'
  | 'scoring';

export type ExamEvent = {
  approvalActorIds: string[];
  assuranceLevel: ExamAssuranceLevel;
  candidateIds: string[];
  createdAt: string;
  createdBy: string;
  deliveryMode: 'hybrid' | 'online' | 'print';
  endAt: string;
  eventId: string;
  name: string;
  settings: {
    allowResume: boolean;
    randomizeItems: boolean;
    requireFullscreen: boolean;
  };
  startAt: string;
  status: ExamEventStatus;
  tenantId: string;
  testFormRevisionId: string;
};

export type AttemptStatus =
  | 'in-progress'
  | 'not-started'
  | 'scored'
  | 'submitted';

export type CandidateAttempt = {
  attemptId: string;
  candidateId: string;
  eventId: string;
  lastSavedAt?: string;
  responses: Record<string, ResponseEnvelope>;
  sequence: number;
  startedAt?: string;
  status: AttemptStatus;
  submittedAt?: string;
  tenantId: string;
  testFormRevisionId: string;
};

function clonePlain<T>(value: T): T {
  return structuredClone(value);
}

function variantsFor(channel: ChannelFit): ChannelVariant[] {
  return [
    {
      channel: 'online',
      mode: channel === 'paper' ? 'unsupported' : 'native',
      note: channel === 'paper' ? '需要在线等价变体或考官记录' : undefined,
    },
    {
      channel: 'print',
      mode: channel === 'cbt' ? 'unsupported' : 'native',
      note: channel === 'cbt' ? '需要纸质等价变体或禁止纸考' : undefined,
    },
  ];
}

export function createItemRevision(
  question: BankQuestion,
  options: {
    createdBy: string;
    revision: number;
    status?: RevisionStatus;
    tenantId: string;
  },
): ItemRevision {
  const createdAt = new Date().toISOString();
  const revisionId = `${question.id}@${options.revision}`;
  const snapshot = clonePlain(question);
  return {
    channelVariants: variantsFor(question.channel),
    checksum: integrityChecksum(snapshot),
    contractVersion: ASSESSMENT_CONTRACT_VERSION,
    createdAt,
    createdBy: options.createdBy,
    itemId: question.id,
    question: snapshot,
    revision: options.revision,
    revisionId,
    status: options.status ?? 'published',
    tenantId: options.tenantId,
  };
}

export function createTestFormRevision(
  paper: AssembledPaper,
  itemRevisionIds: string[],
  compatibilityIssues: ChannelCompatibilityIssue[],
  options: {
    frozenBy: string;
    revision: number;
    tenantId: string;
  },
): TestFormRevision {
  const frozenAt = new Date().toISOString();
  const snapshot = clonePlain(paper);
  const revisionId = `${paper.id}@${options.revision}`;
  return {
    checksum: integrityChecksum({
      compatibilityIssues,
      itemRevisionIds,
      paper: snapshot,
    }),
    compatibilityIssues: clonePlain(compatibilityIssues),
    contractVersion: ASSESSMENT_CONTRACT_VERSION,
    frozenAt,
    frozenBy: options.frozenBy,
    itemRevisionIds: [...itemRevisionIds],
    paper: snapshot,
    paperId: paper.id,
    revision: options.revision,
    revisionId,
    status: 'sealed',
    tenantId: options.tenantId,
  };
}
