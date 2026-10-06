import type { FirstNameResult } from "@/types/questionnaire";

/** Longest name we accept. The name is sent to the AI prompt. */
export const MAX_FIRST_NAME_LENGTH = 40;

function normalizeFirstName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateFirstName(raw: string): FirstNameResult {
  const value = normalizeFirstName(raw);

  if (value.length === 0) {
    return { ok: false, error: "We need something to call you. Your first name is enough." };
  }
  if (value.length > MAX_FIRST_NAME_LENGTH) {
    return { ok: false, error: "That's longer than a first name. Give us the one you answer to." };
  }

  return { ok: true, value };
}
