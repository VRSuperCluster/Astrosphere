import { Button } from "@/components/ui/Button";
import { StepTransition } from "@/components/ui/StepTransition";
import type { Calendar } from "@/types/calendar";
import type { CachedResult } from "./useCachedResult";

/**
 * The download area. The file itself comes later; this is the wait and the retry.
 * The wheel and the summary above are not this component's to change.
 */
export function CalendarDownload({ result, onRetry }: { result: CachedResult<Calendar>; onRetry: () => void }) {
  return (
    <StepTransition key={result.status}>
      {result.status === "loading" ? (
        <p role="status" className="text-lg text-muted">
          Still writing your year…
        </p>
      ) : result.status === "failed" ? (
        <div className="space-y-4">
          <p role="alert" className="text-lg text-pretty">
            We couldn&apos;t write your year just now. That&apos;s on us, not you.
          </p>
          <Button variant="quiet" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : (
        <p className="text-lg text-pretty">Your year is written.</p>
      )}
    </StepTransition>
  );
}
