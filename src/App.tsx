import { useCallback, useEffect, useState } from "react";
import { db } from "./db/db";
import type { Card, UserState } from "./db/types";
import {
  createNewCard,
  dailyCap,
  fromFsrsCard,
  review,
  toFsrsCard,
} from "./srs-engine";
import {
  composeDiagnosisSession,
  composeGoodnightSession,
  composeMicroSession,
} from "./session-composer/composeSession";
import type { ComposedSession } from "./session-composer/types";
import { getGrammarPatterns, getSentences, getVocab } from "./content/loadContent";
import type { SentenceItem } from "./content/types";
import { levelFromXp } from "./reward-economy/xp";
import { createRng } from "./reward-economy/rng";
import { openCapsule, type CapsuleRarity } from "./reward-economy/capsule";
import { HomeScreen } from "./ui/screens/HomeScreen";
import { SessionScreen } from "./ui/screens/SessionScreen";
import { PlanetScreen } from "./ui/screens/PlanetScreen";
import { DiagnosisScreen, type DiagnosisResult } from "./ui/screens/DiagnosisScreen";
import {
  OneSentenceDailyScreen,
  type OneSentenceDailyResult,
} from "./ui/screens/OneSentenceDailyScreen";

const USER_STATE_ID = "singleton";
const NEW_CARD_CANDIDATE_LIMIT = 30;
/** 3분짜리 마이크로 세션 1회에 담을 카드 수 목표. "일일 복습 상한"(dailyCap)과는 별개다(설계 스펙 §4.3). */
const SESSION_CARD_TARGET = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CAPSULE_LABELS: Record<CapsuleRarity, string> = {
  common: "일반 캡슐",
  rare: "레어 캡슐",
  epic: "에픽 캡슐",
  legendary: "전설 캡슐",
  cheerCard: "응원 카드",
};

/** 한국어 목적격 조사(을/를)를 마지막 글자 받침 유무에 맞춰 고른다. */
function withObjectParticle(word: string): string {
  const lastChar = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = lastChar >= 0 && lastChar <= 11171 && lastChar % 28 !== 0;
  return `${word}${hasBatchim ? "을" : "를"}`;
}

type Screen = "home" | "session" | "planet" | "sentenceLens";

function defaultUserState(): UserState {
  return { id: USER_STATE_ID, xp: 0, level: 1, diagnosisCompleted: false };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** 1월 1일부터 며칠째인지(0부터 시작)를 구한다. "오늘의 한 문장" 선택 인덱스로 쓴다. */
function dayOfYear(date: Date): number {
  const yearStart = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - yearStart.getTime()) / MS_PER_DAY);
}

/** vocab/grammar 콘텐츠 중 아직 db.cards에 없는 항목을 새 FSRS 카드 후보로 만든다. */
function buildNewCardCandidates(existingCards: Card[]): Card[] {
  const existingContentIds = new Set(existingCards.map((c) => c.contentId));
  const candidates: Card[] = [];

  for (const vocab of getVocab()) {
    if (candidates.length >= NEW_CARD_CANDIDATE_LIMIT) break;
    if (existingContentIds.has(vocab.id)) continue;
    candidates.push(
      fromFsrsCard(createNewCard(), {
        id: `vocab-${vocab.id}`,
        type: "vocab",
        contentId: vocab.id,
      }),
    );
  }

  for (const pattern of getGrammarPatterns()) {
    if (candidates.length >= NEW_CARD_CANDIDATE_LIMIT) break;
    if (existingContentIds.has(pattern.id)) continue;
    candidates.push(
      fromFsrsCard(createNewCard(), {
        id: `grammar-${pattern.id}`,
        type: "grammar",
        contentId: pattern.id,
      }),
    );
  }

  return candidates;
}

/**
 * 오늘 자정 이후 완료된 세션들에서 리뷰한 카드 수 합계를 구한다.
 * sessionType이 'micro'인 로그만 합산한다 — goodnight은 채점 없는 "그냥 넘기기"라
 * cardsReviewed에 totalCards가 그대로 찍혀도 실제로 오늘 리뷰(채점)한 카드가 아니다.
 */
async function countCardsReviewedToday(now: Date): Promise<number> {
  const todayStart = startOfDay(now);
  const sessionsToday = await db.sessionLogs
    .where("startedAt")
    .aboveOrEqual(todayStart)
    .toArray();
  return sessionsToday
    .filter((log) => log.sessionType === "micro")
    .reduce((sum, log) => sum + log.cardsReviewed, 0);
}

/** 오늘 리뷰한 카드 수를 오늘의 dailyCap 대비 비율로 환산한다(0~1). */
async function loadTodayProgress(now: Date): Promise<number> {
  const cardsReviewedToday = await countCardsReviewedToday(now);
  return Math.min(1, cardsReviewedToday / dailyCap("normal"));
}

/** 오늘 자정 이후 리뷰 로그에 남은 카드들(중복 제거)을 db.cards에서 가져온다. "굿나잇 2분"용. */
async function loadTodaysReviewedCards(now: Date): Promise<Card[]> {
  const todayStart = startOfDay(now);
  const logsToday = await db.reviewLogs
    .where("reviewedAt")
    .aboveOrEqual(todayStart)
    .toArray();
  const uniqueCardIds = Array.from(new Set(logsToday.map((log) => log.cardId)));
  const cards = await Promise.all(uniqueCardIds.map((id) => db.cards.get(id)));
  return cards.filter((card): card is Card => card !== undefined);
}

/**
 * 앱 셸 — 3화면(홈/세션/내 행성) 사이를 로컬 state로 전환한다(설계 스펙 §6 "3화면 원칙").
 * react-router는 쓰지 않는다. 진단 세션(sessionType "diagnosis")은 세션 화면 슬롯에서
 * SessionScreen 대신 DiagnosisScreen을 렌더한다.
 */
function App() {
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("home");
  const [userState, setUserState] = useState<UserState | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [todayProgress, setTodayProgress] = useState(0);
  const [session, setSession] = useState<ComposedSession | null>(null);
  const [capsuleRarity, setCapsuleRarity] = useState<CapsuleRarity | null>(
    null,
  );
  const [todaySentence, setTodaySentence] = useState<SentenceItem | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const now = new Date();
      let user = await db.userState.get(USER_STATE_ID);
      if (!user) {
        user = defaultUserState();
        await db.userState.put(user);
      }
      const cards = await db.cards.toArray();
      const progress = await loadTodayProgress(now);

      if (!cancelled) {
        setUserState(user);
        setAllCards(cards);
        setTodayProgress(progress);
        setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = useCallback(async () => {
    if (!userState) return;

    const now = new Date();
    const dueCards = allCards.filter(
      (card) => card.type !== "wrongAnswer" && card.due <= now,
    );
    const wrongAnswerCards = allCards.filter(
      (card) => card.type === "wrongAnswer" && card.due <= now,
    );

    // 버그2: 리커버리 모드의 "새 학습 정지"가 아직 유효하면 새 카드 후보를 아예 만들지 않는다.
    const newLearningLocked =
      !!userState.newLearningLockedUntil &&
      userState.newLearningLockedUntil > now;
    const newCardCandidates = newLearningLocked
      ? []
      : buildNewCardCandidates(allCards);

    // 버그1: "세션 1회 분량"과 "하루 전체 상한"을 분리한다. 오늘 이미 리뷰한 만큼
    // 하루 상한에서 차감하고, 그래도 남는 여유분 안에서만 이번 세션 목표치를 채운다.
    const todayReviewedCount = await countCardsReviewedToday(now);
    const capacity = Math.min(
      SESSION_CARD_TARGET,
      Math.max(0, dailyCap("normal") - todayReviewedCount),
    );

    const composed = composeMicroSession({
      dueCards,
      wrongAnswerCards,
      newCardCandidates,
      lastActiveDate: userState.lastActiveDate ?? now,
      now,
      capacity,
    });

    const newlyAddedCards = composed.cards.filter((card) =>
      newCardCandidates.some((candidate) => candidate.id === card.id),
    );
    if (newlyAddedCards.length > 0) {
      await db.cards.bulkAdd(newlyAddedCards);
      setAllCards((prev) => [...prev, ...newlyAddedCards]);
    }

    // 리커버리가 새로 발동했고 아직 락이 걸려있지 않다면(또는 이미 만료됐다면) 락을 새로 건다.
    // 이미 유효한 락이 걸려있으면 반복 트리거로 갱신하지 않는다.
    if (composed.recoveryTriggered && composed.newLearningLockDays > 0) {
      const alreadyLocked =
        !!userState.newLearningLockedUntil &&
        userState.newLearningLockedUntil > now;
      if (!alreadyLocked) {
        const nextUserState: UserState = {
          ...userState,
          newLearningLockedUntil: new Date(
            now.getTime() + composed.newLearningLockDays * MS_PER_DAY,
          ),
        };
        await db.userState.put(nextUserState);
        setUserState(nextUserState);
      }
    }

    setSession(composed);
    setScreen("session");
  }, [allCards, userState]);

  const handleStartDiagnosis = useCallback(() => {
    setSession(composeDiagnosisSession());
    setScreen("session");
  }, []);

  /** "굿나잇 2분" — 오늘 리뷰한 카드들을 채점 없이 다시 훑는 마무리 세션(설계 스펙 §3.x). */
  const handleStartGoodnight = useCallback(async () => {
    const now = new Date();
    const todaysReviewedCards = await loadTodaysReviewedCards(now);
    setSession(composeGoodnightSession(todaysReviewedCards));
    setScreen("session");
  }, []);

  /** "오늘의 한 문장" — 날짜 기반으로 오늘의 문장을 결정적으로 고른다. */
  const handleStartSentenceLens = useCallback(() => {
    const sentences = getSentences();
    if (sentences.length === 0) return;
    const sentence = sentences[dayOfYear(new Date()) % sentences.length];
    setTodaySentence(sentence);
    setScreen("sentenceLens");
  }, []);

  const handleSessionComplete = useCallback(
    async (summary: {
      xpEarned: number;
      cardsReviewed: number;
      cardRatings: { cardId: string; rating: "know" | "unsure" }[];
    }) => {
      const now = new Date();
      // session은 SessionScreen이 열려 있는 동안만 완료 콜백이 오므로 실질적으로 항상 채워져
      // 있지만, 타입상 null 가능성에 대비해 'micro'로 안전하게 폴백한다.
      const sessionType = session?.sessionType ?? "micro";
      const isGoodnight = sessionType === "goodnight";
      const isMicro = sessionType === "micro";

      for (const { cardId, rating } of summary.cardRatings) {
        const dbCard = await db.cards.get(cardId);
        if (!dbCard) continue;
        const nextFsrsCard = review(toFsrsCard(dbCard), rating, now);
        const updatedCard = fromFsrsCard(nextFsrsCard, dbCard);
        await db.cards.put(updatedCard);
        await db.reviewLogs.add({ cardId, rating, reviewedAt: now });
      }

      const base = userState ?? defaultUserState();
      const nextXp = base.xp + summary.xpEarned;
      const nextUserState: UserState = {
        ...base,
        xp: nextXp,
        level: levelFromXp(nextXp),
        lastActiveDate: now,
      };
      await db.userState.put(nextUserState);
      await db.sessionLogs.add({
        startedAt: now,
        completedAt: now,
        cardsReviewed: summary.cardsReviewed,
        xpEarned: summary.xpEarned,
        sessionType,
      });

      // 굿나잇은 "채점 없는 마무리"라 도파민 보상(캡슐) 대상이 아니다.
      // cardsReviewed > 0만으로는 goodnight도 캡슐이 열려버리므로 sessionType까지 확인한다.
      if (isMicro && summary.cardsReviewed > 0) {
        const rng = createRng(Date.now());
        setCapsuleRarity(openCapsule(rng));
      }

      const [freshCards, progress] = await Promise.all([
        db.cards.toArray(),
        loadTodayProgress(now),
      ]);

      setUserState(nextUserState);
      setAllCards(freshCards);
      setTodayProgress(progress);
      setSession(null);
      // planet 화면 전환은 micro 세션 전용. 굿나잇은 바로 홈으로 돌아간다.
      setScreen(isGoodnight ? "home" : "planet");
    },
    [session, userState],
  );

  const handleSentenceLensComplete = useCallback(
    async (result: OneSentenceDailyResult) => {
      if (result.sentenceCardTrigger) {
        const contentId = result.sentenceCardTrigger.sentenceContentId;
        const cardId = `sentence-${contentId}`;
        const existing = await db.cards.get(cardId);
        if (!existing) {
          const newCard = fromFsrsCard(createNewCard(), {
            id: cardId,
            type: "sentence",
            contentId,
          });
          await db.cards.add(newCard);
          setAllCards((prev) => [...prev, newCard]);
        }
      }
      setTodaySentence(null);
      setScreen("home");
    },
    [],
  );

  const handleDiagnosisComplete = useCallback(
    async (result: DiagnosisResult) => {
      const base = userState ?? defaultUserState();
      const nextUserState: UserState = {
        ...base,
        diagnosisCompleted: true,
        estimatedScore: result.estimatedScore,
        weakerArea: result.weakerArea,
        lastActiveDate: base.lastActiveDate ?? new Date(),
      };
      await db.userState.put(nextUserState);
      setUserState(nextUserState);
      setSession(null);
      setScreen("home");
    },
    [userState],
  );

  if (loading || !userState) {
    return null;
  }

  return (
    <>
      {screen === "home" && (
        <HomeScreen
          onStart={handleStart}
          todayProgress={todayProgress}
          diagnosisCompleted={userState.diagnosisCompleted ?? false}
          onStartDiagnosis={handleStartDiagnosis}
          onStartGoodnight={handleStartGoodnight}
          onStartSentenceLens={handleStartSentenceLens}
        />
      )}

      {screen === "sentenceLens" && todaySentence && (
        <OneSentenceDailyScreen
          sentence={todaySentence}
          onComplete={handleSentenceLensComplete}
        />
      )}

      {screen === "session" &&
        session &&
        (session.sessionType === "diagnosis" ? (
          <DiagnosisScreen onComplete={handleDiagnosisComplete} />
        ) : (
          <SessionScreen
            session={session}
            onSessionComplete={handleSessionComplete}
          />
        ))}

      {screen === "planet" && (
        <div style={{ position: "relative", height: "100dvh" }}>
          <PlanetScreen
            xpState={{ totalXp: userState.xp, combo: 0 }}
            todayProgress={todayProgress}
          />
          <button
            type="button"
            onClick={() => setScreen("home")}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              fontSize: 14,
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            홈으로
          </button>
          {capsuleRarity && (
            <div
              role="dialog"
              aria-label="보상 캡슐"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                background: "rgba(0, 0, 0, 0.55)",
                color: "#fff",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {withObjectParticle(CAPSULE_LABELS[capsuleRarity])} 획득했어요!
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setCapsuleRarity(null)}
                  style={{
                    fontSize: 14,
                    padding: "8px 20px",
                    borderRadius: 999,
                    border: "none",
                    background: "#4f46e5",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  닫기
                </button>
                {todayProgress < 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCapsuleRarity(null);
                      void handleStart();
                    }}
                    style={{
                      fontSize: 14,
                      padding: "8px 20px",
                      borderRadius: 999,
                      border: "1px solid #fff",
                      background: "transparent",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    조금 더 할까요?
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default App;
