import './visual/p5-offline.js'; // p5보다 먼저 불러와야 한다
import p5 from 'p5';
import './style.css';
import { createSketch } from './visual/sketch.js';
import { toVisual } from './visual/mapping.js';
import { mixEmotions } from './emotion/mix.js';
import { EMOTIONS, getEmotion } from './emotion/emotions.js';
import { CARDS, answersToWeights, pickDistinguisher, cardReasons } from './input/cards.js';
import { pointerFeatures, pointerToWeights, pointerReasons } from './input/pointer.js';
import { blendshapesToWeights, features, cueValues, faceReasons } from './input/face-rules.js';
import { createCalibrator, createNormalizer } from './input/face-calibration.js';
import { smoothWeights, topEmotions, createAverager, combineSources } from './signal/weights.js';
import { createAffectGrid } from './ui/affect-grid.js';
import { withJosa } from './ui/josa.js';

const $ = (sel) => document.querySelector(sel);

// ── 세션 상태 ─────────────────────────────────────────────
const state = {
  answers: CARDS.map(() => null),
  extra: [], //              구분 질문 답 [{ id, choice }]
  cardIndex: 0,
  currentDistinguisher: null,
  pointer: [], //            최근 포인터 샘플 { x, y, t }
  face: {}, //               부드럽게 만든 실시간 표정 신호
  faceAvg: createAverager(), //     세션 전체 표정 신호 평균(겉 레이어)
  faceFeatAvg: createAverager(), // 세션 전체 얼굴 움직임 평균(근거 설명)
  pointerAvg: createAverager(),
  pointerFeatAvg: createAverager(),
  selected: new Map(), //    사용자가 붙인 감정 이름 → 비율(0~100)
  customName: '',
};

const calib = { calibrator: null, normalizer: null, until: 0 };

let tracker = null;
let stageSketch = null;
let resultSketch = null;

// 입력별 반영 비율. 각 입력은 합 1로 맞춘 뒤 곱한다(combineSources).
// 마우스는 감정과의 관계 근거가 약해서 낮게 둔다.
const SOURCE_SCALE = { cards: 1, pointer: 0.4, face: 1 };
const POINTER_WINDOW_MS = 2500;
const CALIBRATION_MS = 3000;
const MIN_CALIBRATION_FRAMES = 10;
const MAX_DISTINGUISHERS = 2;

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
$('#recalibrate').addEventListener('click', beginCalibration);
$('#to-result').addEventListener('click', showResult);
$('#restart').addEventListener('click', () => location.reload());

// ── 웹캠: 보정 → 정규화 → 규칙 ─────────────────────────────
async function startCamera() {
  const { startFaceTracking } = await import('./input/face.js'); // 웹캠을 쓸 때만 불러온다
  let lastUi = 0;
  tracker = await startFaceTracking($('#cam'), (frame) => {
    const now = performance.now();
    const ui = now - lastUi > 250;
    if (ui) lastUi = now;

    if (!frame) {
      if (ui) renderCamStatus('얼굴을 찾는 중…');
      return;
    }

    if (!calib.normalizer) {
      calib.calibrator.add(frame.scores, frame.pitch);
      const left = Math.max(0, Math.ceil((calib.until - now) / 1000));
      if (now >= calib.until && calib.calibrator.count() >= MIN_CALIBRATION_FRAMES) {
        calib.normalizer = createNormalizer(calib.calibrator.baseline());
      } else if (ui) {
        renderCamStatus(`3초만 편하게 정면을 봐 주세요 (${left || 1})`);
      }
      return;
    }

    const { scores, pitch } = calib.normalizer.normalize(frame.scores, frame.pitch);
    const head = { pitch };
    const weights = blendshapesToWeights(scores, head);
    const f = features(scores, head);
    state.face = smoothWeights(state.face, weights, 0.15);
    state.faceAvg.add(weights);
    state.faceFeatAvg.add(f);
    if (ui) renderLiveCues(f);
  });
  $('#cam-panel').hidden = false;
  beginCalibration();
}

function beginCalibration() {
  calib.calibrator = createCalibrator();
  calib.normalizer = null;
  calib.until = performance.now() + CALIBRATION_MS;
  state.face = {};
  renderCamStatus('3초만 편하게 정면을 봐 주세요');
}

function stopCamera() {
  tracker?.stop();
  tracker = null;
  state.face = {};
  $('#cam-panel').hidden = true;
}

function renderCamStatus(message) {
  $('#cues').innerHTML = `<li class="cue-guess">${message}</li>`;
}

function renderLiveCues(f) {
  const cues = cueValues(f).slice(0, 3);
  const [top] = topEmotions(state.face, 1, 0.2);
  $('#cues').innerHTML =
    cues.map((c) => `<li>${c.label}</li>`).join('') +
    (top ? `<li class="cue-guess">→ ${getEmotion(top.id).name}처럼 보여요</li>` : '<li>뚜렷한 표정 단서 없음</li>');
}

// ── 1단계: 카드 질문 + 움직임 ──────────────────────────────
function cardWeights() {
  return answersToWeights(state.answers, state.extra);
}

function liveWeights() {
  return combineSources([
    { weights: cardWeights(), scale: SOURCE_SCALE.cards },
    { weights: recentPointerWeights(), scale: SOURCE_SCALE.pointer },
    { weights: state.face, scale: SOURCE_SCALE.face },
  ]);
}

function sessionWeights() {
  return combineSources([
    { weights: cardWeights(), scale: SOURCE_SCALE.cards },
    { weights: state.pointerAvg.value(), scale: SOURCE_SCALE.pointer },
    { weights: state.faceAvg.value(), scale: SOURCE_SCALE.face },
  ]);
}

function pointerArea() {
  const host = $('#stage-canvas');
  return { width: host.clientWidth, height: host.clientHeight };
}

function recentPointerWeights() {
  const now = performance.now();
  state.pointer = state.pointer.filter((s) => now - s.t < POINTER_WINDOW_MS);
  // 가만히 있는 건 '무기력'이 아니라 카드를 읽는 중일 수 있으므로, 움직일 때만 반영한다.
  if (state.pointer.length < 3) return {};
  return pointerToWeights(pointerFeatures(state.pointer, pointerArea()));
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
  const size = () => [host.clientWidth, Math.round(Math.min(window.innerHeight * 0.62, 560))];
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
    const f = pointerFeatures(state.pointer, pointerArea());
    state.pointerAvg.add(pointerToWeights(f));
    state.pointerFeatAvg.add(f);
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
  const options = $('#card-options');
  const gridHost = $('#grid-host');
  options.innerHTML = '';
  gridHost.innerHTML = '';

  // 기본 카드
  if (state.cardIndex < CARDS.length) {
    const i = state.cardIndex;
    const card = CARDS[i];
    showCardBody(`${i + 1} / ${CARDS.length}`, card.question);
    if (card.type === 'grid') {
      createAffectGrid(gridHost, (point) => {
        state.answers[i] = point;
        nextCard();
      });
    } else {
      card.options.forEach((option, k) => {
        options.append(optionButton(option.label, () => {
          state.answers[i] = k;
          nextCard();
        }));
      });
    }
    return;
  }

  // 구분 질문: 후보 상위 두 감정이 비슷할 때 최대 2번 더 묻는다
  const asked = state.extra.map((e) => e.id);
  const d = asked.length < MAX_DISTINGUISHERS ? pickDistinguisher(sessionWeights(), asked) : null;
  if (d) {
    const [a, b] = d.pair.map((id) => getEmotion(id).name);
    showCardBody(`조금 더 구분해 볼까요? · ${withJosa(a, '와/과')} ${b} 사이`, d.question);
    d.options.forEach((option, k) => {
      options.append(optionButton(option.label, () => {
        state.extra.push({ id: d.id, choice: k });
        renderCard();
      }));
    });
    return;
  }

  $('#card-body').hidden = true;
  $('#card-done').hidden = false;
}

function nextCard() {
  state.cardIndex += 1;
  renderCard();
}

function showCardBody(step, question) {
  $('#card-body').hidden = false;
  $('#card-done').hidden = true;
  $('#card-step').textContent = step;
  $('#card-q').textContent = question;
}

function optionButton(label, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

// ── 2단계: 결과 — 겉과 속 ─────────────────────────────────
function surfaceSignal() {
  if (state.faceAvg.count() > 0) {
    return { kind: 'face', weights: state.faceAvg.value() };
  }
  return { kind: 'pointer', weights: state.pointerAvg.value() };
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

function reasonsFor(id) {
  const parts = [];
  const card = cardReasons(state.answers, state.extra, id);
  const face = faceReasons(state.faceFeatAvg.value(), id);
  const pointer = state.pointerFeatAvg.count() > 0 ? pointerReasons(state.pointerFeatAvg.value(), id) : [];
  if (face.length) parts.push(`표정: ${face.join(', ')}`);
  if (card.length) parts.push(`카드: ${card.join(', ')}`);
  if (pointer.length) parts.push(`움직임: ${pointer.join(', ')}`);
  return parts;
}

function renderSuggestions() {
  const suggested = topEmotions(sessionWeights(), 4, 0.08);
  const box = $('#suggestions');
  box.innerHTML = '';
  if (suggested.length === 0) {
    box.innerHTML = '<p class="sub">이번엔 단서가 적었어요. 아래에서 직접 골라 보세요.</p>';
  }
  for (const { id } of suggested) box.append(chip(id, '처럼 보여요'));

  $('#reasons').innerHTML = suggested
    .map(({ id }) => {
      const parts = reasonsFor(id);
      return `<li><b>${getEmotion(id).name}</b> — ${parts.length ? parts.join(' · ') : '여러 단서가 조금씩 모임'}</li>`;
    })
    .join('');

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
  const innerName = getEmotion(inner.id).name;
  note.textContent = `겉에서는 '${getEmotion(outer.id).name}'처럼 보였지만, 내가 붙인 이름은 '${innerName}'${withJosa(innerName, '이에요/예요').slice(innerName.length)}. 그 차이도 이 그림의 일부예요.`;
}

function renderSurfaceCues(kind) {
  const list = $('#surface-cues');
  if (kind === 'face') {
    const cues = cueValues(state.faceFeatAvg.value()).slice(0, 4);
    list.innerHTML = cues.length
      ? cues.map((c) => `<li>${c.label} (평균 ${Math.round(c.value * 100)})</li>`).join('')
      : '<li>뚜렷한 얼굴 움직임이 없었어요</li>';
    return;
  }
  const f = state.pointerFeatAvg.value();
  const pct = (v) => Math.round((v ?? 0) * 100);
  list.innerHTML =
    state.pointerFeatAvg.count() > 0
      ? `<li>빠르기 ${pct(f.speed)} / 100</li><li>방향 꺾임 ${pct(f.jitter)} / 100</li><li>멈칫거림 ${pct(f.hesitation)} / 100</li><li>움직인 범위 ${pct(f.spread)} / 100</li>`
      : '<li>움직임 기록이 없었어요</li>';
}
