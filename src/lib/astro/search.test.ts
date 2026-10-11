import { describe, expect, it } from "vitest";
import { bisect, crosses, DAY_MS, findCrossings, MINUTE_MS } from "./search";

describe("crosses", () => {
  it.each([
    [-1, 1, true],
    [1, -1, true],
    [-1, 0, true],
    [0, -1, true],
    [1, 2, false],
    [0, 1, false],
    [-1, -2, false],
  ])("from %d to %d: %s", (before, after, expected) => {
    expect(crosses(before, after)).toBe(expected);
  });
});

describe("bisect", () => {
  it("finds a root to within a minute", () => {
    const root = 3.3 * DAY_MS;
    const time = bisect((t) => t - root, 3 * DAY_MS, 4 * DAY_MS);
    expect(Math.abs(time - root)).toBeLessThanOrEqual(MINUTE_MS / 2);
  });

  it("works for a falling function", () => {
    const root = 10.75 * DAY_MS;
    const time = bisect((t) => root - t, 10 * DAY_MS, 11 * DAY_MS);
    expect(Math.abs(time - root)).toBeLessThanOrEqual(MINUTE_MS / 2);
  });
});

describe("findCrossings", () => {
  // A sine with a period of 20 days: zero at 0, 10, 20, 30 … days.
  const wave = (t: number) => Math.sin((Math.PI * t) / (10 * DAY_MS));

  it("finds each crossing and its direction", () => {
    const found = findCrossings(wave, 0.5 * DAY_MS, 35 * DAY_MS, DAY_MS);
    expect(found.map((c) => Math.round(c.time / DAY_MS))).toEqual([10, 20, 30]);
    expect(found.map((c) => c.rising)).toEqual([false, true, false]);
  });

  it("samples the end even when the range isn't a whole number of steps", () => {
    const found = findCrossings((t) => t - 9.9 * DAY_MS, 0, 9.95 * DAY_MS, DAY_MS);
    expect(found).toHaveLength(1);
  });

  it("skips sign changes `accept` rejects", () => {
    // Steps down from +170 to −170 at day 5: a wrap, not a crossing.
    const wrap = (t: number) => (t < 5 * DAY_MS ? 170 : -170);
    expect(findCrossings(wrap, 0, 10 * DAY_MS, DAY_MS)).toHaveLength(1);
    expect(
      findCrossings(wrap, 0, 10 * DAY_MS, DAY_MS, (a, b) => Math.abs(a) < 10 && Math.abs(b) < 10),
    ).toEqual([]);
  });

  it("ignores a touch that doesn't cross", () => {
    const touch = (t: number) => ((t - 5 * DAY_MS) / DAY_MS) ** 2;
    expect(findCrossings(touch, 0, 10 * DAY_MS, DAY_MS)).toEqual([]);
  });
});
