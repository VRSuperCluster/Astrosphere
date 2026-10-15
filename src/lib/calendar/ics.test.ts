import { describe, expect, it } from "vitest";
import type { Calendar, CalendarMonth, CalendarPlacement } from "@/types/calendar";
import type { IcsBirth } from "./ics";
import { buildIcs, escapeText, foldLine, icsFilename } from "./ics";

const BIRTH: IcsBirth = {
  date: { year: 1964, month: 9, day: 2 },
  time: { known: true, time: { hour: 5, minute: 41 } },
  latitude: 33.9,
  longitude: 35.5,
  timezone: "Asia/Beirut",
};

const PLACEMENT: CalendarPlacement = {
  id: "jupiter-12-2026-06-30",
  planet: "jupiter",
  house: 12,
  start: "2026-06-30",
  end: "2027-07-26",
  text: "A private sorting-out stays offstage.",
};

function month(partial: Partial<CalendarMonth> & Pick<CalendarMonth, "month">): CalendarMonth {
  return {
    title: `Title ${partial.month}`,
    description: "The month itself.",
    placements: [],
    changes: [],
    ...partial,
  };
}

function calendar(): Calendar {
  return {
    generatedOn: "2026-10-15",
    entries: [
      {
        transitId: "saturn-square-sun-2027-03-28",
        date: "2027-03-28",
        title: "A day, with a comma",
        description: "Line one.\nLine; two \\ and more.",
        transiting: "saturn",
        natal: "sun",
        aspect: "square",
        pass: 2,
        totalPasses: 3,
      },
    ],
    months: [
      month({
        month: "2026-10",
        description: "Nothing dramatic is happening.",
        placements: [PLACEMENT],
        changes: [],
      }),
      month({
        month: "2027-07",
        title: "The shift",
        description: "The month line, with a “quote” — and an em dash.",
        placements: [PLACEMENT],
        changes: [
          {
            date: "2027-07-26",
            placement: {
              ...PLACEMENT,
              id: "jupiter-1-2027-07-26",
              house: 1,
              start: "2027-07-26",
              end: "2028-08-24",
              text: "A larger version of you gets room to be seen.",
            },
          },
        ],
      }),
      month({ month: "2027-12", description: "The last month." }),
    ],
  };
}

function physicalLines(ics: string): string[] {
  return ics.split("\r\n").filter((line) => line.length > 0);
}

function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, "").replaceAll("\r\n", "\n");
}

describe("ICS folding", () => {
  it("folds on octet boundaries and leaves an em dash whole", () => {
    const dash = "—";
    const quote = "“";
    expect(new TextEncoder().encode(dash).length).toBe(3);
    // 62 ASCII bytes after "DESCRIPTION:" (12 bytes) puts the em dash on octet 74.
    const text = `${"a".repeat(62)}${dash}${quote}rest of the card`;
    const folded = foldLine(`DESCRIPTION:${text}`);
    const decoder = new TextDecoder("utf-8", { fatal: true });

    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
      expect(() => decoder.decode(new TextEncoder().encode(line))).not.toThrow();
    }
    expect(folded).toContain("\r\n ");
    expect(unfold(folded)).toBe(`DESCRIPTION:${text}`);
    expect(unfold(folded)).toContain(dash);
  });
});

describe("ICS escaping", () => {
  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(escapeText("a, b; c\\d\nnext\r\nline")).toBe("a\\, b\\; c\\\\d\\nnext\\nline");
  });
});

describe("buildIcs", () => {
  const source = calendar();
  const file = buildIcs(source, BIRTH);

  it("uses CRLF, and one all-day event per entry and per month", () => {
    expect(file.replaceAll("\r\n", "")).not.toContain("\n");
    const decoder = new TextDecoder("utf-8", { fatal: true });
    for (const line of physicalLines(file)) {
      const bytes = new TextEncoder().encode(line);
      expect(bytes.length).toBeLessThanOrEqual(75);
      expect(() => decoder.decode(bytes)).not.toThrow();
    }
    const changes = source.months.reduce((count, month) => count + month.changes.length, 0);
    expect(file.match(/BEGIN:VEVENT/g)).toHaveLength(source.entries.length + changes + source.months.length);
    const unfolded = unfold(file);
    expect(unfolded).toContain("DTSTART;VALUE=DATE:20270328");
    expect(unfolded).toContain("DTEND;VALUE=DATE:20270329");
    expect(unfolded).toContain("DTSTART;VALUE=DATE:20261015");
    expect(unfolded).toContain("DTEND;VALUE=DATE:20261016");
    expect(unfolded).toContain("DTSTART;VALUE=DATE:20270701");
    expect(unfolded).toContain("DTSTART;VALUE=DATE:20271201");
  });

  it("puts the month line, a blank line, the backdrop, then the ingress", () => {
    const unfolded = unfold(file);
    const month = unfolded.split("BEGIN:VEVENT").find((block) => block.includes("SUMMARY:◐ The shift"));
    expect(month).toContain(
      "DESCRIPTION:The month line\\, with a “quote” — and an em dash.\\n\\nTHE LONG VIEW\\nJUN 2026 – JUL 2027 · Jupiter in your 12th house\\nA private sorting-out stays offstage.\\n\\n26 JUL 2027 · Jupiter enters your 1st house\\nA larger version of you gets room to be seen.",
    );
    expect(unfolded).toContain("SUMMARY:✦ A day\\, with a comma");
    expect(unfolded).toContain("\\n\\n—\\nSaturn square your Sun · 2 of 3");
    expect(unfolded).toContain("SUMMARY:→ Jupiter enters your 1st house");
    expect(unfolded).toContain("DTSTART;VALUE=DATE:20270726");
    const last = unfolded.split("BEGIN:VEVENT").find((block) => block.includes("SUMMARY:◐ Title 2027-12"));
    expect(last).toContain("DESCRIPTION:The last month.");
    expect(last).not.toContain("THE LONG VIEW");
  });

  it("keeps the same UIDs across two runs, and changes them when the birth data changes", () => {
    const again = buildIcs(source, BIRTH);
    const uids = (ics: string) => [...unfold(ics).matchAll(/^UID:(.+)$/gm)].map((match) => match[1]);
    expect(uids(file)).toEqual(uids(again));
    const listed = uids(file).join("\n");
    expect(listed).toMatch(/^2026-10-[0-9a-z]+@astroscope\.app$/m);
    expect(listed).toMatch(/^2027-07-[0-9a-z]+@astroscope\.app$/m);
    expect(listed).toMatch(/^saturn-square-sun-2027-03-28-[0-9a-z]+@astroscope\.app$/m);

    const moved = buildIcs(source, { ...BIRTH, latitude: BIRTH.latitude + 1 });
    expect(uids(moved)).not.toEqual(uids(file));
    expect(uids(buildIcs({ ...source, entries: [{ ...source.entries[0], title: "Different words" }] }, BIRTH))).toEqual(
      uids(file),
    );
  });

  it("names the file from the first name and the window's last year", () => {
    expect(icsFilename(source, "Test")).toBe("test-2027.ics");
    expect(icsFilename(source, "Ada Lovelace")).toBe("ada-lovelace-2027.ics");
    expect(icsFilename(source, "José")).toBe("jose-2027.ics");
    expect(icsFilename(source)).toBe("calendar-2027.ics");
  });
});
