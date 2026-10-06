import { useSyncExternalStore } from "react";
import type { QuestionnaireAnswers } from "@/types/questionnaire";

/** Bump the version when the answers change shape, so older saved answers are ignored. */
const STORAGE_KEY = "astroscope.answers.v1";

/** Kept in this tab only: a refresh keeps it, closing the tab erases it. */
export function saveAnswers(answers: QuestionnaireAnswers): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
}

export function clearAnswers(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * The saved answers as JSON, `null` when nothing is saved, and `undefined`
 * while hydrating, because the server can't see the tab's storage.
 */
export function useSavedAnswersJson(): string | null | undefined {
  return useSyncExternalStore(subscribe, readSaved, () => undefined);
}

export function parseAnswers(json: string): QuestionnaireAnswers | null {
  try {
    const value: unknown = JSON.parse(json);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as QuestionnaireAnswers)
      : null;
  } catch {
    return null;
  }
}

function readSaved(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Only this tab can write its session storage, and it doesn't while a page reads it.
function subscribe(): () => void {
  return () => {};
}
