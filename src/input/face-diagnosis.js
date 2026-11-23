// 표정 확인 실험실(face-lab.html)용 분석 도구.
import { CUE_LABELS } from './face-rules.js';
import { getEmotion } from '../emotion/emotions.js';

// 기록할 때 보여 줄 표정 가이드. 근육 조합은 face-rules.js의 FACS 규칙과 같다.
export const EXPRESSION_GUIDE = {
  neutral: '얼굴 힘을 빼고 정면을 보세요.',
  joy: '눈가에 주름이 생길 만큼 활짝 웃어 보세요(볼이 올라가야 해요).',
  excitement: '웃으면서 눈을 크게 떠 보세요.',
  calm: '힘을 뺀 채 입꼬리만 살짝 올려 보세요(활짝 웃지 않기).',
  relief: '표정으로는 잘 드러나지 않는 감정이에요. 숨을 내쉬며 얼굴 힘을 풀어 보세요.',
  anger: '눈썹을 모아 내리고 입술을 안으로 꾹 다물어 보세요.',
  irritation: '코를 찡그리거나, 못마땅하게 눈을 옆으로 흘겨 보세요.',
  anxiety: '눈썹 안쪽을 올리고, 눈을 크게 뜬 채 입을 옆으로 당겨 보세요.',
  impatience: '표정으로는 잘 드러나지 않는 감정이에요. 입술을 누르고 눈을 가늘게 떠 보세요.',
  sadness: '입꼬리를 내리고 눈썹 안쪽을 올려 보세요.',
  hurt: '입을 삐죽 내밀어 보세요.',
  lethargy: '눈꺼풀을 반쯤 내리고 고개를 살짝 숙여 보세요.',
  surprise: '눈썹을 올리고, 눈을 크게 뜨고, 입을 벌려 보세요.',
};

// 감정마다 규칙이 요구하는 움직임(묶음 안에서 하나만 있으면 됨)과 억제 단서
const NEED = 0.3;
const RULE_PARTS = {
  joy: { needs: [['smile']], bonus: ['cheek'], inhibit: ['frown'] },
  excitement: { needs: [['smile'], ['eyeOpen', 'jawOpen', 'browOuterUp']], inhibit: [] },
  calm: { needs: [['smile']], inhibit: ['frown', 'browDown', 'browInnerUp', 'eyeOpen', 'jawOpen', 'roll'] },
  surprise: { needs: [['browInnerUp', 'browOuterUp'], ['eyeOpen', 'jawOpen']], inhibit: ['browDown', 'stretch', 'smile'] },
  anxiety: { needs: [['browInnerUp'], ['eyeOpen', 'stretch']], bonus: ['browDown', 'stretch'], inhibit: ['smile'] },
  anger: { needs: [['browDown', 'eyeSquint'], ['press', 'roll', 'sneer']], inhibit: ['smile', 'browInnerUp'] },
  irritation: { needs: [['sneer', 'upperUp', 'glance']], inhibit: ['smile'] },
  sadness: { needs: [['frown'], ['browInnerUp', 'browDown']], inhibit: ['smile'] },
  hurt: { needs: [['pout']], inhibit: ['smile'] },
  lethargy: { needs: [['droop'], ['headDown']], inhibit: ['smile', 'press', 'roll'] },
};

const INHIBIT_AT = 0.4;

export function diagnoseRule(emotionId, f) {
  const rule = RULE_PARTS[emotionId];
  if (!rule) return { supported: false, parts: [], inhibitors: [] };
  const parts = rule.needs.map((keys) => {
    const best = keys.reduce((a, b) => ((f[b] ?? 0) > (f[a] ?? 0) ? b : a));
    const value = f[best] ?? 0;
    return { label: keys.map((k) => CUE_LABELS[k]).join(' 또는 '), value, ok: value >= NEED };
  });
  const inhibitors = rule.inhibit.map((key) => ({
    label: CUE_LABELS[key],
    value: f[key] ?? 0,
    blocking: (f[key] ?? 0) >= INHIBIT_AT,
  }));
  return { supported: true, parts, inhibitors };
}

// results: [{ label, predicted }] → 지은 표정별 판별 결과 집계
export function confusionRows(results) {
  const rows = new Map();
  for (const { label, predicted } of results) {
    const row = rows.get(label) ?? { label, total: 0, correct: 0, predictions: {} };
    row.total += 1;
    const ok = label === 'neutral' ? !predicted || predicted === 'calm' : predicted === label;
    if (ok) row.correct += 1;
    const key = predicted ?? 'none';
    row.predictions[key] = (row.predictions[key] ?? 0) + 1;
    rows.set(label, row);
  }
  return [...rows.values()];
}

export function predictionName(id) {
  return id && id !== 'none' ? getEmotion(id).name : '단서 없음';
}

// 기록된 원본값의 최대치가 보통 최대치(FACE_RANGES)의 70%도 안 되면, 범위를 낮추자고 제안한다.
// 그 근육을 이 사람은 원래 작게 움직인다는 뜻이라, 범위를 낮춰야 단서로 잡힌다.
export function suggestRanges(samples, ranges) {
  const observed = {};
  for (const { frames } of samples) {
    for (const { scores } of frames) {
      for (const [k, v] of Object.entries(scores)) observed[k] = Math.max(observed[k] ?? 0, v);
    }
  }
  return Object.entries(ranges)
    .filter(([k, current]) => observed[k] > 0.05 && observed[k] < current * 0.7)
    .map(([key, current]) => ({ key, observed: observed[key], current }));
}
