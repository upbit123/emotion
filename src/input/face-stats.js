// 세션 동안의 표정 통계(결과 화면의 근거). analyzeFace() 결과를 프레임마다 넣는다.
export function createFaceStats() {
  let frames = 0;
  let smiling = 0;
  let duchenne = 0;
  let masked = 0;
  let mixed = 0;
  let asym = 0;
  const peaks = {};
  const tops = {};

  return {
    add(a) {
      frames += 1;
      if (a.smileKind) smiling += 1;
      if (a.smileKind === 'duchenne') duchenne += 1;
      if (a.masked) masked += 1;
      if (a.mixed) mixed += 1;
      if (a.asymmetry.length) asym += 1;
      for (const [id, w] of Object.entries(a.weights)) peaks[id] = Math.max(peaks[id] ?? 0, w);
      const [top] = Object.entries(a.weights).sort((x, y) => y[1] - x[1]);
      if (top) tops[top[0]] = (tops[top[0]] ?? 0) + 1;
    },
    summary() {
      const share = (n) => (frames ? n / frames : 0);
      return {
        frames,
        smileShare: share(smiling),
        duchenneShare: smiling ? duchenne / smiling : 0,
        maskedShare: share(masked),
        mixedShare: share(mixed),
        asymShare: share(asym),
        peaks: { ...peaks },
        topShare: Object.fromEntries(Object.entries(tops).map(([id, n]) => [id, share(n)])),
      };
    },
  };
}
