// 보정·정규화한 얼굴 움직임(0~1) → 감정 단서.
//
// 규칙은 FACS(얼굴 근육 움직임 코딩 체계)에서 감정별로 함께 나타난다고 정리된 근육 조합을 따른다.
//   기쁨 AU6+12(볼·입꼬리 올라감), 슬픔 AU1+4+15(눈썹 안쪽 올라감·모임, 입꼬리 내려감),
//   놀람 AU1+2+5+26(눈썹 올라감, 눈 크게, 입 벌림), 두려움 AU1+2+4+5+20(+입 옆으로 당김),
//   분노 AU4+5/7+23(눈썹 내려감, 눈 긴장, 입술 누름), 혐오 AU9+10(코 찡그림, 윗입술 올라감)
// 단서를 더하는 대신 '함께 나타나야' 점수가 오르게(기하평균) 해서, 한 단서가 여러 감정에 동시에
// 점수를 주지 않게 한다. 웃음은 부정 감정을 누르는 억제 단서로 쓴다.
// 표정은 판정이 아니라 단서다. 그래서 왜 그렇게 보였는지 설명할 수 있게 규칙을 직접 쓴다.

import { EMOTIONS } from '../emotion/emotions.js';

const VALENCE = Object.fromEntries(EMOTIONS.map((e) => [e.id, e.valence]));
const avg = (s, left, right) => ((s[left] ?? 0) + (s[right] ?? 0)) / 2;
const both = (a, b) => Math.sqrt(Math.max(0, a) * Math.max(0, b)); // 둘 다 있어야 커진다
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// 고개를 이만큼(라디안, 약 20도) 숙이면 '고개 숙임' 1
const HEAD_DOWN_FULL = 0.35;

// head: { pitch: 고개 숙임(라디안, 보정 후), drops: 무표정보다 떨어진 근육값 }
export function features(s, head = {}) {
  const blink = avg(s, 'eyeBlinkLeft', 'eyeBlinkRight');
  const drops = head.drops ?? {};
  const eyeWide = avg(s, 'eyeWideLeft', 'eyeWideRight');
  return {
    smile: avg(s, 'mouthSmileLeft', 'mouthSmileRight'),
    // 양쪽이 함께 올라간 정도(한쪽만 웃으면 작다)
    smileSym: 0.6 * Math.min(s.mouthSmileLeft ?? 0, s.mouthSmileRight ?? 0) + 0.4 * avg(s, 'mouthSmileLeft', 'mouthSmileRight'),
    smileAsym: Math.abs((s.mouthSmileLeft ?? 0) - (s.mouthSmileRight ?? 0)),
    frown: avg(s, 'mouthFrownLeft', 'mouthFrownRight'),
    browDown: avg(s, 'browDownLeft', 'browDownRight'),
    browInnerUp: s.browInnerUp ?? 0,
    browOuterUp: avg(s, 'browOuterUpLeft', 'browOuterUpRight'),
    eyeWide,
    // 평소 찡그린 눈이 풀리는 것도 눈을 크게 뜬 것으로 본다
    eyeOpen: Math.max(eyeWide, avg(drops, 'eyeSquintLeft', 'eyeSquintRight')),
    eyeSquint: avg(s, 'eyeSquintLeft', 'eyeSquintRight'),
    // 완전히 감은 눈은 깜빡임이라 '처짐'으로 보지 않는다
    droop: blink >= 0.9 ? 0 : blink,
    jawOpen: s.jawOpen ?? 0,
    press: avg(s, 'mouthPressLeft', 'mouthPressRight'),
    // 입술을 안으로 말아 앙다묾(분노 기록에서 가장 크게 움직인 근육)
    roll: ((s.mouthRollLower ?? 0) + (s.mouthRollUpper ?? 0)) / 2,
    // 두 눈이 같은 쪽 옆으로 향함 = 흘겨봄(짜증 기록에서 두드러진 움직임)
    glance: Math.max(avg(s, 'eyeLookOutLeft', 'eyeLookInRight'), avg(s, 'eyeLookInLeft', 'eyeLookOutRight')),
    sneer: avg(s, 'noseSneerLeft', 'noseSneerRight'),
    stretch: avg(s, 'mouthStretchLeft', 'mouthStretchRight'),
    cheek: avg(s, 'cheekSquintLeft', 'cheekSquintRight'),
    upperUp: avg(s, 'mouthUpperUpLeft', 'mouthUpperUpRight'),
    pout: s.mouthPucker ?? 0,
    headDown: clamp01((head.pitch ?? 0) / HEAD_DOWN_FULL),
  };
}

const MIN_SIGNAL = 0.15;

// suppress=false면 웃음 같은 억제 단서를 빼고 계산한다(섞인 표정 찾기용).
function ruleScores(f, { suppress = true } = {}) {
  const notSmile = suppress ? 1 - 0.8 * f.smile : 1;
  const off = (x) => (suppress ? x : 1);
  const browsUp = (f.browInnerUp + f.browOuterUp) / 2;
  // 웃음 외의 움직임이 거의 없을 때 1(눈꺼풀이 조금 내려가거나 고개를 살짝 숙이는 건 이완으로 본다)
  const stillness = 1 - Math.max(f.frown, f.browDown, f.browInnerUp, f.eyeOpen, f.jawOpen,
    f.press, f.roll, f.sneer, f.stretch, f.pout, f.upperUp, f.eyeSquint, f.glance);
  const tension = Math.max(f.press, f.roll); // 입에 힘이 들어감
  // 양쪽이 고르게 살짝 올라간 미소(0.1~0.45)에서 가장 크고, 활짝 웃거나 한쪽만 올라가면 작다
  const soft = f.smileSym <= 0.45 ? f.smileSym / 0.45 : clamp01(1 - (f.smileSym - 0.45) / 0.3);
  const softSmile = soft * clamp01(1 - 2 * f.smileAsym);

  return {
    // 한쪽만 올라간 입꼬리(비웃음·머쓱함)는 기쁨으로 덜 본다
    // 눈을 뜨거나 눈썹이 올라간 웃음은 기쁨보다 설렘 쪽으로 나눠 준다
    joy: f.smileSym * (0.7 + 0.3 * f.cheek) * off(1 - 0.5 * f.frown) * off(1 - 0.5 * Math.max(f.eyeOpen, f.jawOpen, f.browOuterUp)),
    excitement: both(f.smileSym, Math.max(f.eyeOpen, 0.8 * f.jawOpen, f.browOuterUp)),
    calm: both(softSmile, stillness) * 0.8,
    surprise: both(browsUp, Math.max(f.eyeOpen, f.jawOpen)) * off((1 - f.browDown) * (1 - f.stretch) * (1 - 0.6 * f.smile)),
    anxiety: both(f.browInnerUp, Math.max(f.eyeOpen, f.stretch)) * (0.4 + 0.6 * Math.max(f.browDown, f.stretch)) * notSmile,
    anger: both(Math.max(f.browDown, f.eyeSquint), Math.max(f.press, f.roll, 0.7 * f.sneer)) * off(1 - 0.6 * f.browInnerUp) * notSmile,
    irritation: both(Math.max(f.sneer, f.upperUp, f.glance), Math.max(f.browDown, f.frown, f.eyeSquint, 0.3)) * notSmile,
    sadness: both(f.frown, Math.max(f.browInnerUp, 0.6 * f.browDown)) * off(1 - 0.8 * f.smile),
    hurt: both(f.pout, Math.max(f.frown, f.browInnerUp, 0.3)) * notSmile,
    // 눈꺼풀과 고개 숙임이 함께 있어야 하고, 입에 힘이 들어가 있으면(분노 등) 무기력으로 보지 않는다
    lethargy: both(f.droop, f.headDown) * off(1 - tension) * notSmile,
  };
}

function filterSort(raw, min) {
  return Object.fromEntries(
    Object.entries(raw)
      .map(([id, w]) => [id, clamp01(w)])
      .filter(([, w]) => w >= min)
      .sort((a, b) => b[1] - a[1]),
  );
}

export function blendshapesToWeights(scores, head = {}) {
  return filterSort(ruleScores(features(scores, head)), MIN_SIGNAL);
}

export function intensityOf(w) {
  if (w < 0.35) return '살짝';
  if (w < 0.65) return '뚜렷하게';
  return '강하게';
}

const ASYM_MIN = 0.3;
const ASYMMETRIES = [
  ['mouthSmileLeft', 'mouthSmileRight', '한쪽 입꼬리만 올라감'],
  ['browOuterUpLeft', 'browOuterUpRight', '한쪽 눈썹만 올라감'],
  ['browDownLeft', 'browDownRight', '한쪽 눈썹만 내려감'],
  ['eyeSquintLeft', 'eyeSquintRight', '한쪽 눈만 찡그림'],
];

// 한 프레임의 표정을 자세히 읽는다. 감정 점수 외에 미소의 종류, 좌우 비대칭,
// 웃음에 가려진 단서, 쾌·불쾌가 섞인 표정을 함께 돌려준다.
export function analyzeFace(scores, head = {}) {
  const f = features(scores, head);
  const weights = filterSort(ruleScores(f), MIN_SIGNAL);

  let smileKind = null;
  if (f.smile >= 0.4) {
    // 눈가 근육(AU6)까지 움직이면 뒤센 미소, 입만 움직이면 사회적 미소
    smileKind = Math.max(f.cheek, f.eyeSquint) >= 0.35 ? 'duchenne' : 'social';
  }

  const asymmetry = ASYMMETRIES.filter(([l, r]) => {
    const a = scores[l] ?? 0;
    const b = scores[r] ?? 0;
    return Math.abs(a - b) >= ASYM_MIN && Math.max(a, b) >= ASYM_MIN;
  }).map(([, , label]) => label);

  const masked = smileKind === 'social' && Math.max(f.frown, f.browInnerUp, f.browDown) >= 0.4;

  const unsuppressed = filterSort(ruleScores(f, { suppress: false }), 0.3);
  const ids = Object.keys(unsuppressed);
  // 놀람처럼 쾌·불쾌가 애매한 감정(|valence| < 0.3)은 섞임 판단에서 뺀다
  const pos = ids.find((id) => VALENCE[id] >= 0.3);
  const neg = ids.find((id) => VALENCE[id] <= -0.3);
  const mixed = pos && neg ? [pos, neg] : null;

  const intensity = Object.fromEntries(Object.entries(weights).map(([id, w]) => [id, intensityOf(w)]));
  return { features: f, weights, intensity, smileKind, asymmetry, masked, mixed };
}

const REGIONS = [
  ['눈썹', ['browInnerUp', 'browDown', 'browOuterUp']],
  ['눈', ['eyeOpen', 'eyeSquint', 'droop', 'glance']],
  ['볼·코', ['cheek', 'sneer']],
  ['입', ['smile', 'frown', 'press', 'roll', 'stretch', 'upperUp', 'pout', 'jawOpen']],
  ['고개', ['headDown']],
];

// 얼굴 부위마다 가장 강한 움직임과 그 강도
export function regionSummary(scores, head = {}) {
  return regionsOf(features(scores, head));
}

export function regionsOf(f) {
  return REGIONS.map(([region, keys]) => {
    const key = keys.reduce((a, b) => ((f[b] ?? 0) > (f[a] ?? 0) ? b : a));
    const value = f[key] ?? 0;
    return value < MIN_SIGNAL
      ? { region, label: '그대로', value, level: null }
      : { region, label: CUE_LABELS[key], value, level: intensityOf(value) };
  });
}

export const CUE_LABELS = {
  smile: '입꼬리 올라감',
  frown: '입꼬리 내려감',
  browDown: '눈썹 내려감',
  browInnerUp: '눈썹 안쪽 올라감',
  browOuterUp: '눈썹 바깥 올라감',
  eyeOpen: '눈 크게 뜸',
  eyeSquint: '눈 가늘게 뜸',
  droop: '눈꺼풀 처짐',
  jawOpen: '입 벌림',
  press: '입술 누름',
  roll: '입술 앙다묾',
  glance: '눈 흘김',
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
  excitement: ['smile', 'eyeOpen', 'jawOpen', 'browOuterUp'],
  calm: ['smile'],
  surprise: ['browInnerUp', 'browOuterUp', 'eyeOpen', 'jawOpen'],
  anxiety: ['browInnerUp', 'eyeOpen', 'stretch', 'browDown'],
  anger: ['browDown', 'eyeSquint', 'press', 'roll', 'sneer'],
  irritation: ['sneer', 'upperUp', 'glance', 'browDown'],
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
