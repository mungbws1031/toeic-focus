import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HomeScreen } from "./HomeScreen";

describe("HomeScreen", () => {
  it("'지금 3분' 버튼이 렌더된다", () => {
    render(
      <HomeScreen onStart={vi.fn()} todayProgress={0.4} diagnosisCompleted />,
    );
    expect(
      screen.getByRole("button", { name: "지금 3분" }),
    ).toBeInTheDocument();
  });

  it("'지금 3분' 버튼을 클릭하면 onStart가 호출된다", () => {
    const onStart = vi.fn();
    render(
      <HomeScreen
        onStart={onStart}
        todayProgress={0.4}
        diagnosisCompleted
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "지금 3분" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("diagnosisCompleted={false}면 진단 유도 버튼이 보이고 클릭 시 onStartDiagnosis가 호출된다", () => {
    const onStartDiagnosis = vi.fn();
    render(
      <HomeScreen
        onStart={vi.fn()}
        todayProgress={0.4}
        diagnosisCompleted={false}
        onStartDiagnosis={onStartDiagnosis}
      />,
    );
    const diagnosisButton = screen.getByRole("button", {
      name: "내 실력 진단하기(5분)",
    });
    expect(diagnosisButton).toBeInTheDocument();
    fireEvent.click(diagnosisButton);
    expect(onStartDiagnosis).toHaveBeenCalledTimes(1);
  });

  it("diagnosisCompleted={true}면 진단 유도 버튼이 보이지 않는다", () => {
    render(
      <HomeScreen onStart={vi.fn()} todayProgress={0.4} diagnosisCompleted />,
    );
    expect(
      screen.queryByRole("button", { name: "내 실력 진단하기(5분)" }),
    ).not.toBeInTheDocument();
  });

  it("'오늘의 한 문장' 버튼은 항상 보이고 클릭 시 onStartSentenceLens가 호출된다", () => {
    const onStartSentenceLens = vi.fn();
    render(
      <HomeScreen
        onStart={vi.fn()}
        todayProgress={0}
        diagnosisCompleted
        onStartSentenceLens={onStartSentenceLens}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "오늘의 한 문장" }));
    expect(onStartSentenceLens).toHaveBeenCalledTimes(1);
  });

  it("todayProgress가 0이면 '굿나잇 2분' 버튼이 보이지 않는다", () => {
    render(
      <HomeScreen onStart={vi.fn()} todayProgress={0} diagnosisCompleted />,
    );
    expect(
      screen.queryByRole("button", { name: "굿나잇 2분" }),
    ).not.toBeInTheDocument();
  });

  it("todayProgress > 0이면 '굿나잇 2분' 버튼이 보이고 클릭 시 onStartGoodnight가 호출된다", () => {
    const onStartGoodnight = vi.fn();
    render(
      <HomeScreen
        onStart={vi.fn()}
        todayProgress={0.2}
        diagnosisCompleted
        onStartGoodnight={onStartGoodnight}
      />,
    );
    const button = screen.getByRole("button", { name: "굿나잇 2분" });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onStartGoodnight).toHaveBeenCalledTimes(1);
  });
});
