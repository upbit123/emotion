// 작품에서 다루는 12가지 감정.
// valence: 쾌(+1) ~ 불쾌(-1), arousal: 각성 높음(+1) ~ 낮음(-1). Russell 원형 모델 기준.
// 좌표는 초안이며 미리보기 확인 후 조정한다.
export const EMOTIONS = [
  // 쾌 · 각성 높음
  { id: 'joy', name: '기쁨', valence: 0.8, arousal: 0.5 },
  { id: 'excitement', name: '설렘', valence: 0.7, arousal: 0.7 },
  // 쾌 · 각성 낮음
  { id: 'calm', name: '평온', valence: 0.6, arousal: -0.6 },
  { id: 'relief', name: '안도', valence: 0.5, arousal: -0.4 },
  // 불쾌 · 각성 높음
  { id: 'anger', name: '분노', valence: -0.7, arousal: 0.8 },
  { id: 'irritation', name: '짜증', valence: -0.5, arousal: 0.5 },
  { id: 'anxiety', name: '불안', valence: -0.6, arousal: 0.6 },
  { id: 'impatience', name: '조급함', valence: -0.4, arousal: 0.7 },
  // 불쾌 · 각성 낮음
  { id: 'sadness', name: '슬픔', valence: -0.7, arousal: -0.4 },
  { id: 'hurt', name: '서운함', valence: -0.5, arousal: -0.2 },
  { id: 'lethargy', name: '무기력', valence: -0.4, arousal: -0.8 },
  // 쾌·불쾌 어느 쪽도 될 수 있음
  { id: 'surprise', name: '놀람', valence: 0.1, arousal: 0.8 },
];

const BY_ID = new Map(EMOTIONS.map((e) => [e.id, e]));

export function getEmotion(id) {
  const emotion = BY_ID.get(id);
  if (!emotion) {
    throw new Error(`알 수 없는 감정 id: ${id}`);
  }
  return emotion;
}
