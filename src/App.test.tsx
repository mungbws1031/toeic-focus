import "fake-indexeddb/auto";
import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "./db/db";
import type { Card } from "./db/types";
import { getGrammarPatterns, getSentences, getVocab } from "./content/loadContent";
import App from "./App";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** App.tsx의 dayOfYear/오늘의 문장 선택 로직을 그대로 복제한 테스트 헬퍼. */
function dayOfYear(date: Date): number {
  const yearStart = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - yearStart.getTime()) / MS_PER_DAY);
}

function todaysSentence() {
  const sentences = getSentences();
  return sentences[dayOfYear(new Date()) % sentences.length];
}

describe("App", () => {
  beforeEach(async () => {
    await db.cards.clear();
    await db.reviewLogs.clear();
    await db.sessionLogs.clear();
    await db.userState.clear();
  });

  it("db가 비어있는 초기 상태에서 렌더 시 홈 화면('지금 3분' 버튼)이 나타난다", async () => {
    render(<App />);

    expect(
      await screen.findByRole("button", { name: "지금 3분" }),
    ).toBeInTheDocument();
  });

  it("리뷰할 카드가 하나도 없어 빈 세션이 즉시 완료되면 보상 캡슐 모달이 뜨지 않는다", async () => {
    const farFutureDue = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const notDueCards: Card[] = [
      ...getVocab().map((vocab) => ({
        id: `vocab-${vocab.id}`,
        type: "vocab" as const,
        contentId: vocab.id,
        due: farFutureDue,
        stability: 1,
        difficulty: 1,
        elapsedDays: 0,
        scheduledDays: 9999,
        reps: 1,
        lapses: 0,
        state: "review" as const,
      })),
      ...getGrammarPatterns().map((pattern) => ({
        id: `grammar-${pattern.id}`,
        type: "grammar" as const,
        contentId: pattern.id,
        due: farFutureDue,
        stability: 1,
        difficulty: 1,
        elapsedDays: 0,
        scheduledDays: 9999,
        reps: 1,
        lapses: 0,
        state: "review" as const,
      })),
    ];
    // 마감(due)이 다 미래이고 새 카드 후보도 없어(모든 콘텐츠가 이미 카드로 존재) 세션이 비게 만든다.
    await db.cards.bulkAdd(notDueCards);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "지금 3분" }));

    expect(
      await screen.findByRole("button", { name: "홈으로" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "보상 캡슐" }),
    ).not.toBeInTheDocument();

    await waitFor(async () => {
      const logs = await db.sessionLogs.toArray();
      expect(logs).toHaveLength(1);
      expect(logs[0].cardsReviewed).toBe(0);
    });
  });

  it("굿나잇 세션은 채점이 없어 오늘 리뷰한 카드 수(진행률)에 다시 합산되지 않는다", async () => {
    const now = Date.now();
    const pastDue = new Date(now - 1000);
    const farFutureDue = new Date(now + 365 * 24 * 60 * 60 * 1000);
    const dueVocabCount = 3;
    const vocabCards: Card[] = getVocab().map((vocab, index) => ({
      id: `vocab-${vocab.id}`,
      type: "vocab" as const,
      contentId: vocab.id,
      // 앞의 dueVocabCount개만 "지금 3분" 세션에 잡히도록 과거로, 나머지는 미래로 둬서
      // newCardCandidates가 섞여 들어오지 않고 정확히 dueVocabCount장만 세션에 담기게 한다.
      due: index < dueVocabCount ? pastDue : farFutureDue,
      stability: 1,
      difficulty: 1,
      elapsedDays: 0,
      scheduledDays: 9999,
      reps: 1,
      lapses: 0,
      state: "review" as const,
    }));
    const grammarCards: Card[] = getGrammarPatterns().map((pattern) => ({
      id: `grammar-${pattern.id}`,
      type: "grammar" as const,
      contentId: pattern.id,
      due: farFutureDue,
      stability: 1,
      difficulty: 1,
      elapsedDays: 0,
      scheduledDays: 9999,
      reps: 1,
      lapses: 0,
      state: "review" as const,
    }));
    await db.cards.bulkAdd([...vocabCards, ...grammarCards]);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "지금 3분" }));

    // dueVocabCount장의 카드를 "알아요"로 채점하며 마이크로 세션을 끝낸다.
    for (let i = 0; i < dueVocabCount; i++) {
      fireEvent.click(await screen.findByRole("button", { name: "알아요" }));
    }

    fireEvent.click(await screen.findByRole("button", { name: "홈으로" }));

    // "굿나잇 2분" 버튼은 홈 화면에만 있으므로, 이게 보인다는 건 홈으로 완전히 전환됐다는
    // 뜻이다(전환 도중 남아있는 세션 화면의 progressbar를 잘못 붙잡지 않기 위해 이 버튼이
    // 뜬 뒤에야 progressbar를 새로 조회한다).
    const goodnightButton = await screen.findByRole("button", {
      name: "굿나잇 2분",
    });
    await waitFor(() => {
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        String(Math.round((dueVocabCount / 60) * 100)),
      );
    });

    fireEvent.click(goodnightButton);

    // 굿나잇 세션은 채점 없이 "다음"만 dueVocabCount번 누르면 끝난다.
    for (let i = 0; i < dueVocabCount; i++) {
      fireEvent.click(await screen.findByRole("button", { name: "다음" }));
    }

    // 굿나잇 완료 후 바로 홈으로 돌아오므로, 진행률이 마이크로 세션 직후 값과 동일해야 한다
    // (버그가 있었다면 dueVocabCount만큼 한 번 더 더해져 값이 커졌을 것이다).
    await screen.findByRole("button", { name: "굿나잇 2분" });
    await waitFor(() => {
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        String(Math.round((dueVocabCount / 60) * 100)),
      );
    });

    const logs = await db.sessionLogs.toArray();
    expect(logs).toHaveLength(2);
    expect(logs[0].sessionType).toBe("micro");
    expect(logs[1].sessionType).toBe("goodnight");
    expect(logs[1].cardsReviewed).toBe(dueVocabCount);

    const microCardsReviewedSum = logs
      .filter((log) => log.sessionType === "micro")
      .reduce((sum, log) => sum + log.cardsReviewed, 0);
    expect(microCardsReviewedSum).toBe(dueVocabCount);
  });

  it("리커버리 락이 걸리면 db에 영속화되고, 락이 유효한 동안 다음 세션에도 새 카드가 섞이지 않는다", async () => {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    // 마지막 활동일이 5일 전 → 리커버리 트리거 기준(4일 이상 공백)을 넘겨 첫 "지금 3분"에서
    // 리커버리 모드가 발동하도록 만든다. db에 카드가 하나도 없으므로 dueCards는 비어 있고,
    // 리커버리가 발동하면 newCardCandidates가 있어도 세션에 섞이지 않는다(§composeMicroSession).
    await db.userState.put({
      id: "singleton",
      xp: 0,
      level: 1,
      diagnosisCompleted: true,
      lastActiveDate: new Date(now - 5 * MS_PER_DAY),
    });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "지금 3분" }));

    // dueCards/newCards 모두 비어 세션이 즉시 빈 채로 완료되고 planet 화면의 "홈으로"가 뜬다.
    await screen.findByRole("button", { name: "홈으로" });

    await waitFor(async () => {
      const user = await db.userState.get("singleton");
      expect(user?.newLearningLockedUntil).toBeDefined();
      expect(user!.newLearningLockedUntil!.getTime()).toBeGreaterThan(now);
    });

    // 리커버리가 db.cards에 아무것도 추가하지 않았어야 한다(새 카드 후보가 전부 걸러짐).
    expect(await db.cards.count()).toBe(0);

    fireEvent.click(await screen.findByRole("button", { name: "홈으로" }));

    // 락이 여전히 유효한 상태에서 "지금 3분"을 다시 눌러도, 콘텐츠(vocab/grammar)가
    // 얼마든지 있는데도 새 카드가 전혀 db.cards에 추가되지 않아야 한다(버그2 재발 방지).
    fireEvent.click(await screen.findByRole("button", { name: "지금 3분" }));
    await screen.findByRole("button", { name: "홈으로" });

    expect(await db.cards.count()).toBe(0);
  });

  it("리커버리 락이 만료된 뒤에는 새 학습(new 카드)이 다시 세션에 섞인다", async () => {
    const now = Date.now();
    // 락 해제 시각이 이미 지난 과거 → 만료된 락으로 취급되어야 한다.
    await db.userState.put({
      id: "singleton",
      xp: 0,
      level: 1,
      diagnosisCompleted: true,
      lastActiveDate: new Date(now),
      newLearningLockedUntil: new Date(now - 1000),
    });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "지금 3분" }));

    // 락이 풀렸으므로 vocab/grammar 콘텐츠에서 새 카드 후보가 만들어져 db.cards에 저장된다.
    await waitFor(async () => {
      expect(await db.cards.count()).toBeGreaterThan(0);
    });

    // 세션 화면에도 실제로 카드가 노출된다(빈 세션으로 곧장 완료되지 않는다).
    expect(
      await screen.findByRole("button", { name: "알아요" }),
    ).toBeInTheDocument();
  });

  it("오늘의 한 문장을 모두 정답으로 완료하면 문장 카드가 생기지 않고 홈으로 돌아온다", async () => {
    const sentence = todaysSentence();

    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: "오늘의 한 문장" }),
    );

    for (const chunk of sentence.chunks) {
      const button = await screen.findByRole("button", {
        name: chunk.meaning,
      });
      fireEvent.click(button);
    }

    // 완료 후 App이 다시 홈 화면으로 전환되므로 "지금 3분" 버튼이 다시 보여야 한다.
    expect(
      await screen.findByRole("button", { name: "지금 3분" }),
    ).toBeInTheDocument();
    expect(await db.cards.count()).toBe(0);
  });

  it("오늘의 한 문장에서 정답률이 낮으면 문장 카드가 db에 생성된 뒤 홈으로 돌아온다", async () => {
    const sentence = todaysSentence();

    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: "오늘의 한 문장" }),
    );

    // 첫 청크는 일부러 오답을 골라 정답률을 80% 미만으로 떨어뜨린다.
    const firstButtons = screen.getAllByRole("button");
    const wrongButton = firstButtons.find(
      (btn) => btn.textContent !== sentence.chunks[0].meaning,
    );
    expect(wrongButton).toBeDefined();
    fireEvent.click(wrongButton!);

    for (const chunk of sentence.chunks.slice(1)) {
      const button = await screen.findByRole("button", {
        name: chunk.meaning,
      });
      fireEvent.click(button);
    }

    await screen.findByRole("button", { name: "지금 3분" });

    const cards = await db.cards.toArray();
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe(`sentence-${sentence.id}`);
    expect(cards[0].type).toBe("sentence");
  });

  it("실력 진단(12문항)을 마치면 결과가 db.userState에 저장되고, 진단 유도 버튼이 홈에서 사라진다", async () => {
    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "내 실력 진단하기(5분)",
      }),
    );

    for (let i = 0; i < 12; i++) {
      const buttons = await screen.findAllByRole("button");
      fireEvent.click(buttons[0]);
    }

    // 진단 완료 후 App이 홈으로 돌아오고, 이미 진단을 마쳤으므로 유도 버튼은 더 이상 없다.
    expect(
      await screen.findByRole("button", { name: "지금 3분" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "내 실력 진단하기(5분)" }),
    ).not.toBeInTheDocument();

    const user = await db.userState.get("singleton");
    expect(user?.diagnosisCompleted).toBe(true);
    expect(user?.estimatedScore).toBeGreaterThanOrEqual(200);
    expect(user?.estimatedScore).toBeLessThanOrEqual(800);
    expect(["vocab", "grammar", "balanced"]).toContain(user?.weakerArea);
  });
});
