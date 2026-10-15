import type { Chart } from "@/types/chart";
import type { Calendar } from "@/types/calendar";
import type { SummaryContext } from "@/types/summary";
import type { TransitReport } from "@/types/transit";
import { calendarWindow, transitReport } from "@/lib/astro/transits";
import { chartFacts, describePerson } from "../chart-facts";
import { callClaude, type ClaudeResult, type MessagesClient } from "../call";
import { CALENDAR_ENTRY_EXAMPLES, MONTH_CARD_EXAMPLES, PLACEMENT_EXAMPLES } from "../examples/calendar";
import { VOICE_BLOCK } from "../voice";
import { calendarModelSchemaFor, type CalendarModelOutput } from "./calendar-schema";

export { CALENDAR_PROMPT_VERSION as PROMPT_VERSION } from "../versions";

/**
 * Room for about 7k of writing plus the model's thinking.
 * A max_tokens stop is not repaired from the fragment: the request starts over once.
 */
export const CALENDAR_MAX_TOKENS = 16_000;

export const PASS_INSTRUCTION =
  "Each transit carries pass, totalPasses, previousPassInWindow and nextPassInWindow. " +
  "pass and totalPasses count the whole run, including hits before or after this window. " +
  "previousPassInWindow is true only when the previous pass falls inside the window. " +
  "nextPassInWindow is true only when the next pass falls inside the window.\n" +
  "- A single pass (totalPasses is 1) stands alone. Don't write it as part of a series.\n" +
  "- The first pass (pass is 1, and totalPasses is more than 1) introduces the theme.\n" +
  "- When previousPassInWindow is false and pass is greater than 1, the theme is already in motion in their life. Write it as something underway. Never write \"again\" or \"back\".\n" +
  "- When previousPassInWindow is true, this pass meets the theme again inside this calendar.\n" +
  "- When nextPassInWindow is false and pass is less than totalPasses, say the theme isn't finished. Don't promise another round, and don't say when it returns.\n" +
  "- The final pass (pass equals totalPasses, and totalPasses is more than 1) closes it: last time this comes up for a while — decide.";

export const NULL_HOUSE_INSTRUCTION =
  "house is a number from 1 to 12, or null when the birth time is unknown. " +
  "When house is null, don't name a life area on the strength of the data.";

/** Same carve-out as the summary: the person's own focus answer may still steer the advice. */
export const UNKNOWN_BIRTH_TIME_INSTRUCTION =
  "The birth time is unknown, so the data has no houses and no rising point. " +
  "Don't tie any entry or month to a specific area of life (work, home, money, relationships, health) on the strength of the data. " +
  "Write about how the person thinks, feels, decides and reacts.";

export const NO_PADDING_INSTRUCTION =
  "Write one entry for each transit you are given, and one card for each month, including months with nothing exact in them. " +
  "If only a few transits are listed, write only those. Do not invent entries to fill the year.";

export const PLACEMENT_INSTRUCTION =
  "placements are the long backdrop: each outer planet's stay in one house. start and end are the real dates of that stay, and they may fall outside this calendar.\n" +
  "Write each placement once, as one or two sentences of the theme only. No years, no dates, and no \"until\". Code writes the span in front of your sentence.\n" +
  "When two placements share a house, keep their themes distinct. Don't let them repeat each other. Saturn is structure, obligation and limits. Neptune is blur, ideals and uncertainty.";

export const TIMED_MONTH_INSTRUCTION =
  "On a timed chart the month description is only what is active this month: the transits in active, and any station. One or two sentences. When active is empty, one line is enough.";

export const UNKNOWN_MONTH_INSTRUCTION =
  "A month description is 2–4 sentences: what the month is for, and one thing to watch.";

export interface CalendarRun {
  calendar: Calendar;
  attempts: number;
  problems: string[];
  usage: ClaudeResult<CalendarModelOutput>["usage"];
}

/**
 * Writes the year and joins the model's words onto the engine's dates.
 * Pass `report` in tests; otherwise the window runs from the start of `now`'s day
 * through 31 December of the next year.
 */
export async function generateCalendar({
  chart,
  context,
  now = new Date(),
  report = transitReport(chart, calendarWindow(now, chart.moment.zone)),
  client,
}: {
  chart: Chart;
  context: SummaryContext;
  report?: TransitReport;
  now?: Date;
  client?: MessagesClient;
}): Promise<CalendarRun> {
  const { data, attempts, problems, usage } = await callClaude({
    ...buildCalendarPrompt(chart, context, report),
    schema: calendarModelSchemaFor(report),
    maxTokens: CALENDAR_MAX_TOKENS,
    cutOff: "fresh",
    client,
  });
  return { calendar: joinCalendar(report, data), attempts, problems, usage };
}

export function buildCalendarPrompt(
  chart: Chart,
  context: SummaryContext,
  report: TransitReport,
): { system: string; user: string } {
  return {
    system: systemPrompt(chart),
    user: JSON.stringify(payload(chart, context, report), null, 2),
  };
}

/** Engine order, engine dates. The model's date, if it invented one, is ignored. */
export function joinCalendar(report: TransitReport, model: CalendarModelOutput): Calendar {
  const entries = new Map(model.entries.map((entry) => [entry.transitId, entry]));
  const months = new Map(model.months.map((month) => [month.month, month]));
  const placementText = new Map(model.placements.map((placement) => [placement.id, placement.text]));
  const placements = new Map(
    report.placements.map((placement) => {
      const text = placementText.get(placement.id);
      if (!text) throw new Error(`No text for placement ${placement.id}`);
      return [placement.id, { ...placement, text }] as const;
    }),
  );
  return {
    generatedOn: report.window.start,
    entries: report.transits.map((transit) => {
      const entry = entries.get(transit.id);
      if (!entry) throw new Error(`No text for transit ${transit.id}`);
      return { transitId: transit.id, date: transit.date, title: entry.title, description: entry.description };
    }),
    months: report.months.map((month) => {
      const card = months.get(month.month);
      if (!card) throw new Error(`No text for month ${month.month}`);
      return {
        month: month.month,
        title: card.title,
        description: card.description,
        placements: month.placementIds.map((id) => {
          const placement = placements.get(id);
          if (!placement) throw new Error(`No text for placement ${id}`);
          return placement;
        }),
        changes: month.changes.map((change) => {
          const placement = placements.get(change.placementId);
          if (!placement) throw new Error(`No text for placement ${change.placementId}`);
          return { date: change.date, placement };
        }),
      };
    }),
  };
}

function systemPrompt(chart: Chart): string {
  const entries = CALENDAR_ENTRY_EXAMPLES.map(
    (example) => `[${example.register}; ${example.internal}]\ntitle: ${example.title}\ndescription: ${example.description}`,
  ).join("\n\n");
  const months = MONTH_CARD_EXAMPLES.map(
    (example) => `[${example.internal}]\ntitle: ${example.title}\ndescription: ${example.description}`,
  ).join("\n\n");
  const placements = PLACEMENT_EXAMPLES.map(
    (example) => `[${example.internal}]\ntext: ${example.text}`,
  ).join("\n\n");
  const timed = chart.birthTimeKnown;

  return [
    VOICE_BLOCK,
    `TASK
You are writing one person's calendar, from today through the end of next year: a headline and a short note for each transit, and a card for each month. The person reads these as events in their calendar. Build them from the data in the user message. The person never sees that data.`,
    `PASSES
${PASS_INSTRUCTION}`,
    `HOUSE
${NULL_HOUSE_INSTRUCTION}`,
    timed ? null : `BIRTH TIME UNKNOWN\n${UNKNOWN_BIRTH_TIME_INSTRUCTION}`,
    timed ? `BACKDROP\n${PLACEMENT_INSTRUCTION}` : null,
    `MONTHS\n${timed ? TIMED_MONTH_INSTRUCTION : UNKNOWN_MONTH_INSTRUCTION}`,
    `HOW MANY
${NO_PADDING_INSTRUCTION}`,
    `OUTPUT
Return one JSON object and nothing else:
{
  "entries": [{ "transitId": "the id you were given", "title": "the day's headline", "description": "2–4 sentences" }],
  "placements": [${timed ? '{ "id": "the id you were given", "text": "one or two sentences" }' : ""}],
  "months": [{ "month": "YYYY-MM", "title": "the month's headline", "description": "${timed ? "what is active this month" : "2–4 sentences: what the month is for, and one thing to watch"}" }]
}
- Use each transitId exactly once, and no others. Use each month exactly once, and no others. Use each placement id exactly once, and no others.
- Do not write dates, weekdays, or month names. ${timed ? "A placement is the theme only, with no year. " : ""}The date on each transit is only so you can feel how far apart the passes are. The calendar adds the dates.
- A title is one line. An entry description is 2–4 sentences.
- Use the first name at most once in the whole year, or not at all.`,
    `EXAMPLES
The notes in brackets describe the transit, the stay, or the month behind each example. They are for you; never reuse their wording. Match the quality, not the content.

Dated entries:

${entries}
${timed ? `\nBackdrop:\n\n${placements}\n` : ""}
Monthly cards:

${months}`,
  ]
    .filter((part) => part !== null)
    .join("\n\n");
}

function payload(chart: Chart, context: SummaryContext, report: TransitReport) {
  return {
    person: describePerson(context),
    ...chartFacts(chart),
    transits: report.transits.map((transit) => ({
      id: transit.id,
      date: transit.date,
      transiting: transit.transiting,
      natal: transit.natal,
      aspect: transit.aspect,
      house: transit.house,
      pass: transit.pass,
      totalPasses: transit.totalPasses,
      previousPassInWindow: transit.previousPassInWindow,
      nextPassInWindow: transit.nextPassInWindow,
    })),
    placements: report.placements.map((placement) => ({
      id: placement.id,
      planet: placement.planet,
      house: placement.house,
      start: placement.start,
      end: placement.end,
    })),
    months: report.months.map((month) => ({
      month: month.month,
      active: month.active.map((item) => ({
        transiting: item.transiting,
        natal: item.natal,
        aspect: item.aspect,
        closestOrb: item.closestOrb,
        orbAtStart: item.orbAtStart,
        orbAtEnd: item.orbAtEnd,
        transitIds: item.transitIds,
      })),
      stations: month.stations.map((station) => ({
        planet: station.planet,
        direction: station.direction,
        date: station.date,
      })),
    })),
  };
}
