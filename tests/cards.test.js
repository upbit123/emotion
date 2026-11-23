import { describe, it, expect } from 'vitest';
import { CARDS, answersToWeights } from '../src/input/cards.js';
import { getEmotion } from '../src/emotion/emotions.js';

describe('CARDS', () => {
  it('카드마다 질문과 2개 이상의 선택지가 있다', () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(3);
    for (const card of CARDS) {
      expect(card.question).toMatch(/[가-힣]/);
      expect(card.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('선택지의 감정은 모두 정의된 감정이다', () => {
    for (const card of CARDS) {
      for (const option of card.options) {
        for (const id of Object.keys(option.weights)) {
          expect(() => getEmotion(id)).not.toThrow();
        }
      }
    }
  });
});

describe('answersToWeights', () => {
  it('고른 선택지의 가중치를 더한다', () => {
    const first = CARDS[0].options[0].weights;
    const second = CARDS[1].options[0].weights;
    const total = answersToWeights([0, 0]);
    for (const id of new Set([...Object.keys(first), ...Object.keys(second)])) {
      expect(total[id]).toBeCloseTo((first[id] ?? 0) + (second[id] ?? 0));
    }
  });

  it('답하지 않은 카드(null)는 건너뛴다', () => {
    expect(answersToWeights([null, null])).toEqual({});
  });

  it('없는 선택지 번호면 에러', () => {
    expect(() => answersToWeights([99])).toThrow();
  });
});
