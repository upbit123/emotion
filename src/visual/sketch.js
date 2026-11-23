import { MOTIFS, BASE_COUNT } from './motifs.js';

// p5 인스턴스 모드용 스케치를 만든다.
// 전역 함수(setup/draw) 대신 p 객체에 붙여서, 한 페이지에 캔버스를 여러 개 둘 수 있게 한다.
//
// getScenes()는 매 프레임 그릴 장면 목록을 돌려준다.
//   { visual, x, y, w, h, captions, placeholder }  (x, y, w, h는 캔버스 대비 0~1 비율)
//   visual이 null이면 placeholder 문구만 보여 준다.
export function createSketch({ width, height, getScenes = () => [], drawOverlay, resize, onSetup }) {
  return (p) => {
    p.setup = () => {
      p.createCanvas(width, height);
      p.colorMode(p.HSB, 360, 100, 100, 100);
      onSetup?.(p);
    };

    p.draw = () => {
      const scenes = getScenes();
      if (scenes.length === 0) {
        p.background(0, 0, 96);
      }
      const time = p.millis() / 1000;
      for (const scene of scenes) {
        drawScene(p, scene, time);
      }
      drawOverlay?.(p);
    };

    p.windowResized = () => {
      if (resize) p.resizeCanvas(...resize());
    };
  };
}

function drawScene(p, scene, time) {
  const x = scene.x * p.width;
  const y = scene.y * p.height;
  const w = scene.w * p.width;
  const h = scene.h * p.height;
  const ctx = p.drawingContext;

  // ctx.save/restore를 직접 쓰면 p5가 기억하는 선·채우기 색과 캔버스 상태가 어긋나
  // (같은 색을 다시 지정해도 p5가 생략해서 검게 그려진다) push/pop으로 함께 저장한다.
  p.push();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  if (scene.visual) {
    const { background: bg, mood, layers } = scene.visual;
    // 반투명 배경을 덧칠해 움직임이 잔상처럼 남게 한다.
    p.noStroke();
    p.fill(bg.h, bg.s, bg.b, scene.trail ?? 28);
    p.rect(x, y, w, h);

    const t = time * mood.speed;
    const unit = Math.min(w, h);
    drawMoodShape(p, { x, y, w, h, t, unit, bg, mood });

    // 비율이 작은 감정부터 그려, 가장 강한 감정이 맨 위에 오게 한다.
    for (const layer of [...layers].reverse()) {
      MOTIFS[layer.motif]({
        p, x, y, w, h, t, unit,
        n: Math.max(2, Math.round(BASE_COUNT * layer.weight)),
        color: layer.color,
      });
    }
  } else {
    p.noStroke();
    p.fill(230, 8, 18, 100);
    p.rect(x, y, w, h);
    if (scene.placeholder) {
      p.fill(0, 0, 100, 60);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(Math.max(13, Math.min(w, h) * 0.045));
      p.text(scene.placeholder, x + w / 2, y + h / 2);
    }
  }

  drawCaptions(p, scene.captions ?? [], x, y, w);
  p.pop();
}

// 화면 가운데의 큰 형태. 쾌가 높을수록 둥글고, 낮을수록 뾰족하다(축 규칙의 roundness).
function drawMoodShape(p, { x, y, w, h, t, unit, bg, mood }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const radius = unit * 0.32;
  const spike = (1 - mood.roundness) * 0.45;
  p.noStroke();
  p.fill(bg.h, bg.s, Math.min(100, bg.b + 18), 10);
  p.beginShape();
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const wave = Math.sin(a * 7 + t * 0.8);
    const r = radius * (1 + Math.sign(wave) * Math.abs(wave) ** 3 * spike + 0.04 * Math.sin(a * 3 + t));
    p.vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  p.endShape(p.CLOSE);
}

function drawCaptions(p, captions, x, y, w) {
  if (captions.length === 0) return;
  p.noStroke();
  p.textAlign(p.LEFT, p.TOP);
  captions.forEach((line, i) => {
    const size = i === 0 ? 13 : 18;
    p.textSize(size);
    p.fill(0, 0, 100, i === 0 ? 70 : 92);
    p.text(line, x + 16, y + 14 + (i === 0 ? 0 : 6 + i * 24), w - 32);
  });
}
