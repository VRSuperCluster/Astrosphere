"use client";

import {
  useId,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/Button";
import { QuestionPrompt } from "@/components/ui/QuestionPrompt";
import { TextField } from "@/components/ui/TextField";
import {
  describeBirthTime,
  isComplete,
  toInput,
  validateBirthTime,
} from "@/lib/questionnaire/birth-time";
import type { BirthTimeAnswer, BirthTimeInput } from "@/types/questionnaire";

interface BirthTimeStepProps {
  initial?: BirthTimeAnswer;
  onContinue: (birthTime: BirthTimeAnswer) => void;
}

export function BirthTimeStep({ initial, onContinue }: BirthTimeStepProps) {
  const [input, setInput] = useState<BirthTimeInput>(() =>
    toInput(initial?.known ? initial.time : undefined),
  );
  const [attempted, setAttempted] = useState(false);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const messageId = useId();

  const result = attempted || isComplete(input) ? validateBirthTime(input) : null;
  const error = result && !result.ok ? result.error : null;

  function update(field: keyof BirthTimeInput, raw: string) {
    const value = raw.replace(/\D/g, "").slice(0, 2);
    setInput((prev) => ({ ...prev, [field]: value }));
    setAttempted(false);

    // A first digit above 2 can't start a two-digit hour, so the hour is done.
    if (field === "hour" && (value.length === 2 || Number(value) > 2)) {
      minuteRef.current?.focus();
    }
  }

  function handleMinuteKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && event.currentTarget.value === "") {
      event.preventDefault();
      hourRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const outcome = validateBirthTime(input);
    if (outcome.ok) onContinue({ known: true, time: outcome.value });
  }

  const sharedInputProps = {
    type: "text",
    inputMode: "numeric",
    invalid: Boolean(error),
    "aria-describedby": messageId,
    onFocus: (event: FocusEvent<HTMLInputElement>) => event.currentTarget.select(),
  } as const;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-12">
      <QuestionPrompt id={headingId} title="What time were you born?">
        Your birth certificate knows, or whoever was in the room does. Use the 24-hour
        clock.
      </QuestionPrompt>

      <div role="group" aria-labelledby={headingId} className="space-y-4">
        <div className="grid grid-cols-4 gap-6">
          <TextField
            {...sharedInputProps}
            ref={hourRef}
            label="Hour"
            placeholder="HH"
            autoFocus
            value={input.hour}
            onChange={(event) => update("hour", event.target.value)}
          />
          <TextField
            {...sharedInputProps}
            ref={minuteRef}
            label="Minutes"
            placeholder="MM"
            value={input.minute}
            onChange={(event) => update("minute", event.target.value)}
            onKeyDown={handleMinuteKeyDown}
          />
        </div>

        <p id={messageId} aria-live="polite" className="min-h-7 text-lg">
          {error ? (
            <span className="text-ink">{error}</span>
          ) : result?.ok ? (
            <span className="text-muted">{describeBirthTime(result.value)}</span>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        <Button type="submit">Continue</Button>
        <Button variant="quiet" onClick={() => onContinue({ known: false })}>
          I don&apos;t know the time
        </Button>
      </div>
    </form>
  );
}
