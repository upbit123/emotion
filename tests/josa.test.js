import { describe, it, expect } from 'vitest';
import { withJosa } from '../src/ui/josa.js';

describe('withJosa (받침에 맞는 조사)', () => {
  it('와/과', () => {
    expect(withJosa('불안', '와/과')).toBe('불안과');
    expect(withJosa('분노', '와/과')).toBe('분노와');
  });

  it('이에요/예요', () => {
    expect(withJosa('조급함', '이에요/예요')).toBe('조급함이에요');
    expect(withJosa('안도', '이에요/예요')).toBe('안도예요');
  });

  it('한글로 끝나지 않으면 앞의 것을 쓴다', () => {
    expect(withJosa('ABC', '와/과')).toBe('ABC과');
  });
});
