import { DateTime } from "luxon";
import type { Chart, PlanetId } from "@/types/chart";
import type { TransitOptions, TransitReport } from "@/types/transit";
import { ephemeris, memoized, type EphemerisProvider } from "./ephemeris";
import { monthlyContext, monthRanges } from "./monthly";
import { changesDuring, housePlacements, placementIdsAt } from "./placements";
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
  const { window, monthCount } = resolveWindow(settings.start, settings.months, settings.end, zone);

  const pairs = transitPairs(chart, settings.planets, settings.aspects);
  const hits = pairs.flatMap((pair) => hitsInWindow(pair, window, sky, zone));
  hits.sort((a, b) => a.time - b.time);
  const stations = findStations(settings.planets, window, sky, zone);
  const ranges = monthRanges(window, monthCount, zone);
  const stays = chart.birthTimeKnown ? housePlacements(chart.ascendant.longitude, window, zone, sky) : [];

  return {
    window: { start: localDate(window.start, zone), end: localDate(window.end, zone) },
    transits: hits.map((hit) => hit.transit),
    placements: stays.map((stay) => ({
      id: stay.id,
      planet: stay.planet,
      house: stay.house,
      start: stay.start,
      end: stay.end,
    })),
    months: monthlyContext({
      months: ranges,
      pairs,
      hits,
      stations,
      provider: sky,
      orb: settings.monthlyOrb,
      gridStart: window.start,
    }).map((month, i) => ({
      ...month,
      // The card's date: the window start for the first month, the 1st after that.
      placementIds: placementIdsAt(stays, ranges[i].start),
      changes: changesDuring(stays, ranges[i].start, ranges[i].end),
    })),
  };
}

/**
 * The calendar's window: the start of `now`'s day in `zone`, through 31 December
 * of the next year. `end` is the first moment of 1 January, two years on.
 */
export function calendarWindow(now: Date, zone: string): Pick<TransitOptions, "start" | "end"> {
  const first = DateTime.fromJSDate(now, { zone }).startOf("day");
  const end = DateTime.fromObject({ year: first.year + 2, month: 1, day: 1 }, { zone });
  return { start: first.toJSDate(), end: end.toJSDate() };
}

/**
 * `end` wins over `months`. A caller that passes `months` gets that many
 * calendar months from the start day; the calendar passes `end` instead.
 */
function resolveWindow(
  start: Date,
  months: number,
  end: Date | undefined,
  zone: string,
): { window: TimeWindow; monthCount: number } {
  const first = DateTime.fromJSDate(start, { zone }).startOf("day");
  if (!end) {
    return { window: { start: first.toMillis(), end: first.plus({ months }).toMillis() }, monthCount: months };
  }
  const last = DateTime.fromJSDate(end, { zone });
  return {
    window: { start: first.toMillis(), end: last.toMillis() },
    monthCount: (last.year - first.year) * 12 + (last.month - first.month),
  };
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
            previousPassInWindow: i > 0 && run[i - 1] >= window.start && run[i - 1] < window.end,
            nextPassInWindow: i + 1 < run.length && run[i + 1] >= window.start && run[i + 1] < window.end,
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
