import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import type { PrismaClient } from "@/generated/prisma/client";

const CHARACTER_JSON = path.join(process.cwd(), "docs", "人物映射表.json");

interface RawCharacter {
  nick: string;
  orig: string;
  colorClass: string;
  gen: string;
  desc: string;
}

export async function seedCharacters(
  prisma: PrismaClient,
  bookId: string,
): Promise<Map<string, string>> {
  const raw: RawCharacter[] = JSON.parse(fs.readFileSync(CHARACTER_JSON, "utf-8"));

  const nickToId = new Map<string, string>();

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    const record = await prisma.character.create({
      data: {
        bookId,
        nick: c.nick,
        orig: c.orig,
        colorClass: c.colorClass,
        gen: c.gen,
        desc: c.desc,
        sortOrder: i,
      },
    });
    nickToId.set(c.nick, record.id);
  }

  console.log(`  Seeded ${raw.length} characters`);
  return nickToId;
}

export async function seedChaptersAndParagraphs(
  prisma: PrismaClient,
  bookId: string,
  nickToId: Map<string, string>,
) {
  const htmlPath = path.join(process.cwd(), "docs", "百年孤独gemini1.2.html");
  const html = fs.readFileSync(htmlPath, "utf-8");
  const $ = cheerio.load(html);

  const sections = $(".chapter");
  console.log(`  Found ${sections.length} chapters`);

  for (const section of sections.toArray()) {
    const $section = $(section);
    const id = $section.attr("id") || "";
    // Extract chapter number from id like "ch-1"
    const match = id.match(/ch-(\d+)/);
    const number = match ? parseInt(match[1], 10) : 0;

    const h2Text = $section.find("h2").text().trim() || `第${number}章`;

    const chapter = await prisma.chapter.create({
      data: {
        bookId,
        number,
        title: h2Text,
      },
    });

    const paragraphs = $section.find("p");
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const pEl = $(paragraphs[pIdx]);
      const content = pEl.html() || "";

      const paragraph = await prisma.paragraph.create({
        data: {
          chapterId: chapter.id,
          order: pIdx,
          content,
        },
      });

      // Extract character mentions
      const rubies = pEl.find("ruby.cn");
      for (const ruby of rubies.toArray()) {
        const $ruby = $(ruby);
        const nick = $ruby.attr("data-nick");
        if (!nick) continue;

        const characterId = nickToId.get(nick);
        if (!characterId) continue;

        // Calculate offset in the HTML string
        const outerHtml = $.html(ruby) || "";
        const offset = content.indexOf(outerHtml);
        if (offset === -1) continue;

        // Length of visible text (the first text node before <rt>)
        const textContent = $ruby.contents().first().text();
        const length = textContent.length;

        await prisma.characterMention.create({
          data: {
            characterId,
            paragraphId: paragraph.id,
            offset,
            length,
          },
        });
      }
    }

    console.log(`  Chapter ${number}: ${paragraphs.length} paragraphs`);
  }
}

export async function seedFamilyRelations(
  prisma: PrismaClient,
  bookId: string,
  nickToId: Map<string, string>,
) {
  const relPath = path.join(process.cwd(), "docs", "family-relations.json");
  const raw: {
    person: string;
    relative: string;
    type: string;
    note?: string;
  }[] = JSON.parse(fs.readFileSync(relPath, "utf-8"));

  let count = 0;
  for (const r of raw) {
    const personId = nickToId.get(r.person);
    const relativeId = nickToId.get(r.relative);
    if (!personId || !relativeId) {
      console.warn(`  Skipping relation: ${r.person} -> ${r.relative} (not found)`);
      continue;
    }

    await prisma.familyRelation.create({
      data: {
        bookId,
        personId,
        relativeId,
        type: r.type,
        note: r.note || null,
      },
    });
    count++;
  }

  console.log(`  Seeded ${count} family relations`);
}
