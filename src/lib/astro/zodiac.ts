import type { EclipticPosition, ZodiacSign } from "@/types/chart";

/** In order from 0° of the tropical zodiac, 30° each. */
export const SIGNS: readonly ZodiacSign[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

/** Any angle in degrees to 0 ≤ x < 360. */
export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Any angle in degrees to −180 < x ≤ 180: how far ahead (positive) or behind. */
export function signedDegrees(degrees: number): number {
  const normalized = normalizeDegrees(degrees);
  return normalized > 180 ? normalized - 360 : normalized;
}

export function signIndex(longitude: number): number {
  return Math.floor(normalizeDegrees(longitude) / 30);
}

export function eclipticPosition(longitude: number): EclipticPosition {
  const normalized = normalizeDegrees(longitude);
  const index = signIndex(normalized);
  return {
    longitude: normalized,
    sign: SIGNS[index],
    degreeInSign: normalized - index * 30,
  };
}
