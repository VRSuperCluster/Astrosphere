import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "quiet";

interface ButtonProps extends Omit<ComponentProps<"button">, "className"> {
  variant?: ButtonVariant;
}

const base =
  "cursor-pointer text-lg transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

const variants: Record<ButtonVariant, string> = {
  primary: "border border-ink bg-ink px-8 py-3 text-paper hover:bg-transparent hover:text-ink",
  quiet: "py-3 text-muted underline-offset-4 hover:text-ink hover:underline",
};

export function Button({ variant = "primary", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`${base} ${variants[variant]}`} {...props} />;
}
