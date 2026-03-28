export type ColorClass = "ct-orel" | "ct-jose" | "ct-female" | "ct-outsider";

export interface CharacterData {
  id: string;
  nick: string;
  orig: string;
  colorClass: ColorClass;
  gen: string;
  desc: string;
  aliases?: CharacterAliasData[];
}

export interface CharacterAliasData {
  id: string;
  characterId: string;
  alias: string;
  isPrimary: boolean;
}

export type SidebarTab = "toc" | "char" | "tree" | "translate" | "notes";

export interface BookData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  language: string | null;
  description: string | null;
  coverImage: string | null;
  totalChapters: number;
  totalParagraphs: number;
  readPercentage: number;
  createdAt: string;
}

export interface ChapterData {
  id: string;
  number: number;
  title: string;
  paragraphs: ParagraphData[];
  summary?: string | null;
}

export interface ParagraphData {
  id: string;
  order: number;
  content: string;
  translation?: ParagraphTranslationData | null;
}

export interface ParagraphTranslationData {
  id: string;
  paragraphId: string;
  content: string;
  isEdited: boolean;
}

export interface VocabularyWordData {
  id: string;
  bookId: string;
  word: string;
  definition: string;
  partOfSpeech: string | null;
  phonetic: string | null;
  contextSentence: string | null;
  chapterTitle: string | null;
  easeFactor: number;
  interval: number;
  repetitionCount: number;
  nextReviewDate: string | null;
  createdAt: string;
}

export interface ReviewLogData {
  id: string;
  wordId: string;
  quality: number;
  reviewedAt: string;
}

export interface HighlightData {
  id: string;
  paragraphId: string;
  bookId: string;
  startOffset: number;
  endOffset: number;
  color: string;
  note: string | null;
  chapterNumber?: number;
  chapterTitle?: string;
  createdAt: string;
}

export interface ReadingSessionData {
  id: string;
  bookId: string;
  startedAt: string;
  endedAt: string | null;
  chaptersRead: number;
  paragraphsRead: number;
}

export interface FamilyRelationData {
  id: string;
  personId: string;
  personNick: string;
  personColorClass: ColorClass;
  relativeId: string;
  relativeNick: string;
  relativeColorClass: ColorClass;
  type: "spouse" | "parent-child" | "note";
  note: string | null;
}
