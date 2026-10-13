import type { Message, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiOutputError, callClaude, type MessagesClient } from "./call";

const schema = z.strictObject({
  patterns: z.array(z.string()).length(3, { error: "There must be exactly 3 patterns." }),
});

const VALID = JSON.stringify({ patterns: ["a", "b", "c"] });

/** A client that answers with each canned reply in turn and records what it was sent. */
function fakeClient(...replies: { text: string; stop?: Message["stop_reason"] }[]) {
  const sent: MessageCreateParamsNonStreaming[] = [];
  const client: MessagesClient = {
    messages: {
      async create(params) {
        sent.push(structuredClone(params));
        const reply = replies[sent.length - 1];
        if (!reply) throw new Error("no more canned replies");
        return message(reply.text, reply.stop ?? "end_turn");
      },
    },
  };
  return { client, sent };
}

function message(text: string, stop: Message["stop_reason"]): Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "test",
    content: [{ type: "text", text, citations: null }],
    stop_reason: stop,
    stop_sequence: null,
    usage: { input_tokens: 50, output_tokens: 10, output_tokens_details: { thinking_tokens: 4 } },
  } as unknown as Message;
}

const call = (client: MessagesClient) =>
  callClaude({ system: "system", user: "user", schema, maxTokens: 100, client });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("callClaude", () => {
  it("returns valid JSON from the first answer", async () => {
    const { client, sent } = fakeClient({ text: VALID });
    await expect(call(client)).resolves.toEqual({
      data: { patterns: ["a", "b", "c"] },
      attempts: 1,
      problems: [],
      usage: { inputTokens: 50, outputTokens: 10, thinkingTokens: 4 },
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ system: "system", max_tokens: 100 });
    expect(sent[0]).not.toHaveProperty("temperature");
  });

  it("reads the model from ANTHROPIC_MODEL", async () => {
    vi.stubEnv("ANTHROPIC_MODEL", "claude-test-model");
    const { client, sent } = fakeClient({ text: VALID });
    await call(client);
    expect(sent[0].model).toBe("claude-test-model");
  });

  it("finds the object inside code fences and prose", async () => {
    const { client } = fakeClient({ text: `Here you go:\n\`\`\`json\n${VALID}\n\`\`\`` });
    await expect(call(client)).resolves.toMatchObject({ attempts: 1 });
  });

  it("repairs malformed JSON by sending the parse error back", async () => {
    const { client, sent } = fakeClient({ text: '{"patterns": ["a", "b",' }, { text: VALID });
    await expect(call(client)).resolves.toMatchObject({ attempts: 2 });

    const repair = sent[1].messages;
    expect(repair).toHaveLength(3);
    expect(repair[1]).toEqual({ role: "assistant", content: '{"patterns": ["a", "b",' });
    expect(repair[2].role).toBe("user");
    expect(repair[2].content).toContain("isn't valid JSON");
  });

  it("repairs a wrong card count by naming the problem", async () => {
    const { client, sent } = fakeClient({ text: JSON.stringify({ patterns: ["a", "b"] }) }, { text: VALID });
    const result = await call(client);
    expect(result).toMatchObject({ attempts: 2, usage: { inputTokens: 100, outputTokens: 20, thinkingTokens: 8 } });
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain("There must be exactly 3 patterns.");
    expect(sent[1].messages[2].content).toContain("There must be exactly 3 patterns.");
    expect(sent[1].messages[2].content).toContain("patterns");
  });

  it("treats a cut-off answer as a failure even if it happens to parse", async () => {
    const { client, sent } = fakeClient({ text: VALID, stop: "max_tokens" }, { text: VALID });
    await expect(call(client)).resolves.toMatchObject({ attempts: 2 });
    expect(sent[1].messages[2].content).toContain("cut off");
  });

  it("never sends an empty assistant turn", async () => {
    const { client, sent } = fakeClient({ text: "" }, { text: VALID });
    await call(client);
    expect(sent[1].messages[1]).toEqual({ role: "assistant", content: "(no output)" });
  });

  it("gives up after one repair", async () => {
    const { client, sent } = fakeClient({ text: "nope" }, { text: JSON.stringify({ patterns: [] }) });
    const error = await call(client).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiOutputError);
    expect((error as AiOutputError).problems).toHaveLength(2);
    expect(sent).toHaveLength(2);
  });
});
