import { describe, expect, it } from "vitest";
import { cacheKey } from "@/lib/ai/session-cache";
import { CALENDAR_PROMPT_VERSION } from "@/lib/ai/versions";
import { localDate } from "@/lib/astro/timezone";
import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { calendarCacheKey } from "./useCalendar";

const ANSWERS = {
  birthDate: { year: 1990, month: 6, day: 14 },
  birthTime: { known: true, time: { hour: 14, minute: 30 } },
  placeOfBirth: {
    id: 2643743,
    name: "London",
    latitude: 51.50853,
    longitude: -0.12574,
    timezone: "Europe/London",
  },
  firstName: "Ada",
} satisfies QuestionnaireAnswers;

describe("calendarCacheKey", () => {
  it("includes the calendar prompt version and the birth zone's date", () => {
    const now = Date.UTC(2026, 9, 15, 23, 30);
    const day = localDate(now, "Europe/London");
    const key = calendarCacheKey(ANSWERS, "Europe/London", now);

    expect(day).not.toBe(localDate(now, "UTC"));
    expect(key).toBe(cacheKey({ output: "calendar", promptVersion: CALENDAR_PROMPT_VERSION }, ANSWERS, day));
    expect(key).not.toBe(cacheKey({ output: "calendar", promptVersion: "calendar-2" }, ANSWERS, day));
    expect(key).not.toBe(cacheKey({ output: "calendar", promptVersion: CALENDAR_PROMPT_VERSION }, ANSWERS));
  });
});
