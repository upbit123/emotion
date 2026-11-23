import { getEmotion } from './emotions.js';

// 감정별 가중치({ anxiety: 0.6, irritation: 0.3 })를 하나의 좌표로 합친다.
// 평균 좌표만 쓰면 '기쁨+슬픔'처럼 반대 감정이 섞일 때 0 근처로 사라지므로,
// 구성 감정(components)도 함께 돌려줘 그리는 쪽에서 겹쳐 표현할 수 있게 한다.
export function mixEmotions(weights) {
  const entries = Object.entries(weights);

  for (const [id, weight] of entries) {
    getEmotion(id); // 모르는 id면 여기서 에러
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error(`가중치는 0 이상의 숫자여야 함: ${id}=${weight}`);
    }
  }

  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total === 0) {
    throw new Error('가중치 합이 0이라 섞을 감정이 없음');
  }

  const components = entries
    .filter(([, w]) => w > 0)
    .map(([id, w]) => ({ id, weight: w / total }))
    .sort((a, b) => b.weight - a.weight);

  let valence = 0;
  let arousal = 0;
  for (const { id, weight } of components) {
    const e = getEmotion(id);
    valence += e.valence * weight;
    arousal += e.arousal * weight;
  }

  return { valence, arousal, components };
}
