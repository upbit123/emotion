import './style.css';
import { startFaceTracking } from './input/face.js';
import { createCalibrator, createNormalizer, FACE_RANGES } from './input/face-calibration.js';
import { blendshapesToWeights, features, CUE_LABELS } from './input/face-rules.js';
import { EMOTIONS, getEmotion } from './emotion/emotions.js';

const $ = (sel) => document.querySelector(sel);

const LABELS = [{ id: 'neutral', name: '무표정' }, ...EMOTIONS];
for (const { id, name } of LABELS) $('#lab-label').add(new Option(name, id));

let calibrator = null;
let calibrateUntil = 0;
let baseline = { scores: {}, pitch: 0 };
let normalizer = createNormalizer(baseline);
let recording = null; // { label, until, frames }
const samples = []; //   [{ label, frames: [{ scores, pitch }] }]
let lastUi = 0;

$('#lab-start').addEventListener('click', async () => {
  $('#lab-start').disabled = true;
  $('#lab-status').textContent = '카메라 권한을 허용해 주세요…';
  try {
    await startFaceTracking($('#lab-cam'), onFrame);
    $('#lab-status').textContent = '먼저 무표정 보정을 해 주세요.';
    $('#lab-calibrate').disabled = false;
  } catch (err) {
    console.error(err);
    $('#lab-status').textContent = `카메라를 켜지 못했어요: ${err.name ?? err}`;
    $('#lab-start').disabled = false;
  }
});

$('#lab-calibrate').addEventListener('click', () => {
  calibrator = createCalibrator();
  calibrateUntil = performance.now() + 3000;
  $('#lab-status').textContent = '무표정으로 정면을 봐 주세요…';
});

$('#lab-record').addEventListener('click', () => {
  const label = $('#lab-label').value;
  recording = { label, until: performance.now() + 3000, frames: [] };
  $('#lab-record').disabled = true;
  $('#lab-status').textContent = `'${labelName(label)}' 표정을 유지해 주세요…`;
});

$('#lab-export').addEventListener('click', () => {
  const data = { version: 1, createdAt: new Date().toISOString(), baseline, ranges: FACE_RANGES, samples };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `face-samples-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

function labelName(id) {
  return LABELS.find((l) => l.id === id).name;
}

function onFrame(frame) {
  const now = performance.now();
  if (!frame) {
    if (now - lastUi > 250) $('#lab-status').textContent = '얼굴을 찾는 중…';
    return;
  }

  if (calibrator) {
    calibrator.add(frame.scores, frame.pitch);
    if (now >= calibrateUntil) {
      baseline = calibrator.baseline();
      normalizer = createNormalizer(baseline);
      calibrator = null;
      $('#lab-status').textContent = '보정 완료. 감정을 고르고 기록해 보세요.';
      $('#lab-record').disabled = false;
    }
  }

  if (recording) {
    recording.frames.push({ scores: frame.scores, pitch: frame.pitch });
    if (now >= recording.until) {
      samples.push({ label: recording.label, frames: recording.frames });
      $('#lab-status').textContent = `'${labelName(recording.label)}' ${recording.frames.length}프레임 기록됨`;
      recording = null;
      $('#lab-record').disabled = false;
      $('#lab-export').disabled = false;
      renderSummary();
    }
  }

  if (now - lastUi < 150) return;
  lastUi = now;

  const { scores, pitch } = normalizer.normalize(frame.scores, frame.pitch);
  const head = { pitch };
  const f = features(scores, head);
  const weights = blendshapesToWeights(scores, head);

  renderBars($('#lab-emotions'), EMOTIONS.map((e) => [e.name, weights[e.id] ?? 0]));
  renderBars($('#lab-features'), Object.entries(CUE_LABELS).map(([k, label]) => [label, f[k] ?? 0]));
  renderBars(
    $('#lab-raw'),
    Object.entries(frame.scores).filter(([k]) => k !== '_neutral').map(([k, v]) => [k, v]),
  );
  $('#lab-pitch').textContent =
    `고개 기울기: 원본 ${frame.pitch.toFixed(3)} rad, 보정 후 ${pitch.toFixed(3)} rad ` +
    '(고개를 숙였을 때 보정 후 값이 커져야 정상)';
}

function renderBars(host, rows) {
  host.innerHTML = rows
    .map(([name, v]) => {
      const pct = Math.round(Math.min(1, Math.max(0, v)) * 100);
      return `<div class="bar-row"><span>${name}</span><div class="bar"><i style="width:${pct}%"></i></div><b>${pct}</b></div>`;
    })
    .join('');
}

// 기록한 표정마다, 지금 규칙이 어떤 감정을 1위로 보는지 확인한다.
function renderSummary() {
  const rows = samples.map(({ label, frames }) => {
    const avg = {};
    let pitchSum = 0;
    for (const fr of frames) {
      const n = normalizer.normalize(fr.scores, fr.pitch);
      for (const [k, v] of Object.entries(n.scores)) avg[k] = (avg[k] ?? 0) + v / frames.length;
      pitchSum += n.pitch;
    }
    const weights = blendshapesToWeights(avg, { pitch: pitchSum / frames.length });
    const [topId] = Object.keys(weights);
    const guess = topId ? getEmotion(topId).name : '단서 없음';
    const ok = label === 'neutral' ? !topId || topId === 'calm' : topId === label;
    return `<tr><td>${labelName(label)}</td><td>${guess}</td><td>${ok ? '✓' : '✗'}</td></tr>`;
  });
  const correct = rows.filter((r) => r.includes('✓')).length;
  $('#lab-summary').innerHTML =
    `<tr><th>지은 표정</th><th>규칙의 1위</th><th>${correct}/${rows.length}</th></tr>` + rows.join('');
}
