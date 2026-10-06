"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OptionList } from "@/components/ui/OptionList";
import { QuestionPrompt } from "@/components/ui/QuestionPrompt";
import { TextField } from "@/components/ui/TextField";
import { MIN_PLACE_QUERY_LENGTH, describePlace } from "@/lib/questionnaire/place";
import type { Place, PlacesResponse } from "@/types/places";

const DEBOUNCE_MS = 300;

interface PlaceOfBirthStepProps {
  initial?: Place;
  onContinue: (place: Place) => void;
}

/** Search-as-you-type against /api/places. Picking a result moves on immediately. */
export function PlaceOfBirthStep({ initial, onContinue }: PlaceOfBirthStepProps) {
  const [query, setQuery] = useState(initial?.name ?? "");
  const [results, setResults] = useState<{ query: string; places: Place[] } | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "failed">("idle");
  const [attempt, setAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const messageId = useId();

  const trimmed = query.trim();
  const active = trimmed.length >= MIN_PLACE_QUERY_LENGTH;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`places ${res.status}`);
        const data: PlacesResponse = await res.json();
        setResults({ query: trimmed, places: data.places });
        setStatus("idle");
      } catch {
        if (controller.signal.aborted) return;
        // Older results stay up while the next search loads, but not once it has failed.
        setResults(null);
        setStatus("failed");
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, active, attempt]);

  const places = active && results ? results.places : [];
  const noMatch = status === "idle" && results?.query === trimmed && results.places.length === 0;

  function choose(id: string) {
    const place = places.find((p) => String(p.id) === id);
    if (place) onContinue(place);
  }

  return (
    <div className="space-y-12">
      <QuestionPrompt id={headingId} title="Where were you born?">
        The town or city. If it was somewhere small, the nearest town you can name will do.
      </QuestionPrompt>

      <div className="space-y-4">
        <TextField
          ref={inputRef}
          label="City or town"
          type="text"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          autoFocus
          aria-describedby={messageId}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setStatus("idle");
          }}
        />

        <p id={messageId} aria-live="polite" className="min-h-7 text-lg">
          {!active ? null : status === "failed" ? (
            <span className="text-ink">
              We couldn&apos;t look that up just now. That&apos;s on our side, not yours.
            </span>
          ) : noMatch ? (
            <span className="text-ink">
              Nothing by that name. Check the spelling, try the nearest larger town, or add the
              country after a comma.
            </span>
          ) : status === "loading" ? (
            <span className="text-muted">Looking it up.</span>
          ) : null}
        </p>

        {active && status === "failed" ? (
          <Button
            variant="quiet"
            onClick={() => {
              setStatus("loading");
              setAttempt((n) => n + 1);
              // The button unmounts once loading starts; keep focus somewhere useful.
              inputRef.current?.focus();
            }}
          >
            Try again
          </Button>
        ) : null}
      </div>

      {places.length > 0 ? (
        <OptionList
          aria-labelledby={headingId}
          options={places.map((p) => ({ value: String(p.id), label: describePlace(p) }))}
          selected={initial ? String(initial.id) : undefined}
          onSelect={choose}
        />
      ) : null}
    </div>
  );
}
