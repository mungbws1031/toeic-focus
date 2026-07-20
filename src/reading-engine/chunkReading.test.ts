import { describe, it, expect } from "vitest";
import {
  startChunkReading,
  answerCurrentChunk,
  buildTwoChoiceOptions,
  type ReadingChunk,
} from "./chunkReading";

const CHUNKS: ReadingChunk[] = [
  { text: "The manager", meaning: "그 관리자는" },
  { text: "will review", meaning: "검토할 것이다" },
  { text: "the proposal", meaning: "그 제안서를" },
];

describe("startChunkReading", () => {
  it("currentIndex: 0, completed: false로 시작한다", () => {
    const state = startChunkReading(CHUNKS);

    expect(state.currentIndex).toBe(0);
    expect(state.completed).toBe(false);
    expect(state.correctCount).toBe(0);
  });

  it("빈 청크 배열이면 시작부터 completed: true다", () => {
    const state = startChunkReading([]);

    expect(state.completed).toBe(true);
  });
});

describe("answerCurrentChunk", () => {
  it("정답을 맞히면 currentIndex가 1 증가하고 correctCount도 증가한다", () => {
    const state = startChunkReading(CHUNKS);

    const { nextState, wasCorrect } = answerCurrentChunk(
      state,
      "그 관리자는",
      "그 직원은",
    );

    expect(wasCorrect).toBe(true);
    expect(nextState.currentIndex).toBe(1);
    expect(nextState.correctCount).toBe(1);
    expect(nextState.completed).toBe(false);
  });

  it("오답을 골라도 currentIndex가 1 증가한다(회귀 없이 무조건 전진)", () => {
    const state = startChunkReading(CHUNKS);

    const { nextState, wasCorrect } = answerCurrentChunk(
      state,
      "그 직원은",
      "그 관리자는",
    );

    expect(wasCorrect).toBe(false);
    expect(nextState.currentIndex).toBe(1);
    expect(nextState.correctCount).toBe(0);
  });

  it("마지막 청크까지 답하면 completed: true가 된다", () => {
    let state = startChunkReading(CHUNKS);

    for (let i = 0; i < CHUNKS.length; i++) {
      const correctMeaning = CHUNKS[i].meaning;
      const result = answerCurrentChunk(state, correctMeaning, "오답");
      state = result.nextState;
    }

    expect(state.completed).toBe(true);
    expect(state.currentIndex).toBe(CHUNKS.length);
    expect(state.correctCount).toBe(CHUNKS.length);
  });

  it("이미 completed된 상태에서 다시 호출해도 상태가 변하지 않는다", () => {
    let state = startChunkReading(CHUNKS);
    for (let i = 0; i < CHUNKS.length; i++) {
      state = answerCurrentChunk(state, CHUNKS[i].meaning, "오답").nextState;
    }
    expect(state.completed).toBe(true);

    const { nextState, wasCorrect } = answerCurrentChunk(
      state,
      "아무거나",
      "아무거나2",
    );

    expect(wasCorrect).toBe(false);
    expect(nextState).toBe(state);
  });
});

describe("buildTwoChoiceOptions", () => {
  it("정답과 오답을 모두 포함한 2개짜리 배열을 반환한다", () => {
    const options = buildTwoChoiceOptions("정답", "오답");

    expect(options).toHaveLength(2);
    expect(options).toContain("정답");
    expect(options).toContain("오답");
  });

  it("rng가 0.5 미만이면 [정답, 오답] 순서, 이상이면 [오답, 정답] 순서다", () => {
    expect(buildTwoChoiceOptions("정답", "오답", () => 0)).toEqual([
      "정답",
      "오답",
    ]);
    expect(buildTwoChoiceOptions("정답", "오답", () => 0.9)).toEqual([
      "오답",
      "정답",
    ]);
  });
});
