import type { PlanetId } from "@/types/chart";
import type { HousePlacement } from "@/types/transit";
import type { EphemerisProvider } from "./ephemeris";
import { DAY_MS, type TimeWindow } from "./search";
import { localDate } from "./timezone";
import { signIndex } from "./zodiac";

/** Backdrop order. Jupiter first, then outward. */
const PLANETS = ["jupiter", "saturn", "uranus", "neptune", "pluto"] as const satisfies readonly PlanetId[];

/** Outer planets stay well under 30° in three weeks, so a sign change cannot hide between samples. */
const STEP_MS = 20 * DAY_MS;

/** Pluto near its slowest takes about three decades to cross a sign. */
const MAX_MS = 40 * 365.25 * DAY_MS;

interface Stay extends HousePlacement {
  startMs: number;
  endMs: number;
}

/**
 * Every Whole Sign stay of Jupiter through Pluto that overlaps `window`.
 * Each stay runs from the ingress that began it to the ingress that ends it,
 * including dates outside the window.
 */
export function housePlacements(
  ascendantLongitude: number,
  window: TimeWindow,
  zone: string,
  provider: EphemerisProvider,
): Stay[] {
  const ascendant = signIndex(ascendantLongitude);
  return PLANETS.flatMap((planet) => staysOf(planet, ascendant, window, zone, provider));
}

/**
 * Stays that begin after `fromMs` and before `toMs`, earliest first.
 * These are the house changes on a card whose date is `fromMs`.
 */
export function changesDuring(
  stays: readonly Stay[],
  fromMs: number,
  toMs: number,
): { date: string; placementId: string }[] {
  const order = new Map<string, number>(PLANETS.map((planet, index) => [planet, index]));
  return stays
    .filter((stay) => stay.startMs > fromMs && stay.startMs < toMs)
    .sort((a, b) => a.startMs - b.startMs || (order.get(a.planet) ?? 0) - (order.get(b.planet) ?? 0))
    .map((stay) => ({ date: stay.start, placementId: stay.id }));
}

/** The stay in effect at `time`, one id per planet, Jupiter through Pluto. */
export function placementIdsAt(stays: readonly Stay[], time: number): string[] {
  return PLANETS.flatMap((planet) => {
    const stay = stays.find((item) => item.planet === planet && item.startMs <= time && time < item.endMs);
    return stay ? [stay.id] : [];
  });
}

function staysOf(
  planet: PlanetId,
  ascendant: number,
  window: TimeWindow,
  zone: string,
  provider: EphemerisProvider,
): Stay[] {
  const houseAt = (time: number) => houseOf(provider.longitude(planet, new Date(time)), ascendant);
  const stays: Stay[] = [];
  let time = window.start;
  while (time < window.end) {
    const house = houseAt(time);
    const startMs = boundary(houseAt, time, house, -1);
    const endMs = boundary(houseAt, time, house, 1);
    stays.push(stay(planet, house, startMs, endMs, zone));
    if (endMs <= time) break;
    time = endMs;
  }
  return stays;
}

function stay(planet: PlanetId, house: number, startMs: number, endMs: number, zone: string): Stay {
  const start = localDate(startMs, zone);
  return {
    id: `${planet}-${house}-${start}`,
    planet,
    house,
    start,
    end: localDate(endMs, zone),
    startMs,
    endMs,
  };
}

/** Whole Sign house of a tropical longitude, counted from the Ascendant's sign. */
function houseOf(longitude: number, ascendant: number): number {
  return ((signIndex(longitude) - ascendant + 12) % 12) + 1;
}

/**
 * The instant `houseAt` stops returning `house`, searching forward or back.
 * The search gives up after 40 years and uses that far instant, so a planet
 * that never changes sign still produces one finite stay.
 */
function boundary(houseAt: (time: number) => number, origin: number, house: number, direction: 1 | -1): number {
  let previous = origin;
  const limit = origin + direction * MAX_MS;
  for (let time = origin + direction * STEP_MS; direction > 0 ? time < limit : time > limit; time += direction * STEP_MS) {
    if (houseAt(time) !== house) return entered(houseAt, previous, time);
    previous = time;
  }
  return limit;
}

/**
 * The first instant of the house being entered, to the nearest second.
 * `before` is still in the old house and `after` is in the new one, in either
 * order. Returning the new house's side keeps an exact-midnight ingress on
 * the day it happens.
 */
function entered(houseAt: (time: number) => number, before: number, after: number): number {
  let lo = Math.min(before, after);
  let hi = Math.max(before, after);
  const enteredHouse = houseAt(Math.max(before, after));
  while (hi - lo > 1000) {
    const mid = (lo + hi) / 2;
    if (houseAt(mid) === enteredHouse) hi = mid;
    else lo = mid;
  }
  return hi;
}
