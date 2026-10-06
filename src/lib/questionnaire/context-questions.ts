import type { ChangeStance, ChoiceOption, LifeArea } from "@/types/questionnaire";

export const LIFE_AREA_OPTIONS: readonly ChoiceOption<LifeArea>[] = [
  { value: "relationships", label: "Relationships" },
  { value: "career", label: "Career" },
  { value: "identity", label: "Identity" },
  { value: "health", label: "Health" },
  { value: "creativity", label: "Creativity" },
];

export const CHANGE_STANCE_OPTIONS: readonly ChoiceOption<ChangeStance>[] = [
  { value: "seeksIt", label: "I seek it out" },
  { value: "resistsIt", label: "I resist it" },
  { value: "itDepends", label: "It depends" },
  { value: "inTheMiddle", label: "I'm in the middle of one" },
];

export function labelFor<T extends string>(
  options: readonly ChoiceOption<T>[],
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
