import { useId, type ComponentProps } from "react";

interface TextFieldProps extends Omit<ComponentProps<"input">, "className"> {
  label: string;
  invalid?: boolean;
  className?: string;
}

export function TextField({ label, invalid, id, className, ...inputProps }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm tracking-wide text-muted">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={invalid || undefined}
        className="mt-2 w-full rounded-none border-b-2 border-hairline bg-transparent pb-2 text-3xl text-ink tabular-nums outline-none transition-colors duration-300 placeholder:text-muted/40 focus:border-ink aria-invalid:border-accent"
        {...inputProps}
      />
    </div>
  );
}
