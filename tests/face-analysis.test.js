import { describe, it, expect } from 'vitest';
import { analyzeFace, intensityOf, blendshapesToWeights, regionSummary } from '../src/input/face-rules.js';

const smile = (l, r, extra = {}) => ({ mouthSmileLeft: l, mouthSmileRight: r, ...extra });

describe('intensityOf (강도 단계)', () => {
  it('세 단계로 나눈다', () => {
    expect(intensityOf(0.2)).toBe('살짝');
    expect(intensityOf(0.5)).toBe('뚜렷하게');
    expect(intensityOf(0.8)).toBe('강하게');
  });
});

describe('analyzeFace', () => {
  it('눈가까지 웃으면 뒤센 미소, 입으로만 웃으면 사회적 미소', () => {
    expect(analyzeFace(smile(0.8, 0.8, { cheekSquintLeft: 0.6, cheekSquintRight: 0.6 })).smileKind).toBe('duchenne');
    expect(analyzeFace(smile(0.8, 0.8)).smileKind).toBe('social');
    expect(analyzeFace({}).smileKind).toBeNull();
  });

  it('한쪽 입꼬리만 올라가면 비대칭으로 본다', () => {
    expect(analyzeFace(smile(0.8, 0.1)).asymmetry).toContain('한쪽 입꼬리만 올라감');
    expect(analyzeFace(smile(0.8, 0.75)).asymmetry).toEqual([]);
  });

  it('한쪽 눈썹만 올라가도 비대칭으로 본다', () => {
    const a = analyzeFace({ browOuterUpLeft: 0.8, browOuterUpRight: 0.05 });
    expect(a.asymmetry).toContain('한쪽 눈썹만 올라감');
  });

  it('입으로만 웃는데 슬픔 단서가 함께 있으면 가려진 표정으로 본다', () => {
    const a = analyzeFace(smile(0.7, 0.7, { mouthFrownLeft: 0.5, mouthFrownRight: 0.5, browInnerUp: 0.6 }));
    expect(a.masked).toBe(true);
    expect(analyzeFace(smile(0.7, 0.7)).masked).toBe(false);
  });

  it('쾌·불쾌 감정 단서가 함께 강하면 섞인 표정으로 본다', () => {
    const a = analyzeFace({
      ...smile(0.9, 0.9, { cheekSquintLeft: 0.8, cheekSquintRight: 0.8 }),
      browDownLeft: 0.9, browDownRight: 0.9, mouthPressLeft: 0.9, mouthPressRight: 0.9,
    });
    expect(a.mixed).not.toBeNull();
    expect(analyzeFace(smile(0.8, 0.8)).mixed).toBeNull();
  });

  it('감정마다 강도를 붙인다', () => {
    const a = analyzeFace(smile(0.9, 0.9, { cheekSquintLeft: 0.8, cheekSquintRight: 0.8 }));
    expect(a.intensity.joy).toBe('강하게');
  });
});

describe('비대칭 미소와 기쁨', () => {
  it('평균이 같아도 한쪽만 웃으면 기쁨이 약하다', () => {
    const sym = blendshapesToWeights(smile(0.5, 0.5)).joy ?? 0;
    const asym = blendshapesToWeights(smile(0.9, 0.1)).joy ?? 0;
    expect(asym).toBeLessThan(sym);
  });
});

describe('regionSummary (부위별 설명)', () => {
  it('부위마다 가장 강한 움직임과 강도를 낸다', () => {
    const rows = regionSummary({ browInnerUp: 0.7, mouthFrownLeft: 0.4, mouthFrownRight: 0.4 });
    const brow = rows.find((r) => r.region === '눈썹');
    const mouth = rows.find((r) => r.region === '입');
    expect(brow.label).toBe('눈썹 안쪽 올라감');
    expect(brow.level).toBe('강하게');
    expect(mouth.label).toBe('입꼬리 내려감');
  });

  it('움직임이 거의 없는 부위는 "그대로"', () => {
    expect(regionSummary({}).every((r) => r.label === '그대로')).toBe(true);
  });
});

describe('판별 보완', () => {
  it('놀람처럼 쾌·불쾌가 애매한 감정은 섞인 표정 판단에서 뺀다', () => {
    const a = analyzeFace({
      browInnerUp: 0.8, browOuterUpLeft: 0.8, browOuterUpRight: 0.8,
      eyeWideLeft: 0.8, eyeWideRight: 0.8, jawOpen: 0.7,
    });
    expect(a.mixed).toBeNull();
  });

  it('한쪽 입꼬리만 올린 비웃음은 평온으로 보지 않는다', () => {
    const w = blendshapesToWeights({ mouthSmileLeft: 0.8, mouthSmileRight: 0.05 });
    expect(w.calm ?? 0).toBe(0);
  });
});
