import { describe, it, expect } from "vitest";
import { initXpState, recordAnswer, levelFromXp, type XpState } from "./xp";

describe("initXpState", () => {
  it("초기 상태는 totalXp 0, combo 0이다", () => {
    expect(initXpState()).toEqual({ totalXp: 0, combo: 0 });
  });
});

describe("recordAnswer", () => {
  it("연속 정답 5회째에서 콤보 배율이 적용되어 4회째보다 xpGained가 커진다", () => {
    let state: XpState = initXpState();
    let xpGained = 0;
    for (let i = 0; i < 4; i += 1) {
      const result = recordAnswer(state, true);
      state = result.nextState;
      xpGained = result.xpGained;
    }
    const fourthXp = xpGained;

    const fifth = recordAnswer(state, true);

    expect(fifth.nextState.combo).toBe(5);
    expect(fifth.xpGained).toBeGreaterThan(fourthXp);
  });

  it("콤보 중 오답이 발생하면 combo가 0으로 리셋되고 xpGained는 0이다", () => {
    let state: XpState = initXpState();
    for (let i = 0; i < 5; i += 1) {
      state = recordAnswer(state, true).nextState;
    }
    expect(state.combo).toBe(5);

    const result = recordAnswer(state, false);

    expect(result.nextState.combo).toBe(0);
    expect(result.xpGained).toBe(0);
    expect(result.nextState.totalXp).toBe(state.totalXp);
  });

  it("정답 시 totalXp가 xpGained만큼 증가한다", () => {
    const state = initXpState();
    const result = recordAnswer(state, true);
    expect(result.nextState.totalXp).toBe(state.totalXp + result.xpGained);
  });
});

describe("levelFromXp", () => {
  it("totalXp가 커질수록 level은 감소하지 않는다 (단조증가)", () => {
    const sampleValues = [0, 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 50000];
    let previousLevel = levelFromXp(sampleValues[0]);
    for (const totalXp of sampleValues.slice(1)) {
      const level = levelFromXp(totalXp);
      expect(level).toBeGreaterThanOrEqual(previousLevel);
      previousLevel = level;
    }
  });

  it("레벨은 1부터 시작한다", () => {
    expect(levelFromXp(0)).toBe(1);
  });
});
