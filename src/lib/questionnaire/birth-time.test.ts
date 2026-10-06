import { describe, expect, it } from "vitest";
import { describeBirthTime, isComplete, toInput, validateBirthTime } from "./birth-time";

describe("isComplete", () => {
  it("needs an hour and two-digit minutes", () => {
    expect(isComplete({ hour: "9", minute: "05" })).toBe(true);
    expect(isComplete({ hour: "", minute: "05" })).toBe(false);
    expect(isComplete({ hour: "9", minute: "5" })).toBe(false);
  });
});

describe("validateBirthTime", () => {
  it("accepts the ends of the day", () => {
    expect(validateBirthTime({ hour: "00", minute: "00" })).toEqual({
      ok: true,
      value: { hour: 0, minute: 0 },
    });
    expect(validateBirthTime({ hour: "23", minute: "59" })).toEqual({
      ok: true,
      value: { hour: 23, minute: 59 },
    });
  });

  it("rejects missing parts", () => {
    expect(validateBirthTime({ hour: "", minute: "30" }).ok).toBe(false);
    expect(validateBirthTime({ hour: "14", minute: "" }).ok).toBe(false);
  });

  it("rejects hours past 23", () => {
    expect(validateBirthTime({ hour: "24", minute: "00" })).toEqual({
      ok: false,
      error: "The clock stops at 23. Use the 24-hour clock.",
    });
  });

  it("rejects minutes past 59", () => {
    expect(validateBirthTime({ hour: "12", minute: "60" })).toEqual({
      ok: false,
      error: "An hour only has 60 minutes. Check the minutes.",
    });
  });
});

describe("describeBirthTime", () => {
  it.each([
    [0, 0, "00:00, in the middle of the night."],
    [4, 59, "04:59, in the middle of the night."],
    [5, 0, "05:00, early in the morning."],
    [9, 0, "09:00, in the morning."],
    [12, 30, "12:30, around midday."],
    [13, 0, "13:00, in the afternoon."],
    [18, 0, "18:00, in the evening."],
    [22, 0, "22:00, late at night."],
  ])("%i:%i reads as %s", (hour, minute, expected) => {
    expect(describeBirthTime({ hour, minute })).toBe(expected);
  });
});

describe("toInput", () => {
  it("pads hour and minute", () => {
    expect(toInput({ hour: 7, minute: 5 })).toEqual({ hour: "07", minute: "05" });
  });

  it("is empty with no time", () => {
    expect(toInput(undefined)).toEqual({ hour: "", minute: "" });
  });
});
