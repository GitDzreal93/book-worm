import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SidebarProvider } from "@/components/layout/SidebarProvider";
import { ReaderLayoutClient } from "./ReaderLayoutClient";
import type { ChapterData, CharacterData, FamilyRelationData } from "@/lib/types";

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ bookSlug: string }>;
}) {
  const { bookSlug } = await params;

  const book = await prisma.book.findUnique({
    where: { slug: bookSlug },
  });

  if (!book) notFound();

  const chapters = await prisma.chapter.findMany({
    where: { bookId: book.id },
    orderBy: { number: "asc" },
    include: {
      paragraphs: {
        orderBy: { order: "asc" },
      },
    },
  });

  const characters = await prisma.character.findMany({
    where: { bookId: book.id },
    orderBy: { sortOrder: "asc" },
    include: {
      aliases: {
        orderBy: [{ isPrimary: "desc" }, { alias: "asc" }],
      },
    },
  });

  const relations = await prisma.familyRelation.findMany({
    where: { bookId: book.id },
    include: {
      person: true,
      relative: true,
    },
  });

  const chapterData: ChapterData[] = chapters.map((ch) => ({
    id: ch.id,
    number: ch.number,
    title: ch.title,
    paragraphs: ch.paragraphs.map((p) => ({
      id: p.id,
      order: p.order,
      content: p.content,
    })),
  }));

  const characterData: CharacterData[] = characters.map((c) => ({
    id: c.id,
    nick: c.nick,
    orig: c.orig,
    colorClass: c.colorClass as CharacterData["colorClass"],
    gen: c.gen,
    desc: c.desc,
    aliases: c.aliases.map((a) => ({
      id: a.id,
      characterId: a.characterId,
      alias: a.alias,
      isPrimary: a.isPrimary,
    })),
  }));

  const relationData: FamilyRelationData[] = relations.map((r) => ({
    id: r.id,
    personId: r.personId,
    personNick: r.person.nick,
    personColorClass: r.person.colorClass as FamilyRelationData["personColorClass"],
    relativeId: r.relativeId,
    relativeNick: r.relative.nick,
    relativeColorClass: r.relative.colorClass as FamilyRelationData["relativeColorClass"],
    type: r.type as FamilyRelationData["type"],
    note: r.note,
  }));

  return (
    <SidebarProvider bookSlug={book.slug}>
      <ReaderLayoutClient
        bookId={book.id}
        bookTitle={book.title}
        bookSlug={book.slug}
        chapters={chapterData}
        characters={characterData}
        relations={relationData}
      />
    </SidebarProvider>
  );
}
