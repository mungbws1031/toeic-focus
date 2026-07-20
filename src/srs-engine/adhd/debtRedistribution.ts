/**
 * 설계 스펙 §4.3 — 밀린 복습(부채)은 '오늘 다'가 아니라 향후 5일에
 * 지수 가중으로 분산 배치한다. 첫날에 가장 많이, 이후 점점 줄어든다.
 */
const REDISTRIBUTION_WEIGHTS = [0.35, 0.25, 0.18, 0.13, 0.09] as const;

export function redistributeDebt<T>(overdueItems: T[]): T[][] {
  const counts = distributeCounts(overdueItems.length, REDISTRIBUTION_WEIGHTS);

  const result: T[][] = [];
  let cursor = 0;
  for (const count of counts) {
    result.push(overdueItems.slice(cursor, cursor + count));
    cursor += count;
  }
  return result;
}

/**
 * 최대 잔여치(largest remainder) 방식으로 total을 weights 비율에 맞춰
 * 정수 개수로 분배한다. Math.round를 각 항목에 독립 적용하면 반올림
 * 오차로 총합이 total과 어긋날 수 있어, floor 후 남는 개수를 소수부가
 * 큰 순서(동률이면 앞 순서 우선)로 하나씩 채워 넣어 총합을 정확히 맞춘다.
 */
function distributeCounts(total: number, weights: readonly number[]): number[] {
  const raw = weights.map((weight) => total * weight);
  const floors = raw.map((value) => Math.floor(value));
  const distributed = floors.reduce((sum, value) => sum + value, 0);
  const remainder = total - distributed;

  const order = raw
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  const counts = [...floors];
  for (let i = 0; i < remainder; i++) {
    counts[order[i].index] += 1;
  }
  return counts;
}
