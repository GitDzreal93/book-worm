import { describe, it, expect } from "vitest";
import { processReview, isDue, sortByPriority } from "@/lib/srs";

describe("SM-2: processReview", () => {
  const baseParams = {
    easeFactor: 2.5,
    interval: 0,
    repetitionCount: 0,
  };

  it("first correct review (quality=5): increments repetitionCount, sets interval=1, increases easeFactor", () => {
    const result = processReview(baseParams, 5);

    expect(result.repetitionCount).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBeGreaterThan(2.5);
    expect(result.nextReviewDate).toBeInstanceOf(Date);
  });

  it("second correct review (quality=4): interval goes from 1 to 6", () => {
    const prev = processReview(baseParams, 5);
    const result = processReview(
      {
        easeFactor: prev.easeFactor,
        interval: prev.interval,
        repetitionCount: prev.repetitionCount,
      },
      4
    );

    expect(result.interval).toBe(6);
    expect(result.repetitionCount).toBe(2);
  });

  it("subsequent correct review: interval = round(prevInterval * easeFactor)", () => {
    // Simulate two correct reviews first
    const first = processReview(baseParams, 5);
    const second = processReview(
      { easeFactor: first.easeFactor, interval: first.interval, repetitionCount: first.repetitionCount },
      4
    );

    const result = processReview(
      { easeFactor: second.easeFactor, interval: second.interval, repetitionCount: second.repetitionCount },
      4
    );

    expect(result.repetitionCount).toBe(3);
    expect(result.interval).toBe(Math.round(second.interval * second.easeFactor));
  });

  it("incorrect review (quality=0-2): resets repetitionCount to 0 and interval to 1", () => {
    for (const quality of [0, 1, 2]) {
      const result = processReview(
        { easeFactor: 2.5, interval: 10, repetitionCount: 5 },
        quality
      );

      expect(result.repetitionCount).toBe(0);
      expect(result.interval).toBe(1);
    }
  });

  it("easeFactor never goes below 1.3", () => {
    const result = processReview(
      { easeFactor: 1.3, interval: 6, repetitionCount: 2 },
      0
    );

    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe("isDue", () => {
  it("returns true when nextReviewDate is null", () => {
    expect(isDue(null)).toBe(true);
  });

  it("returns true when nextReviewDate is in the past", () => {
    const past = new Date();
    past.setMinutes(past.getMinutes() - 10);

    expect(isDue(past.toISOString())).toBe(true);
  });

  it("returns false when nextReviewDate is in the future", () => {
    const future = new Date();
    future.setMinutes(future.getMinutes() + 10);

    expect(isDue(future.toISOString())).toBe(false);
  });
});

describe("sortByPriority", () => {
  it("puts null dates first, then sorts ascending", () => {
    const words = [
      { nextReviewDate: new Date("2026-04-01").toISOString() },
      { nextReviewDate: null },
      { nextReviewDate: new Date("2026-03-20").toISOString() },
      { nextReviewDate: new Date("2026-03-25").toISOString() },
      { nextReviewDate: null },
    ];

    const sorted = sortByPriority(words);

    // Nulls first
    expect(sorted[0].nextReviewDate).toBeNull();
    expect(sorted[1].nextReviewDate).toBeNull();

    // Then ascending dates
    expect(new Date(sorted[2].nextReviewDate!).getTime()).toBeLessThanOrEqual(
      new Date(sorted[3].nextReviewDate!).getTime()
    );
    expect(new Date(sorted[3].nextReviewDate!).getTime()).toBeLessThanOrEqual(
      new Date(sorted[4].nextReviewDate!).getTime()
    );
  });
});
