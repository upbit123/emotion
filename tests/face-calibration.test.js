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

import { personalRanges } from '../src/input/face-calibration.js';

describe('기준값보다 떨어지는 움직임(drops)', () => {
  it('무표정에서 높던 값이 내려가면 그만큼을 drop으로 돌려준다', () => {
    const norm = createNormalizer({ scores: { eyeSquintLeft: 0.5 }, pitch: 0 });
    const { drops } = norm.normalize({ eyeSquintLeft: 0.25 });
    expect(drops.eyeSquintLeft).toBeCloseTo(0.5);
  });

  it('무표정 값이 낮은 근육은 drop을 계산하지 않는다', () => {
    const norm = createNormalizer({ scores: { browDownLeft: 0.05 }, pitch: 0 });
    expect(norm.normalize({ browDownLeft: 0 }).drops.browDownLeft).toBeUndefined();
  });
});

describe('쓸 수 없는 근육', () => {
  it('무표정에서 이미 최대치에 가까우면 0으로 내고 목록에 남긴다', () => {
    const norm = createNormalizer({ scores: { mouthPucker: 0.95 }, pitch: 0 });
    expect(norm.normalize({ mouthPucker: 1 }).scores.mouthPucker).toBe(0);
    expect(norm.unusable()).toContain('mouthPucker');
  });
});

describe('개인 범위', () => {
  it('직접 준 범위를 기본값 대신 쓴다', () => {
    const norm = createNormalizer({ scores: {}, pitch: 0 }, { browDownLeft: 0.2 });
    expect(norm.normalize({ browDownLeft: 0.1 }).scores.browDownLeft).toBeCloseTo(0.5);
  });

  it('기록의 95% 지점 값을 근육별 범위로 만든다', () => {
    const frames = Array.from({ length: 100 }, (_, i) => ({ scores: { browDownLeft: i / 500 } })); // 0~0.198
    const ranges = personalRanges([{ label: 'anger', frames }], { scores: { browDownLeft: 0 } }, { browDownLeft: 0.5 });
    expect(ranges.browDownLeft).toBeCloseTo(0.19, 2);
  });

  it('거의 안 움직인 근육은 기본값을 유지한다', () => {
    const frames = [{ scores: { noseSneerLeft: 0.001 } }];
    const ranges = personalRanges([{ label: 'x', frames }], { scores: {} }, { noseSneerLeft: 0.2 });
    expect(ranges.noseSneerLeft).toBe(0.2);
  });
});
