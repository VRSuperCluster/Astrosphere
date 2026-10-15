import { z } from "zod";
import type { Calendar, CalendarChange, CalendarPlacement } from "@/types/calendar";
import type { PlanetId } from "@/types/chart";
import type { TransitAspectId, TransitTarget } from "@/types/transit";
import type { TransitReport } from "@/types/transit";

const OUTER: [PlanetId, ...PlanetId[]] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];
const POINTS: [TransitTarget, ...TransitTarget[]] = ["sun", "moon", "mercury", "venus", "mars", "asc"];
const ASPECTS: [TransitAspectId, ...TransitAspectId[]] = ["conjunction", "square", "opposition"];

/**
 * Cards run from the generation month through December of the next year.
 * 13 when generation falls on 31 December, 24 when it falls on 1 January.
 */
export const CALENDAR_MONTHS_MIN = 13;
export const CALENDAR_MONTHS_MAX = 24;

/** What the model returns. Dates are not in it; the engine owns those. */
export interface CalendarModelOutput {
  entries: { transitId: string; title: string; description: string }[];
  placements: { id: string; text: string }[];
  months: { month: string; title: string; description: string }[];
}

/**
 * Validates the model's answer against this report. A missing, unknown or
 * duplicate transitId fails, and so does a missing, unknown or duplicate month
 * or placement id, or a placement text that contains a 4-digit year.
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
  const placement = z.object({
    id: z.string(),
    text: text(600),
  });

  return z
    .object({
      entries: z.array(entry),
      placements: z.array(placement),
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
        "placementId",
        value.placements.map((item) => item.id),
        report.placements.map((item) => item.id),
        ctx,
      );
      sameMembers(
        "month",
        value.months.map((item) => item.month),
        report.months.map((item) => item.month),
        ctx,
      );
      for (const placement of value.placements) {
        if (/\d{4}/.test(placement.text)) {
          ctx.addIssue(
            `Placement "${placement.id}" contains a year. Write the theme only; the calendar adds the span.`,
          );
        }
      }
    });
}

const day = z.iso.date();
const monthId = z.string().regex(/^\d{4}-\d{2}$/, { error: "Month must be YYYY-MM." });

const placementSchema: z.ZodType<CalendarPlacement> = z.object({
  id: z.string().min(1),
  planet: z.enum(OUTER),
  house: z.int().min(1).max(12),
  start: day,
  end: day,
  text: z.string().trim().min(1),
});

const changeSchema: z.ZodType<CalendarChange> = z.object({
  date: day,
  placement: placementSchema,
});

/** The joined calendar, for the route response and the tab cache. Safe in the browser. */
export const calendarSchema: z.ZodType<Calendar> = z.object({
  generatedOn: day,
  entries: z.array(
    z.object({
      transitId: z.string().min(1),
      date: day,
      title: z.string().trim().min(1),
      description: z.string().trim().min(1),
      transiting: z.enum(OUTER),
      natal: z.enum(POINTS),
      aspect: z.enum(ASPECTS),
      pass: z.int().min(1),
      totalPasses: z.int().min(1),
    }),
  ),
  months: z
    .array(
      z.object({
        month: monthId,
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        placements: z.array(placementSchema),
        changes: z.array(changeSchema),
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
  kind: "transitId" | "month" | "placementId",
  actual: string[],
  expected: readonly string[],
  ctx: { addIssue: (issue: string) => void },
) {
  const allowed = new Set(expected);
  const seen = new Set<string>();
  const noun = kind === "month" ? "month" : kind;

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
