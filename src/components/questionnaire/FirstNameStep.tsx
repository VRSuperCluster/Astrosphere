"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { QuestionPrompt } from "@/components/ui/QuestionPrompt";
import { TextField } from "@/components/ui/TextField";
import { validateFirstName } from "@/lib/questionnaire/first-name";

interface FirstNameStepProps {
  initial?: string;
  onContinue: (firstName: string) => void;
}

export function FirstNameStep({ initial, onContinue }: FirstNameStepProps) {
  const [input, setInput] = useState(initial ?? "");
  const [attempted, setAttempted] = useState(false);
  const messageId = useId();

  const result = attempted ? validateFirstName(input) : null;
  const error = result && !result.ok ? result.error : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const outcome = validateFirstName(input);
    if (outcome.ok) onContinue(outcome.value);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-12">
      <QuestionPrompt title="What should we call you?">
        Just your first name. The one people use when they want your full attention.
      </QuestionPrompt>

      <div className="space-y-4">
        <TextField
          label="First name"
          type="text"
          autoComplete="given-name"
          autoCapitalize="words"
          spellCheck={false}
          autoFocus
          invalid={Boolean(error)}
          aria-describedby={messageId}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setAttempted(false);
          }}
        />

        <p id={messageId} aria-live="polite" className="min-h-7 text-lg">
          {error ? <span className="text-ink">{error}</span> : null}
        </p>
      </div>

      <Button type="submit">Continue</Button>
    </form>
  );
}
