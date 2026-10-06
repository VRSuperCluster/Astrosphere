import { normalizeDegrees } from "./zodiac";

const RAD = Math.PI / 180;

/**
 * Ecliptic longitude culminating on the upper meridian.
 * `localSiderealTime` and `obliquity` in degrees.
 */
export function midheaven(localSiderealTime: number, obliquity: number): number {
  const theta = localSiderealTime * RAD;
  return normalizeDegrees(
    Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(obliquity * RAD)) / RAD,
  );
}

/**
 * Ecliptic longitude rising on the eastern horizon.
 * `localSiderealTime`, `latitude` (north positive) and `obliquity` in degrees.
 */
export function ascendant(localSiderealTime: number, latitude: number, obliquity: number): number {
  const theta = localSiderealTime * RAD;
  const eps = obliquity * RAD;
  const lambda =
    Math.atan2(
      Math.cos(theta),
      -(Math.sin(theta) * Math.cos(eps) + Math.tan(latitude * RAD) * Math.sin(eps)),
    ) / RAD;

  // Inside the polar circles the formula gives the setting point for part of
  // each day; the rising point is the opposite one.
  return normalizeDegrees(isEast(lambda, theta, eps) ? lambda : lambda + 180);
}

/** Whether ecliptic longitude `lambda` (degrees) lies east of the meridian. */
function isEast(lambda: number, theta: number, eps: number): boolean {
  // Dot product with the east point of the horizon, which sits on the
  // equator at right ascension θ + 90°.
  const l = lambda * RAD;
  return -Math.sin(theta) * Math.cos(l) + Math.cos(theta) * Math.sin(l) * Math.cos(eps) > 0;
}
