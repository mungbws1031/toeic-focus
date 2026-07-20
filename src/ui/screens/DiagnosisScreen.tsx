import { useState } from "react";
import { getVocab, getGrammarPatterns } from "../../content/loadContent";
import type { VocabItem, GrammarExample } from "../../content/types";

export interface DiagnosisResult {
  estimatedScore: number;
  weakerArea: "vocab" | "grammar" | "balanced";
  vocabAccuracy: number;
  grammarAccuracy: number;
}

export interface DiagnosisScreenProps {
  /** 12문항(어휘 6 + 문법 6)을 모두 마치면 산출된 결과와 함께 호출된다. */
  onComplete: (result: DiagnosisResult) => void;
}

type DiagnosisQuestion =
  | {
      type: "vocab";
      prompt: string;
      options: string[];
      correctIndex: number;
    }
  | {
      type: "grammar";
      prompt: string;
      options: string[];
      correctIndex: number;
    };

const VOCAB_QUESTION_COUNT = 6;
const GRAMMAR_QUESTION_COUNT = 6;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildVocabQuestions(vocab: VocabItem[]): DiagnosisQuestion[] {
  const picked = shuffle(vocab).slice(0, VOCAB_QUESTION_COUNT);
  return picked.map((item) => {
    const distractorPool = vocab.filter((v) => v.id !== item.id);
    const distractors = shuffle(distractorPool)
      .slice(0, 3)
      .map((v) => v.meaning);
    const options = shuffle([item.meaning, ...distractors]);
    const correctIndex = options.indexOf(item.meaning);
    return {
      type: "vocab",
      prompt: item.word,
      options,
      correctIndex,
    };
  });
}

function buildGrammarQuestions(
  examples: GrammarExample[],
): DiagnosisQuestion[] {
  const picked = shuffle(examples).slice(0, GRAMMAR_QUESTION_COUNT);
  return picked.map((example) => ({
    type: "grammar",
    prompt: example.sentence,
    options: example.options,
    correctIndex: example.correctIndex,
  }));
}

function buildQuestions(): DiagnosisQuestion[] {
  const vocabQuestions = buildVocabQuestions(getVocab());
  const allExamples = getGrammarPatterns().flatMap((p) => p.examples);
  const grammarQuestions = buildGrammarQuestions(allExamples);
  return [...vocabQuestions, ...grammarQuestions];
}

/**
 * 진단 미니모의고사 = 어휘 6문항 + 문법 6문항, 총 12문항.
 * 완료 시 추정 점수(200~800)와 약한 파트(vocab/grammar/balanced)를 산출한다.
 * (설계 스펙 §9 — MVP 축소 버전)
 */
export function DiagnosisScreen({ onComplete }: DiagnosisScreenProps) {
  const [questions] = useState<DiagnosisQuestion[]>(() => buildQuestions());
  const [index, setIndex] = useState(0);
  const [vocabCorrect, setVocabCorrect] = useState(0);
  const [grammarCorrect, setGrammarCorrect] = useState(0);

  const current = questions[index];
  const total = questions.length;

  function handleAnswer(selectedIndex: number) {
    const isCorrect = selectedIndex === current.correctIndex;
    const nextVocabCorrect =
      current.type === "vocab"
        ? vocabCorrect + (isCorrect ? 1 : 0)
        : vocabCorrect;
    const nextGrammarCorrect =
      current.type === "grammar"
        ? grammarCorrect + (isCorrect ? 1 : 0)
        : grammarCorrect;

    if (index + 1 < total) {
      setVocabCorrect(nextVocabCorrect);
      setGrammarCorrect(nextGrammarCorrect);
      setIndex(index + 1);
      return;
    }

    const vocabAccuracy = nextVocabCorrect / VOCAB_QUESTION_COUNT;
    const grammarAccuracy = nextGrammarCorrect / GRAMMAR_QUESTION_COUNT;
    const accuracy =
      (nextVocabCorrect + nextGrammarCorrect) /
      (VOCAB_QUESTION_COUNT + GRAMMAR_QUESTION_COUNT);
    const estimatedScore = Math.round(200 + accuracy * 600);
    const diff = vocabAccuracy - grammarAccuracy;
    const weakerArea: DiagnosisResult["weakerArea"] =
      Math.abs(diff) <= 0.05 ? "balanced" : diff < 0 ? "vocab" : "grammar";

    onComplete({
      estimatedScore,
      weakerArea,
      vocabAccuracy,
      grammarAccuracy,
    });
  }

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 24,
        overflow: "hidden",
      }}
    >
      <span style={{ fontSize: 14, color: "#6b7280" }}>
        {index + 1} / {total}
      </span>
      <h2 style={{ fontSize: 22, textAlign: "center", margin: 0 }}>
        {current.type === "vocab"
          ? `"${current.prompt}"의 뜻은?`
          : current.prompt}
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          maxWidth: 360,
        }}
      >
        {current.options.map((option, optionIndex) => (
          <button
            key={`${index}-${optionIndex}`}
            type="button"
            onClick={() => handleAnswer(optionIndex)}
            style={{
              fontSize: 16,
              padding: "14px 20px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
