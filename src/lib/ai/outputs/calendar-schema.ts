import { z } from "zod";
import type { Calendar } from "@/types/calendar";
import type { TransitReport } from "@/types/transit";

/**
 * Cards run from the generation month through December of the next year.
 * 13 when generation falls on 31 December, 24 when it falls on 1 January.
 */
export const CALENDAR_MONTHS_MIN = 13;
export const CALENDAR_MONTHS_MAX = 24;

/** What the model returns. Dates are not in it; the engine owns those. */
export interface CalendarModelOutput {
  entries: { transitId: string; title: string; description: string }[];
  months: { month: string; title: string; description: string }[];
}

/**
 * Validates the model's answer against this report. A missing, unknown or
 * duplicate transitId fails, and so does a missing, unknown or duplicate month.
 * Messages are written for the model: a failure goes back as a repair request.
 */
export function calendarModelSchemaFor(report: TransitReport): z.ZodType<CalendarModelOutput> {
  const entry = z.object({
    transitId: z.string(),
    title: text(160),
    description: text(1000),
  });
  const month = z.object({
    month: z.string(),
    title: text(160),
    description: text(1000),
  });

  return z
    .object({
      entries: z.array(entry),
      months: z.array(month),
    })
    .superRefine((value, ctx) => {
      sameMembers(
        "transitId",
        value.entries.map((item) => item.transitId),
        report.transits.map((transit) => transit.id),
        ctx,
      );
      sameMembers(
        "month",
        value.months.map((item) => item.month),
        report.months.map((item) => item.month),
        ctx,
      );
    });
}

const day = z.iso.date();
const monthId = z.string().regex(/^\d{4}-\d{2}$/, { error: "Month must be YYYY-MM." });

/** The joined calendar, for the route response and the tab cache. Safe in the browser. */
export const calendarSchema: z.ZodType<Calendar> = z.object({
  generatedOn: day,
  entries: z.array(
    z.object({
      transitId: z.string().min(1),
      date: day,
      title: z.string().trim().min(1),
      description: z.string().trim().min(1),
    }),
  ),
  months: z
    .array(
      z.object({
        month: monthId,
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
      }),
    )
    .min(CALENDAR_MONTHS_MIN, { error: `There must be at least ${CALENDAR_MONTHS_MIN} months.` })
    .max(CALENDAR_MONTHS_MAX, { error: `There must be at most ${CALENDAR_MONTHS_MAX} months.` }),
});

function text(max: number) {
  return z
    .string()
    .trim()
    .min(1, { error: "This can't be empty." })
    .max(max, { error: `Keep this under ${max} characters.` });
}

function sameMembers(
  kind: "transitId" | "month",
  actual: string[],
  expected: readonly string[],
  ctx: { addIssue: (issue: string) => void },
) {
  const allowed = new Set(expected);
  const seen = new Set<string>();
  const noun = kind === "transitId" ? "transitId" : "month";

  for (const id of actual) {
    if (!allowed.has(id)) {
      const list = expected.length === 0 ? `there are no ${noun}s` : `use only: ${expected.join(", ")}`;
      ctx.addIssue(`Unknown ${noun} "${id}" (${list}).`);
      continue;
    }
    if (seen.has(id)) {
      ctx.addIssue(`${noun} "${id}" is duplicated.`);
      continue;
    }
    seen.add(id);
  }

  for (const id of expected) {
    if (!seen.has(id)) ctx.addIssue(`Missing ${noun} "${id}".`);
  }
}
