import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiagnosisScreen } from "./DiagnosisScreen";

describe("DiagnosisScreen", () => {
  it("렌더 직후 첫 문항(1/12)이 보인다", () => {
    render(<DiagnosisScreen onComplete={vi.fn()} />);
    expect(screen.getByText("1 / 12")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("옵션을 고르면 정답/오답 피드백이 보이고, '다음'을 눌러야 다음 문항으로 넘어간다", () => {
    render(<DiagnosisScreen onComplete={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(screen.getByText(/정답이에요|아쉬워요/)).toBeInTheDocument();
    expect(screen.getByText("1 / 12")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByText("2 / 12")).toBeInTheDocument();
  });

  it("12문항을 모두 답하면 onComplete가 유효한 결과와 함께 호출된다", () => {
    const onComplete = vi.fn();
    render(<DiagnosisScreen onComplete={onComplete} />);

    for (let i = 0; i < 12; i++) {
      const optionButtons = screen.getAllByRole("button");
      expect(optionButtons).toHaveLength(4);
      fireEvent.click(optionButtons[0]);

      const nextButton = screen.getByRole("button", {
        name: i + 1 < 12 ? "다음" : "결과 보기",
      });
      fireEvent.click(nextButton);
    }

    expect(onComplete).toHaveBeenCalledTimes(1);
    const result = onComplete.mock.calls[0][0];

    expect(result.estimatedScore).toBeGreaterThanOrEqual(200);
    expect(result.estimatedScore).toBeLessThanOrEqual(800);
    expect(["vocab", "grammar", "balanced"]).toContain(result.weakerArea);
    expect(result.vocabAccuracy).toBeGreaterThanOrEqual(0);
    expect(result.vocabAccuracy).toBeLessThanOrEqual(1);
    expect(result.grammarAccuracy).toBeGreaterThanOrEqual(0);
    expect(result.grammarAccuracy).toBeLessThanOrEqual(1);
  });
});
