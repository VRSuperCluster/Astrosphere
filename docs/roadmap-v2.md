# Roadmap V2 — Paid Layers

> **Context only. Do not implement anything in this file during the MVP.**
> It exists so the MVP is built in a way that makes these layers additive later. If a task seems to require something described here, stop and ask.

Last updated: October 2026

## The idea

The MVP gives away a free chart summary and a free transit calendar. V2 sells deeper documents built on the same birth data intake, the same chart engine and the same voice.

These documents are modelled on two personal documents written by hand before the product existed:

- **A navigation document** (timing): what's coming over several years, with concrete do/don't rules for each period.
- **An identity document** (who you are): how you operate, what's underneath, and rules for working with yourself instead of against yourself.

Both were genuinely useful and both were made manually. V2 productises them.

Working price assumption from earlier planning: chart reading ~$12, year calendar ~$12, bundle ~$19. Not final.

## Products

### 1. Natal reading (identity document)

The deep, timeless document. The free chart page is a three-card preview of it.

Sections (adapted from the identity document's structure):

1. **The core read.** The free summary's read, expanded: how you come across vs what's running underneath.
2. **Operating patterns.** Eight to twelve pattern → rule cards across work, relationships, decisions, rest and creativity. Same format as the free cards, so the free page reads as a sample.
3. **What's trying to emerge.** The part of the chart that is under-expressed, why it's been held back, and how it comes out.
4. **The long arc.** How the decades ahead change the balance (externalising what's been internal, and so on). Built from slow-moving cycles computed in code, not invented by the model.
5. **Your generation.** The collective backdrop: where the slowest planets were at birth, framed as what you share with everyone born near you. Pure data plus interpretation. Cheap to build.
6. **Decision filter.** Five or six questions to run a choice through, derived from the chart.

Length: roughly 3,000–5,000 words. Delivered as a designed web page with a PDF export.

### 2. Multi-year timing guide (navigation document)

The long-range companion to the calendar.

Sections (adapted from the navigation document's structure):

1. **Visual timeline.** The major periods over the next 3–5 years on one page.
2. **The next six months.** A concrete framework for the near term.
3. **Period by period.** Each major period with its theme and a short DO / DON'T list. Rules are specific and time-bound ("don't start X until this period ends"). This is the most distinctive part of the format and the strongest expression of the brand voice.
4. **Decision filter** (shared with the natal reading if both are bought).
5. **The horizon.** What the next five years are building toward.

Built from the existing transit engine with a longer window and only the slowest planets (Saturn, Uranus, Neptune, Pluto, plus Jupiter for expansion periods).

### 3. Vedic layer (sidereal)

Positioning: tropical describes the interface (how you operate and come across); sidereal describes what's underneath. In the personal identity document this "two systems" framing was the part that resonated most.

What it is **not**: a second calendar. Natal aspect timing is identical in both systems, because it measures the physical angle between two planets. Only sign changes and house framing differ. A parallel sidereal calendar would mostly repeat the same dates with different labels.

What it **is**:

- An "underneath" section in the natal reading: the sidereal signs and houses, synthesised with the tropical read.
- Dasha periods (Vimshottari): life chapters computed from the Moon's sidereal position at birth. These frame the multi-year timing guide and, optionally, the monthly calendar cards ("you are in a chapter about…").

Calculation:

- Sidereal longitude = tropical longitude − ayanamsa (Lahiri). Derived from the raw longitudes the MVP already stores.
- Nakshatras: the sidereal zodiac in 27 equal segments of 13°20′.
- Vimshottari dasha: a fixed 120-year sequence starting from the Moon's nakshatra and how far through it the Moon is. Deterministic, roughly a few hundred lines with sub-periods.
- Verify every piece against Astro-Seek's sidereal and dasha calculators with fixture charts.

Known risk: **sign-boundary sensitivity.** When the Ascendant or a planet sits within about 1° of a sign change, a few minutes of birth-time error flips the sign. The sidereal Ascendant moves faster through the boundary than people expect. Any feature that leans on a sidereal sign needs a confidence check, and the prompt must frame a boundary placement as a blend rather than a verdict.

### 4. Later, not scoped

- Famous person matches (needs a verified, licensed chart dataset; a data task, not a prompt task).
- Human Design, numerology.
- Physical annual planner.
- Synastry / compatibility reports.
- Living calendar via Google Calendar API (needs accounts).

## Infrastructure V2 adds

| Piece | Why | Notes |
| --- | --- | --- |
| Payments | Selling documents | Prefer a merchant-of-record provider (Paddle, Lemon Squeezy or similar) so EU VAT on digital sales is handled. Confirm with the accountant before choosing. |
| Background generation | Long documents take 1–3 minutes to write | Pay → generate in the background → email a link when ready. |
| Minimal persistence | Generated documents must outlive the session | A small store keyed by order ID (e.g. Supabase). Still no user accounts. |
| PDF export | People want to keep the document | Render from the same web page. |
| Evals for long outputs | Quality across 15 sections is harder than across 3 sentences | Extend the MVP eval setup with per-section rubrics. |

No user accounts are needed for one-off documents. Accounts only become necessary for subscriptions or a self-updating calendar.

## Rough effort

| Layer | Effort | Hard part |
| --- | --- | --- |
| Payments + delivery | 3–5 days | VAT and provider choice |
| Natal reading (tropical) | 1.5–2 weeks | Keeping a long document consistently good |
| Generational section | 1–2 days | Nothing; pure data |
| Multi-year timing guide | ~1 week | Rules that feel specific, not generic |
| Vedic layer | 2–3 weeks | Calculation accuracy, boundary charts, two-system synthesis |

Suggested order: payments + natal reading → timing guide → Vedic layer. Roughly 6–8 focused weeks in total.

## What the MVP must do now so V2 is additive

These are the only V2-related things allowed in the MVP:

- Store raw ecliptic longitudes in the chart JSON, not only signs and houses.
- One prompt module per output type in `src/lib/ai/outputs/`, sharing the voice block and the examples library.
- Keep the chart JSON the single source of truth for all natal data.
- Keep the transit engine's window and planet list as parameters, not constants.
