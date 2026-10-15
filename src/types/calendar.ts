import type { Chart } from "./chart";
import type { SummaryContext } from "./summary";

/** One dated transit, with the engine's date and the model's words. */
export interface CalendarEntry {
  transitId: string;
  /** YYYY-MM-DD from the transit engine. The model never supplies this. */
  date: string;
  title: string;
  description: string;
}

/** One monthly card. The file dates the first of these from `Calendar.generatedOn`. */
export interface CalendarMonth {
  /** YYYY-MM */
  month: string;
  title: string;
  description: string;
}

/**
 * What the chart page stores and, later, builds the file from.
 * Dates belong to the engine. The model contributes the words.
 */
export interface Calendar {
  /**
   * YYYY-MM-DD in the birth zone: the day this was written.
   * The first monthly card uses this date, not the day the file is downloaded.
   */
  generatedOn: string;
  entries: CalendarEntry[];
  /** Twelve, from the window's first month. */
  months: CalendarMonth[];
}

/** `POST /api/calendar` body. The window starts on the server's clock, not a date the client picks. */
export interface CalendarRequest extends SummaryContext {
  chart: Chart;
}

/** `POST /api/calendar`, status 200. */
export interface CalendarResponse {
  calendar: Calendar;
}

/** `POST /api/calendar`, status 400 or 502. */
export interface CalendarErrorResponse {
  error: string;
}
