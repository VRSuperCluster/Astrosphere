# Backlog

Decisions we've deferred on purpose. Check this at the start of each phase.

## Phase 2

- **Add Vitest** (approved as a dev dependency). First targets: date and time validation in `src/lib/questionnaire/`, then the DST cases the rules require (spring-forward gap, autumn fall-back, a pre-1980 date in a zone whose rules changed).
- **Commit order.** Each step is testable on its own:
  1. Vitest, then birth time to UTC (luxon, zone from the place step, DST flags) with the tests above.
  2. Ephemeris adapter (`ephemeris.ts`, `EphemerisProvider`): tropical geocentric longitudes, Sun to Pluto.
  3. Chart calculation: Ascendant and MC from sidereal time, latitude and obliquity; Whole Sign houses; unknown time casts for local noon with the Sun's sign as house 1. Types in `src/types/chart.ts`.
  4. Accuracy tests against Astro-Seek, within about 0.1°.
  5. Route handler: questionnaire answers in (validated with zod), chart JSON out.
  6. Chart screen: minimal SVG wheel, placeholder summary text, unknown-time note.
- **The chart gets its own `/chart` page.** When the questionnaire finishes, the answers go into the tab's `sessionStorage`; `/chart` reads them from there. A refresh keeps the chart (Phase 3 needs this so a refresh doesn't re-trigger the AI call), closing the tab erases it, and nothing is stored on a server. Opening `/chart` with nothing saved sends the visitor to the start. The questionnaire pre-fills from the same storage when the visitor goes back. Birth data never goes in the URL.
- **Reference charts for the accuracy check:** Donald Trump, Keanu Reeves and Jennifer Lawrence, all public, so no private birth data goes into the repo. The owner sends Astro-Seek's chart for each (astro.com blocks automated access; both run Swiss Ephemeris): date, local time, coordinates, and positions from Sun to Pluto plus Ascendant and MC. The tests use Astro-Seek's coordinates rather than our geocoder's, so they compare the maths on identical inputs. The birth time doesn't need to be the true one; if the site has none, pick one and enter it in both.

## Phase 3

- **Commit order.** Each step is testable on its own:
  1. Transit engine (`src/lib/astro/transits.ts`, `stations.ts`, `monthly.ts`, types in `src/types/transit.ts`): exact hits by bracketing and bisection, runs with `pass`/`totalPasses` over the whole run, outer planet stations, per-month in-orb lists. No route of its own; the calendar route calls it.
  2. Accuracy tests against Astro-Seek transit listings for two of the reference charts (Trump, Lawrence) over a fixed window. No prompt is written against the engine until these pass. Done: `transit-accuracy.test.ts` holds the owner's exports (every planet for 2027–28, plus Lawrence's conjunctions to 2046) and Astro-Seek's 2027 stations. Every hit matches within a day; where they differ, ours is usually the earlier one (Astro-Seek dates in another zone), and next to a station the gap can go either way.
  3. Shared voice block and the summary call, wired into the chart page with the `sessionStorage` cache.
  4. Calendar call route: chart JSON in (validated with zod), engine plus prompt, entries joined by `transitId`, `maxDuration` set.
  5. ICS builder as a pure function, downloaded as a Blob.
  6. Email capture through Buttondown.
  7. Prompt iteration against the examples.
- **Transit dates** are the local date of the exact moment in the birth zone (`chart.moment.zone`), as the spec allows. The visitor may live elsewhere now; at worst a hit near midnight lands a day off.
- **Unknown birth time:** the Ascendant and the Moon are left out of the monthly in-orb lists too, not only the dated hits. A noon Moon is too uncertain for either.

## Later (after the core flow works)

- **Intro screen, navbar, other pages.** Visitors currently land straight on "When were you born?", and on phones the keyboard opens at once because the first field has focus. Design all screens together (doc or flowchart) before building any of them.
- **Double-tap on the context questions.** Picking an option moves on at once, so a fast second tap can land on the next question while it slides in. If the phone walkthrough shows this happening, add a short pause after a tap that ignores further taps.
- **Progress indicator** for the questionnaire. The steps are an ordered list in `Questionnaire.tsx`, so this is a small addition.

## Defaults to revisit in the design pass

- Dates are entered day, month, year.
- Years before 1900 are rejected (`MIN_BIRTH_YEAR`).
- Times use the 24-hour clock.
- First names are capped at 40 characters (`MAX_FIRST_NAME_LENGTH`).
- Place names come back in English (`language=en`) and the list shows up to 8 matches.
- The questionnaire is anchored to the top on every screen size, not vertically centred, so results and messages appearing under a field don't shift the page.
- The terracotta accent is only used for underlines and focus outlines: as text on paper it's about 4.2:1, below the WCAG AA 4.5:1 minimum.
- On the wheel, points the summary doesn't mention go from ink to muted ink. The difference is subtle; the planet look as a whole (tinted, illustrated, artwork) lives in `PlanetMark.tsx` and is decided here. Coloured planets would break the single-accent palette rule.
- Natal aspect orbs (`src/lib/astro/aspects.ts`): conjunction and opposition 8°, square and trine 7°, sextile 5°. Only pairs with a personal point (Sun to Mars, Ascendant, MC). Revisit after the first prompt runs if the summary leans on loose aspects.
- Monthly in-orb orb for transits (`monthlyOrb` in `DEFAULT_TRANSIT_OPTIONS`): 2° for every planet. Revisit after the first calendar runs if the monthly cards feel thin or crowded.
- Run range (`RUN_RANGE_DEGREES` in `src/lib/astro/transits.ts`): 12°. Only affects how far the engine searches beyond the window to count passes; a wider range costs search time, not correctness.
