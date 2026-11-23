// 실험실에서 만든 '내 얼굴 범위'를 이 브라우저에만 저장한다(서버로 보내지 않음).
// 저장소가 막힌 환경에서는 기본 범위를 쓴다.
const KEY = 'emotion.faceRanges.v1';

export function loadPersonalRanges() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePersonalRanges(ranges) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ranges));
    return true;
  } catch {
    return false;
  }
}

export function clearPersonalRanges() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 지울 수 없으면 그대로 둔다
  }
}
