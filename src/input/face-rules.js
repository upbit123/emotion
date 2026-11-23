// 보정·정규화한 얼굴 움직임(0~1) → 감정 단서.
//
// 규칙은 FACS(얼굴 근육 움직임 코딩 체계)에서 감정별로 함께 나타난다고 정리된 근육 조합을 따른다.
//   기쁨 AU6+12(볼·입꼬리 올라감), 슬픔 AU1+4+15(눈썹 안쪽 올라감·모임, 입꼬리 내려감),
//   놀람 AU1+2+5+26(눈썹 올라감, 눈 크게, 입 벌림), 두려움 AU1+2+4+5+20(+입 옆으로 당김),
//   분노 AU4+5/7+23(눈썹 내려감, 눈 긴장, 입술 누름), 혐오 AU9+10(코 찡그림, 윗입술 올라감)
// 단서를 더하는 대신 '함께 나타나야' 점수가 오르게(기하평균) 해서, 한 단서가 여러 감정에 동시에
// 점수를 주지 않게 한다. 웃음은 부정 감정을 누르는 억제 단서로 쓴다.
// 표정은 판정이 아니라 단서다. 그래서 왜 그렇게 보였는지 설명할 수 있게 규칙을 직접 쓴다.

const avg = (s, left, right) => ((s[left] ?? 0) + (s[right] ?? 0)) / 2;
const both = (a, b) => Math.sqrt(Math.max(0, a) * Math.max(0, b)); // 둘 다 있어야 커진다
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// 고개를 이만큼(라디안, 약 20도) 숙이면 '고개 숙임' 1
const HEAD_DOWN_FULL = 0.35;

export function features(s, head = {}) {
  const blink = avg(s, 'eyeBlinkLeft', 'eyeBlinkRight');
  return {
    smile: avg(s, 'mouthSmileLeft', 'mouthSmileRight'),
    frown: avg(s, 'mouthFrownLeft', 'mouthFrownRight'),
    browDown: avg(s, 'browDownLeft', 'browDownRight'),
    browInnerUp: s.browInnerUp ?? 0,
    browOuterUp: avg(s, 'browOuterUpLeft', 'browOuterUpRight'),
    eyeWide: avg(s, 'eyeWideLeft', 'eyeWideRight'),
    eyeSquint: avg(s, 'eyeSquintLeft', 'eyeSquintRight'),
    // 완전히 감은 눈은 깜빡임이라 '처짐'으로 보지 않는다
    droop: blink >= 0.9 ? 0 : blink,
    jawOpen: s.jawOpen ?? 0,
    press: avg(s, 'mouthPressLeft', 'mouthPressRight'),
    sneer: avg(s, 'noseSneerLeft', 'noseSneerRight'),
    stretch: avg(s, 'mouthStretchLeft', 'mouthStretchRight'),
    cheek: avg(s, 'cheekSquintLeft', 'cheekSquintRight'),
    upperUp: avg(s, 'mouthUpperUpLeft', 'mouthUpperUpRight'),
    pout: s.mouthPucker ?? 0,
    headDown: clamp01((head.pitch ?? 0) / HEAD_DOWN_FULL),
  };
}

const MIN_SIGNAL = 0.15;

export function blendshapesToWeights(scores, head = {}) {
  const f = features(scores, head);
  const notSmile = 1 - 0.8 * f.smile;
  const browsUp = (f.browInnerUp + f.browOuterUp) / 2;
  // 웃음 외의 움직임이 거의 없을 때 1
  const stillness = 1 - Math.max(f.frown, f.browDown, f.browInnerUp, f.eyeWide, f.jawOpen,
    f.press, f.sneer, f.stretch, f.pout, f.upperUp, f.eyeSquint, f.droop, f.headDown);
  // 살짝 미소(0.1~0.45)에서 가장 크고, 활짝 웃으면 0
  const softSmile = f.smile <= 0.45 ? f.smile / 0.45 : clamp01(1 - (f.smile - 0.45) / 0.3);

  const raw = {
    joy: f.smile * (0.7 + 0.3 * f.cheek) * (1 - 0.5 * f.frown),
    excitement: both(f.smile, Math.max(f.eyeWide, 0.8 * f.jawOpen)),
    calm: both(softSmile, stillness) * 0.8,
    surprise: both(browsUp, Math.max(f.eyeWide, f.jawOpen)) * (1 - f.browDown) * (1 - f.stretch) * (1 - 0.6 * f.smile),
    anxiety: both(f.browInnerUp, Math.max(f.eyeWide, f.stretch)) * (0.4 + 0.6 * Math.max(f.browDown, f.stretch)) * notSmile,
    anger: both(f.browDown, Math.max(f.press, f.eyeSquint, 0.7 * f.sneer)) * (1 - 0.6 * f.browInnerUp) * notSmile,
    irritation: both(Math.max(f.sneer, f.upperUp), Math.max(f.browDown, f.frown, 0.3)) * notSmile,
    sadness: both(f.frown, Math.max(f.browInnerUp, 0.6 * f.browDown)) * (1 - 0.8 * f.smile),
    hurt: both(f.pout, Math.max(f.frown, f.browInnerUp, 0.3)) * notSmile,
    lethargy: both(f.droop, Math.max(f.headDown, 0.3)) * notSmile,
  };

  return Object.fromEntries(
    Object.entries(raw)
      .map(([id, w]) => [id, clamp01(w)])
      .filter(([, w]) => w >= MIN_SIGNAL)
      .sort((a, b) => b[1] - a[1]),
  );
}

export const CUE_LABELS = {
  smile: '입꼬리 올라감',
  frown: '입꼬리 내려감',
  browDown: '눈썹 내려감',
  browInnerUp: '눈썹 안쪽 올라감',
  browOuterUp: '눈썹 바깥 올라감',
  eyeWide: '눈 크게 뜸',
  eyeSquint: '눈 가늘게 뜸',
  droop: '눈꺼풀 처짐',
  jawOpen: '입 벌림',
  press: '입술 누름',
  sneer: '코 찡그림',
  stretch: '입을 옆으로 당김',
  cheek: '볼 올라감',
  upperUp: '윗입술 올라감',
  pout: '입 삐죽',
  headDown: '고개 숙임',
};

const MIN_CUE = 0.3;

// "왜 그렇게 보였는지" 화면에 보여 줄 얼굴 움직임 목록
export function explainCues(scores, head = {}) {
  return cueValues(features(scores, head));
}

export function cueValues(f) {
  return Object.entries(CUE_LABELS)
    .map(([key, label]) => ({ key, label, value: f[key] ?? 0 }))
    .filter((c) => c.value >= MIN_CUE)
    .sort((a, b) => b.value - a.value);
}

// 감정마다 근거가 되는 얼굴 움직임(규칙에서 점수를 올리는 쪽만)
const EMOTION_FEATURES = {
  joy: ['smile', 'cheek'],
  excitement: ['smile', 'eyeWide', 'jawOpen'],
  calm: ['smile'],
  surprise: ['browInnerUp', 'browOuterUp', 'eyeWide', 'jawOpen'],
  anxiety: ['browInnerUp', 'eyeWide', 'stretch', 'browDown'],
  anger: ['browDown', 'press', 'eyeSquint', 'sneer'],
  irritation: ['sneer', 'upperUp', 'browDown'],
  sadness: ['frown', 'browInnerUp', 'browDown'],
  hurt: ['pout', 'frown'],
  lethargy: ['droop', 'headDown'],
};

// featureAvg: 세션 동안의 features() 평균
export function faceReasons(featureAvg, emotionId) {
  return (EMOTION_FEATURES[emotionId] ?? [])
    .filter((key) => (featureAvg[key] ?? 0) >= MIN_CUE)
    .sort((a, b) => featureAvg[b] - featureAvg[a])
    .map((key) => CUE_LABELS[key]);
}
