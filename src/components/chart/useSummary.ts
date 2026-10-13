import { useMemo } from "react";
import { summarySchemaFor } from "@/lib/ai/outputs/summary-schema";
import { cacheKey } from "@/lib/ai/session-cache";
import { SUMMARY_PROMPT_VERSION } from "@/lib/ai/versions";
import { parseAnswers } from "@/lib/questionnaire/storage";
import type { Chart } from "@/types/chart";
import type { Summary, SummaryRequest, SummaryResponse } from "@/types/summary";
import { useCachedResult, type CachedQuery } from "./useCachedResult";

/**
 * The chart page's read and pattern cards, for this chart and these answers.
 * Talks only to `/api/summary`; the model is called from there.
 */
export function useSummary(chart: Chart | null, savedAnswersJson: string | null | undefined) {
  const query = useMemo((): CachedQuery<Summary> | null => {
    const answers = savedAnswersJson ? parseAnswers(savedAnswersJson) : null;
    if (!chart || !answers) return null;

    const body: SummaryRequest = {
      chart,
      firstName: answers.firstName,
      lifeArea: answers.lifeArea,
      changeStance: answers.changeStance,
    };
    return {
      cacheKey: cacheKey({ output: "summary", promptVersion: SUMMARY_PROMPT_VERSION }, answers),
      schema: summarySchemaFor(chart),
      async request(signal) {
        const res = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        });
        if (!res.ok) throw new Error(`summary ${res.status}`);
        const data: SummaryResponse = await res.json();
        return data.summary;
      },
    };
  }, [chart, savedAnswersJson]);

  return useCachedResult(query);
}
