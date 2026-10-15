import { useMemo } from "react";
import { calendarSchema } from "@/lib/ai/outputs/calendar-schema";
import { cacheKey } from "@/lib/ai/session-cache";
import { CALENDAR_PROMPT_VERSION } from "@/lib/ai/versions";
import { localDate } from "@/lib/astro/timezone";
import { parseAnswers } from "@/lib/questionnaire/storage";
import type { Calendar, CalendarRequest, CalendarResponse } from "@/types/calendar";
import type { Chart } from "@/types/chart";
import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { useCachedResult, type CachedQuery } from "./useCachedResult";

/** The calendar's cache key: prompt version, answers, and today's date in the birth zone. */
export function calendarCacheKey(answers: QuestionnaireAnswers, zone: string, now = Date.now()): string {
  return cacheKey(
    { output: "calendar", promptVersion: CALENDAR_PROMPT_VERSION },
    answers,
    localDate(now, zone),
  );
}

/**
 * The year's entries, started as soon as the chart exists.
 * A failure stays in this result. It does not touch the summary or the wheel.
 */
export function useCalendar(chart: Chart | null, savedAnswersJson: string | null | undefined) {
  const query = useMemo((): CachedQuery<Calendar> | null => {
    const answers = savedAnswersJson ? parseAnswers(savedAnswersJson) : null;
    if (!chart || !answers) return null;

    const body: CalendarRequest = {
      chart,
      firstName: answers.firstName,
      lifeArea: answers.lifeArea,
      changeStance: answers.changeStance,
    };
    return {
      cacheKey: calendarCacheKey(answers, chart.moment.zone),
      schema: calendarSchema,
      async request(signal) {
        const res = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        });
        if (!res.ok) throw new Error(`calendar ${res.status}`);
        const data: CalendarResponse = await res.json();
        return data.calendar;
      },
    };
  }, [chart, savedAnswersJson]);

  return useCachedResult(query);
}
