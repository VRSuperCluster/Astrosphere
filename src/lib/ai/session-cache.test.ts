import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { cacheKey, readCached, writeCached } from "./session-cache";

const ANSWERS = {
  birthDate: { year: 1990, month: 6, day: 14 },
  birthTime: { known: true, time: { hour: 14, minute: 30 } },
  placeOfBirth: {
    id: 2643743,
    name: "London",
    latitude: 51.50853,
    longitude: -0.12574,
    timezone: "Europe/London",
  },
  firstName: "Ada",
  lifeArea: "career",
} satisfies QuestionnaireAnswers;

const V1 = { output: "summary", promptVersion: "summary-1" };
const schema = z.object({ read: z.string() });

/** A Map behind the Storage interface, since tests run outside a browser. */
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (i) => [...items.keys()][i] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cacheKey", () => {
  it("changes with the prompt version", () => {
    expect(cacheKey(V1, ANSWERS)).not.toBe(cacheKey({ ...V1, promptVersion: "summary-2" }, ANSWERS));
  });

  it("changes with the window start, and leaves a key alone when it has none", () => {
    const dated = cacheKey(V1, ANSWERS, "2026-10-15");
    expect(dated).not.toBe(cacheKey(V1, ANSWERS));
    expect(dated).not.toBe(cacheKey(V1, ANSWERS, "2026-10-16"));
  });

  it("changes with the output", () => {
    expect(cacheKey(V1, ANSWERS)).not.toBe(cacheKey({ ...V1, output: "calendar" }, ANSWERS));
  });

  it.each<[string, QuestionnaireAnswers]>([
    ["birth date", { ...ANSWERS, birthDate: { ...ANSWERS.birthDate, day: 15 } }],
    ["birth time", { ...ANSWERS, birthTime: { known: false } }],
    ["place", { ...ANSWERS, placeOfBirth: { ...ANSWERS.placeOfBirth, latitude: 48.85 } }],
    ["first name", { ...ANSWERS, firstName: "Grace" }],
    ["life area", { ...ANSWERS, lifeArea: "health" }],
    ["change stance", { ...ANSWERS, changeStance: "resistsIt" }],
  ])("changes with the %s", (_, answers) => {
    expect(cacheKey(V1, answers)).not.toBe(cacheKey(V1, ANSWERS));
  });

  it("ignores key order and the place's display name", () => {
    const reordered: QuestionnaireAnswers = {
      lifeArea: "career",
      firstName: "Ada",
      placeOfBirth: { ...ANSWERS.placeOfBirth, name: "London, UK" },
      birthTime: { time: { minute: 30, hour: 14 }, known: true },
      birthDate: { day: 14, month: 6, year: 1990 },
    };
    expect(cacheKey(V1, reordered)).toBe(cacheKey(V1, ANSWERS));
  });
});

describe("readCached and writeCached", () => {
  it("round-trips a value", () => {
    vi.stubGlobal("sessionStorage", memoryStorage());
    writeCached("k", { read: "You lead with charm." });
    expect(readCached("k", schema)).toEqual({ read: "You lead with charm." });
  });

  it("drops an entry that no longer validates", () => {
    const storage = memoryStorage();
    vi.stubGlobal("sessionStorage", storage);
    storage.setItem("k", JSON.stringify({ old: "shape" }));
    expect(readCached("k", schema)).toBeNull();
    expect(storage.getItem("k")).toBeNull();
  });

  it("treats corrupt JSON as a miss", () => {
    const storage = memoryStorage();
    vi.stubGlobal("sessionStorage", storage);
    storage.setItem("k", "{read");
    expect(readCached("k", schema)).toBeNull();
  });

  it("swallows storage that throws", () => {
    const fail = () => {
      throw new DOMException("denied", "SecurityError");
    };
    vi.stubGlobal("sessionStorage", { ...memoryStorage(), getItem: fail, setItem: fail, removeItem: fail });
    expect(() => writeCached("k", { read: "x" })).not.toThrow();
    expect(readCached("k", schema)).toBeNull();
  });
});
