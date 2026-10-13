import { APIError } from "@anthropic-ai/sdk";
import { z } from "zod";
import { callClaude } from "@/lib/ai/call";
import { buildSummaryPrompt, SUMMARY_MAX_TOKENS, summarySchemaFor } from "@/lib/ai/outputs/summary";
import { chartSchema } from "@/lib/astro/chart-schema";
import { CHANGE_STANCE_OPTIONS, LIFE_AREA_OPTIONS } from "@/lib/questionnaire/context-questions";
import { MAX_FIRST_NAME_LENGTH, normalizeFirstName } from "@/lib/questionnaire/first-name";
import type { SummaryErrorResponse, SummaryResponse } from "@/types/summary";

/** One answer takes about 20 seconds with thinking; a repair turn doubles that. */
export const maxDuration = 60;

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
    const { data } = await callClaude({
      ...buildSummaryPrompt(chart, context),
      schema: summarySchemaFor(chart),
      maxTokens: SUMMARY_MAX_TOKENS,
    });
    return Response.json({ summary: data } satisfies SummaryResponse);
  } catch (error) {
    // Name and HTTP status only: messages can quote the prompt or the model's output.
    const status = error instanceof APIError ? ` (${error.status ?? "no status"})` : "";
    console.error(`Summary generation failed: ${error instanceof Error ? error.name : "unknown error"}${status}`);
    return errorResponse(502, "Summary generation failed");
  }
}

function errorResponse(status: number, error: string): Response {
  return Response.json({ error } satisfies SummaryErrorResponse, { status });
}
