# Backlog

Decisions we've deferred on purpose. Check this at the start of each phase.

## Phase 2

- **Add Vitest** (needs approval as a new dependency). First targets: date and time validation in `src/lib/questionnaire/`, then the DST cases the rules require (spring-forward gap, autumn fall-back, a pre-1980 date in a zone whose rules changed).

## Later (after the core flow works)

- **Intro screen, navbar, other pages.** Visitors currently land straight on "When were you born?", and on phones the keyboard opens at once because the first field has focus. Design all screens together (doc or flowchart) before building any of them.
- **Progress indicator** for the questionnaire. The steps are an ordered list in `Questionnaire.tsx`, so this is a small addition.

## Defaults to revisit in the design pass

- Dates are entered day, month, year.
- Years before 1900 are rejected (`MIN_BIRTH_YEAR`).
- Times use the 24-hour clock.
- The terracotta accent is only used for underlines and focus outlines: as text on paper it's about 4.2:1, below the WCAG AA 4.5:1 minimum.
