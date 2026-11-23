import { describe, it, expect } from 'vitest';
import { pointerFeatures, pointerToWeights } from '../src/input/pointer.js';

// 일정한 속도로 한 방향 이동하는 샘플
function straight(speedPxPerSec, n = 30) {
  return Array.from({ length: n }, (_, i) => ({ x: i * speedPxPerSec * 0.05, y: 100, t: i * 50 }));
}

// 매 샘플마다 방향을 뒤집는 지그재그 샘플
function zigzag(speedPxPerSec, n = 30) {
  return Array.from({ length: n }, (_, i) => ({
    x: i * speedPxPerSec * 0.03,
    y: 100 + (i % 2 === 0 ? 0 : speedPxPerSec * 0.04),
    t: i * 50,
  }));
}

describe('pointerFeatures', () => {
  it('빠를수록 speed가 크다', () => {
    expect(pointerFeatures(straight(800)).speed).toBeGreaterThan(pointerFeatures(straight(100)).speed);
  });

  it('지그재그면 jitter가 크고 직선이면 작다', () => {
    expect(pointerFeatures(zigzag(400)).jitter).toBeGreaterThan(0.5);
    expect(pointerFeatures(straight(400)).jitter).toBeLessThan(0.1);
  });

  it('샘플이 3개 미만이면 움직임 없음', () => {
    expect(pointerFeatures([{ x: 0, y: 0, t: 0 }])).toEqual({ speed: 0, jitter: 0 });
  });
});

describe('pointerToWeights', () => {
  it('빠르고 흔들리면 불안·조급함 쪽', () => {
    const w = pointerToWeights({ speed: 1, jitter: 0.9 });
    expect(w.anxiety + w.impatience).toBeGreaterThan(w.calm ?? 0);
  });

  it('느리고 매끄러우면 평온 쪽', () => {
    const w = pointerToWeights({ speed: 0.15, jitter: 0.05 });
    expect(w.calm).toBeGreaterThan(w.anxiety ?? 0);
  });

  it('거의 안 움직이면 무기력 쪽', () => {
    const w = pointerToWeights({ speed: 0.01, jitter: 0 });
    expect(w.lethargy).toBeGreaterThan(0);
  });
});
