import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCompletion } from "@/lib/ai-client";
import { extractNameCandidates } from "@/lib/extract-names";

interface GenStatus {
  status: "idle" | "processing" | "done" | "error";
  bookSlug: string | null;
  step: string;
  error: string | null;
}

// In-memory status (single-book at a time, sufficient for typical usage)
const STATUS: GenStatus = { status: "idle", bookSlug: null, step: "", error: null };

/** GET /api/books/[bookSlug]/generate — poll status */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookSlug: string }> },
) {
  const { bookSlug } = await params;
  if (STATUS.bookSlug !== bookSlug) return NextResponse.json({ status: "idle" });
  return NextResponse.json(STATUS);
}

/** POST /api/books/[bookSlug]/generate — kick off async generation */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookSlug: string }> },
) {
  const { bookSlug } = await params;

  if (STATUS.status === "processing") {
    return NextResponse.json({ error: "Already processing", current: STATUS }, { status: 409 });
  }

  const book = await prisma.book.findUnique({
    where: { slug: bookSlug },
    select: { id: true, title: true },
  });
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { target?: string };
  void runGeneration(bookSlug, book.id, book.title, body.target ?? "all");

  return NextResponse.json({ status: "processing", bookSlug }, { status: 202 });
}

// ---------------------------------------------------------------------------

async function runGeneration(slug: string, bookId: string, title: string, target: string) {
  STATUS.status = "processing";
  STATUS.bookSlug = slug;
  STATUS.error = null;

  try {
    // Broader sampling: up to 30 chapters × 5 paragraphs for better coverage
    const chapters = await prisma.chapter.findMany({
      where: { bookId },
      orderBy: { number: "asc" },
      take: 30,
      include: { paragraphs: { orderBy: { order: "asc" }, take: 5 } },
    });

    const sample = chapters
      .map((ch) => `【${ch.title}】\n${ch.paragraphs.map((p) => p.content).join("\n")}`)
      .join("\n\n")
      .slice(0, 12000);

    // Extract name candidates from broader text for LLM reference
    const fullText = await collectFullText(bookId);
    const nameCandidates = extractNameCandidates(fullText);

    if (target === "all" || target === "characters") {
      STATUS.step = "characters";
      await generateCharacters(bookId, title, sample, nameCandidates);
    }

    if (target === "all" || target === "relations") {
      STATUS.step = "relations";
      await generateRelations(bookId, title);
    }

    STATUS.status = "done";
    STATUS.step = "done";
  } catch (err) {
    STATUS.status = "error";
    STATUS.error = err instanceof Error ? err.message : String(err);
    console.error("[generate]", STATUS.error);
  }
}

// ---------------------------------------------------------------------------

/** Collect paragraph content from the full book for name extraction. */
async function collectFullText(bookId: string): string {
  const chapters = await prisma.chapter.findMany({
    where: { bookId },
    orderBy: { number: "asc" },
    select: { paragraphs: { select: { content: true }, take: 10, orderBy: { order: "asc" } } },
    take: 50,
  });

  const parts: string[] = [];
  for (const ch of chapters) {
    for (const p of ch.paragraphs) {
      parts.push(p.content);
    }
  }
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Character generation
// ---------------------------------------------------------------------------

const CHAR_SYSTEM = `你是小说人物分析专家。分析小说文本，提取所有重要人物，以JSON返回：
{"characters":[{"nick":"简称(2-6字)","orig":"全名","colorClass":"颜色分组","gen":"世代/身份","desc":"简介(50字内)","aliases":["别名1","别名2"],"sortOrder":1}]}

colorClass取值：
- "ct-orel"：主线男性角色A/主角
- "ct-jose"：主线男性角色B/次主角
- "ct-female"：女性人物
- "ct-outsider"：外来/配角/次要人物

重要规则：
1. aliases 必须包含该角色在书中出现的所有称呼变体（全名、带称号名、简称、绰号等）
2. 如果提供了"人名候选列表"，请以此为主要参考依据，不要遗漏高频人名
3. 同一角色的不同称呼（如"奥雷里亚诺·布恩迪亚上校"和"奥雷里亚诺"）应归为同一人物的 aliases
4. nick 是你给角色起的中文简称，orig 是最常用的完整原名

只返回JSON，不要其他内容。`;

interface LLMCharacter {
  nick: string;
  orig: string;
  colorClass: string;
  gen: string;
  desc: string;
  aliases: string[];
  sortOrder?: number;
}

async function generateCharacters(
  bookId: string,
  title: string,
  sample: string,
  nameCandidates: Array<{ name: string; count: number }>,
) {
  // Build name candidate hint for the LLM prompt
  let nameHint = "";
  if (nameCandidates.length > 0) {
    const lines = nameCandidates
      .slice(0, 80)
      .map((c) => `  ${c.name}（${c.count}次）`);
    nameHint = `\n\n以下是书中实际出现的人名候选（含间隔号的名字及其出现次数），请据此识别角色：\n${lines.join("\n")}`;
  }

  const prompt = `书名：${title}${nameHint}\n\n章节内容：\n${sample}`;
  const raw = await generateCompletion(prompt, CHAR_SYSTEM);

  const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = m ? m[1]! : raw;

  let parsed: { characters: LLMCharacter[] };
  try {
    parsed = JSON.parse(jsonStr.trim()) as { characters: LLMCharacter[] };
  } catch {
    throw new Error(`Cannot parse character JSON: ${jsonStr.slice(0, 200)}`);
  }

  const chars = parsed.characters;
  if (!Array.isArray(chars) || chars.length === 0) throw new Error("No characters returned");

  const VALID_CC = new Set(["ct-orel", "ct-jose", "ct-female", "ct-outsider"]);

  await prisma.character.deleteMany({ where: { bookId } });

  for (const [i, c] of chars.entries()) {
    const colorClass = VALID_CC.has(c.colorClass) ? c.colorClass : "ct-outsider";
    const nick = (c.nick ?? c.orig ?? `人物${i + 1}`).trim().slice(0, 20);
    const orig = (c.orig ?? nick).trim().slice(0, 60);

    const created = await prisma.character.create({
      data: {
        bookId,
        nick,
        orig,
        colorClass,
        gen: (c.gen ?? "").trim().slice(0, 30),
        desc: (c.desc ?? "").trim().slice(0, 200),
        sortOrder: c.sortOrder ?? i + 1,
      },
    });

    // Create aliases (dedup)
    const aliasSet = new Set<string>([orig, nick]);
    for (const a of c.aliases ?? []) {
      if (a && a.trim()) aliasSet.add(a.trim());
    }

    for (const alias of aliasSet) {
      if (!alias || alias.length < 1) continue;
      await prisma.characterAlias.create({
        data: {
          characterId: created.id,
          alias,
          isPrimary: alias === orig,
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Relation generation
// ---------------------------------------------------------------------------

const REL_SYSTEM = `你是小说关系分析专家。根据提供的人物列表，分析人物间关系，以JSON返回：
{"relations":[{"personNick":"人物A简称","relativeNick":"人物B简称","type":"关系类型","note":"关系描述"}]}

type取值："spouse"（配偶）、"parent-child"（父子/母子）、"note"（其他关系）

只返回JSON，不要其他内容。`;

interface LLMRelation {
  personNick: string;
  relativeNick: string;
  type: string;
  note: string;
}

async function generateRelations(bookId: string, title: string) {
  const characters = await prisma.character.findMany({
    where: { bookId },
    select: { id: true, nick: true, orig: true, gen: true, desc: true },
    orderBy: { sortOrder: "asc" },
  });

  if (characters.length === 0) return;

  const charList = characters
    .map((c) => `${c.nick}（${c.orig}，${c.gen}）：${c.desc}`)
    .join("\n");

  const prompt = `书名：${title}\n\n人物列表：\n${charList}\n\n请分析以上人物之间的关系。`;
  const raw = await generateCompletion(prompt, REL_SYSTEM);

  const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = m ? m[1]! : raw;

  let parsed: { relations: LLMRelation[] };
  try {
    parsed = JSON.parse(jsonStr.trim()) as { relations: LLMRelation[] };
  } catch {
    // Relations are optional — don't throw, just log
    console.warn("[generate] Cannot parse relation JSON:", jsonStr.slice(0, 200));
    return;
  }

  const rels = parsed.relations;
  if (!Array.isArray(rels) || rels.length === 0) return;

  const nickMap = new Map(characters.map((c) => [c.nick, c.id]));
  const VALID_TYPES = new Set(["spouse", "parent-child", "note"]);

  await prisma.familyRelation.deleteMany({ where: { bookId } });

  for (const r of rels) {
    const personId = nickMap.get(r.personNick);
    const relativeId = nickMap.get(r.relativeNick);
    if (!personId || !relativeId || personId === relativeId) continue;

    const type = VALID_TYPES.has(r.type) ? r.type : "note";

    await prisma.familyRelation.create({
      data: {
        bookId,
        personId,
        relativeId,
        type,
        note: r.note?.trim() ?? null,
      },
    });
  }
}
