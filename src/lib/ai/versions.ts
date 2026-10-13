/**
 * Bump on any prompt change. The browser caches results under a key that
 * includes these, so a bump makes the next refresh call the API again.
 * Kept apart from the prompt modules so the client can import them without the prompt text.
 */
export const SUMMARY_PROMPT_VERSION = "summary-1";
