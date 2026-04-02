import { describe, it, expect } from "vitest";
import { annotateText } from "@/lib/annotate";
import type { CharacterData } from "@/lib/types";

function makeChar(overrides: Partial<CharacterData> & { nick: string; orig: string }): CharacterData {
  return {
    id: "char-1",
    nick: overrides.nick,
    orig: overrides.orig,
    colorClass: overrides.colorClass ?? "ct-orel",
    gen: overrides.gen ?? "一代",
    desc: overrides.desc ?? "测试角色",
    aliases: overrides.aliases ?? [],
  };
}

describe("annotateText", () => {
  it("annotates a simple name", () => {
    const chars = [makeChar({ nick: "雷上校", orig: "奥雷里亚诺" })];
    const result = annotateText("奥雷里亚诺去了马贡多。", chars);
    expect(result).toContain('<ruby class="cn ct-orel"');
    expect(result).toContain("奥雷里亚诺<rt>雷上校</rt></ruby>");
    expect(result).toContain("去了马贡多。");
  });

  it("handles empty text", () => {
    const chars = [makeChar({ nick: "A", orig: "Alpha" })];
    expect(annotateText("", chars)).toBe("");
    expect(annotateText("   ", chars)).toBe("   ");
  });

  it("handles empty characters array", () => {
    expect(annotateText("some text", [])).toBe("some text");
  });

  it("long name should not be damaged by short name substring", () => {
    const chars = [
      makeChar({
        nick: "二冷",
        orig: "伊凡·费多罗维奇",
        colorClass: "ct-orel",
        gen: "二代",
        aliases: [
          { id: "a1", characterId: "char-1", alias: "伊凡·费多罗维奇", isPrimary: true },
          { id: "a2", characterId: "char-1", alias: "伊凡", isPrimary: false },
        ],
      }),
      makeChar({
        id: "char-2",
        nick: "大妈",
        orig: "索菲亚·伊凡诺芙娜",
        colorClass: "ct-female",
        gen: "外来",
        aliases: [
          { id: "a3", characterId: "char-2", alias: "索菲亚·伊凡诺芙娜", isPrimary: true },
        ],
      }),
    ];

    const result = annotateText("伊凡·费多罗维奇去找索菲亚·伊凡诺芙娜。", chars);

    // Long names should be annotated correctly
    expect(result).toContain("伊凡·费多罗维奇<rt>二冷</rt></ruby>");
    expect(result).toContain("索菲亚·伊凡诺芙娜<rt>大妈</rt></ruby>");

    // "伊凡" inside "索菲亚·伊凡诺芙娜" should NOT be separately annotated
    // Count ruby tags — should be exactly 2 (one for each character)
    const rubyCount = (result.match(/<ruby/g) ?? []).length;
    expect(rubyCount).toBe(2);
  });

  it("filters out single-char aliases", () => {
    const chars = [
      makeChar({
        nick: "X",
        orig: "小明",
        aliases: [
          { id: "a1", characterId: "char-1", alias: "明", isPrimary: false },
        ],
      }),
    ];
    // "明" is only 1 char, should not be annotated as standalone
    const result = annotateText("说明：小明来了。", chars);
    expect(result).toContain("小明<rt>X</rt></ruby>");
    // "明" in "说明" should NOT be annotated
    const rubyCount = (result.match(/<ruby/g) ?? []).length;
    expect(rubyCount).toBe(1);
  });

  it("does not annotate inside HTML tags", () => {
    const chars = [makeChar({ nick: "R", orig: "Ruby" })];
    const result = annotateText('<span class="ruby">Ruby is great</span>', chars);
    // "Ruby" in the tag attribute should not be annotated
    // Only the text content "Ruby" should be annotated
    const rubyCount = (result.match(/<ruby class="cn/g) ?? []).length;
    expect(rubyCount).toBe(1);
  });

  it("annotates all occurrences of an alias", () => {
    const chars = [makeChar({ nick: "雷", orig: "奥雷里亚诺" })];
    const result = annotateText("奥雷里亚诺说，奥雷里亚诺做了。", chars);
    const rubyCount = (result.match(/<ruby class="cn/g) ?? []).length;
    expect(rubyCount).toBe(2);
  });

  it("prefers longer alias match over shorter one for same character", () => {
    const chars = [
      makeChar({
        nick: "雷上校",
        orig: "奥雷里亚诺·布恩迪亚上校",
        aliases: [
          { id: "a1", characterId: "char-1", alias: "奥雷里亚诺·布恩迪亚上校", isPrimary: true },
          { id: "a2", characterId: "char-1", alias: "奥雷里亚诺", isPrimary: false },
          { id: "a3", characterId: "char-1", alias: "雷上校", isPrimary: false },
        ],
      }),
    ];

    // Full name should be annotated with the full name variant
    const result = annotateText("奥雷里亚诺·布恩迪亚上校发动了战争。", chars);
    expect(result).toContain("奥雷里亚诺·布恩迪亚上校<rt>雷上校</rt></ruby>");
    const rubyCount = (result.match(/<ruby class="cn/g) ?? []).length;
    expect(rubyCount).toBe(1);
  });

  it("handles aliases that are substrings of other characters' names", () => {
    // "阿尔卡蒂奥" appears in both characters but as different parts
    const chars = [
      makeChar({
        id: "c1",
        nick: "霍三",
        orig: "阿尔卡蒂奥",
        colorClass: "ct-jose",
        aliases: [
          { id: "a1", characterId: "c1", alias: "阿尔卡蒂奥·布恩迪亚", isPrimary: true },
          { id: "a2", characterId: "c1", alias: "阿尔卡蒂奥", isPrimary: false },
        ],
      }),
      makeChar({
        id: "c2",
        nick: "霍老",
        orig: "何塞·阿尔卡蒂奥·布恩迪亚",
        colorClass: "ct-jose",
        aliases: [
          { id: "a3", characterId: "c2", alias: "何塞·阿尔卡蒂奥·布恩迪亚", isPrimary: true },
        ],
      }),
    ];

    // The full name "何塞·阿尔卡蒂奥·布恩迪亚" should be matched as c2
    // and "阿尔卡蒂奥" standalone should be matched as c1
    const result = annotateText("何塞·阿尔卡蒂奥·布恩迪亚看着阿尔卡蒂奥。", chars);

    // Should have 2 ruby tags (one per character)
    const rubyCount = (result.match(/<ruby class="cn/g) ?? []).length;
    expect(rubyCount).toBe(2);

    expect(result).toContain("何塞·阿尔卡蒂奥·布恩迪亚<rt>霍老</rt></ruby>");
    expect(result).toContain("阿尔卡蒂奥<rt>霍三</rt></ruby>");
  });

  it("handles nick as alias when different from orig", () => {
    const chars = [
      makeChar({
        nick: "乌苏拉",
        orig: "乌尔苏拉·伊瓜兰",
        aliases: [
          { id: "a1", characterId: "char-1", alias: "乌尔苏拉·伊瓜兰", isPrimary: true },
          { id: "a2", characterId: "char-1", alias: "乌尔苏拉", isPrimary: false },
        ],
      }),
    ];

    const result = annotateText("乌尔苏拉来了，乌苏拉也来了。", chars);
    const rubyCount = (result.match(/<ruby class="cn/g) ?? []).length;
    expect(rubyCount).toBe(2);
  });
});
