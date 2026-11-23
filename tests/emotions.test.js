import { describe, it, expect } from 'vitest';
import { EMOTIONS, getEmotion } from '../src/emotion/emotions.js';

describe('EMOTIONS', () => {
  it('12개 감정을 다룬다', () => {
    expect(EMOTIONS).toHaveLength(12);
  });

  it('id가 겹치지 않는다', () => {
    const ids = EMOTIONS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 감정에 한국어 이름이 있다', () => {
    for (const e of EMOTIONS) {
      expect(e.name).toMatch(/[가-힣]/);
    }
  });

  it('쾌–불쾌(valence)와 각성(arousal)은 -1~1 범위다', () => {
    for (const e of EMOTIONS) {
      expect(e.valence).toBeGreaterThanOrEqual(-1);
      expect(e.valence).toBeLessThanOrEqual(1);
      expect(e.arousal).toBeGreaterThanOrEqual(-1);
      expect(e.arousal).toBeLessThanOrEqual(1);
    }
  });
});

describe('getEmotion', () => {
  it('id로 감정을 찾는다', () => {
    expect(getEmotion('anxiety').name).toBe('불안');
  });

  it('모르는 id면 에러를 던진다', () => {
    expect(() => getEmotion('unknown')).toThrow('unknown');
  });
});
