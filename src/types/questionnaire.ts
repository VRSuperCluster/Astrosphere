/** A calendar date as the user entered it, with no time or zone attached. */
export interface BirthDate {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
}

/** Local wall-clock time at the place of birth, 24-hour. */
export interface BirthTime {
  /** 0–23 */
  hour: number;
  /** 0–59 */
  minute: number;
}

/** An unknown time later becomes a solar chart (Sun's sign as house 1). */
export type BirthTimeAnswer = { known: true; time: BirthTime } | { known: false };

/** Answers collected so far. Each step fills in its own field. */
export interface QuestionnaireAnswers {
  birthDate?: BirthDate;
  birthTime?: BirthTimeAnswer;
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

/** Raw text from the hour and minute inputs, before validation. */
export interface BirthTimeInput {
  hour: string;
  minute: string;
}

export type BirthTimeResult =
  | { ok: true; value: BirthTime }
  | { ok: false; error: string };
