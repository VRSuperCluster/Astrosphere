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

/**
 * One continuous stay of an outer planet in a Whole Sign house.
 * `start` and `end` are the real ingress dates, which may fall outside the window.
 */
export interface HousePlacement {
  /** Stable, e.g. "jupiter-12-2026-06-30". The date is the day the stay begins. */
  id: string;
  planet: PlanetId;
  /** Whole Sign house, counted from the Ascendant's sign. */
  house: number;
  /** YYYY-MM-DD, local to the birth zone. */
  start: string;
  /** YYYY-MM-DD, local: the day the planet leaves this house. */
  end: string;
}

/** A house change during a month, after the card's date. */
export interface HouseChange {
  /** YYYY-MM-DD, local: the day the new stay begins. */
  date: string;
  placementId: string;
}

/** What a monthly card is written from. */
export interface MonthContext {
  /** YYYY-MM. */
  month: string;
  /** Tightest first. */
  active: ActiveTransit[];
  stations: Station[];
  /**
   * Backdrop stays in effect on the card's date, Jupiter through Pluto.
   * The first card's date is the window start; later cards use the 1st.
   * Empty when the birth time is unknown.
   */
  placementIds: string[];
  /**
   * Stays that begin after the card's date and before the month ends, earliest first.
   * The card shows these after the backdrop. The next month shows the new stay as the backdrop.
   */
  changes: HouseChange[];
}

export interface TransitReport {
  /** YYYY-MM-DD, local to the birth zone; `end` is the first day after the window. */
  window: { start: string; end: string };
  /** Exact hits inside the window, in date order. */
  transits: Transit[];
  /** One per month, starting with the window's first (partial) month. */
  months: MonthContext[];
  /**
   * Outer-planet house stays that touch the window. Empty when the birth time
   * is unknown. Dates may lie outside the window.
   */
  placements: HousePlacement[];
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
