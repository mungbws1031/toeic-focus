import { describe, it, expect } from "vitest";
import { evaluateRecovery } from "./recoveryMode";

describe("evaluateRecovery", () => {
  it("3일 공백이면 리커버리 모드가 발동하지 않는다", () => {
    const lastActiveDate = new Date(2026, 0, 1);
    const now = new Date(2026, 0, 4);
    const plan = evaluateRecovery(lastActiveDate, now, [1, 2, 3]);

    expect(plan.triggered).toBe(false);
    expect(plan.compressedReview).toEqual([]);
    expect(plan.newLearningLockDays).toBe(0);
  });

  it("정확히 4일 공백이면 리커버리 모드가 발동한다", () => {
    const lastActiveDate = new Date(2026, 0, 1);
    const now = new Date(2026, 0, 5);
    const plan = evaluateRecovery(lastActiveDate, now, [1, 2, 3]);

    expect(plan.triggered).toBe(true);
    expect(plan.newLearningLockDays).toBe(3);
  });

  it("10일 공백에 overdue 카드가 100개면 압축 복습은 최대 40개로 제한된다", () => {
    const lastActiveDate = new Date(2026, 0, 1);
    const now = new Date(2026, 0, 11);
    const overdueCards = Array.from({ length: 100 }, (_, i) => i);
    const plan = evaluateRecovery(lastActiveDate, now, overdueCards);

    expect(plan.triggered).toBe(true);
    expect(plan.compressedReview.length).toBe(40);
    expect(plan.compressedReview).toEqual(overdueCards.slice(0, 40));
  });

  it("overdue 카드가 40개 미만이면 있는 만큼만 반환한다", () => {
    const lastActiveDate = new Date(2026, 0, 1);
    const now = new Date(2026, 0, 11);
    const overdueCards = Array.from({ length: 20 }, (_, i) => i);
    const plan = evaluateRecovery(lastActiveDate, now, overdueCards);

    expect(plan.triggered).toBe(true);
    expect(plan.compressedReview.length).toBe(20);
  });
});
