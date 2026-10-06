import type { Place } from "./places";
import type { BirthDate, BirthTimeAnswer } from "./questionnaire";

/** What the chart is cast from: the questionnaire's birth answers. */
export interface ChartInput {
  date: BirthDate;
  time: BirthTimeAnswer;
  place: Place;
}

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

export type ZodiacSign =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

/** A point on the tropical zodiac. */
export interface EclipticPosition {
  /** Degrees, 0 ≤ λ < 360. */
  longitude: number;
  sign: ZodiacSign;
  /** Degrees into the sign, 0 ≤ d < 30. */
  degreeInSign: number;
}

export interface PlanetPlacement extends EclipticPosition {
  /** Whole Sign house, 1–12. */
  house: number;
}

interface ChartBase {
  /** For an unknown birth time, local noon on the birth date. */
  moment: BirthMoment;
  planets: Record<Planet, PlanetPlacement>;
  /** Whole Sign: the sign of each house, from house 1 to house 12. */
  houses: ZodiacSign[];
}

export interface TimedChart extends ChartBase {
  birthTimeKnown: true;
  ascendant: EclipticPosition;
  midheaven: EclipticPosition;
}

/**
 * Cast without a birth time: the Sun stands in for the Ascendant, so house 1
 * is the Sun's sign. House-based detail and the Ascendant's transits are skipped.
 */
export interface SolarChart extends ChartBase {
  birthTimeKnown: false;
  /** The Sun's position. */
  ascendant: EclipticPosition;
}

export type Chart = TimedChart | SolarChart;
