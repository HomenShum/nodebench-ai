# AI Flywheel (Verification × Eval)

This repo uses an **inner loop** (6-phase verification) and an **outer loop** (eval-driven development). They are not alternatives; they compound:

- Inner loop produces artifacts (tests, checklists, edge cases) that expand the eval suite.
- Outer loop regressions trigger a new verification cycle.

## Mandatory After Any Non-Trivial Change

Minimum required steps:
1. Static analysis: `tsc --noEmit` and `convex dev --once --typecheck=enable`
2. Happy-path test: run the changed functionality with valid inputs
3. Failure-path test: validate expected error handling + edge cases
4. Gap analysis: dead code, unused vars, missing integrations, intent mismatch
5. Fix and re-verify: rerun steps 1-3 from scratch after any fix
6. Deploy and document: ship + write down what changed and why

Additional required when changing **tool-facing behavior** (capability regression guard):
- Run GAIA capability eval (accuracy: LLM-only vs LLM+tools): `npm run mcp:dataset:gaia:capability:test`
- Pass condition: tool-augmented accuracy must be **>=** baseline accuracy on the sampled tasks.

## Capability Benchmark (GAIA)

GAIA is a gated dataset. Fixtures (including ground-truth answers) are generated into `.cache/gaia` (gitignored). Do not commit GAIA content.

Commands:
```bash
# Local-only scoring fixture (writes ground truth into .cache/gaia)
npm run mcp:dataset:gaia:capability:refresh

# Run accuracy comparison (web-only lane: real model calls + web search)
NODEBENCH_GAIA_CAPABILITY_TASK_LIMIT=6 NODEBENCH_GAIA_CAPABILITY_CONCURRENCY=1 npm run mcp:dataset:gaia:capability:test
```

### File-Backed Lane (PDF / XLSX / CSV)

Use this lane to measure the real impact of deterministic local file parsing tools on GAIA tasks that include attachments.

Notes:
- Still gated: fixtures + attachments remain under `.cache/gaia` (gitignored). Do not commit GAIA content.
- Attachments are copied into `.cache/gaia/data/<file_path>` for offline deterministic runs after first download.

```bash
# Generate scoring fixture + download referenced attachments (local only, gated)
npm run mcp:dataset:gaia:capability:files:refresh

# Run file-backed capability benchmark (real model calls + local parsing tools)
NODEBENCH_GAIA_CAPABILITY_TASK_LIMIT=6 NODEBENCH_GAIA_CAPABILITY_CONCURRENCY=1 npm run mcp:dataset:gaia:capability:files:test
```

Modes:
- Recommended (more stable): `NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE=rag` (deterministic `web_search` + `fetch_url` + answer)
- More realistic (higher variance): `NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE=agent` (tool loop; optional `NODEBENCH_GAIA_CAPABILITY_FORCE_WEB_SEARCH=1`)

Prereqs:
- A web-search-capable model key must be available (recommended: `GEMINI_API_KEY`).
- Expect non-trivial runtime and cost; this is a regression check, not a CI gate.

Implementation:
- `packages/mcp-local/src/__tests__/gaiaCapabilityEval.test.ts`
- `packages/mcp-local/src/__tests__/fixtures/generateGaiaCapabilityFixture.py`
- `packages/mcp-local/src/__tests__/gaiaCapabilityFilesEval.test.ts`
- `packages/mcp-local/src/__tests__/fixtures/generateGaiaCapabilityFilesFixture.py`
- `.cache/gaia/gaia_capability_2023_all_validation.sample.json` (local only)

## Impact-Driven Methodology

Every tool call, methodology step, and workflow path must answer: **"What concrete thing did this produce?"**

| Tool / Phase | Concrete Impact |
|---|---|
| `run_recon` + `log_recon_finding` | N findings surfaced before writing code |
| `assess_risk` | Risk tier assigned — HIGH triggers confirmation before action |
| `start_verification_cycle` + `log_gap` | N issues detected with severity, all tracked to resolution |
| `log_test_result` (3 layers) | 3x test coverage vs single-layer; catches integration failures |
| `start_eval_run` + `record_eval_result` | N regression cases protecting against future breakage |
| `run_quality_gate` | N gate rules enforced; violations blocked before deploy |
| `record_learning` + `search_all_knowledge` | Knowledge compounds — later tasks reuse prior findings |
| `run_mandatory_flywheel` | 6-step minimum verification; catches dead code and intent mismatches |

The comparative benchmark (`comparativeBench.test.ts`) validates this with 9 real production scenarios:
- 13 issues detected (4 HIGH, 8 MEDIUM, 1 LOW) — bare agent ships all of them
- 21 recon findings before implementation
- 26 blind spots prevented
- Knowledge compounding: 0 hits on task 1 → 2+ hits by task 9

## Parallel Agent Coordination (Claude Code + NodeBench MCP)

Based on Anthropic's "Building a C Compiler with Parallel Claudes" (Feb 2026).

**When to use:** Only when running 2+ agent sessions (Claude Code subagents, worktrees, or separate terminals). Single-agent workflows should use standard verification/eval tools.

**Claude Code native path:**
1. Main session (COORDINATOR) breaks work into independent tasks
2. Each `Task` tool call spawns a SUBAGENT with its own context
3. Subagents call `claim_agent_task` to lock work and `release_agent_task` when done
4. Coordinator calls `get_parallel_status` to monitor all subagent progress
5. Final `run_quality_gate` validates the aggregate result

**Impact of parallel coordination:**
- Task locks prevent duplicate work (Scenario 9: "both agents fixed the same dedup bug")
- Context budget tracking prevents mid-fix context exhaustion
- Progress notes enable handoff without starting from scratch
- Oracle comparisons validate outputs against known-good references

Use `getMethodology("parallel_agent_teams")` for the full workflow.
Use the `claude-code-parallel` MCP prompt for step-by-step Claude Code guidance.
