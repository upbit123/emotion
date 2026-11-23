import { describe, it, expect } from 'vitest';
import { blendshapesToWeights, explainCues, faceReasons } from '../src/input/face-rules.js';

// 보정·정규화를 거친 값(0~1)을 좌우 같은 값으로 만든다.
function face(features) {
  const pairs = {
    smile: ['mouthSmileLeft', 'mouthSmileRight'],
    frown: ['mouthFrownLeft', 'mouthFrownRight'],
    browDown: ['browDownLeft', 'browDownRight'],
    browOuterUp: ['browOuterUpLeft', 'browOuterUpRight'],
    eyeWide: ['eyeWideLeft', 'eyeWideRight'],
    eyeSquint: ['eyeSquintLeft', 'eyeSquintRight'],
    eyeBlink: ['eyeBlinkLeft', 'eyeBlinkRight'],
    press: ['mouthPressLeft', 'mouthPressRight'],
    sneer: ['noseSneerLeft', 'noseSneerRight'],
    stretch: ['mouthStretchLeft', 'mouthStretchRight'],
    cheek: ['cheekSquintLeft', 'cheekSquintRight'],
    upperUp: ['mouthUpperUpLeft', 'mouthUpperUpRight'],
  };
  const single = { browInnerUp: 'browInnerUp', jawOpen: 'jawOpen', pucker: 'mouthPucker' };
  const out = {};
  for (const [k, v] of Object.entries(features)) {
    if (pairs[k]) for (const name of pairs[k]) out[name] = v;
    else out[single[k]] = v;
  }
  return out;
}

const top = (w) => Object.keys(w)[0];

describe('blendshapesToWeights (FACS 기반 규칙)', () => {
  it('무표정이면 감정 단서가 없다', () => {
    expect(blendshapesToWeights({})).toEqual({});
  });

  it('입꼬리 + 볼 올라감 → 기쁨', () => {
    expect(top(blendshapesToWeights(face({ smile: 0.8, cheek: 0.6 })))).toBe('joy');
  });

  it('웃으면서 눈을 크게 뜨면 설렘도 보인다', () => {
    expect(blendshapesToWeights(face({ smile: 0.9, eyeWide: 0.8 })).excitement).toBeGreaterThan(0.3);
  });

  it('입꼬리 내려감 + 눈썹 안쪽 올라감 → 슬픔', () => {
    const w = blendshapesToWeights(face({ frown: 0.7, browInnerUp: 0.6 }));
    expect(top(w)).toBe('sadness');
  });

  it('웃고 있으면 슬픔 단서를 누른다', () => {
    const w = blendshapesToWeights(face({ frown: 0.5, browInnerUp: 0.5, smile: 0.8 }));
    expect(w.joy).toBeGreaterThan(w.sadness ?? 0);
  });

  it('눈썹 내려감 + 입술 누름 → 분노', () => {
    expect(top(blendshapesToWeights(face({ browDown: 0.8, press: 0.6, eyeSquint: 0.5 })))).toBe('anger');
  });

  it('눈썹 올라감 + 눈 크게 뜸 + 입 벌림 → 놀람(불안 아님)', () => {
    const w = blendshapesToWeights(face({ browInnerUp: 0.7, browOuterUp: 0.7, eyeWide: 0.8, jawOpen: 0.7 }));
    expect(top(w)).toBe('surprise');
  });

  it('눈썹 안쪽 올라감 + 눈 크게 뜸 + 입 옆으로 당김 → 불안(놀람 아님)', () => {
    const w = blendshapesToWeights(face({ browInnerUp: 0.7, eyeWide: 0.7, stretch: 0.7, browDown: 0.4 }));
    expect(top(w)).toBe('anxiety');
  });

  it('코 찡그림 + 윗입술 올라감 → 짜증', () => {
    expect(top(blendshapesToWeights(face({ sneer: 0.7, upperUp: 0.5, browDown: 0.3 })))).toBe('irritation');
  });

  it('입 삐죽 → 서운함', () => {
    expect(top(blendshapesToWeights(face({ pucker: 0.8, frown: 0.3 })))).toBe('hurt');
  });

  it('눈꺼풀 처짐 + 고개 숙임 → 무기력', () => {
    expect(top(blendshapesToWeights(face({ eyeBlink: 0.6 }), { pitch: 0.4 }))).toBe('lethargy');
  });

  it('다른 움직임 없이 살짝 미소 → 평온', () => {
    const w = blendshapesToWeights(face({ smile: 0.25 }));
    expect(top(w)).toBe('calm');
  });

  it('활짝 웃으면 평온이 아니라 기쁨', () => {
    const w = blendshapesToWeights(face({ smile: 0.9, cheek: 0.7 }));
    expect(w.calm ?? 0).toBe(0);
  });

  it('완전히 감은 눈(깜빡임)은 무기력으로 보지 않는다', () => {
    expect(blendshapesToWeights(face({ eyeBlink: 1 })).lethargy ?? 0).toBe(0);
  });

  it('값은 0~1 범위이고 큰 순서로 정렬된다', () => {
    const w = blendshapesToWeights(face({ smile: 1, cheek: 1, browDown: 1, eyeWide: 1, jawOpen: 1, frown: 1 }));
    const values = Object.values(w);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect([...values].sort((a, b) => b - a)).toEqual(values);
  });
});

describe('explainCues', () => {
  it('강하게 움직인 얼굴 부위를 한국어로 설명한다', () => {
    const cues = explainCues(face({ smile: 0.8, browDown: 0.05 }));
    expect(cues[0].label).toBe('입꼬리 올라감');
    expect(cues.find((c) => c.label === '눈썹 내려감')).toBeUndefined();
  });

  it('고개를 숙이면 설명에 들어간다', () => {
    expect(explainCues({}, { pitch: 0.4 }).map((c) => c.label)).toContain('고개 숙임');
  });
});

describe('faceReasons', () => {
  it('감정과 관련된 얼굴 움직임만 근거로 고른다', () => {
    const avg = { frown: 0.6, browInnerUp: 0.5, smile: 0.1 };
    expect(faceReasons(avg, 'sadness')).toEqual(['입꼬리 내려감', '눈썹 안쪽 올라감']);
    expect(faceReasons(avg, 'joy')).toEqual([]);
  });
});

describe('데이터로 보완한 단서 (2026-11-24 기록 분석)', () => {
  it('입술을 앙다물고 눈을 찡그리면 분노', () => {
    const w = blendshapesToWeights({ mouthRollLower: 0.8, mouthRollUpper: 0.7, eyeSquintLeft: 0.4, eyeSquintRight: 0.4 });
    expect(top(w)).toBe('anger');
  });

  it('입술에 힘이 들어가 있으면 고개를 숙여도 무기력으로 보지 않는다', () => {
    const w = blendshapesToWeights(
      { mouthRollLower: 0.8, mouthRollUpper: 0.8, eyeSquintLeft: 0.45, eyeSquintRight: 0.45, eyeBlinkLeft: 0.33, eyeBlinkRight: 0.33 },
      { pitch: 0.1 },
    );
    expect(w.anger).toBeGreaterThan(w.lethargy ?? 0);
  });

  it('눈동자를 옆으로 흘기면 짜증', () => {
    const w = blendshapesToWeights({ eyeLookInLeft: 0.5, eyeLookOutRight: 0.5 });
    expect(top(w)).toBe('irritation');
  });

  it('찡그림이 풀리는 것(drop)도 눈을 크게 뜬 것으로 본다', () => {
    const w = blendshapesToWeights(
      { browInnerUp: 0.6, browOuterUpLeft: 0.6, browOuterUpRight: 0.6, jawOpen: 0.5 },
      { drops: { eyeSquintLeft: 0.6, eyeSquintRight: 0.6 } },
    );
    expect(w.surprise).toBeGreaterThan(0.5);
  });

  it('눈꺼풀만 조금 내려간 살짝 미소는 무기력이 아니라 평온', () => {
    const w = blendshapesToWeights({ mouthSmileLeft: 0.25, mouthSmileRight: 0.22, eyeBlinkLeft: 0.33, eyeBlinkRight: 0.33 }, { pitch: 0.03 });
    expect(top(w)).toBe('calm');
  });

  it('고개를 숙이지 않으면 눈꺼풀만으로는 무기력이 약하다', () => {
    const w = blendshapesToWeights({ eyeBlinkLeft: 0.4, eyeBlinkRight: 0.4 });
    expect(w.lethargy ?? 0).toBeLessThan(0.15);
  });
});
