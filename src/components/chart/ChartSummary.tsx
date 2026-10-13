import { Button } from "@/components/ui/Button";
import { StepTransition } from "@/components/ui/StepTransition";
import type { Summary } from "@/types/summary";
import type { CachedResult } from "./useCachedResult";

/** The read and the three pattern cards, or the wait for them. The wheel above never moves. */
export function ChartSummary({ result, onRetry }: { result: CachedResult<Summary>; onRetry: () => void }) {
  return (
    <StepTransition key={result.status}>
      {result.status === "loading" ? (
        <p role="status" className="text-lg text-muted">
          Reading your chart…
        </p>
      ) : result.status === "failed" ? (
        <div className="space-y-4">
          <p role="alert" className="text-lg text-pretty">
            We couldn&apos;t put this into words just now. That&apos;s on us, not you.
          </p>
          <Button variant="quiet" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          <p className="text-lg text-pretty">{result.data.read}</p>
          <ol className="space-y-8">
            {result.data.patterns.map((card, i) => (
              <li key={i} className="space-y-3 border-t border-hairline pt-6">
                <p className="text-lg text-pretty">{card.pattern}</p>
                <p className="text-lg text-pretty">
                  <span className="mr-2 text-muted">What to do:</span>
                  {card.rule}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </StepTransition>
  );
}
