# 나의 [감정]들

감정을 판정하지 않는 인터랙티브 웹아트. 웹캠 표정·카드 질문·마우스 움직임을 색과 움직임으로 그리고,
그 감정의 이름은 사용자가 직접 붙인다. 결과는 **겉(표정·움직임에서 보인 단서)**과 **속(내가 붙인 이름)** 두 겹으로 보여 준다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173  (처음 실행 시 얼굴 모델 3.7MB를 내려받음)
```

- 본 작품: `http://localhost:5173/`
- 감정 12종 미리보기·섞기: `http://localhost:5173/preview.html`

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm test` | 순수 함수 테스트(Vitest) |
| `npm run build` | `dist/`에 배포용 빌드 |
| `npm run setup` | MediaPipe wasm·모델을 `public/mediapipe/`에 준비(dev/build 전에 자동 실행) |

## 사생활

- 웹캠 영상은 브라우저 안에서만 분석하고 저장·전송하지 않는다.
- MediaPipe 실행 파일과 모델은 사이트가 직접 제공한다(외부 CDN 접속 없음).

## 문서

- 요구사항: `.claude/prds/emotion-web-art.prd.md`
- 구현 계획: `.claude/plans/emotion-web-art.plan.md`
