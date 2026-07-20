import { describe, it, expect } from "vitest";
import { redistributeDebt } from "./debtRedistribution";

interface OverdueItem {
  id: number;
}

function makeItems(count: number): OverdueItem[] {
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

describe("redistributeDebt", () => {
  it("항상 5개의 배열을 반환한다", () => {
    expect(redistributeDebt(makeItems(17))).toHaveLength(5);
  });

  it.each([0, 1, 5, 17, 100])(
    "입력 크기 %i에 대해 5일치 배열의 총 항목 수가 원본과 정확히 일치한다",
    (size) => {
      const items = makeItems(size);
      const days = redistributeDebt(items);
      const totalDistributed = days.reduce((sum, day) => sum + day.length, 0);
      expect(totalDistributed).toBe(size);
    },
  );

  it.each([0, 1, 5, 17, 100])(
    "입력 크기 %i에 대해 첫날 배열이 마지막날 배열보다 많거나 같다",
    (size) => {
      const items = makeItems(size);
      const [firstDay, , , , lastDay] = redistributeDebt(items);
      expect(firstDay.length).toBeGreaterThanOrEqual(lastDay.length);
    },
  );

  it.each([0, 1, 5, 17, 100])(
    "입력 크기 %i에 대해 원본 항목이 누락 없이 정확히 한 번씩만 등장한다",
    (size) => {
      const items = makeItems(size);
      const days = redistributeDebt(items);
      const distributedIds = days.flat().map((item) => item.id);

      expect(distributedIds).toHaveLength(size);
      expect(new Set(distributedIds).size).toBe(size);
      expect([...distributedIds].sort((a, b) => a - b)).toEqual(
        items.map((item) => item.id).sort((a, b) => a - b),
      );
    },
  );

  it("원본 순서를 유지하며 앞에서부터 순차 분배한다 (셔플 없음)", () => {
    const items = makeItems(17);
    const days = redistributeDebt(items);
    const flattened = days.flat();
    expect(flattened.map((item) => item.id)).toEqual(items.map((item) => item.id));
  });

  it("빈 배열을 입력하면 5개의 빈 배열을 반환한다", () => {
    const days = redistributeDebt([]);
    expect(days).toEqual([[], [], [], [], []]);
  });
});
