import { describe, expect, it } from "vitest";
import type { CalendarEntry, CalendarMonth, CalendarPlacement } from "@/types/calendar";
import {
  TITLE_MARKERS,
  eventTitle,
  ingressDescription,
  ingressHeader,
  monthDescription,
  placementHeader,
  transitDescription,
  transitFooter,
} from "./labels";

const SATURN: CalendarPlacement = {
  id: "saturn-8-2026-02-14",
  planet: "saturn",
  house: 8,
  start: "2026-02-14",
  end: "2028-04-13",
  text: "Name the limit and keep it.",
};

const JUPITER: CalendarPlacement = {
  id: "jupiter-1-2027-07-26",
  planet: "jupiter",
  house: 1,
  start: "2027-07-26",
  end: "2028-08-24",
  text: "Say yes to being seen.",
};

function entry(partial: Partial<CalendarEntry>): CalendarEntry {
  return {
    transitId: "saturn-square-sun-2027-03-28",
    date: "2027-03-28",
    title: "A day that lands",
    description: "You will feel the pressure.",
    transiting: "saturn",
    natal: "sun",
    aspect: "square",
    pass: 2,
    totalPasses: 3,
    ...partial,
  };
}

describe("calendar labels", () => {
  it("names a stay by its real start and end", () => {
    expect(placementHeader(SATURN)).toBe("FEB 2026 – APR 2028 · Saturn in your 8th house");
    expect(placementHeader({ ...JUPITER, house: 2 })).toContain("2nd house");
    expect(placementHeader({ ...JUPITER, house: 3 })).toContain("3rd house");
    expect(placementHeader({ ...JUPITER, house: 11 })).toContain("11th house");
  });

  it("dates a house change by day, month and year", () => {
    expect(ingressHeader({ date: "2027-07-26", placement: JUPITER })).toBe(
      "26 JUL 2027 · Jupiter enters your 1st house",
    );
    expect(ingressHeader({ date: "2027-07-06", placement: JUPITER })).toContain("6 JUL 2027");
  });

  it("builds the long view under the month line, and leaves a chart without houses as the month line", () => {
    const month: CalendarMonth = {
      month: "2027-07",
      title: "The shift",
      description: "The month itself.",
      placements: [SATURN],
      changes: [{ date: "2027-07-26", placement: JUPITER }],
    };
    expect(monthDescription(month)).toBe(
      [
        "The month itself.",
        "",
        "THE LONG VIEW",
        "FEB 2026 – APR 2028 · Saturn in your 8th house",
        "Name the limit and keep it.",
        "",
        "26 JUL 2027 · Jupiter enters your 1st house",
        "Say yes to being seen.",
      ].join("\n"),
    );
    expect(monthDescription({ ...month, placements: [], changes: [] })).toBe("The month itself.");
  });

  it("footers an aspect, and drops the pass when the run happens once", () => {
    expect(transitFooter(entry({}))).toBe("Saturn square your Sun · 2 of 3");
    expect(transitFooter(entry({ transiting: "neptune", aspect: "opposition", natal: "asc", totalPasses: 1 }))).toBe(
      "Neptune opposition your Ascendant",
    );
    expect(transitFooter(entry({ natal: "moon", totalPasses: 1 }))).toBe("Saturn square your Moon");
    expect(transitDescription(entry({}))).toBe("You will feel the pressure.\n\n—\nSaturn square your Sun · 2 of 3");
  });

  it("footers a house change with the same phrase the title uses", () => {
    expect(ingressDescription(JUPITER)).toBe("Say yes to being seen.\n\n—\nJupiter enters your 1st house");
  });

  it("prefixes titles from one marker map", () => {
    expect(eventTitle("monthly", "The shift")).toBe(`${TITLE_MARKERS.monthly} The shift`);
    expect(eventTitle("dated", "A day that lands")).toBe(`${TITLE_MARKERS.dated} A day that lands`);
    expect(eventTitle("houseChange", "Jupiter enters your 1st house")).toBe(
      `${TITLE_MARKERS.houseChange} Jupiter enters your 1st house`,
    );
    expect(TITLE_MARKERS).toEqual({ monthly: "◐", dated: "✦", houseChange: "→" });
  });
});