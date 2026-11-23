import { describe, it, expect } from 'vitest';
import { createFaceStats } from '../src/input/face-stats.js';

const frame = (o) => ({ weights: {}, smileKind: null, masked: false, mixed: null, asymmetry: [], ...o });

describe('createFaceStats (세션 표정 통계)', () => {
  it('미소 중 눈까지 웃은 비율을 낸다', () => {
    const s = createFaceStats();
    s.add(frame({ smileKind: 'duchenne' }));
    s.add(frame({ smileKind: 'social' }));
    s.add(frame({ smileKind: 'social' }));
    s.add(frame({}));
    const sum = s.summary();
    expect(sum.frames).toBe(4);
    expect(sum.smileShare).toBeCloseTo(0.75);
    expect(sum.duchenneShare).toBeCloseTo(1 / 3);
  });

  it('가려진·섞인·비대칭 표정이 보인 비율', () => {
    const s = createFaceStats();
    s.add(frame({ masked: true, mixed: ['joy', 'anger'], asymmetry: ['한쪽 입꼬리만 올라감'] }));
    s.add(frame({}));
    const sum = s.summary();
    expect(sum.maskedShare).toBeCloseTo(0.5);
    expect(sum.mixedShare).toBeCloseTo(0.5);
    expect(sum.asymShare).toBeCloseTo(0.5);
  });

  it('감정별 최고 강도와 1위였던 비율', () => {
    const s = createFaceStats();
    s.add(frame({ weights: { joy: 0.4, anger: 0.2 } }));
    s.add(frame({ weights: { joy: 0.9 } }));
    s.add(frame({ weights: { anger: 0.5 } }));
    const sum = s.summary();
    expect(sum.peaks.joy).toBeCloseTo(0.9);
    expect(sum.topShare.joy).toBeCloseTo(2 / 3);
    expect(sum.topShare.anger).toBeCloseTo(1 / 3);
  });

  it('기록이 없으면 0', () => {
    expect(createFaceStats().summary().frames).toBe(0);
  });
});
