import { describe, expect, it } from "vitest";
import { aspectAt, ASPECTS, natalAspects, separation } from "./aspects";

describe("separation", () => {
  it.each([
    [10, 50, 40],
    [50, 10, 40],
    [350, 10, 20],
    [0, 180, 180],
    [90, 300, 150],
  ])("from %d° to %d° is %d°", (a, b, expected) => {
    expect(separation(a, b)).toBeCloseTo(expected, 9);
  });
});

describe("aspectAt", () => {
  it.each([
    [0, "conjunction"],
    [58, "sextile"],
    [96.5, "square"],
    [113, "trine"],
    [175, "opposition"],
  ])("reads %d° as a %s", (degrees, aspect) => {
    expect(aspectAt(degrees)?.aspect).toBe(aspect);
  });

  it("counts an aspect right at the edge of its orb, and not past it", () => {
    expect(aspectAt(90 + ASPECTS.square.orb)).toEqual({ aspect: "square", orb: ASPECTS.square.orb });
    expect(aspectAt(90 + ASPECTS.square.orb + 0.01)).toBeNull();
  });

  it("finds nothing between aspects", () => {
    expect(aspectAt(30)).toBeNull();
    expect(aspectAt(150)).toBeNull();
  });
});

describe("natalAspects", () => {
  it("finds a conjunction across 0°", () => {
    expect(
      natalAspects([
        ["mars", 359.5],
        ["jupiter", 1.5],
      ]),
    ).toEqual([{ points: ["mars", "jupiter"], aspect: "conjunction", orb: expect.closeTo(2, 9) }]);
  });

  it("skips pairs of slower planets", () => {
    expect(
      natalAspects([
        ["uranus", 270],
        ["neptune", 272],
      ]),
    ).toEqual([]);
  });

  it("skips the Ascendant to MC angle", () => {
    expect(
      natalAspects([
        ["asc", 0],
        ["mc", 270],
      ]),
    ).toEqual([]);
  });

  it("lists the tightest first, each pair in the order given", () => {
    const aspects = natalAspects([
      ["sun", 10],
      ["moon", 196],
      ["saturn", 101],
    ]);
    expect(aspects.map((a) => [a.points, a.aspect])).toEqual([
      [["sun", "saturn"], "square"],
      [["moon", "saturn"], "square"],
      [["sun", "moon"], "opposition"],
    ]);
  });
});
