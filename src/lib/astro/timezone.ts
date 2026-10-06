import { DateTime, IANAZone } from "luxon";
import type { BirthMoment, DstAdjustment } from "@/types/chart";
import type { BirthDate, BirthTime } from "@/types/questionnaire";

/**
 * Resolves wall-clock birth time in `zone` (IANA, from the geocoder) to UTC.
 * Never uses the server's or browser's zone.
 * Error messages leave out the birth date and time so they stay out of logs.
 */
export function birthTimeToUtc(date: BirthDate, time: BirthTime, zone: string): BirthMoment {
  // Luxon reads "local", "system" and "default" as the machine's zone, and
  // "UTC+3" as a fixed offset with no history.
  if (!IANAZone.isValidZone(zone)) {
    throw new Error(`Cannot resolve birth time: "${zone}" is not an IANA zone`);
  }

  const local = DateTime.fromObject({ ...date, ...time }, { zone });
  if (!local.isValid) {
    throw new Error(`Cannot resolve birth time in zone "${zone}": ${local.invalidReason}`);
  }

  // Luxon moves a time inside a spring-forward gap forward by the gap, so the
  // round trip back to local time no longer matches what was entered.
  const roundTrip = local.toUTC().setZone(zone);
  if (!matchesWallClock(roundTrip, date, time)) {
    return toMoment(local, zone, "shiftedForward");
  }

  // Which occurrence luxon picks on its own depends on the current date.
  const occurrences = local.getPossibleOffsets();
  if (occurrences.length > 1) {
    const earliest = occurrences.reduce((a, b) => (b.toMillis() < a.toMillis() ? b : a));
    return toMoment(earliest, zone, "earlierOccurrence");
  }

  return toMoment(local, zone, "none");
}

function matchesWallClock(dt: DateTime, date: BirthDate, time: BirthTime): boolean {
  return (
    dt.year === date.year &&
    dt.month === date.month &&
    dt.day === date.day &&
    dt.hour === time.hour &&
    dt.minute === time.minute
  );
}

function toMoment(dt: DateTime, zone: string, dstAdjustment: DstAdjustment): BirthMoment {
  return {
    utc: dt.toJSDate().toISOString(),
    zone,
    utcOffsetMinutes: dt.offset,
    dstAdjustment,
  };
}
