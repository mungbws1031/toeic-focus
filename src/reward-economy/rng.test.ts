import { describe, it, expect } from "vitest";
import { createRng } from "./rng";

function sample(seed: number, count: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng());
}

describe("createRng", () => {
  it("같은 시드는 항상 같은 시퀀스를 생성한다", () => {
    expect(sample(42, 10)).toEqual(sample(42, 10));
  });

  it("다른 시드는 다른 시퀀스를 생성한다", () => {
    const a = sample(1, 10);
    const b = sample(2, 10);
    expect(a[0]).not.toBe(b[0]);
  });

  it("생성된 값은 항상 [0, 1) 범위 안에 있다", () => {
    const values = sample(123, 1000);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
