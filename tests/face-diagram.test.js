import { describe, it, expect } from 'vitest';
import { faceShape, faceSvg } from '../src/ui/face-diagram.js';

const base = { smile: 0, frown: 0, browDown: 0, browInnerUp: 0, browOuterUp: 0, eyeWide: 0, eyeSquint: 0, droop: 0, jawOpen: 0, press: 0, sneer: 0, stretch: 0, cheek: 0, upperUp: 0, pout: 0, headDown: 0 };

describe('faceShape (얼굴 그림 좌표)', () => {
  it('웃으면 입 가운데가 입꼬리보다 아래(U자), 찡그리면 위(∩자)', () => {
    const s = faceShape({ ...base, smile: 0.8 });
    expect(s.mouth.ctrlY).toBeGreaterThan(s.mouth.cornerY);
    const f = faceShape({ ...base, frown: 0.8 });
    expect(f.mouth.ctrlY).toBeLessThan(f.mouth.cornerY);
  });

  it('눈썹 안쪽이 올라가면 안쪽 끝이 위로, 눈썹이 내려가면 아래로', () => {
    const neutral = faceShape(base).brow.innerY;
    expect(faceShape({ ...base, browInnerUp: 0.8 }).brow.innerY).toBeLessThan(neutral);
    expect(faceShape({ ...base, browDown: 0.8 }).brow.innerY).toBeGreaterThan(neutral);
  });

  it('눈을 크게 뜨면 커지고, 처지면 작아진다', () => {
    const neutral = faceShape(base).eye.ry;
    expect(faceShape({ ...base, eyeWide: 0.8 }).eye.ry).toBeGreaterThan(neutral);
    expect(faceShape({ ...base, droop: 0.8 }).eye.ry).toBeLessThan(neutral);
  });

  it('입을 벌리면 입 높이가 생긴다', () => {
    expect(faceShape({ ...base, jawOpen: 0.8 }).mouth.open).toBeGreaterThan(faceShape(base).mouth.open);
  });

  it('입 삐죽이면 입 폭이 좁아진다', () => {
    expect(faceShape({ ...base, pout: 0.8 }).mouth.halfWidth).toBeLessThan(faceShape(base).mouth.halfWidth);
  });

  it('움직인 부위를 강조 표시한다', () => {
    const s = faceShape({ ...base, browDown: 0.6 });
    expect(s.active.brow).toBe(true);
    expect(s.active.mouth).toBe(false);
  });
});

describe('faceSvg', () => {
  it('SVG 문자열을 만든다', () => {
    expect(faceSvg(base)).toMatch(/^<svg/);
  });
});
