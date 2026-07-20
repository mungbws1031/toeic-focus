export type CardType =
  | "vocab"
  | "grammar"
  | "sentence"
  | "listening"
  | "wrongAnswer";

export type CardState = "new" | "learning" | "review" | "relearning";

export interface Card {
  id: string;
  type: CardType;
  contentId: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview?: Date;
}

export type Rating = "know" | "unsure";

export interface ReviewLog {
  id?: number;
  cardId: string;
  rating: Rating;
  reviewedAt: Date;
}

export interface SessionLog {
  id?: number;
  startedAt: Date;
  completedAt?: Date;
  cardsReviewed: number;
  xpEarned: number;
  /** 세션 종류. "오늘 채점한 카드 수" 집계(countCardsReviewedToday)는 'micro'만 합산한다 —
   * goodnight은 채점 없는 훑기, diagnosis는 별도 흐름이라 둘 다 실제 리뷰로 치지 않는다. */
  sessionType: "micro" | "goodnight" | "diagnosis";
}

export interface UserState {
  id: string;
  xp: number;
  level: number;
  lastActiveDate?: Date;
  /** 실력 진단(미니모의) 완료 여부. App 셸이 홈 화면의 진단 유도 버튼 노출 여부를 결정하는 데 쓴다. */
  diagnosisCompleted?: boolean;
  /** 진단 결과로 산출된 추정 토익 점수(200~800). */
  estimatedScore?: number;
  /** 진단 결과로 산출된 약한 파트. */
  weakerArea?: "vocab" | "grammar" | "balanced";
  /** 리커버리 모드가 발동했을 때 설정되는 "새 학습 정지" 해제 시각. 이 시각 이전에는 새 카드를 섞지 않는다. */
  newLearningLockedUntil?: Date;
}
