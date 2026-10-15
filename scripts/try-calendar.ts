/**
 * Live calendar calls, for checking duration and token use. Spends API credit.
 *
 *   npm run try:calendar -- fixtures/chart-a.json [more fixtures...]
 *
 * Prints how long the call took, its input and output tokens, and how many
 * entries came back, so a run can be set against the 300s route limit.
 */
import { AiOutputError } from "@/lib/ai/call";
import { backdropLine, changeLine } from "@/lib/calendar/backdrop";
import { PROMPT_VERSION, generateCalendar } from "@/lib/ai/outputs/calendar";
import { loadFixture } from "./fixture";

async function run(path: string): Promise<boolean> {
  const { label, chart, context } = await loadFixture(path);
  const started = performance.now();
  try {
    const { calendar, attempts, problems, usage } = await generateCalendar({ chart, context });
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    const moon = chart.birthTimeKnown ? "" : `, Moon sign ${chart.moonSignCertain ? "certain" : "uncertain"}`;

    console.log(`\n=== ${label} (${path})`);
    console.log(
      `${chart.birthTimeKnown ? "timed" : "no birth time"}${moon} · ${attempts} attempt(s) · ${seconds}s · ${usage.inputTokens} input / ${usage.outputTokens} output tokens (${usage.thinkingTokens} thinking) · ${calendar.entries.length} entries\n`,
    );
    for (const problem of problems) console.log(`Rejected:\n${problem}\n`);
    for (const entry of calendar.entries) {
      console.log(`${entry.date}  ${entry.title}`);
      console.log(`   ${entry.description}\n`);
    }
    const seen = new Set<string>();
    for (const month of calendar.months) {
      for (const placement of month.placements) {
        if (seen.has(placement.id)) continue;
        seen.add(placement.id);
        console.log(`placement ${placement.id}  ${placement.start} → ${placement.end}`);
        console.log(`   ${placement.text}\n`);
      }
    }
    for (const month of calendar.months) {
      console.log(`${month.month}  ${month.title}`);
      console.log(`   ${month.description}`);
      for (const placement of month.placements) console.log(`   · ${backdropLine(placement, calendar.generatedOn)}`);
      for (const change of month.changes) console.log(`   · ${changeLine(change)}`);
      console.log("");
    }
    return true;
  } catch (error) {
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    console.error(
      `\n=== ${label} (${path}) FAILED after ${seconds}s: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (error instanceof AiOutputError) for (const problem of error.problems) console.error(`\n${problem}`);
    return false;
  }
}

async function main() {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    console.error("Usage: npm run try:calendar -- fixtures/chart-a.json [more fixtures...]");
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
