/** What had to change about the local birth time to pin it to one instant. */
export type DstAdjustment =
  /** The local time happened exactly once. */
  | "none"
  /** The clocks skipped this time (spring forward); it moves forward by the gap. */
  | "shiftedForward"
  /** The clocks passed this time twice (fall back); the earlier one is used. */
  | "earlierOccurrence";

/** Bodies the chart is built from. The Sun and Moon count as planets here. */
export type Planet =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto";

/** Ecliptic longitude in degrees, 0 ≤ λ < 360, for every planet. */
export type PlanetLongitudes = Record<Planet, number>;

/** The instant of birth, resolved from local time at the place of birth. */
export interface BirthMoment {
  /** ISO 8601 in UTC, e.g. "1990-06-14T13:30:00.000Z". */
  utc: string;
  /** IANA zone the local time was read in. */
  zone: string;
  /** Offset from UTC at that instant, in minutes, east positive. */
  utcOffsetMinutes: number;
  dstAdjustment: DstAdjustment;
}
