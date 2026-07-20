import { describe, it, expect } from "vitest";
import { State, Rating, fsrs } from "ts-fsrs";
import {
  createNewCard,
  review,
  toFsrsCard,
  fromFsrsCard,
  type FsrsCard,
} from "./fsrsWrapper";
import type { Card as DbCard } from "../db/types";

describe("createNewCard", () => {
  it("새 카드는 state='New', stability/difficulty/reps/lapses가 모두 초기값이다", () => {
    const card = createNewCard(new Date(2026, 0, 1));

    expect(card.state).toBe(State.New);
    expect(card.stability).toBe(0);
    expect(card.difficulty).toBe(0);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.last_review).toBeUndefined();
  });
});

describe("review — know를 반복하면 복습 간격이 점점 늘어난다", () => {
  it("연속으로 know를 선택하면 stability와 scheduled_days가 단조 증가한다", () => {
    let now = new Date(2026, 0, 1);
    let card = createNewCard(now);

    const scheduledDaysHistory: number[] = [];
    const stabilityHistory: number[] = [];

    for (let i = 0; i < 4; i++) {
      now = new Date(card.due);
      card = review(card, "know", now);
      scheduledDaysHistory.push(card.scheduled_days);
      stabilityHistory.push(card.stability);
    }

    for (let i = 1; i < scheduledDaysHistory.length; i++) {
      expect(scheduledDaysHistory[i]).toBeGreaterThan(scheduledDaysHistory[i - 1]);
      expect(stabilityHistory[i]).toBeGreaterThan(stabilityHistory[i - 1]);
    }
  });
});

describe("review — unsure를 연속 적용해도 완전히 리셋되지 않는다 (죄책감 제로 원칙)", () => {
  it("같은 세션에서 즉시 재복습으로 unsure를 반복해도 stability는 완만하게만 줄어들 뿐 최소값으로 붕괴하지 않고, 학습 이력(reps)은 계속 쌓인다", () => {
    let now = new Date(2026, 0, 1);
    let card = createNewCard(now);

    const stabilityHistory: number[] = [card.stability];
    for (let i = 0; i < 4; i++) {
      now = new Date(now.getTime() + 5 * 60 * 1000); // 같은 세션, 5분 뒤 재복습
      card = review(card, "unsure", now);
      stabilityHistory.push(card.stability);
    }

    // 첫 unsure 이후에도 stability는 0으로 리셋되지 않는다
    expect(stabilityHistory[1]).toBeGreaterThan(0);

    // 반복되는 unsure는 완만하게 감소하되, 직전 값의 절반 아래로 급락하지는 않는다
    for (let i = 2; i < stabilityHistory.length; i++) {
      expect(stabilityHistory[i]).toBeLessThan(stabilityHistory[i - 1]);
      expect(stabilityHistory[i]).toBeGreaterThan(stabilityHistory[i - 1] * 0.5);
    }

    // lapses(완전 망각 횟수)는 전혀 증가하지 않는다 — "unsure"는 망각으로 취급되지 않는다
    expect(card.lapses).toBe(0);
    // reps(복습 횟수)는 계속 누적된다 — 학습 이력이 사라지지 않는다
    expect(card.reps).toBe(4);
  });

  it("unsure(Hard 매핑)는 완전 리셋을 의미하는 Again보다 훨씬 덜 가혹하다", () => {
    // review()가 내부적으로 사용하는 것과 동일한 fsrs() 인스턴스(기본 파라미터, 시드 없음)로
    // 같은 카드 상태에서 Hard와 Again의 결과를 직접 비교해 "완전 리셋이 아님"을 검증한다.
    const scheduler = fsrs();

    let now = new Date(2026, 0, 1);
    let card = createNewCard(now);
    card = review(card, "know", now);
    now = new Date(now.getTime() + 5 * 60 * 1000);
    card = review(card, "know", now);

    now = new Date(now.getTime() + 5 * 60 * 1000);
    const { card: afterUnsure } = scheduler.next(card, now, Rating.Hard);
    const { card: afterAgain } = scheduler.next(card, now, Rating.Again);

    // Again은 lapse를 기록하고 Relearning 상태로 후퇴시키지만, unsure(Hard)는 그렇지 않다
    expect(afterAgain.lapses).toBe(1);
    expect(afterAgain.state).toBe(State.Relearning);
    expect(afterUnsure.lapses).toBe(0);
    expect(afterUnsure.state).not.toBe(State.Relearning);

    // 같은 카드에서 출발했을 때, unsure의 stability는 완전 리셋(Again)보다 훨씬 높게 유지된다
    expect(afterUnsure.stability).toBeGreaterThan(afterAgain.stability);
  });
});

describe("review — 지연된 정기 복습에서 unsure는 이전 간격보다 길어지지 않는다 (설계 스펙 §4.1 '한 단계 후퇴')", () => {
  it("scheduled_days가 30이었던 카드를 35일 뒤(5일 지연) unsure로 채점하면 새 scheduled_days는 30을 넘지 않는다", () => {
    const lastReview = new Date(2026, 0, 1);
    const due = new Date(2026, 0, 31); // last_review + 30일
    const card: FsrsCard = {
      due,
      stability: 25,
      difficulty: 5,
      elapsed_days: 30,
      scheduled_days: 30,
      reps: 5,
      lapses: 0,
      state: State.Review,
      last_review: lastReview,
    };
    const lateNow = new Date(due.getTime() + 5 * 24 * 60 * 60 * 1000); // 정기 복습일보다 5일 늦게 채점

    // 먼저 ts-fsrs를 캡 없이 직접 호출하면 이 시나리오에서 scheduled_days가
    // 오히려 이전(30)보다 커진다는 것을 확인해, 이 테스트가 실제로 캡 로직을
    // 검증하고 있음을 보장한다.
    const scheduler = fsrs();
    const { card: rawNextCard } = scheduler.next(card, lateNow, Rating.Hard);
    expect(rawNextCard.scheduled_days).toBeGreaterThan(card.scheduled_days);

    const afterLateUnsure = review(card, "unsure", lateNow);
    expect(afterLateUnsure.scheduled_days).toBeLessThanOrEqual(
      card.scheduled_days,
    );
  });
});

describe("toFsrsCard / fromFsrsCard 어댑터", () => {
  it("DB Card(camelCase, 문자열 state) <-> FsrsCard(snake_case, State enum) 왕복 변환이 값을 보존한다", () => {
    const now = new Date(2026, 0, 1);
    const dbCard: DbCard = {
      id: "card-1",
      type: "vocab",
      contentId: "content-1",
      due: now,
      stability: 3.173,
      difficulty: 5.28,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 1,
      lapses: 0,
      state: "learning",
      lastReview: now,
    };

    const fsrsCard: FsrsCard = toFsrsCard(dbCard);
    expect(fsrsCard.state).toBe(State.Learning);
    expect(fsrsCard.elapsed_days).toBe(dbCard.elapsedDays);
    expect(fsrsCard.scheduled_days).toBe(dbCard.scheduledDays);
    expect(fsrsCard.last_review).toBe(dbCard.lastReview);

    const roundTripped = fromFsrsCard(fsrsCard, {
      id: dbCard.id,
      type: dbCard.type,
      contentId: dbCard.contentId,
    });
    expect(roundTripped).toEqual(dbCard);
  });
});
