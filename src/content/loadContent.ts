import vocabData from "./vocab.json";
import grammarData from "./grammar.json";
import sentencesData from "./sentences.json";
import type { VocabItem, GrammarPattern, SentenceItem } from "./types";

export function getVocab(): VocabItem[] {
  return vocabData as VocabItem[];
}

export function getGrammarPatterns(): GrammarPattern[] {
  return grammarData as GrammarPattern[];
}

export function getSentences(): SentenceItem[] {
  return sentencesData as SentenceItem[];
}
