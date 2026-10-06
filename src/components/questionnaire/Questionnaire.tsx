"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { QuestionPrompt } from "@/components/ui/QuestionPrompt";
import { StepTransition } from "@/components/ui/StepTransition";
import { describeBirthDate } from "@/lib/questionnaire/birth-date";
import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { BirthDateStep } from "./BirthDateStep";

type StepId = "birthDate" | "notBuiltYet";

export function Questionnaire() {
  const [step, setStep] = useState<StepId>("birthDate");
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});

  return (
    <StepTransition key={step}>
      {step === "birthDate" ? (
        <BirthDateStep
          initial={answers.birthDate}
          onContinue={(birthDate) => {
            setAnswers((prev) => ({ ...prev, birthDate }));
            setStep("notBuiltYet");
          }}
        />
      ) : (
        <NotBuiltYetStep answers={answers} onBack={() => setStep("birthDate")} />
      )}
    </StepTransition>
  );
}

/** Temporary stand-in until the time-of-birth step exists. */
function NotBuiltYetStep({
  answers,
  onBack,
}: {
  answers: QuestionnaireAnswers;
  onBack: () => void;
}) {
  return (
    <div className="space-y-12">
      <QuestionPrompt title="Time of birth comes next.">
        {answers.birthDate
          ? `Saved: ${describeBirthDate(answers.birthDate)} This step isn't built yet.`
          : "This step isn't built yet."}
      </QuestionPrompt>
      <Button variant="quiet" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
