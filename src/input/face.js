import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// 웹캠 영상을 이 브라우저 안에서만 분석한다. 영상·사진은 저장하거나 전송하지 않는다.
// onScores는 프레임마다 { blendshape 이름: 0~1 값 } 또는 얼굴이 없으면 null을 받는다.
const BASE = `${import.meta.env.BASE_URL}mediapipe/`;

export async function startFaceTracking(video, onScores) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: 'user' },
    audio: false,
  });

  let landmarker;
  try {
    video.srcObject = stream;
    await video.play();
    const fileset = await FilesetResolver.forVisionTasks(`${BASE}wasm`);
    landmarker = await createLandmarker(fileset);
  } catch (err) {
    stopStream(video, stream);
    throw err;
  }

  let running = true;
  let lastVideoTime = -1;
  const loop = () => {
    if (!running) return;
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const result = landmarker.detectForVideo(video, performance.now());
      const categories = result.faceBlendshapes?.[0]?.categories;
      onScores(categories ? Object.fromEntries(categories.map((c) => [c.categoryName, c.score])) : null);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return {
    stop() {
      running = false;
      stopStream(video, stream);
      landmarker.close();
    },
  };
}

async function createLandmarker(fileset) {
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: `${BASE}face_landmarker.task`, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
  });
  try {
    return await FaceLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    // GPU 가속을 못 쓰는 기기에서는 CPU로 다시 시도한다.
    return FaceLandmarker.createFromOptions(fileset, options('CPU'));
  }
}

function stopStream(video, stream) {
  stream.getTracks().forEach((track) => track.stop());
  video.srcObject = null;
}
