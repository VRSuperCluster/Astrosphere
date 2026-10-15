import { Button } from "@/components/ui/Button";
import { StepTransition } from "@/components/ui/StepTransition";
import { downloadIcs } from "@/lib/calendar/download";
import { buildIcs, icsFilename, type IcsBirth } from "@/lib/calendar/ics";
import type { Calendar } from "@/types/calendar";
import type { CachedResult } from "./useCachedResult";

/**
 * The download area. The file is built in the browser from the calendar already
 * fetched; nothing is stored on the way to the download.
 * The wheel and the summary above are not this component's to change.
 */
export function CalendarDownload({
  result,
  onRetry,
  birth,
  firstName,
}: {
  result: CachedResult<Calendar>;
  onRetry: () => void;
  birth: IcsBirth | null;
  firstName?: string;
}) {
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
        <div className="space-y-4">
          <p className="text-lg text-pretty">Your year is written.</p>
          {birth ? (
            <Button
              onClick={() => downloadIcs(icsFilename(result.data, firstName), buildIcs(result.data, birth))}
            >
              Download your year
            </Button>
          ) : null}
        </div>
      )}
    </StepTransition>
  );
}
