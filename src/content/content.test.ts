import { describe, it, expect } from "vitest";
import { getVocab, getGrammarPatterns, getSentences } from "./loadContent";

describe("content seed data", () => {
  const vocab = getVocab();
  const grammarPatterns = getGrammarPatterns();
  const sentences = getSentences();

  it("어휘는 40개 이상이다", () => {
    expect(vocab.length).toBeGreaterThanOrEqual(40);
  });

  it("문법 패턴은 8개 이상이다", () => {
    expect(grammarPatterns.length).toBeGreaterThanOrEqual(8);
  });

  it("문장은 12개 이상이다", () => {
    expect(sentences.length).toBeGreaterThanOrEqual(12);
  });

  it("모든 어휘 항목은 word/meaning/example이 비어있지 않다", () => {
    for (const item of vocab) {
      expect(item.word.trim()).not.toBe("");
      expect(item.meaning.trim()).not.toBe("");
      expect(item.example.trim()).not.toBe("");
    }
  });

  it("모든 문법 패턴은 예문이 3개 이상이고 correctIndex가 options 범위 내에 있다", () => {
    for (const pattern of grammarPatterns) {
      expect(pattern.examples.length).toBeGreaterThanOrEqual(3);
      for (const example of pattern.examples) {
        expect(example.correctIndex).toBeGreaterThanOrEqual(0);
        expect(example.correctIndex).toBeLessThan(example.options.length);
      }
    }
  });

  it("모든 문장의 chunks는 2개 이상이고 각 청크 텍스트가 원문에 포함된다", () => {
    for (const sentence of sentences) {
      expect(sentence.chunks.length).toBeGreaterThanOrEqual(2);
      for (const chunk of sentence.chunks) {
        expect(sentence.text).toContain(chunk.text);
      }
    }
  });

  it("모든 문장의 chunks를 공백으로 이어붙이면 원문 text와 일치한다", () => {
    for (const sentence of sentences) {
      const joined = sentence.chunks.map((chunk) => chunk.text).join(" ");
      expect(joined).toBe(sentence.text);
    }
  });
});
