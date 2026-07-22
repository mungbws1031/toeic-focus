import { useRef, useState } from "react";
import { ChunkReader } from "../components/ChunkReader";
import type { SentenceItem } from "../../content/types";
import type { ChunkReadingState } from "../../reading-engine/chunkReading";
import {
  buildSentenceCardTrigger,
  evaluateOneSentenceDaily,
  type SentenceCardTrigger,
} from "../../reading-engine/oneSentenceDaily";

export interface OneSentenceDailyResult {
  passed: boolean;
  sentenceCardTrigger: SentenceCardTrigger | null;
}

interface PendingResult extends OneSentenceDailyResult {
  correctCount: number;
  totalChunks: number;
}

export interface OneSentenceDailyScreenProps {
  sentence: SentenceItem;
  onComplete: (result: OneSentenceDailyResult) => void;
}

/**
 * 원 센텐스 데일리 — 문장 렌즈 §3.11의 청크 리딩(ChunkReader)을 감싸서
 * 제한 시간·정답률 채점(evaluateOneSentenceDaily)까지 마친 뒤 결과를 부모에 알린다.
 * 통과 여부와 무관하게 채점 로직은 이 화면의 책임이 아니라 reading-engine이 담당한다.
 */
export function OneSentenceDailyScreen({
  sentence,
  onComplete,
}: OneSentenceDailyScreenProps) {
  const startedAtRef = useRef(Date.now());
  const [result, setResult] = useState<PendingResult | null>(null);

  function handleChunkComplete({
    correctCount,
    totalChunks,
  }: {
    correctCount: number;
    totalChunks: number;
  }) {
    const elapsedSeconds = (Date.now() - startedAtRef.current) / 1000;
    const chunkState: ChunkReadingState = {
      chunks: sentence.chunks,
      currentIndex: totalChunks,
      correctCount,
      completed: true,
    };
    const evaluation = evaluateOneSentenceDaily(chunkState, elapsedSeconds);
    const sentenceCardTrigger = buildSentenceCardTrigger(
      evaluation,
      sentence.id,
    );
    setResult({
      passed: evaluation.passed,
      sentenceCardTrigger,
      correctCount,
      totalChunks,
    });
  }

  function handleConfirm() {
    if (!result) return;
    onComplete({
      passed: result.passed,
      sentenceCardTrigger: result.sentenceCardTrigger,
    });
  }

  if (result) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          overflow: "hidden",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700 }}>
          {result.passed ? "오늘 문장 완료!" : "오늘 문장 도전 완료"}
        </div>
        <div style={{ fontSize: 16, color: "#6b7280" }}>
          {result.correctCount} / {result.totalChunks} 청크 정답
        </div>
        {!result.passed && (
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            이 문장은 복습 카드로 저장해서 다시 만날 수 있게 할게요
          </div>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          style={{
            fontSize: 16,
            fontWeight: 600,
            padding: "14px 32px",
            borderRadius: 999,
            border: "none",
            background: "#4f46e5",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          확인
        </button>
      </div>
    );
  }

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
      <ChunkReader sentence={sentence} onComplete={handleChunkComplete} />
    </div>
  );
}
