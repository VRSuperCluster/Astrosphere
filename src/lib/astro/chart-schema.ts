import { IANAZone } from "luxon";
import { z } from "zod";
import type { AspectId, Chart, PointId } from "@/types/chart";
import { ASPECTS } from "./aspects";
import { PLANETS } from "./ephemeris";
import { SIGNS } from "./zodiac";

/**
 * The chart JSON as `/api/chart` returns it, for routes that receive it back
 * from the browser. Strict objects and enums only, so no free text the
 * client sends can reach a prompt.
 */

const planetId = z.enum(PLANETS);
const pointId = z.enum([...PLANETS, "asc", "mc"] as readonly PointId[]);
const aspectId = z.enum(Object.keys(ASPECTS) as AspectId[]);
const sign = z.enum(SIGNS);
const longitude = z.number().min(0).lt(360);

const position = z.strictObject({
  longitude,
  sign,
  degreeInSign: z.number().min(0).lt(30),
});

const placement = position.extend({ house: z.int().min(1).max(12) });

const moment = z.strictObject({
  utc: z.iso.datetime(),
  zone: z.string().refine((zone) => IANAZone.isValidZone(zone)),
  utcOffsetMinutes: z.int(),
  dstAdjustment: z.enum(["none", "shiftedForward", "earlierOccurrence"]),
});

const base = {
  moment,
  planets: z.record(planetId, placement),
  houses: z.array(sign).length(12),
  aspects: z
    .array(z.strictObject({ points: z.tuple([pointId, pointId]), aspect: aspectId, orb: z.number().min(0) }))
    .max(100),
};

export const chartSchema: z.ZodType<Chart> = z.discriminatedUnion("birthTimeKnown", [
  z.strictObject({
    ...base,
    birthTimeKnown: z.literal(true),
    ascendant: position,
    midheaven: position,
  }),
  z.strictObject({
    ...base,
    birthTimeKnown: z.literal(false),
    ascendant: position,
    moonSignCertain: z.boolean(),
  }),
]);
