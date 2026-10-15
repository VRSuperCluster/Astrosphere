import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageCreateParamsNonStreaming,
  MessageParam,
} from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";

/** The part of the Anthropic client the helper uses, so tests can pass a fake. */
export interface MessagesClient {
  messages: { create(params: MessageCreateParamsNonStreaming): Promise<Message> };
}

export interface ClaudeCall<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  client?: MessagesClient;
  /**
   * What a `max_tokens` stop does. `"repair"` (the default) sends the partial
   * answer back. `"fresh"` drops it and repeats the original request once.
   */
  cutOff?: "repair" | "fresh";
}

export interface ClaudeResult<T> {
  data: T;
  /** 1, or 2 when the first answer needed a repair. */
  attempts: number;
  /** Why each rejected answer was rejected, as sent back to the model. */
  problems: string[];
  /** Summed over attempts. Thinking counts towards `maxTokens` and is billed as output. */
  usage: { inputTokens: number; outputTokens: number; thinkingTokens: number };
}

/**
 * The model's answer failed validation twice. `problems` holds the validation
 * messages, which can quote a rejected value, so don't log them in production.
 */
export class AiOutputError extends Error {
  constructor(readonly problems: string[]) {
    super("The model's output failed validation after a repair attempt");
    this.name = "AiOutputError";
  }
}

const DEFAULT_MODEL = "claude-sonnet-5-5";
const ATTEMPTS = 2;

let defaultClient: MessagesClient | undefined;

/** The SDK retries a failed request (429, 5xx, dropped connection) once on its own. */
function anthropic(): MessagesClient {
  defaultClient ??= new Anthropic({ maxRetries: 1 });
  return defaultClient;
}

/**
 * Asks for JSON and validates it with `schema`. If the answer doesn't parse or
 * validate, the problem goes back to the model as one repair turn.
 * With `cutOff: "fresh"`, a max_tokens stop is not repaired: the partial answer
 * is dropped and the original request is sent once more.
 */
export async function callClaude<T>({
  system,
  user,
  schema,
  maxTokens,
  client = anthropic(),
  cutOff = "repair",
}: ClaudeCall<T>): Promise<ClaudeResult<T>> {
  const messages: MessageParam[] = [{ role: "user", content: user }];
  const problems: string[] = [];
  const usage = { inputTokens: 0, outputTokens: 0, thinkingTokens: 0 };

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    // No `temperature`: current models reject it. No thinking override: thinking stays on.
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    });
    usage.inputTokens += response.usage.input_tokens;
    usage.outputTokens += response.usage.output_tokens;
    usage.thinkingTokens += response.usage.output_tokens_details?.thinking_tokens ?? 0;

    // The caller asked not to repair a fragment. The next attempt is the original request again.
    if (response.stop_reason === "max_tokens" && cutOff === "fresh") {
      problems.push("It was cut off before the JSON ended.");
      if (attempt === ATTEMPTS) break;
      continue;
    }

    const raw = textOf(response);
    const result = parseOutput(raw, schema, response.stop_reason === "max_tokens");
    if (result.ok) return { data: result.data, attempts: attempt, problems, usage };

    problems.push(result.problem);
    messages.push(
      // The API rejects an empty assistant turn.
      { role: "assistant", content: raw.trim() || "(no output)" },
      {
        role: "user",
        content: `That answer can't be used:\n${result.problem}\n\nReturn the full corrected JSON object only, with no other text.`,
      },
    );
  }

  throw new AiOutputError(problems);
}

type Parsed<T> = { ok: true; data: T } | { ok: false; problem: string };

function parseOutput<T>(raw: string, schema: z.ZodType<T>, truncated: boolean): Parsed<T> {
  if (truncated) {
    return { ok: false, problem: "It was cut off before the JSON ended. Keep every field within its length." };
  }

  let value: unknown;
  try {
    value = JSON.parse(extractJson(raw));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown parse error";
    return { ok: false, problem: `It isn't valid JSON (${detail}).` };
  }

  const result = schema.safeParse(value);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, problem: z.prettifyError(result.error) };
}

/** Drops code fences and any prose around the outermost object. */
function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start === -1 || end < start ? raw : raw.slice(start, end + 1);
}

function textOf(message: Message): string {
  return message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
}
