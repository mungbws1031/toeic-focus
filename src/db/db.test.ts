import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { FocusToeicDB } from "./db";

describe("FocusToeicDB", () => {
  it("테이블이 정의되어 있다", () => {
    const db = new FocusToeicDB();

    expect(db.cards).toBeDefined();
    expect(db.reviewLogs).toBeDefined();
    expect(db.sessionLogs).toBeDefined();
    expect(db.userState).toBeDefined();
    expect(db.name).toBe("FocusToeicDB");
  });
});
