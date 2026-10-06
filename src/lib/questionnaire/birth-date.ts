import type {
  BirthDate,
  BirthDateInput,
  BirthDateResult,
} from "@/types/questionnaire";

/** Earliest year we accept; older dates have unreliable timezone records. */
export const MIN_BIRTH_YEAR = 1900;

const MONTH_NAMES = [
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
];

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isComplete(input: BirthDateInput): boolean {
  return input.day.length > 0 && input.month.length > 0 && input.year.length === 4;
}

/** `today` is the user's local calendar date, so "not in the future" matches what they see. */
export function validateBirthDate(
  input: BirthDateInput,
  today: BirthDate,
): BirthDateResult {
  if (!isComplete(input)) {
    return { ok: false, error: "We need the day, the month and the full year." };
  }

  const day = Number(input.day);
  const month = Number(input.month);
  const year = Number(input.year);

  if (month < 1 || month > 12) {
    return { ok: false, error: "There are twelve months. Check the month." };
  }

  if (year < MIN_BIRTH_YEAR) {
    return { ok: false, error: `We can only read dates from ${MIN_BIRTH_YEAR} onward.` };
  }

  const maxDay = daysInMonth(year, month);
  if (day < 1 || day > maxDay) {
    const monthName = MONTH_NAMES[month - 1];
    return {
      ok: false,
      error:
        day > maxDay
          ? `${monthName} ${year} only has ${maxDay} days. Check the day.`
          : "Days start at 1. Check the day.",
    };
  }

  const value = { year, month, day };
  if (compareDates(value, today) > 0) {
    return { ok: false, error: "That date hasn't happened yet." };
  }

  return { ok: true, value };
}

function compareDates(a: BirthDate, b: BirthDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

export function localToday(now: Date = new Date()): BirthDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** "14 June 1990 — a Thursday." */
export function describeBirthDate({ year, month, day }: BirthDate): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  return `${day} ${MONTH_NAMES[month - 1]} ${year} — a ${weekday}.`;
}

export function toInput(date: BirthDate | undefined): BirthDateInput {
  if (!date) return { day: "", month: "", year: "" };
  return {
    day: String(date.day).padStart(2, "0"),
    month: String(date.month).padStart(2, "0"),
    year: String(date.year),
  };
}
