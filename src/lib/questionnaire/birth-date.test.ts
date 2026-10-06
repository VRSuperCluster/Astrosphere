import { describe, expect, it } from "vitest";
import {
  MIN_BIRTH_YEAR,
  describeBirthDate,
  isComplete,
  localToday,
  toInput,
  validateBirthDate,
} from "./birth-date";

const today = { year: 2026, month: 10, day: 6 };

function validate(day: string, month: string, year: string) {
  return validateBirthDate({ day, month, year }, today);
}

describe("isComplete", () => {
  it("needs a day, a month and a four-digit year", () => {
    expect(isComplete({ day: "1", month: "1", year: "1990" })).toBe(true);
    expect(isComplete({ day: "", month: "1", year: "1990" })).toBe(false);
    expect(isComplete({ day: "1", month: "", year: "1990" })).toBe(false);
    expect(isComplete({ day: "1", month: "1", year: "199" })).toBe(false);
  });
});

describe("validateBirthDate", () => {
  it("accepts a real past date", () => {
    expect(validate("14", "06", "1990")).toEqual({
      ok: true,
      value: { year: 1990, month: 6, day: 14 },
    });
  });

  it("rejects incomplete input", () => {
    expect(validate("14", "06", "90").ok).toBe(false);
  });

  it("rejects months outside 1–12", () => {
    expect(validate("1", "0", "1990").ok).toBe(false);
    expect(validate("1", "13", "1990").ok).toBe(false);
  });

  it(`rejects years before ${MIN_BIRTH_YEAR}`, () => {
    expect(validate("31", "12", String(MIN_BIRTH_YEAR - 1)).ok).toBe(false);
    expect(validate("1", "1", String(MIN_BIRTH_YEAR)).ok).toBe(true);
  });

  it("rejects day 0", () => {
    expect(validate("0", "6", "1990")).toEqual({
      ok: false,
      error: "Days start at 1. Check the day.",
    });
  });

  it("rejects days past the end of the month, naming the month", () => {
    expect(validate("31", "04", "1990")).toEqual({
      ok: false,
      error: "April 1990 only has 30 days. Check the day.",
    });
  });

  it("follows leap-year rules, including centuries", () => {
    expect(validate("29", "02", "1990").ok).toBe(false);
    expect(validate("29", "02", "1992").ok).toBe(true);
    expect(validate("29", "02", "2000").ok).toBe(true);
    expect(validate("29", "02", "1900").ok).toBe(false);
  });

  it("accepts today but not tomorrow", () => {
    expect(validate("6", "10", "2026").ok).toBe(true);
    expect(validate("7", "10", "2026")).toEqual({
      ok: false,
      error: "That date hasn't happened yet.",
    });
    expect(validate("1", "11", "2026").ok).toBe(false);
    expect(validate("1", "1", "2027").ok).toBe(false);
  });
});

describe("localToday", () => {
  it("uses the local calendar date", () => {
    expect(localToday(new Date(2026, 9, 6, 23, 59))).toEqual(today);
  });
});

describe("describeBirthDate", () => {
  it("names the weekday", () => {
    expect(describeBirthDate({ year: 1990, month: 6, day: 14 })).toBe(
      "14 June 1990 — a Thursday.",
    );
  });
});

describe("toInput", () => {
  it("pads day and month", () => {
    expect(toInput({ year: 1990, month: 6, day: 4 })).toEqual({
      day: "04",
      month: "06",
      year: "1990",
    });
  });

  it("is empty with no date", () => {
    expect(toInput(undefined)).toEqual({ day: "", month: "", year: "" });
  });
});
