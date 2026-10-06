import { describe, expect, it } from "vitest";
import type { Planet } from "@/types/chart";
import { astronomyEngine, PLANETS, planetLongitudes, type EphemerisProvider } from "./ephemeris";

/** Signed difference a − b in degrees, in (−180, 180], so 359.99 vs 0.01 is 0.02 apart. */
function angularDifference(a: number, b: number): number {
  const d = (((a - b) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/** 36″. Astronomy Engine agrees with JPL to within about 18″ across these dates. */
const TOLERANCE_DEGREES = 0.01;

const INSTANTS = [
  "1905-01-01T12:00:00Z",
  "1950-03-15T06:00:00Z",
  "1990-06-14T13:30:00Z",
  "2026-10-06T00:00:00Z",
] as const;

/**
 * JPL Horizons, geocentric (500@399), quantity 31 (ObsEcLon): apparent
 * longitude on the ecliptic of date, with light time and aberration.
 * Columns follow INSTANTS.
 */
const HORIZONS: Record<Planet, readonly [number, number, number, number]> = {
  sun: [280.4345916, 354.0887496, 83.2340888, 192.7601479],
  moon: [227.2760912, 315.1940729, 332.9822875, 134.5673154],
  mercury: [278.4283507, 342.4473364, 64.102196, 217.0206839],
  venus: [322.8277377, 311.5266374, 47.6755017, 218.3487414],
  mars: [203.653306, 185.0574301, 10.3667942, 124.5772348],
  jupiter: [20.71859, 323.6192011, 105.6866254, 140.4687787],
  saturn: [318.6024968, 165.4125094, 294.0864526, 11.1856489],
  uranus: [270.7183317, 90.9509053, 278.2015812, 65.4329664],
  neptune: [96.6789037, 196.5805853, 283.7404323, 2.7249367],
  pluto: [80.3367233, 136.1915925, 225.4205591, 303.0930866],
};

describe("astronomyEngine.longitude", () => {
  describe.each(INSTANTS.map((iso, column) => [iso, column] as const))("at %s", (iso, column) => {
    it.each(PLANETS)("matches JPL Horizons for %s", (planet) => {
      const longitude = astronomyEngine.longitude(planet, new Date(iso));
      expect(
        Math.abs(angularDifference(longitude, HORIZONS[planet][column])),
      ).toBeLessThan(TOLERANCE_DEGREES);
    });
  });

  it("stays within 0 ≤ λ < 360", () => {
    // The Sun passes 0° at the March equinox: 20 March 2024, 03:06 UTC.
    for (const iso of ["2024-03-20T03:00:00Z", "2024-03-20T03:12:00Z"]) {
      const longitude = astronomyEngine.longitude("sun", new Date(iso));
      expect(longitude).toBeGreaterThanOrEqual(0);
      expect(longitude).toBeLessThan(360);
    }
  });

  it("throws an Error on an invalid date", () => {
    expect(() => astronomyEngine.longitude("sun", new Date("not a date"))).toThrow(Error);
  });
});

/** Meeus, Astronomical Algorithms (2nd ed.), examples 12.a and 22.a: 10 April 1987, 0h. */
const MEEUS_1987 = new Date("1987-04-10T00:00:00Z");

describe("astronomyEngine.siderealTime", () => {
  it("matches Meeus", () => {
    // 13h 10m 46.1351s
    expect(astronomyEngine.siderealTime(MEEUS_1987)).toBeCloseTo(197.69223, 3);
  });

  it.each([
    // JPL Horizons, quantity 7 at Greenwich (000).
    [INSTANTS[0], 280.4674871], // 18h 41m 52.1969s
    [INSTANTS[2], 105.0876375], // 07h 00m 21.0330s
    [INSTANTS[3], 14.6730054], // 00h 58m 41.5213s
  ])("matches JPL Horizons at %s", (iso, expected) => {
    expect(
      Math.abs(angularDifference(astronomyEngine.siderealTime(new Date(iso)), expected)),
    ).toBeLessThan(0.001);
  });

  it("throws an Error on an invalid date", () => {
    expect(() => astronomyEngine.siderealTime(new Date(Number.NaN))).toThrow(Error);
  });
});

describe("astronomyEngine.obliquity", () => {
  it("matches Meeus", () => {
    // 23° 26′ 36.850″
    expect(astronomyEngine.obliquity(MEEUS_1987)).toBeCloseTo(23.443569, 4);
  });

  it("throws an Error on an invalid date", () => {
    expect(() => astronomyEngine.obliquity(new Date(Number.NaN))).toThrow(Error);
  });
});

describe("planetLongitudes", () => {
  it("returns every planet", () => {
    const longitudes = planetLongitudes(new Date(INSTANTS[2]));
    expect(Object.keys(longitudes)).toEqual(PLANETS);
    for (const planet of PLANETS) {
      expect(
        Math.abs(angularDifference(longitudes[planet], HORIZONS[planet][2])),
      ).toBeLessThan(TOLERANCE_DEGREES);
    }
  });

  it("reads from whichever provider it is given", () => {
    const fixed: EphemerisProvider = {
      longitude: (planet) => PLANETS.indexOf(planet) * 30,
      siderealTime: () => 0,
      obliquity: () => 23.44,
    };
    expect(planetLongitudes(new Date(INSTANTS[0]), fixed)).toMatchObject({
      sun: 0,
      moon: 30,
      pluto: 270,
    });
  });
});
