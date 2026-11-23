// 마우스(포인터) 움직임 → 감정 단서.
// 빠르기(speed)와 흔들림(jitter, 방향이 얼마나 자주 꺾이는지)만 본다.

const FAST_PX_PER_SEC = 1000; // 이 속도 이상이면 speed = 1

export function pointerFeatures(samples) {
  if (samples.length < 3) return { speed: 0, jitter: 0 };

  let distance = 0;
  let turn = 0;
  let turns = 0;
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x;
    const dy = samples[i].y - samples[i - 1].y;
    distance += Math.hypot(dx, dy);

    if (i >= 2) {
      const px = samples[i - 1].x - samples[i - 2].x;
      const py = samples[i - 1].y - samples[i - 2].y;
      const len = Math.hypot(dx, dy) * Math.hypot(px, py);
      if (len > 0) {
        const cos = (dx * px + dy * py) / len;
        turn += (1 - cos) / 2; // 직진 0, 완전히 되돌아가면 1
        turns += 1;
      }
    }
  }

  const seconds = (samples.at(-1).t - samples[0].t) / 1000;
  const pxPerSec = seconds > 0 ? distance / seconds : 0;
  return {
    speed: Math.min(1, pxPerSec / FAST_PX_PER_SEC),
    jitter: turns > 0 ? turn / turns : 0,
  };
}

export function pointerToWeights({ speed, jitter }) {
  if (speed < 0.05) return { lethargy: 1 };

  const slow = 1 - speed;
  const smooth = 1 - jitter;
  const raw = {
    anxiety: speed * jitter,
    impatience: speed * jitter * 0.6 + speed * smooth * 0.3,
    excitement: speed * smooth * 0.7,
    calm: slow * smooth,
    lethargy: slow * slow * smooth * 0.3,
  };
  return Object.fromEntries(Object.entries(raw).filter(([, w]) => w > 0.01));
}
