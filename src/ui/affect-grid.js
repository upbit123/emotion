// 감정 좌표 판(Affect Grid). 가로는 불쾌–쾌, 세로는 각성 낮음–높음.
// 네 모서리 말은 Russell 등(1989) 원판의 모서리 이름(스트레스·흥분·우울·이완)을 우리말로 옮겼다.
export function createAffectGrid(host, onPick) {
  host.innerHTML = `
    <div class="affect-grid" tabindex="0" aria-label="감정 좌표 판">
      <span class="corner tl">긴장·스트레스</span>
      <span class="corner tr">신남·흥분</span>
      <span class="corner bl">우울·지침</span>
      <span class="corner br">편안·여유</span>
      <span class="axis top">에너지 높음</span>
      <span class="axis bottom">에너지 낮음</span>
      <span class="axis left">불쾌</span>
      <span class="axis right">쾌</span>
      <span class="dot" hidden></span>
    </div>
    <button class="primary grid-confirm" disabled>이 위치로 할게요</button>`;

  const grid = host.querySelector('.affect-grid');
  const dot = host.querySelector('.dot');
  const confirm = host.querySelector('.grid-confirm');
  let point = null;

  grid.addEventListener('pointerdown', (e) => {
    const rect = grid.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    point = { valence: x * 2 - 1, arousal: 1 - y * 2 };
    dot.hidden = false;
    dot.style.left = `${x * 100}%`;
    dot.style.top = `${y * 100}%`;
    confirm.disabled = false;
  });

  confirm.addEventListener('click', () => {
    if (point) onPick(point);
  });
}
