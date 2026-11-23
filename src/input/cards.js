// 사용자의 상황을 묻는 카드 질문. 정답이 없는 질문이고, 답은 감정 가중치로 바뀐다.
export const CARDS = [
  {
    question: '지금 몸의 에너지는 어느 쪽에 가까워요?',
    options: [
      { label: '들떠 있어요', weights: { excitement: 1, joy: 0.5 } },
      { label: '안절부절해요', weights: { anxiety: 1, impatience: 0.7 } },
      { label: '차분해요', weights: { calm: 1, relief: 0.5 } },
      { label: '축 처져요', weights: { lethargy: 1, sadness: 0.5 } },
    ],
  },
  {
    question: '오늘 가장 오래 머문 생각은 무엇에 관한 거예요?',
    options: [
      { label: '기대되는 일', weights: { excitement: 1, joy: 0.5 } },
      { label: '아직 해결 못 한 일', weights: { anxiety: 0.8, impatience: 0.8 } },
      { label: '누군가의 말이나 행동', weights: { hurt: 1, irritation: 0.6 } },
      { label: '딱히 떠오르지 않아요', weights: { calm: 0.6, lethargy: 0.6 } },
    ],
  },
  {
    question: '누군가 지금 말을 건다면?',
    options: [
      { label: '반가워요', weights: { joy: 1, relief: 0.4 } },
      { label: '조금 귀찮아요', weights: { irritation: 1, lethargy: 0.4 } },
      { label: '살짝 긴장돼요', weights: { anxiety: 1, surprise: 0.4 } },
      { label: '위로받고 싶어요', weights: { sadness: 1, hurt: 0.6 } },
    ],
  },
  {
    question: '지금 마음을 날씨로 말하면?',
    options: [
      { label: '맑음', weights: { joy: 0.8, calm: 0.6 } },
      { label: '소나기 직전', weights: { anger: 0.8, irritation: 0.6 } },
      { label: '짙은 안개', weights: { anxiety: 0.7, lethargy: 0.5 } },
      { label: '비 갠 뒤', weights: { relief: 1, calm: 0.4 } },
      { label: '갑작스러운 천둥', weights: { surprise: 1, anger: 0.4 } },
    ],
  },
];

// answers[i] = i번째 카드에서 고른 선택지 번호(답하지 않았으면 null)
export function answersToWeights(answers) {
  const total = {};
  answers.forEach((choice, i) => {
    if (choice === null || choice === undefined) return;
    const option = CARDS[i]?.options[choice];
    if (!option) {
      throw new Error(`카드 ${i}에 선택지 ${choice}가 없음`);
    }
    for (const [id, w] of Object.entries(option.weights)) {
      total[id] = (total[id] ?? 0) + w;
    }
  });
  return total;
}
