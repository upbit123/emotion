import { describe, it, expect, vi } from 'vitest';
import { createSketch } from '../src/visual/sketch.js';
import { MOTIFS } from '../src/visual/motifs.js';
import { EMOTION_STYLES, toVisual } from '../src/visual/mapping.js';
import { mixEmotions } from '../src/emotion/mix.js';

// p5 인스턴스 모드에서 p5가 넘겨주는 객체(p)를 흉내 낸 가짜 객체.
// 그리기 함수는 모두 기록만 하는 가짜 함수로 대신한다.
function fakeP5() {
  const calls = {};
  const target = {
    width: 400,
    height: 300,
    millis: () => 1000,
    noise: () => 0.5,
    drawingContext: { beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn() },
  };
  return new Proxy(target, {
    get(obj, key) {
      if (key in obj) return obj[key];
      if (typeof key !== 'string' || /^[A-Z_]+$/.test(key)) return undefined; // 상수(p.HSB 등)
      calls[key] ??= vi.fn();
      return calls[key];
    },
    set(obj, key, value) {
      obj[key] = value;
      return true;
    },
  });
}

describe('createSketch', () => {
  it('setup에서 지정한 크기의 캔버스를 만든다', () => {
    const p = fakeP5();
    createSketch({ width: 400, height: 300 })(p);
    p.setup();
    expect(p.createCanvas).toHaveBeenCalledWith(400, 300);
  });

  it('장면이 없으면 배경만 칠한다', () => {
    const p = fakeP5();
    createSketch({ width: 400, height: 300 })(p);
    p.draw();
    expect(p.background).toHaveBeenCalled();
  });

  it('장면이 있으면 그 영역 안에서 감정 모티프를 그린다', () => {
    const p = fakeP5();
    const visual = toVisual(mixEmotions({ joy: 1 }));
    createSketch({ width: 400, height: 300, getScenes: () => [{ visual, x: 0, y: 0, w: 1, h: 1 }] })(p);
    p.draw();
    expect(p.drawingContext.clip).toHaveBeenCalled();
    // 영역 자르기는 p5의 push/pop 안에서 해야 색 상태가 어긋나지 않는다
    expect(p.push).toHaveBeenCalled();
    expect(p.pop).toHaveBeenCalled();
    expect(p.circle).toHaveBeenCalled(); // 기쁨 = 둥근 방울
  });

  it('visual이 없으면 안내 문구를 쓴다', () => {
    const p = fakeP5();
    createSketch({ width: 400, height: 300, getScenes: () => [{ visual: null, x: 0, y: 0, w: 1, h: 1, placeholder: '감정을 골라 보세요' }] })(p);
    p.draw();
    expect(p.text).toHaveBeenCalledWith('감정을 골라 보세요', expect.any(Number), expect.any(Number));
  });
});

describe('MOTIFS', () => {
  it('모든 감정의 모티프 그리기 함수가 있고 에러 없이 그린다', () => {
    for (const { motif } of Object.values(EMOTION_STYLES)) {
      expect(MOTIFS[motif], motif).toBeTypeOf('function');
      const p = fakeP5();
      expect(() =>
        MOTIFS[motif]({ p, x: 0, y: 0, w: 400, h: 300, t: 2, n: 10, unit: 300, color: { h: 0, s: 50, b: 50 } }),
      ).not.toThrow();
    }
  });
});
