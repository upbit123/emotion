// 감정별 모티프 그리기. 각 함수는 장면 영역(x, y, w, h) 안에 그린다.
// t: 감정의 각성에 따라 빨라지는 시간, n: 감정 비율에 따른 개수, unit: 영역의 짧은 변 길이.

const TAU = Math.PI * 2;

// 같은 i에 늘 같은 값을 주는 의사 난수(프레임마다 위치가 튀지 않게)
const rand = (i, k = 0) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const wrap = (v, m) => ((v % m) + m) % m;

function useFill(p, c, alpha) {
  p.noStroke();
  p.fill(c.h, c.s, c.b, alpha);
}

function useStroke(p, c, alpha, weight) {
  p.noFill();
  p.stroke(c.h, c.s, c.b, alpha);
  p.strokeWeight(weight);
}

export const MOTIFS = {
  // 기쁨: 위로 통통 튀며 올라가는 둥근 방울
  bubbles({ p, x, y, w, h, t, n, color, unit }) {
    useFill(p, color, 75);
    for (let i = 0; i < n; i++) {
      const rise = wrap(t * (30 + 50 * rand(i, 1)) + rand(i, 2) * h, h + 40);
      const bounce = Math.abs(Math.sin(t * 3 + i)) * unit * 0.03;
      const cx = x + rand(i, 3) * w + Math.sin(t + i) * unit * 0.02;
      p.circle(cx, y + h + 20 - rise - bounce, unit * (0.03 + 0.05 * rand(i, 4)));
    }
  },

  // 설렘: 반짝이며 천천히 떠오르는 작은 점
  sparkles({ p, x, y, w, h, t, n, color, unit }) {
    for (let i = 0; i < n * 1.5; i++) {
      const twinkle = Math.abs(Math.sin(t * 4 + i * 1.7));
      const cx = x + rand(i, 1) * w;
      const cy = y + h - wrap(t * 12 * (0.5 + rand(i, 2)) + rand(i, 3) * h, h);
      const r = unit * 0.012 * (0.5 + twinkle);
      useStroke(p, color, 40 + 60 * twinkle, 1.5);
      p.line(cx - r * 2, cy, cx + r * 2, cy);
      p.line(cx, cy - r * 2, cx, cy + r * 2);
      useFill(p, color, 90 * twinkle);
      p.circle(cx, cy, r * 1.6);
    }
  },

  // 평온: 느리게 퍼지는 물결
  ripples({ p, x, y, w, h, t, n, color, unit }) {
    const centers = Math.max(1, Math.round(n / 8));
    const max = unit * 0.45;
    for (let i = 0; i < centers; i++) {
      const cx = x + (0.2 + 0.6 * rand(i, 1)) * w;
      const cy = y + (0.2 + 0.6 * rand(i, 2)) * h;
      for (let k = 0; k < 4; k++) {
        const r = wrap(t * 15 + (k * max) / 4 + rand(i, 3) * max, max);
        useStroke(p, color, 70 * (1 - r / max), 2);
        p.circle(cx, cy, r * 2);
      }
    }
  },

  // 안도: 천천히 풀리는 매듭 곡선
  unknot({ p, x, y, w, h, t, n, color, unit }) {
    const lines = Math.max(1, Math.round(n / 4));
    useStroke(p, color, 70, 2.5);
    for (let i = 0; i < lines; i++) {
      const tight = 0.5 + 0.5 * Math.cos(t * 0.5 + i); // 1: 꼬임, 0: 풀림
      const y0 = y + (0.15 + 0.7 * rand(i, 1)) * h;
      const x0 = x + rand(i, 2) * w * 0.3;
      const len = w * 0.7;
      p.beginShape();
      for (let s = 0; s <= 40; s++) {
        const u = s / 40;
        const loop = Math.sin(u * TAU * 3 + i) * unit * 0.06 * tight;
        p.vertex(x0 + u * len + Math.cos(u * TAU * 3 + i) * unit * 0.04 * tight, y0 + loop);
      }
      p.endShape();
    }
  },

  // 분노: 중심에서 터져 나가는 각진 파편
  shards({ p, x, y, w, h, t, n, color, unit }) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    for (let i = 0; i < n; i++) {
      const life = wrap(t * 0.5 + rand(i, 1), 1);
      const angle = rand(i, 2) * TAU;
      const dist = life * unit * 0.6;
      const size = unit * (0.03 + 0.04 * rand(i, 3)) * (1 - life * 0.5);
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const spin = angle + t * 2 + i;
      useFill(p, color, 90 * (1 - life));
      p.triangle(
        px + Math.cos(spin) * size, py + Math.sin(spin) * size,
        px + Math.cos(spin + 2.4) * size * 0.6, py + Math.sin(spin + 2.4) * size * 0.6,
        px + Math.cos(spin + 3.6) * size * 0.9, py + Math.sin(spin + 3.6) * size * 0.9,
      );
    }
  },

  // 짜증: 짧게 끊기며 자꾸 자리를 바꾸는 지그재그
  zigzag({ p, x, y, w, h, t, n, color, unit }) {
    useStroke(p, color, 85, 2.5);
    for (let i = 0; i < n * 0.7; i++) {
      const seed = i + Math.floor(t * 2 + rand(i, 5) * 2) * 31;
      const sx = x + rand(seed, 1) * w;
      const sy = y + rand(seed, 2) * h;
      const step = unit * 0.025;
      p.beginShape();
      for (let k = 0; k < 6; k++) {
        p.vertex(sx + k * step, sy + (k % 2 === 0 ? -step : step));
      }
      p.endShape();
    }
  },

  // 불안: 가늘게 떨리는 선
  tremble({ p, x, y, w, h, t, n, color, unit }) {
    const lines = Math.max(2, Math.round(n / 3));
    useStroke(p, color, 75, 1.2);
    for (let i = 0; i < lines; i++) {
      const y0 = y + ((i + 0.5) / lines) * h;
      p.beginShape();
      for (let px = x; px <= x + w; px += 6) {
        const shake = (p.noise(px * 0.05, t * 6 + i * 10) - 0.5) * unit * 0.08;
        p.vertex(px, y0 + shake);
      }
      p.endShape();
    }
  },

  // 조급함: 한쪽으로 빠르게 몰리는 줄무늬
  rush({ p, x, y, w, h, t, n, color, unit }) {
    useStroke(p, color, 80, 3);
    for (let i = 0; i < n; i++) {
      const len = unit * (0.1 + 0.2 * rand(i, 2));
      const sx = x + wrap(t * 220 * (0.6 + rand(i, 3)) + rand(i, 1) * w * 1.5, w * 1.5) - w * 0.25;
      const sy = y + rand(i, 4) * h;
      p.line(sx, sy, sx + len, sy - len * 0.15);
    }
  },

  // 슬픔: 위에서 아래로 흘러내리는 선과 방울
  drip({ p, x, y, w, h, t, n, color, unit }) {
    for (let i = 0; i < n * 0.8; i++) {
      const life = wrap(t * 0.2 + rand(i, 1), 1);
      const sx = x + rand(i, 2) * w;
      const sy = y + rand(i, 3) * h * 0.3;
      const len = life * h * 0.6;
      useStroke(p, color, 70 * (1 - life * 0.6), 2);
      p.line(sx, sy, sx, sy + len);
      useFill(p, color, 80 * (1 - life * 0.6));
      p.circle(sx, sy + len, unit * 0.018);
    }
  },

  // 서운함: 다가가다 멀어지는 두 점
  drift({ p, x, y, w, h, t, n, color, unit }) {
    const pairs = Math.max(1, Math.round(n / 4));
    for (let i = 0; i < pairs; i++) {
      const cx = x + (0.15 + 0.7 * rand(i, 1)) * w;
      const cy = y + (0.15 + 0.7 * rand(i, 2)) * h;
      const angle = rand(i, 3) * TAU;
      const gap = unit * (0.02 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.6 + i * 1.3)));
      const dx = Math.cos(angle) * gap;
      const dy = Math.sin(angle) * gap;
      if (gap < unit * 0.06) {
        useStroke(p, color, 40, 1);
        p.line(cx - dx, cy - dy, cx + dx, cy + dy);
      }
      useFill(p, color, 85);
      p.circle(cx - dx, cy - dy, unit * 0.03);
      p.circle(cx + dx, cy + dy, unit * 0.03);
    }
  },

  // 무기력: 거의 멈춘 채 가라앉는 먼지
  dust({ p, x, y, w, h, t, n, color, unit }) {
    useFill(p, color, 55);
    for (let i = 0; i < n * 2; i++) {
      const cx = x + rand(i, 1) * w + Math.sin(t * 0.3 + i) * 2;
      const cy = y + wrap(rand(i, 2) * h + t * 5, h);
      p.circle(cx, cy, unit * (0.005 + 0.01 * rand(i, 3)));
    }
  },

  // 놀람: 중심에서 순간 퍼지는 동심원
  burst({ p, x, y, w, h, t, n, color, unit }) {
    const centers = Math.max(1, Math.round(n / 10));
    for (let i = 0; i < centers; i++) {
      const cx = x + (0.25 + 0.5 * rand(i, 1)) * w;
      const cy = y + (0.25 + 0.5 * rand(i, 2)) * h;
      for (let k = 0; k < 3; k++) {
        const life = wrap(t * 0.6 + k * 0.12 + rand(i, 3), 1);
        const eased = 1 - (1 - life) ** 3; // 처음에 확 퍼지고 천천히 멈춤
        useStroke(p, color, 90 * (1 - life), 2.5);
        p.circle(cx, cy, eased * unit * 0.9);
      }
    }
  },
};

// 감정 비율 1일 때 모티프 개수
export const BASE_COUNT = 40;
