import { describe, expect, it } from "vitest";
import { PLANETS } from "./ephemeris";
import { castReference, REFERENCE_CHARTS, toLongitude, type Reading } from "./reference-charts";

/**
 * Astro-Seek (Swiss Ephemeris) shows whole arc-minutes, cut down rather than
 * rounded, so ours run up to 1′ above it. The project allows 0.1°.
 */
const TOLERANCE_DEGREES = 2 / 60;

function expectNear(actual: number, reading: Reading): void {
  const difference = ((actual - toLongitude(reading) + 540) % 360) - 180;
  expect(Math.abs(difference)).toBeLessThan(TOLERANCE_DEGREES);
}

describe.each(REFERENCE_CHARTS)("$name matches Astro-Seek", (reference) => {
  const chart = castReference(reference);
  if (!chart.birthTimeKnown) throw new Error("expected a timed chart");

  it.each(PLANETS)("%s", (planet) => {
    expectNear(chart.planets[planet].longitude, reference.planets[planet].at);
    expect(chart.planets[planet].house).toBe(reference.planets[planet].house);
  });

  it("Ascendant", () => {
    expectNear(chart.ascendant.longitude, reference.ascendant);
  });

  it("MC", () => {
    expectNear(chart.midheaven.longitude, reference.midheaven);
  });
});
