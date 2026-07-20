import Dexie, { type EntityTable } from "dexie";
import type { Card, ReviewLog, SessionLog, UserState } from "./types";

export class FocusToeicDB extends Dexie {
  cards!: EntityTable<Card, "id">;
  reviewLogs!: EntityTable<ReviewLog, "id">;
  sessionLogs!: EntityTable<SessionLog, "id">;
  userState!: EntityTable<UserState, "id">;

  constructor() {
    super("FocusToeicDB");

    this.version(1).stores({
      cards: "id, type, contentId, due, state",
      reviewLogs: "++id, cardId, reviewedAt",
      sessionLogs: "++id, startedAt",
      userState: "id",
    });
  }
}

export const db = new FocusToeicDB();
