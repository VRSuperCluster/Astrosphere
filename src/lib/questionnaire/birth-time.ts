import type { BirthTime, BirthTimeInput, BirthTimeResult } from "@/types/questionnaire";

export function isComplete(input: BirthTimeInput): boolean {
  return input.hour.length > 0 && input.minute.length === 2;
}

export function validateBirthTime(input: BirthTimeInput): BirthTimeResult {
  if (input.hour.length === 0 || input.minute.length === 0) {
    return {
      ok: false,
      error: "We need the hour and the minutes. If you only know the hour, put 00.",
    };
  }

  const hour = Number(input.hour);
  const minute = Number(input.minute);

  if (hour > 23) {
    return { ok: false, error: "The clock stops at 23. Use the 24-hour clock." };
  }
  if (minute > 59) {
    return { ok: false, error: "An hour only has 60 minutes. Check the minutes." };
  }

  return { ok: true, value: { hour, minute } };
}

function partOfDay(hour: number): string {
  if (hour < 5) return "in the middle of the night";
  if (hour < 9) return "early in the morning";
  if (hour < 12) return "in the morning";
  if (hour < 13) return "around midday";
  if (hour < 18) return "in the afternoon";
  if (hour < 22) return "in the evening";
  return "late at night";
}

/** "14:30, in the afternoon." Naming the part of the day catches 12-hour slips. */
export function describeBirthTime({ hour, minute }: BirthTime): string {
  const clock = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return `${clock}, ${partOfDay(hour)}.`;
}

export function toInput(time: BirthTime | undefined): BirthTimeInput {
  if (!time) return { hour: "", minute: "" };
  return {
    hour: String(time.hour).padStart(2, "0"),
    minute: String(time.minute).padStart(2, "0"),
  };
}
