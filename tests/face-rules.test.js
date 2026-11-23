import { describe, it, expect } from 'vitest';
import { blendshapesToWeights, explainCues } from '../src/input/face-rules.js';

const neutral = {};

describe('blendshapesToWeights', () => {
  it('무표정이면 감정 신호가 없다', () => {
    expect(blendshapesToWeights(neutral)).toEqual({});
  });

  it('입꼬리가 올라가면 기쁨', () => {
    const w = blendshapesToWeights({ mouthSmileLeft: 0.8, mouthSmileRight: 0.8 });
    expect(Object.keys(w)[0]).toBe('joy');
    expect(w.joy).toBeGreaterThan(0.5);
  });

  it('눈썹이 내려가고 입술을 누르면 분노', () => {
    const w = blendshapesToWeights({ browDownLeft: 0.7, browDownRight: 0.7, mouthPressLeft: 0.6, mouthPressRight: 0.6 });
    expect(w.anger).toBeGreaterThan(w.joy ?? 0);
  });

  it('눈을 크게 뜨고 입을 벌리면 놀람', () => {
    const w = blendshapesToWeights({ eyeWideLeft: 0.8, eyeWideRight: 0.8, jawOpen: 0.7, browInnerUp: 0.6 });
    expect(w.surprise).toBeGreaterThan(0.4);
  });

  it('입꼬리가 내려가면 슬픔', () => {
    const w = blendshapesToWeights({ mouthFrownLeft: 0.7, mouthFrownRight: 0.7, browInnerUp: 0.5 });
    expect(w.sadness).toBeGreaterThan(0.3);
  });

  it('값은 0~1 범위', () => {
    const all = { mouthSmileLeft: 1, mouthSmileRight: 1, browDownLeft: 1, browDownRight: 1, eyeWideLeft: 1, eyeWideRight: 1, jawOpen: 1 };
    for (const v of Object.values(blendshapesToWeights(all))) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('explainCues', () => {
  it('강하게 움직인 얼굴 부위를 한국어로 설명한다', () => {
    const cues = explainCues({ mouthSmileLeft: 0.8, mouthSmileRight: 0.7, browDownLeft: 0.05 });
    expect(cues[0].label).toBe('입꼬리 올라감');
    expect(cues.find((c) => c.label === '눈썹 내려감')).toBeUndefined();
  });
});
