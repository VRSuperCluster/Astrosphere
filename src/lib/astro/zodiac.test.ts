import { describe, expect, it } from "vitest";
import { eclipticPosition, normalizeDegrees } from "./zodiac";

describe("normalizeDegrees", () => {
  it.each([
    [0, 0],
    [360, 0],
    [725, 5],
    [-10, 350],
    [-360, 0],
    [-1e-15, 0],
  ])("%d → %d", (input, expected) => {
    expect(normalizeDegrees(input)).toBeCloseTo(expected, 12);
  });

  it("never returns 360", () => {
    expect(normalizeDegrees(-1e-15)).toBeLessThan(360);
  });
});

describe("eclipticPosition", () => {
  it.each([
    [0, "aries", 0],
    [29.999, "aries", 29.999],
    [30, "taurus", 0],
    [83.234, "gemini", 23.234],
    [180, "libra", 0],
    [359.999, "pisces", 29.999],
    [360, "aries", 0],
    [-0.5, "pisces", 29.5],
  ])("%d° is %s %d°", (longitude, sign, degreeInSign) => {
    const position = eclipticPosition(longitude);
    expect(position.sign).toBe(sign);
    expect(position.degreeInSign).toBeCloseTo(degreeInSign, 9);
  });
});
