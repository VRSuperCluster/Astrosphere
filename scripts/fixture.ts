/**
 * Birth-data fixtures for the live prompt runners. Public charts or made-up data only.
 */
import { readFile } from "node:fs/promises";
import { IANAZone } from "luxon";
import { z } from "zod";
import { calculateChart } from "@/lib/astro/chart";
import { CHANGE_STANCE_OPTIONS, LIFE_AREA_OPTIONS } from "@/lib/questionnaire/context-questions";
import type { Chart } from "@/types/chart";
import type { SummaryContext } from "@/types/summary";

const fixtureSchema = z.strictObject({
  label: z.string(),
  date: z.strictObject({ year: z.int(), month: z.int().min(1).max(12), day: z.int().min(1).max(31) }),
  time: z.discriminatedUnion("known", [
    z.strictObject({
      known: z.literal(true),
      time: z.strictObject({ hour: z.int().min(0).max(23), minute: z.int().min(0).max(59) }),
    }),
    z.strictObject({ known: z.literal(false) }),
  ]),
  place: z.strictObject({
    name: z.string(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timezone: z.string().refine((zone) => IANAZone.isValidZone(zone)),
  }),
  firstName: z.string().optional(),
  lifeArea: z.enum(LIFE_AREA_OPTIONS.map((option) => option.value)).optional(),
  changeStance: z.enum(CHANGE_STANCE_OPTIONS.map((option) => option.value)).optional(),
});

export interface LoadedFixture {
  path: string;
  label: string;
  chart: Chart;
  context: SummaryContext;
}

export async function loadFixture(path: string): Promise<LoadedFixture> {
  const fixture = fixtureSchema.parse(JSON.parse(await readFile(path, "utf8")));
  const { label, date, time, place, ...context } = fixture;
  return {
    path,
    label,
    chart: calculateChart({ date, time, place: { id: 0, ...place } }),
    context,
  };
}
