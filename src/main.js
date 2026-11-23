import './visual/p5-offline.js'; // p5보다 먼저 불러와야 한다
import p5 from 'p5';
import './style.css';
import { createSketch } from './visual/sketch.js';
import { toVisual } from './visual/mapping.js';
import { mixEmotions } from './emotion/mix.js';
import { EMOTIONS, getEmotion } from './emotion/emotions.js';
import { CARDS, answersToWeights } from './input/cards.js';
import { pointerFeatures, pointerToWeights } from './input/pointer.js';
import { blendshapesToWeights, explainCues } from './input/face-rules.js';
import { addWeights, smoothWeights, topEmotions, createAverager } from './signal/weights.js';

const $ = (sel) => document.querySelector(sel);

// ── 세션 상태 ─────────────────────────────────────────────
const state = {
  answers: CARDS.map(() => null),
  cardIndex: 0,
  pointer: [], //            최근 포인터 샘플 { x, y, t }
  face: {}, //               부드럽게 만든 실시간 표정 신호
  faceAvg: createAverager(), //    세션 전체 표정 신호 평균(겉 레이어)
  faceCueAvg: createAverager(), // 세션 전체 얼굴 움직임 평균(근거 설명)
  pointerAvg: createAverager(), // 세션 전체 움직임 신호 평균
  pointerFeatAvg: createAverager(),
  selected: new Map(), //    사용자가 붙인 감정 이름 → 비율(0~100)
  customName: '',
};

let tracker = null;
let stageSketch = null;
let resultSketch = null;

// 입력 신호의 반영 비율
const SOURCE_SCALE = { cards: 1, pointer: 0.6, face: 0.8 };
const POINTER_WINDOW_MS = 1500;

// ── 화면 전환 ─────────────────────────────────────────────
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
}

$('#start-cam').addEventListener('click', async () => {
  const button = $('#start-cam');
  button.disabled = true;
  button.textContent = '브라우저에서 카메라 권한을 허용해 주세요…';
  try {
    await startCamera();
    startStage();
  } catch (err) {
    console.error(err);
    $('#cam-error').hidden = false;
    $('#cam-error').textContent =
      err?.name === 'NotAllowedError'
        ? '카메라 권한이 거부됐어요. 웹캠 없이 시작해도 끝까지 할 수 있어요.'
        : '카메라를 켜지 못했어요. 웹캠 없이 시작해도 끝까지 할 수 있어요.';
  } finally {
    button.disabled = false;
    button.textContent = '웹캠 켜고 시작';
  }
});

$('#start-nocam').addEventListener('click', startStage);
$('#cam-off').addEventListener('click', stopCamera);
$('#to-result').addEventListener('click', showResult);
$('#restart').addEventListener('click', () => location.reload());

// ── 웹캠 ─────────────────────────────────────────────────
async function startCamera() {
  const { startFaceTracking } = await import('./input/face.js'); // 웹캠을 쓸 때만 불러온다
  let lastUi = 0;
  tracker = await startFaceTracking($('#cam'), (scores) => {
    const weights = scores ? blendshapesToWeights(scores) : {};
    state.face = smoothWeights(state.face, weights, 0.15);
    if (scores) {
      state.faceAvg.add(weights);
      state.faceCueAvg.add(Object.fromEntries(explainCues(scores).map((c) => [c.label, c.value])));
    }
    const now = performance.now();
    if (now - lastUi > 250) {
      lastUi = now;
      renderLiveCues(scores);
    }
  });
  $('#cam-panel').hidden = false;
}

function stopCamera() {
  tracker?.stop();
  tracker = null;
  state.face = {};
  $('#cam-panel').hidden = true;
}

function renderLiveCues(scores) {
  const list = $('#cues');
  if (!scores) {
    list.innerHTML = '<li>얼굴을 찾는 중…</li>';
    return;
  }
  const cues = explainCues(scores).slice(0, 3);
  const [top] = topEmotions(state.face, 1, 0.2);
  list.innerHTML =
    cues.map((c) => `<li>${c.label}</li>`).join('') +
    (top ? `<li class="cue-guess">→ ${getEmotion(top.id).name}처럼 보여요</li>` : '<li>뚜렷한 표정 단서 없음</li>');
}

// ── 1단계: 카드 질문 + 움직임 ──────────────────────────────
function liveWeights() {
  let w = addWeights({}, answersToWeights(state.answers), SOURCE_SCALE.cards);
  w = addWeights(w, recentPointerWeights(), SOURCE_SCALE.pointer);
  w = addWeights(w, state.face, SOURCE_SCALE.face);
  return w;
}

function recentPointerWeights() {
  const now = performance.now();
  state.pointer = state.pointer.filter((s) => now - s.t < POINTER_WINDOW_MS);
  // 가만히 있는 건 '무기력'이 아니라 카드를 읽는 중일 수 있으므로, 움직일 때만 반영한다.
  if (state.pointer.length < 3) return {};
  return pointerToWeights(pointerFeatures(state.pointer));
}

function toVisualOrNull(weights) {
  const top = topEmotions(weights, 5, 0.05);
  if (top.length === 0) return null;
  return toVisual(mixEmotions(Object.fromEntries(top.map((e) => [e.id, e.share]))));
}

function startStage() {
  show('stage');
  renderCard();

  const host = $('#stage-canvas');
  const size = () => [host.clientWidth, Math.round(Math.min(window.innerHeight * 0.7, 620))];
  stageSketch = new p5(
    createSketch({
      width: size()[0],
      height: size()[1],
      resize: size,
      getScenes: () => [
        {
          visual: toVisualOrNull(liveWeights()),
          x: 0, y: 0, w: 1, h: 1,
          placeholder: '마우스를 움직이거나 카드에 답해 보세요',
        },
      ],
      drawOverlay: drawPointerTrail,
    }),
    host,
  );

  host.addEventListener('pointermove', (e) => {
    const rect = host.getBoundingClientRect();
    state.pointer.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() });
  });

  // 세션 평균용 움직임 신호는 0.25초마다, 움직이고 있을 때만 쌓는다.
  setInterval(() => {
    if (state.pointer.length < 3) return;
    const features = pointerFeatures(state.pointer);
    state.pointerAvg.add(pointerToWeights(features));
    state.pointerFeatAvg.add(features);
  }, 250);
}

function drawPointerTrail(p) {
  const pts = state.pointer;
  if (pts.length < 2) return;
  p.noFill();
  p.strokeWeight(2);
  for (let i = 1; i < pts.length; i++) {
    p.stroke(0, 0, 100, (i / pts.length) * 60);
    p.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  }
}

function renderCard() {
  const i = state.cardIndex;
  const done = i >= CARDS.length;
  $('#card-body').hidden = done;
  $('#card-done').hidden = !done;
  if (done) return;

  const card = CARDS[i];
  $('#card-step').textContent = `${i + 1} / ${CARDS.length}`;
  $('#card-q').textContent = card.question;
  const options = $('#card-options');
  options.innerHTML = '';
  card.options.forEach((option, k) => {
    const b = document.createElement('button');
    b.textContent = option.label;
    b.addEventListener('click', () => {
      state.answers[i] = k;
      state.cardIndex += 1;
      renderCard();
    });
    options.append(b);
  });
}

// ── 2단계: 결과 — 겉과 속 ─────────────────────────────────
function surfaceSignal() {
  if (state.faceAvg.count() > 0) {
    return { kind: 'face', weights: state.faceAvg.value() };
  }
  return { kind: 'pointer', weights: state.pointerAvg.value() };
}

function suggestionWeights() {
  let w = addWeights({}, answersToWeights(state.answers), SOURCE_SCALE.cards);
  w = addWeights(w, state.pointerAvg.value(), SOURCE_SCALE.pointer);
  w = addWeights(w, state.faceAvg.value(), SOURCE_SCALE.face);
  return w;
}

function innerVisual() {
  const weights = Object.fromEntries([...state.selected].filter(([, v]) => v > 0));
  if (Object.keys(weights).length === 0) return null;
  return toVisual(mixEmotions(weights));
}

function namesOf(weights, n) {
  return topEmotions(weights, n, 0.1).map((e) => getEmotion(e.id).name);
}

function showResult() {
  stopCamera();
  stageSketch?.remove();
  show('result');

  const surface = surfaceSignal();
  const surfaceVisual = toVisualOrNull(surface.weights);
  const surfaceCaption = surface.kind === 'face' ? '겉 · 표정에서 보인 단서' : '겉 · 움직임에서 보인 단서';
  const surfaceNames = namesOf(surface.weights, 3);

  renderSuggestions();
  renderSurfaceCues(surface.kind);

  const host = $('#result-canvas');
  const stacked = () => host.clientWidth < 700;
  const size = () => [host.clientWidth, stacked() ? 720 : 460];
  const today = new Date().toLocaleDateString('ko-KR');

  resultSketch = new p5(
    createSketch({
      width: size()[0],
      height: size()[1],
      resize: size,
      getScenes: () => {
        const half = stacked() ? { w: 1, h: 0.5 } : { w: 0.5, h: 1 };
        const second = stacked() ? { x: 0, y: 0.5 } : { x: 0.5, y: 0 };
        const innerNames = namesOf(Object.fromEntries(state.selected), 4);
        return [
          {
            visual: surfaceVisual,
            x: 0, y: 0, ...half,
            captions: [surfaceCaption, surfaceNames.join(' · ') || '뚜렷한 단서 없음'],
            placeholder: '이번에는 단서가 거의 없었어요',
          },
          {
            visual: innerVisual(),
            ...second, ...half,
            captions: [
              '속 · 내가 붙인 이름',
              innerNames.join(' · '),
              state.customName ? `“${state.customName}”` : '',
            ].filter(Boolean),
            placeholder: '아래에서 감정을 골라 이름을 붙여 보세요',
          },
        ];
      },
      drawOverlay: (p) => {
        p.noStroke();
        p.fill(0, 0, 100, 55);
        p.textSize(12);
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.text(`나의 [감정]들 · ${today}`, p.width - 14, p.height - 10);
      },
    }),
    host,
  );

  $('#save').onclick = () => resultSketch.saveCanvas(`나의감정들-${today.replace(/\.\s?/g, '-')}`, 'png');
  $('#custom-name').oninput = (e) => {
    state.customName = e.target.value.trim();
    updateGapNote();
  };
}

function renderSuggestions() {
  const suggested = topEmotions(suggestionWeights(), 4, 0.08);
  const box = $('#suggestions');
  box.innerHTML = '';
  if (suggested.length === 0) {
    box.innerHTML = '<p class="sub">이번엔 단서가 적었어요. 아래에서 직접 골라 보세요.</p>';
  }
  for (const { id } of suggested) box.append(chip(id, '처럼 보여요'));

  const all = $('#all-emotions');
  all.innerHTML = '';
  for (const e of EMOTIONS) {
    if (!suggested.some((s) => s.id === e.id)) all.append(chip(e.id, ''));
  }
}

function chip(id, suffix) {
  const b = document.createElement('button');
  b.className = 'chip';
  b.dataset.id = id;
  b.innerHTML = `${getEmotion(id).name}<span>${suffix}</span>`;
  b.addEventListener('click', () => {
    if (state.selected.has(id)) state.selected.delete(id);
    else state.selected.set(id, 50);
    renderSelected();
  });
  return b;
}

function renderSelected() {
  for (const c of document.querySelectorAll('.chip')) {
    c.classList.toggle('on', state.selected.has(c.dataset.id));
  }
  const box = $('#selected');
  box.innerHTML = '';
  for (const [id, value] of state.selected) {
    const row = document.createElement('label');
    row.className = 'slider-row';
    row.innerHTML = `<span>${getEmotion(id).name}</span><input type="range" min="0" max="100" value="${value}">`;
    row.querySelector('input').addEventListener('input', (e) => {
      state.selected.set(id, Number(e.target.value));
      updateGapNote();
    });
    box.append(row);
  }
  updateGapNote();
}

// 겉(표정·움직임)과 속(내가 붙인 이름)이 다를 때, 그 차이를 짚어 준다.
function updateGapNote() {
  const note = $('#gap-note');
  const [outer] = topEmotions(surfaceSignal().weights, 1, 0.1);
  const [inner] = topEmotions(Object.fromEntries(state.selected), 1, 0.01);
  if (!outer || !inner || outer.id === inner.id) {
    note.hidden = true;
    return;
  }
  note.hidden = false;
  note.textContent = `겉에서는 '${getEmotion(outer.id).name}'처럼 보였지만, 내가 붙인 이름은 '${getEmotion(inner.id).name}'이에요. 그 차이도 이 그림의 일부예요.`;
}

function renderSurfaceCues(kind) {
  const list = $('#surface-cues');
  if (kind === 'face') {
    const cues = topEmotions(state.faceCueAvg.value(), 4, 0);
    list.innerHTML = cues.length
      ? cues.map((c) => `<li>${c.id}</li>`).join('')
      : '<li>뚜렷한 얼굴 움직임이 없었어요</li>';
    return;
  }
  const f = state.pointerFeatAvg.value();
  list.innerHTML =
    state.pointerFeatAvg.count() > 0
      ? `<li>평균 빠르기 ${Math.round((f.speed ?? 0) * 100)} / 100</li><li>방향이 꺾인 정도 ${Math.round((f.jitter ?? 0) * 100)} / 100</li>`
      : '<li>움직임 기록이 없었어요</li>';
}
