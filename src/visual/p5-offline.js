// p5는 불러오는 순간 오류 안내(FES) 번역 파일을 외부 CDN(cdn.jsdelivr.net)에서 받으려 한다.
// 이 작품은 외부로 아무것도 보내지 않는 것이 원칙이라, p5가 먼저 확인하는 localStorage 캐시를
// 빈 번역으로 채워 요청을 막는다(오류 안내는 영어로 나온다). p5보다 먼저 import해야 한다.
export const P5_VERSION = '2.4.0';

try {
  const key = `${navigator.language}-${P5_VERSION}`;
  if (!window.localStorage.getItem(key)) {
    window.localStorage.setItem(key, '{}');
  }
} catch {
  // 저장소가 막힌 환경(사생활 보호 모드 등)에서는 p5가 원래대로 동작한다.
}
