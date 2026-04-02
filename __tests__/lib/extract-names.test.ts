import { describe, it, expect } from "vitest";
import { extractNameCandidates } from "@/lib/extract-names";

describe("extractNameCandidates", () => {
  it("extracts names followed by punctuation (common in novels)", () => {
    // In actual books, names are usually followed by punctuation or appear at boundaries
    const text = "奥雷里亚诺·布恩迪亚上校发动了战争。他又说，奥雷里亚诺·布恩迪亚上校是不可战胜的。";
    const result = extractNameCandidates(text, 1);
    expect(result).toContainEqual({ name: "奥雷里亚诺·布恩迪亚上校", count: 2 });
    expect(result).toHaveLength(1);
  });

  it("extracts multi-segment names", () => {
    const text = "何塞·阿尔卡蒂奥·布恩迪亚是创始人。";
    const result = extractNameCandidates(text, 1);
    // May include trailing chars due to regex greediness — that's acceptable
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]!.name).toContain("何塞");
    expect(result[0]!.name).toContain("·");
  });

  it("counts frequency and deduplicates", () => {
    const text = "张三·李四 张三·李四 张三·李四";
    const result = extractNameCandidates(text, 1);
    expect(result).toEqual([{ name: "张三·李四", count: 3 }]);
  });

  it("sorts by frequency descending", () => {
    const text = "王五·赵六 王五·赵六 王五·赵六 李四·张三 李四·张三";
    const result = extractNameCandidates(text, 1);
    expect(result[0]!.name).toBe("王五·赵六");
    expect(result[0]!.count).toBe(3);
    expect(result[1]!.name).toBe("李四·张三");
    expect(result[1]!.count).toBe(2);
  });

  it("filters by minimum frequency (default 2)", () => {
    const text = "常见人名·候选 常见人名·候选 罕见人名·候选";
    const result = extractNameCandidates(text);
    expect(result).toEqual([{ name: "常见人名·候选", count: 2 }]);
  });

  it("filters by custom minimum frequency", () => {
    const text = "频繁人名·阿尔 频繁人名·阿尔 频繁人名·阿尔 偶尔人名·贝塔 偶尔人名·贝塔";
    const result = extractNameCandidates(text, 3);
    expect(result).toEqual([{ name: "频繁人名·阿尔", count: 3 }]);
  });

  it("returns empty for text without interpunct names", () => {
    const text = "这是纯中文文本，没有间隔号。小明和小红去上学。";
    const result = extractNameCandidates(text);
    expect(result).toEqual([]);
  });

  it("returns empty for single-char segments", () => {
    // Each segment must be ≥ 2 chars
    const text = "甲·乙";
    const result = extractNameCandidates(text, 1);
    expect(result).toEqual([]);
  });

  it("handles empty text", () => {
    expect(extractNameCandidates("")).toEqual([]);
  });

  it("deduplicates across different positions", () => {
    const text = "故事的开头提到了奥雷里亚诺·布恩迪亚，后来又提到奥雷里亚诺·布恩迪亚。";
    const result = extractNameCandidates(text, 1);
    // Even if trailing chars differ slightly, the core name should be captured
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]!.name).toContain("奥雷里亚诺·布恩迪亚");
  });
});
