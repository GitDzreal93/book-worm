import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("@/lib/prisma", () => ({
  prisma: {
    dictionaryCache: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai-client", () => ({
  generateCompletion: vi.fn(),
}));

// Import after mocks are set up
import { lookupWord } from "@/lib/dictionary";
import { prisma } from "@/lib/prisma";
import { generateCompletion } from "@/lib/ai-client";

const mockFindUnique = vi.mocked(prisma.dictionaryCache.findUnique);
const mockCreate = vi.mocked(prisma.dictionaryCache.create);
const mockGenerateCompletion = vi.mocked(generateCompletion);

describe("lookupWord", () => {
  const params = { word: "run", bookId: "book-1" };

  const cachedResult = {
    definition: "to move swiftly on foot",
    partOfSpeech: "verb",
    phonetic: "/rʌn/",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default fetch mock (returns 404 by default)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
  });

  it("returns cached result from DB when available", async () => {
    mockFindUnique.mockResolvedValue({
      id: "cache-1",
      word: "run",
      bookId: "book-1",
      definition: cachedResult.definition,
      partOfSpeech: cachedResult.partOfSpeech,
      phonetic: cachedResult.phonetic,
      createdAt: new Date(),
    });

    const result = await lookupWord(params);

    expect(result).toEqual(cachedResult);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { word_bookId: { word: "run", bookId: "book-1" } },
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(mockGenerateCompletion).not.toHaveBeenCalled();
  });

  it("falls back to Wiktionary when DB cache miss", async () => {
    mockFindUnique.mockResolvedValue(null);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        // Wiktionary API response shape for a successful lookup
        en: {
          definitions: [
            {
              partOfSpeech: "verb",
              definition: "to move swiftly on foot",
            },
          ],
        },
      }),
    });

    const result = await lookupWord(params);

    expect(result.definition).toBeDefined();
    expect(result.partOfSpeech).toBeDefined();
    expect(globalThis.fetch).toHaveBeenCalled();
    expect(mockGenerateCompletion).not.toHaveBeenCalled();
  });

  it("falls back to LLM when Wiktionary has no result", async () => {
    mockFindUnique.mockResolvedValue(null);

    // Wiktionary returns empty/no definitions
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    mockGenerateCompletion.mockResolvedValue(
      JSON.stringify({
        definition: "to move swiftly on foot",
        partOfSpeech: "verb",
        phonetic: "/rʌn/",
      })
    );

    const result = await lookupWord(params);

    expect(result.definition).toBe("to move swiftly on foot");
    expect(result.partOfSpeech).toBe("verb");
    expect(result.phonetic).toBe("/rʌn/");
    expect(mockGenerateCompletion).toHaveBeenCalled();
  });

  it("passes context to LLM for disambiguation", async () => {
    mockFindUnique.mockResolvedValue(null);

    // Wiktionary returns no result, triggering LLM fallback
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    mockGenerateCompletion.mockResolvedValue(
      JSON.stringify({
        definition: "to operate or function",
        partOfSpeech: "verb",
        phonetic: "/rʌn/",
      })
    );

    const result = await lookupWord({ ...params, context: "The program runs smoothly." });

    expect(mockGenerateCompletion).toHaveBeenCalledWith(
      expect.stringContaining("The program runs smoothly."),
      expect.any(String)
    );
    expect(result.definition).toBe("to operate or function");
  });

  it("caches new result in DB after lookup", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "cache-new",
      word: "run",
      bookId: "book-1",
      definition: "to move swiftly on foot",
      partOfSpeech: "verb",
      phonetic: "/rʌn/",
      createdAt: new Date(),
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        en: {
          definitions: [
            {
              partOfSpeech: "verb",
              definition: "to move swiftly on foot",
            },
          ],
        },
      }),
    });

    await lookupWord(params);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        word: "run",
        bookId: "book-1",
        definition: expect.any(String),
        partOfSpeech: expect.anything(),
        phonetic: expect.anything(),
      },
    });
  });

  it("handles Wiktionary API errors gracefully", async () => {
    mockFindUnique.mockResolvedValue(null);

    // Simulate a network error
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    mockGenerateCompletion.mockResolvedValue(
      JSON.stringify({
        definition: "to move swiftly on foot",
        partOfSpeech: "verb",
        phonetic: "/rʌn/",
      })
    );

    const result = await lookupWord(params);

    // Should fall back to LLM and still return a result
    expect(result.definition).toBe("to move swiftly on foot");
    expect(mockGenerateCompletion).toHaveBeenCalled();
  });
});
