// MediaPipe 얼굴 움직임 수치(blendshapes, 0~1) → 감정 단서.
// 표정은 '판정'이 아니라 '단서'다. 그래서 어떤 근육 움직임 때문에 그렇게 보였는지 설명할 수 있게
// 규칙을 직접 쓴다. 평온·무기력 같은 낮은 각성 감정은 표정으로 잘 드러나지 않아 다루지 않는다.

const avg = (s, left, right) => ((s[left] ?? 0) + (s[right] ?? 0)) / 2;

function features(s) {
  return {
    smile: avg(s, 'mouthSmileLeft', 'mouthSmileRight'),
    frown: avg(s, 'mouthFrownLeft', 'mouthFrownRight'),
    browDown: avg(s, 'browDownLeft', 'browDownRight'),
    browInnerUp: s.browInnerUp ?? 0,
    eyeWide: avg(s, 'eyeWideLeft', 'eyeWideRight'),
    jawOpen: s.jawOpen ?? 0,
    press: avg(s, 'mouthPressLeft', 'mouthPressRight'),
    sneer: avg(s, 'noseSneerLeft', 'noseSneerRight'),
    stretch: avg(s, 'mouthStretchLeft', 'mouthStretchRight'),
    cheek: avg(s, 'cheekSquintLeft', 'cheekSquintRight'),
    upperUp: avg(s, 'mouthUpperUpLeft', 'mouthUpperUpRight'),
  };
}

const MIN_SIGNAL = 0.15;

export function blendshapesToWeights(scores) {
  const f = features(scores);
  const raw = {
    joy: f.smile * 0.8 + f.cheek * 0.2,
    surprise: f.eyeWide * 0.4 + f.jawOpen * 0.3 + f.browInnerUp * 0.3,
    anger: f.browDown * 0.6 + f.press * 0.2 + f.sneer * 0.2,
    sadness: f.frown * 0.6 + f.browInnerUp * 0.2 + f.press * 0.2,
    anxiety: f.eyeWide * 0.4 + f.stretch * 0.4 + f.browInnerUp * 0.2,
    irritation: f.sneer * 0.5 + f.browDown * 0.3 + f.upperUp * 0.2,
  };
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([, w]) => w >= MIN_SIGNAL)
      .map(([id, w]) => [id, Math.min(1, w)])
      .sort((a, b) => b[1] - a[1]),
  );
}

const CUES = [
  { key: 'smile', label: '입꼬리 올라감' },
  { key: 'frown', label: '입꼬리 내려감' },
  { key: 'browDown', label: '눈썹 내려감' },
  { key: 'browInnerUp', label: '눈썹 안쪽 올라감' },
  { key: 'eyeWide', label: '눈 크게 뜸' },
  { key: 'jawOpen', label: '입 벌림' },
  { key: 'press', label: '입술 누름' },
  { key: 'sneer', label: '코 찡그림' },
  { key: 'stretch', label: '입을 옆으로 당김' },
  { key: 'cheek', label: '볼 올라감' },
  { key: 'upperUp', label: '윗입술 올라감' },
];

const MIN_CUE = 0.3;

// "왜 그렇게 보였는지" 화면에 보여 줄 얼굴 움직임 목록
export function explainCues(scores) {
  const f = features(scores);
  return CUES.map(({ key, label }) => ({ label, value: f[key] }))
    .filter((c) => c.value >= MIN_CUE)
    .sort((a, b) => b.value - a.value);
}
