import { describe, it, expect } from 'vitest';
import { EXPRESSION_GUIDE, diagnoseRule, confusionRows, suggestRanges } from '../src/input/face-diagnosis.js';
import { EMOTIONS } from '../src/emotion/emotions.js';

describe('EXPRESSION_GUIDE', () => {
  it('무표정과 모든 감정에 표정 가이드가 있다', () => {
    for (const id of ['neutral', ...EMOTIONS.map((e) => e.id)]) {
      expect(EXPRESSION_GUIDE[id], id).toMatch(/[가-힣]/);
    }
  });
});

describe('diagnoseRule (왜 그 감정이 안 잡혔는지)', () => {
  it('필요한 움직임 중 약한 것을 짚는다', () => {
    const d = diagnoseRule('sadness', { frown: 0.1, browInnerUp: 0.6, browDown: 0, smile: 0 });
    expect(d.supported).toBe(true);
    const frown = d.parts.find((p) => p.label.includes('입꼬리 내려감'));
    expect(frown.ok).toBe(false);
    expect(d.parts.find((p) => p.label.includes('눈썹')).ok).toBe(true);
  });

  it('억제 단서(웃음)가 막고 있으면 알려 준다', () => {
    const d = diagnoseRule('sadness', { frown: 0.6, browInnerUp: 0.6, smile: 0.7 });
    expect(d.inhibitors.find((i) => i.label === '입꼬리 올라감').blocking).toBe(true);
  });

  it('표정으로 다루지 않는 감정은 supported=false', () => {
    expect(diagnoseRule('relief', {}).supported).toBe(false);
  });
});

describe('confusionRows (혼동 표)', () => {
  it('지은 표정별로 판별 결과를 센다', () => {
    const rows = confusionRows([
      { label: 'sadness', predicted: 'sadness' },
      { label: 'sadness', predicted: 'anxiety' },
      { label: 'joy', predicted: 'joy' },
    ]);
    const sad = rows.find((r) => r.label === 'sadness');
    expect(sad.total).toBe(2);
    expect(sad.correct).toBe(1);
    expect(sad.predictions).toEqual({ sadness: 1, anxiety: 1 });
  });

  it('무표정은 단서 없음이나 평온이면 맞은 것으로 센다', () => {
    const rows = confusionRows([{ label: 'neutral', predicted: null }, { label: 'neutral', predicted: 'calm' }]);
    expect(rows[0].correct).toBe(2);
  });
});

describe('suggestRanges (근육 범위 조정 제안)', () => {
  it('기록된 최대값이 보통 최대치보다 많이 작으면 낮추자고 제안한다', () => {
    const samples = [{ label: 'sadness', frames: [{ scores: { mouthFrownLeft: 0.12 } }, { scores: { mouthFrownLeft: 0.15 } }] }];
    const s = suggestRanges(samples, { mouthFrownLeft: 0.3, browDownLeft: 0.5 });
    expect(s).toEqual([{ key: 'mouthFrownLeft', observed: 0.15, current: 0.3 }]);
  });

  it('충분히 움직였으면 제안하지 않는다', () => {
    const samples = [{ label: 'sadness', frames: [{ scores: { mouthFrownLeft: 0.28 } }] }];
    expect(suggestRanges(samples, { mouthFrownLeft: 0.3 })).toEqual([]);
  });
});
