import { Body, Ecliptic, GeoVector } from "astronomy-engine";
import type { Planet, PlanetLongitudes } from "@/types/chart";

/**
 * The only way the rest of the app reads planetary positions, so the backend
 * (Astronomy Engine today) can be replaced without touching anything else.
 */
export interface EphemerisProvider {
  /**
   * Apparent geocentric ecliptic longitude on the true ecliptic and equinox
   * of date (tropical), in degrees, 0 ≤ λ < 360.
   */
  longitude(planet: Planet, instant: Date): number;
}

/** Traditional order: lights, then planets outward from the Sun. */
export const PLANETS: readonly Planet[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

const BODIES: Record<Planet, Body> = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
};

export const astronomyEngine: EphemerisProvider = {
  longitude(planet, instant) {
    // Astronomy Engine throws a bare string on an invalid date.
    if (!Number.isFinite(instant.getTime())) {
      throw new Error("Cannot compute a position for an invalid date");
    }
    // GeoVector corrects for light time; aberration on, plus Ecliptic's
    // rotation to the true ecliptic of date (precession and nutation),
    // gives the apparent position astro.com and the almanacs list.
    return Ecliptic(GeoVector(BODIES[planet], instant, true)).elon;
  },
};

export const ephemeris: EphemerisProvider = astronomyEngine;

export function planetLongitudes(
  instant: Date,
  provider: EphemerisProvider = ephemeris,
): PlanetLongitudes {
  return Object.fromEntries(
    PLANETS.map((planet) => [planet, provider.longitude(planet, instant)]),
  ) as PlanetLongitudes;
}
