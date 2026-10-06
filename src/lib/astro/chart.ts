import type {
  Chart,
  ChartInput,
  EclipticPosition,
  Planet,
  PlanetLongitudes,
  PlanetPlacement,
} from "@/types/chart";
import { ascendant, midheaven } from "./angles";
import { ephemeris, planetLongitudes, PLANETS, type EphemerisProvider } from "./ephemeris";
import { birthTimeToUtc } from "./timezone";
import { eclipticPosition, normalizeDegrees, SIGNS, signIndex } from "./zodiac";

const SOLAR_CHART_TIME = { hour: 12, minute: 0 };

export function calculateChart(
  { date, time, place }: ChartInput,
  provider: EphemerisProvider = ephemeris,
): Chart {
  const moment = birthTimeToUtc(date, time.known ? time.time : SOLAR_CHART_TIME, place.timezone);
  const instant = new Date(moment.utc);
  const longitudes = planetLongitudes(instant, provider);

  if (!time.known) {
    const sun = eclipticPosition(longitudes.sun);
    return {
      birthTimeKnown: false,
      moment,
      ascendant: sun,
      ...wholeSignHouses(sun, longitudes),
    };
  }

  // Open-Meteo longitudes are east positive, as sidereal time needs.
  const localSiderealTime = normalizeDegrees(provider.siderealTime(instant) + place.longitude);
  const obliquity = provider.obliquity(instant);
  const asc = eclipticPosition(ascendant(localSiderealTime, place.latitude, obliquity));

  return {
    birthTimeKnown: true,
    moment,
    ascendant: asc,
    midheaven: eclipticPosition(midheaven(localSiderealTime, obliquity)),
    ...wholeSignHouses(asc, longitudes),
  };
}

/** House 1 is the whole sign `first` falls in; each later sign is the next house. */
function wholeSignHouses(
  first: EclipticPosition,
  longitudes: PlanetLongitudes,
): Pick<Chart, "houses" | "planets"> {
  const firstIndex = SIGNS.indexOf(first.sign);
  const houses = SIGNS.map((_, i) => SIGNS[(firstIndex + i) % 12]);
  const planets = Object.fromEntries(
    PLANETS.map((planet): [Planet, PlanetPlacement] => {
      const position = eclipticPosition(longitudes[planet]);
      const house = ((signIndex(position.longitude) - firstIndex + 12) % 12) + 1;
      return [planet, { ...position, house }];
    }),
  ) as Record<Planet, PlanetPlacement>;
  return { houses, planets };
}
