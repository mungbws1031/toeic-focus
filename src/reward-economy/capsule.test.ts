import { describe, it, expect } from "vitest";
import { createRng } from "./rng";
import { openCapsule, type CapsuleRarity } from "./capsule";

const EXPECTED_RATIO: Record<CapsuleRarity, number> = {
  common: 0.6,
  rare: 0.25,
  epic: 0.1,
  legendary: 0.04,
  cheerCard: 0.01,
};

describe("openCapsule", () => {
  it("10,000회 시행 시 등급별 비율이 확률표와 ±2%포인트 이내로 일치한다", () => {
    const rng = createRng(2026);
    const count = 10000;
    const tally: Record<CapsuleRarity, number> = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      cheerCard: 0,
    };

    for (let i = 0; i < count; i++) {
      tally[openCapsule(rng)]++;
    }

    for (const rarity of Object.keys(EXPECTED_RATIO) as CapsuleRarity[]) {
      const actualRatio = tally[rarity] / count;
      expect(Math.abs(actualRatio - EXPECTED_RATIO[rarity])).toBeLessThanOrEqual(0.02);
    }
  });

  it("rng가 0을 반환하면 common이 나온다", () => {
    const zeroRng = () => 0;
    expect(openCapsule(zeroRng)).toBe("common");
  });

  it("rng가 0.999에 가까운 값을 반환하면 cheerCard가 나온다", () => {
    const nearOneRng = () => 0.999;
    expect(openCapsule(nearOneRng)).toBe("cheerCard");
  });
});
