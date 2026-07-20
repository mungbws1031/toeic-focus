import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChunkReader } from "./ChunkReader";
import type { SentenceItem } from "../../content/types";

const sentence: SentenceItem = {
  id: "s01",
  text: "The team meeting will start at nine tomorrow.",
  chunks: [
    { text: "The team meeting", meaning: "팀 회의는" },
    { text: "will start", meaning: "시작할 것이다" },
    { text: "at nine tomorrow.", meaning: "내일 9시에" },
  ],
  difficulty: 1,
  wordCount: 8,
};

/** 매 청크마다 정답(현재 청크의 뜻)을 골라 끝까지 진행시킨다. */
function answerAllCorrectly(chunks: SentenceItem["chunks"]) {
  for (const chunk of chunks) {
    const button = screen.getByRole("button", { name: chunk.meaning });
    fireEvent.click(button);
  }
}

describe("ChunkReader", () => {
  it("모든 청크에 정답을 고르면 onComplete가 correctCount=3, totalChunks=3으로 호출된다", () => {
    const onComplete = vi.fn();
    render(<ChunkReader sentence={sentence} onComplete={onComplete} />);

    answerAllCorrectly(sentence.chunks);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      correctCount: 3,
      totalChunks: 3,
    });
  });

  it("첫 청크는 2지선다 버튼 2개를 보여준다", () => {
    render(<ChunkReader sentence={sentence} onComplete={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("오답을 골라도 다음 청크로 전진하고, 마지막에는 정답 수보다 적은 correctCount로 완료된다", () => {
    const onComplete = vi.fn();
    render(<ChunkReader sentence={sentence} onComplete={onComplete} />);

    // 첫 청크는 오답(정답이 아닌 버튼)을 고른다.
    const buttons = screen.getAllByRole("button");
    const wrongButton = buttons.find(
      (btn) => btn.textContent !== sentence.chunks[0].meaning,
    );
    expect(wrongButton).toBeDefined();
    fireEvent.click(wrongButton!);

    // 나머지 청크는 정답을 고른다.
    answerAllCorrectly(sentence.chunks.slice(1));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      correctCount: 2,
      totalChunks: 3,
    });
  });
});
