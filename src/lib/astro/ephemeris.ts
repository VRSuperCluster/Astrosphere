import { Body, e_tilt, Ecliptic, GeoVector, MakeTime, SiderealTime } from "astronomy-engine";
import type { Planet, PlanetLongitudes } from "@/types/chart";

/**
 * The only way the rest of the app reads astronomical data, so the backend
 * (Astronomy Engine today) can be replaced without touching anything else.
 */
export interface EphemerisProvider {
  /**
   * Apparent geocentric ecliptic longitude on the true ecliptic and equinox
   * of date (tropical), in degrees, 0 ≤ λ < 360.
   */
  longitude(planet: Planet, instant: Date): number;
  /** Greenwich apparent sidereal time, in degrees, 0 ≤ θ < 360. */
  siderealTime(instant: Date): number;
  /** True obliquity of the ecliptic (the Earth's axial tilt of date), in degrees. */
  obliquity(instant: Date): number;
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

/** Astronomy Engine throws a bare string on an invalid date. */
function assertValid(instant: Date): void {
  if (!Number.isFinite(instant.getTime())) {
    throw new Error("Cannot compute a position for an invalid date");
  }
}

export const astronomyEngine: EphemerisProvider = {
  longitude(planet, instant) {
    assertValid(instant);
    // GeoVector corrects for light time; aberration on, plus Ecliptic's
    // rotation to the true ecliptic of date (precession and nutation),
    // gives the apparent position astro.com and the almanacs list.
    return Ecliptic(GeoVector(BODIES[planet], instant, true)).elon;
  },
  siderealTime(instant) {
    assertValid(instant);
    return SiderealTime(instant) * 15;
  },
  obliquity(instant) {
    assertValid(instant);
    return e_tilt(MakeTime(instant)).tobl;
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
