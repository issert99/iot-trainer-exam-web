import type { ScoreRecord } from '../domain/types';

import { computed } from 'vue';

import { uid } from '../domain/integrity';
import { scoreWithPlugin } from '../plugins/registry';
import {
  appendSchoolAudit,
  persistSchoolState,
  schoolAssessmentState,
} from './state';

export const scoringTasks = computed(() =>
  schoolAssessmentState.scoreRecords.filter(
    (record) => record.status !== 'final',
  ),
);

export const moderationTasks = computed(() =>
  schoolAssessmentState.scoreRecords.filter(
    (record) => record.status === 'moderation-required',
  ),
);

export function ensureAttemptScoreRecords(attemptId: string) {
  const attempt = schoolAssessmentState.attempts.find(
    (entry) => entry.id === attemptId,
  );
  if (!attempt) throw new Error('答卷不存在');
  const form = schoolAssessmentState.forms.find(
    (entry) => entry.id === attempt.testFormRevisionId,
  );
  if (!form) throw new Error('冻结试卷不存在');
  const existing = new Set(
    schoolAssessmentState.scoreRecords
      .filter((record) => record.attemptId === attemptId)
      .map((record) => record.itemRevisionId),
  );
  form.sections
    .flatMap((section) => section.items)
    .filter((entry) => !existing.has(entry.itemRevision.id))
    .forEach((entry) => {
      const result = scoreWithPlugin(
        entry.itemRevision,
        attempt.responses[entry.itemRevision.id],
        entry.score,
      );
      const automatic = !result.requiresHumanReview;
      const record: ScoreRecord = {
        algorithmVersion: `${entry.itemRevision.interaction.pluginId}@${entry.itemRevision.interaction.pluginVersion}`,
        attemptId,
        awardedScore: result.awardedScore,
        evidence: result.evidence,
        id: uid('score'),
        itemRevisionId: entry.itemRevision.id,
        maxScore: entry.score,
        method: automatic ? 'automatic' : 'human',
        status: automatic ? 'automatic' : 'manual-required',
      };
      schoolAssessmentState.scoreRecords.push(record);
    });
  persistSchoolState();
}

export function recordFirstMark(
  recordId: string,
  score: number,
  comment: string,
  scorerId = 'marker-first',
) {
  const record = schoolAssessmentState.scoreRecords.find(
    (entry) => entry.id === recordId,
  );
  if (
    !record ||
    record.method === 'automatic' ||
    !['assigned', 'manual-required'].includes(record.status)
  ) {
    throw new Error('评分任务不存在或无需人工评分');
  }
  record.firstScore = Math.min(record.maxScore, Math.max(0, score));
  record.awardedScore = record.firstScore;
  record.status = 'first-marked';
  record.scorerId = scorerId;
  record.evidence.push(comment || '一评完成');
  appendSchoolAudit({
    action: 'score.first-marked',
    actorId: scorerId,
    metadata: { score: record.firstScore },
    resourceId: record.id,
    resourceType: 'score-record',
  });
  persistSchoolState();
}

export function recordSecondMark(
  recordId: string,
  score: number,
  comment: string,
  scorerId = 'marker-second',
) {
  const record = schoolAssessmentState.scoreRecords.find(
    (entry) => entry.id === recordId,
  );
  if (
    !record ||
    record.firstScore === undefined ||
    record.status !== 'first-marked'
  ) {
    throw new Error('必须先完成一评');
  }
  record.secondScore = Math.min(record.maxScore, Math.max(0, score));
  const difference = Math.abs(record.firstScore - record.secondScore);
  const tolerance = Math.max(1, record.maxScore * 0.1);
  record.status =
    difference > tolerance ? 'moderation-required' : 'second-marked';
  record.awardedScore =
    difference > tolerance
      ? record.awardedScore
      : (record.firstScore + record.secondScore) / 2;
  record.evidence.push(comment || '二评完成');
  appendSchoolAudit({
    action: 'score.second-marked',
    actorId: scorerId,
    metadata: { difference, score: record.secondScore },
    resourceId: record.id,
    resourceType: 'score-record',
  });
  persistSchoolState();
}

export function moderateScore(
  recordId: string,
  score: number,
  comment: string,
  scorerId = 'moderator',
) {
  const record = schoolAssessmentState.scoreRecords.find(
    (entry) => entry.id === recordId,
  );
  if (!record || record.status !== 'moderation-required') {
    throw new Error('评分记录不需要仲裁');
  }
  record.awardedScore = Math.min(record.maxScore, Math.max(0, score));
  record.method = 'moderated';
  record.scorerId = scorerId;
  record.reviewedAt = new Date().toISOString();
  record.status = 'final';
  record.evidence.push(comment || '仲裁完成');
  persistSchoolState();
}

export function finalizeAttemptScore(
  attemptId: string,
  actorId = 'score-reviewer',
) {
  const attempt = schoolAssessmentState.attempts.find(
    (entry) => entry.id === attemptId,
  );
  if (!attempt) throw new Error('答卷不存在');
  const records = schoolAssessmentState.scoreRecords.filter(
    (record) => record.attemptId === attemptId,
  );
  if (
    records.some((record) =>
      ['assigned', 'manual-required', 'moderation-required'].includes(
        record.status,
      ),
    )
  ) {
    throw new Error('仍有未完成评分或仲裁的题目');
  }
  records.forEach((record) => {
    record.status = 'final';
    record.reviewedAt ??= new Date().toISOString();
  });
  attempt.status = 'reviewed';
  const event = schoolAssessmentState.events.find(
    (entry) => entry.id === attempt.eventId,
  );
  if (event) event.status = 'result-pending';
  appendSchoolAudit({
    action: 'score.finalized',
    actorId,
    resourceId: attemptId,
    resourceType: 'attempt',
  });
  persistSchoolState();
}

export function publishAttemptResult(
  attemptId: string,
  actorId = 'result-manager',
) {
  const attempt = schoolAssessmentState.attempts.find(
    (entry) => entry.id === attemptId,
  );
  if (!attempt || attempt.status !== 'reviewed') {
    throw new Error('成绩尚未完成复核');
  }
  attempt.status = 'published';
  const event = schoolAssessmentState.events.find(
    (entry) => entry.id === attempt.eventId,
  );
  if (event) event.status = 'published';
  appendSchoolAudit({
    action: 'result.published',
    actorId,
    resourceId: attemptId,
    resourceType: 'attempt',
  });
  persistSchoolState();
}

export function resolveAppeal(
  appealId: string,
  resolution: string,
  accepted: boolean,
) {
  const appeal = schoolAssessmentState.appeals.find(
    (entry) => entry.id === appealId,
  );
  if (!appeal) throw new Error('申诉不存在');
  appeal.resolution = resolution;
  appeal.status = accepted ? 'accepted' : 'rejected';
  appendSchoolAudit({
    action: accepted ? 'appeal.accepted' : 'appeal.rejected',
    actorId: 'result-reviewer',
    metadata: { resolution },
    resourceId: appeal.id,
    resourceType: 'result-appeal',
  });
  persistSchoolState();
}

export function createScoreCorrection(
  sourceRecordId: string,
  correctedScore: number,
  reason: string,
  actorId = 'result-reviewer',
) {
  const source = schoolAssessmentState.scoreRecords.find(
    (record) => record.id === sourceRecordId,
  );
  if (!source || source.status !== 'final') {
    throw new Error('只能更正已锁定评分记录');
  }
  const correction: ScoreRecord = {
    ...source,
    awardedScore: Math.min(source.maxScore, Math.max(0, correctedScore)),
    evidence: [
      ...source.evidence,
      `更正来源 ${source.id}`,
      reason || '成绩复核更正',
    ],
    id: uid('score-correction'),
    method: 'moderated',
    reviewedAt: new Date().toISOString(),
    scorerId: actorId,
    status: 'final',
    supersedesRecordId: source.id,
  };
  source.supersededByRecordId = correction.id;
  schoolAssessmentState.scoreRecords.push(correction);
  appendSchoolAudit({
    action: 'score.corrected',
    actorId,
    metadata: {
      correctedScore: correction.awardedScore,
      sourceRecordId,
    },
    resourceId: correction.id,
    resourceType: 'score-record',
  });
  persistSchoolState();
  return correction;
}

export function attemptScoreSummary(attemptId: string) {
  const records = schoolAssessmentState.scoreRecords.filter(
    (record) => record.attemptId === attemptId && !record.supersededByRecordId,
  );
  return {
    awarded: records.reduce((total, record) => total + record.awardedScore, 0),
    maximum: records.reduce((total, record) => total + record.maxScore, 0),
    pending: records.filter((record) => record.status !== 'final').length,
  };
}
