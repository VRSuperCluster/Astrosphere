import { describe, expect, it } from "vitest";
import { calculateChart } from "./chart";
import type { EphemerisProvider } from "./ephemeris";
import { DAY_MS } from "./search";
import { calendarWindow, transitReport } from "./transits";
import { normalizeDegrees } from "./zodiac";

const T0 = Date.UTC(2026, 0, 1);
/** 30° in 40 days, so Jupiter leaves Aries on 10 February 2026. */
const DEG_PER_DAY = 30 / 40;

/**
 * Jupiter moves, and every other planet sits at 0°. The Ascendant of the
 * chart below is 90° (0° Cancer), so Aries is house 10 and Taurus is house 11.
 */
const movingJupiter: EphemerisProvider = {
  longitude: (planet, instant) =>
    planet === "jupiter" ? normalizeDegrees(((instant.getTime() - T0) / DAY_MS) * DEG_PER_DAY) : 0,
  siderealTime: () => 0,
  obliquity: () => 23.44,
};

describe("house placements", () => {
  it("keeps the stay's real start and end, including dates outside the window", () => {
    const chart = calculateChart(
      {
        date: { year: 1990, month: 6, day: 14 },
        time: { known: true, time: { hour: 12, minute: 0 } },
        place: { id: 0, name: "Test point", latitude: 0, longitude: 0, timezone: "UTC" },
      },
      { longitude: () => 0, siderealTime: () => 0, obliquity: () => 23.44 },
    );
    const report = transitReport(
      chart,
      { start: new Date(Date.UTC(2026, 0, 11)), months: 2, planets: ["saturn"] },
      movingJupiter,
    );
    const jupiter = report.placements.filter((placement) => placement.planet === "jupiter");

    expect(jupiter).toEqual([
      { id: "jupiter-10-2026-01-01", planet: "jupiter", house: 10, start: "2026-01-01", end: "2026-02-10" },
      { id: "jupiter-11-2026-02-10", planet: "jupiter", house: 11, start: "2026-02-10", end: "2026-03-22" },
    ]);
    expect(report.window.start).toBe("2026-01-11");
    expect(report.months.find((month) => month.month === "2026-01")?.placementIds).toContain("jupiter-10-2026-01-01");
    const february = report.months.find((month) => month.month === "2026-02");
    expect(february?.placementIds).toContain("jupiter-10-2026-01-01");
    expect(february?.changes).toEqual([{ date: "2026-02-10", placementId: "jupiter-11-2026-02-10" }]);
  });

  it("shows the new stay on the card date, and the change as a later line", () => {
    const chart = calculateChart({
      date: { year: 1964, month: 9, day: 2 },
      time: { known: true, time: { hour: 5, minute: 41 } },
      place: { id: 0, name: "Beirut", latitude: 33.9, longitude: 35.5, timezone: "Asia/Beirut" },
    });
    const report = transitReport(chart, calendarWindow(new Date("2026-10-15T12:00:00Z"), chart.moment.zone));
    const jupiter = report.placements.filter((placement) => placement.planet === "jupiter");
    const october = report.months.find((month) => month.month === "2026-10");
    const july = report.months.find((month) => month.month === "2027-07");
    const august = report.months.find((month) => month.month === "2027-08");
    const saturn = report.placements.find((placement) => placement.planet === "saturn");

    expect(jupiter.map((placement) => [placement.house, placement.start, placement.end])).toEqual([
      [12, expect.any(String), "2027-07-26"],
      [1, "2027-07-26", expect.any(String)],
    ]);
    expect(jupiter[0].start < report.window.start).toBe(true);
    expect(jupiter[1].end > report.window.end).toBe(true);
    expect(october?.placementIds).toContain(jupiter[0].id);
    expect(july?.placementIds).toContain(jupiter[0].id);
    expect(july?.placementIds).not.toContain(jupiter[1].id);
    expect(july?.changes).toEqual([{ date: "2027-07-26", placementId: jupiter[1].id }]);
    expect(august?.placementIds).toContain(jupiter[1].id);
    expect(august?.changes).toEqual([]);
    expect(saturn?.start < report.window.start).toBe(true);
    expect(saturn?.end > report.window.end).toBe(true);
    expect(report.months.every((month) => month.placementIds.length === 5)).toBe(true);
  });

  it("leaves placements out when the birth time is unknown", () => {
    const chart = calculateChart({
      date: { year: 1990, month: 6, day: 13 },
      time: { known: false },
      place: { id: 0, name: "London", latitude: 51.5, longitude: -0.12, timezone: "Europe/London" },
    });
    const report = transitReport(chart, { start: new Date("2026-10-15T12:00:00Z") });
    expect(report.placements).toEqual([]);
    expect(report.months.every((month) => month.placementIds.length === 0 && month.changes.length === 0)).toBe(true);
  });
});
