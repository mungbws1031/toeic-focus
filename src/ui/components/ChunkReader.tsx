import { useEffect, useMemo, useRef, useState } from "react";
import type { SentenceItem } from "../../content/types";
import {
  answerCurrentChunk,
  buildTwoChoiceOptions,
  startChunkReading,
  type ChunkReadingState,
} from "../../reading-engine/chunkReading";

export interface ChunkReaderProps {
  sentence: SentenceItem;
  onComplete: (result: { correctCount: number; totalChunks: number }) => void;
}

const FALLBACK_DISTRACTOR = "(다른 뜻)";

/** 현재 청크의 오답 보기로 쓸 다른 청크의 뜻을 하나 고른다. 청크가 하나뿐이면 고정 문구를 쓴다. */
function pickDistractor(
  state: ChunkReadingState,
  currentIndex: number,
): string {
  const others = state.chunks.filter((_, i) => i !== currentIndex);
  if (others.length === 0) return FALLBACK_DISTRACTOR;
  return others[currentIndex % others.length].meaning;
}

/**
 * 문장을 청크 단위로 하나씩 넘기며 뜻을 2지선다로 고르는 리더.
 * 뒤로 돌아가는 회귀가 불가능하도록 chunkReading 모듈의 진행 방향 상태만 사용한다.
 */
export function ChunkReader({ sentence, onComplete }: ChunkReaderProps) {
  const [state, setState] = useState<ChunkReadingState>(() =>
    startChunkReading(sentence.chunks),
  );
  const hasCompletedRef = useRef(false);

  const currentChunk = state.completed ? null : state.chunks[state.currentIndex];

  const distractorMeaning = useMemo(() => {
    if (!currentChunk) return "";
    return pickDistractor(state, state.currentIndex);
  }, [state, currentChunk]);

  const options = useMemo(() => {
    if (!currentChunk) return [];
    return buildTwoChoiceOptions(currentChunk.meaning, distractorMeaning);
  }, [currentChunk, distractorMeaning]);

  useEffect(() => {
    if (!state.completed || hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete({
      correctCount: state.correctCount,
      totalChunks: state.chunks.length,
    });
  }, [state, onComplete]);

  if (state.completed) {
    return null;
  }

  function handleChoose(choice: string) {
    const { nextState } = answerCurrentChunk(state, choice, distractorMeaning);
    setState(nextState);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        width: "100%",
        maxWidth: 480,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, textAlign: "center" }}>
        {currentChunk?.text}
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handleChoose(option)}
            style={{
              fontSize: 16,
              padding: "16px 24px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
