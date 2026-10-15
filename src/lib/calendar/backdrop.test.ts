import { describe, expect, it } from "vitest";
import type { CalendarChange, CalendarPlacement } from "@/types/calendar";
import { backdropLine, changeLine } from "./backdrop";

const STAY: CalendarPlacement = {
  id: "jupiter-12-2026-06-30",
  planet: "jupiter",
  house: 12,
  start: "2026-06-30",
  end: "2027-07-26",
  text: "A private sorting-out stays offstage.",
};

describe("backdrop lines", () => {
  it("names only the end when the stay began before the window", () => {
    expect(backdropLine(STAY, "2026-10-15")).toBe("Until July 2027 — A private sorting-out stays offstage.");
  });

  it("names the start when the stay began during the window", () => {
    const next: CalendarPlacement = {
      ...STAY,
      id: "jupiter-1-2027-07-26",
      house: 1,
      start: "2027-07-26",
      end: "2028-08-24",
      text: "A larger version of you gets room to be seen.",
    };
    expect(backdropLine(next, "2026-10-15")).toBe(
      "Since July 2027 until August 2028 — A larger version of you gets room to be seen.",
    );
  });

  it("dates a house change by day and month", () => {
    const change: CalendarChange = {
      date: "2027-07-26",
      placement: {
        ...STAY,
        id: "jupiter-1-2027-07-26",
        house: 1,
        start: "2027-07-26",
        end: "2028-08-24",
        text: "A larger version of you gets room to be seen.",
      },
    };
    expect(changeLine(change)).toBe("From 26 July — A larger version of you gets room to be seen.");
  });
});
