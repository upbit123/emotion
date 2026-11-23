import { describe, it, expect } from 'vitest';
import { mixEmotions } from '../src/emotion/mix.js';
import { getEmotion } from '../src/emotion/emotions.js';

describe('mixEmotions', () => {
  it('감정 하나면 그 감정의 좌표가 그대로 나온다', () => {
    const { valence, arousal } = mixEmotions({ anxiety: 1 });
    expect(valence).toBeCloseTo(getEmotion('anxiety').valence);
    expect(arousal).toBeCloseTo(getEmotion('anxiety').arousal);
  });

  it('두 감정을 같은 비율로 섞으면 좌표의 중간이 나온다', () => {
    const { valence, arousal } = mixEmotions({ joy: 1, sadness: 1 });
    expect(valence).toBeCloseTo((0.8 + -0.7) / 2);
    expect(arousal).toBeCloseTo((0.5 + -0.4) / 2);
  });

  it('가중치 크기가 아니라 비율로 섞는다', () => {
    expect(mixEmotions({ joy: 2, sadness: 2 })).toEqual(mixEmotions({ joy: 1, sadness: 1 }));
  });

  it('구성 감정을 비율(합 1)로 바꿔 큰 순서대로 돌려준다', () => {
    const { components } = mixEmotions({ irritation: 1, anxiety: 3 });
    expect(components.map((c) => c.id)).toEqual(['anxiety', 'irritation']);
    expect(components[0].weight).toBeCloseTo(0.75);
    expect(components[1].weight).toBeCloseTo(0.25);
  });

  it('가중치 0인 감정은 구성에서 뺀다', () => {
    const { components } = mixEmotions({ joy: 1, anger: 0 });
    expect(components.map((c) => c.id)).toEqual(['joy']);
  });

  it('모르는 감정 id면 에러를 던진다', () => {
    expect(() => mixEmotions({ unknown: 1 })).toThrow('unknown');
  });

  it('음수 가중치면 에러를 던진다', () => {
    expect(() => mixEmotions({ joy: -1 })).toThrow();
  });

  it('가중치 합이 0이면 에러를 던진다', () => {
    expect(() => mixEmotions({})).toThrow();
    expect(() => mixEmotions({ joy: 0 })).toThrow();
  });
});
