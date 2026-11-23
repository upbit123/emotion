// MediaPipe 실행 파일(wasm)과 얼굴 모델을 public/mediapipe/에 준비한다.
// 사이트가 이 파일들을 직접 제공하므로, 사용자 브라우저는 외부 CDN에 접속하지 않는다.
// 용량이 커서(약 18MB) git에는 넣지 않고 dev/build 전에 이 스크립트로 만든다.
import { access, copyFile, mkdir, writeFile } from 'node:fs/promises';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const root = new URL('../', import.meta.url);
const target = new URL('public/mediapipe/', root);
const wasmSource = new URL('node_modules/@mediapipe/tasks-vision/wasm/', root);

await mkdir(new URL('wasm/', target), { recursive: true });
for (const file of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm']) {
  await copyFile(new URL(file, wasmSource), new URL(`wasm/${file}`, target));
}

const model = new URL('face_landmarker.task', target);
try {
  await access(model);
} catch {
  console.log('얼굴 모델 내려받는 중…');
  const res = await fetch(MODEL_URL);
  if (!res.ok) {
    throw new Error(`얼굴 모델 다운로드 실패: HTTP ${res.status}`);
  }
  await writeFile(model, Buffer.from(await res.arrayBuffer()));
}
console.log('MediaPipe 준비 완료: public/mediapipe/');
