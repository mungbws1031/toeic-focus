export type PriorityTier = "review" | "wrongAnswer" | "new";

export interface PrioritizedItem<T> {
  item: T;
  tier: PriorityTier;
}

const TIER_ORDER: Record<PriorityTier, number> = {
  review: 0,
  wrongAnswer: 1,
  new: 2,
};

/**
 * 복습(review) > 오답 카드(wrongAnswer) > 새 학습(new) 순으로 정렬한다.
 * 같은 티어 내에서는 입력 순서를 유지한다(안정 정렬).
 */
export function sortByPriority<T>(
  items: PrioritizedItem<T>[]
): PrioritizedItem<T>[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const tierDiff = TIER_ORDER[a.item.tier] - TIER_ORDER[b.item.tier];
      if (tierDiff !== 0) return tierDiff;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

/**
 * capacity를 초과하면 new부터 잘라내고, 그다음 wrongAnswer, 마지막으로 review를 잘라낸다.
 * review가 가장 마지막까지 보존된다. capacity가 전체 개수보다 크거나 같으면 그대로 반환한다.
 */
export function trimToCapacity<T>(
  sortedItems: PrioritizedItem<T>[],
  capacity: number
): PrioritizedItem<T>[] {
  if (capacity >= sortedItems.length) {
    return sortedItems;
  }
  if (capacity <= 0) {
    return [];
  }

  const counts: Record<PriorityTier, number> = {
    review: sortedItems.filter((i) => i.tier === "review").length,
    wrongAnswer: sortedItems.filter((i) => i.tier === "wrongAnswer").length,
    new: sortedItems.filter((i) => i.tier === "new").length,
  };

  let remaining = capacity;
  const allowed: Record<PriorityTier, number> = {
    review: 0,
    wrongAnswer: 0,
    new: 0,
  };
  for (const tier of ["review", "wrongAnswer", "new"] as PriorityTier[]) {
    const take = Math.min(remaining, counts[tier]);
    allowed[tier] = take;
    remaining -= take;
  }

  const kept: Record<PriorityTier, number> = {
    review: 0,
    wrongAnswer: 0,
    new: 0,
  };
  const result: PrioritizedItem<T>[] = [];
  for (const entry of sortedItems) {
    if (kept[entry.tier] < allowed[entry.tier]) {
      result.push(entry);
      kept[entry.tier] += 1;
    }
  }

  return result;
}
