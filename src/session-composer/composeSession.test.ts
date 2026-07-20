import { describe, it, expect } from "vitest";
import type { Card, CardType } from "../db/types";
import { dailyCap } from "../srs-engine";
import {
  composeMicroSession,
  composeGoodnightSession,
  composeDiagnosisSession,
} from "./composeSession";

function makeCard(id: string, type: CardType = "vocab"): Card {
  return {
    id,
    type,
    contentId: id,
    due: new Date(2026, 0, 1),
    stability: 1,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: "new",
  };
}

function makeCards(prefix: string, count: number, type: CardType = "vocab"): Card[] {
  return Array.from({ length: count }, (_, i) => makeCard(`${prefix}${i}`, type));
}

describe("composeMicroSession", () => {
  it("4일 이상 공백이면 리커버리 모드가 발동해 new 티어 카드가 전혀 없다", () => {
    const session = composeMicroSession({
      dueCards: makeCards("due", 5),
      wrongAnswerCards: makeCards("wrong", 2, "wrongAnswer"),
      newCardCandidates: makeCards("new", 5),
      lastActiveDate: new Date(2026, 0, 1),
      now: new Date(2026, 0, 5),
      capacity: dailyCap("normal"),
    });

    expect(session.recoveryTriggered).toBe(true);
    expect(session.newLearningLockDays).toBeGreaterThan(0);
    expect(session.cards.some((card) => card.id.startsWith("new"))).toBe(false);
  });

  it("공백이 짧으면(리커버리 미발동) capacity 여유가 있을 때 new 카드가 포함될 수 있다", () => {
    const session = composeMicroSession({
      dueCards: makeCards("due", 2),
      wrongAnswerCards: makeCards("wrong", 1, "wrongAnswer"),
      newCardCandidates: makeCards("new", 3),
      lastActiveDate: new Date(2026, 0, 1),
      now: new Date(2026, 0, 2),
      capacity: dailyCap("high"),
    });

    expect(session.recoveryTriggered).toBe(false);
    expect(session.newLearningLockDays).toBe(0);
    expect(session.cards.some((card) => card.id.startsWith("new"))).toBe(true);
  });

  it("결과 카드 수는 호출자가 넘긴 capacity를 초과하지 않는다", () => {
    const capacity = dailyCap("low");
    const session = composeMicroSession({
      dueCards: makeCards("due", 100),
      wrongAnswerCards: makeCards("wrong", 50, "wrongAnswer"),
      newCardCandidates: makeCards("new", 50),
      lastActiveDate: new Date(2026, 0, 1),
      now: new Date(2026, 0, 2),
      capacity,
    });

    expect(session.cards.length).toBeLessThanOrEqual(capacity);
  });

  it("세션 1회 분량은 마이크로 세션에 맞는 작은 capacity로 제한될 수 있다(일일 상한과 분리)", () => {
    const SESSION_CARD_TARGET = 8;
    const session = composeMicroSession({
      dueCards: makeCards("due", 30),
      wrongAnswerCards: [],
      newCardCandidates: [],
      lastActiveDate: new Date(2026, 0, 1),
      now: new Date(2026, 0, 1),
      capacity: SESSION_CARD_TARGET,
    });

    expect(session.cards.length).toBe(SESSION_CARD_TARGET);
  });

  it("오늘 이미 일일 상한만큼 리뷰했다면(capacity 0) 카드가 하나도 나오지 않는다", () => {
    const session = composeMicroSession({
      dueCards: makeCards("due", 10),
      wrongAnswerCards: makeCards("wrong", 3, "wrongAnswer"),
      newCardCandidates: makeCards("new", 3),
      lastActiveDate: new Date(2026, 0, 1),
      now: new Date(2026, 0, 1),
      capacity: 0,
    });

    expect(session.cards).toHaveLength(0);
  });

  it("리커버리 미발동 & overdue 카드가 많을 때 redistributeDebt로 분산되어 한 세션에 전부 몰리지 않는다", () => {
    const now = new Date(2026, 0, 5);
    const overdueCards = makeCards("due", 20).map((card) => ({
      ...card,
      due: new Date(2026, 0, 1), // now보다 나흘 전 = overdue, 하지만 lastActiveDate와의 공백은 0이라 리커버리는 미발동
    }));

    const session = composeMicroSession({
      dueCards: overdueCards,
      wrongAnswerCards: [],
      newCardCandidates: [],
      lastActiveDate: now,
      now,
      capacity: 100,
    });

    expect(session.recoveryTriggered).toBe(false);
    // REDISTRIBUTION_WEIGHTS[0] = 0.35 → 20장 중 오늘 몫은 7장뿐이어야 한다.
    expect(session.cards.length).toBe(7);
    expect(session.cards.length).toBeLessThan(overdueCards.length);
  });
});

describe("composeGoodnightSession", () => {
  it("입력이 8개보다 많으면 최대 8개만 반환한다", () => {
    const session = composeGoodnightSession(makeCards("r", 12));

    expect(session.sessionType).toBe("goodnight");
    expect(session.cards).toHaveLength(8);
  });

  it("입력이 8개 미만이면 있는 만큼만 반환한다", () => {
    const session = composeGoodnightSession(makeCards("r", 3));

    expect(session.cards).toHaveLength(3);
  });
});

describe("composeDiagnosisSession", () => {
  it("sessionType이 diagnosis이고 어휘 6개 + 문법 6개 = 12개를 반환한다", () => {
    const session = composeDiagnosisSession();

    expect(session.sessionType).toBe("diagnosis");
    expect(session.cards).toHaveLength(12);
  });
});
