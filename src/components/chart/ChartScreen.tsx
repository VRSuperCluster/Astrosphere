"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, buttonClassName } from "@/components/ui/Button";
import { QuestionPrompt } from "@/components/ui/QuestionPrompt";
import { StepTransition } from "@/components/ui/StepTransition";
import { clearAnswers, parseAnswers, useSavedAnswersJson } from "@/lib/questionnaire/storage";
import type { Chart, ChartResponse } from "@/types/chart";
import { ChartSummary } from "./ChartSummary";
import { ChartWheel } from "./ChartWheel";
import { UnknownTimeNote } from "./UnknownTimeNote";

type ChartState = { status: "loading" } | { status: "failed" } | { status: "ready"; chart: Chart };

/** Casts the chart from the answers saved in this tab. With none, sends the visitor to the start. */
export function ChartScreen() {
  const router = useRouter();
  const saved = useSavedAnswersJson();
  const [state, setState] = useState<ChartState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (saved === undefined) return;
    if (saved === null) {
      router.replace("/");
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/chart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: saved,
          signal: controller.signal,
        });
        // Answers the route rejects can't be fixed on this screen.
        if (res.status === 400) {
          clearAnswers();
          router.replace("/");
          return;
        }
        if (!res.ok) throw new Error(`chart ${res.status}`);
        const data: ChartResponse = await res.json();
        setState({ status: "ready", chart: data.chart });
      } catch {
        if (controller.signal.aborted) return;
        setState({ status: "failed" });
      }
    })();
    return () => controller.abort();
  }, [saved, attempt, router]);

  if (!saved) return null;
  const firstName = parseAnswers(saved)?.firstName;

  return (
    <StepTransition key={state.status}>
      {state.status === "loading" ? (
        <p role="status" className="text-lg text-muted">
          Working out where everything stood when you were born.
        </p>
      ) : state.status === "failed" ? (
        <div className="space-y-4">
          <p role="alert" className="text-lg">
            We couldn&apos;t draw your chart just now. That&apos;s on our side, not yours.
          </p>
          <Button
            variant="quiet"
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-12">
          <QuestionPrompt
            title={
              firstName
                ? `Here's what you're working with, ${firstName}.`
                : "Here's what you're working with."
            }
          />
          <ChartWheel chart={state.chart} />
          <ChartSummary />
          {state.chart.birthTimeKnown ? null : <UnknownTimeNote />}
          <Link href="/" className={`inline-block ${buttonClassName("quiet")}`}>
            Change your answers
          </Link>
        </div>
      )}
    </StepTransition>
  );
}
