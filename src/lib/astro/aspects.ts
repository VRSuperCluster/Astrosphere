import type { AspectId, NatalAspect, PointId } from "@/types/chart";
import { normalizeDegrees } from "./zodiac";

/** Exact angle of each aspect and the widest orb it still counts at, in degrees. */
export const ASPECTS: Record<AspectId, { angle: number; orb: number }> = {
  conjunction: { angle: 0, orb: 8 },
  sextile: { angle: 60, orb: 5 },
  square: { angle: 90, orb: 7 },
  trine: { angle: 120, orb: 7 },
  opposition: { angle: 180, orb: 8 },
};

/** Aspects between two slower planets are shared by everyone born that year, so each pair needs one of these. */
const PERSONAL_POINTS: ReadonlySet<PointId> = new Set([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "asc",
  "mc",
]);

/** Shortest distance around the circle, in degrees, 0 ≤ d ≤ 180. */
export function separation(a: number, b: number): number {
  const d = normalizeDegrees(a - b);
  return Math.min(d, 360 - d);
}

/** The aspect `separation` falls within orb of, if any. The orbs don't overlap, so there's at most one. */
export function aspectAt(separationDegrees: number): { aspect: AspectId; orb: number } | null {
  for (const aspect of Object.keys(ASPECTS) as AspectId[]) {
    const off = Math.abs(separationDegrees - ASPECTS[aspect].angle);
    if (off <= ASPECTS[aspect].orb) return { aspect, orb: off };
  }
  return null;
}

/** `points` in chart order; each aspect lists its points in that order. */
export function natalAspects(points: ReadonlyArray<readonly [PointId, number]>): NatalAspect[] {
  const aspects: NatalAspect[] = [];
  points.forEach(([a, longitudeA], i) => {
    for (const [b, longitudeB] of points.slice(i + 1)) {
      if (!PERSONAL_POINTS.has(a) && !PERSONAL_POINTS.has(b)) continue;
      // The angle between the Ascendant and MC comes from the latitude, not the person.
      if (a === "asc" && b === "mc") continue;
      const found = aspectAt(separation(longitudeA, longitudeB));
      if (found) aspects.push({ points: [a, b], ...found });
    }
  });
  return aspects.sort((x, y) => x.orb - y.orb);
}
