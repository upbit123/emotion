// 감정 좌표 → 시각 값. 그리기와 분리된 순수 함수라 테스트로 검증한다.
//
// 축 규칙(모든 감정 공통)
//   쾌 ↑ → 밝기 ↑, 형태 둥글어짐   (Valdez & Mehrabian 1994, Bar & Neta 2006)
//   각성 ↑ → 채도 ↑, 움직임 빨라짐 (Valdez & Mehrabian 1994)
// 색상(hue)은 축에 묶지 않는다. 분노처럼 '따뜻한 색인데 불쾌한' 감정이 있기 때문.

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function axisStyle({ valence, arousal }) {
  const v = (valence + 1) / 2; // 0~1
  const a = (arousal + 1) / 2; // 0~1
  return {
    brightness: 30 + 55 * v,
    saturation: 25 + 65 * a,
    roundness: v,
    speed: 0.3 + 1.7 * a,
  };
}

// 감정별 고유 표현. chroma는 채도 배율(회색 감정은 낮게), lift는 밝기 보정.
export const EMOTION_STYLES = {
  joy: { hue: 52, chroma: 1, motif: 'bubbles' }, //        노랑, 위로 튀는 둥근 방울
  excitement: { hue: 345, chroma: 0.8, motif: 'sparkles' }, // 코랄 분홍, 반짝이며 떠오르는 점
  calm: { hue: 172, chroma: 0.8, motif: 'ripples' }, //    청록, 느리게 퍼지는 물결
  relief: { hue: 95, chroma: 0.7, motif: 'unknot' }, //    연두, 천천히 풀리는 매듭
  anger: { hue: 0, chroma: 1, motif: 'shards' }, //        진빨강, 터져 나가는 각진 파편
  irritation: { hue: 18, chroma: 0.95, motif: 'zigzag' }, // 주홍, 짧게 끊기는 지그재그
  anxiety: { hue: 275, chroma: 0.55, motif: 'tremble' }, // 탁한 보라, 가늘게 떨리는 선
  impatience: { hue: 40, chroma: 0.85, motif: 'rush' }, // 겨자, 한쪽으로 몰리는 줄무늬
  sadness: { hue: 225, chroma: 0.8, motif: 'drip' }, //    남색, 흘러내리는 선
  hurt: { hue: 205, chroma: 0.35, motif: 'drift' }, //     회청색, 다가가다 멀어지는 두 점
  lethargy: { hue: 0, chroma: 0.08, motif: 'dust' }, //    회색, 가라앉는 먼지
  surprise: { hue: 188, chroma: 0.45, lift: 15, motif: 'burst' }, // 흰빛 시안, 퍼지는 동심원
};

export function toVisual(mix) {
  const mood = axisStyle(mix);
  const layers = mix.components.map(({ id, weight }) => {
    const style = EMOTION_STYLES[id];
    return {
      id,
      weight,
      motif: style.motif,
      color: {
        h: style.hue,
        s: clamp(mood.saturation * style.chroma, 0, 100),
        b: clamp(mood.brightness + 20 + (style.lift ?? 0), 0, 100),
      },
    };
  });

  const dominant = EMOTION_STYLES[mix.components[0].id];
  return {
    mood,
    layers,
    background: {
      h: dominant.hue,
      s: clamp(mood.saturation * 0.35 * dominant.chroma, 0, 100),
      b: clamp(8 + mood.brightness * 0.6, 0, 100),
    },
  };
}
