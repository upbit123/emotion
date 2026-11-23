// p5 인스턴스 모드용 스케치를 만든다.
// 전역 함수(setup/draw) 대신 p 객체에 붙여서, 한 페이지에 캔버스를 여러 개 둘 수 있게 한다.
export function createSketch({ width, height }) {
  return (p) => {
    p.setup = () => {
      p.createCanvas(width, height);
    };

    p.draw = () => {
      p.background(245);
    };
  };
}
