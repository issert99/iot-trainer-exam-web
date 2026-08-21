import type {
  CandidateAttempt,
  ExamDeliveryMode,
  ExamEvent,
  ExamEventStatus,
  JsonObject,
  JsonValue,
  PaperBatch,
  ResponseEnvelope,
  ResponseEvent,
  SubmissionSnapshot,
} from '../domain/types';

import { computed } from 'vue';

import { checksum, clone, uid } from '../domain/integrity';
import {
  appendSchoolAudit,
  persistSchoolState,
  schoolAssessmentState,
} from './state';

export const activeExamEvents = computed(() =>
  schoolAssessmentState.events.filter((event) =>
    ['in-progress', 'ready', 'scheduled', 'scoring'].includes(event.status),
  ),
);

export function getExamEvent(id: string) {
  return schoolAssessmentState.events.find((event) => event.id === id);
}

export function getAttempt(id: string) {
  return schoolAssessmentState.attempts.find((attempt) => attempt.id === id);
}

export function createExamEvent(input: {
  candidateIds: string[];
  deliveryMode: ExamDeliveryMode;
  endAt: string;
  name: string;
  startAt: string;
  testFormRevisionId: string;
}) {
  const form = schoolAssessmentState.forms.find(
    (entry) => entry.id === input.testFormRevisionId,
  );
  if (!form || form.status !== 'sealed') {
    throw new Error('考试只能引用已封存试卷');
  }
  const event: ExamEvent = {
    approvalActorIds: [],
    assuranceLevel: 'standard',
    candidateIds: [...input.candidateIds],
    createdAt: new Date().toISOString(),
    createdBy: 'exam-manager',
    deliveryMode: input.deliveryMode,
    endAt: input.endAt,
    id: uid('event'),
    name: input.name,
    settings: {
      allowResume: input.deliveryMode === 'online',
      extraTimePercent: 0,
      randomizeItems: input.deliveryMode === 'online',
      requireFullscreen: input.deliveryMode === 'online',
    },
    startAt: input.startAt,
    status: 'draft',
    testFormRevisionId: form.id,
  };
  schoolAssessmentState.events.unshift(event);
  appendSchoolAudit({
    action: 'exam.created',
    actorId: event.createdBy,
    metadata: { deliveryMode: event.deliveryMode },
    resourceId: event.id,
    resourceType: 'exam-event',
  });
  persistSchoolState();
  return event;
}

const eventTransitions: Record<ExamEventStatus, ExamEventStatus[]> = {
  cancelled: [],
  closed: [],
  draft: ['cancelled', 'scheduled'],
  'in-progress': ['cancelled', 'scoring'],
  published: ['closed'],
  ready: ['cancelled', 'in-progress'],
  'result-pending': ['published', 'scoring'],
  scheduled: ['cancelled', 'ready'],
  scoring: ['result-pending'],
};

export function transitionExamEvent(
  id: string,
  status: ExamEventStatus,
  actorId = 'exam-manager',
) {
  const event = getExamEvent(id);
  if (!event) throw new Error('考试场次不存在');
  if (!eventTransitions[event.status].includes(status)) {
    throw new Error(`不能从 ${event.status} 转换为 ${status}`);
  }
  if (status === 'scheduled' && event.approvalActorIds.length === 0) {
    event.approvalActorIds.push(actorId);
  }
  event.status = status;
  appendSchoolAudit({
    action: `exam.${status}`,
    actorId,
    resourceId: event.id,
    resourceType: 'exam-event',
  });
  persistSchoolState();
  return event;
}

export function createPaperBatch(
  eventId: string,
  bookletCount: number,
): PaperBatch {
  const event = getExamEvent(eventId);
  if (!event || event.deliveryMode !== 'paper') {
    throw new Error('该场次不是纸笔考试');
  }
  const batch: PaperBatch = {
    bookletCount,
    collectedCount: 0,
    eventId,
    id: uid('paper-batch'),
    printedCount: 0,
    status: 'printing',
  };
  schoolAssessmentState.paperBatches.unshift(batch);
  persistSchoolState();
  return batch;
}

export function advancePaperBatch(id: string) {
  const batch = schoolAssessmentState.paperBatches.find(
    (entry) => entry.id === id,
  );
  if (!batch) throw new Error('印制批次不存在');
  switch (batch.status) {
    case 'collected': {
      batch.status = 'scanning';

      break;
    }
    case 'distributed': {
      batch.collectedCount = batch.bookletCount;
      batch.status = 'collected';

      break;
    }
    case 'printing': {
      batch.printedCount = batch.bookletCount;
      batch.status = 'ready';

      break;
    }
    case 'ready': {
      batch.handedOverAt = new Date().toISOString();
      batch.status = 'distributed';

      break;
    }
    // No default
  }
  persistSchoolState();
  return batch;
}

export function completeScanReview(scanJobId: string) {
  const job = schoolAssessmentState.scanJobs.find(
    (entry) => entry.id === scanJobId,
  );
  if (!job) throw new Error('扫描任务不存在');
  const batch = schoolAssessmentState.paperBatches.find(
    (entry) => entry.id === job.batchId,
  );
  const event = batch ? getExamEvent(batch.eventId) : undefined;
  const form = event
    ? schoolAssessmentState.forms.find(
        (entry) => entry.id === event.testFormRevisionId,
      )
    : undefined;
  if (!batch || !event || !form) throw new Error('纸笔考试链路不完整');
  job.status = 'completed';
  job.reviewedCount = job.pageCount;
  job.errorCount = 0;
  event.candidateIds.forEach((candidateId) => {
    if (
      schoolAssessmentState.attempts.some(
        (attempt) =>
          attempt.eventId === event.id && attempt.candidateId === candidateId,
      )
    ) {
      return;
    }
    const submittedAt = new Date().toISOString();
    const attempt: CandidateAttempt = {
      candidateId,
      eventId: event.id,
      id: uid('paper-attempt'),
      responseSequence: form.sections.flatMap((section) => section.items)
        .length,
      responses: Object.fromEntries(
        form.sections.flatMap((section) =>
          section.items.map((entry) => [
            entry.itemRevision.id,
            {
              pluginId: entry.itemRevision.interaction.pluginId,
              value: {
                captureSource: 'paper-scan',
                verified: true,
              },
            },
          ]),
        ),
      ),
      status: 'submitted',
      submittedAt,
      testFormRevisionId: form.id,
    };
    schoolAssessmentState.attempts.push(attempt);
    const submission: SubmissionSnapshot = {
      attemptId: attempt.id,
      checksum: '',
      createdAt: submittedAt,
      id: uid('paper-submission'),
      responseSequence: attempt.responseSequence,
      responses: clone(attempt.responses),
      testFormRevisionId: form.id,
    };
    submission.checksum = checksum({ ...submission, checksum: undefined });
    schoolAssessmentState.submissions.push(submission);
  });
  event.status = 'scoring';
  appendSchoolAudit({
    action: 'paper-scan.review-completed',
    actorId: 'paper-reviewer',
    metadata: { pageCount: job.pageCount },
    resourceId: job.id,
    resourceType: 'scan-job',
  });
  persistSchoolState();
  return job;
}

export function submitPracticalEvidence(input: {
  candidateId: string;
  eventId: string;
  evidence?: JsonObject;
  evidenceRefs: string[];
  stationId: string;
}) {
  const event = getExamEvent(input.eventId);
  const station = schoolAssessmentState.practicalStations.find(
    (entry) => entry.id === input.stationId,
  );
  if (!event || event.deliveryMode !== 'practical' || !station) {
    throw new Error('实践考站不存在');
  }
  const attempt: CandidateAttempt = {
    candidateId: input.candidateId,
    eventId: event.id,
    id: uid('practical-attempt'),
    responseSequence: 1,
    responses: {
      [`station:${station.id}`]: {
        attachmentIds: [...input.evidenceRefs],
        pluginId: 'core.rubric',
        value: {
          evidenceRefs: [...input.evidenceRefs],
          examinerIds: [...station.examinerIds],
          signed: true,
          ...input.evidence,
        },
      },
    },
    startedAt: new Date().toISOString(),
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    testFormRevisionId: event.testFormRevisionId,
  };
  schoolAssessmentState.attempts.push(attempt);
  const submission: SubmissionSnapshot = {
    attemptId: attempt.id,
    checksum: '',
    createdAt: attempt.submittedAt ?? new Date().toISOString(),
    id: uid('practical-submission'),
    responseSequence: 1,
    responses: clone(attempt.responses),
    testFormRevisionId: event.testFormRevisionId,
  };
  submission.checksum = checksum({ ...submission, checksum: undefined });
  schoolAssessmentState.submissions.push(submission);
  station.status = 'closed';
  event.status = 'scoring';
  persistSchoolState();
  return attempt;
}

export function startAttempt(eventId: string, candidateId: string) {
  const event = getExamEvent(eventId);
  if (!event) throw new Error('考试场次不存在');
  if (!event.candidateIds.includes(candidateId)) {
    throw new Error('考生未被编排到该场次');
  }
  const existing = schoolAssessmentState.attempts.find(
    (attempt) =>
      attempt.eventId === eventId && attempt.candidateId === candidateId,
  );
  if (existing) return existing;
  if (!['in-progress', 'ready'].includes(event.status)) {
    throw new Error('当前场次不可开始');
  }
  event.status = 'in-progress';
  const attempt: CandidateAttempt = {
    candidateId,
    eventId,
    id: uid('attempt'),
    responseSequence: 0,
    responses: {},
    startedAt: new Date().toISOString(),
    status: 'in-progress',
    testFormRevisionId: event.testFormRevisionId,
  };
  schoolAssessmentState.attempts.push(attempt);
  appendSchoolAudit({
    action: 'attempt.started',
    actorId: candidateId,
    resourceId: attempt.id,
    resourceType: 'attempt',
  });
  persistSchoolState();
  return attempt;
}

export function saveAttemptResponse(
  attemptId: string,
  itemRevisionId: string,
  pluginId: string,
  value: JsonValue,
  idempotencyKey = uid('save-command'),
) {
  const attempt = getAttempt(attemptId);
  if (!attempt || attempt.status !== 'in-progress') {
    throw new Error('答卷不在作答状态');
  }
  const events =
    schoolAssessmentState.responseEvents as unknown as ResponseEvent[];
  const duplicate = events.find(
    (event) =>
      event.attemptId === attemptId && event.idempotencyKey === idempotencyKey,
  );
  if (duplicate) return duplicate;
  const payload: ResponseEnvelope = { pluginId, value: clone(value) };
  attempt.responseSequence += 1;
  attempt.responses[itemRevisionId] = payload;
  attempt.lastSavedAt = new Date().toISOString();
  const event: ResponseEvent = {
    attemptId,
    clientTimestamp: attempt.lastSavedAt,
    id: uid('response'),
    idempotencyKey,
    itemRevisionId,
    payload: clone(payload),
    sequence: attempt.responseSequence,
    syncState:
      schoolAssessmentState.connection === 'online' ? 'synced' : 'pending',
  };
  events.push(event);
  persistSchoolState();
  return event;
}

export function setExamConnection(connection: 'offline' | 'online') {
  schoolAssessmentState.connection = connection;
  if (connection === 'online') {
    (
      schoolAssessmentState.responseEvents as unknown as ResponseEvent[]
    ).forEach((event) => {
      event.syncState = 'synced';
    });
  }
  persistSchoolState();
}

export function submitAttempt(attemptId: string): SubmissionSnapshot {
  const attempt = getAttempt(attemptId);
  if (!attempt) throw new Error('答卷不存在');
  const existing = schoolAssessmentState.submissions.find(
    (submission) => submission.attemptId === attemptId,
  );
  if (existing) return existing;
  if (attempt.status !== 'in-progress') throw new Error('答卷不能重复提交');
  const snapshot: SubmissionSnapshot = {
    attemptId,
    checksum: '',
    createdAt: new Date().toISOString(),
    id: uid('submission'),
    responseSequence: attempt.responseSequence,
    responses: clone(attempt.responses),
    testFormRevisionId: attempt.testFormRevisionId,
  };
  snapshot.checksum = checksum({ ...snapshot, checksum: undefined });
  schoolAssessmentState.submissions.push(snapshot);
  attempt.status = 'submitted';
  attempt.submittedAt = snapshot.createdAt;
  const event = getExamEvent(attempt.eventId);
  if (event) event.status = 'scoring';
  appendSchoolAudit({
    action: 'attempt.submitted',
    actorId: attempt.candidateId,
    metadata: { checksum: snapshot.checksum },
    resourceId: attempt.id,
    resourceType: 'attempt',
  });
  persistSchoolState();
  return snapshot;
}
