import type { PlanetId } from "@/types/chart";
import type { CalendarChange, CalendarEntry, CalendarMonth, CalendarPlacement } from "@/types/calendar";
import type { TransitTarget } from "@/types/transit";

/** Prefixed to the title. One map, used for every event in the file. */
export const TITLE_MARKERS = {
  monthly: "◐",
  dated: "✦",
  houseChange: "→",
} as const;

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

const PLANET_NAME: Record<PlanetId, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
};

const POINT_NAME: Record<TransitTarget, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  asc: "Ascendant",
};

export function eventTitle(kind: keyof typeof TITLE_MARKERS, title: string): string {
  return `${TITLE_MARKERS[kind]} ${title}`;
}

/** "Saturn square your Sun · 2 of 3". The pass is left off when the run has one hit. */
export function transitFooter(entry: Pick<CalendarEntry, "transiting" | "aspect" | "natal" | "pass" | "totalPasses">): string {
  const line = `${PLANET_NAME[entry.transiting]} ${entry.aspect} your ${POINT_NAME[entry.natal]}`;
  return entry.totalPasses === 1 ? line : `${line} · ${entry.pass} of ${entry.totalPasses}`;
}

export function transitDescription(entry: CalendarEntry): string {
  return `${entry.description}\n\n—\n${transitFooter(entry)}`;
}

/** "Jupiter enters your 1st house". */
export function ingressPhrase(placement: Pick<CalendarPlacement, "planet" | "house">): string {
  return `${PLANET_NAME[placement.planet]} enters your ${ordinal(placement.house)} house`;
}

export function ingressDescription(placement: CalendarPlacement): string {
  return `${placement.text}\n\n—\n${ingressPhrase(placement)}`;
}

/**
 * The month line, then the long view when the birth time is known.
 * A chart without houses has no backdrop, so the month line stands alone.
 */
export function monthDescription(month: CalendarMonth): string {
  if (month.placements.length === 0 && month.changes.length === 0) return month.description;
  const lines = [month.description, "", "THE LONG VIEW"];
  for (const placement of month.placements) {
    lines.push(placementHeader(placement), placement.text, "");
  }
  for (const change of month.changes) {
    lines.push(ingressHeader(change), change.placement.text);
  }
  return lines.join("\n");
}

/** "FEB 2026 – APR 2028 · Saturn in your 8th house". */
export function placementHeader(placement: CalendarPlacement): string {
  const range = `${monthStamp(placement.start)} – ${monthStamp(placement.end)}`;
  return `${range} · ${PLANET_NAME[placement.planet]} in your ${ordinal(placement.house)} house`;
}

/** "26 JUL 2027 · Jupiter enters your 1st house". */
export function ingressHeader(change: CalendarChange): string {
  return `${dayStamp(change.date)} · ${ingressPhrase(change.placement)}`;
}

function monthStamp(iso: string): string {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

function dayStamp(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${monthStamp(iso)}`;
}

function ordinal(house: number): string {
  const teen = house % 100;
  if (teen >= 11 && teen <= 13) return `${house}th`;
  switch (house % 10) {
    case 1:
      return `${house}st`;
    case 2:
      return `${house}nd`;
    case 3:
      return `${house}rd`;
    default:
      return `${house}th`;
  }
}
