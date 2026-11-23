import { EMOTIONS } from '../emotion/emotions.js';

// 사용자의 상황을 묻는 카드. 정답이 없는 질문이고, 답은 감정 가중치로 바뀐다.
//   grid:   감정 좌표 판(Russell, Weiss & Mendelsohn 1989의 Affect Grid). 지금 기분을 한 점으로 찍는다.
//   choice: 상황 질문. 선택지마다 감정 가중치가 있다.
export const CARDS = [
  {
    type: 'grid',
    question: '지금 기분을 판 위에 점으로 찍어 보세요',
  },
  {
    type: 'choice',
    question: '지금 몸의 에너지는 어느 쪽에 가까워요?',
    options: [
      { label: '들떠 있어요', weights: { excitement: 1, joy: 0.5 } },
      { label: '안절부절해요', weights: { anxiety: 1, impatience: 0.7 } },
      { label: '차분해요', weights: { calm: 1, relief: 0.5 } },
      { label: '축 처져요', weights: { lethargy: 1, sadness: 0.5 } },
    ],
  },
  {
    type: 'choice',
    question: '오늘 가장 오래 머문 생각은 무엇에 관한 거예요?',
    options: [
      { label: '기대되는 일', weights: { excitement: 1, joy: 0.5 } },
      { label: '아직 해결 못 한 일', weights: { anxiety: 0.8, impatience: 0.8 } },
      { label: '누군가의 말이나 행동', weights: { hurt: 1, irritation: 0.6 } },
      { label: '이미 끝난 일', weights: { relief: 1, sadness: 0.3 } },
      { label: '딱히 떠오르지 않아요', weights: { calm: 0.6, lethargy: 0.6 } },
    ],
  },
  {
    type: 'choice',
    question: '누군가 지금 말을 건다면?',
    options: [
      { label: '반가워요', weights: { joy: 1, relief: 0.4 } },
      { label: '조금 귀찮아요', weights: { irritation: 1, lethargy: 0.4 } },
      { label: '살짝 긴장돼요', weights: { anxiety: 1, surprise: 0.4 } },
      { label: '위로받고 싶어요', weights: { sadness: 1, hurt: 0.6 } },
    ],
  },
  {
    type: 'choice',
    question: '지금 마음을 날씨로 말하면?',
    options: [
      { label: '맑음', weights: { joy: 0.8, calm: 0.6 } },
      { label: '소나기 직전', weights: { anger: 0.8, irritation: 0.6 } },
      { label: '짙은 안개', weights: { anxiety: 0.7, lethargy: 0.5 } },
      { label: '비 갠 뒤', weights: { relief: 1, calm: 0.4 } },
      { label: '갑작스러운 천둥', weights: { surprise: 1, anger: 0.4 } },
      { label: '흐리고 쌀쌀함', weights: { sadness: 0.8, hurt: 0.5 } },
    ],
  },
];

// 비슷한 두 감정을 가르는 질문. 후보 상위 두 감정이 비슷할 때 한 번 더 묻는다.
// 감정을 더 세밀하게 구분해 보는 경험 자체가 이 작품의 목적(감정 세분화)이다.
export const DISTINGUISHERS = [
  {
    id: 'anxiety-impatience',
    pair: ['anxiety', 'impatience'],
    question: '마음이 급한 이유에 더 가까운 건?',
    options: [
      { label: '앞으로 일이 잘못될까 걱정돼서', weights: { anxiety: 1 } },
      { label: '시간이 부족하고 빨리 끝내고 싶어서', weights: { impatience: 1 } },
    ],
  },
  {
    id: 'anger-irritation',
    pair: ['anger', 'irritation'],
    question: '그 감정의 크기는?',
    options: [
      { label: '참기 어려울 만큼 크고 뜨거워요', weights: { anger: 1 } },
      { label: '자잘하게 거슬리고 신경 쓰여요', weights: { irritation: 1 } },
    ],
  },
  {
    id: 'sadness-hurt',
    pair: ['sadness', 'hurt'],
    question: '그 마음은 누군가와 관련 있나요?',
    options: [
      { label: '네, 누군가에게 기대한 게 있었어요', weights: { hurt: 1 } },
      { label: '아니요, 그냥 마음이 가라앉아요', weights: { sadness: 1 } },
    ],
  },
  {
    id: 'calm-relief',
    pair: ['calm', 'relief'],
    question: '지금의 편안함은 어디서 왔나요?',
    options: [
      { label: '걱정하던 일이 끝나서', weights: { relief: 1 } },
      { label: '특별한 일 없이 원래 고요해요', weights: { calm: 1 } },
    ],
  },
  {
    id: 'joy-excitement',
    pair: ['joy', 'excitement'],
    question: '좋은 기분은 언제를 향해 있나요?',
    options: [
      { label: '지금 이 순간이 좋아요', weights: { joy: 1 } },
      { label: '곧 다가올 일이 기다려져요', weights: { excitement: 1 } },
    ],
  },
  {
    id: 'sadness-lethargy',
    pair: ['sadness', 'lethargy'],
    question: '가라앉은 느낌에 더 가까운 건?',
    options: [
      { label: '마음이 아프고 울적해요', weights: { sadness: 1 } },
      { label: '아무것도 하기 싫고 기운이 없어요', weights: { lethargy: 1 } },
    ],
  },
  {
    id: 'surprise-anxiety',
    pair: ['surprise', 'anxiety'],
    question: '갑자기 생긴 일에 대한 느낌은?',
    options: [
      { label: '놀랐지만 곧 괜찮아졌어요', weights: { surprise: 1 } },
      { label: '놀란 뒤로 계속 불안해요', weights: { anxiety: 1 } },
    ],
  },
];

const CLOSE_RATIO = 0.6; // 2위가 1위의 60% 이상이면 '비슷하다'

export function pickDistinguisher(weights, askedIds = []) {
  const ranked = Object.entries(weights)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length < 2) return null;
  const [[first, w1], [second, w2]] = ranked;
  if (w2 < w1 * CLOSE_RATIO) return null;
  return (
    DISTINGUISHERS.find(
      (d) => !askedIds.includes(d.id) && d.pair.includes(first) && d.pair.includes(second),
    ) ?? null
  );
}

// 좌표 판의 점 → 가까운 감정 가중치(가우시안). 가까운 3개만 남기고 합 1로 맞춘다.
const GRID_SIGMA = 0.3;
const GRID_KEEP = 3;

export function gridToWeights({ valence, arousal }) {
  const near = EMOTIONS.map((e) => {
    const d2 = (e.valence - valence) ** 2 + (e.arousal - arousal) ** 2;
    return [e.id, Math.exp(-d2 / (2 * GRID_SIGMA ** 2))];
  })
    .sort((a, b) => b[1] - a[1])
    .slice(0, GRID_KEEP);
  const total = near.reduce((s, [, w]) => s + w, 0);
  return Object.fromEntries(near.map(([id, w]) => [id, w / total]));
}

// answers[i]: i번째 카드의 답(choice는 선택지 번호, grid는 { valence, arousal }, 안 했으면 null)
// extra: 구분 질문 답 [{ id, choice }]
export function answersToWeights(answers, extra = []) {
  const total = {};
  const add = (weights) => {
    for (const [id, w] of Object.entries(weights)) total[id] = (total[id] ?? 0) + w;
  };

  answers.forEach((answer, i) => {
    if (answer === null || answer === undefined) return;
    const card = CARDS[i];
    if (card?.type === 'grid') {
      add(gridToWeights(answer));
      return;
    }
    const option = card?.options[answer];
    if (!option) throw new Error(`카드 ${i}에 선택지 ${answer}가 없음`);
    add(option.weights);
  });

  for (const { id, choice } of extra) {
    const option = DISTINGUISHERS.find((d) => d.id === id)?.options[choice];
    if (!option) throw new Error(`구분 질문 ${id}에 선택지 ${choice}가 없음`);
    add(option.weights);
  }
  return total;
}

// 그 감정에 크게(0.4 이상) 기여한 답을 근거로 돌려준다.
export function cardReasons(answers, extra, emotionId) {
  const reasons = [];
  answers.forEach((answer, i) => {
    if (answer === null || answer === undefined) return;
    const card = CARDS[i];
    if (card.type === 'grid') {
      if ((gridToWeights(answer)[emotionId] ?? 0) >= 0.3) reasons.push('좌표 판에서 가까움');
      return;
    }
    const option = card.options[answer];
    if ((option.weights[emotionId] ?? 0) >= 0.4) reasons.push(option.label);
  });
  for (const { id, choice } of extra) {
    const option = DISTINGUISHERS.find((d) => d.id === id).options[choice];
    if ((option.weights[emotionId] ?? 0) >= 0.4) reasons.push(option.label);
  }
  return reasons;
}
