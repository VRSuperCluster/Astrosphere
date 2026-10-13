import type { z } from "zod";
import type { QuestionnaireAnswers } from "@/types/questionnaire";

/**
 * Keeps AI results in this tab so a refresh doesn't call the API again.
 * Browser only; every storage call is guarded because private modes and full quotas throw.
 */

/** Which output this is, and the prompt version that wrote it. A new version is a new key. */
export interface CacheVersion {
  output: string;
  promptVersion: string;
}

/** Same version and the same answers give the same key, whatever order the keys were saved in. */
export function cacheKey({ output, promptVersion }: CacheVersion, answers: QuestionnaireAnswers): string {
  const material = canonicalJson([
    promptVersion,
    answers.birthDate ?? null,
    answers.birthTime ?? null,
    answers.placeOfBirth
      ? {
          latitude: answers.placeOfBirth.latitude,
          longitude: answers.placeOfBirth.longitude,
          timezone: answers.placeOfBirth.timezone,
        }
      : null,
    answers.firstName ?? null,
    answers.lifeArea ?? null,
    answers.changeStance ?? null,
  ]);
  return `astroscope.${output}.${hash(material)}`;
}

/** The cached value, or `null` when there is none or it no longer validates. */
export function readCached<T>(key: string, schema: z.ZodType<T>): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return null;
    const result = schema.safeParse(JSON.parse(raw));
    if (result.success) return result.data;
    sessionStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

export function writeCached(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not cached: the next refresh calls the API again.
  }
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_, v: unknown) =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

/** cyrb53: a fast 53-bit string hash. Not cryptographic; it only has to tell answers apart. */
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
