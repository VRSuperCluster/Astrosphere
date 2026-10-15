/**
 * Live summary calls for working on the voice. Spends API credit.
 *
 *   npm run try:summary -- fixtures/chart-a.json [more fixtures...]
 *
 * Each fixture is birth data plus context answers; the chart is cast here, so
 * fixtures never go stale when the chart JSON changes. Pass many files to run a batch.
 */
import { AiOutputError, callClaude } from "@/lib/ai/call";
import { buildSummaryPrompt, PROMPT_VERSION, SUMMARY_MAX_TOKENS, summarySchemaFor } from "@/lib/ai/outputs/summary";
import { loadFixture } from "./fixture";

async function run(path: string): Promise<boolean> {
  const { label, chart, context } = await loadFixture(path);

  const started = performance.now();
  try {
    const { data, attempts, problems, usage } = await callClaude({
      ...buildSummaryPrompt(chart, context),
      schema: summarySchemaFor(chart),
      maxTokens: SUMMARY_MAX_TOKENS,
    });
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    const moon = chart.birthTimeKnown ? "" : `, Moon sign ${chart.moonSignCertain ? "certain" : "uncertain"}`;

    console.log(`\n=== ${label} (${path})`);
    console.log(`${chart.birthTimeKnown ? "timed" : "no birth time"}${moon} · ${attempts} attempt(s) · ${seconds}s · ${usage.inputTokens} input / ${usage.outputTokens} output tokens (${usage.thinkingTokens} thinking)\n`);
    for (const problem of problems) console.log(`Repaired:\n${problem}\n`);
    console.log(data.read);
    for (const [i, card] of data.patterns.entries()) {
      console.log(`\n${i + 1}. [${card.pointIds.join(", ")}]`);
      console.log(`   ${card.pattern}`);
      console.log(`   What to do: ${card.rule}`);
    }
    return true;
  } catch (error) {
    console.error(`\n=== ${label} (${path}) FAILED: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof AiOutputError) for (const problem of error.problems) console.error(`\n${problem}`);
    return false;
  }
}

async function main() {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    console.error("Usage: npm run try:summary -- fixtures/chart-a.json [more fixtures...]");
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set (expected in .env.local).");
    process.exit(1);
  }

  console.log(`Prompt ${PROMPT_VERSION} · model ${process.env.ANTHROPIC_MODEL || "default"}`);
  let failed = 0;
  for (const path of paths) {
    if (!(await run(path))) failed++;
  }
  console.log(`\n${paths.length - failed}/${paths.length} succeeded`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
