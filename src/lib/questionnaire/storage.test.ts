import { describe, expect, it } from "vitest";
import { parseAnswers } from "./storage";

describe("parseAnswers", () => {
  it("reads saved answers", () => {
    const answers = { firstName: "Ada", birthTime: { known: false } };
    expect(parseAnswers(JSON.stringify(answers))).toEqual(answers);
  });

  it.each([["not JSON", "{firstName"], ["null", "null"], ["an array", "[]"], ["a string", '"Ada"']])(
    "ignores %s",
    (_, json) => {
      expect(parseAnswers(json)).toBeNull();
    },
  );
});
