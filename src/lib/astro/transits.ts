import { DateTime } from "luxon";
import type { Chart, PlanetId } from "@/types/chart";
import type { TransitOptions, TransitReport } from "@/types/transit";
import { ephemeris, memoized, type EphemerisProvider } from "./ephemeris";
import { monthlyContext, monthRanges } from "./monthly";
import { bisect, crosses, DAY_MS, type TimeWindow } from "./search";
import { findStations } from "./stations";
import { localDate } from "./timezone";
import { offFromExact, transitPairs, type PairHit, type TransitPair } from "./transit-pairs";

export const OUTER_PLANETS: readonly PlanetId[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];

export const DEFAULT_TRANSIT_OPTIONS: Omit<TransitOptions, "start"> = {
  months: 12,
  planets: OUTER_PLANETS,
  aspects: ["conjunction", "square", "opposition"],
  monthlyOrb: 2,
};

/**
 * How far from exact a planet can get between two passes of one run. Jupiter's
 * retrograde loop reaches about 10°. Within one orbit a planet passes a degree
 * only once, so going wider can't merge two runs; it only searches further.
 */
export const RUN_RANGE_DEGREES = 12;

/** Outer planets move under 0.3° a day, so a wider sign change is the jump from +180° to −180°. */
const BRACKET_DEGREES = 10;

/** Pluto near its slowest takes about two decades to move 24°. */
const MAX_RUN_SEARCH_MS = 40 * 365.25 * DAY_MS;

/**
 * Every exact hit in the window, numbered within its whole run, plus what each
 * month's card is written from. Pure: the same chart and options give the same report.
 */
export function transitReport(
  chart: Chart,
  options: Pick<TransitOptions, "start"> & Partial<TransitOptions>,
  provider: EphemerisProvider = ephemeris,
): TransitReport {
  const settings: TransitOptions = { ...DEFAULT_TRANSIT_OPTIONS, ...options };
  const sky = memoized(provider);
  const zone = chart.moment.zone;
  const window = transitWindow(settings.start, settings.months, zone);

  const pairs = transitPairs(chart, settings.planets, settings.aspects);
  const hits = pairs.flatMap((pair) => hitsInWindow(pair, window, sky, zone));
  hits.sort((a, b) => a.time - b.time);
  const stations = findStations(settings.planets, window, sky, zone);

  return {
    window: { start: localDate(window.start, zone), end: localDate(window.end, zone) },
    transits: hits.map((hit) => hit.transit),
    months: monthlyContext({
      months: monthRanges(window, settings.months, zone),
      pairs,
      hits,
      stations,
      provider: sky,
      orb: settings.monthlyOrb,
      gridStart: window.start,
    }),
  };
}

/** From the start of `start`'s day in `zone`, for `months` calendar months. */
function transitWindow(start: Date, months: number, zone: string): TimeWindow {
  const first = DateTime.fromJSDate(start, { zone }).startOf("day");
  return { start: first.toMillis(), end: first.plus({ months }).toMillis() };
}

function hitsInWindow(
  pair: TransitPair,
  window: TimeWindow,
  provider: EphemerisProvider,
  zone: string,
): PairHit[] {
  return runsAround(pair, window, provider).flatMap((run) =>
    run.flatMap((time, i): PairHit[] => {
      if (time < window.start || time >= window.end) return [];
      const date = localDate(time, zone);
      return [
        {
          pair,
          time,
          transit: {
            id: `${pair.transiting}-${pair.aspect}-${pair.natal}-${date}`,
            date,
            transiting: pair.transiting,
            natal: pair.natal,
            aspect: pair.aspect,
            house: pair.house,
            pass: i + 1,
            totalPasses: run.length,
          },
        },
      ];
    }),
  );
}

/**
 * The exact moments of every run that touches the window, each run in order.
 * Searches outward a day at a time until the planet is out of run range, so
 * passes before and after the window are counted too. Samples stay on the
 * window's daily grid so the planet's longitudes are shared across pairs.
 */
function runsAround(pair: TransitPair, window: TimeWindow, provider: EphemerisProvider): number[][] {
  const off = (time: number) => offFromExact(pair, time, provider);
  const inRunRange = (time: number) => Math.abs(off(time)) <= RUN_RANGE_DEGREES;

  let from = window.start;
  while (inRunRange(from) && window.start - from < MAX_RUN_SEARCH_MS) from -= DAY_MS;
  let to = window.start;
  while (to < window.end || (inRunRange(to) && to - window.end < MAX_RUN_SEARCH_MS)) to += DAY_MS;

  const runs: number[][] = [];
  let run: number[] = [];
  let value = off(from);
  for (let time = from; time < to; time += DAY_MS) {
    const next = time + DAY_MS;
    const nextValue = off(next);
    const bracketed = Math.abs(value) < BRACKET_DEGREES && Math.abs(nextValue) < BRACKET_DEGREES;
    if (bracketed && crosses(value, nextValue)) run.push(bisect(off, time, next));
    if (Math.abs(nextValue) > RUN_RANGE_DEGREES && run.length > 0) {
      runs.push(run);
      run = [];
    }
    value = nextValue;
  }
  if (run.length > 0) runs.push(run);
  return runs;
}
