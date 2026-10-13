import { describe, expect, it } from "vitest";
import { eclipticPosition } from "@/lib/astro/zodiac";
import type { Chart, PlanetId, PlanetLongitudes, PlanetPlacement } from "@/types/chart";
import {
  CENTER,
  LANES,
  OUTER_RADIUS,
  WHEEL_SIZE,
  layoutMarkers,
  markerPositions,
  placePlanets,
  pointAt,
  signDividers,
} from "./wheel-geometry";

const SPREAD_OUT: PlanetLongitudes = {
  sun: 0,
  moon: 36,
  mercury: 72,
  venus: 108,
  mars: 144,
  jupiter: 180,
  saturn: 216,
  uranus: 252,
  neptune: 288,
  pluto: 324,
};

function chartWith(longitudes: PlanetLongitudes, rising = 100): Chart {
  const planets = Object.fromEntries(
    Object.entries(longitudes).map(([planet, longitude]) => [
      planet,
      { ...eclipticPosition(longitude), house: 1 },
    ]),
  ) as Record<PlanetId, PlanetPlacement>;
  return {
    birthTimeKnown: false,
    moment: { utc: "1990-06-14T11:00:00.000Z", zone: "UTC", utcOffsetMinutes: 0, dstAdjustment: "none" },
    ascendant: eclipticPosition(rising),
    moonSignCertain: false,
    planets,
    houses: [],
    aspects: [],
  };
}

function radii(chart: Chart): Record<string, number> {
  return Object.fromEntries(placePlanets(chart).map((p) => [p.planet, p.radius]));
}

describe("pointAt", () => {
  it("puts the rising degree at 9 o'clock", () => {
    const p = pointAt(100, 100, 50);
    expect(p.x).toBeCloseTo(CENTER - 50, 9);
    expect(p.y).toBeCloseTo(CENTER, 9);
  });

  it("runs counterclockwise: 90° later is at 6 o'clock", () => {
    const p = pointAt(190, 100, 50);
    expect(p.x).toBeCloseTo(CENTER, 9);
    expect(p.y).toBeCloseTo(CENTER + 50, 9);
  });
});

describe("signDividers", () => {
  it("draws twelve, one at each 30°", () => {
    const dividers = signDividers(15);
    expect(dividers).toHaveLength(12);
    // 0° comes 15° before the rising degree, so it sits just above 9 o'clock.
    expect(dividers[0].from.x).toBeLessThan(CENTER);
    expect(dividers[0].from.y).toBeLessThan(CENTER);
  });
});

describe("markerPositions", () => {
  it("sits two numbers outside the ring and apart from each other", () => {
    const at = { x: CENTER + 100, y: CENTER };
    const [first, second] = markerPositions(at, 2);
    expect(first.x - CENTER).toBeGreaterThan(OUTER_RADIUS);
    expect(second.x - CENTER).toBeGreaterThan(OUTER_RADIUS);
    expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThan(12);
    expect(Math.hypot(first.x - CENTER, first.y - CENTER)).toBeLessThan(WHEEL_SIZE / 2);
  });
});

describe("layoutMarkers", () => {
  it("eases apart markers of points that sit close together", () => {
    const [first, second] = layoutMarkers([
      { point: "sun", at: pointAt(0, 0, 125), numbers: [2] },
      { point: "moon", at: pointAt(4, 0, 125), numbers: [2] },
    ]);
    expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThan(14);
    for (const marker of [first, second]) {
      expect(Math.hypot(marker.x - CENTER, marker.y - CENTER)).toBeLessThan(WHEEL_SIZE / 2 - 4);
    }
  });
});

describe("placePlanets", () => {
  it("keeps planets that are far apart on the first ring", () => {
    expect(new Set(Object.values(radii(chartWith(SPREAD_OUT))))).toEqual(new Set([LANES[0]]));
  });

  it("moves a planet close to another onto the next ring", () => {
    const r = radii(chartWith({ ...SPREAD_OUT, moon: 3, mercury: 6 }));
    expect([r.sun, r.moon, r.mercury]).toEqual([LANES[0], LANES[1], LANES[2]]);
  });

  it("sees planets on either side of 0° as close", () => {
    const r = radii(chartWith({ ...SPREAD_OUT, sun: 359, moon: 2 }));
    expect(r.moon).toBe(LANES[0]);
    expect(r.sun).toBe(LANES[1]);
  });
});
