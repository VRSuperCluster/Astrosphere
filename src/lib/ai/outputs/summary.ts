import type { Chart, PointId } from "@/types/chart";
import type { SummaryContext } from "@/types/summary";
import { chartFacts, describePerson } from "../chart-facts";
import { PATTERN_CARD_EXAMPLES, SUMMARY_READ_EXAMPLES } from "../examples/summary";
import { VOICE_BLOCK } from "../voice";
import { summaryPointsFor } from "./summary-schema";

export { SUMMARY_PROMPT_VERSION as PROMPT_VERSION } from "../versions";
export { summaryPointsFor, summarySchemaFor } from "./summary-schema";

/** Includes the model's thinking (about 1.5k tokens on its own); the answer itself is about 600. */
export const SUMMARY_MAX_TOKENS = 4000;

export const NO_LIFE_AREAS_INSTRUCTION =
  "The birth time is unknown, so the data has no houses and no rising point. " +
  "Don't tie any pattern to a specific area of life (work, home, money, relationships, health) on the strength of the data. " +
  "Write about how the person thinks, feels, decides and reacts.";

export function buildSummaryPrompt(chart: Chart, context: SummaryContext): { system: string; user: string } {
  const allowed = summaryPointsFor(chart);
  return {
    system: systemPrompt(chart, allowed),
    user: JSON.stringify(payload(chart, context), null, 2),
  };
}

function systemPrompt(chart: Chart, allowed: readonly PointId[]): string {
  const reads = SUMMARY_READ_EXAMPLES.map((e) => `[${e.internal}]\n${e.read}`).join("\n\n");
  const cards = PATTERN_CARD_EXAMPLES.map(
    (e) => `[${e.internal}]\npattern: ${e.pattern}\nrule: ${e.rule}`,
  ).join("\n\n");

  return [
    VOICE_BLOCK,
    `TASK
You are writing the first thing a person reads about themselves: a short read of who they are, then three patterns they keep repeating, each with a rule that answers it. It should feel like being seen by someone who has known them for years. Build it from the chart data in the user message; the person never sees that data.`,
    chart.birthTimeKnown ? null : `BIRTH TIME UNKNOWN\n${NO_LIFE_AREAS_INSTRUCTION}`,
    `OUTPUT
Return one JSON object and nothing else:
{
  "read": "3–4 sentences: how people experience this person, what runs underneath, and the tension between the two.",
  "patterns": [
    {
      "pointIds": ["1–3 IDs of the chart points this pattern comes from"],
      "pattern": "1–2 sentences naming a real, slightly uncomfortable behaviour.",
      "rule": "1–2 sentences: something concrete they can do this week."
    }
  ]
}
- Exactly 3 patterns, each drawn from a different part of the chart.
- pointIds may only use these IDs: ${allowed.join(", ")}.
- Use the first name at most once, or not at all.`,
    `EXAMPLES
The notes in brackets describe the chart behind each example. They are for you; never reuse their wording. Match the quality, not the content.

Reads:

${reads}

Pattern cards:

${cards}`,
  ]
    .filter((part) => part !== null)
    .join("\n\n");
}

function payload(chart: Chart, context: SummaryContext) {
  return { person: describePerson(context), ...chartFacts(chart) };
}
