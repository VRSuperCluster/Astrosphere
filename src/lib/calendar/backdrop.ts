import type { CalendarChange, CalendarPlacement } from "@/types/calendar";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "July 2027" from a YYYY-MM-DD. The day is dropped: the span is month-precise. */
function monthYear(iso: string): string {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

/**
 * The span in front of a backdrop theme.
 * A stay that began before the window reads "Until July 2027 — …".
 * A stay that began during the window reads "Since July 2027 until August 2028 — …".
 */
export function backdropLine(placement: CalendarPlacement, windowStart: string): string {
  const end = monthYear(placement.end);
  const span = placement.start < windowStart ? `Until ${end}` : `Since ${monthYear(placement.start)} until ${end}`;
  return `${span} — ${placement.text}`;
}

/** A house change later in the month: "From 26 July — …". */
export function changeLine(change: CalendarChange): string {
  const day = Number(change.date.slice(8, 10));
  const month = MONTHS[Number(change.date.slice(5, 7)) - 1];
  return `From ${day} ${month} — ${change.placement.text}`;
}
