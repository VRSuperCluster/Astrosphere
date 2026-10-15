import { describe, expect, it } from "vitest";
import type { Chart, PlanetLongitudes } from "@/types/chart";
import type { Place } from "@/types/places";
import type { Transit } from "@/types/transit";
import { calculateChart } from "./chart";
import type { EphemerisProvider } from "./ephemeris";
import { DAY_MS } from "./search";
import { localDate } from "./timezone";
import { calendarWindow, transitReport } from "./transits";
import { normalizeDegrees } from "./zodiac";

const T0 = Date.UTC(2027, 0, 1);

const EQUATOR_AT_GREENWICH: Place = { id: 0, name: "Test point", latitude: 0, longitude: 0, timezone: "UTC" };

/**
 * 14.6° forward a year with a 4° wobble: the planet loops back between about
 * day 127 (it turns retrograde) and day 238 (direct again).
 */
function loop(days: number): number {
  return 0.04 * days + 4 * Math.sin((2 * Math.PI * days) / 365);
}

/** Inside the loop's backward stretch, so it is crossed three times. */
const LOOP_TARGET = 7.3;

/** Saturn reaches `exactAt` three times: about days 84, 182 and 282 after T0. */
function loopingSaturn(exactAt: number): EphemerisProvider {
  return {
    longitude: (planet, instant) =>
      planet === "saturn" ? normalizeDegrees(exactAt - LOOP_TARGET + loop((instant.getTime() - T0) / DAY_MS)) : 0,
    siderealTime: () => 0,
    obliquity: () => 23.44,
  };
}

/**
 * Saturn a degree a day, at d° at noon on day d: it passes every aspect to
 * every point once a year. Noon keeps exact hits away from the date line.
 */
const lappingSaturn: EphemerisProvider = {
  longitude: (planet, instant) =>
    planet === "saturn" ? normalizeDegrees((instant.getTime() - T0) / DAY_MS - 0.5) : 0,
  siderealTime: () => 0,
  obliquity: () => 23.44,
};

/** Days after T0 at which `loop` reaches the target, found by brute force every ten minutes. */
function exactDays(): number[] {
  const step = 1 / 144;
  const days: number[] = [];
  for (let d = -400; d < 800; d += step) {
    if (loop(d) - LOOP_TARGET < 0 !== loop(d + step) - LOOP_TARGET < 0) days.push(d + step / 2);
  }
  return days;
}
const EXACT_DAYS = exactDays();

/**
 * Sun at `sun`; the other planets 45° off it in every hard aspect, so the
 * looping Saturn only ever aspects the Sun. The Ascendant comes out at 90°.
 */
function natalChart(sun: number, options: { known?: boolean; place?: Place } = {}): Chart {
  const away = sun + 45;
  const longitudes: PlanetLongitudes = {
    sun,
    moon: normalizeDegrees(away),
    mercury: normalizeDegrees(away + 90),
    venus: normalizeDegrees(away + 180),
    mars: normalizeDegrees(away + 270),
    jupiter: 0,
    saturn: 0,
    uranus: 0,
    neptune: 0,
    pluto: 0,
  };
  return calculateChart(
    {
      date: { year: 1990, month: 6, day: 14 },
      time: options.known === false ? { known: false } : { known: true, time: { hour: 12, minute: 0 } },
      place: options.place ?? EQUATOR_AT_GREENWICH,
    },
    { longitude: (planet) => longitudes[planet], siderealTime: () => 0, obliquity: () => 23.44 },
  );
}

function toSun(transits: Transit[]): Transit[] {
  return transits.filter((transit) => transit.natal === "sun");
}

function dateOf(day: number, zone = "UTC"): string {
  return localDate(T0 + day * DAY_MS, zone);
}

describe("transitReport: exact hits", () => {
  it("finds a three-pass run and numbers it", () => {
    expect(EXACT_DAYS).toHaveLength(3);
    const chart = natalChart(145);
    const { transits } = transitReport(chart, { start: new Date(T0), planets: ["saturn"] }, loopingSaturn(145));
    expect(toSun(transits)).toEqual(
      EXACT_DAYS.map((day, i) => ({
        id: `saturn-conjunction-sun-${dateOf(day)}`,
        date: dateOf(day),
        transiting: "saturn",
        natal: "sun",
        aspect: "conjunction",
        house: chart.planets.sun.house,
        pass: i + 1,
        totalPasses: 3,
        previousPassInWindow: i > 0,
        nextPassInWindow: i < EXACT_DAYS.length - 1,
      })),
    );
  });

  it("counts passes that came before the window", () => {
    const start = new Date(T0 + ((EXACT_DAYS[0] + EXACT_DAYS[1]) / 2) * DAY_MS);
    const { transits } = transitReport(natalChart(145), { start, planets: ["saturn"] }, loopingSaturn(145));
    expect(toSun(transits).map((t) => [t.date, t.pass, t.totalPasses, t.previousPassInWindow, t.nextPassInWindow])).toEqual([
      [dateOf(EXACT_DAYS[1]), 2, 3, false, true],
      [dateOf(EXACT_DAYS[2]), 3, 3, true, false],
    ]);
  });

  it("counts passes still to come after the window", () => {
    // Twelve months ending between the first and second pass.
    const start = new Date(T0 + ((EXACT_DAYS[0] + EXACT_DAYS[1]) / 2 - 365) * DAY_MS);
    const { transits } = transitReport(natalChart(145), { start, planets: ["saturn"] }, loopingSaturn(145));
    expect(toSun(transits).map((t) => [t.date, t.pass, t.totalPasses, t.previousPassInWindow, t.nextPassInWindow])).toEqual([
      [dateOf(EXACT_DAYS[0]), 1, 3, false, false],
    ]);
  });

  it("follows a run across 0°", () => {
    const { transits } = transitReport(natalChart(0.3), { start: new Date(T0), planets: ["saturn"] }, loopingSaturn(0.3));
    expect(toSun(transits).map((t) => [t.aspect, t.pass, t.totalPasses])).toEqual([
      ["conjunction", 1, 3],
      ["conjunction", 2, 3],
      ["conjunction", 3, 3],
    ]);
  });

  it.each([
    ["square, planet ahead", 145 + 90, "square"],
    ["opposition", 145 + 180, "opposition"],
    ["square, planet behind", 145 - 90, "square"],
  ])("finds the %s", (_, exactAt, aspect) => {
    const { transits } = transitReport(natalChart(145), { start: new Date(T0), planets: ["saturn"] }, loopingSaturn(exactAt));
    expect(toSun(transits).map((t) => [t.aspect, t.pass, t.totalPasses])).toEqual([
      [aspect, 1, 3],
      [aspect, 2, 3],
      [aspect, 3, 3],
    ]);
  });

  it("treats each square as its own run", () => {
    // Square from behind at 55°, then conjunct, square from ahead, opposite.
    const { transits } = transitReport(natalChart(145), { start: new Date(T0), planets: ["saturn"] }, lappingSaturn);
    expect(toSun(transits).map((t) => [t.date, t.aspect, t.pass, t.totalPasses])).toEqual([
      [dateOf(55), "square", 1, 1],
      [dateOf(145), "conjunction", 1, 1],
      [dateOf(235), "square", 1, 1],
      [dateOf(325), "opposition", 1, 1],
    ]);
  });

  it("puts the Ascendant in house 1", () => {
    const { transits } = transitReport(natalChart(145), { start: new Date(T0), planets: ["saturn"] }, lappingSaturn);
    const toAsc = transits.filter((t) => t.natal === "asc");
    // At 90°: squared on days 0 and 360, conjunct on 90, squared on 180, opposite on 270.
    expect(toAsc.map((t) => t.aspect)).toEqual(["square", "conjunction", "square", "opposition", "square"]);
    expect(toAsc.every((t) => t.house === 1)).toBe(true);
  });

  it("leaves out the Ascendant, the Moon and houses without a birth time", () => {
    const chart = natalChart(145, { known: false });
    const report = transitReport(chart, { start: new Date(T0), planets: ["saturn"], monthlyOrb: 30 }, lappingSaturn);
    expect(new Set(report.transits.map((t) => t.natal))).toEqual(new Set(["sun", "mercury", "venus", "mars"]));
    expect(report.transits.every((t) => t.house === null)).toBe(true);
    const active = report.months.flatMap((month) => month.active.map((a) => a.natal));
    expect(active).not.toContain("moon");
    expect(active).not.toContain("asc");
  });

  it("dates each hit on the calendar of the birth zone", () => {
    for (const timezone of ["Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
      const chart = natalChart(145, { place: { ...EQUATOR_AT_GREENWICH, timezone } });
      const { transits } = transitReport(chart, { start: new Date(T0), planets: ["saturn"] }, loopingSaturn(145));
      expect(toSun(transits).map((t) => t.date)).toEqual(EXACT_DAYS.map((day) => dateOf(day, timezone)));
    }
  });

  it("gives the same hit the same ID and labels whatever the window", () => {
    const later = new Date(T0 + 100 * DAY_MS);
    const a = transitReport(natalChart(145), { start: new Date(T0), planets: ["saturn"] }, loopingSaturn(145));
    const b = transitReport(natalChart(145), { start: later, planets: ["saturn"] }, loopingSaturn(145));
    const labels = (t: Transit) => [t.id, t.date, t.pass, t.totalPasses];
    expect(toSun(b.transits).map(labels)).toEqual(toSun(a.transits).slice(1).map(labels));
    expect(toSun(a.transits)[1].previousPassInWindow).toBe(true);
    expect(toSun(b.transits)[0].previousPassInWindow).toBe(false);
  });

  it("lists hits in date order with unique IDs", () => {
    const { transits } = transitReport(natalChart(145), { start: new Date(T0), planets: ["saturn"] }, lappingSaturn);
    const dates = transits.map((t) => t.date);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(transits.map((t) => t.id)).size).toBe(transits.length);
  });
});

describe("transitReport: stations", () => {
  // The loop's speed, 0.04 + 4 · 2π/365 · cos(2πd/365), is zero where cos = −0.04 · 365 / 8π.
  const turn = (Math.acos((-0.04 * 365) / (8 * Math.PI)) * 365) / (2 * Math.PI);

  it("finds the turn backward and the turn forward, each in its month", () => {
    const { months } = transitReport(natalChart(145), { start: new Date(T0), planets: ["saturn"] }, loopingSaturn(145));
    expect(months.flatMap((month) => month.stations)).toEqual([
      { planet: "saturn", direction: "retrograde", date: dateOf(turn) },
      { planet: "saturn", direction: "direct", date: dateOf(365 - turn) },
    ]);
    const may = months.find((month) => month.month === dateOf(turn).slice(0, 7));
    expect(may?.stations.map((s) => s.direction)).toEqual(["retrograde"]);
  });

  it("finds none for a planet that never turns", () => {
    const { months } = transitReport(natalChart(145), { start: new Date(T0), planets: ["saturn"] }, lappingSaturn);
    expect(months.flatMap((month) => month.stations)).toEqual([]);
  });
});

describe("transitReport: months", () => {
  it("covers twelve months from the start's month, the first one partial", () => {
    const report = transitReport(
      natalChart(145),
      { start: new Date(Date.UTC(2027, 2, 15, 18)), planets: ["saturn"] },
      loopingSaturn(145),
    );
    expect(report.window).toEqual({ start: "2027-03-15", end: "2028-03-15" });
    expect(report.months.map((month) => month.month)).toEqual([
      "2027-03",
      "2027-04",
      "2027-05",
      "2027-06",
      "2027-07",
      "2027-08",
      "2027-09",
      "2027-10",
      "2027-11",
      "2027-12",
      "2028-01",
      "2028-02",
    ]);
  });

  it("runs from the start of the day through 31 December of the next year", () => {
    const cases = [
      ["2026-10-15", 15, "2026-10"],
      ["2026-01-02", 24, "2026-01"],
      ["2026-12-31", 13, "2026-12"],
    ] as const;
    for (const [iso, count, first] of cases) {
      const report = transitReport(
        natalChart(145),
        { ...calendarWindow(new Date(`${iso}T18:00:00Z`), "UTC"), planets: ["saturn"] },
        loopingSaturn(145),
      );
      expect(report.window).toEqual({ start: iso, end: "2028-01-01" });
      expect(report.months).toHaveLength(count);
      expect(report.months[0].month).toBe(first);
      expect(report.months.at(-1)?.month).toBe("2027-12");
    }

    const evening = new Date("2026-10-15T22:30:00Z");
    expect(localDate(calendarWindow(evening, "Asia/Beirut").start.getTime(), "Asia/Beirut")).toBe("2026-10-16");
    expect(localDate(calendarWindow(evening, "Europe/London").start.getTime(), "Europe/London")).toBe("2026-10-15");
  });

  it("lists a transit as active in the month it is exact, with that month's hits", () => {
    const report = transitReport(natalChart(145), { start: new Date(T0), planets: ["saturn"] }, loopingSaturn(145));
    const first = report.transits[0];
    const month = report.months.find((m) => m.month === first.date.slice(0, 7));
    const monthStartDay = (Date.parse(`${month?.month}-01T00:00:00Z`) - T0) / DAY_MS;
    expect(month?.active).toContainEqual({
      transiting: "saturn",
      natal: "sun",
      aspect: "conjunction",
      closestOrb: 0,
      orbAtStart: expect.closeTo(Math.abs(loop(monthStartDay) - LOOP_TARGET), 2),
      orbAtEnd: expect.any(Number),
      transitIds: [first.id],
    });
  });

  it("leaves out a month where the transit stays wider than the orb", () => {
    // In January the planet is still more than 4° short.
    const january = (orb: number) =>
      transitReport(natalChart(145), { start: new Date(T0), planets: ["saturn"], monthlyOrb: orb }, loopingSaturn(145))
        .months[0];
    expect(january(2).active).toEqual([]);
    expect(january(5).active).toEqual([
      expect.objectContaining({ natal: "sun", closestOrb: expect.closeTo(4.03, 1), transitIds: [] }),
    ]);
  });
});
