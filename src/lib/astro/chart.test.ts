import { describe, expect, it } from "vitest";
import type { ChartInput, Planet, PlanetLongitudes } from "@/types/chart";
import type { Place } from "@/types/places";
import { calculateChart } from "./chart";
import { PLANETS, type EphemerisProvider } from "./ephemeris";

const LONDON: Place = {
  id: 2643743,
  name: "London",
  country: "United Kingdom",
  latitude: 51.50853,
  longitude: -0.12574,
  timezone: "Europe/London",
};

const EQUATOR_AT_GREENWICH: Place = {
  id: 0,
  name: "Test point",
  latitude: 0,
  longitude: 0,
  timezone: "UTC",
};

const FIXED_LONGITUDES: PlanetLongitudes = {
  sun: 85, // Gemini
  moon: 90, // Cancer, on its first degree
  mercury: 119.99, // Cancer, on its last
  venus: 120, // Leo
  mars: 359.99, // Pisces
  jupiter: 0, // Aries
  saturn: 200, // Libra
  uranus: 270, // Capricorn
  neptune: 275, // Capricorn
  pluto: 210, // Scorpio
};

/** At the equator with sidereal time 0, 0° Aries culminates and 0° Cancer rises. */
function fixedProvider(siderealTime = 0): EphemerisProvider {
  return {
    longitude: (planet: Planet) => FIXED_LONGITUDES[planet],
    siderealTime: () => siderealTime,
    obliquity: () => 23.44,
  };
}

const DATE = { year: 1990, month: 6, day: 14 };

describe("calculateChart with a known birth time", () => {
  const input: ChartInput = {
    date: DATE,
    time: { known: true, time: { hour: 14, minute: 30 } },
    place: EQUATOR_AT_GREENWICH,
  };

  it("counts Whole Sign houses from the Ascendant's sign", () => {
    const chart = calculateChart(input, fixedProvider());
    expect(chart.ascendant.sign).toBe("cancer");
    expect(chart.houses).toEqual([
      "cancer",
      "leo",
      "virgo",
      "libra",
      "scorpio",
      "sagittarius",
      "capricorn",
      "aquarius",
      "pisces",
      "aries",
      "taurus",
      "gemini",
    ]);
    const houses = Object.fromEntries(PLANETS.map((p) => [p, chart.planets[p].house]));
    expect(houses).toEqual({
      sun: 12,
      moon: 1,
      mercury: 1,
      venus: 2,
      mars: 9,
      jupiter: 10,
      saturn: 4,
      uranus: 7,
      neptune: 7,
      pluto: 5,
    });
  });

  it("gives each planet its sign and degree", () => {
    const chart = calculateChart(input, fixedProvider());
    expect(chart.planets.sun).toEqual({ longitude: 85, sign: "gemini", degreeInSign: 25, house: 12 });
    expect(chart.planets.mars.sign).toBe("pisces");
  });

  it("includes the MC", () => {
    const chart = calculateChart(input, fixedProvider());
    expect(chart.birthTimeKnown).toBe(true);
    if (chart.birthTimeKnown) {
      expect(chart.midheaven.longitude).toBeCloseTo(0, 9);
      expect(chart.midheaven.sign).toBe("aries");
    }
  });

  it.each([
    [90, 90],
    [-90, 270],
  ])("reads place longitude %d° as east positive", (longitude, expectedMc) => {
    const chart = calculateChart(
      { ...input, place: { ...EQUATOR_AT_GREENWICH, longitude } },
      fixedProvider(0),
    );
    if (!chart.birthTimeKnown) throw new Error("expected a timed chart");
    expect(chart.midheaven.longitude).toBeCloseTo(expectedMc, 9);
  });

  it("converts the local birth time to UTC in the place's zone", () => {
    const chart = calculateChart({ ...input, place: LONDON }, fixedProvider());
    expect(chart.moment).toMatchObject({ utc: "1990-06-14T13:30:00.000Z", dstAdjustment: "none" });
  });
});

describe("calculateChart without a birth time", () => {
  const input: ChartInput = { date: DATE, time: { known: false }, place: LONDON };

  it("casts for local noon", () => {
    const chart = calculateChart(input, fixedProvider());
    expect(chart.moment.utc).toBe("1990-06-14T11:00:00.000Z");
  });

  it("puts the Sun on the Ascendant and its sign in house 1", () => {
    const chart = calculateChart(input, fixedProvider());
    expect(chart.birthTimeKnown).toBe(false);
    expect(chart.ascendant).toEqual({ longitude: 85, sign: "gemini", degreeInSign: 25 });
    expect(chart.houses[0]).toBe("gemini");
    expect(chart.planets.sun.house).toBe(1);
    expect(chart.planets.moon.house).toBe(2);
    expect(chart.planets.mars.house).toBe(10);
  });

  it("has no MC", () => {
    expect(calculateChart(input, fixedProvider())).not.toHaveProperty("midheaven");
  });
});

describe("calculateChart with the real ephemeris", () => {
  it.each([
    ["London", LONDON],
    ["Tromsø, inside the Arctic Circle", { ...LONDON, latitude: 69.6492, longitude: 18.9553, timezone: "Europe/Oslo" }],
    ["Ushuaia, far south", { ...LONDON, latitude: -54.8019, longitude: -68.303, timezone: "America/Argentina/Ushuaia" }],
  ])("casts a consistent chart for %s", (_, place: Place) => {
    for (const hour of [0, 6, 12, 18]) {
      const chart = calculateChart({ date: DATE, time: { known: true, time: { hour, minute: 0 } }, place });
      expect(chart.houses).toHaveLength(12);
      expect(chart.houses[0]).toBe(chart.ascendant.sign);
      for (const planet of PLANETS) {
        const placement = chart.planets[planet];
        expect(chart.houses[placement.house - 1]).toBe(placement.sign);
      }
    }
  });
});
