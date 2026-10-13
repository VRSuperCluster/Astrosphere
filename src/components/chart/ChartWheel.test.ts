import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { eclipticPosition } from "@/lib/astro/zodiac";
import type { Chart, PlanetId, PlanetLongitudes, PlanetPlacement } from "@/types/chart";
import { ChartWheel, markersFor } from "./ChartWheel";

const LONGITUDES: PlanetLongitudes = {
  sun: 10,
  moon: 40,
  mercury: 70,
  venus: 100,
  mars: 130,
  jupiter: 160,
  saturn: 190,
  uranus: 220,
  neptune: 250,
  pluto: 280,
};

function chart(birthTimeKnown: boolean): Chart {
  const planets = Object.fromEntries(
    Object.entries(LONGITUDES).map(([planet, longitude]) => [planet, { ...eclipticPosition(longitude), house: 1 }]),
  ) as Record<PlanetId, PlanetPlacement>;
  const shared = {
    moment: { utc: "1990-06-14T11:00:00.000Z", zone: "UTC", utcOffsetMinutes: 0, dstAdjustment: "none" as const },
    ascendant: eclipticPosition(100),
    midheaven: eclipticPosition(10),
    planets,
    houses: [],
    aspects: [],
  };
  return birthTimeKnown
    ? { ...shared, birthTimeKnown: true }
    : { ...shared, birthTimeKnown: false, moonSignCertain: false };
}

describe("markersFor", () => {
  it("gives one point the numbers of every card that uses it", () => {
    expect(
      markersFor([
        { pointIds: ["sun", "mercury"] },
        { pointIds: ["sun"] },
        { pointIds: ["mars"] },
      ]),
    ).toEqual({ sun: [1, 2], mercury: [1], mars: [3] });
  });
});

describe("ChartWheel", () => {
  it("gives the ring, each divider, each axis and each point a stable id", () => {
    const html = renderToStaticMarkup(
      ChartWheel({
        chart: chart(true),
        markers: { sun: [1, 2], asc: [3] },
      }),
    );

    for (const id of [
      "wheel-rings",
      "wheel-ring",
      "wheel-ring-inner",
      "wheel-dividers",
      "wheel-axes",
      "wheel-axis-asc",
      "wheel-axis-mc",
      "wheel-points",
      "wheel-point-sun",
      "wheel-marker-sun-1",
      "wheel-marker-sun-2",
      "wheel-marker-asc-3",
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    for (let divider = 1; divider <= 12; divider++) {
      expect(html).toContain(`id="wheel-divider-${divider}"`);
    }
  });

  it("leaves out dividers and axes when the birth time is unknown", () => {
    const html = renderToStaticMarkup(ChartWheel({ chart: chart(false) }));
    expect(html).toContain('id="wheel-point-sun"');
    expect(html).not.toContain("wheel-divider");
    expect(html).not.toContain("wheel-axis");
  });
});
