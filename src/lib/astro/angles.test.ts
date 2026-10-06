import { describe, expect, it } from "vitest";
import { ascendant, midheaven } from "./angles";

const RAD = Math.PI / 180;
const OBLIQUITY = 23.44;

/** Hour angle and altitude of an ecliptic point (latitude 0), all in degrees. */
function horizonPosition(longitude: number, localSiderealTime: number, latitude: number) {
  const l = longitude * RAD;
  const eps = OBLIQUITY * RAD;
  const rightAscension = Math.atan2(Math.sin(l) * Math.cos(eps), Math.cos(l));
  const declination = Math.asin(Math.sin(l) * Math.sin(eps));
  const hourAngle = localSiderealTime * RAD - rightAscension;
  const altitude = Math.asin(
    Math.sin(latitude * RAD) * Math.sin(declination) +
      Math.cos(latitude * RAD) * Math.cos(declination) * Math.cos(hourAngle),
  );
  return { hourAngle: hourAngle / RAD, altitude: altitude / RAD };
}

const SIDEREAL_TIMES = Array.from({ length: 72 }, (_, i) => i * 5 + 2.5);

describe("midheaven", () => {
  it.each([
    [0, 0],
    [90, 90],
    [180, 180],
    [270, 270],
  ])("at sidereal time %d° is %d°", (lst, expected) => {
    expect(midheaven(lst, OBLIQUITY)).toBeCloseTo(expected, 9);
  });

  it("is always on the upper meridian", () => {
    for (const lst of SIDEREAL_TIMES) {
      const { hourAngle } = horizonPosition(midheaven(lst, OBLIQUITY), lst, 45);
      expect(Math.cos(hourAngle * RAD)).toBeCloseTo(1, 9);
    }
  });
});

describe("ascendant", () => {
  it("is 0° Cancer at the equator when 0° Aries culminates", () => {
    expect(ascendant(0, 0, OBLIQUITY)).toBeCloseTo(90, 9);
  });

  it("is 0° Libra at the equator when 0° Cancer culminates", () => {
    expect(ascendant(90, 0, OBLIQUITY)).toBeCloseTo(180, 9);
  });

  describe.each([-89, -75, -66, -51.5, -33.9, 0, 19.4, 40.7, 51.5, 64.1, 66, 67, 69.6, 78.2, 89])(
    "at latitude %d°",
    (latitude) => {
      it("is on the eastern horizon at every sidereal time", () => {
        for (const lst of SIDEREAL_TIMES) {
          const longitude = ascendant(lst, latitude, OBLIQUITY);
          const { hourAngle, altitude } = horizonPosition(longitude, lst, latitude);
          expect(longitude).toBeGreaterThanOrEqual(0);
          expect(longitude).toBeLessThan(360);
          expect(altitude).toBeCloseTo(0, 9);
          // East of the meridian: hour angle between −180° and 0°.
          expect(Math.sin(hourAngle * RAD)).toBeLessThan(0);
        }
      });
    },
  );
});
