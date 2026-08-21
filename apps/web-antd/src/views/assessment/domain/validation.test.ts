import { describe, expect, it } from 'vitest';

import { scoreWithPlugin } from '../plugins/registry';
import { createSeedState } from './seed';
import { validateSchoolPrototype } from './validation';

describe('单校全专业考试原型', () => {
  it('覆盖计划中的八项闭环自检', () => {
    const state = createSeedState();
    const checks = validateSchoolPrototype(state);

    expect(checks).toHaveLength(8);
    expect(checks.every((check) => check.passed)).toBe(true);
  });

  it('同一题目可跨专业复用而不复制题目家族', () => {
    const state = createSeedState();
    const shared = state.itemRevisions.find(
      (item) => item.id === 'item-calculus-choice@2',
    );

    expect(shared?.metadata.ownership.primaryCourseId).toBe('course-calculus');
    expect(shared?.metadata.applicability.majorIds).toEqual(
      expect.arrayContaining([
        'major-computer',
        'major-electrical',
        'major-mechanical',
      ]),
    );
  });

  it('无代码交互同时具有控件、评分和纸面配置', () => {
    const state = createSeedState();
    const template = state.interactionTemplates.find(
      (entry) => entry.id === 'template-material@3',
    );

    expect(template?.controls).toHaveLength(3);
    expect(template?.scoreRules).toHaveLength(3);
    expect(template?.paperFallback.mode).toBe('equivalent');
  });

  it('在线、纸笔和实践考试汇入同一考试事件模型', () => {
    const state = createSeedState();

    expect(new Set(state.events.map((event) => event.deliveryMode))).toEqual(
      new Set(['online', 'paper', 'practical']),
    );
  });

  it('无代码交互自动评分后把量规部分送入人工复核', () => {
    const state = createSeedState();
    const item = state.itemRevisions.find(
      (entry) => entry.id === 'item-material-composite@1',
    );
    if (!item) {
      throw new Error('演示复合题不存在');
    }
    const result = scoreWithPlugin(
      item,
      {
        pluginId: 'builder.no-code',
        value: {
          'ctrl-judgement': '安全',
          'ctrl-reason': '计算应力低于许用应力。',
          'ctrl-stress': 248,
        },
      },
      20,
    );

    expect(result.awardedScore).toBe(14);
    expect(result.requiresHumanReview).toBe(true);
  });
});
