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
  3. Shared voice block and the summary call, wired into the chart page with the `sessionStorage` cache. Done:
     - `callClaude` (`src/lib/ai/call.ts`) validates with zod and makes one repair turn that sends the validation error back; the calendar call reuses it.
     - `summarySchemaFor(chart)` only accepts points the chart has.
     - The cache key includes the prompt version (`src/lib/ai/versions.ts`), so bump it on every prompt edit.
     - Live runs: `npm run try:summary -- fixtures/*.json`.

  The remaining steps (calendar call, ICS, email capture, prompt iteration) moved to "Next, in order" below, with the checks that come before them.
- **Transit dates** are the local date of the exact moment in the birth zone (`chart.moment.zone`), as the spec allows. The visitor may live elsewhere now; at worst a hit near midnight lands a day off.
- **Unknown birth time:** the Ascendant and the Moon are left out of the monthly in-orb lists too, not only the dated hits. A noon Moon is too uncertain for either.
- **Moon sign certainty.** A chart without a birth time now carries `moonSignCertain`: the Moon was in the same sign at 00:00 and 23:59 local time. Only the summary uses it, and then for the Moon's sign alone, never its degree or house. Transits and natal aspects still leave the Moon out.
- **No `temperature`.** `claude-sonnet-5-5` rejects it, so `callClaude` doesn't send one.
- **Thinking.** The model thinks by default, about 1.5k tokens per summary, and that counts towards `max_tokens`. A 1.5k cap cut every answer off; `SUMMARY_MAX_TOKENS` is 4k. A summary is about 2k output tokens, not the spec's 0.8k, and takes about 20 seconds. Allow for thinking when setting the calendar call's cap.

## Next, in order

Do A, then the two checks in B before designing the calendar call: they decide its shape.

### A. Close out step 3

1. **Review the pieces that were in the working tree before step 3**, then commit step 3. They haven't been reviewed yet:
   - `package.json` and `package-lock.json`: `tsx` (dev) and `server-only`. zod was already committed.
   - `src/lib/astro/chart-schema.ts` and `chart-schema.test.ts`. The test has two lint warnings (unused `_`); fix them here.
   - The Moon cases in `src/lib/astro/chart.test.ts`.
   - The `moonSignCertain` field in `src/components/chart/wheel-geometry.test.ts`.
2. **Correct `docs/spec.md` where step 3 proved it wrong:**
   - **Section 9, voice consistency:** `temperature` can't be sent for this model (the API rejects it). Voice consistency relies on the prompt and the examples instead.
   - **Section 6, cost:** the summary is about 2k output tokens because of default thinking, not 0.8k. Recompute the per-user estimate. It needs input tokens too: `callClaude` records only output tokens, so add input tokens to `usage` and to the script's output first (a one-line change in each). Look up current Sonnet 5.5 pricing when doing this.
   - **Section 6, route timing:** the summary takes about 20 seconds; the summary route allows 60. The section only mentions the calendar route today.
   - **Section 4, line 123:** "The Moon can still inform the chart summary in general terms." It now does so only when `moonSignCertain` is true, and then by sign alone.
   - **Section 4, loading order:** the summary call is described as "small and fast". It's smaller than the calendar call, but takes about 20 seconds.
   - **Section 6, chart JSON:** mention `moonSignCertain` on charts without a birth time.
- **Done** (A1, A2, `project.mdc` file structure):
  - Step 3 was committed after the review; the two lint warnings were fixed.
  - The spec corrections are in.
  - `callClaude` now reports input, output and thinking tokens, and `try:summary` prints them. A summary measured 2.8–3.7k input and 1.6–1.8k output tokens, about 1–1.2k of it thinking.
  - The per-user cost waits for pricing (owner looks it up) and a measured calendar call.

### B. Two checks before designing step 4

3. **Thinking experiment on the summary call.** The SDK accepts `thinking: { type: "disabled" | "adaptive" }` and `output_config.effort` (`low` to `max`); whether `ANTHROPIC_MODEL` accepts each is what this finds out.
   - Run the three fixtures with thinking off, with low effort, and with the current default.
   - Record for each: latency, input and output tokens, and a quality note.
   - Recommend which to keep. Don't change the default without approval.
4. **Function duration limit, then the calendar design.**
   - The Vercel plan isn't decided and the project isn't linked yet. **Decision:** first check whether Hobby allows commercial use. If it doesn't, design for Pro's limits; if it does, design for the stricter of the two. Record Hobby and Pro limits with and without Fluid compute.
   - **Report the result to the owner before designing the calendar split.**
   - An estimate to check against: the summary ran at about 100 output tokens per second. A calendar answer of 4–7k tokens plus thinking would take 60–120 seconds, and a repair turn doubles that.
   - If one calendar call plus one repair turn fits, keep one call. If not, split it in two: dated entries, and monthly cards. Keep the repair turn either way.
   - A split reopens a resolved Decision: `project.mdc` and spec section 6 (including its schemas and the "two calls per user" cost line) describe one calendar call. Update both if it splits. Each call then validates its own part: the entries call checks for missing, unknown or duplicate `transitId`s, and the cards call checks for missing months.
- **Done** (checks 3 and 4). Thinking stays on for both calls. The summary route allows 120s; the calendar route will allow 300s.
  - **Thinking.** `claude-sonnet-5-5` rejects `thinking: { type: "disabled" }`. The API says to send `{ type: "between_tools" }` instead. That turns pre-response thinking off (0 thinking tokens). `output_config.effort: "low"` also thinks 0 tokens.
  - Three fixtures, one pass each:

    | Setting | Time | Output tokens | Thinking | First try |
    | --- | --- | --- | --- | --- |
    | Default | 17–25s | 1.7–2.5k | 1.1–1.9k | 3/3 |
    | `between_tools` | 7–8s | ~650 | 0 | 3/3 |
    | `effort: low` | 7–13s | ~600, or 1.2k with a repair | 0 | 2/3 |

  - The visible writing looked close on these three. That sample is not a quality test: the comparison was not blind, and three charts cannot decide it.
  - **Decision:** keep thinking on for both the summary call and the calendar call. Do not send `between_tools`. Low effort is out: it was flatter, and one chart needed a repair. A real comparison waits for the blind 20-fixture run in section E.
  - **Duration.** Hobby is non-commercial personal use only ([fair use](https://vercel.com/docs/limits/fair-use-guidelines)), so this product designs for Pro. A new project gets Fluid compute by default.

    | | Default | Maximum |
    | --- | --- | --- |
    | Hobby, Fluid | 300s | 300s |
    | Pro, Fluid | 300s | 800s (1800s extended, beta) |
    | Hobby, no Fluid (legacy) | 10s | 60s |
    | Pro, no Fluid (legacy) | 15s | 300s |

  - One calendar call plus one repair is estimated at 120–240s. That fits Pro with Fluid. **Keep one calendar call.** The calendar route's `maxDuration` is 300. The summary route's is 120 (a repair is about 50s, and 60s left no margin). Do not split.

### C. Chart page: functional gaps (no visual polish)

5. **Wheel SVG structure.** Make the ring, each point and each line a separate addressable element, grouped (rings, dividers, axes, points), with stable IDs per `PointId`, so a GSAP timeline can draw the wheel piece by piece later.
   - IDs must be unique on the page, so prefix them: `wheel-ring`, `wheel-point-sun`, `wheel-axis-asc`, `wheel-divider-3`.
   - "Lines" today means the 12 sign dividers and the two axes. There are no aspect lines. Adding them would be a new visual element and a design-pass decision, so not here.
6. **Card-to-wheel link.** The spec says each pattern card links to its points with matching markers. Right now the emphasis is barely visible and the cards have no markers. Build the link functionally, with minimal styling; the look comes in the design pass.
   - One point can belong to more than one card (the live runs had `sun` and `mercury` in two), so a point must be able to carry several markers, for example numbered 1–3.
- **Done.** The wheel is grouped: `wheel-rings` (`wheel-ring`, `wheel-ring-inner`), `wheel-dividers` (`wheel-divider-1` is 0° Aries), `wheel-axes` (`wheel-axis-asc`, `wheel-axis-mc`), `wheel-points` (`wheel-point-sun`). A chart without a birth time has no dividers and no axes. Each card shows its number, and the same number sits outside the ring on that card's points (`wheel-marker-sun-1`). Where points cluster, those numbers float away from their dots. That ambiguity is a design-pass problem (section F), not a reason to keep moving the numbers.

### D. Remaining functional flow

7. **Calendar call.**
   - It starts in parallel with the summary as soon as the chart exists and runs in the background.
   - It reuses `callClaude` with thinking left on. Do not send `between_tools`. It joins entries by `transitId`, and its `maxDuration` is 300.
   - It's cached in `sessionStorage` with the same key pattern, plus the window start date. The transits depend on today's date, so a key without it would serve yesterday's calendar after midnight.
   - The route returns the engine's dated transits joined with the model's entries, plus the monthly cards. The browser builds the `.ics` from that, so it needs the dates, not only the text.
   - The first monthly card uses the generation date, not the download date. Downloads can come from the cache later than generation, and this keeps the file consistent with the cached entries.
   - The download area shows "Still writing your year…" until it's ready, and offers a retry on failure while the wheel and summary stay intact.
8. **ICS generation and download, then email capture (Buttondown)**, as already planned.
- **Then rate-limit the AI routes before sharing the link.** `/api/summary` and `/api/calendar` are public endpoints that spend the API budget on every request. Add basic per-IP rate limiting before the URL goes anywhere public.

### E. Prompt iteration (step 7): notes

- **Context answers change the advice; they are never reported back as insight.** "You're in a period of upheaval", after the person chose "I'm in the middle of one", fails this even though it isn't a label echo.
- **Rules are concrete and doable, with no timeframe.** Two of three test cards said "this week", and it reads as a template. The phrasing comes from our own text, so reword all of these to "concrete and doable", then bump the prompt version of whichever call the file belongs to (`SUMMARY_PROMPT_VERSION` or `CALENDAR_PROMPT_VERSION`):
  - the voice block's quality bar (`src/lib/ai/voice.ts`)
  - the summary output spec (`src/lib/ai/outputs/summary.ts`)
  - the editing rules in `src/lib/ai/examples/README.md`
  - the example card "Show one unfinished thing to one person this week." (`src/lib/ai/examples/summary.ts`)
  - the calendar example "every idea that crosses your desk this week" (`src/lib/ai/examples/calendar.ts`), and the monthly example "give it one honest week"
  - spec section 7's test criterion "a rule a person could actually do this week"
- **Quiet-month cards converge on one template.** The live run used "Nothing is demanded of you, and that's the point" (chart A, October) and "Nothing is pushing on you, and that is the point" (chart B, June), both followed by "Watch for the urge to…". Vary them. On the 24-card run, every chart A card in 2027 also closed with "Watch for", so the tic is not limited to quiet months.
- **24-card slips to fix with the prompt, separate from any call split.** Chart B's 2027 cards say "January's choices", "the spring", and "Nothing exact". Month names, seasons, and the engine's word "exact" are already forbidden.
- **Hedge.** Chart A's 21 August 2027 entry says "is likely what needs to change". Same dodge as "you may feel". Catch it in the batch review.
- **July month line is unclear ("builds toward a pitch").** Chart A's July 2027 card. The month line should say what is happening.
- **Dated-entry volume.** Spec section 4 estimates 15–35 dated entries a year. The 12-month live run had 8 on chart A and 5 on chart B. When the 20 fixtures exist, record the count for each, then replace that estimate with the real range. Don't update the spec from these two alone.
- **Focus area versus unknown birth time.** Spec section 4 says the focus area decides which life domains entries lean toward; an unknown birth time means the prompt doesn't name life areas. The current instruction forbids life areas only "on the strength of the data", so the person's own focus answer can still steer the advice. Keep it that way; don't tighten it by accident.
- **Grammar.** One slip so far ("a observer"). Include a grammar check in the batch review.
- **Fixtures.** The spec's twenty-chart test needs 20; there are 3. Write the other 17 as a deliberate spread, covering at least:
  - unknown birth time, both with and without a Moon sign change that day
  - southern hemisphere
  - a birth time in a DST gap
  - a pre-1980 birth
  - planets near sign boundaries
  - a chart with few transit hits
  - every option of both context questions at least once
  - Public charts or made-up data only.
- **Blind comparison.** Once those 20 fixtures exist, run the summary on each one twice: default thinking, and `thinking: { type: "between_tools" }`. Shuffle the two outputs for each fixture and hide which setting wrote which, until the owner has rated them. Thinking stays on in the product until that rating says otherwise. The three-fixture sample in section B does not decide it.

### F. Design pass (after D is done): all three screens together

- One coherent pass across the questionnaire, the chart page (including the email and download area) and the loading states.
- **Loading animation:** GSAP with `@gsap/react` (`useGSAP` for cleanup). Approved as a dependency when this work starts; add it to the Decisions section in `project.mdc` then.
  - Animate the real wheel drawing itself (ring, then points, then lines), not a spinner.
  - Design for 17–25 seconds as the typical wait, and about 50 seconds when the repair turn runs: slow progression, a few staged brand-voice copy lines, then a calm idle state through the long case.
  - No fake progress: no percentages, no "almost there".
  - When the summary arrives mid-animation, resolve quickly into the emphasis fade-in. Never make the person wait for the animation to finish.
  - `prefers-reduced-motion`: a static, settled wheel plus the copy lines.
- **Wheel markers.** The numbers sit outside the ring. Where points cluster, they float away from their dots, so it is unclear which number belongs to which point. Solve that here. Leave the positions alone until this pass.

### Open question (don't build)

- **"Add the name below the chart."** Undecided whether this means the person's name (for example a quiet, journal-style caption with birth date and place) or a legend naming the points. A legend conflicts with the no-astrology-terms rule unless it uses plain words. Stays open until decided.

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
