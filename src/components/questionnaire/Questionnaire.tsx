"use client";

import { useState, type ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { QuestionPrompt } from "@/components/ui/QuestionPrompt";
import { StepTransition } from "@/components/ui/StepTransition";
import { describeBirthDate } from "@/lib/questionnaire/birth-date";
import { describeBirthTime } from "@/lib/questionnaire/birth-time";
import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { BirthDateStep } from "./BirthDateStep";
import { BirthTimeStep } from "./BirthTimeStep";
import { FirstNameStep } from "./FirstNameStep";

const STEPS = ["birthDate", "birthTime", "firstName", "notBuiltYet"] as const;
type StepId = (typeof STEPS)[number];

export function Questionnaire() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const step = STEPS[index];

  function save(update: Partial<QuestionnaireAnswers>) {
    setAnswers((prev) => ({ ...prev, ...update }));
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function renderStep(id: StepId): ReactElement {
    switch (id) {
      case "birthDate":
        return (
          <BirthDateStep
            initial={answers.birthDate}
            onContinue={(birthDate) => save({ birthDate })}
          />
        );
      case "birthTime":
        return (
          <BirthTimeStep
            initial={answers.birthTime}
            onContinue={(birthTime) => save({ birthTime })}
          />
        );
      case "firstName":
        return (
          <FirstNameStep
            initial={answers.firstName}
            onContinue={(firstName) => save({ firstName })}
          />
        );
      case "notBuiltYet":
        return <NotBuiltYetStep answers={answers} />;
    }
  }

  return (
    <div className="space-y-8">
      <div className="min-h-13">
        {index > 0 ? (
          <Button variant="quiet" onClick={() => setIndex((i) => i - 1)}>
            Back
          </Button>
        ) : null}
      </div>

      <StepTransition key={step}>{renderStep(step)}</StepTransition>
    </div>
  );
}

/** Temporary stand-in until the place-of-birth step exists. */
function NotBuiltYetStep({ answers }: { answers: QuestionnaireAnswers }) {
  const saved = [
    answers.birthDate ? describeBirthDate(answers.birthDate) : null,
    answers.birthTime
      ? answers.birthTime.known
        ? describeBirthTime(answers.birthTime.time)
        : "Time unknown."
      : null,
    answers.firstName ? `${answers.firstName}.` : null,
  ].filter(Boolean);

  return (
    <QuestionPrompt title="Place of birth comes next.">
      {`Saved: ${saved.join(" ")} This step isn't built yet.`}
    </QuestionPrompt>
  );
}
