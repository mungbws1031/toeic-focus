import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlanetScreen } from "./PlanetScreen";
import { levelFromXp } from "../../reward-economy/xp";

describe("PlanetScreen", () => {
  it("레벨 숫자가 화면에 나타난다", () => {
    render(
      <PlanetScreen
        xpState={{ totalXp: 250, combo: 3 }}
        todayProgress={0.5}
      />,
    );
    const expectedLevel = levelFromXp(250);
    expect(
      screen.getByText(new RegExp(`Lv\\.\\s*${expectedLevel}`)),
    ).toBeInTheDocument();
  });

  it("todayProgress 값이 화면 어딘가에 반영된다", () => {
    render(
      <PlanetScreen
        xpState={{ totalXp: 250, combo: 3 }}
        todayProgress={0.5}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });
});
