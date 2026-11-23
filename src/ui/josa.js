// 앞말의 받침에 맞춰 조사를 붙인다. pair는 '받침 없을 때/받침 있을 때'가 아니라
// 한국어 문법책 표기 순서대로 '와/과', '이에요/예요'처럼 받는다.
const PAIRS = {
  '와/과': ['과', '와'],
  '이에요/예요': ['이에요', '예요'],
  '을/를': ['을', '를'],
  '이/가': ['이', '가'],
};

function hasBatchim(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return true; // 한글이 아니면 받침 있는 쪽으로
  return code % 28 !== 0;
}

export function withJosa(word, pair) {
  const [withFinal, withoutFinal] = PAIRS[pair];
  return word + (hasBatchim(word) ? withFinal : withoutFinal);
}
