import type { ReactNode, Ref } from "react";

interface QuestionPromptProps {
  id?: string;
  title: string;
  children?: ReactNode;
  /** Makes the heading focusable from script (not by Tab), for steps with no field to focus. */
  headingRef?: Ref<HTMLHeadingElement>;
}

export function QuestionPrompt({ id, title, children, headingRef }: QuestionPromptProps) {
  return (
    <header className="space-y-4">
      <h1
        id={id}
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="font-display text-4xl leading-tight font-medium text-balance outline-none sm:text-5xl"
      >
        {title}
      </h1>
      {children ? <p className="text-lg text-muted text-pretty">{children}</p> : null}
    </header>
  );
}
