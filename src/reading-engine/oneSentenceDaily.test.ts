import { describe, it, expect } from "vitest";
import {
  evaluateOneSentenceDaily,
  buildSentenceCardTrigger,
} from "./oneSentenceDaily";
import {
  startChunkReading,
  answerCurrentChunk,
  type ReadingChunk,
} from "./chunkReading";

const CHUNKS: ReadingChunk[] = [
  { text: "The manager", meaning: "그 관리자는" },
  { text: "will review", meaning: "검토할 것이다" },
  { text: "the proposal", meaning: "그 제안서를" },
  { text: "tomorrow", meaning: "내일" },
];

function completeAllCorrect(): ReturnType<typeof startChunkReading> {
  let state = startChunkReading(CHUNKS);
  for (const chunk of CHUNKS) {
    state = answerCurrentChunk(state, chunk.meaning, "오답").nextState;
  }
  return state;
}

function completeWithAccuracy(correctCount: number): ReturnType<
  typeof startChunkReading
> {
  let state = startChunkReading(CHUNKS);
  CHUNKS.forEach((chunk, index) => {
    const shouldBeCorrect = index < correctCount;
    const chosen = shouldBeCorrect ? chunk.meaning : "오답";
    state = answerCurrentChunk(state, chosen, "오답").nextState;
  });
  return state;
}

describe("evaluateOneSentenceDaily", () => {
  it("90초 이내에 정답률 100%로 완료하면 통과하고 문장 카드는 만들지 않는다", () => {
    const chunkState = completeAllCorrect();

    const result = evaluateOneSentenceDaily(chunkState, 90);

    expect(result.timedOut).toBe(false);
    expect(result.passed).toBe(true);
    expect(result.shouldCreateSentenceCard).toBe(false);
  });

  it("91초가 걸리면(시간 초과) 정답률과 무관하게 통과하지 못하고 문장 카드를 만든다", () => {
    const chunkState = completeAllCorrect();

    const result = evaluateOneSentenceDaily(chunkState, 91);

    expect(result.timedOut).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.shouldCreateSentenceCard).toBe(true);
  });

  it("시간 내에 끝냈지만 정답률이 낮으면(50%) 통과하지 못하고 문장 카드를 만든다", () => {
    const chunkState = completeWithAccuracy(2); // 4개 중 2개 정답 = 50%

    const result = evaluateOneSentenceDaily(chunkState, 60);

    expect(result.timedOut).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.shouldCreateSentenceCard).toBe(true);
  });

  it("아직 완료되지 않은 상태면 통과하지 못한다", () => {
    const state = startChunkReading(CHUNKS);
    const { nextState } = answerCurrentChunk(state, CHUNKS[0].meaning, "오답");

    const result = evaluateOneSentenceDaily(nextState, 30);

    expect(nextState.completed).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.shouldCreateSentenceCard).toBe(true);
  });

  it("기본 제한 시간은 90초다", () => {
    const chunkState = completeAllCorrect();

    const result = evaluateOneSentenceDaily(chunkState, 90);

    expect(result.timedOut).toBe(false);
  });
});

describe("buildSentenceCardTrigger", () => {
  it("통과했으면 null을 반환한다", () => {
    const chunkState = completeAllCorrect();
    const result = evaluateOneSentenceDaily(chunkState, 90);

    expect(buildSentenceCardTrigger(result, "sentence-1")).toBeNull();
  });

  it("시간 초과로 실패하면 reason: 'timeout'을 반환한다", () => {
    const chunkState = completeAllCorrect();
    const result = evaluateOneSentenceDaily(chunkState, 91);

    expect(buildSentenceCardTrigger(result, "sentence-1")).toEqual({
      sentenceContentId: "sentence-1",
      reason: "timeout",
    });
  });

  it("정답률 부족으로 실패하면 reason: 'lowAccuracy'를 반환한다", () => {
    const chunkState = completeWithAccuracy(2);
    const result = evaluateOneSentenceDaily(chunkState, 60);

    expect(buildSentenceCardTrigger(result, "sentence-1")).toEqual({
      sentenceContentId: "sentence-1",
      reason: "lowAccuracy",
    });
  });
});
