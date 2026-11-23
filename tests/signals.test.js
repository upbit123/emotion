import { describe, it, expect } from 'vitest';
import { addWeights, smoothWeights, topEmotions, createAverager } from '../src/signal/weights.js';

describe('addWeights', () => {
  it('비율을 곱해 더한다', () => {
    expect(addWeights({ joy: 1 }, { joy: 1, calm: 2 }, 0.5)).toEqual({ joy: 1.5, calm: 1 });
  });
});

describe('smoothWeights', () => {
  it('이전 값과 새 값을 alpha 비율로 섞는다', () => {
    const next = smoothWeights({ joy: 1 }, { anger: 1 }, 0.25);
    expect(next.joy).toBeCloseTo(0.75);
    expect(next.anger).toBeCloseTo(0.25);
  });

  it('아주 작아진 값은 지운다', () => {
    expect(smoothWeights({ joy: 0.001 }, {}, 0.5)).toEqual({});
  });
});

describe('topEmotions', () => {
  it('비율이 큰 순서로 최대 n개, 최소 비율 미만은 제외', () => {
    const top = topEmotions({ joy: 6, calm: 3, anger: 0.5, sadness: 0.5 }, 3, 0.1);
    expect(top.map((t) => t.id)).toEqual(['joy', 'calm']);
    expect(top[0].share).toBeCloseTo(0.6);
  });

  it('빈 입력이면 빈 배열', () => {
    expect(topEmotions({}, 3)).toEqual([]);
  });
});

describe('createAverager', () => {
  it('들어온 신호의 평균을 낸다', () => {
    const avg = createAverager();
    avg.add({ joy: 1 });
    avg.add({ joy: 0, anger: 1 });
    expect(avg.value()).toEqual({ joy: 0.5, anger: 0.5 });
  });

  it('아무것도 안 들어왔으면 빈 객체', () => {
    expect(createAverager().value()).toEqual({});
  });
});

import { combineSources } from '../src/signal/weights.js';

describe('combineSources (입력별 비율 맞춰 합치기)', () => {
  it('각 입력을 합 1로 맞춘 뒤 반영 비율을 곱한다', () => {
    const w = combineSources([
      { weights: { joy: 3, calm: 1 }, scale: 1 }, //   카드: 값이 커도
      { weights: { anger: 0.1 }, scale: 1 }, //        표정: 값이 작아도 같은 무게
    ]);
    expect(w.joy).toBeCloseTo(0.75);
    expect(w.calm).toBeCloseTo(0.25);
    expect(w.anger).toBeCloseTo(1);
  });

  it('빈 입력은 무시한다', () => {
    expect(combineSources([{ weights: {}, scale: 1 }, { weights: { joy: 2 }, scale: 0.5 }])).toEqual({ joy: 0.5 });
  });
});
