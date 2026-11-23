import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('p5-offline', () => {
  it('설치된 p5 버전과 캐시 키 버전이 같다(다르면 외부 요청이 다시 생긴다)', async () => {
    globalThis.navigator ??= { language: 'ko-KR' };
    globalThis.window ??= { localStorage: { getItem: () => null, setItem: () => {} } };
    const { P5_VERSION } = await import('../src/visual/p5-offline.js');
    const installed = JSON.parse(readFileSync('node_modules/p5/package.json', 'utf8')).version;
    expect(P5_VERSION).toBe(installed);
  });
});
