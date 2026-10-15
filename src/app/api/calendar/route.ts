import { APIError } from "@anthropic-ai/sdk";
import { z } from "zod";
import { generateCalendar } from "@/lib/ai/outputs/calendar";
import { chartSchema } from "@/lib/astro/chart-schema";
import { CHANGE_STANCE_OPTIONS, LIFE_AREA_OPTIONS } from "@/lib/questionnaire/context-questions";
import { MAX_FIRST_NAME_LENGTH, normalizeFirstName } from "@/lib/questionnaire/first-name";
import type { CalendarErrorResponse, CalendarResponse } from "@/types/calendar";

/** One call plus one repair or fresh retry. Pro with Fluid compute allows 300s. */
export const maxDuration = 300;

const values = <T extends string>(options: readonly { value: T }[]) =>
  options.map((option) => option.value) as [T, ...T[]];

/** Everything here reaches the prompt, so nothing is free text except the bounded first name. */
const requestSchema = z.strictObject({
  chart: chartSchema,
  firstName: z
    .string()
    .max(200)
    .transform(normalizeFirstName)
    .pipe(z.string().min(1).max(MAX_FIRST_NAME_LENGTH))
    .optional(),
  lifeArea: z.enum(values(LIFE_AREA_OPTIONS)).optional(),
  changeStance: z.enum(values(CHANGE_STANCE_OPTIONS)).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Body is not JSON");
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "Invalid request");

  const { chart, ...context } = parsed.data;
  try {
    const { calendar } = await generateCalendar({ chart, context });
    return Response.json({ calendar } satisfies CalendarResponse);
  } catch (error) {
    // Name and HTTP status only: messages can quote the prompt or the model's output.
    const status = error instanceof APIError ? ` (${error.status ?? "no status"})` : "";
    console.error(`Calendar generation failed: ${error instanceof Error ? error.name : "unknown error"}${status}`);
    return errorResponse(502, "Calendar generation failed");
  }
}

function errorResponse(status: number, error: string): Response {
  return Response.json({ error } satisfies CalendarErrorResponse, { status });
}
