import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionScreen } from "./SessionScreen";
import { getGrammarPatterns } from "../../content/loadContent";
import type { Card } from "../../db/types";
import type { ComposedSession } from "../../session-composer/types";

function makeCard(contentId: string): Card {
  return {
    id: `card-${contentId}`,
    type: "vocab",
    contentId,
    due: new Date(),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: "new",
  };
}

function makeGrammarCard(contentId: string, reps: number): Card {
  return {
    id: `card-${contentId}-reps${reps}`,
    type: "grammar",
    contentId,
    due: new Date(),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps,
    lapses: 0,
    state: "new",
  };
}

describe("SessionScreen", () => {
  it("micro 세션: 각 카드마다 '알아요'를 클릭하며 끝까지 진행하면 onSessionComplete가 호출된다", () => {
    const onSessionComplete = vi.fn();
    const session: ComposedSession = {
      cards: [makeCard("v01"), makeCard("v02"), makeCard("v03")],
      sessionType: "micro",
      recoveryTriggered: false,
      newLearningLockDays: 0,
    };
    render(
      <SessionScreen session={session} onSessionComplete={onSessionComplete} />,
    );

    for (let i = 0; i < 3; i++) {
      const button = screen.getByRole("button", { name: "알아요" });
      fireEvent.click(button);
    }

    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    const summary = onSessionComplete.mock.calls[0][0];
    expect(summary.cardsReviewed).toBe(3);
    expect(summary.xpEarned).toBeGreaterThan(0);
  });

  it("goodnight 세션: 채점 버튼 없이 '다음'만 클릭하며 끝까지 진행 가능하다", () => {
    const onSessionComplete = vi.fn();
    const session: ComposedSession = {
      cards: [makeCard("v01"), makeCard("v02")],
      sessionType: "goodnight",
      recoveryTriggered: false,
      newLearningLockDays: 0,
    };
    render(
      <SessionScreen session={session} onSessionComplete={onSessionComplete} />,
    );

    expect(
      screen.queryByRole("button", { name: "알아요" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    expect(onSessionComplete).toHaveBeenCalledWith({
      xpEarned: 0,
      cardsReviewed: 2,
      cardRatings: [],
    });
  });

  it("micro 세션: '알아요'로 진행한 카드들의 id와 rating이 cardRatings에 순서대로 누적된다", () => {
    const onSessionComplete = vi.fn();
    const session: ComposedSession = {
      cards: [makeCard("v01"), makeCard("v02"), makeCard("v03")],
      sessionType: "micro",
      recoveryTriggered: false,
      newLearningLockDays: 0,
    };
    render(
      <SessionScreen session={session} onSessionComplete={onSessionComplete} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "알아요" }));
    fireEvent.click(screen.getByRole("button", { name: "알아요" }));
    fireEvent.click(screen.getByRole("button", { name: "알아요" }));

    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    const summary = onSessionComplete.mock.calls[0][0];
    expect(summary.cardRatings).toEqual([
      { cardId: "card-v01", rating: "know" },
      { cardId: "card-v02", rating: "know" },
      { cardId: "card-v03", rating: "know" },
    ]);
  });

  it("세션 진행 중 ProgressRing이 현재 카드 인덱스/전체 진행률을 보여준다", () => {
    const session: ComposedSession = {
      cards: [makeCard("v01"), makeCard("v02")],
      sessionType: "micro",
      recoveryTriggered: false,
      newLearningLockDays: 0,
    };
    render(<SessionScreen session={session} onSessionComplete={vi.fn()} />);

    const ring = screen.getByRole("progressbar");
    expect(ring).toHaveAttribute("aria-valuenow", "0");

    fireEvent.click(screen.getByRole("button", { name: "알아요" }));

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });

  it("문법 카드는 card.reps에 따라 패턴의 서로 다른 예문을 노출한다 (examples[0] 고정 노출 방지)", () => {
    const g01 = getGrammarPatterns().find((p) => p.id === "g01");
    expect(g01).toBeDefined();
    expect(g01!.examples.length).toBeGreaterThan(1);

    // goodnight 모드는 채점 없이 문장을 바로 보여주므로, reps별로 노출된 예문 문장을
    // g01.examples[reps % length]의 sentence와 비교할 수 있다.
    for (let reps = 0; reps < g01!.examples.length; reps++) {
      const session: ComposedSession = {
        cards: [makeGrammarCard("g01", reps)],
        sessionType: "goodnight",
        recoveryTriggered: false,
        newLearningLockDays: 0,
      };
      const { unmount } = render(
        <SessionScreen session={session} onSessionComplete={vi.fn()} />,
      );

      expect(screen.getByText(g01!.examples[reps].sentence)).toBeInTheDocument();
      unmount();
    }
  });
});
