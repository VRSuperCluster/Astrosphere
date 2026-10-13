import { describe, expect, it } from "vitest";
import { calculateChart } from "@/lib/astro/chart";
import type { Chart, PointId } from "@/types/chart";
import type { Place } from "@/types/places";
import {
  buildSummaryPrompt,
  NO_LIFE_AREAS_INSTRUCTION,
  summaryPointsFor,
  summarySchemaFor,
} from "./summary";

const LONDON: Place = {
  id: 2643743,
  name: "London",
  latitude: 51.50853,
  longitude: -0.12574,
  timezone: "Europe/London",
};

// London, June 1990: the Moon stays in Aquarius all of the 13th and changes sign during the 14th.
const TIMED = calculateChart({
  date: { year: 1990, month: 6, day: 14 },
  time: { known: true, time: { hour: 14, minute: 30 } },
  place: LONDON,
});
const SOLAR_MOON_CERTAIN = calculateChart({ date: { year: 1990, month: 6, day: 13 }, time: { known: false }, place: LONDON });
const SOLAR_MOON_UNCERTAIN = calculateChart({ date: { year: 1990, month: 6, day: 14 }, time: { known: false }, place: LONDON });

const card = (...pointIds: string[]) => ({ pointIds, pattern: "You stall.", rule: "Decide by noon." });
const summary = (...patterns: ReturnType<typeof card>[]) => ({ read: "You lead with charm.", patterns });
const valid = summary(card("sun"), card("venus", "mars"), card("saturn", "mercury", "jupiter"));

const accepts = (chart: Chart, value: unknown) => summarySchemaFor(chart).safeParse(value).success;

describe("summaryPointsFor", () => {
  it("offers every planet plus the Ascendant and MC with a birth time", () => {
    expect(summaryPointsFor(TIMED)).toEqual([
      "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "asc", "mc",
    ]);
  });

  it("drops the angles without a birth time, and the Moon unless its sign is certain", () => {
    expect(summaryPointsFor(SOLAR_MOON_CERTAIN)).not.toContain("asc");
    expect(summaryPointsFor(SOLAR_MOON_CERTAIN)).not.toContain("mc");
    expect(summaryPointsFor(SOLAR_MOON_CERTAIN)).toContain("moon");
    expect(summaryPointsFor(SOLAR_MOON_UNCERTAIN)).not.toContain("moon");
  });
});

describe("summarySchemaFor", () => {
  it("accepts three cards with 1–3 known points each", () => {
    expect(accepts(TIMED, valid)).toBe(true);
    expect(accepts(TIMED, summary(card("asc"), card("mc", "moon"), card("sun")))).toBe(true);
  });

  it.each([2, 4])("rejects %d cards", (count) => {
    expect(accepts(TIMED, summary(...Array.from({ length: count }, () => card("sun"))))).toBe(false);
  });

  it("rejects no points, four points, a repeated point and an unknown ID", () => {
    expect(accepts(TIMED, summary(card(), card("sun"), card("sun")))).toBe(false);
    expect(accepts(TIMED, summary(card("sun", "moon", "venus", "mars"), card("sun"), card("sun")))).toBe(false);
    expect(accepts(TIMED, summary(card("sun", "sun"), card("sun"), card("sun")))).toBe(false);
    expect(accepts(TIMED, summary(card("chiron"), card("sun"), card("sun")))).toBe(false);
  });

  it.each<PointId>(["asc", "mc"])("rejects %s without a birth time", (point) => {
    expect(accepts(SOLAR_MOON_CERTAIN, summary(card(point), card("sun"), card("venus")))).toBe(false);
  });

  it("accepts the Moon only when its sign is certain", () => {
    const withMoon = summary(card("moon"), card("sun"), card("venus"));
    expect(accepts(SOLAR_MOON_CERTAIN, withMoon)).toBe(true);
    expect(accepts(SOLAR_MOON_UNCERTAIN, withMoon)).toBe(false);
  });

  it("names the bad point and the allowed ones, for the repair request", () => {
    const result = summarySchemaFor(SOLAR_MOON_UNCERTAIN).safeParse(summary(card("asc"), card("sun"), card("venus")));
    expect(result.success).toBe(false);
    const message = result.error?.issues[0].message;
    expect(message).toContain("asc isn't a point in this chart");
    expect(message).toContain("sun, mercury, venus");
  });

  it("rejects empty text", () => {
    expect(accepts(TIMED, { ...valid, read: "   " })).toBe(false);
  });
});

describe("buildSummaryPrompt", () => {
  const userPayload = (chart: Chart) => JSON.parse(buildSummaryPrompt(chart, {}).user);

  it("gives a timed chart's points their houses, plus the Ascendant and MC", () => {
    const { system, user } = buildSummaryPrompt(TIMED, {});
    const payload = JSON.parse(user);
    const sun = payload.points.find((p: { id: string }) => p.id === "sun");
    expect(sun).toMatchObject({ sign: TIMED.planets.sun.sign, house: TIMED.planets.sun.house });
    expect(payload.points.map((p: { id: string }) => p.id)).toEqual(expect.arrayContaining(["asc", "mc"]));
    expect(system).not.toContain(NO_LIFE_AREAS_INSTRUCTION);
  });

  describe.each([
    ["with the Moon's sign certain", SOLAR_MOON_CERTAIN],
    ["with the Moon's sign uncertain", SOLAR_MOON_UNCERTAIN],
  ])("without a birth time, %s", (_, chart) => {
    it("carries no house data and no Ascendant or MC", () => {
      const { user } = buildSummaryPrompt(chart, {});
      expect(user).not.toMatch(/house/i);
      const ids: string[] = userPayload(chart).points.map((p: { id: string }) => p.id);
      expect(ids).not.toContain("asc");
      expect(ids).not.toContain("mc");
      expect(user).not.toMatch(/"(asc|mc)"/);
    });

    it("tells the model not to name life areas and offers only this chart's IDs", () => {
      const { system } = buildSummaryPrompt(chart, {});
      expect(system).toContain(NO_LIFE_AREAS_INSTRUCTION);
      expect(system).toContain(`pointIds may only use these IDs: ${summaryPointsFor(chart).join(", ")}.`);
    });
  });

  it("gives a certain Moon its sign and nothing else", () => {
    const moon = userPayload(SOLAR_MOON_CERTAIN).points.find((p: { id: string }) => p.id === "moon");
    expect(moon).toEqual({ id: "moon", sign: SOLAR_MOON_CERTAIN.planets.moon.sign });
  });

  it("leaves an uncertain Moon out entirely", () => {
    expect(buildSummaryPrompt(SOLAR_MOON_UNCERTAIN, {}).user).not.toContain('"moon"');
  });

  it("describes the context answers in plain words, without the option labels", () => {
    const payload = JSON.parse(
      buildSummaryPrompt(TIMED, { firstName: "Ada", lifeArea: "career", changeStance: "inTheMiddle" }).user,
    );
    expect(payload.person).toEqual({
      firstName: "Ada",
      partOfLifeChangingMost: "work and career",
      howTheyMeetChange: "they are in the middle of a big change right now",
    });
  });
});
