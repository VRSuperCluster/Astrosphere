import type { ReactNode } from "react";

/** Give each step a distinct `key` so the entrance animation replays on every change. */
export function StepTransition({ children }: { children: ReactNode }) {
  return <div className="motion-safe:animate-step-in">{children}</div>;
}
