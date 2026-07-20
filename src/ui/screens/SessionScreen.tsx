import { useEffect, useMemo, useRef, useState } from "react";
import { ProgressRing } from "../components/ProgressRing";
import { CardReviewer } from "../components/CardReviewer";
import { getGrammarPatterns, getVocab } from "../../content/loadContent";
import type { GrammarExample, VocabItem } from "../../content/types";
import { initXpState, recordAnswer } from "../../reward-economy/xp";
import type { Card } from "../../db/types";
import type { ComposedSession } from "../../session-composer/types";

export interface SessionScreenProps {
  session: ComposedSession;
  /** 세션의 모든 카드를 다 넘기면 누적 XP와 학습한 카드 수, 카드별 채점 결과와 함께 호출된다. */
  onSessionComplete: (summary: {
    xpEarned: number;
    cardsReviewed: number;
    cardRatings: { cardId: string; rating: "know" | "unsure" }[];
  }) => void;
}

/**
 * db `Card`(SRS 스케줄 정보만 가짐)를 CardReviewer가 그릴 수 있는 콘텐츠로 변환한다.
 * grammar 타입은 GrammarPattern의 예문 중 하나를 쓰고, 그 외(vocab 포함)는 vocab 콘텐츠에서 찾는다.
 * 아직 전용 카드 뷰가 없는 sentence/listening/wrongAnswer 등은 최소 폴백을 반환한다.
 */
function resolveCardContent(card: Card): VocabItem | GrammarExample {
  if (card.type === "grammar") {
    const pattern = getGrammarPatterns().find((p) => p.id === card.contentId);
    if (pattern && pattern.examples.length > 0) {
      // 패턴당 예문이 여러 개(grammar.json 기준 3개)라도 항상 examples[0]만 쓰면
      // 나머지 예문이 SRS 복습에서 영구히 도달 불가능해진다. card.reps(FSRS 복습
      // 횟수)를 예문 개수로 나눈 나머지를 인덱스로 써서, 복습할 때마다(reps가
      // 늘어날 때마다) 결정적으로 다른 예문이 노출되도록 로테이션한다.
      const exampleIndex = card.reps % pattern.examples.length;
      return pattern.examples[exampleIndex];
    }
  }

  const vocab = getVocab().find((v) => v.id === card.contentId);
  if (vocab) return vocab;

  return {
    id: card.contentId,
    word: card.contentId,
    meaning: "",
    partOfSpeech: "",
    example: "",
    exampleMeaning: "",
    difficulty: 1,
  };
}

/**
 * 세션 화면 = 상단 원형 게이지(진행률) + 카드 하나. 알림/탭바 없는 풀스크린.
 * (설계 스펙 §3.4 "타임 비전", §6 "3화면 원칙")
 */
export function SessionScreen({
  session,
  onSessionComplete,
}: SessionScreenProps) {
  const { cards, sessionType } = session;
  const totalCards = cards.length;
  const [index, setIndex] = useState(0);
  const [xpState, setXpState] = useState(initXpState);
  const hasFinishedEmptySession = useRef(false);
  const cardRatingsRef = useRef<{ cardId: string; rating: "know" | "unsure" }[]>(
    [],
  );

  useEffect(() => {
    if (totalCards === 0 && !hasFinishedEmptySession.current) {
      hasFinishedEmptySession.current = true;
      onSessionComplete({ xpEarned: 0, cardsReviewed: 0, cardRatings: [] });
    }
  }, [totalCards, onSessionComplete]);

  const currentCard = cards[index];
  const content = useMemo(
    () => (currentCard ? resolveCardContent(currentCard) : null),
    [currentCard],
  );

  if (!currentCard || !content) {
    return null;
  }

  function goToNextOrComplete(xpEarned: number) {
    const nextIndex = index + 1;
    if (nextIndex >= totalCards) {
      onSessionComplete({
        xpEarned,
        cardsReviewed: totalCards,
        cardRatings: cardRatingsRef.current,
      });
    } else {
      setIndex(nextIndex);
    }
  }

  function handleRate(rating: "know" | "unsure") {
    const { nextState } = recordAnswer(xpState, rating === "know");
    setXpState(nextState);
    cardRatingsRef.current = [
      ...cardRatingsRef.current,
      { cardId: currentCard.id, rating },
    ];
    goToNextOrComplete(nextState.totalXp);
  }

  function handleNext() {
    goToNextOrComplete(xpState.totalXp);
  }

  const isGoodnight = sessionType === "goodnight";

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        overflow: "hidden",
      }}
    >
      <ProgressRing progress={index / totalCards} size={100} />
      <CardReviewer
        card={content}
        mode={isGoodnight ? "goodnight" : "review"}
        onRate={isGoodnight ? undefined : handleRate}
        onNext={isGoodnight ? handleNext : undefined}
      />
    </div>
  );
}
