import type { Message, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import { describe, expect, it } from "vitest";
import { AiOutputError, type MessagesClient } from "@/lib/ai/call";
import { calculateChart } from "@/lib/astro/chart";
import type { Chart } from "@/types/chart";
import type { Place } from "@/types/places";
import type { MonthContext, Transit, TransitReport } from "@/types/transit";
import {
  CALENDAR_MAX_TOKENS,
  NO_PADDING_INSTRUCTION,
  NULL_HOUSE_INSTRUCTION,
  PASS_INSTRUCTION,
  UNKNOWN_BIRTH_TIME_INSTRUCTION,
  buildCalendarPrompt,
  generateCalendar,
} from "./calendar";
import { calendarSchema, type CalendarModelOutput } from "./calendar-schema";

const LONDON: Place = {
  id: 2643743,
  name: "London",
  latitude: 51.50853,
  longitude: -0.12574,
  timezone: "Europe/London",
};

const TIMED = calculateChart({
  date: { year: 1990, month: 6, day: 14 },
  time: { known: true, time: { hour: 14, minute: 30 } },
  place: LONDON,
});
const SOLAR = calculateChart({
  date: { year: 1990, month: 6, day: 14 },
  time: { known: false },
  place: LONDON,
});

const FIRST = transit("saturn-square-sun-2026-11-02", "2026-11-02", 1, 3, 10, false, true);
const MIDDLE = transit("saturn-square-sun-2027-03-14", "2027-03-14", 2, 3, 10, true, false);
const ONLY = transit("jupiter-conjunction-venus-2027-01-09", "2027-01-09", 1, 1, null, false, false);

const REPORT = reportOf([FIRST, MIDDLE, ONLY]);
const QUIET = reportOf([ONLY]);

function transit(
  id: string,
  date: string,
  pass: number,
  totalPasses: number,
  house: number | null,
  previousPassInWindow: boolean,
  nextPassInWindow: boolean,
): Transit {
  const [transiting, aspect, natal] = id.split("-") as [Transit["transiting"], Transit["aspect"], Transit["natal"]];
  return { id, date, transiting, natal, aspect, house, pass, totalPasses, previousPassInWindow, nextPassInWindow };
}

function reportOf(transits: Transit[]): TransitReport {
  // 15 October 2026 through December 2027: fifteen cards.
  const months = Array.from({ length: 15 }, (_, i): MonthContext => {
    const date = new Date(Date.UTC(2026, 9 + i, 1));
    return {
      month: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      active: [],
      stations: [],
    };
  });
  months[0] = {
    month: months[0].month,
    active: [
      {
        transiting: "saturn",
        natal: "sun",
        aspect: "square",
        closestOrb: 0.4,
        orbAtStart: 1.2,
        orbAtEnd: 0.2,
        transitIds: [transits[0]?.id ?? ""],
      },
    ],
    stations: [{ planet: "saturn", direction: "retrograde", date: "2026-10-04" }],
  };
  return { window: { start: "2026-10-15", end: "2028-01-01" }, transits, months };
}

function modelOf(source: TransitReport): CalendarModelOutput {
  return {
    entries: source.transits.map((item) => ({
      transitId: item.id,
      title: `Title for ${item.id}`,
      description: "You will feel this land, and you will know what it is asking of you.",
    })),
    months: source.months.map((month) => ({
      month: month.month,
      title: `Month ${month.month}`,
      description: "This month asks for one honest look at what you have been carrying.",
    })),
  };
}

function fakeClient(...replies: { text: string; stop?: Message["stop_reason"] }[]) {
  const sent: MessageCreateParamsNonStreaming[] = [];
  const client: MessagesClient = {
    messages: {
      async create(params) {
        sent.push(structuredClone(params));
        const reply = replies[sent.length - 1];
        if (!reply) throw new Error("no more canned replies");
        return {
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: "test",
          content: [{ type: "text", text: reply.text, citations: null }],
          stop_reason: reply.stop ?? "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 50, output_tokens: 10, output_tokens_details: { thinking_tokens: 4 } },
        } as unknown as Message;
      },
    },
  };
  return { client, sent };
}

const write = (chart: Chart, source: TransitReport, client: MessagesClient) =>
  generateCalendar({ chart, context: {}, report: source, client });

describe("generateCalendar", () => {
  it.each<[string, (model: CalendarModelOutput) => void, string]>([
    ["a missing transitId", (model) => void model.entries.shift(), `Missing transitId "${FIRST.id}"`],
    ["an unknown transitId", (model) => { model.entries[0].transitId = "not-a-transit"; }, 'Unknown transitId "not-a-transit"'],
    ["a duplicate transitId", (model) => { model.entries.push({ ...model.entries[0] }); }, `transitId "${FIRST.id}" is duplicated.`],
    ["a missing month", (model) => void model.months.shift(), `Missing month "${REPORT.months[0].month}"`],
  ])("repairs %s", async (_, spoil, message) => {
    const bad = modelOf(REPORT);
    spoil(bad);
    const { client, sent } = fakeClient({ text: JSON.stringify(bad) }, { text: JSON.stringify(modelOf(REPORT)) });

    const { calendar } = await write(TIMED, REPORT, client);

    expect(sent[1].messages[2].content).toContain(message);
    expect(calendar.entries.map((entry) => entry.date)).toEqual(REPORT.transits.map((item) => item.date));
  });

  it("retries a cut-off answer from scratch and does not send the partial", async () => {
    const partial = "NOT-THE-WHOLE-CALENDAR";
    const { client, sent } = fakeClient(
      { text: partial, stop: "max_tokens" },
      { text: JSON.stringify(modelOf(REPORT)) },
    );

    const { calendar, attempts } = await write(TIMED, REPORT, client);

    expect(attempts).toBe(2);
    expect(sent[1].messages).toEqual(sent[0].messages);
    expect(JSON.stringify(sent[1])).not.toContain(partial);
    expect(sent[0]).not.toHaveProperty("thinking");
    expect(sent[0].max_tokens).toBe(CALENDAR_MAX_TOKENS);
    expect(calendar.entries).toHaveLength(REPORT.transits.length);
  });

  it("fails when the fresh retry is cut off too", async () => {
    const { client, sent } = fakeClient(
      { text: "NOT-THE-WHOLE-CALENDAR", stop: "max_tokens" },
      { text: "STILL-CUT-OFF", stop: "max_tokens" },
    );

    const error = await write(TIMED, REPORT, client).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AiOutputError);
    expect(sent).toHaveLength(2);
    expect(sent[1].messages).toEqual(sent[0].messages);
    expect(JSON.stringify(sent[1])).not.toContain("NOT-THE-WHOLE-CALENDAR");
  });

  it("puts the engine's dates on the entries, in the engine's order", async () => {
    const model = modelOf(REPORT);
    model.entries.reverse();
    model.months.reverse();
    (model.entries[0] as { date?: string }).date = "1999-01-01";
    const { client } = fakeClient({ text: JSON.stringify(model) });

    const { calendar } = await write(TIMED, REPORT, client);

    expect(calendar.generatedOn).toBe(REPORT.window.start);
    expect(calendar.entries.map((entry) => [entry.transitId, entry.date, entry.title])).toEqual(
      REPORT.transits.map((item) => [item.id, item.date, `Title for ${item.id}`]),
    );
    expect(calendar.entries.map((entry) => entry.date)).not.toContain("1999-01-01");
    expect(calendar.months.map((month) => month.month)).toEqual(REPORT.months.map((month) => month.month));
    expect(calendarSchema.safeParse(calendar).success).toBe(true);
  });
});

describe("buildCalendarPrompt", () => {
  it("teaches passes, a null house, and a short list", () => {
    const { system, user } = buildCalendarPrompt(TIMED, { firstName: "Ada" }, REPORT);
    const payload = JSON.parse(user);
    expect(system.startsWith("You write for a personal development tool.")).toBe(true);
    expect(system).toContain(PASS_INSTRUCTION);
    expect(system).toContain(NULL_HOUSE_INSTRUCTION);
    expect(system).toContain(NO_PADDING_INSTRUCTION);
    expect(system).not.toContain(UNKNOWN_BIRTH_TIME_INSTRUCTION);
    expect(
      payload.transits.map(
        (item: { pass: number; totalPasses: number; previousPassInWindow: boolean; nextPassInWindow: boolean }) => [
          item.pass,
          item.totalPasses,
          item.previousPassInWindow,
          item.nextPassInWindow,
        ],
      ),
    ).toEqual([
      [1, 3, false, true],
      [2, 3, true, false],
      [1, 1, false, false],
    ]);
    expect(payload.transits).toHaveLength(REPORT.transits.length);
    expect(payload.person.firstName).toBe("Ada");
  });

  it("passes house: null and names no life area from an unknown birth time", () => {
    const { system, user } = buildCalendarPrompt(SOLAR, {}, QUIET);
    const payload = JSON.parse(user);
    expect(system).toContain(UNKNOWN_BIRTH_TIME_INSTRUCTION);
    expect(system).toContain(NULL_HOUSE_INSTRUCTION);
    expect(payload.transits).toEqual([
      expect.objectContaining({
        id: ONLY.id,
        house: null,
        pass: 1,
        totalPasses: 1,
        previousPassInWindow: false,
        nextPassInWindow: false,
      }),
    ]);
    expect(payload.points.every((point: { house?: number }) => point.house === undefined)).toBe(true);
    expect(payload.points.map((point: { id: string }) => point.id)).not.toContain("moon");
    expect(payload.points.map((point: { id: string }) => point.id)).not.toContain("asc");
  });
});
