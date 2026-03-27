import type { PrismaClient } from "@/generated/prisma";
import {
  seedCharacters,
  seedChaptersAndParagraphs,
  seedFamilyRelations,
} from "./characters";

export async function seedBook(prisma: PrismaClient) {
  // Clean existing data (order matters due to FK constraints)
  await prisma.characterMention.deleteMany();
  await prisma.familyRelation.deleteMany();
  await prisma.paragraph.deleteMany();
  await prisma.character.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.book.deleteMany();

  // Create the book
  const book = await prisma.book.create({
    data: {
      slug: "one-hundred-years-of-solitude",
      title: "百年孤独",
      subtitle: "Cien años de soledad",
      author: "加西亚·马尔克斯",
      description: "魔幻现实主义文学的代表作，讲述布恩地亚家族七代人的兴衰史。",
    },
  });

  console.log(`Book: ${book.title} (${book.id})`);

  // Seed characters
  const nickToId = await seedCharacters(prisma, book.id);

  // Seed chapters and paragraphs
  await seedChaptersAndParagraphs(prisma, book.id, nickToId);

  // Seed family relations
  await seedFamilyRelations(prisma, book.id, nickToId);

  console.log("Seed complete!");
}
