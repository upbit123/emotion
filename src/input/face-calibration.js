// 표정 값 보정·정규화.
// 1) 보정: 사람마다 무표정일 때의 근육값이 다르다(원래 눈썹이 내려가 있는 사람 등).
//    시작할 때 몇 초 무표정을 기록해 그 값을 빼고 계산한다.
// 2) 정규화: 근육마다 움직이는 폭이 다르다(웃음은 0.9까지, 찡그림은 0.3 정도).
//    근육별 '보통 최대치'로 나눠 0~1로 맞춰야 슬픔·분노 단서가 웃음에 묻히지 않는다.
// 3) 떨어지는 값(drops): 무표정에서 이미 높은 근육은 오르기보다 내려가는 쪽으로 움직인다.
//    예: 평소 눈을 찡그린 사람이 눈을 크게 뜨면 '눈 크게 뜸'보다 '찡그림이 풀림'으로 나타난다.

// 근육별 보통 최대치. 2026-11-24 face-lab 기록(15개)에서 눈썹 내려감·눈 크게 뜸·입 옆으로 당김 등은
// 힘껏 해도 0.1~0.2에 그쳐 기본값을 낮췄다. 실험실의 '내 얼굴 범위 적용'으로 개인 값을 쓸 수 있다.
export const FACE_RANGES = {
  mouthSmileLeft: 0.8, mouthSmileRight: 0.8,
  mouthFrownLeft: 0.15, mouthFrownRight: 0.15,
  browDownLeft: 0.25, browDownRight: 0.25,
  browInnerUp: 0.6,
  browOuterUpLeft: 0.6, browOuterUpRight: 0.6,
  eyeWideLeft: 0.25, eyeWideRight: 0.25,
  eyeSquintLeft: 0.6, eyeSquintRight: 0.6,
  eyeBlinkLeft: 0.8, eyeBlinkRight: 0.8,
  jawOpen: 0.6,
  mouthPressLeft: 0.5, mouthPressRight: 0.5,
  mouthRollLower: 0.5, mouthRollUpper: 0.5,
  noseSneerLeft: 0.2, noseSneerRight: 0.2,
  mouthStretchLeft: 0.15, mouthStretchRight: 0.15,
  cheekSquintLeft: 0.3, cheekSquintRight: 0.3,
  mouthUpperUpLeft: 0.5, mouthUpperUpRight: 0.5,
  mouthPucker: 0.7,
  eyeLookInLeft: 0.5, eyeLookInRight: 0.5,
  eyeLookOutLeft: 0.5, eyeLookOutRight: 0.5,
};
const DEFAULT_RANGE = 0.5;
const MIN_SPAN = 0.05; //      기준값이 최대치에 가까워도 0으로 나누지 않게
const DROP_MIN_BASE = 0.2; //  무표정 값이 이 이상인 근육만 '떨어짐'을 본다
const SATURATED = 0.9; //      무표정이 최대치의 90% 이상이면 움직일 여지가 없어 쓰지 않는다
const PERSONAL_PERCENTILE = 0.95;

export function createCalibrator() {
  let sum = {};
  let pitchSum = 0;
  let count = 0;
  return {
    add(scores, pitch = 0) {
      for (const [k, v] of Object.entries(scores)) sum[k] = (sum[k] ?? 0) + v;
      pitchSum += pitch;
      count += 1;
    },
    count: () => count,
    baseline() {
      const scores = {};
      for (const [k, v] of Object.entries(sum)) scores[k] = count ? v / count : 0;
      return { scores, pitch: count ? pitchSum / count : 0 };
    },
  };
}

export function createNormalizer(baseline, ranges = FACE_RANGES) {
  const observedMax = {};
  const unusable = new Set();
  return {
    normalize(scores, pitch = 0) {
      const out = {};
      const drops = {};
      for (const [k, v] of Object.entries(scores)) {
        const base = baseline.scores[k] ?? 0;
        const range = ranges[k] ?? FACE_RANGES[k] ?? DEFAULT_RANGE;
        if (base >= 0.6 && base >= range * SATURATED) {
          unusable.add(k);
          out[k] = 0;
          continue;
        }
        observedMax[k] = Math.max(observedMax[k] ?? 0, v);
        const span = Math.max(MIN_SPAN, Math.max(range, observedMax[k]) - base);
        out[k] = Math.min(1, Math.max(0, (v - base) / span));
        if (base >= DROP_MIN_BASE) drops[k] = Math.min(1, Math.max(0, (base - v) / base));
      }
      return { scores: out, drops, pitch: pitch - baseline.pitch };
    },
    unusable: () => [...unusable],
  };
}

// 실험실 기록에서 근육별 개인 범위(95% 지점)를 만든다. 거의 안 움직인 근육은 기본값을 둔다.
export function personalRanges(samples, baseline, defaults = FACE_RANGES) {
  const values = {};
  for (const { frames } of samples) {
    for (const { scores } of frames) {
      for (const [k, v] of Object.entries(scores)) (values[k] ??= []).push(v);
    }
  }
  const out = {};
  for (const [k, fallback] of Object.entries(defaults)) {
    const list = (values[k] ?? []).sort((a, b) => a - b);
    const p = list.length ? list[Math.floor((list.length - 1) * PERSONAL_PERCENTILE)] : 0;
    out[k] = p - (baseline.scores[k] ?? 0) >= 0.05 ? p : fallback;
  }
  return out;
}
