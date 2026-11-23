// 얼굴 부위 그림. 표정 값(features)에 따라 눈썹·눈·입이 실제로 움직이고,
// 단서가 된 부위는 강조색으로 칠한다. "왜 그렇게 보였는지"를 숫자 대신 그림으로 보여 준다.

const ACTIVE = 0.3;
const max = (f, keys) => Math.max(...keys.map((k) => f[k] ?? 0));

export function faceShape(f) {
  const dy = (f.headDown ?? 0) * 12; // 고개를 숙이면 얼굴 전체가 아래로
  const browBase = 70 + dy;
  const cornerY = 152 + dy - f.smile * 6 + f.frown * 6;
  return {
    dy,
    brow: {
      innerY: browBase - f.browInnerUp * 14 + f.browDown * 10,
      outerY: browBase - f.browOuterUp * 12 + f.browDown * 4,
    },
    eye: {
      cy: 94 + dy,
      ry: Math.max(1.5, 7 * (1 + 0.6 * f.eyeWide - 0.6 * Math.max(f.droop, f.eyeSquint))),
    },
    mouth: {
      cornerY,
      ctrlY: cornerY + (f.smile - f.frown) * 22,
      halfWidth: 26 * (1 + 0.3 * f.stretch + 0.15 * f.smile - 0.45 * f.pout),
      open: f.jawOpen * 18,
      press: f.press,
    },
    cheek: f.cheek,
    sneer: f.sneer,
    active: {
      brow: max(f, ['browInnerUp', 'browDown', 'browOuterUp']) >= ACTIVE,
      eye: max(f, ['eyeWide', 'eyeSquint', 'droop']) >= ACTIVE,
      nose: f.sneer >= ACTIVE,
      cheek: f.cheek >= ACTIVE,
      mouth: max(f, ['smile', 'frown', 'press', 'stretch', 'upperUp', 'pout', 'jawOpen']) >= ACTIVE,
      head: (f.headDown ?? 0) >= ACTIVE,
    },
  };
}

const cls = (on) => (on ? 'part on' : 'part');

export function faceSvg(f) {
  const s = faceShape(f);
  const { brow, eye, mouth, active, dy } = s;
  const lip = 2 + mouth.press * 2;
  const mouthPath =
    `M ${100 - mouth.halfWidth} ${mouth.cornerY} Q 100 ${mouth.ctrlY} ${100 + mouth.halfWidth} ${mouth.cornerY}` +
    (mouth.open > 1
      ? ` Q 100 ${mouth.ctrlY + mouth.open * 2} ${100 - mouth.halfWidth} ${mouth.cornerY}`
      : '');
  return `<svg viewBox="0 0 200 220" class="face-diagram" role="img" aria-label="표정 부위 그림">
  <ellipse cx="100" cy="${112 + dy}" rx="72" ry="92" class="${cls(active.head)} head" />
  <path d="M 52 ${brow.outerY} L 88 ${brow.innerY}" class="${cls(active.brow)}" stroke-width="4" />
  <path d="M 148 ${brow.outerY} L 112 ${brow.innerY}" class="${cls(active.brow)}" stroke-width="4" />
  <ellipse cx="72" cy="${eye.cy}" rx="13" ry="${eye.ry}" class="${cls(active.eye)}" />
  <ellipse cx="128" cy="${eye.cy}" rx="13" ry="${eye.ry}" class="${cls(active.eye)}" />
  <path d="M 100 ${104 + dy} L 94 ${128 + dy} L 106 ${128 + dy}" class="${cls(active.nose)}" />
  ${s.sneer >= ACTIVE ? `<path d="M 88 ${112 + dy} l 6 4 M 112 ${112 + dy} l -6 4" class="part on" />` : ''}
  <circle cx="58" cy="${130 + dy}" r="11" class="cheek" style="opacity:${(s.cheek * 0.6).toFixed(2)}" />
  <circle cx="142" cy="${130 + dy}" r="11" class="cheek" style="opacity:${(s.cheek * 0.6).toFixed(2)}" />
  <path d="${mouthPath}" class="${cls(active.mouth)}" stroke-width="${lip}" />
</svg>`;
}
