import { describe, it, expect } from "vitest";
import {
  evaluateRecovery,
  dailyCap,
  sortByPriority,
  trimToCapacity,
  type PrioritizedItem,
} from "./index";

function make(tier: PrioritizedItem<string>["tier"], label: string) {
  return { item: label, tier };
}

describe("4일 공백 후 복귀 통합 시나리오", () => {
  it("리커버리 모드 + 일일 상한 + 우선순위 삼각형이 함께 작동한다", () => {
    // 1. 4일 이상 공백 -> 리커버리 모드 발동
    const lastActiveDate = new Date(2026, 0, 1);
    const now = new Date(2026, 0, 6); // 5일 공백
    const overdueCardsSortedByForgetRisk = Array.from(
      { length: 100 },
      (_, i) => `overdue-${i}`
    );

    const plan = evaluateRecovery(
      lastActiveDate,
      now,
      overdueCardsSortedByForgetRisk
    );

    expect(plan.triggered).toBe(true);
    expect(plan.newLearningLockDays).toBe(3);
    expect(plan.compressedReview.length).toBe(40);

    // 2. 리커버리 압축 복습 -> review 티어, 오답 카드 -> wrongAnswer 티어로 구성.
    //    newLearningLockDays > 0 인 동안은 새 학습 후보를 아예 입력에서 제외해
    //    리커버리 락을 표현한다.
    const reviewItems: PrioritizedItem<string>[] = plan.compressedReview.map(
      (card) => make("review", card)
    );
    const wrongAnswerItems: PrioritizedItem<string>[] = Array.from(
      { length: 30 },
      (_, i) => make("wrongAnswer", `wrong-${i}`)
    );
    const newLearningCandidates: PrioritizedItem<string>[] = Array.from(
      { length: 20 },
      (_, i) => make("new", `new-${i}`)
    );

    const isNewLearningLocked = plan.newLearningLockDays > 0;
    const candidateItems = isNewLearningLocked
      ? [...reviewItems, ...wrongAnswerItems]
      : [...reviewItems, ...wrongAnswerItems, ...newLearningCandidates];

    expect(isNewLearningLocked).toBe(true);

    // 3. dailyCap('normal') = 60을 capacity로 trimToCapacity 적용
    const capacity = dailyCap("normal");
    expect(capacity).toBe(60);

    const sorted = sortByPriority(candidateItems);
    const finalItems = trimToCapacity(sorted, capacity);

    // 4. new 티어 항목이 결과에 전혀 포함되지 않아야 한다
    expect(finalItems.some((entry) => entry.tier === "new")).toBe(false);

    // 5. 최종 결과 항목 수가 capacity(60) 이하
    expect(finalItems.length).toBeLessThanOrEqual(capacity);

    // review(40개)가 wrongAnswer보다 우선 보존되고, capacity 초과분은 wrongAnswer에서 잘린다
    const counts = { review: 0, wrongAnswer: 0, new: 0 };
    for (const entry of finalItems) {
      counts[entry.tier] += 1;
    }
    expect(counts.review).toBe(40);
    expect(counts.wrongAnswer).toBe(20);
    expect(finalItems.length).toBe(60);
  });
});
