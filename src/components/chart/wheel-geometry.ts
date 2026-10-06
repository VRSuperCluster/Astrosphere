import { normalizeDegrees } from "@/lib/astro/zodiac";
import type { Chart, Planet } from "@/types/chart";

export const WHEEL_SIZE = 320;
export const CENTER = WHEEL_SIZE / 2;
export const OUTER_RADIUS = 150;
export const INNER_RADIUS = 100;
/** Rings a planet can sit on, first choice first, so planets close together don't overlap. */
export const LANES = [125, 111, 139] as const;
/** Closest two planets may sit on one ring, in degrees. */
const MIN_SEPARATION = 8;

export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  from: Point;
  to: Point;
}

export interface PlacedPlanet {
  planet: Planet;
  radius: number;
  point: Point;
}

/** `rising` sits at 9 o'clock and longitude runs counterclockwise, as on a printed chart. */
export function pointAt(longitude: number, rising: number, radius: number): Point {
  const angle = ((180 + longitude - rising) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(angle), y: CENTER - radius * Math.sin(angle) };
}

/** Lines between the twelve signs. With Whole Sign houses these are the house lines too. */
export function signDividers(rising: number): Segment[] {
  return Array.from({ length: 12 }, (_, i) => ({
    from: pointAt(i * 30, rising, INNER_RADIUS),
    to: pointAt(i * 30, rising, OUTER_RADIUS),
  }));
}

/** A line across the inner circle through `longitude` and the point opposite. */
export function axis(longitude: number, rising: number): Segment {
  return {
    from: pointAt(longitude, rising, INNER_RADIUS),
    to: pointAt(longitude + 180, rising, INNER_RADIUS),
  };
}

export function placePlanets(chart: Chart): PlacedPlanet[] {
  const rising = chart.ascendant.longitude;
  const byLongitude = (Object.keys(chart.planets) as Planet[])
    .map((planet) => ({ planet, longitude: chart.planets[planet].longitude }))
    .sort((a, b) => a.longitude - b.longitude);

  const occupied: number[][] = LANES.map(() => []);
  return byLongitude.map(({ planet, longitude }) => {
    const free = occupied.findIndex((lane) =>
      lane.every((other) => arc(other, longitude) >= MIN_SEPARATION),
    );
    const lane = free === -1 ? 0 : free;
    occupied[lane].push(longitude);
    return { planet, radius: LANES[lane], point: pointAt(longitude, rising, LANES[lane]) };
  });
}

/** Shortest distance around the circle, in degrees. */
function arc(a: number, b: number): number {
  const d = normalizeDegrees(a - b);
  return Math.min(d, 360 - d);
}
