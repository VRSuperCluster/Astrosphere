/**
 * Gold-standard examples for the chart summary call.
 *
 * These anchor the voice and quality ceiling of the free chart page:
 * a short "read" plus three pattern → rule cards.
 *
 * `internal` describes the chart configuration each example represents.
 * It is for prompt context and for humans editing this file. It is never
 * shown to users and the model must never echo its wording.
 *
 * STARTING SET — revise by hand before launch. Keep every example free of
 * astrological terms, hedging ("may", "might", "perhaps"), mystical language
 * and generic positivity.
 */

export const SUMMARY_READ_EXAMPLES = [
  {
    internal: "Sun Scorpio, Moon Gemini, Ascendant Libra",
    read:
      "You lead with charm and diplomacy — people experience you as easy, balanced, agreeable. " +
      "Underneath that, you're running two competing programs: one that needs to control and transform everything it touches, " +
      "and one that can't stop asking questions and gets bored the moment it has an answer. " +
      "The tension between depth and lightness is your operating system.",
  },
  {
    internal: "Sun Capricorn, Moon Cancer (opposition), Ascendant Aries",
    read:
      "People meet you at full speed: direct, quick to act, a little impatient with anyone who needs to talk it through first. " +
      "What they don't see is how much of that speed is in service of a long plan you rarely say out loud. " +
      "And under both is a need to be looked after that you'd rather starve than admit to. " +
      "You build safety for everyone else and forget to live inside it.",
  },
] as const;

export const PATTERN_CARD_EXAMPLES = [
  {
    internal: "Mercury conjunct Saturn, Virgo emphasis — perfectionism in decisions",
    pattern:
      "You treat a decision as unfinished until you've found the option nobody could criticise. That option rarely exists, so you stall.",
    rule:
      "Give yourself a deadline you say out loud to someone. When it hits, pick the option you'd defend to a friend, not to a judge.",
  },
  {
    internal: "Moon in 12th house, Neptune aspects — absorbs other people's moods",
    pattern:
      "You walk into a room and take on whatever's in it. By evening you're carrying three people's bad days and none of them are yours.",
    rule:
      "Before you react to a feeling, ask whose it was an hour ago. If the answer isn't you, put it down before you go home.",
  },
  {
    internal: "Mars in Libra, Venus square Mars — conflict avoidance",
    pattern:
      "You'd rather lose quietly than win loudly. The resentment doesn't disappear; it comes out later, sideways, about something smaller.",
    rule:
      "When something bothers you twice, say it within a day, in one sentence, without apologising first. Small and early beats big and late.",
  },
  {
    internal: "Sun in 10th, Saturn on MC — worth tied to output",
    pattern:
      "You only feel like you've earned rest once there's nothing left to do. There is always something left to do.",
    rule:
      "Put rest in the calendar before work, not after it. Treat it like a meeting you can't move, because you won't move it otherwise.",
  },
  {
    internal: "Jupiter in 3rd, Gemini Moon — starts many things, finishes few",
    pattern:
      "Starting is your favourite part. The moment something turns into maintenance, your attention is already on the next idea.",
    rule:
      "Before you start anything new, finish or formally drop one thing you've already started. Write down which one, and why.",
  },
  {
    internal: "Leo Sun hidden behind Virgo rising — creative work held back until it's 'ready'",
    pattern:
      "You have work you're proud of that nobody has seen, because it isn't good enough yet. It was good enough months ago.",
    rule:
      "Show one unfinished thing to one person this week. Not for feedback — just so it exists outside your head.",
  },
] as const;
