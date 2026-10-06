import type { ReactNode } from "react";

interface QuestionPromptProps {
  id?: string;
  title: string;
  children?: ReactNode;
}

export function QuestionPrompt({ id, title, children }: QuestionPromptProps) {
  return (
    <header className="space-y-4">
      <h1
        id={id}
        className="font-display text-4xl leading-tight font-medium text-balance sm:text-5xl"
      >
        {title}
      </h1>
      {children ? <p className="text-lg text-muted text-pretty">{children}</p> : null}
    </header>
  );
}
