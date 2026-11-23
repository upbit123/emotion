// 마우스(포인터) 움직임 → 감정 단서.
// 빠르기(speed), 흔들림(jitter), 멈칫거림(hesitation), 움직이는 범위(spread)를 본다.
// 마우스 움직임과 감정의 관계는 표정보다 근거가 약해서, 결과에서 반영 비율을 낮게 둔다.

const FAST_PX_PER_SEC = 1000; // 이 속도 이상이면 speed = 1
const PAUSE_MS = 120; //         이보다 긴 간격은 '멈칫'으로 본다(pointermove는 움직일 때만 온다)
const DEFAULT_AREA = { width: 1000, height: 600 };

export function pointerFeatures(samples, area = DEFAULT_AREA) {
  if (samples.length < 3) return { speed: 0, jitter: 0, hesitation: 0, spread: 0 };

  let distance = 0;
  let turn = 0;
  let turns = 0;
  let pauses = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
    if (i === 0) continue;

    const dx = s.x - samples[i - 1].x;
    const dy = s.y - samples[i - 1].y;
    distance += Math.hypot(dx, dy);
    if (s.t - samples[i - 1].t > PAUSE_MS) pauses += 1;

    if (i >= 2) {
      const px = samples[i - 1].x - samples[i - 2].x;
      const py = samples[i - 1].y - samples[i - 2].y;
      const len = Math.hypot(dx, dy) * Math.hypot(px, py);
      if (len > 0) {
        turn += (1 - (dx * px + dy * py) / len) / 2; // 직진 0, 완전히 되돌아가면 1
        turns += 1;
      }
    }
  }

  const seconds = (samples.at(-1).t - samples[0].t) / 1000;
  const pxPerSec = seconds > 0 ? distance / seconds : 0;
  return {
    speed: Math.min(1, pxPerSec / FAST_PX_PER_SEC),
    jitter: turns > 0 ? turn / turns : 0,
    hesitation: Math.min(1, pauses / (samples.length - 1) / 0.3), // 간격의 30%가 멈칫이면 1
    spread: Math.min(1, Math.hypot(maxX - minX, maxY - minY) / (Math.hypot(area.width, area.height) * 0.5)),
  };
}

export function pointerToWeights({ speed, jitter, hesitation = 0, spread = 0.5 }) {
  if (speed < 0.05) return { lethargy: 1 };

  const slow = 1 - speed;
  const smooth = 1 - jitter;
  const raw = {
    anxiety: hesitation * 0.7 + speed * jitter * 0.6,
    impatience: speed * smooth * (1 - spread) * 0.8 + speed * jitter * 0.3,
    excitement: speed * smooth * spread,
    joy: speed * smooth * spread * 0.4,
    anger: speed * speed * jitter * 0.5,
    calm: slow * smooth * spread * (1 - hesitation),
    sadness: slow * (1 - spread) * 0.3,
    lethargy: slow * slow * (1 - spread) * 0.5,
  };
  return Object.fromEntries(Object.entries(raw).filter(([, w]) => w > 0.02));
}

const POINTER_REASONS = {
  anxiety: [['hesitation', 0.4, '멈칫거림이 많음'], ['jitter', 0.5, '방향이 자주 꺾임']],
  impatience: [['speed', 0.6, '빠르게 움직임']],
  excitement: [['speed', 0.6, '빠르게 움직임'], ['spread', 0.6, '넓게 움직임']],
  joy: [['spread', 0.6, '넓게 움직임']],
  anger: [['speed', 0.7, '빠르게 움직임'], ['jitter', 0.5, '방향이 자주 꺾임']],
  calm: [['spread', 0.5, '넓게 움직임']],
};

export function pointerReasons(featureAvg, emotionId) {
  const reasons = (POINTER_REASONS[emotionId] ?? [])
    .filter(([key, min]) => (featureAvg[key] ?? 0) >= min)
    .map(([, , label]) => label);
  if (['calm', 'sadness', 'lethargy'].includes(emotionId) && (featureAvg.speed ?? 1) < 0.3) {
    reasons.unshift('천천히 움직임');
  }
  return reasons;
}
