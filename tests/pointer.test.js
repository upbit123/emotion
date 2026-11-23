import { describe, it, expect } from 'vitest';
import { pointerFeatures, pointerToWeights, pointerReasons } from '../src/input/pointer.js';

// 일정한 속도로 한 방향 이동하는 샘플(20ms 간격)
function straight(speedPxPerSec, n = 30) {
  return Array.from({ length: n }, (_, i) => ({ x: i * speedPxPerSec * 0.02, y: 100, t: i * 20 }));
}

// 매 샘플마다 방향을 뒤집는 지그재그
function zigzag(speedPxPerSec, n = 30) {
  return Array.from({ length: n }, (_, i) => ({
    x: i * speedPxPerSec * 0.012,
    y: 100 + (i % 2 === 0 ? 0 : speedPxPerSec * 0.016),
    t: i * 20,
  }));
}

// 움직이다 멈추기를 반복(멈칫거림)
function hesitant(n = 30) {
  let t = 0;
  return Array.from({ length: n }, (_, i) => {
    t += i % 5 === 0 ? 300 : 20;
    return { x: i * 8, y: 100, t };
  });
}

describe('pointerFeatures', () => {
  it('빠를수록 speed가 크다', () => {
    expect(pointerFeatures(straight(800)).speed).toBeGreaterThan(pointerFeatures(straight(100)).speed);
  });

  it('지그재그면 jitter가 크고 직선이면 작다', () => {
    expect(pointerFeatures(zigzag(400)).jitter).toBeGreaterThan(0.5);
    expect(pointerFeatures(straight(400)).jitter).toBeLessThan(0.1);
  });

  it('멈췄다 가기를 반복하면 hesitation이 크다', () => {
    expect(pointerFeatures(hesitant()).hesitation).toBeGreaterThan(0.15);
    expect(pointerFeatures(straight(400)).hesitation).toBe(0);
  });

  it('넓게 움직일수록 spread가 크다', () => {
    const area = { width: 1000, height: 600 };
    expect(pointerFeatures(straight(800), area).spread).toBeGreaterThan(pointerFeatures(straight(100), area).spread);
  });

  it('샘플이 3개 미만이면 움직임 없음', () => {
    expect(pointerFeatures([{ x: 0, y: 0, t: 0 }])).toEqual({ speed: 0, jitter: 0, hesitation: 0, spread: 0 });
  });
});

describe('pointerToWeights', () => {
  it('빠르고 흔들리면 불안·조급함 쪽', () => {
    const w = pointerToWeights({ speed: 1, jitter: 0.9, hesitation: 0, spread: 0.5 });
    expect((w.anxiety ?? 0) + (w.impatience ?? 0)).toBeGreaterThan(w.calm ?? 0);
  });

  it('멈칫거리면 불안 쪽', () => {
    const w = pointerToWeights({ speed: 0.4, jitter: 0.2, hesitation: 0.8, spread: 0.3 });
    expect(Object.entries(w).sort((a, b) => b[1] - a[1])[0][0]).toBe('anxiety');
  });

  it('느리고 매끄럽게 넓게 움직이면 평온 쪽', () => {
    const w = pointerToWeights({ speed: 0.15, jitter: 0.05, hesitation: 0, spread: 0.7 });
    expect(w.calm).toBeGreaterThan(w.anxiety ?? 0);
  });

  it('빠르고 매끄럽게 넓게 움직이면 설렘 쪽', () => {
    const w = pointerToWeights({ speed: 0.9, jitter: 0.05, hesitation: 0, spread: 0.9 });
    expect(Object.entries(w).sort((a, b) => b[1] - a[1])[0][0]).toBe('excitement');
  });

  it('거의 안 움직이면 무기력 쪽', () => {
    expect(pointerToWeights({ speed: 0.01, jitter: 0, hesitation: 0, spread: 0 }).lethargy).toBeGreaterThan(0);
  });
});

describe('pointerReasons', () => {
  it('감정과 관련된 움직임 특징을 설명한다', () => {
    expect(pointerReasons({ speed: 0.3, jitter: 0.2, hesitation: 0.6, spread: 0.3 }, 'anxiety')).toContain('멈칫거림이 많음');
  });
});
