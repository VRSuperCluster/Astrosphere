/** A calendar date as the user entered it, with no time or zone attached. */
export interface BirthDate {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
}

/** Answers collected so far. Each step fills in its own field. */
export interface QuestionnaireAnswers {
  birthDate?: BirthDate;
}

/** Raw text from the three date inputs, before validation. */
export interface BirthDateInput {
  day: string;
  month: string;
  year: string;
}

export type BirthDateResult =
  | { ok: true; value: BirthDate }
  | { ok: false; error: string };
