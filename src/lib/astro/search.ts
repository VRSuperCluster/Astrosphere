/** Times are milliseconds since the epoch throughout. */
export const DAY_MS = 86_400_000;
export const MINUTE_MS = 60_000;

/** From `start` up to but not including `end`. */
export interface TimeWindow {
  start: number;
  end: number;
}

/** Negative on one side, zero or positive on the other. A sample that only touches zero doesn't cross. */
export function crosses(before: number, after: number): boolean {
  return before < 0 !== after < 0;
}

/** Narrows `[lo, hi]`, across which `f` crosses zero, to within `tolerance` and returns its middle. */
export function bisect(
  f: (time: number) => number,
  lo: number,
  hi: number,
  tolerance: number = MINUTE_MS,
): number {
  const below = f(lo) < 0;
  while (hi - lo > tolerance) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0 === below) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

export interface Crossing {
  time: number;
  /** From negative to zero or positive. */
  rising: boolean;
}

/**
 * Every crossing of zero by `f` from `start` to `end`, sampled every `step`
 * to bracket each one, then bisected. Two crossings inside one step cancel
 * out and are missed, so `step` must be shorter than the gap between them.
 * `accept` can reject a sign change that isn't a crossing (e.g. a jump from
 * +180° to −180°).
 */
export function findCrossings(
  f: (time: number) => number,
  start: number,
  end: number,
  step: number,
  accept: (before: number, after: number) => boolean = () => true,
): Crossing[] {
  const found: Crossing[] = [];
  let time = start;
  let value = f(time);
  while (time < end) {
    const next = Math.min(time + step, end);
    const nextValue = f(next);
    if (crosses(value, nextValue) && accept(value, nextValue)) {
      found.push({ time: bisect(f, time, next), rising: value < 0 });
    }
    time = next;
    value = nextValue;
  }
  return found;
}
