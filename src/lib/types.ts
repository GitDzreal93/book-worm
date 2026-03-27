export type ColorClass = "ct-orel" | "ct-jose" | "ct-female" | "ct-outsider";

export interface CharacterData {
  id: string;
  nick: string;
  orig: string;
  colorClass: ColorClass;
  gen: string;
  desc: string;
}

export type SidebarTab = "toc" | "char" | "tree";

export interface ChapterData {
  id: string;
  number: number;
  title: string;
  paragraphs: ParagraphData[];
}

export interface ParagraphData {
  id: string;
  order: number;
  content: string;
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
