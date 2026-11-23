// 표정 값 보정·정규화.
// 1) 보정: 사람마다 무표정일 때의 근육값이 다르다(원래 눈썹이 내려가 있는 사람 등).
//    시작할 때 몇 초 무표정을 기록해 그 값을 빼고 계산한다.
// 2) 정규화: 근육마다 움직이는 폭이 다르다(웃음은 0.9까지, 찡그림은 0.3 정도).
//    근육별 '보통 최대치'로 나눠 0~1로 맞춰야 슬픔·분노 단서가 웃음에 묻히지 않는다.

// 근육별 보통 최대치(추정값). face-lab.html로 실제 얼굴 데이터를 모아 조정한다.
export const FACE_RANGES = {
  mouthSmileLeft: 0.8, mouthSmileRight: 0.8,
  mouthFrownLeft: 0.3, mouthFrownRight: 0.3,
  browDownLeft: 0.5, browDownRight: 0.5,
  browInnerUp: 0.6,
  browOuterUpLeft: 0.6, browOuterUpRight: 0.6,
  eyeWideLeft: 0.45, eyeWideRight: 0.45,
  eyeSquintLeft: 0.6, eyeSquintRight: 0.6,
  eyeBlinkLeft: 0.8, eyeBlinkRight: 0.8,
  jawOpen: 0.6,
  mouthPressLeft: 0.5, mouthPressRight: 0.5,
  noseSneerLeft: 0.4, noseSneerRight: 0.4,
  mouthStretchLeft: 0.35, mouthStretchRight: 0.35,
  cheekSquintLeft: 0.5, cheekSquintRight: 0.5,
  mouthUpperUpLeft: 0.5, mouthUpperUpRight: 0.5,
  mouthPucker: 0.7,
};
const DEFAULT_RANGE = 0.5;
const MIN_SPAN = 0.05; // 기준값이 최대치에 가까워도 0으로 나누지 않게

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

export function createNormalizer(baseline) {
  const observedMax = {};
  return {
    normalize(scores, pitch = 0) {
      const out = {};
      for (const [k, v] of Object.entries(scores)) {
        observedMax[k] = Math.max(observedMax[k] ?? 0, v);
        const base = baseline.scores[k] ?? 0;
        const top = Math.max(FACE_RANGES[k] ?? DEFAULT_RANGE, observedMax[k]);
        const span = Math.max(MIN_SPAN, top - base);
        out[k] = Math.min(1, Math.max(0, (v - base) / span));
      }
      return { scores: out, pitch: pitch - baseline.pitch };
    },
  };
}
