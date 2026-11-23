// 감정 가중치({ joy: 0.6, calm: 0.3 })를 다루는 작은 도구들.

export function addWeights(base, extra, scale = 1) {
  const out = { ...base };
  for (const [id, w] of Object.entries(extra)) {
    out[id] = (out[id] ?? 0) + w * scale;
  }
  return out;
}

// 표정 신호가 프레임마다 흔들려 화면이 어지럽지 않도록 지수 이동 평균으로 부드럽게 한다.
export function smoothWeights(prev, next, alpha) {
  const out = {};
  for (const id of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    const v = (prev[id] ?? 0) * (1 - alpha) + (next[id] ?? 0) * alpha;
    if (v >= 0.005) out[id] = v;
  }
  return out;
}

export function topEmotions(weights, n, minShare = 0) {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  if (total <= 0) return [];
  return Object.entries(weights)
    .map(([id, w]) => ({ id, share: w / total }))
    .filter((e) => e.share >= minShare && e.share > 0)
    .sort((a, b) => b.share - a.share)
    .slice(0, n);
}

// 세션 동안 들어온 신호의 평균(결과 화면의 '겉' 레이어에 쓴다).
export function createAverager() {
  let sum = {};
  let count = 0;
  return {
    add(weights) {
      sum = addWeights(sum, weights);
      count += 1;
    },
    value() {
      if (count === 0) return {};
      const out = {};
      for (const [id, w] of Object.entries(sum)) out[id] = w / count;
      return out;
    },
    count: () => count,
  };
}

// 입력마다 값의 크기가 달라서(카드는 1 이상, 표정은 0.1~0.3) 그냥 더하면 한 입력이 다른 입력을 덮는다.
// 각 입력을 합 1로 맞춘 뒤 반영 비율(scale)을 곱해 더한다.
export function combineSources(sources) {
  let out = {};
  for (const { weights, scale } of sources) {
    const total = Object.values(weights).reduce((s, w) => s + w, 0);
    if (total <= 0) continue;
    for (const [id, w] of Object.entries(weights)) {
      out[id] = (out[id] ?? 0) + (w / total) * scale;
    }
  }
  return out;
}
