import type { Chart, PointId } from "@/types/chart";
import type { ChangeStance, LifeArea } from "@/types/questionnaire";
import type { SummaryContext } from "@/types/summary";
import { summaryPointsFor } from "./outputs/summary-schema";

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

/** How the context answers are shown to the model. The option labels themselves never appear. */
export function describePerson(context: SummaryContext) {
  return {
    firstName: context.firstName ?? null,
    partOfLifeChangingMost: context.lifeArea ? LIFE_AREA_CONTEXT[context.lifeArea] : null,
    howTheyMeetChange: context.changeStance ? CHANGE_STANCE_CONTEXT[context.changeStance] : null,
  };
}

interface PointData {
  id: PointId;
  sign: string;
  degree?: number;
  house?: number;
}

/**
 * The chart, reduced to what a prompt may see. Without a birth time there are
 * no houses and no angles, and an uncertain Moon is left out entirely.
 */
export function chartFacts(chart: Chart) {
  const allowed = summaryPointsFor(chart);
  return {
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
