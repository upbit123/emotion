import { describe, it, expect } from 'vitest';
import {
  CARDS, DISTINGUISHERS, answersToWeights, gridToWeights, pickDistinguisher, cardReasons,
} from '../src/input/cards.js';
import { getEmotion } from '../src/emotion/emotions.js';

const choiceCards = CARDS.filter((c) => c.type === 'choice');
const allOptions = [...choiceCards, ...DISTINGUISHERS].flatMap((c) => c.options);

describe('CARDS', () => {
  it('첫 카드는 감정 좌표 판(Affect Grid)이다', () => {
    expect(CARDS[0].type).toBe('grid');
  });

  it('선택 카드에는 질문과 2개 이상의 선택지가 있다', () => {
    expect(choiceCards.length).toBeGreaterThanOrEqual(3);
    for (const card of choiceCards) {
      expect(card.question).toMatch(/[가-힣]/);
      expect(card.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('모든 선택지의 감정은 정의된 감정이다', () => {
    for (const option of allOptions) {
      for (const id of Object.keys(option.weights)) {
        expect(() => getEmotion(id)).not.toThrow();
      }
    }
  });
});

describe('gridToWeights (좌표 판)', () => {
  it('어떤 감정의 좌표를 찍으면 그 감정이 가장 크다', () => {
    for (const id of ['anxiety', 'calm', 'sadness', 'joy']) {
      const { valence, arousal } = getEmotion(id);
      const w = gridToWeights({ valence, arousal });
      const best = Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
      expect(best).toBe(id);
    }
  });

  it('가까운 감정 몇 개만 남기고 합은 1', () => {
    const w = gridToWeights({ valence: -0.5, arousal: 0.6 });
    expect(Object.keys(w).length).toBeLessThanOrEqual(3);
    expect(Object.values(w).reduce((s, x) => s + x, 0)).toBeCloseTo(1);
  });
});

describe('answersToWeights', () => {
  it('선택 카드는 고른 선택지의 가중치를 더한다', () => {
    const i = CARDS.findIndex((c) => c.type === 'choice');
    const answers = CARDS.map(() => null);
    answers[i] = 0;
    expect(answersToWeights(answers)).toEqual(CARDS[i].options[0].weights);
  });

  it('좌표 판 답은 좌표로 바꿔 더한다', () => {
    const answers = CARDS.map(() => null);
    answers[0] = { valence: 0.6, arousal: -0.6 };
    expect(answersToWeights(answers)).toEqual(gridToWeights({ valence: 0.6, arousal: -0.6 }));
  });

  it('구분 질문 답도 더한다', () => {
    const d = DISTINGUISHERS[0];
    const w = answersToWeights(CARDS.map(() => null), [{ id: d.id, choice: 0 }]);
    expect(w).toEqual(d.options[0].weights);
  });

  it('답하지 않은 카드(null)는 건너뛴다', () => {
    expect(answersToWeights(CARDS.map(() => null))).toEqual({});
  });

  it('없는 선택지 번호면 에러', () => {
    const i = CARDS.findIndex((c) => c.type === 'choice');
    const answers = CARDS.map(() => null);
    answers[i] = 99;
    expect(() => answersToWeights(answers)).toThrow();
  });
});

describe('pickDistinguisher (구분 질문 고르기)', () => {
  it('상위 두 감정이 비슷하고 구분 질문이 있으면 그 질문을 고른다', () => {
    const d = pickDistinguisher({ anxiety: 1, impatience: 0.8 });
    expect(d.pair.sort()).toEqual(['anxiety', 'impatience']);
  });

  it('1위가 확실히 크면 묻지 않는다', () => {
    expect(pickDistinguisher({ anxiety: 1, impatience: 0.3 })).toBeNull();
  });

  it('이미 물어본 질문은 다시 고르지 않는다', () => {
    const first = pickDistinguisher({ anxiety: 1, impatience: 0.9 });
    expect(pickDistinguisher({ anxiety: 1, impatience: 0.9 }, [first.id])).toBeNull();
  });

  it('구분 질문이 없는 조합이면 null', () => {
    expect(pickDistinguisher({ joy: 1, anger: 1 })).toBeNull();
  });
});

describe('cardReasons', () => {
  it('그 감정에 크게 기여한 답을 근거로 돌려준다', () => {
    const i = CARDS.findIndex((c) => c.type === 'choice');
    const answers = CARDS.map(() => null);
    answers[i] = 0;
    const [topId] = Object.entries(CARDS[i].options[0].weights).sort((a, b) => b[1] - a[1])[0];
    expect(cardReasons(answers, [], topId)).toContain(CARDS[i].options[0].label);
  });

  it('좌표 판에서 가까웠으면 그것도 근거가 된다', () => {
    const answers = CARDS.map(() => null);
    answers[0] = getEmotion('calm');
    expect(cardReasons(answers, [], 'calm')).toContain('좌표 판에서 가까움');
  });
});
