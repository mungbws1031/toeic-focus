/**
 * 원 센텐스 데일리 — 매일 토익 실전 문장 1개를 90초 안에 청크 리딩으로 통과하는
 * 마이크로 루틴. 통과 기준(제한 시간 내 완료 + 정답률 80% 이상)을 채점하고,
 * 통과하지 못하면 SRS 복습 큐에 편입할 문장 카드 생성 신호를 반환한다.
 * 실제 카드 저장은 이 모듈의 책임이 아니며, 신호만 반환한다.
 */

import type { ChunkReadingState } from "./chunkReading";

export const PASSING_ACCURACY_RATIO = 0.8;

export type SentenceCardTriggerReason = "timeout" | "lowAccuracy";

export interface SentenceCardTrigger {
  sentenceContentId: string;
  reason: SentenceCardTriggerReason;
}

export interface OneSentenceDailyResult {
  chunkState: ChunkReadingState;
  timedOut: boolean;
  passed: boolean;
  shouldCreateSentenceCard: boolean;
}

export function evaluateOneSentenceDaily(
  chunkState: ChunkReadingState,
  elapsedSeconds: number,
  timeLimitSeconds: number = 90,
): OneSentenceDailyResult {
  const timedOut = elapsedSeconds > timeLimitSeconds;
  const totalChunks = chunkState.chunks.length;
  const accuracyRatio =
    totalChunks === 0 ? 1 : chunkState.correctCount / totalChunks;

  const passed =
    chunkState.completed && !timedOut && accuracyRatio >= PASSING_ACCURACY_RATIO;

  return {
    chunkState,
    timedOut,
    passed,
    shouldCreateSentenceCard: !passed,
  };
}

/**
 * evaluateOneSentenceDaily의 결과와 문장 콘텐츠 ID로부터 문장 카드 생성 신호를
 * 만든다. shouldCreateSentenceCard가 false면 null을 반환한다.
 */
export function buildSentenceCardTrigger(
  result: OneSentenceDailyResult,
  sentenceContentId: string,
): SentenceCardTrigger | null {
  if (!result.shouldCreateSentenceCard) {
    return null;
  }

  const reason: SentenceCardTriggerReason = result.timedOut
    ? "timeout"
    : "lowAccuracy";

  return { sentenceContentId, reason };
}
