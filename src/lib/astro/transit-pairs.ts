import type { Chart, PlanetId } from "@/types/chart";
import type { Transit, TransitAspectId, TransitTarget } from "@/types/transit";
import type { EphemerisProvider } from "./ephemeris";
import { signedDegrees } from "./zodiac";

/** The natal points transits are dated to, in chart order. */
export const TRANSIT_TARGETS: readonly TransitTarget[] = ["sun", "moon", "mercury", "venus", "mars", "asc"];

/**
 * Without a birth time the Ascendant is the Sun, so its transits would repeat
 * the Sun's, and a noon Moon can be ~6.5° off, which moves slow transits by months.
 */
const SOLAR_CHART_EXCLUDED: ReadonlySet<TransitTarget> = new Set(["asc", "moon"]);

/** Exact angles from the natal point, measured forward. Each one is its own run. */
const EXACT_ANGLES: Record<TransitAspectId, readonly number[]> = {
  conjunction: [0],
  square: [90, 270],
  opposition: [180],
};

/** One transiting planet, one natal point, one exact angle. */
export interface TransitPair {
  transiting: PlanetId;
  natal: TransitTarget;
  aspect: TransitAspectId;
  angle: number;
  natalLongitude: number;
  house: number | null;
}

/** An exact hit inside the window, with the pair it belongs to. */
export interface PairHit {
  pair: TransitPair;
  /** Milliseconds since the epoch. */
  time: number;
  transit: Transit;
}

export function transitPairs(
  chart: Chart,
  planets: readonly PlanetId[],
  aspects: readonly TransitAspectId[],
): TransitPair[] {
  const targets = chart.birthTimeKnown
    ? TRANSIT_TARGETS
    : TRANSIT_TARGETS.filter((target) => !SOLAR_CHART_EXCLUDED.has(target));

  return planets.flatMap((transiting) =>
    targets.flatMap((natal) => {
      const natalLongitude = natal === "asc" ? chart.ascendant.longitude : chart.planets[natal].longitude;
      const house = !chart.birthTimeKnown ? null : natal === "asc" ? 1 : chart.planets[natal].house;
      return aspects.flatMap((aspect) =>
        EXACT_ANGLES[aspect].map((angle) => ({ transiting, natal, aspect, angle, natalLongitude, house })),
      );
    }),
  );
}

/** Degrees the transiting planet is past (positive) or short of (negative) exact at `time`. */
export function offFromExact(pair: TransitPair, time: number, provider: EphemerisProvider): number {
  const longitude = provider.longitude(pair.transiting, new Date(time));
  return signedDegrees(longitude - pair.natalLongitude - pair.angle);
}
