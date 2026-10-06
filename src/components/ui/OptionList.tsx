import type { ChoiceOption } from "@/types/questionnaire";

interface OptionListProps<T extends string> {
  options: readonly ChoiceOption<T>[];
  selected?: T;
  onSelect: (value: T) => void;
  "aria-labelledby"?: string;
}

/** Single-select list. Choosing an option calls `onSelect` right away; there is no confirm step. */
export function OptionList<T extends string>({
  options,
  selected,
  onSelect,
  "aria-labelledby": labelledBy,
}: OptionListProps<T>) {
  return (
    <ul role="list" aria-labelledby={labelledBy} className="border-t border-hairline">
      {options.map((option) => (
        <li key={option.value}>
          <button
            type="button"
            aria-pressed={option.value === selected}
            onClick={() => onSelect(option.value)}
            className="flex w-full cursor-pointer items-center justify-between gap-4 border-b border-hairline py-4 text-left text-xl text-ink transition-colors duration-300 hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent aria-pressed:border-ink"
          >
            {option.label}
            {option.value === selected ? (
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-ink" />
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
