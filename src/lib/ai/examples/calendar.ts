/**
 * Gold-standard examples for the calendar call.
 *
 * Two kinds:
 *  - dated entries (one per exact transit hit), covering several emotional
 *    registers plus repeated passes of the same transit
 *  - monthly context cards (one on the 1st of each month)
 *
 * `internal` describes the transit or month data the example represents.
 * It is never shown to users and the model must never echo its wording.
 * The model never writes dates; dates come from the transit engine.
 *
 * STARTING SET — revise by hand before launch. Rules for every example:
 * no astrological terms, no hedging ("may", "might"), no mystical language,
 * no generic positivity, at most one question per description.
 */

export const CALENDAR_ENTRY_EXAMPLES = [
  {
    register: "confrontational",
    internal: "Saturn square natal Venus, pass 1 of 1",
    title: "Your patience with half-truths runs out today",
    description:
      "Something you've been tolerating in a relationship or at work is going to feel suddenly intolerable. " +
      "This isn't impulsive — you've been building toward this clarity for weeks. " +
      "Follow the frustration. It's telling you where your standards actually are.",
  },
  {
    register: "warm",
    internal: "Jupiter conjunct natal Moon, pass 1 of 1",
    title: "Let someone take care of you for once",
    description:
      "For a few weeks around now, help arrives more easily than usual — an offer, a favour, someone who notices before you ask. " +
      "Your reflex will be to wave it away. Don't. " +
      "Saying yes to being looked after is a skill, and you're out of practice.",
  },
  {
    register: "practical",
    internal: "Jupiter square natal Mercury, pass 1 of 1",
    title: "Too many tabs open",
    description:
      "You'll want to say yes to every idea that crosses your desk this week, and each one will seem urgent. " +
      "Write them all down, then pick one to act on in the next few days. " +
      "The rest will still be there. Your focus won't be if you split it five ways.",
  },
  {
    register: "reflective",
    internal: "Neptune opposition natal Sun, pass 1 of 3",
    title: "The version of you that's fading",
    description:
      "Something you used to be sure about — a goal, a role, a way of describing yourself — is losing its edges. " +
      "It will feel like confusion. It's closer to shedding. " +
      "You don't need a replacement yet. Notice what you no longer want to defend.",
  },
  {
    register: "repeated pass (middle)",
    internal: "Saturn conjunct natal Sun, pass 2 of 3",
    title: "This again — and it's not a setback",
    description:
      "The pressure from a few months ago is back, asking the same question about what you're actually committed to. " +
      "It feels like going backwards. It's the review. " +
      "Whatever you avoided answering the first time is the thing to answer now.",
  },
  {
    register: "repeated pass (final)",
    internal: "Saturn conjunct natal Sun, pass 3 of 3",
    title: "Last call on this one",
    description:
      "This is the final round of something that's been testing you since last year. " +
      "You know by now which commitments held and which you were only carrying out of habit. " +
      "Make the decision you've been circling. After today, the question goes quiet for a long time.",
  },
  {
    register: "disruptive",
    internal: "Uranus square natal Mars, pass 1 of 2",
    title: "You'll want to quit something today",
    description:
      "A sudden restlessness hits, and it will attach itself to whatever feels most confining — a job, a routine, a plan. " +
      "Some of that urge is right. Some of it is just the itch. " +
      "Act on it by changing one thing you control, not by burning everything down by evening.",
  },
] as const;

export const MONTH_CARD_EXAMPLES = [
  {
    internal:
      "Month in orb: Saturn square Venus (building toward exact); no stations",
    title: "A month for honest accounting",
    description:
      "This month asks what your relationships actually cost you and what they give back. " +
      "Not a crisis — an audit. " +
      "Watch for the moment you catch yourself explaining someone's behaviour away. That's the thread to pull.",
  },
  {
    internal:
      "Month in orb: Jupiter conjunct Moon, Neptune opposition Sun (wide); Neptune stations retrograde",
    title: "Softer than usual, and that's useful",
    description:
      "Your edges are thinner this month. You'll feel more, need more, and get more help than you're used to accepting. " +
      "Use it for repair, not for big decisions. " +
      "Anything you'd sign this month, read twice next month.",
  },
  {
    internal:
      "Month in orb: nothing exact; Saturn and Uranus both stationing direct",
    title: "The month things start moving again",
    description:
      "Several things that have been stuck or slipping backwards start moving forward again, slowly. " +
      "You won't feel a big shift on any single day. " +
      "Pick up what you put down a few months ago and give it one honest week before you decide whether it's still yours.",
  },
] as const;

/**
 * Backdrop themes, written once per house stay. Code adds the span.
 * `internal` is never shown to the person. The text names no year.
 */
export const PLACEMENT_EXAMPLES = [
  {
    internal: "Jupiter in house 12, from 2026-06-30 until 2027-07-26",
    text: "A private sorting-out of who you are stays offstage. Let it.",
  },
  {
    internal: "Saturn in house 8, sharing the house with Neptune, from 2026-02-14 until 2028-04-12",
    text: "What you owe and what you share gets a harder structure. Name the limit and keep it.",
  },
  {
    internal: "Neptune in house 8, the same house as the Saturn stay, from 2026-01-26 until 2038-05-22",
    text: "The terms of what you share stay hard to see. Get the obligation in writing.",
  },
] as const;
