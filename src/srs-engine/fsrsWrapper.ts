import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card as TsFsrsCard,
  type Grade,
} from "ts-fsrs";
import type { Card as DbCard, CardState } from "../db/types";

/**
 * ts-fsrs의 Card 타입을 그대로 재노출한다 (snake_case 필드: elapsed_days,
 * scheduled_days, last_review, state는 State enum).
 * DB에 저장되는 `Card`(db/types.ts, camelCase + 문자열 state)와는
 * `toFsrsCard`/`fromFsrsCard`로 변환한다.
 */
export type FsrsCard = TsFsrsCard;

/** "가물가물"(unsure)이 카드 상태를 완전히 리셋하지 않도록 죄책감 제로 원칙에 따라
 * Again(완전 리셋) 대신 Hard로 매핑한다. */
const RATING_TO_FSRS: Record<"know" | "unsure", Grade> = {
  know: Rating.Good,
  unsure: Rating.Hard,
};

const STATE_TO_STRING: Record<State, CardState> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

const STRING_TO_STATE: Record<CardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

const scheduler = fsrs();

export function createNewCard(now: Date = new Date()): FsrsCard {
  return createEmptyCard(now);
}

export function review(
  card: FsrsCard,
  rating: "know" | "unsure",
  now: Date = new Date(),
): FsrsCard {
  const grade = RATING_TO_FSRS[rating];
  const { card: nextCard } = scheduler.next(card, now, grade);

  // 설계 스펙 §4.1: "가물가물"이면 간격이 리셋되지 않고 "한 단계만 후퇴"해야 한다.
  // 그런데 ts-fsrs의 Hard는 성공한 복습으로 취급되므로, 며칠 밀린 채 복습한 카드
  // (elapsed_days가 크고 retrievability가 낮은 상태)에서는 새 scheduled_days가
  // 적용 전보다 오히려 커질 수 있다 — "가물가물"을 눌렀는데 다음 복습이 더 멀어지는
  // 역설적인 경험을 막기 위해, 이 경우 적용 전 scheduled_days로 캡한다.
  if (
    rating === "unsure" &&
    nextCard.scheduled_days > card.scheduled_days &&
    card.scheduled_days > 0
  ) {
    const cappedScheduledDays = card.scheduled_days;
    const cappedDue = new Date(now.getTime() + cappedScheduledDays * 24 * 60 * 60 * 1000);
    return {
      ...nextCard,
      scheduled_days: cappedScheduledDays,
      due: cappedDue,
    };
  }

  return nextCard;
}

/** DB에 저장된 `Card`(camelCase, 문자열 state)를 ts-fsrs `FsrsCard`로 변환한다. */
export function toFsrsCard(card: DbCard): FsrsCard {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    state: STRING_TO_STATE[card.state],
    last_review: card.lastReview,
  };
}

/** ts-fsrs `FsrsCard`를 DB에 저장할 `Card`로 변환한다. `id`/`type`/`contentId`처럼
 * FSRS가 모르는 필드는 `base`로 전달받아 그대로 유지한다. */
export function fromFsrsCard(
  fsrsCard: FsrsCard,
  base: Pick<DbCard, "id" | "type" | "contentId">,
): DbCard {
  return {
    ...base,
    due: fsrsCard.due,
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsedDays: fsrsCard.elapsed_days,
    scheduledDays: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: STATE_TO_STRING[fsrsCard.state],
    lastReview: fsrsCard.last_review,
  };
}
