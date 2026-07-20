import type { Card } from "../db/types";

export interface ComposedSession {
  cards: Card[];
  sessionType: "micro" | "goodnight" | "diagnosis";
  recoveryTriggered: boolean;
  /** 리커버리가 발동했을 때 새 학습을 정지시켜야 하는 일수(미발동이면 0). */
  newLearningLockDays: number;
}
