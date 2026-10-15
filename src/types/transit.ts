import type { AspectId, PlanetId, PointId } from "./chart";

/** Transits use only the hard aspects. */
export type TransitAspectId = Extract<AspectId, "conjunction" | "square" | "opposition">;

/** The natal points transits are dated to. The MC is left out on purpose. */
export type TransitTarget = Extract<PointId, "sun" | "moon" | "mercury" | "venus" | "mars" | "asc">;

/** One exact hit of a transiting planet to a natal point. */
export interface Transit {
  /** Stable, e.g. "saturn-square-sun-2027-03-14". */
  id: string;
  /** YYYY-MM-DD: the local date of the exact moment in the birth zone. */
  date: string;
  transiting: PlanetId;
  natal: TransitTarget;
  aspect: TransitAspectId;
  /** Whole Sign house of the natal point; null when the birth time is unknown. */
  house: number | null;
  /** 1-based position in the run. */
  pass: number;
  /** Hits in the whole run, including any before or after the window. */
  totalPasses: number;
  /** The previous pass of this run falls inside the window. False when this is pass 1. */
  previousPassInWindow: boolean;
  /** The next pass of this run falls inside the window. False when this is the final pass. */
  nextPassInWindow: boolean;
}

export type StationDirection = "retrograde" | "direct";

/** An outer planet standing still before it turns. */
export interface Station {
  planet: PlanetId;
  /** The direction it turns to. */
  direction: StationDirection;
  /** YYYY-MM-DD, local to the birth zone. */
  date: string;
}

/** A transit within orb at some point during a month. Orbs in degrees from exact. */
export interface ActiveTransit {
  transiting: PlanetId;
  natal: TransitTarget;
  aspect: TransitAspectId;
  /** 0 when it is exact this month. */
  closestOrb: number;
  orbAtStart: number;
  orbAtEnd: number;
  /** The month's exact hits of this transit, as `Transit.id`s. */
  transitIds: string[];
}

/** What a monthly card is written from. */
export interface MonthContext {
  /** YYYY-MM. */
  month: string;
  /** Tightest first. */
  active: ActiveTransit[];
  stations: Station[];
}

export interface TransitReport {
  /** YYYY-MM-DD, local to the birth zone; `end` is the first day after the window. */
  window: { start: string; end: string };
  /** Exact hits inside the window, in date order. */
  transits: Transit[];
  /** One per month, starting with the window's first (partial) month. */
  months: MonthContext[];
}

export interface TransitOptions {
  /** The window starts at the beginning of this day, in the birth zone. */
  start: Date;
  /**
   * Window length in calendar months, and the number of monthly cards.
   * Ignored when `end` is set.
   */
  months: number;
  /**
   * Exclusive end of the window. The calendar passes the start of 1 January
   * two years on, so the window runs through 31 December of the next year.
   */
  end?: Date;
  /** Transiting planets. */
  planets: readonly PlanetId[];
  aspects: readonly TransitAspectId[];
  /** Widest orb, in degrees, at which a transit counts as active in a month. */
  monthlyOrb: number;
}
