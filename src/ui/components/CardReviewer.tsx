import { useEffect, useState, type CSSProperties } from "react";
import type { VocabItem, GrammarExample } from "../../content/types";

export interface CardReviewerProps {
  /** 카드 앞면에 보여줄 콘텐츠. 어휘 카드(VocabItem) 또는 문법 예문(GrammarExample). */
  card: VocabItem | GrammarExample;
  /** "review": FSRS 2버튼(알아요/가물가물) 채점. "goodnight": 채점 없이 "다음"만. 기본값 "review". */
  mode?: "review" | "goodnight";
  /** review 모드에서 채점 버튼 클릭 시 호출된다. */
  onRate?: (rating: "know" | "unsure") => void;
  /** goodnight 모드에서 "다음" 버튼 클릭 시 호출된다. */
  onNext?: () => void;
}

function isVocabItem(card: VocabItem | GrammarExample): card is VocabItem {
  return "word" in card;
}

const buttonStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  padding: "16px 32px",
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
};

/**
 * 카드 앞면(단어/문항) + 채점 버튼 2개(알아요/가물가물)만 보여주는 공용 리뷰어.
 * 4버튼 채점(다시/어려움/보통/쉬움) 대신 2버튼만 노출해 결정 피로를 줄인다.
 *
 * 문법 카드(GrammarExample)는 review 모드에서 정답이 채점 버튼과 함께 바로 노출되면
 * 자가채점(SRS)이 무의미해지므로, "정답 확인" 버튼을 눌러야만 정답과 채점 버튼이
 * 나타나는 2단계 흐름을 쓴다. goodnight 모드는 애초에 채점이 없으므로 기존처럼
 * 정답을 바로 보여주고 "다음" 버튼만 노출한다.
 */
export function CardReviewer({
  card,
  mode = "review",
  onRate,
  onNext,
}: CardReviewerProps) {
  const [answerRevealed, setAnswerRevealed] = useState(false);

  useEffect(() => {
    setAnswerRevealed(false);
  }, [card]);

  const isVocab = isVocabItem(card);
  const showAnswer = isVocab || mode === "goodnight" || answerRevealed;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        width: "100%",
        maxWidth: 480,
      }}
    >
      {isVocab ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700 }}>{card.word}</div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            {card.partOfSpeech}
          </div>
          <div style={{ fontSize: 22, marginTop: 12 }}>{card.meaning}</div>
          {card.example && (
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 16 }}>
              {card.example}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22 }}>{card.sentence}</div>
          <div style={{ fontSize: 16, color: "#6b7280", marginTop: 12 }}>
            {card.options.join(" / ")}
          </div>
          {showAnswer && (
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>
              {card.options[card.correctIndex]}
            </div>
          )}
        </div>
      )}

      {mode === "goodnight" ? (
        <button
          type="button"
          onClick={onNext}
          style={{ ...buttonStyle, background: "#4f46e5", color: "#fff" }}
        >
          다음
        </button>
      ) : !showAnswer ? (
        <button
          type="button"
          onClick={() => setAnswerRevealed(true)}
          style={{ ...buttonStyle, background: "#4f46e5", color: "#fff" }}
        >
          정답 확인
        </button>
      ) : (
        <div style={{ display: "flex", gap: 16 }}>
          <button
            type="button"
            onClick={() => onRate?.("unsure")}
            style={{ ...buttonStyle, background: "#f3f4f6", color: "#374151" }}
          >
            가물가물
          </button>
          <button
            type="button"
            onClick={() => onRate?.("know")}
            style={{ ...buttonStyle, background: "#4f46e5", color: "#fff" }}
          >
            알아요
          </button>
        </div>
      )}
    </div>
  );
}
