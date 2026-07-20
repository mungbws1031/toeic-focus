import { describe, it, expect } from "vitest";
import {
  sortByPriority,
  trimToCapacity,
  type PrioritizedItem,
} from "./priorityTriangle";

function make(tier: PrioritizedItem<string>["tier"], label: string) {
  return { item: label, tier };
}

describe("sortByPriority", () => {
  it("섞인 순서로 입력해도 review -> wrongAnswer -> new 순으로 정렬한다", () => {
    const input: PrioritizedItem<string>[] = [
      make("new", "n1"),
      make("review", "r1"),
      make("wrongAnswer", "w1"),
      make("new", "n2"),
      make("review", "r2"),
      make("wrongAnswer", "w2"),
    ];

    const sorted = sortByPriority(input);

    expect(sorted.map((s) => s.tier)).toEqual([
      "review",
      "review",
      "wrongAnswer",
      "wrongAnswer",
      "new",
      "new",
    ]);
    // 같은 티어 내부는 원래 순서(안정 정렬) 유지
    expect(sorted.map((s) => s.item)).toEqual([
      "r1",
      "r2",
      "w1",
      "w2",
      "n1",
      "n2",
    ]);
  });
});

describe("trimToCapacity", () => {
  it("review 10개 + wrongAnswer 10개 + new 10개, capacity=15 -> review 10개 + wrongAnswer 5개(new 0개)", () => {
    const review = Array.from({ length: 10 }, (_, i) =>
      make("review", `r${i}`)
    );
    const wrongAnswer = Array.from({ length: 10 }, (_, i) =>
      make("wrongAnswer", `w${i}`)
    );
    const newItems = Array.from({ length: 10 }, (_, i) =>
      make("new", `n${i}`)
    );

    const sorted = sortByPriority([...review, ...wrongAnswer, ...newItems]);
    const trimmed = trimToCapacity(sorted, 15);

    const counts = { review: 0, wrongAnswer: 0, new: 0 };
    for (const entry of trimmed) {
      counts[entry.tier] += 1;
    }

    expect(trimmed).toHaveLength(15);
    expect(counts).toEqual({ review: 10, wrongAnswer: 5, new: 0 });
  });

  it("capacity가 review 수보다 작으면 review만 잘려서 남고 나머지 티어는 0개다", () => {
    const review = Array.from({ length: 10 }, (_, i) =>
      make("review", `r${i}`)
    );

    const trimmed = trimToCapacity(review, 5);

    const counts = { review: 0, wrongAnswer: 0, new: 0 };
    for (const entry of trimmed) {
      counts[entry.tier] += 1;
    }

    expect(trimmed).toHaveLength(5);
    expect(counts).toEqual({ review: 5, wrongAnswer: 0, new: 0 });
  });

  it("capacity가 전체 개수보다 크거나 같으면 그대로 반환한다", () => {
    const items: PrioritizedItem<string>[] = [
      make("review", "r1"),
      make("wrongAnswer", "w1"),
      make("new", "n1"),
    ];

    expect(trimToCapacity(items, 3)).toEqual(items);
    expect(trimToCapacity(items, 10)).toEqual(items);
  });
});
