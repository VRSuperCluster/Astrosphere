"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { OptionList } from "@/components/ui/OptionList";
import { QuestionPrompt } from "@/components/ui/QuestionPrompt";
import type { ChoiceOption } from "@/types/questionnaire";

interface ChoiceStepProps<T extends string> {
  title: string;
  description: string;
  options: readonly ChoiceOption<T>[];
  initial?: T;
  /** Receives `undefined` when the user skips. */
  onContinue: (value: T | undefined) => void;
}

/** An optional single-select question. Picking an answer moves on immediately. */
export function ChoiceStep<T extends string>({
  title,
  description,
  options,
  initial,
  onContinue,
}: ChoiceStepProps<T>) {
  const headingId = useId();

  return (
    <div className="space-y-12">
      <QuestionPrompt id={headingId} title={title}>
        {description}
      </QuestionPrompt>

      <OptionList
        aria-labelledby={headingId}
        options={options}
        selected={initial}
        onSelect={onContinue}
      />

      <Button variant="quiet" onClick={() => onContinue(undefined)}>
        Skip this question
      </Button>
    </div>
  );
}
