/**
 * Bump on any prompt change. The browser caches results under a key that
 * includes these, so a bump makes the next refresh call the API again.
 * The calendar key also includes the window start date (see `cacheKey`).
 * Kept apart from the prompt modules so the client can import them without the prompt text.
 */
export const SUMMARY_PROMPT_VERSION = "summary-1";

export const CALENDAR_PROMPT_VERSION = "calendar-4";
