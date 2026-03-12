import { execFileSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const content = `Most AI agents can search the web.

But they can't decide.

This signals a gap in the agentic stack: the optimization layer.

You spawn 7 parallel research agents. Each returns raw data. The coordinator has to merge, normalize, weight, rank, and explain. That's not a prompt problem - it's a systems problem.

What I shipped (NodeBench MCP v2.31.0):

merge_research_results - Joins N sub-agent outputs by key, resolves conflicts (4 modes)
multi_criteria_score - Deterministic min-max normalization + weighted scoring. Direction-aware
compare_options - Ranked comparison tables with decision explanations

E2E test: Disneyland hotel optimization with Chase Sapphire points.
4 hotels x 4 strategies x 4 weighted criteria.
Deterministic ranking in under 50ms. Zero LLM calls for scoring.

The real story here: AI agents need mathematical tools, not just language tools. Scoring and ranking should be deterministic - save LLM tokens for research.

242 tests passing. 247 tools. 37 workflow chains.

What decisions are you letting your agents make without deterministic scoring?

#AgenticAI #MCP #DecisionAnalysis #BuildInPublic`;

const dryRun = process.argv.includes("--dry-run");
const args = JSON.stringify({ content, target: "organization", dryRun });

// Validation
console.log(`Post length: ${content.length} chars`);
console.log(`Real newlines in content: ${(content.match(/\n/g) || []).length}`);
console.log(`Dry run: ${dryRun}`);

// Write args to temp file, then have convex read it via a wrapper
const tmpFile = join(tmpdir(), `linkedin-post-${Date.now()}.json`);
writeFileSync(tmpFile, args, "utf8");

// Verify file contents
const written = readFileSync(tmpFile, "utf8");
const parsed = JSON.parse(written);
const realNewlines = (parsed.content.match(/\n/g) || []).length;
console.log(`File written. Content newlines after parse: ${realNewlines}`);
if (realNewlines < 10) {
  console.error("ERROR: Newlines lost during file write! Aborting.");
  unlinkSync(tmpFile);
  process.exit(1);
}
console.log("Newline validation: PASSED");
console.log("---");

// Use npx.cmd on Windows via execFileSync with shell: true
const result = execFileSync("npx", [
  "convex", "run",
  "workflows/linkedinTrigger:postTechnicalReport",
  args
], {
  encoding: "utf8",
  timeout: 30000,
  shell: true,  // Required on Windows to resolve npx.cmd
});
console.log(result);

unlinkSync(tmpFile);
