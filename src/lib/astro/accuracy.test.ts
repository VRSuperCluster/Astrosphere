import { describe, expect, it } from "vitest";
import type { Planet, ZodiacSign } from "@/types/chart";
import type { Place } from "@/types/places";
import type { BirthDate, BirthTime } from "@/types/questionnaire";
import { calculateChart } from "./chart";
import { PLANETS } from "./ephemeris";
import { SIGNS } from "./zodiac";

/**
 * Astro-Seek (Swiss Ephemeris) shows whole arc-minutes, cut down rather than
 * rounded, so ours run up to 1′ above it. The project allows 0.1°.
 */
const TOLERANCE_DEGREES = 2 / 60;

/** Sign, degrees and arc-minutes, as Astro-Seek prints them. */
type Reading = [ZodiacSign, number, number];

interface ReferenceChart {
  name: string;
  date: BirthDate;
  time: BirthTime;
  /** Astro-Seek's coordinates, not our geocoder's, so both sides get the same input. */
  place: Pick<Place, "latitude" | "longitude" | "timezone">;
  planets: Record<Planet, { at: Reading; house: number }>;
  ascendant: Reading;
  midheaven: Reading;
}

const REFERENCE_CHARTS: ReferenceChart[] = [
  {
    name: "Donald Trump",
    date: { year: 1946, month: 6, day: 14 },
    time: { hour: 10, minute: 54 },
    // Queens, NY: 40°41′N, 73°50′W
    place: { latitude: 40 + 41 / 60, longitude: -(73 + 50 / 60), timezone: "America/New_York" },
    planets: {
      sun: { at: ["gemini", 22, 55], house: 11 },
      moon: { at: ["sagittarius", 21, 12], house: 5 },
      mercury: { at: ["cancer", 8, 51], house: 12 },
      venus: { at: ["cancer", 25, 44], house: 12 },
      mars: { at: ["leo", 26, 46], house: 1 },
      jupiter: { at: ["libra", 17, 27], house: 3 },
      saturn: { at: ["cancer", 23, 48], house: 12 },
      uranus: { at: ["gemini", 17, 53], house: 11 },
      neptune: { at: ["libra", 5, 50], house: 3 },
      pluto: { at: ["leo", 10, 2], house: 1 },
    },
    ascendant: ["leo", 29, 56],
    midheaven: ["taurus", 24, 20],
  },
  {
    name: "Keanu Reeves",
    date: { year: 1964, month: 9, day: 2 },
    time: { hour: 5, minute: 41 },
    // Beirut: 33°54′N, 35°30′E
    place: { latitude: 33 + 54 / 60, longitude: 35 + 30 / 60, timezone: "Asia/Beirut" },
    planets: {
      sun: { at: ["virgo", 9, 41], house: 1 },
      moon: { at: ["cancer", 16, 19], house: 11 },
      mercury: { at: ["virgo", 9, 57], house: 1 },
      venus: { at: ["cancer", 23, 54], house: 11 },
      mars: { at: ["cancer", 21, 48], house: 11 },
      jupiter: { at: ["taurus", 25, 51], house: 9 },
      saturn: { at: ["pisces", 1, 2], house: 7 },
      uranus: { at: ["virgo", 10, 23], house: 1 },
      neptune: { at: ["scorpio", 15, 25], house: 3 },
      pluto: { at: ["virgo", 13, 49], house: 1 },
    },
    ascendant: ["virgo", 14, 53],
    midheaven: ["gemini", 13, 28],
  },
  {
    name: "Jennifer Lawrence",
    date: { year: 1990, month: 8, day: 15 },
    time: { hour: 15, minute: 20 },
    // Louisville, KY: 38°15′N, 85°46′W
    place: {
      latitude: 38 + 15 / 60,
      longitude: -(85 + 46 / 60),
      timezone: "America/Kentucky/Louisville",
    },
    planets: {
      sun: { at: ["leo", 22, 41], house: 9 },
      moon: { at: ["gemini", 21, 10], house: 7 },
      mercury: { at: ["virgo", 19, 37], house: 10 },
      venus: { at: ["leo", 2, 18], house: 9 },
      mars: { at: ["taurus", 21, 33], house: 6 },
      jupiter: { at: ["cancer", 29, 27], house: 8 },
      saturn: { at: ["capricorn", 19, 50], house: 2 },
      uranus: { at: ["capricorn", 5, 57], house: 2 },
      neptune: { at: ["capricorn", 12, 11], house: 2 },
      pluto: { at: ["scorpio", 15, 5], house: 12 },
    },
    ascendant: ["sagittarius", 2, 51],
    midheaven: ["virgo", 17, 8],
  },
];

function toLongitude([sign, degrees, minutes]: Reading): number {
  return SIGNS.indexOf(sign) * 30 + degrees + minutes / 60;
}

function expectNear(actual: number, reading: Reading): void {
  const difference = ((actual - toLongitude(reading) + 540) % 360) - 180;
  expect(Math.abs(difference)).toBeLessThan(TOLERANCE_DEGREES);
}

describe.each(REFERENCE_CHARTS)("$name matches Astro-Seek", (reference) => {
  const chart = calculateChart({
    date: reference.date,
    time: { known: true, time: reference.time },
    place: { id: 0, name: reference.name, ...reference.place },
  });
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
