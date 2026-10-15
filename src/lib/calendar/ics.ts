import type { Calendar, CalendarChange } from "@/types/calendar";
import type { BirthDate, BirthTimeAnswer } from "@/types/questionnaire";
import { eventTitle, ingressDescription, ingressPhrase, monthDescription, transitDescription } from "./labels";

/** Fixed suffix so a UID is an address, not a bare id. */
const UID_DOMAIN = "astroscope.app";

/**
 * The birth facts the UID hash is taken from. Place name and geocoder id are
 * left out: the same coordinates and zone are the same birth.
 */
export interface IcsBirth {
  date: BirthDate;
  time: BirthTimeAnswer;
  latitude: number;
  longitude: number;
  timezone: string;
}

/** RFC 5545 text escaping. Backslash first, so the escapes themselves stay literal. */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\n|\r/g, "\\n");
}

/**
 * Fold a content line at 75 octets. A continuation starts with a space, and
 * that space counts toward the 75. The break is always between characters, so
 * an em dash or a curly quote is never split.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let folded = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (octets + size > 75) {
      folded += "\r\n ";
      octets = 1;
    }
    folded += char;
    octets += size;
  }
  return folded;
}

/** `test-2027.ics`. The year is the last year the window covers. */
export function icsFilename(calendar: Calendar, firstName?: string): string {
  const year = calendar.months.at(-1)?.month.slice(0, 4) ?? calendar.generatedOn.slice(0, 4);
  const slug = (firstName ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "calendar"}-${year}.ics`;
}

/** The whole file. The same calendar and birth data always produce the same UIDs. */
export function buildIcs(calendar: Calendar, birth: IcsBirth): string {
  const stamp = `${compact(calendar.generatedOn)}T000000Z`;
  const birthHash = hashBirth(birth);
  const events = [
    ...calendar.entries.map((entry) =>
      event({
        uid: uid(entry.transitId, birthHash),
        stamp,
        start: entry.date,
        summary: eventTitle("dated", entry.title),
        description: transitDescription(entry),
      }),
    ),
    ...houseChanges(calendar).map((change) =>
      event({
        uid: uid(change.placement.id, birthHash),
        stamp,
        start: change.date,
        summary: eventTitle("houseChange", ingressPhrase(change.placement)),
        description: ingressDescription(change.placement),
      }),
    ),
    ...calendar.months.map((month) =>
      event({
        uid: uid(month.month, birthHash),
        stamp,
        start: month.month === calendar.generatedOn.slice(0, 7) ? calendar.generatedOn : `${month.month}-01`,
        summary: eventTitle("monthly", month.title),
        description: monthDescription(month),
      }),
    ),
  ];
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Astroscope//Transit Calendar//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function houseChanges(calendar: Calendar): CalendarChange[] {
  return calendar.months.flatMap((month) => month.changes);
}

function event(input: { uid: string; stamp: string; start: string; summary: string; description: string }): string {
  const end = nextDay(input.start);
  return [
    "BEGIN:VEVENT",
    property("UID", input.uid),
    `DTSTAMP:${input.stamp}`,
    `DTSTART;VALUE=DATE:${compact(input.start)}`,
    `DTEND;VALUE=DATE:${compact(end)}`,
    property("SUMMARY", input.summary),
    property("DESCRIPTION", input.description),
    "END:VEVENT",
  ].join("\r\n");
}

function property(name: string, value: string): string {
  return foldLine(`${name}:${escapeText(value)}`);
}

function uid(id: string, birthHash: string): string {
  return `${id}-${birthHash}@${UID_DOMAIN}`;
}

function compact(iso: string): string {
  return iso.replaceAll("-", "");
}

/** The day after `iso` (YYYY-MM-DD). DTEND for an all-day event is exclusive. */
function nextDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hashBirth(birth: IcsBirth): string {
  const time = birth.time.known ? `${birth.time.time.hour}:${birth.time.time.minute}` : "unknown";
  const material = [birth.date.year, birth.date.month, birth.date.day, time, birth.latitude, birth.longitude, birth.timezone].join(
    "|",
  );
  return hash(material);
}

/** cyrb53, matching the session cache: stable, and short enough for a UID. */
function hash(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
