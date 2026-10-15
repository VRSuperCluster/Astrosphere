import { DateTime } from "luxon";
import type { ActiveTransit, MonthContext, Station } from "@/types/transit";
import type { EphemerisProvider } from "./ephemeris";
import { DAY_MS, type TimeWindow } from "./search";
import { offFromExact, type PairHit, type TransitPair } from "./transit-pairs";

export interface MonthRange extends TimeWindow {
  /** YYYY-MM. */
  month: string;
}

/** `count` calendar months in `zone`, the first starting at the window's start, not the 1st. */
export function monthRanges(window: TimeWindow, count: number, zone: string): MonthRange[] {
  const first = DateTime.fromMillis(window.start, { zone }).startOf("month");
  return Array.from({ length: count }, (_, i) => {
    const start = first.plus({ months: i });
    return {
      month: start.toFormat("yyyy-MM"),
      start: Math.max(start.toMillis(), window.start),
      end: start.plus({ months: 1 }).toMillis(),
    };
  });
}

export interface MonthlyInput {
  months: MonthRange[];
  pairs: TransitPair[];
  /** Hits inside the window. */
  hits: PairHit[];
  stations: Station[];
  provider: EphemerisProvider;
  /** Widest orb, in degrees, at which a transit counts as active. */
  orb: number;
  /** Daily samples fall on `gridStart` plus whole days, so they reuse the hit search's longitudes. */
  gridStart: number;
}

export function monthlyContext(input: MonthlyInput): MonthContext[] {
  return input.months.map((range) => ({
    month: range.month,
    active: input.pairs
      .flatMap((pair) => activeTransit(pair, range, input))
      .sort((a, b) => a.closestOrb - b.closestOrb),
    stations: input.stations.filter((station) => station.date.startsWith(`${range.month}-`)),
    placementIds: [],
    changes: [],
  }));
}

function activeTransit(pair: TransitPair, range: MonthRange, input: MonthlyInput): ActiveTransit[] {
  const hits = input.hits.filter((hit) => hit.pair === pair && hit.time >= range.start && hit.time < range.end);
  const orbs = sampleTimes(range, input.gridStart).map((time) =>
    Math.abs(offFromExact(pair, time, input.provider)),
  );
  const closestOrb = hits.length > 0 ? 0 : Math.min(...orbs);
  if (closestOrb > input.orb) return [];
  return [
    {
      transiting: pair.transiting,
      natal: pair.natal,
      aspect: pair.aspect,
      closestOrb: roundOrb(closestOrb),
      orbAtStart: roundOrb(orbs[0]),
      orbAtEnd: roundOrb(orbs[orbs.length - 1]),
      transitIds: hits.map((hit) => hit.transit.id),
    },
  ];
}

/** The month's first and last instants, and every grid sample between. */
function sampleTimes(range: MonthRange, gridStart: number): number[] {
  const times = [range.start];
  for (let k = Math.floor((range.start - gridStart) / DAY_MS) + 1; ; k++) {
    const time = gridStart + k * DAY_MS;
    if (time >= range.end) break;
    if (time > range.start) times.push(time);
  }
  times.push(range.end);
  return times;
}

/** Hundredths of a degree is plenty for a prompt. */
function roundOrb(orb: number): number {
  return Math.round(orb * 100) / 100;
}
