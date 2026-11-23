import './visual/p5-offline.js'; // p5보다 먼저 불러와야 한다
import p5 from 'p5';
import './style.css';
import { createSketch } from './visual/sketch.js';
import { toVisual } from './visual/mapping.js';
import { mixEmotions } from './emotion/mix.js';
import { EMOTIONS } from './emotion/emotions.js';

let hideNames = false;
document.getElementById('hide-names').addEventListener('change', (e) => {
  hideNames = e.target.checked;
});

// 감정별 칸
const gallery = document.getElementById('gallery');
EMOTIONS.forEach((emotion, i) => {
  const cell = document.createElement('div');
  cell.className = 'canvas-host';
  gallery.append(cell);
  const visual = toVisual(mixEmotions({ [emotion.id]: 1 }));
  const label = `${emotion.name}  (쾌 ${emotion.valence}, 각성 ${emotion.arousal})`;
  new p5(
    createSketch({
      width: 260,
      height: 180,
      getScenes: () => [
        { visual, x: 0, y: 0, w: 1, h: 1, captions: [hideNames ? `#${i + 1}` : label] },
      ],
    }),
    cell,
  );
});

// 두 감정 섞기
const a = document.getElementById('mix-a');
const b = document.getElementById('mix-b');
const ratio = document.getElementById('mix-ratio');
for (const select of [a, b]) {
  for (const e of EMOTIONS) select.add(new Option(e.name, e.id));
}
a.value = 'joy';
b.value = 'sadness';

function currentMix() {
  const r = Number(ratio.value) / 100;
  const weights = a.value === b.value ? { [a.value]: 1 } : { [a.value]: 1 - r, [b.value]: r };
  const filtered = Object.fromEntries(Object.entries(weights).filter(([, w]) => w > 0));
  return mixEmotions(filtered);
}

const mixHost = document.getElementById('mix-canvas');
new p5(
  createSketch({
    width: mixHost.clientWidth,
    height: 360,
    resize: () => [mixHost.clientWidth, 360],
    getScenes: () => {
      const mix = currentMix();
      document.getElementById('mix-label').textContent =
        `합성 좌표: 쾌 ${mix.valence.toFixed(2)}, 각성 ${mix.arousal.toFixed(2)}`;
      return [{ visual: toVisual(mix), x: 0, y: 0, w: 1, h: 1 }];
    },
  }),
  mixHost,
);
