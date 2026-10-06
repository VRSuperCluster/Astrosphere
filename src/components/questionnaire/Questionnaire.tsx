"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import { Button } from "@/components/ui/Button";
import { StepTransition } from "@/components/ui/StepTransition";
import {
  CHANGE_STANCE_OPTIONS,
  LIFE_AREA_OPTIONS,
} from "@/lib/questionnaire/context-questions";
import { parseAnswers, saveAnswers, useSavedAnswersJson } from "@/lib/questionnaire/storage";
import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { BirthDateStep } from "./BirthDateStep";
import { BirthTimeStep } from "./BirthTimeStep";
import { ChoiceStep } from "./ChoiceStep";
import { FirstNameStep } from "./FirstNameStep";
import { PlaceOfBirthStep } from "./PlaceOfBirthStep";

const STEPS = [
  "birthDate",
  "birthTime",
  "placeOfBirth",
  "firstName",
  "lifeArea",
  "changeStance",
] as const;
type StepId = (typeof STEPS)[number];

/** Pre-fills from answers saved earlier in this tab, e.g. on the way back from the chart. */
export function Questionnaire() {
  const saved = useSavedAnswersJson();
  // The server can't see saved answers and renders empty steps; finding some in the browser
  // changes the key, which restarts the steps with them.
  return (
    <QuestionnaireSteps
      key={saved ? "saved" : "empty"}
      initialAnswers={(saved && parseAnswers(saved)) || {}}
    />
  );
}

function QuestionnaireSteps({ initialAnswers }: { initialAnswers: QuestionnaireAnswers }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(initialAnswers);
  const step = STEPS[index];

  function save(update: Partial<QuestionnaireAnswers>) {
    const next = { ...answers, ...update };
    setAnswers(next);
    if (index < STEPS.length - 1) {
      setIndex(index + 1);
      return;
    }
    saveAnswers(next);
    router.push("/chart");
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
      case "placeOfBirth":
        return (
          <PlaceOfBirthStep
            initial={answers.placeOfBirth}
            onContinue={(placeOfBirth) => save({ placeOfBirth })}
          />
        );
      case "firstName":
        return (
          <FirstNameStep
            initial={answers.firstName}
            onContinue={(firstName) => save({ firstName })}
          />
        );
      case "lifeArea":
        return (
          <ChoiceStep
            title="What area of your life feels most in motion right now?"
            description="Pick the one you think about when you can't sleep. This question is optional."
            options={LIFE_AREA_OPTIONS}
            initial={answers.lifeArea}
            onContinue={(lifeArea) => save({ lifeArea })}
          />
        );
      case "changeStance":
        return (
          <ChoiceStep
            title="What's your relationship with change?"
            description="Answer for who you are, not who you'd like to be. Also optional."
            options={CHANGE_STANCE_OPTIONS}
            initial={answers.changeStance}
            onContinue={(changeStance) => save({ changeStance })}
          />
        );
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
