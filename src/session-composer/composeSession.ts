import type { Card } from "../db/types";
import {
  createNewCard,
  fromFsrsCard,
  evaluateRecovery,
  redistributeDebt,
  sortByPriority,
  trimToCapacity,
  type PrioritizedItem,
} from "../srs-engine";
import { getVocab, getGrammarPatterns } from "../content/loadContent";
import type { ComposedSession } from "./types";

export interface ComposeMicroSessionParams {
  dueCards: Card[];
  wrongAnswerCards: Card[];
  newCardCandidates: Card[];
  lastActiveDate: Date;
  now: Date;
  /** 이번 세션 1회에 담을 카드 수 상한. 호출자가 "하루 전체 상한 - 오늘 이미 리뷰한 수"를 계산해 넘긴다. */
  capacity: number;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function composeMicroSession(
  params: ComposeMicroSessionParams
): ComposedSession {
  const {
    dueCards,
    wrongAnswerCards,
    newCardCandidates,
    lastActiveDate,
    now,
    capacity,
  } = params;

  const recoveryPlan = evaluateRecovery(lastActiveDate, now, dueCards);

  let reviewCards: Card[];
  if (recoveryPlan.triggered) {
    reviewCards = recoveryPlan.compressedReview;
  } else {
    // 설계 스펙 §4.3 — 이미 지난(overdue) 카드는 오늘 하루에 몰아넣지 않고
    // redistributeDebt로 5일에 걸쳐 지수 가중 분산한 뒤 오늘(0번 버킷) 몫만 쓴다.
    const todayStart = startOfDay(now);
    const overdueCards = dueCards.filter((card) => card.due < todayStart);
    const dueTodayCards = dueCards.filter((card) => card.due >= todayStart);

    if (overdueCards.length > 0) {
      const [todayBucket] = redistributeDebt(overdueCards);
      reviewCards = [...dueTodayCards, ...todayBucket];
    } else {
      reviewCards = dueCards;
    }
  }
  const newCards = recoveryPlan.triggered ? [] : newCardCandidates;

  const items: PrioritizedItem<Card>[] = [
    ...reviewCards.map((card) => ({ item: card, tier: "review" as const })),
    ...wrongAnswerCards.map((card) => ({
      item: card,
      tier: "wrongAnswer" as const,
    })),
    ...newCards.map((card) => ({ item: card, tier: "new" as const })),
  ];

  const sorted = sortByPriority(items);
  const trimmed = trimToCapacity(sorted, capacity);

  return {
    cards: trimmed.map((entry) => entry.item),
    sessionType: "micro",
    recoveryTriggered: recoveryPlan.triggered,
    newLearningLockDays: recoveryPlan.newLearningLockDays,
  };
}

export function composeGoodnightSession(
  todaysReviewedCards: Card[]
): ComposedSession {
  return {
    cards: todaysReviewedCards.slice(0, 8),
    sessionType: "goodnight",
    recoveryTriggered: false,
    newLearningLockDays: 0,
  };
}

/** 진단 세션용으로 콘텐츠를 감싸는 임시 카드를 만든다. FSRS 상태는 새 카드 기본값이다. */
function makeDiagnosisCard(type: Card["type"], contentId: string): Card {
  const fsrsCard = createNewCard();
  return fromFsrsCard(fsrsCard, { id: `diagnosis-${contentId}`, type, contentId });
}

export function composeDiagnosisSession(): ComposedSession {
  const vocabCards = getVocab()
    .slice(0, 6)
    .map((vocab) => makeDiagnosisCard("vocab", vocab.id));

  const grammarCards = getGrammarPatterns()
    .slice(0, 6)
    .map((pattern) => makeDiagnosisCard("grammar", pattern.id));

  return {
    cards: [...vocabCards, ...grammarCards],
    sessionType: "diagnosis",
    recoveryTriggered: false,
    newLearningLockDays: 0,
  };
}
