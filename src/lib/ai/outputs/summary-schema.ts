import { z } from "zod";
import type { Chart, PlanetId, PointId } from "@/types/chart";
import type { Summary } from "@/types/summary";

/**
 * The points a pattern card may refer to: only what this chart can stand behind.
 * Without a birth time there is no Ascendant or MC, and the Moon only counts when its sign is certain.
 */
export function summaryPointsFor(chart: Chart): PointId[] {
  const planets = Object.keys(chart.planets) as PlanetId[];
  if (chart.birthTimeKnown) return [...planets, "asc", "mc"];
  return planets.filter((planet) => planet !== "moon" || chart.moonSignCertain);
}

/**
 * Validates the model's answer for this chart. Error messages are written for
 * the model, since a failure goes back to it as a repair request.
 * Also safe in the browser: it holds no prompt text.
 */
export function summarySchemaFor(chart: Chart): z.ZodType<Summary> {
  const allowed = summaryPointsFor(chart);
  const pointId = z.enum(allowed as [PointId, ...PointId[]], {
    error: (issue) => `${String(issue.input)} isn't a point in this chart; use one of: ${allowed.join(", ")}.`,
  });

  const card = z.object({
    pointIds: z
      .array(pointId)
      .min(1, { error: "Each pattern needs at least 1 pointId." })
      .max(3, { error: "Each pattern takes at most 3 pointIds." })
      .refine((ids) => new Set(ids).size === ids.length, { error: "A pattern can't list the same pointId twice." }),
    pattern: text(400),
    rule: text(400),
  });

  return z.object({
    read: text(1000),
    patterns: z.array(card).length(3, { error: "There must be exactly 3 patterns." }),
  });
}

function text(max: number) {
  return z
    .string()
    .trim()
    .min(1, { error: "This can't be empty." })
    .max(max, { error: `Keep this under ${max} characters.` });
}
