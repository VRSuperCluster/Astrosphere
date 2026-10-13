import { separation } from "@/lib/astro/aspects";
import type { Chart, PlanetId, PointId } from "@/types/chart";

/** Extra room past the outer ring, so a marker can sit outside it without being clipped. */
export const WHEEL_SIZE = 400;
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
  planet: PlanetId;
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

/** Just outside the outer ring, along the same direction as the point. */
const MARKER_RADIUS = OUTER_RADIUS + 18;
const MARKER_SPREAD = 14;

/**
 * Where numbered markers sit. Outside the ring, so they don't cover a dot,
 * and spread sideways when one point carries more than one number.
 */
export function markerPositions(at: Point, count: number): Point[] {
  const dx = at.x - CENTER;
  const dy = at.y - CENTER;
  const length = Math.hypot(dx, dy) || 1;
  const outwardX = dx / length;
  const outwardY = dy / length;
  const anchor = { x: CENTER + outwardX * MARKER_RADIUS, y: CENTER + outwardY * MARKER_RADIUS };
  const sideX = -outwardY;
  const sideY = outwardX;

  return Array.from({ length: count }, (_, index) => {
    const along = (index - (count - 1) / 2) * MARKER_SPREAD;
    return { x: anchor.x + sideX * along, y: anchor.y + sideY * along };
  });
}

export interface PlacedMarker {
  point: PointId;
  number: number;
  x: number;
  y: number;
}

/** Places every marker, then eases apart any that would sit on each other. */
export function layoutMarkers(
  items: readonly { point: PointId; at: Point; numbers: readonly number[] }[],
): PlacedMarker[] {
  const placed: PlacedMarker[] = items.flatMap((item) =>
    markerPositions(item.at, item.numbers.length).map((position, index) => ({
      point: item.point,
      number: item.numbers[index],
      x: position.x,
      y: position.y,
    })),
  );

  const minDistance = 16;
  for (let step = 0; step < 8; step++) {
    let moved = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = 0; j < i; j++) {
        const dx = placed[i].x - placed[j].x;
        const dy = placed[i].y - placed[j].y;
        const distance = Math.hypot(dx, dy);
        if (distance >= minDistance) continue;
        const push = (minDistance - distance) / 2;
        const ox = placed[i].x - CENTER;
        const oy = placed[i].y - CENTER;
        const length = Math.hypot(ox, oy) || 1;
        const sideX = -oy / length;
        const sideY = ox / length;
        const sign = dx * sideX + dy * sideY >= 0 ? 1 : -1;
        placed[i] = { ...placed[i], x: placed[i].x + sideX * push * sign, y: placed[i].y + sideY * push * sign };
        placed[j] = { ...placed[j], x: placed[j].x - sideX * push * sign, y: placed[j].y - sideY * push * sign };
        moved = true;
      }
    }
    if (!moved) break;
  }

  return placed;
}

export function placePlanets(chart: Chart): PlacedPlanet[] {
  const rising = chart.ascendant.longitude;
  const byLongitude = (Object.keys(chart.planets) as PlanetId[])
    .map((planet) => ({ planet, longitude: chart.planets[planet].longitude }))
    .sort((a, b) => a.longitude - b.longitude);

  const occupied: number[][] = LANES.map(() => []);
  return byLongitude.map(({ planet, longitude }) => {
    const free = occupied.findIndex((lane) =>
      lane.every((other) => separation(other, longitude) >= MIN_SEPARATION),
    );
    const lane = free === -1 ? 0 : free;
    occupied[lane].push(longitude);
    return { planet, radius: LANES[lane], point: pointAt(longitude, rising, LANES[lane]) };
  });
}
