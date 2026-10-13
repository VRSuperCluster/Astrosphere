import type { Chart, PointId } from "./chart";
import type { ChangeStance, LifeArea } from "./questionnaire";

/** A pattern the person will recognise, the rule that answers it, and the chart points behind it. */
export interface PatternCard {
  /** 1–3 points, all present in this chart; the wheel emphasises them. */
  pointIds: PointId[];
  pattern: string;
  rule: string;
}

/** The chart page's written part. */
export interface Summary {
  /** 3–4 sentences. */
  read: string;
  /** Exactly three. */
  patterns: PatternCard[];
}

/** What the person told us besides their birth data. Every field is optional. */
export interface SummaryContext {
  firstName?: string;
  lifeArea?: LifeArea;
  changeStance?: ChangeStance;
}

/** `POST /api/summary` body. */
export interface SummaryRequest extends SummaryContext {
  chart: Chart;
}

/** `POST /api/summary`, status 200. */
export interface SummaryResponse {
  summary: Summary;
}

/** `POST /api/summary`, status 400 or 502. */
export interface SummaryErrorResponse {
  error: string;
}
