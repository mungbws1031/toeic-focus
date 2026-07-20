import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressRing } from "./ProgressRing";

describe("ProgressRing", () => {
  it("role=progressbar로 렌더된다", () => {
    render(<ProgressRing progress={0.3} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("progress={0.5}는 aria-valuenow={50}으로 변환된다", () => {
    render(<ProgressRing progress={0.5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });

  it("progress가 1을 넘으면 aria-valuenow는 100으로 clamp된다", () => {
    render(<ProgressRing progress={1.5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("progress가 0보다 작으면 aria-valuenow는 0으로 clamp된다", () => {
    render(<ProgressRing progress={-0.2} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });
});
