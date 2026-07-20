import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardReviewer } from "./CardReviewer";
import type { GrammarExample, VocabItem } from "../../content/types";

const vocabCard: VocabItem = {
  id: "v01",
  word: "comply",
  meaning: "준수하다",
  partOfSpeech: "v.",
  example: "All employees must comply with the new safety regulations.",
  exampleMeaning: "모든 직원은 새로운 안전 규정을 준수해야 한다.",
  difficulty: 2,
};

const grammarCard: GrammarExample = {
  sentence: "The manager ___ the report before the meeting.",
  blank: "reviewed",
  options: ["reviewed", "reviewing", "review", "to review"],
  correctIndex: 0,
};

describe("CardReviewer", () => {
  describe("review 모드", () => {
    it("'알아요' 버튼을 클릭하면 onRate가 'know'로 호출된다", () => {
      const onRate = vi.fn();
      render(<CardReviewer card={vocabCard} onRate={onRate} />);
      fireEvent.click(screen.getByRole("button", { name: "알아요" }));
      expect(onRate).toHaveBeenCalledTimes(1);
      expect(onRate).toHaveBeenCalledWith("know");
    });

    it("'가물가물' 버튼을 클릭하면 onRate가 'unsure'로 호출된다", () => {
      const onRate = vi.fn();
      render(<CardReviewer card={vocabCard} onRate={onRate} />);
      fireEvent.click(screen.getByRole("button", { name: "가물가물" }));
      expect(onRate).toHaveBeenCalledTimes(1);
      expect(onRate).toHaveBeenCalledWith("unsure");
    });

    it("'다음' 버튼은 보이지 않는다", () => {
      render(<CardReviewer card={vocabCard} onRate={vi.fn()} />);
      expect(
        screen.queryByRole("button", { name: "다음" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("goodnight 모드", () => {
    it("채점 버튼 없이 '다음' 버튼만 보인다", () => {
      render(<CardReviewer card={vocabCard} mode="goodnight" />);
      expect(
        screen.queryByRole("button", { name: "알아요" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "가물가물" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "다음" })).toBeInTheDocument();
    });

    it("onRate 없이도 '다음' 버튼 클릭이 동작하고 onNext가 호출된다", () => {
      const onNext = vi.fn();
      render(<CardReviewer card={vocabCard} mode="goodnight" onNext={onNext} />);
      expect(() =>
        fireEvent.click(screen.getByRole("button", { name: "다음" })),
      ).not.toThrow();
      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("문법 카드 (review 모드)", () => {
    it("처음 렌더 시점에는 정답이 화면에 보이지 않는다", () => {
      render(<CardReviewer card={grammarCard} onRate={vi.fn()} />);
      expect(screen.getByText(grammarCard.sentence)).toBeInTheDocument();
      expect(
        screen.queryByText(grammarCard.options[grammarCard.correctIndex]),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "알아요" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "가물가물" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "정답 확인" }),
      ).toBeInTheDocument();
    });

    it("'정답 확인'을 누르면 정답과 채점 버튼이 나타나고, '알아요' 클릭 시 onRate가 'know'로 호출된다", () => {
      const onRate = vi.fn();
      render(<CardReviewer card={grammarCard} onRate={onRate} />);

      fireEvent.click(screen.getByRole("button", { name: "정답 확인" }));

      expect(
        screen.getByText(grammarCard.options[grammarCard.correctIndex]),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "정답 확인" }),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "알아요" }));
      expect(onRate).toHaveBeenCalledTimes(1);
      expect(onRate).toHaveBeenCalledWith("know");
    });

    it("'정답 확인' 이후 '가물가물' 클릭 시 onRate가 'unsure'로 호출된다", () => {
      const onRate = vi.fn();
      render(<CardReviewer card={grammarCard} onRate={onRate} />);

      fireEvent.click(screen.getByRole("button", { name: "정답 확인" }));
      fireEvent.click(screen.getByRole("button", { name: "가물가물" }));

      expect(onRate).toHaveBeenCalledTimes(1);
      expect(onRate).toHaveBeenCalledWith("unsure");
    });
  });
});
