import { describe, it, expect, vi } from 'vitest';
import { createSketch } from '../src/visual/sketch.js';

// p5 인스턴스 모드에서 p5가 넘겨주는 객체(p)를 흉내 낸 가짜 객체
function fakeP5() {
  return {
    createCanvas: vi.fn(),
    background: vi.fn(),
  };
}

describe('createSketch', () => {
  it('setup에서 지정한 크기의 캔버스를 만든다', () => {
    const p = fakeP5();
    createSketch({ width: 400, height: 300 })(p);
    p.setup();
    expect(p.createCanvas).toHaveBeenCalledWith(400, 300);
  });

  it('draw에서 배경을 칠한다', () => {
    const p = fakeP5();
    createSketch({ width: 400, height: 300 })(p);
    p.draw();
    expect(p.background).toHaveBeenCalled();
  });
});
