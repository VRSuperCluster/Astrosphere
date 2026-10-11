# Gold-standard examples

Hand-written examples that anchor the voice and quality of every AI output. They are the most important creative asset in the product: the model interpolates between them, so they set the ceiling.

- `summary.ts`: the chart page read and pattern → rule cards.
- `calendar.ts`: dated calendar entries (several registers, plus repeated passes) and monthly context cards.

## How they're used

Prompt modules in `src/lib/ai/outputs/` import the examples they need and render them into the system prompt. Each output type picks its own subset; the shared voice block is the same for all.

The `internal` field on each example describes the chart or transit it represents. It can be shown to the model as context ("for a configuration like this, write like this"), but it is never shown to users and the model must not echo its wording.

## Rules for editing

- No astrological terms in `title`, `description`, `read`, `pattern` or `rule`.
- No hedging ("may", "might", "perhaps"), no mystical language, no generic positivity.
- At most one question per description.
- No assumptions the engine can't back up: no weekdays ("before Friday"), seasons or hemisphere ("in the spring"), holidays or weather.
- Second person, present or future tense.
- Pattern cards: the pattern names a real, slightly uncomfortable behaviour; the rule is concrete enough to do this week.
- Keep the set varied in length, opening and structure. If two examples start the same way, rewrite one.

This is a starting set. Revise by hand before launch, and add examples whenever eval runs show a weak register.
