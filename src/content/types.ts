export interface VocabItem {
  id: string;
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  exampleMeaning: string;
  difficulty: 1 | 2 | 3;
}

export interface GrammarExample {
  sentence: string;
  blank: string;
  options: string[];
  correctIndex: number;
}

export interface GrammarPattern {
  id: string;
  title: string;
  explanation: string;
  examples: GrammarExample[];
}

export interface SentenceChunk {
  text: string;
  meaning: string;
}

export interface SentenceItem {
  id: string;
  text: string;
  chunks: SentenceChunk[];
  difficulty: 1 | 2 | 3;
  wordCount: number;
}
