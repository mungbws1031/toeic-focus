import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OneSentenceDailyScreen } from "./OneSentenceDailyScreen";
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

describe("OneSentenceDailyScreen", () => {
  it("청크를 끝까지 정답으로 진행하면 onComplete가 passed=true, sentenceCardTrigger=null로 호출된다", () => {
    const onComplete = vi.fn();
    render(
      <OneSentenceDailyScreen sentence={sentence} onComplete={onComplete} />,
    );

    answerAllCorrectly(sentence.chunks);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      passed: true,
      sentenceCardTrigger: null,
    });
  });

  it("완료 후 결과 요약 문구가 화면에 보인다", () => {
    render(
      <OneSentenceDailyScreen sentence={sentence} onComplete={vi.fn()} />,
    );

    answerAllCorrectly(sentence.chunks);

    expect(screen.getByText("오늘 문장 완료!")).toBeInTheDocument();
  });

  it("오답이 많아 정답률이 80% 미만이면 sentenceCardTrigger가 lowAccuracy 사유로 생성된다", () => {
    const onComplete = vi.fn();
    render(
      <OneSentenceDailyScreen sentence={sentence} onComplete={onComplete} />,
    );

    // 첫 청크는 오답을 고른다(정답률 2/3 ≈ 0.67 < 0.8).
    const buttons = screen.getAllByRole("button");
    const wrongButton = buttons.find(
      (btn) => btn.textContent !== sentence.chunks[0].meaning,
    );
    expect(wrongButton).toBeDefined();
    fireEvent.click(wrongButton!);

    answerAllCorrectly(sentence.chunks.slice(1));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      passed: false,
      sentenceCardTrigger: { sentenceContentId: "s01", reason: "lowAccuracy" },
    });
  });
});
