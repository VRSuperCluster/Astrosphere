import { useCallback, useEffect, useState } from "react";
import type { z } from "zod";
import { readCached, writeCached } from "@/lib/ai/session-cache";

export type CachedResult<T> = { status: "loading" } | { status: "failed" } | { status: "ready"; data: T };

export interface CachedQuery<T> {
  cacheKey: string;
  /** Checks both what comes back from the route and what's read back from storage. */
  schema: z.ZodType<T>;
  request: (signal: AbortSignal) => Promise<unknown>;
}

/**
 * One AI result for the chart page: from this tab's cache if it's there,
 * otherwise from its route. Only a validated success is cached, never a failure.
 * Each use is independent, so several can run side by side.
 *
 * `query` should be memoised: a new object starts a new request. `null` waits.
 */
export function useCachedResult<T>(query: CachedQuery<T> | null) {
  const [result, setResult] = useState<CachedResult<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (query === null) return;
    const { cacheKey, schema, request } = query;
    const controller = new AbortController();

    (async () => {
      const cached = readCached(cacheKey, schema);
      if (cached !== null) {
        setResult({ status: "ready", data: cached });
        return;
      }
      try {
        const checked = schema.safeParse(await request(controller.signal));
        if (!checked.success) throw new Error("Response failed validation");
        writeCached(cacheKey, checked.data);
        setResult({ status: "ready", data: checked.data });
      } catch {
        if (!controller.signal.aborted) setResult({ status: "failed" });
      }
    })();

    return () => controller.abort();
  }, [query, attempt]);

  const retry = useCallback(() => {
    setResult({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { result, retry };
}
