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

  it("12문항을 모두 답하면 onComplete가 유효한 결과와 함께 호출된다", () => {
    const onComplete = vi.fn();
    render(<DiagnosisScreen onComplete={onComplete} />);

    for (let i = 0; i < 12; i++) {
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(4);
      fireEvent.click(buttons[0]);
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
