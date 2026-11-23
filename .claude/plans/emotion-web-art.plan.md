# Plan: 나의 [감정]들 — 전체 구조 + 마일스톤 1 (감정–시각 매핑)

**Source PRD**: `.claude/prds/emotion-web-art.prd.md`
**Selected Milestone**: 1. 감정–시각 매핑 정의
**Complexity**: Medium

## 확정된 기술 결정 (2026-11-24)
| 항목 | 결정 | 이유 |
|---|---|---|
| 그리기·구조 | Vite + p5.js | 미디어아트에서 널리 쓰는 창작 코딩 도구. Vite로 모듈을 나눠 관리 |
| 표정 인식 | MediaPipe Face Landmarker의 얼굴 움직임 수치(blendshapes) + 직접 쓴 규칙 | 브라우저 안에서만 동작. "왜 이 감정으로 보였는지" 설명 가능 = '판정 아닌 단서' 원칙 |
| 감정 표현 | 감정 이름 + 쾌–불쾌(valence)·각성(arousal) 2축 좌표 | 이름은 사용자용, 좌표는 색·움직임을 연속적으로 섞는 데 사용 |
| 배포 | GitHub Pages | 무료 https. 웹캠은 https에서만 켜짐 |

## 전체 구조 (모든 마일스톤 공통)

```
[입력]                         [신호]                    [상태]                [출력]
웹캠(얼굴 수치) ─ 규칙 ─┐
카드 질문 응답 ─────────┼─▶ 감정 신호 {감정별 가중치} ─▶ 겉 레이어(표정)  ─┐
마우스 움직임 ──────────┘                               속 레이어(사용자) ─┴▶ 시각 매핑 ─▶ p5 그리기
                                                        ▲
                                     사용자가 감정 이름 고르기·섞기·직접 쓰기
```

- **감정 신호는 항상 "감정별 가중치"** 형태(예: 불안 0.6, 짜증 0.3)다. 입력 종류와 상관없이 같은 모양이라, 그리는 쪽은 입력이 무엇인지 몰라도 된다.
- **겉 / 속 두 레이어**: 표정에서 온 신호(겉)와 사용자가 붙인 이름(속)을 따로 저장하고 따로 그린다. PRD의 '두 겹 결과 화면' 요구.
- **시각 매핑은 순수 함수**: 같은 감정 가중치를 넣으면 늘 같은 시각 값이 나온다. 그래서 그림 없이 테스트할 수 있다.

예정 폴더 구조 (이번 마일스톤은 ★만 만든다):
```
src/
  emotion/emotions.js   ★ 감정 목록: id, 한국어 이름, valence, arousal
  emotion/mix.js        ★ 여러 감정 가중치 → 합성 좌표
  visual/mapping.js     ★ 감정 가중치 → 시각 값(색, 선, 형태, 속도)
  visual/sketch.js      ★ p5로 시각 값을 그림
  input/face.js           (마일스톤 2-1)
  input/cards.js          (마일스톤 2)
  input/pointer.js        (마일스톤 2)
  state.js                (마일스톤 2~3)
preview.html            ★ 감정별 시각 미리보기 갤러리
index.html                (마일스톤 2~) 본 작품
tests/                  ★ 매핑 함수 테스트
```

## Summary
감정 목록과 각 감정의 색·선·형태·움직임 규칙을 데이터로 정의한다. 감정을 섞으면 시각 값이 어떻게 바뀌는지 계산하는 함수를 만들고, 미리보기 페이지로 눈으로 확인한다. 이 미리보기를 2~3명에게 보여 줘 "이 그림이 이 감정처럼 보이는가"를 먼저 확인한다(PRD Risks 1번 대응).

## Patterns to Mirror
레포가 비어 있어 따라 할 기존 코드가 없다. 이번 마일스톤에서 만드는 규칙이 이후 패턴이 된다.
| Category | Source | Pattern |
|---|---|---|
| Naming | 없음 (신규) | 파일은 kebab/소문자, 감정 id는 영어 소문자(`anxiety`), 화면 표시는 한국어 이름 |
| Errors | 없음 (신규) | 모르는 감정 id·범위 밖 좌표는 조용히 넘기지 않고 에러를 던진다 |
| Tests | 없음 (신규) | `tests/*.test.js`, Vitest |

## Files to Change
| File | Action | Why |
|---|---|---|
| `package.json`, `vite.config.js` | CREATE | Vite + p5.js + Vitest 프로젝트 뼈대 |
| `src/emotion/emotions.js` | CREATE | 감정 목록과 좌표 (질문 1·2로 확정) |
| `src/emotion/mix.js` | CREATE | 가중치 합성 |
| `src/visual/mapping.js` | CREATE | 감정 → 시각 규칙 (질문 3으로 확정) |
| `src/visual/sketch.js` | CREATE | p5 그리기 |
| `preview.html`, `src/preview.js` | CREATE | 감정별 갤러리 + 섞기 슬라이더 |
| `tests/mix.test.js`, `tests/mapping.test.js` | CREATE | 순수 함수 검증 |
| `.gitignore` | CREATE | `node_modules`, `dist` 제외 |

## Tasks
### Task 1: 프로젝트 뼈대
- **Action**: Vite 프로젝트 생성, p5·Vitest 설치, 빈 p5 캔버스가 뜨는지 확인
- **Validate**: `npm run dev`로 캔버스 표시, `npm test` 통과(빈 테스트)

### Task 2: 감정 목록 정하기 — ❓질문 1
- **Action**: 다룰 감정 개수와 이름을 준현님과 정한다(기본 감정에서 시작해 '불안·조급함'처럼 노트에서 나온 감정 추가 여부)
- **Validate**: `emotions.js`에 목록 확정

### Task 3: 감정별 좌표 정하기 — ❓질문 2
- **Action**: 각 감정의 쾌–불쾌·각성 값을 정한다. 연구 문헌의 대략적 위치를 초안으로 제시하고 준현님이 조정
- **Validate**: 모든 값이 -1~1 범위인지 테스트

### Task 4: 감정 섞기 함수
- **Action**: 가중치 목록 → 합성 좌표(가중 평균) + 가장 강한 감정들 반환
- **Validate**: 테스트 — 단일 감정이면 그 좌표 그대로, 가중치 합 0이면 에러, 모르는 id면 에러

### Task 5: 시각 규칙 정하기 — ❓질문 3
- **Action**: 좌표·감정 → 색(색상·채도·밝기), 선(굵기·거칠기), 형태(둥긂/각짐), 움직임(속도·흔들림) 규칙을 준현님과 정한다. 설계안 3주차의 "감정마다 떠오르는 색·물체·선"을 여기에 쓴다
- **Validate**: `mapping.js` 테스트 — 같은 입력 = 같은 출력, 쾌 증가 시 정한 방향으로 색이 바뀜

### Task 6: p5 그리기 + 미리보기 갤러리
- **Action**: 시각 값을 받아 그리는 스케치, 감정별 칸 갤러리, 두 감정 섞기 슬라이더
- **Validate**: `npm run dev` 후 `preview.html`을 브라우저로 열어 스크린샷 확인

### Task 7: 짧은 사전 확인
- **Action**: 미리보기를 2~3명에게 보여 주고 "어떤 감정처럼 보이나요?"를 묻는다(준현님 수행). 결과로 규칙 조정
- **Validate**: 응답 기록을 성찰 자료로 남김

## Validation
```bash
npm test          # 섞기·매핑 함수 테스트
npm run build     # 빌드 성공 여부
npm run dev       # preview.html 눈으로 확인
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| 감정별 그림이 서로 비슷해 구분이 안 됨 | 중 | 좌표가 먼 감정끼리 먼저 비교, Task 7 결과로 조정 |
| 색 규칙이 개인 취향에 치우침 | 중 | 색채 심리 연구(쾌–밝기, 각성–채도 경향)를 초안 근거로 제시 |
| p5와 Vite 연결 방식 혼동 | 하 | p5 인스턴스 모드 사용(전역 변수 충돌 방지) |

## Acceptance
- [ ] 감정 목록·좌표·시각 규칙이 데이터로 확정
- [ ] `npm test`, `npm run build` 통과
- [ ] 미리보기에서 감정별 그림과 섞기가 동작
- [ ] 2~3명 사전 확인 결과 기록
