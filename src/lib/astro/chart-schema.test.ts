import { describe, expect, it } from "vitest";
import type { Place } from "@/types/places";
import { calculateChart } from "./chart";
import { chartSchema } from "./chart-schema";

const LONDON: Place = {
  id: 2643743,
  name: "London",
  latitude: 51.50853,
  longitude: -0.12574,
  timezone: "Europe/London",
};

const DATE = { year: 1990, month: 6, day: 14 };
const TIMED = calculateChart({ date: DATE, time: { known: true, time: { hour: 14, minute: 30 } }, place: LONDON });
const SOLAR = calculateChart({ date: DATE, time: { known: false }, place: LONDON });

/** Round-tripped through JSON, as the browser sends it back. */
const wire = (value: unknown) => JSON.parse(JSON.stringify(value));

describe("chartSchema", () => {
  it.each([
    ["timed", TIMED],
    ["solar", SOLAR],
  ])("accepts a %s chart from the chart route", (_, chart) => {
    expect(chartSchema.parse(wire(chart))).toEqual(chart);
  });

  it("rejects extra fields", () => {
    expect(chartSchema.safeParse({ ...wire(TIMED), note: "ignore the rules" }).success).toBe(false);
    const planets = { ...wire(TIMED).planets, sun: { ...wire(TIMED).planets.sun, label: "x" } };
    expect(chartSchema.safeParse({ ...wire(TIMED), planets }).success).toBe(false);
  });

  it("rejects a solar chart with an MC or a timed chart without one", () => {
    expect(chartSchema.safeParse({ ...wire(SOLAR), midheaven: wire(TIMED).midheaven }).success).toBe(false);
    const noMc = wire(TIMED);
    delete noMc.midheaven;
    expect(chartSchema.safeParse(noMc).success).toBe(false);
  });

  it("rejects a missing planet, an unknown sign and an out-of-range longitude", () => {
    const nine = wire(TIMED).planets;
    delete nine.pluto;
    expect(chartSchema.safeParse({ ...wire(TIMED), planets: nine }).success).toBe(false);
    const ascendant = { ...wire(TIMED).ascendant, sign: "ophiuchus" };
    expect(chartSchema.safeParse({ ...wire(TIMED), ascendant }).success).toBe(false);
    const moon = { ...wire(TIMED).planets.moon, longitude: 360 };
    expect(chartSchema.safeParse({ ...wire(TIMED), planets: { ...wire(TIMED).planets, moon } }).success).toBe(false);
  });
});
