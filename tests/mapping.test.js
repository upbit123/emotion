import { describe, it, expect } from 'vitest';
import { axisStyle, toVisual, EMOTION_STYLES } from '../src/visual/mapping.js';
import { EMOTIONS } from '../src/emotion/emotions.js';
import { mixEmotions } from '../src/emotion/mix.js';

describe('axisStyle (모든 감정에 같은 축 규칙)', () => {
  it('쾌가 높을수록 밝고 둥글다', () => {
    const low = axisStyle({ valence: -0.8, arousal: 0 });
    const high = axisStyle({ valence: 0.8, arousal: 0 });
    expect(high.brightness).toBeGreaterThan(low.brightness);
    expect(high.roundness).toBeGreaterThan(low.roundness);
  });

  it('각성이 높을수록 채도가 높고 빠르다', () => {
    const low = axisStyle({ valence: 0, arousal: -0.8 });
    const high = axisStyle({ valence: 0, arousal: 0.8 });
    expect(high.saturation).toBeGreaterThan(low.saturation);
    expect(high.speed).toBeGreaterThan(low.speed);
  });

  it('값이 정해진 범위 안에 있다', () => {
    for (const v of [-1, 0, 1]) {
      for (const a of [-1, 0, 1]) {
        const s = axisStyle({ valence: v, arousal: a });
        expect(s.brightness).toBeGreaterThanOrEqual(0);
        expect(s.brightness).toBeLessThanOrEqual(100);
        expect(s.saturation).toBeGreaterThanOrEqual(0);
        expect(s.saturation).toBeLessThanOrEqual(100);
        expect(s.roundness).toBeGreaterThanOrEqual(0);
        expect(s.roundness).toBeLessThanOrEqual(1);
        expect(s.speed).toBeGreaterThan(0);
      }
    }
  });
});

describe('EMOTION_STYLES (감정별 고유색·모티프)', () => {
  it('모든 감정에 고유색과 모티프가 있다', () => {
    for (const e of EMOTIONS) {
      const style = EMOTION_STYLES[e.id];
      expect(style, e.id).toBeDefined();
      expect(style.hue).toBeGreaterThanOrEqual(0);
      expect(style.hue).toBeLessThan(360);
      expect(typeof style.motif).toBe('string');
    }
  });

  it('모티프가 감정마다 다르다', () => {
    const motifs = EMOTIONS.map((e) => EMOTION_STYLES[e.id].motif);
    expect(new Set(motifs).size).toBe(EMOTIONS.length);
  });
});

describe('toVisual', () => {
  it('같은 입력이면 같은 출력', () => {
    const mix = mixEmotions({ anxiety: 2, irritation: 1 });
    expect(toVisual(mix)).toEqual(toVisual(mix));
  });

  it('구성 감정마다 레이어를 만들고 비율을 유지한다', () => {
    const visual = toVisual(mixEmotions({ anxiety: 3, irritation: 1 }));
    expect(visual.layers.map((l) => l.id)).toEqual(['anxiety', 'irritation']);
    expect(visual.layers[0].weight).toBeCloseTo(0.75);
    expect(visual.layers[0].motif).toBe(EMOTION_STYLES.anxiety.motif);
  });

  it('무기력(회색)은 채도가 매우 낮다', () => {
    const [layer] = toVisual(mixEmotions({ lethargy: 1 })).layers;
    expect(layer.color.s).toBeLessThan(15);
  });

  it('배경 색상은 가장 강한 감정의 색을 따른다', () => {
    const visual = toVisual(mixEmotions({ sadness: 3, joy: 1 }));
    expect(visual.background.h).toBe(EMOTION_STYLES.sadness.hue);
  });
});
