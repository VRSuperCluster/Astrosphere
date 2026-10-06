"use client";

import {
  useId,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { Button } from "@/components/ui/Button";
import { QuestionPrompt } from "@/components/ui/QuestionPrompt";
import { TextField } from "@/components/ui/TextField";
import {
  describeBirthDate,
  isComplete,
  localToday,
  toInput,
  validateBirthDate,
} from "@/lib/questionnaire/birth-date";
import type { BirthDate, BirthDateInput } from "@/types/questionnaire";

interface BirthDateStepProps {
  initial?: BirthDate;
  onContinue: (birthDate: BirthDate) => void;
}

const MAX_LENGTH: Record<keyof BirthDateInput, number> = { day: 2, month: 2, year: 4 };

export function BirthDateStep({ initial, onContinue }: BirthDateStepProps) {
  const [input, setInput] = useState<BirthDateInput>(() => toInput(initial));
  const [attempted, setAttempted] = useState(false);
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const messageId = useId();

  const result =
    attempted || isComplete(input) ? validateBirthDate(input, localToday()) : null;
  const error = result && !result.ok ? result.error : null;

  function update(field: keyof BirthDateInput, raw: string) {
    const value = raw.replace(/\D/g, "").slice(0, MAX_LENGTH[field]);
    setInput((prev) => ({ ...prev, [field]: value }));
    setAttempted(false);

    // A first digit that can't start a two-digit value means the field is done.
    if (field === "day" && (value.length === 2 || Number(value) > 3)) {
      monthRef.current?.focus();
    }
    if (field === "month" && (value.length === 2 || Number(value) > 1)) {
      yearRef.current?.focus();
    }
  }

  function backspaceTo(
    event: KeyboardEvent<HTMLInputElement>,
    previous: RefObject<HTMLInputElement | null>,
  ) {
    if (event.key === "Backspace" && event.currentTarget.value === "") {
      event.preventDefault();
      previous.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const outcome = validateBirthDate(input, localToday());
    if (outcome.ok) onContinue(outcome.value);
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
      <QuestionPrompt id={headingId} title="When were you born?">
        Start with the one date you had no say in.
      </QuestionPrompt>

      <div role="group" aria-labelledby={headingId} className="space-y-4">
        <div className="grid grid-cols-4 gap-6">
          <TextField
            {...sharedInputProps}
            ref={dayRef}
            label="Day"
            placeholder="DD"
            autoComplete="bday-day"
            autoFocus
            value={input.day}
            onChange={(event) => update("day", event.target.value)}
          />
          <TextField
            {...sharedInputProps}
            ref={monthRef}
            label="Month"
            placeholder="MM"
            autoComplete="bday-month"
            value={input.month}
            onChange={(event) => update("month", event.target.value)}
            onKeyDown={(event) => backspaceTo(event, dayRef)}
          />
          <TextField
            {...sharedInputProps}
            ref={yearRef}
            className="col-span-2"
            label="Year"
            placeholder="YYYY"
            autoComplete="bday-year"
            value={input.year}
            onChange={(event) => update("year", event.target.value)}
            onKeyDown={(event) => backspaceTo(event, monthRef)}
          />
        </div>

        <p id={messageId} aria-live="polite" className="min-h-7 text-lg">
          {error ? (
            <span className="text-ink">{error}</span>
          ) : result?.ok ? (
            <span className="text-muted">{describeBirthDate(result.value)}</span>
          ) : null}
        </p>
      </div>

      <Button type="submit">Continue</Button>
    </form>
  );
}
