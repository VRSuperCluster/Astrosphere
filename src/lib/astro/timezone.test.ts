import { afterEach, describe, expect, it, vi } from "vitest";
import { birthTimeToUtc } from "./timezone";

afterEach(() => {
  vi.useRealTimers();
});

describe("birthTimeToUtc", () => {
  it("converts an ordinary summer time", () => {
    expect(
      birthTimeToUtc({ year: 1990, month: 6, day: 14 }, { hour: 14, minute: 30 }, "Europe/London"),
    ).toEqual({
      utc: "1990-06-14T13:30:00.000Z",
      zone: "Europe/London",
      utcOffsetMinutes: 60,
      dstAdjustment: "none",
    });
  });

  it("converts an ordinary winter time, crossing midnight", () => {
    expect(
      birthTimeToUtc({ year: 1999, month: 12, day: 31 }, { hour: 22, minute: 0 }, "America/New_York"),
    ).toMatchObject({
      utc: "2000-01-01T03:00:00.000Z",
      utcOffsetMinutes: -300,
      dstAdjustment: "none",
    });
  });

  it("handles zones east of UTC with a half-hour offset", () => {
    expect(
      birthTimeToUtc({ year: 1995, month: 3, day: 1 }, { hour: 5, minute: 0 }, "Asia/Kolkata"),
    ).toMatchObject({
      utc: "1995-02-28T23:30:00.000Z",
      utcOffsetMinutes: 330,
      dstAdjustment: "none",
    });
  });

  describe("spring-forward gap", () => {
    it("moves a skipped time forward by the gap and flags it", () => {
      // New York skipped 02:00–02:59 on 14 March 2021.
      expect(
        birthTimeToUtc({ year: 2021, month: 3, day: 14 }, { hour: 2, minute: 30 }, "America/New_York"),
      ).toMatchObject({
        utc: "2021-03-14T07:30:00.000Z",
        utcOffsetMinutes: -240,
        dstAdjustment: "shiftedForward",
      });
    });

    it("leaves the minute after the gap alone", () => {
      expect(
        birthTimeToUtc({ year: 2021, month: 3, day: 14 }, { hour: 3, minute: 0 }, "America/New_York"),
      ).toMatchObject({
        utc: "2021-03-14T07:00:00.000Z",
        dstAdjustment: "none",
      });
    });

    it("flags a whole skipped day", () => {
      // Samoa crossed the date line and skipped 30 December 2011.
      expect(
        birthTimeToUtc({ year: 2011, month: 12, day: 30 }, { hour: 12, minute: 0 }, "Pacific/Apia"),
      ).toMatchObject({ dstAdjustment: "shiftedForward" });
    });
  });

  describe("autumn fall-back", () => {
    // New York passed 01:00–01:59 twice on 7 November 2021: first at -4, then at -5.
    const date = { year: 2021, month: 11, day: 7 };
    const time = { hour: 1, minute: 30 };

    it("uses the earlier occurrence and flags it", () => {
      expect(birthTimeToUtc(date, time, "America/New_York")).toMatchObject({
        utc: "2021-11-07T05:30:00.000Z",
        utcOffsetMinutes: -240,
        dstAdjustment: "earlierOccurrence",
      });
    });

    it.each([
      ["in winter", new Date("2026-01-15T12:00:00Z")],
      ["in summer", new Date("2026-07-15T12:00:00Z")],
    ])("gives the same answer when run %s", (_, now) => {
      vi.useFakeTimers({ now });
      expect(birthTimeToUtc(date, time, "America/New_York").utc).toBe(
        "2021-11-07T05:30:00.000Z",
      );
    });

    it("works the same east of UTC", () => {
      // Berlin passed 02:00–02:59 twice on 31 October 2021.
      expect(
        birthTimeToUtc({ year: 2021, month: 10, day: 31 }, { hour: 2, minute: 30 }, "Europe/Berlin"),
      ).toMatchObject({
        utc: "2021-10-31T00:30:00.000Z",
        utcOffsetMinutes: 120,
        dstAdjustment: "earlierOccurrence",
      });
    });
  });

  describe("historical rules", () => {
    it("uses the rules in force at the time, not today's", () => {
      // Britain stayed on UTC+1 all year from 1968 to 1971; today's rules would give UTC+0 in January.
      expect(
        birthTimeToUtc({ year: 1970, month: 1, day: 15 }, { hour: 12, minute: 0 }, "Europe/London"),
      ).toMatchObject({
        utc: "1970-01-15T11:00:00.000Z",
        utcOffsetMinutes: 60,
        dstAdjustment: "none",
      });
    });

    it("uses wartime offsets", () => {
      // India ran on UTC+6:30 from 1942 to 1945.
      expect(
        birthTimeToUtc({ year: 1943, month: 6, day: 1 }, { hour: 12, minute: 0 }, "Asia/Kolkata"),
      ).toMatchObject({
        utc: "1943-06-01T05:30:00.000Z",
        utcOffsetMinutes: 390,
      });
    });
  });

  describe("bad input", () => {
    const date = { year: 1990, month: 6, day: 14 };
    const time = { hour: 12, minute: 0 };

    it("throws on an unknown zone", () => {
      expect(() => birthTimeToUtc(date, time, "Mars/Olympus")).toThrow(/Mars\/Olympus/);
    });

    it.each(["local", "system", "default", "UTC+3", ""])(
      'refuses "%s" instead of falling back to the machine\'s zone or a fixed offset',
      (zone) => {
        expect(() => birthTimeToUtc(date, time, zone)).toThrow(/not an IANA zone/);
      },
    );

    it("keeps the birth date and time out of the error", () => {
      expect(() =>
        birthTimeToUtc({ year: 1990, month: 2, day: 30 }, { hour: 14, minute: 45 }, "Europe/London"),
      ).toThrow(
        expect.objectContaining({
          message: expect.not.stringMatching(/1990|30|14|45/),
        }),
      );
    });
  });
});
