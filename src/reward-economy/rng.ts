/**
 * mulberry32 — 단순하고 빠른 32비트 결정적 PRNG.
 * 같은 seed로 생성한 함수는 항상 같은 시퀀스를 반환한다.
 * (보상 연출의 재현성/테스트 가능성을 위해 시드 기반 RNG를 사용한다.)
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;

  return function random(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
