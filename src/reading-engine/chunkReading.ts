/**
 * 청크 리딩 — "문장 렌즈" 2단계.
 * 문장을 의미 단위(청크)로 한 덩이씩 카드처럼 넘기며 뜻을 2지선다로 고른다.
 * 뒤로 돌아가 다시 읽는(회귀) 것이 물리적으로 불가능하도록, 이 모듈은
 * state를 이전으로 되돌리는 함수를 의도적으로 export하지 않는다.
 */

export interface ReadingChunk {
  text: string;
  meaning: string;
}

export interface ChunkReadingState {
  chunks: ReadingChunk[];
  currentIndex: number;
  correctCount: number;
  completed: boolean;
}

export function startChunkReading(chunks: ReadingChunk[]): ChunkReadingState {
  return {
    chunks,
    currentIndex: 0,
    correctCount: 0,
    completed: chunks.length === 0,
  };
}

/**
 * 현재 청크에 답한다. 정답 여부와 무관하게 다음 청크로 무조건 전진하며,
 * 마지막 청크를 넘기면 completed가 true가 된다.
 */
export function answerCurrentChunk(
  state: ChunkReadingState,
  chosenMeaning: string,
  distractorMeaning: string,
): { nextState: ChunkReadingState; wasCorrect: boolean } {
  if (state.completed) {
    return { nextState: state, wasCorrect: false };
  }

  const currentChunk = state.chunks[state.currentIndex];
  const wasCorrect = chosenMeaning === currentChunk.meaning;
  void distractorMeaning; // 보기 구성은 buildTwoChoiceOptions가 담당, 여기서는 채점만 한다.

  const nextIndex = state.currentIndex + 1;
  const nextState: ChunkReadingState = {
    ...state,
    currentIndex: nextIndex,
    correctCount: wasCorrect ? state.correctCount + 1 : state.correctCount,
    completed: nextIndex >= state.chunks.length,
  };

  return { nextState, wasCorrect };
}

/**
 * 정답 뜻과 오답 뜻 하나를 랜덤 순서로 섞어 2지선다 보기를 만든다.
 * rng는 [0, 1) 범위의 난수를 반환하는 함수(기본값 Math.random)로,
 * reward-economy/rng.ts의 createRng(seed)로 만든 결정적 RNG와 시그니처가 호환된다.
 */
export function buildTwoChoiceOptions(
  correctMeaning: string,
  distractorMeaning: string,
  rng: () => number = Math.random,
): string[] {
  const options = [correctMeaning, distractorMeaning];
  return rng() < 0.5 ? options : [options[1], options[0]];
}
