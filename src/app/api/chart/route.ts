import { IANAZone } from "luxon";
import { z } from "zod";
import { calculateChart } from "@/lib/astro/chart";
import { checkBirthDate, latestToday } from "@/lib/questionnaire/birth-date";
import type { ChartErrorResponse, ChartInput, ChartResponse } from "@/types/chart";

const birthDateSchema = z
  .object({ year: z.number().int(), month: z.number().int(), day: z.number().int() })
  .refine((date) => checkBirthDate(date, latestToday()).ok);

const birthTimeSchema = z.discriminatedUnion("known", [
  z.object({
    known: z.literal(true),
    time: z.object({
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59),
    }),
  }),
  z.object({ known: z.literal(false) }),
]);

const placeSchema = z.object({
  id: z.number(),
  name: z.string(),
  region: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().refine((zone) => IANAZone.isValidZone(zone)),
});

/** The questionnaire answers as saved. Answers the chart doesn't use are dropped. */
const answersSchema = z.object({
  birthDate: birthDateSchema,
  birthTime: birthTimeSchema,
  placeOfBirth: placeSchema,
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Body is not JSON");
  }

  const parsed = answersSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "Invalid answers");

  const { birthDate, birthTime, placeOfBirth } = parsed.data;
  const input: ChartInput = { date: birthDate, time: birthTime, place: placeOfBirth };

  try {
    return Response.json({ chart: calculateChart(input) } satisfies ChartResponse);
  } catch {
    return errorResponse(500, "Chart calculation failed");
  }
}

function errorResponse(status: number, error: string): Response {
  return Response.json({ error } satisfies ChartErrorResponse, { status });
}
