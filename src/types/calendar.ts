import type { Chart, PlanetId } from "./chart";
import type { SummaryContext } from "./summary";
import type { HousePlacement, TransitAspectId, TransitTarget } from "./transit";

/**
 * One dated transit. The title and description are the model's.
 * The rest is copied from the engine so the file can label the event.
 */
export interface CalendarEntry {
  transitId: string;
  /** YYYY-MM-DD from the transit engine. The model never supplies this. */
  date: string;
  title: string;
  description: string;
  transiting: PlanetId;
  natal: TransitTarget;
  aspect: TransitAspectId;
  pass: number;
  /** Hits in the whole run. A footer names the pass only when this is more than 1. */
  totalPasses: number;
}

/** A house stay with the one or two sentences written for it. */
export interface CalendarPlacement extends HousePlacement {
  text: string;
}

/** A house change later in the month than the card's date. */
export interface CalendarChange {
  /** YYYY-MM-DD, local: the day the new stay begins. */
  date: string;
  placement: CalendarPlacement;
}

/** One monthly card. The file dates the first of these from `Calendar.generatedOn`. */
export interface CalendarMonth {
  /** YYYY-MM */
  month: string;
  title: string;
  description: string;
  /**
   * Backdrop stays active on the card's date, Jupiter through Pluto.
   * `text` is the theme only. The span is rendered in front of it.
   * Empty when the birth time is unknown.
   */
  placements: CalendarPlacement[];
  /** House changes after the card's date. Shown after the backdrop. */
  changes: CalendarChange[];
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
  /** One per month, from the window's first month through December of the next year. */
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
