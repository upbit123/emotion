import './style.css';
import { startFaceTracking } from './input/face.js';
import { createCalibrator, createNormalizer, FACE_RANGES } from './input/face-calibration.js';
import { analyzeFace, CUE_LABELS, regionsOf } from './input/face-rules.js';
import {
  EXPRESSION_GUIDE, diagnoseRule, confusionRows, suggestRanges, predictionName,
} from './input/face-diagnosis.js';
import { faceSvg } from './ui/face-diagram.js';
import { EMOTIONS, getEmotion } from './emotion/emotions.js';

const $ = (sel) => document.querySelector(sel);

const LABELS = [{ id: 'neutral', name: '무표정' }, ...EMOTIONS];
for (const { id, name } of LABELS) $('#lab-label').add(new Option(name, id));
const showGuide = () => {
  $('#lab-guide').textContent = `가이드: ${EXPRESSION_GUIDE[$('#lab-label').value]}`;
};
$('#lab-label').addEventListener('change', showGuide);
showGuide();

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
      renderAnalysis();
    }
  }

  if (now - lastUi < 150) return;
  lastUi = now;

  const { scores, pitch } = normalizer.normalize(frame.scores, frame.pitch);
  const a = analyzeFace(scores, { pitch });
  const f = a.features;

  $('#lab-face').innerHTML = faceSvg(f);
  $('#lab-notes').innerHTML = notesOf(a).map((n) => `<li>${n}</li>`).join('') || '<li>특이 사항 없음</li>';
  $('#lab-regions').innerHTML = regionsOf(f)
    .map((r) => `<li><span class="region">${r.region}</span> ${r.level ? `${r.label} · ${r.level}` : '그대로'}</li>`)
    .join('');
  renderBars($('#lab-emotions'), EMOTIONS.map((e) => [e.name, a.weights[e.id] ?? 0]));
  renderBars($('#lab-features'), Object.entries(CUE_LABELS).map(([k, label]) => [label, f[k] ?? 0]));
  renderBars(
    $('#lab-raw'),
    Object.entries(frame.scores).filter(([k]) => k !== '_neutral').map(([k, v]) => [k, v]),
  );
  $('#lab-pitch').textContent =
    `고개 기울기: 원본 ${frame.pitch.toFixed(3)} rad, 보정 후 ${pitch.toFixed(3)} rad ` +
    '(고개를 숙였을 때 보정 후 값이 커져야 정상)';
}

function notesOf(a) {
  const notes = [];
  if (a.smileKind === 'duchenne') notes.push('눈까지 웃는 미소(뒤센 미소)');
  if (a.smileKind === 'social') notes.push('입으로만 웃는 미소');
  if (a.masked) notes.push('웃음 뒤로 다른 단서도 보임');
  if (a.mixed) notes.push(`섞인 표정: ${a.mixed.map((id) => getEmotion(id).name).join(' + ')}`);
  return [...notes, ...a.asymmetry];
}

function renderBars(host, rows) {
  host.innerHTML = rows
    .map(([name, v]) => {
      const pct = Math.round(Math.min(1, Math.max(0, v)) * 100);
      return `<div class="bar-row"><span>${name}</span><div class="bar"><i style="width:${pct}%"></i></div><b>${pct}</b></div>`;
    })
    .join('');
}

// 기록 하나를 지금 보정값으로 다시 분석한다(프레임 평균).
function analyzeRecord({ frames }) {
  const avg = {};
  let pitchSum = 0;
  for (const fr of frames) {
    const n = normalizer.normalize(fr.scores, fr.pitch);
    for (const [k, v] of Object.entries(n.scores)) avg[k] = (avg[k] ?? 0) + v / frames.length;
    pitchSum += n.pitch;
  }
  return analyzeFace(avg, { pitch: pitchSum / frames.length });
}

function renderAnalysis() {
  const analyzed = samples.map((s) => ({ ...s, a: analyzeRecord(s) }));
  const results = analyzed.map(({ label, a }) => ({ label, predicted: Object.keys(a.weights)[0] ?? null }));

  // 혼동 표
  const rows = confusionRows(results);
  const totalCorrect = rows.reduce((n, r) => n + r.correct, 0);
  $('#lab-confusion').innerHTML =
    `<tr><th>지은 표정</th><th>맞음</th><th>규칙이 본 것</th></tr>` +
    rows
      .map((r) => {
        const preds = Object.entries(r.predictions)
          .sort((a, b) => b[1] - a[1])
          .map(([id, n]) => `${predictionName(id)} ${n}`)
          .join(', ');
        return `<tr><td>${labelName(r.label)}</td><td>${r.correct}/${r.total}</td><td>${preds}</td></tr>`;
      })
      .join('') +
    `<tr><th>전체</th><th>${totalCorrect}/${results.length}</th><th></th></tr>`;

  // 근육 범위 조정 제안
  const ranges = suggestRanges(samples, FACE_RANGES);
  $('#lab-ranges').innerHTML = ranges.length
    ? ranges
        .map((r) => `<li><code>${r.key}</code>: 기록 최대 ${r.observed.toFixed(2)} &lt; 보통 최대치 ${r.current} → 낮추면 더 잘 잡혀요</li>`)
        .join('')
    : '<li>지금 범위로 충분해 보여요.</li>';

  // 기록별 진단: 기대한 감정이 왜 1위가 아니었는지
  $('#lab-records').innerHTML = analyzed
    .map(({ label, a }, i) => {
      const top3 = Object.entries(a.weights).slice(0, 3)
        .map(([id, w]) => `${getEmotion(id).name} ${Math.round(w * 100)}`).join(', ') || '단서 없음';
      const predicted = results[i].predicted;
      const ok = label === 'neutral' ? !predicted || predicted === 'calm' : predicted === label;
      let detail = '';
      if (label !== 'neutral' && !ok) {
        const d = diagnoseRule(label, a.features);
        detail = d.supported
          ? [
              ...d.parts.map((p) => `<li class="${p.ok ? 'ok' : 'bad'}">${p.ok ? '✓' : '✗'} ${p.label} ${Math.round(p.value * 100)}${p.ok ? '' : ' (30 이상 필요)'}</li>`),
              ...d.inhibitors.filter((x) => x.blocking).map((x) => `<li class="bad">✗ ${x.label} ${Math.round(x.value * 100)} 때문에 점수가 눌림</li>`),
            ].join('')
          : '<li>표정으로는 다루지 않는 감정이에요(카드·움직임으로 잡아요).</li>';
      }
      return `<div class="record ${ok ? 'ok' : 'bad'}">
        <p><b>#${i + 1} ${labelName(label)}</b> → ${top3} ${ok ? '✓' : '✗'}</p>
        ${notesOf(a).length ? `<p class="sub">${notesOf(a).join(' · ')}</p>` : ''}
        ${detail ? `<ul>${detail}</ul>` : ''}
      </div>`;
    })
    .reverse()
    .join('');
}
