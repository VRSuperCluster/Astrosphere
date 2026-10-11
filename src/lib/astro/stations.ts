import type { PlanetId } from "@/types/chart";
import type { Station } from "@/types/transit";
import type { EphemerisProvider } from "./ephemeris";
import { DAY_MS, findCrossings, type TimeWindow } from "./search";
import { localDate } from "./timezone";
import { signedDegrees } from "./zodiac";

/**
 * Every time a planet stands still and turns inside the window, in date order.
 * Daily motion is measured across the day centred on each sample, so the
 * longitudes it needs fall on the window's daily grid.
 */
export function findStations(
  planets: readonly PlanetId[],
  window: TimeWindow,
  provider: EphemerisProvider,
  zone: string,
): Station[] {
  const found = planets.flatMap((planet) => {
    const dailyMotion = (time: number) =>
      signedDegrees(
        provider.longitude(planet, new Date(time + DAY_MS / 2)) -
          provider.longitude(planet, new Date(time - DAY_MS / 2)),
      );
    return findCrossings(dailyMotion, window.start + DAY_MS / 2, window.end, DAY_MS).map((crossing) => ({
      time: crossing.time,
      station: {
        planet,
        direction: crossing.rising ? "direct" : "retrograde",
        date: localDate(crossing.time, zone),
      } satisfies Station,
    }));
  });
  return found.sort((a, b) => a.time - b.time).map(({ station }) => station);
}
