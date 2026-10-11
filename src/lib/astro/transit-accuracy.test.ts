import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import type { PlanetId } from "@/types/chart";
import type { Station, TransitAspectId, TransitTarget } from "@/types/transit";
import { ephemeris, memoized } from "./ephemeris";
import { LAWRENCE, castReference, TRUMP, type ReferenceChart } from "./reference-charts";
import { findStations } from "./stations";
import { TRANSIT_TARGETS } from "./transit-pairs";
import { DEFAULT_TRANSIT_OPTIONS, OUTER_PLANETS, transitReport } from "./transits";

/** The brute-force check covers these twelve months. */
const WINDOW_START = { year: 2027, month: 1, day: 1 };

/**
 * Astro-Seek dates hits in another zone than the birth zone, so one near
 * midnight can land a day apart. Near a station a planet moves ~0.003° a
 * day, and Astro-Seek's natal positions are cut to whole arc-minutes, so
 * those hits can drift the same day either way.
 */
const TOLERANCE_DAYS = 1;

/** As Astro-Seek lists it, in our names: "conjunction DSC" is an opposition to the Ascendant. */
type ListedHit = [date: string, transiting: PlanetId, aspect: TransitAspectId, natal: TransitTarget];

interface AstroSeekExport {
  name: string;
  reference: ReferenceChart;
  planets: readonly PlanetId[];
  /** YYYY-MM-DD, inclusive: the export's start and its last line. */
  from: string;
  to: string;
  /** Which engine hits the export can show at all. */
  covers: (aspect: TransitAspectId, natal: TransitTarget) => boolean;
  /** Only the lines the engine dates: hard aspects onto Sun to Mars and the Ascendant. */
  hits: ListedHit[];
}

/** Exports with the angles switched off show nothing for the Ascendant. */
const withoutAngles = (_: TransitAspectId, natal: TransitTarget) => natal !== "asc";

/** The lifetime conjunction list, angles on: ASC lines are conjunctions, DSC lines oppositions. */
const conjunctionsAndAngles = (aspect: TransitAspectId, natal: TransitTarget) =>
  aspect === "conjunction" || (natal === "asc" && aspect === "opposition");

const ASTRO_SEEK_EXPORTS: AstroSeekExport[] = [
  {
    name: "Lawrence, conjunctions 2027–2046",
    reference: LAWRENCE,
    planets: OUTER_PLANETS,
    from: "2027-01-01",
    to: "2046-02-09",
    covers: conjunctionsAndAngles,
    hits: [
      ["2027-02-06", "jupiter", "conjunction", "sun"],
      ["2027-04-02", "uranus", "opposition", "asc"],
      ["2027-06-16", "jupiter", "conjunction", "sun"],
      ["2027-10-28", "jupiter", "conjunction", "mercury"],
      ["2028-04-06", "jupiter", "conjunction", "mercury"],
      ["2028-06-20", "jupiter", "conjunction", "mercury"],
      ["2029-07-03", "saturn", "conjunction", "mars"],
      ["2029-11-13", "saturn", "conjunction", "mars"],
      ["2030-03-23", "saturn", "conjunction", "mars"],
      ["2030-06-24", "saturn", "opposition", "asc"],
      ["2030-07-24", "uranus", "conjunction", "moon"],
      ["2030-11-05", "jupiter", "conjunction", "asc"],
      ["2030-12-05", "uranus", "conjunction", "moon"],
      ["2031-01-02", "saturn", "opposition", "asc"],
      ["2031-03-04", "saturn", "opposition", "asc"],
      ["2031-05-13", "uranus", "conjunction", "moon"],
      ["2031-08-20", "saturn", "conjunction", "moon"],
      ["2031-11-20", "saturn", "conjunction", "moon"],
      ["2032-05-05", "saturn", "conjunction", "moon"],
      ["2034-09-17", "saturn", "conjunction", "venus"],
      ["2035-01-17", "saturn", "conjunction", "venus"],
      ["2035-06-07", "saturn", "conjunction", "venus"],
      ["2036-04-01", "jupiter", "conjunction", "mars"],
      ["2036-05-21", "jupiter", "opposition", "asc"],
      ["2036-08-14", "saturn", "conjunction", "sun"],
      ["2036-08-16", "jupiter", "conjunction", "moon"],
      ["2036-12-12", "jupiter", "conjunction", "moon"],
      ["2037-04-07", "jupiter", "conjunction", "moon"],
      ["2038-06-24", "jupiter", "conjunction", "venus"],
      ["2038-09-12", "saturn", "conjunction", "mercury"],
      ["2038-09-28", "jupiter", "conjunction", "sun"],
      ["2039-03-19", "jupiter", "conjunction", "sun"],
      ["2039-05-16", "jupiter", "conjunction", "sun"],
      ["2039-09-19", "uranus", "conjunction", "venus"],
      ["2039-10-10", "jupiter", "conjunction", "mercury"],
      ["2039-12-30", "uranus", "conjunction", "venus"],
      ["2040-07-02", "uranus", "conjunction", "venus"],
      ["2042-10-19", "jupiter", "conjunction", "asc"],
      ["2044-08-17", "uranus", "conjunction", "sun"],
      ["2044-11-24", "saturn", "conjunction", "asc"],
    ],
  },
  {
    name: "Lawrence, Jupiter, all aspects",
    reference: LAWRENCE,
    planets: ["jupiter"],
    from: "2027-01-01",
    to: "2027-11-15",
    covers: withoutAngles,
    hits: [
      ["2027-02-06", "jupiter", "conjunction", "sun"],
      ["2027-02-14", "jupiter", "square", "mars"],
      ["2027-06-09", "jupiter", "square", "mars"],
      ["2027-06-16", "jupiter", "conjunction", "sun"],
      ["2027-10-28", "jupiter", "conjunction", "mercury"],
      ["2027-11-06", "jupiter", "square", "moon"],
    ],
  },
  {
    name: "Lawrence, Saturn, all aspects",
    reference: LAWRENCE,
    planets: ["saturn"],
    from: "2027-01-01",
    to: "2028-12-21",
    covers: withoutAngles,
    hits: [["2028-05-01", "saturn", "square", "venus"]],
  },
  {
    name: "Lawrence, Uranus, all aspects",
    reference: LAWRENCE,
    planets: ["uranus"],
    from: "2027-01-01",
    to: "2028-12-04",
    covers: withoutAngles,
    hits: [],
  },
  {
    name: "Lawrence, Neptune, all aspects",
    reference: LAWRENCE,
    planets: ["neptune"],
    from: "2027-01-01",
    to: "2028-11-05",
    covers: withoutAngles,
    hits: [],
  },
  {
    name: "Lawrence, Pluto, all aspects",
    reference: LAWRENCE,
    planets: ["pluto"],
    from: "2027-01-01",
    to: "2031-02-18",
    covers: withoutAngles,
    hits: [],
  },
  {
    name: "Trump, Jupiter, all aspects",
    reference: TRUMP,
    planets: ["jupiter"],
    from: "2027-01-01",
    to: "2028-02-02",
    covers: withoutAngles,
    hits: [
      ["2027-07-09", "jupiter", "conjunction", "mars"],
      ["2027-11-06", "jupiter", "square", "moon"],
      ["2027-11-17", "jupiter", "square", "sun"],
    ],
  },
  {
    name: "Trump, Saturn, all aspects",
    reference: TRUMP,
    planets: ["saturn"],
    from: "2027-01-01",
    to: "2028-01-07",
    covers: withoutAngles,
    hits: [
      ["2027-01-12", "saturn", "square", "mercury"],
      ["2027-06-19", "saturn", "square", "venus"],
      ["2027-09-30", "saturn", "square", "venus"],
    ],
  },
  {
    name: "Trump, Uranus, all aspects",
    reference: TRUMP,
    planets: ["uranus"],
    from: "2027-01-01",
    to: "2028-06-12",
    covers: withoutAngles,
    hits: [],
  },
  {
    name: "Trump, Neptune, all aspects",
    reference: TRUMP,
    planets: ["neptune"],
    from: "2027-01-01",
    to: "2028-07-23",
    covers: withoutAngles,
    hits: [
      // Either side of Neptune's station, 24 days apart.
      ["2028-06-29", "neptune", "square", "mercury"],
      ["2028-07-23", "neptune", "square", "mercury"],
    ],
  },
  {
    name: "Trump, Pluto, all aspects",
    reference: TRUMP,
    planets: ["pluto"],
    from: "2027-01-01",
    to: "2028-01-09",
    covers: withoutAngles,
    hits: [],
  },
];

function windowStart(reference: ReferenceChart): Date {
  return DateTime.fromObject(WINDOW_START, { zone: reference.place.timezone }).toJSDate();
}

function key(transit: { transiting: string; aspect: string; natal: string }): string {
  return `${transit.transiting}-${transit.aspect}-${transit.natal}`;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(DateTime.fromISO(a).diff(DateTime.fromISO(b), "days").days);
}

describe.each(ASTRO_SEEK_EXPORTS)("matches Astro-Seek: $name", (listing) => {
  it("finds every listed hit within a day, and nothing it doesn't list", () => {
    const zone = listing.reference.place.timezone;
    // A little either side, so hits dated a day off at the edges still meet.
    const start = DateTime.fromISO(listing.from, { zone }).minus({ days: 2 });
    const end = DateTime.fromISO(listing.to, { zone }).plus({ days: 2 });
    const months = Math.ceil(end.diff(start, "months").months);
    const ours = transitReport(castReference(listing.reference), {
      start: start.toJSDate(),
      months,
      planets: listing.planets,
    }).transits.filter((t) => listing.covers(t.aspect, t.natal));

    const missing: string[] = [];
    for (const [date, transiting, aspect, natal] of listing.hits) {
      const match = ours.findIndex(
        (t) => key(t) === key({ transiting, aspect, natal }) && daysBetween(t.date, date) <= TOLERANCE_DAYS,
      );
      if (match === -1) missing.push(`${date} ${key({ transiting, aspect, natal })}`);
      else ours.splice(match, 1);
    }
    const extra = ours.filter((t) => t.date >= listing.from && t.date <= listing.to).map((t) => t.id);
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });
});

/** Astro-Seek's 2027 station table (sR / sD), which it prints in UTC. Stations don't depend on the chart. */
const ASTRO_SEEK_STATIONS_2027: Station[] = [
  { planet: "jupiter", direction: "direct", date: "2027-04-13" },
  { planet: "saturn", direction: "retrograde", date: "2027-08-09" },
  { planet: "saturn", direction: "direct", date: "2027-12-24" },
  { planet: "uranus", direction: "direct", date: "2027-02-08" },
  { planet: "uranus", direction: "retrograde", date: "2027-09-15" },
  { planet: "neptune", direction: "retrograde", date: "2027-07-09" },
  { planet: "neptune", direction: "direct", date: "2027-12-15" },
  { planet: "pluto", direction: "retrograde", date: "2027-05-08" },
  { planet: "pluto", direction: "direct", date: "2027-10-18" },
];

describe("stations match Astro-Seek", () => {
  it("in 2027, on the same UTC dates", () => {
    const window = { start: Date.UTC(2027, 0, 1), end: Date.UTC(2028, 0, 1) };
    const byDate = (a: Station, b: Station) => a.date.localeCompare(b.date);
    expect(findStations(OUTER_PLANETS, window, memoized(ephemeris), "UTC")).toEqual(
      [...ASTRO_SEEK_STATIONS_2027].sort(byDate),
    );
  });
});

/**
 * Independent of the engine's bracketing and run search: scans the real
 * ephemeris every six hours and reads off each sign change. Outer planets
 * can't cross a degree twice in six hours, so nothing is missed.
 */
function bruteForceHits(reference: ReferenceChart): string[] {
  const chart = castReference(reference);
  if (!chart.birthTimeKnown) throw new Error("expected a timed chart");
  const sky = memoized(ephemeris);
  const zone = chart.moment.zone;
  const start = DateTime.fromObject(WINDOW_START, { zone });
  const end = start.plus({ months: DEFAULT_TRANSIT_OPTIONS.months });
  const step = 6 * 3_600_000;
  const angles: Array<[TransitAspectId, number]> = [
    ["conjunction", 0],
    ["square", 90],
    ["opposition", 180],
    ["square", 270],
  ];

  const hits: string[] = [];
  for (const planet of OUTER_PLANETS) {
    for (const natal of TRANSIT_TARGETS) {
      const natalLongitude = natal === "asc" ? chart.ascendant.longitude : chart.planets[natal].longitude;
      for (const [aspect, angle] of angles) {
        const off = (time: number) => {
          const d = (((sky.longitude(planet, new Date(time)) - natalLongitude - angle) % 360) + 360) % 360;
          return d > 180 ? d - 360 : d;
        };
        for (let time = start.toMillis(); time < end.toMillis(); time += step) {
          const [a, b] = [off(time), off(time + step)];
          if (Math.abs(a) < 10 && Math.abs(b) < 10 && a < 0 !== b < 0) {
            hits.push(`${key({ transiting: planet, aspect, natal })}@${time}`);
          }
        }
      }
    }
  }
  return hits;
}

describe.each([TRUMP, LAWRENCE])("$name: the engine matches a brute-force scan", (reference) => {
  const report = transitReport(castReference(reference), { start: windowStart(reference) });

  it("finds every crossing and nothing else", () => {
    const expected = bruteForceHits(reference)
      .map((hit) => hit.split("@")[0])
      .sort();
    expect(report.transits.map(key).sort()).toEqual(expected);
  });

  it("numbers passes consistently", () => {
    for (const transit of report.transits) {
      expect(transit.pass).toBeGreaterThanOrEqual(1);
      expect(transit.pass).toBeLessThanOrEqual(transit.totalPasses);
    }
    const byRun = Map.groupBy(report.transits, key);
    for (const run of byRun.values()) {
      const passes = run.map((t) => t.pass);
      expect(passes).toEqual([...passes].sort((a, b) => a - b));
      expect(new Set(passes).size).toBe(passes.length);
    }
  });

  it("lists twelve months and only outer planet stations", () => {
    expect(report.months).toHaveLength(12);
    for (const station of report.months.flatMap((month) => month.stations)) {
      expect(OUTER_PLANETS).toContain(station.planet);
    }
  });
});
