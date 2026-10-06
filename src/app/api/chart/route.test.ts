import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@/lib/astro/chart";
import type { ChartErrorResponse, ChartResponse } from "@/types/chart";
import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { POST } from "./route";

vi.mock("@/lib/astro/chart", { spy: true });

const ANSWERS = {
  birthDate: { year: 1990, month: 6, day: 14 },
  birthTime: { known: true, time: { hour: 14, minute: 30 } },
  placeOfBirth: {
    id: 2643743,
    name: "London",
    region: "England",
    country: "United Kingdom",
    latitude: 51.50853,
    longitude: -0.12574,
    timezone: "Europe/London",
  },
  firstName: "Ada",
  lifeArea: "career",
} satisfies QuestionnaireAnswers;

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/chart", () => {
  it("casts a timed chart from the answers", async () => {
    const response = await post(ANSWERS);
    expect(response.status).toBe(200);
    const { chart } = (await response.json()) as ChartResponse;
    expect(chart.birthTimeKnown).toBe(true);
    expect(chart.moment).toMatchObject({ utc: "1990-06-14T13:30:00.000Z", zone: "Europe/London" });
    expect(chart).toHaveProperty("midheaven");
    expect(chart.houses[0]).toBe(chart.ascendant.sign);
  });

  it("casts a solar chart when the time is unknown", async () => {
    const response = await post({ ...ANSWERS, birthTime: { known: false } });
    expect(response.status).toBe(200);
    const { chart } = (await response.json()) as ChartResponse;
    expect(chart.birthTimeKnown).toBe(false);
    expect(chart.moment.utc).toBe("1990-06-14T11:00:00.000Z");
    expect(chart.ascendant).toEqual({
      longitude: chart.planets.sun.longitude,
      sign: chart.planets.sun.sign,
      degreeInSign: chart.planets.sun.degreeInSign,
    });
  });

  it("passes only the birth answers to the calculation", async () => {
    await post(ANSWERS);
    expect(calculateChart).toHaveBeenLastCalledWith({
      date: ANSWERS.birthDate,
      time: ANSWERS.birthTime,
      place: ANSWERS.placeOfBirth,
    });
  });

  it.each([
    ["no place", { ...ANSWERS, placeOfBirth: undefined }],
    ["no time answer", { ...ANSWERS, birthTime: undefined }],
    ["a date that doesn't exist", { ...ANSWERS, birthDate: { year: 1990, month: 2, day: 30 } }],
    ["a year before the minimum", { ...ANSWERS, birthDate: { year: 1899, month: 12, day: 31 } }],
    ["a date in the future", { ...ANSWERS, birthDate: { year: 9999, month: 1, day: 1 } }],
    ["a fractional day", { ...ANSWERS, birthDate: { year: 1990, month: 6, day: 14.5 } }],
    ["a date given as strings", { ...ANSWERS, birthDate: { year: "1990", month: "6", day: "14" } }],
    ["hour 24", { ...ANSWERS, birthTime: { known: true, time: { hour: 24, minute: 0 } } }],
    ["a known time with no time", { ...ANSWERS, birthTime: { known: true } }],
    ["the server's zone", { ...ANSWERS, placeOfBirth: { ...ANSWERS.placeOfBirth, timezone: "local" } }],
    ["a fixed offset", { ...ANSWERS, placeOfBirth: { ...ANSWERS.placeOfBirth, timezone: "UTC+3" } }],
    ["latitude past the pole", { ...ANSWERS, placeOfBirth: { ...ANSWERS.placeOfBirth, latitude: 91 } }],
    ["an array", [ANSWERS]],
    ["null", null],
  ])("rejects %s with 400", async (_, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid answers" } satisfies ChartErrorResponse);
  });

  it("rejects a body that isn't JSON", async () => {
    const response = await post("{birthDate:");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Body is not JSON" } satisfies ChartErrorResponse);
  });

  it("answers 500 without the birth data when the calculation throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(calculateChart).mockImplementationOnce(() => {
      throw new Error("failed near 1990-06-14T13:30:00.000Z");
    });
    const response = await post(ANSWERS);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Chart calculation failed",
    } satisfies ChartErrorResponse);
    expect(log).toHaveBeenCalledWith("Chart calculation failed");
    log.mockRestore();
  });
});

describe("POST /api/chart, the latest accepted date", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is tomorrow in UTC once it is 10:00 UTC, because UTC+14 is already there", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T10:00:00Z"));

    const tomorrow = await post({ ...ANSWERS, birthDate: { year: 2026, month: 10, day: 7 } });
    expect(tomorrow.status).toBe(200);

    const dayAfter = await post({ ...ANSWERS, birthDate: { year: 2026, month: 10, day: 8 } });
    expect(dayAfter.status).toBe(400);
  });
});
