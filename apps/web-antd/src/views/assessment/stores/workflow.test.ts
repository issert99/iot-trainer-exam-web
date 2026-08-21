import { beforeEach, describe, expect, it } from 'vitest';

import {
  filteredItemRevisions,
  itemFacetQuery,
  resetItemFacets,
} from './classification';
import {
  completeScanReview,
  createExamEvent,
  saveAttemptResponse,
  setExamConnection,
  startAttempt,
  submitAttempt,
  submitPracticalEvidence,
  transitionExamEvent,
} from './exam';
import {
  addInteractionControl,
  interactionDesignerDraft,
  runPluginTests,
  saveInteractionTemplate,
  setPluginStatus,
} from './interaction-designer';
import { createItemRevision, publishItem, reviewItem } from './item-bank';
import { assembleFromBlueprint, setFormStatus } from './paper';
import {
  attemptScoreSummary,
  createScoreCorrection,
  ensureAttemptScoreRecords,
  finalizeAttemptScore,
  moderateScore,
  publishAttemptResult,
  recordSecondMark,
} from './scoring';
import { resetSchoolPrototype, schoolAssessmentState } from './state';

describe('单校考试闭环状态机', () => {
  beforeEach(() => {
    resetSchoolPrototype();
    resetItemFacets();
  });

  it('支持课程、专业和受控分类组合检索', () => {
    itemFacetQuery.courseIds = ['course-calculus'];
    itemFacetQuery.cognitiveLevels = ['apply'];
    itemFacetQuery.difficulty = [3];
    itemFacetQuery.majorIds = ['major-mechanical'];
    itemFacetQuery.taxonomyNodeIds = ['node-integral'];

    expect(filteredItemRevisions.value.map((item) => item.id)).toContain(
      'item-calculus-choice@2',
    );
  });

  it('历史试卷继续引用冻结题目版本', () => {
    const sealed = schoolAssessmentState.forms.find(
      (form) => form.id === 'form-engineering-a@2',
    );
    const frozenId = sealed?.sections[0]?.items[0]?.itemRevision.id;
    const revision = createItemRevision('item-calculus-choice@2', {
      title: '定积分基础计算（修订）',
    });

    expect(revision.id).not.toBe(frozenId);
    expect(sealed?.sections[0]?.items[0]?.itemRevision.id).toBe(frozenId);
    expect(sealed?.sections[0]?.items[0]?.itemRevision.title).toBe(
      '定积分基础计算',
    );
  });

  it('教师可以保存新的无代码模板版本', () => {
    const before = interactionDesignerDraft.controls.length;
    addInteractionControl('matrix');
    const saved = saveInteractionTemplate();

    expect(saved.status).toBe('testing');
    expect(saved.controls.length).toBe(before + 1);
    expect(saved.checksum).toMatch(/^fnv1a-/);
  });

  it('题目必须经过审核批准后才能发布', () => {
    const item = schoolAssessmentState.itemRevisions.find(
      (entry) => entry.id === 'item-cad@1',
    );
    if (!item) {
      throw new Error('CAD 演示题不存在');
    }
    expect(item.status).toBe('review');
    reviewItem(item.id, 'approve', '分类和渠道说明完整');
    expect(item.status).toBe('approved');
    expect(() => publishItem(item.id)).toThrow('交互插件尚未启用');
    runPluginTests('professional.cad');
    runPluginTests('professional.cad');
    runPluginTests('professional.cad');
    setPluginStatus('professional.cad', 'testing');
    setPluginStatus('professional.cad', 'enabled');
    publishItem(item.id);
    expect(item?.status).toBe('published');
  });

  it('蓝图组卷经过校样审批后封存', () => {
    const form = assembleFromBlueprint('blueprint-engineering', 'B');

    expect(form.sections.flatMap((section) => section.items).length).toBe(3);
    setFormStatus(form.id, 'proofing');
    setFormStatus(form.id, 'under-approval');
    setFormStatus(form.id, 'sealed');
    expect(form.status).toBe('sealed');
  });

  it('在线考试支持离线保存、幂等提交和成绩发布', () => {
    const form = assembleFromBlueprint('blueprint-engineering', 'C');
    setFormStatus(form.id, 'proofing');
    setFormStatus(form.id, 'under-approval');
    setFormStatus(form.id, 'sealed');
    const event = createExamEvent({
      candidateIds: ['student-workflow'],
      deliveryMode: 'online',
      endAt: '2026-09-10T04:00:00.000Z',
      name: '闭环验证场次',
      startAt: '2026-09-10T02:00:00.000Z',
      testFormRevisionId: form.id,
    });
    transitionExamEvent(event.id, 'scheduled');
    transitionExamEvent(event.id, 'ready');
    const attempt = startAttempt(event.id, 'student-workflow');
    setExamConnection('offline');
    const firstItemId = form.sections[0]?.items[0]?.itemRevision.id;
    if (!firstItemId) {
      throw new Error('组卷结果缺少题目');
    }
    const response = saveAttemptResponse(
      attempt.id,
      firstItemId,
      'core.choice',
      'B',
      'idempotent-save',
    );
    const duplicate = saveAttemptResponse(
      attempt.id,
      firstItemId,
      'core.choice',
      'B',
      'idempotent-save',
    );
    expect(response.syncState).toBe('pending');
    expect(duplicate.id).toBe(response.id);
    setExamConnection('online');
    const submission = submitAttempt(attempt.id);
    expect(submitAttempt(attempt.id).id).toBe(submission.id);
    ensureAttemptScoreRecords(attempt.id);
    expect(
      schoolAssessmentState.scoreRecords.filter(
        (record) => record.attemptId === attempt.id,
      ),
    ).toHaveLength(3);
  });

  it('双评分差异进入仲裁并可发布成绩', () => {
    const record = schoolAssessmentState.scoreRecords.find(
      (entry) => entry.id === 'score-material',
    );
    if (!record) {
      throw new Error('材料题评分记录不存在');
    }
    recordSecondMark(record.id, 7, '二评认为分析依据不足');
    expect(record.status).toBe('moderation-required');
    moderateScore(record.id, 10, '仲裁依据量规确定 10 分');
    finalizeAttemptScore('attempt-demo-submitted');
    publishAttemptResult('attempt-demo-submitted');
    createScoreCorrection(
      'score-choice',
      8,
      '申诉复核发现标准答案存在等价表达',
    );
    expect(
      schoolAssessmentState.attempts.find(
        (attempt) => attempt.id === 'attempt-demo-submitted',
      )?.status,
    ).toBe('published');
    expect(attemptScoreSummary('attempt-demo-submitted').awarded).toBe(27);
  });

  it('纸卷扫描和实践证据都转换为标准答卷快照', () => {
    completeScanReview('scan-job-001');
    const practical = submitPracticalEvidence({
      candidateId: 'student-med-001',
      eventId: 'event-practical',
      evidenceRefs: ['video-osce-001', 'rubric-osce-001'],
      stationId: 'station-osce-01',
    });

    expect(
      schoolAssessmentState.attempts.some(
        (attempt) => attempt.eventId === 'event-paper',
      ),
    ).toBe(true);
    expect(
      schoolAssessmentState.submissions.some(
        (submission) => submission.attemptId === practical.id,
      ),
    ).toBe(true);
  });
});
