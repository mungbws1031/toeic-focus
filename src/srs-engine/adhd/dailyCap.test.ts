import { describe, it, expect } from "vitest";
import { dailyCap } from "./dailyCap";

describe("dailyCap", () => {
  it("low 에너지 레벨은 30장을 반환한다", () => {
    expect(dailyCap("low")).toBe(30);
  });

  it("normal 에너지 레벨은 60장을 반환한다", () => {
    expect(dailyCap("normal")).toBe(60);
  });

  it("high 에너지 레벨은 90장을 반환한다", () => {
    expect(dailyCap("high")).toBe(90);
  });

  it("인자 없이 호출하면 기본값(normal=60)을 반환한다", () => {
    expect(dailyCap()).toBe(60);
  });
});
