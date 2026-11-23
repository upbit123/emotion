import { describe, it, expect } from 'vitest';
import { createCalibrator, createNormalizer, FACE_RANGES } from '../src/input/face-calibration.js';

describe('createCalibrator (무표정 기준값)', () => {
  it('기록한 프레임들의 평균을 기준값으로 낸다', () => {
    const cal = createCalibrator();
    cal.add({ browDownLeft: 0.2, mouthSmileLeft: 0 }, 0.1);
    cal.add({ browDownLeft: 0.4, mouthSmileLeft: 0.1 }, 0.3);
    const { scores, pitch } = cal.baseline();
    expect(scores.browDownLeft).toBeCloseTo(0.3);
    expect(scores.mouthSmileLeft).toBeCloseTo(0.05);
    expect(pitch).toBeCloseTo(0.2);
    expect(cal.count()).toBe(2);
  });
});

describe('createNormalizer (근육별 범위 맞추기)', () => {
  it('기준값이면 0, 그 근육의 보통 최대치면 1', () => {
    const norm = createNormalizer({ scores: { browDownLeft: 0.2 }, pitch: 0 });
    const range = FACE_RANGES.browDownLeft;
    expect(norm.normalize({ browDownLeft: 0.2 }).scores.browDownLeft).toBeCloseTo(0);
    expect(norm.normalize({ browDownLeft: range }).scores.browDownLeft).toBeCloseTo(1);
  });

  it('기준값보다 작으면 0으로 자른다', () => {
    const norm = createNormalizer({ scores: { browDownLeft: 0.3 }, pitch: 0 });
    expect(norm.normalize({ browDownLeft: 0.1 }).scores.browDownLeft).toBe(0);
  });

  it('찡그림처럼 폭이 작은 근육도 0~1로 넓혀 준다', () => {
    const norm = createNormalizer({ scores: {}, pitch: 0 });
    const frown = norm.normalize({ mouthFrownLeft: FACE_RANGES.mouthFrownLeft / 2 }).scores.mouthFrownLeft;
    expect(frown).toBeCloseTo(0.5);
  });

  it('보통 최대치보다 크게 움직인 사람에게는 범위를 넓힌다', () => {
    const norm = createNormalizer({ scores: {}, pitch: 0 });
    const big = FACE_RANGES.mouthFrownLeft * 2;
    expect(norm.normalize({ mouthFrownLeft: big }).scores.mouthFrownLeft).toBeCloseTo(1);
    expect(norm.normalize({ mouthFrownLeft: big / 2 }).scores.mouthFrownLeft).toBeCloseTo(0.5);
  });

  it('고개 각도는 기준 각도와의 차이로 바꾼다', () => {
    const norm = createNormalizer({ scores: {}, pitch: 0.1 });
    expect(norm.normalize({}, 0.4).pitch).toBeCloseTo(0.3);
  });

  it('기준값이 보통 최대치보다 커도 0으로 나누지 않는다', () => {
    const norm = createNormalizer({ scores: { mouthFrownLeft: 0.9 }, pitch: 0 });
    const v = norm.normalize({ mouthFrownLeft: 0.95 }).scores.mouthFrownLeft;
    expect(Number.isFinite(v)).toBe(true);
  });
});
