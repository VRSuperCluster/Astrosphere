import type { Chart, PointId } from "@/types/chart";
import type { ChangeStance, LifeArea } from "@/types/questionnaire";
import type { SummaryContext } from "@/types/summary";
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

const LIFE_AREA_CONTEXT: Record<LifeArea, string> = {
  relationships: "relationships",
  career: "work and career",
  identity: "their sense of who they are",
  health: "their health and body",
  creativity: "their creative life",
};

const CHANGE_STANCE_CONTEXT: Record<ChangeStance, string> = {
  seeksIt: "they go looking for change",
  resistsIt: "they resist change",
  itDepends: "it depends on the change",
  inTheMiddle: "they are in the middle of a big change right now",
};

interface PointData {
  id: PointId;
  sign: string;
  degree?: number;
  house?: number;
}

export function buildSummaryPrompt(chart: Chart, context: SummaryContext): { system: string; user: string } {
  const allowed = summaryPointsFor(chart);
  return {
    system: systemPrompt(chart, allowed),
    user: JSON.stringify(payload(chart, context, allowed), null, 2),
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

function payload(chart: Chart, context: SummaryContext, allowed: readonly PointId[]) {
  return {
    person: {
      firstName: context.firstName ?? null,
      partOfLifeChangingMost: context.lifeArea ? LIFE_AREA_CONTEXT[context.lifeArea] : null,
      howTheyMeetChange: context.changeStance ? CHANGE_STANCE_CONTEXT[context.changeStance] : null,
    },
    birthTimeKnown: chart.birthTimeKnown,
    points: allowed.map((id) => pointData(chart, id)),
    aspects: chart.aspects
      .filter(({ points }) => points.every((point) => allowed.includes(point)))
      .map(({ points, aspect, orb }) => ({ between: points, aspect, orb: round(orb) })),
  };
}

function pointData(chart: Chart, id: PointId): PointData {
  if (id === "asc" || id === "mc") {
    if (!chart.birthTimeKnown) throw new Error(`${id} is not in a chart without a birth time`);
    const position = id === "asc" ? chart.ascendant : chart.midheaven;
    return { id, sign: position.sign, degree: round(position.degreeInSign) };
  }

  const placement = chart.planets[id];
  if (!chart.birthTimeKnown) {
    // The noon Moon's degree can be several degrees off; only its sign is certain here.
    return id === "moon"
      ? { id, sign: placement.sign }
      : { id, sign: placement.sign, degree: round(placement.degreeInSign) };
  }
  return { id, sign: placement.sign, degree: round(placement.degreeInSign), house: placement.house };
}

function round(degrees: number): number {
  return Math.round(degrees * 10) / 10;
}
