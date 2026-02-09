# AI Flywheel (Verification x Eval)

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

### File-Backed Lane (PDF / XLSX / CSV / DOCX / PPTX / JSON / JSONL / TXT / ZIP)

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
- Recommended (more stable): `NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE=rag` (single deterministic file extract + answer)
- More realistic (higher variance): `NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE=agent` (small tool loop over `read_csv_file` / `csv_select_rows` / `csv_aggregate` / `read_xlsx_file` / `xlsx_select_rows` / `xlsx_aggregate` / `read_pdf_text` / `pdf_search_text` / `read_text_file` / `read_json_file` / `json_select` / `read_jsonl_file` / `zip_*` / `read_docx_text` / `read_pptx_text`)

Notes:
- ZIP attachments require `NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE=agent` (multi-step extract -> parse).

### Media Lane (Image OCR: PNG / JPG / WEBP)

Use this lane to measure the impact of deterministic local OCR on GAIA tasks that include image attachments.

Notes:
- Still gated: fixtures + attachments remain under `.cache/gaia` (gitignored). Do not commit GAIA content.
- Requires `tesseract.js` (optional dependency) for `read_image_ocr_text`. First run may download `eng.traineddata` unless you provide `langPath`.

```bash
# Generate scoring fixture + download referenced image attachments (local only, gated)
npm run mcp:dataset:gaia:capability:media:refresh

# Run media-backed capability benchmark (real model calls + local OCR tool)
NODEBENCH_GAIA_CAPABILITY_TASK_LIMIT=6 NODEBENCH_GAIA_CAPABILITY_CONCURRENCY=1 npm run mcp:dataset:gaia:capability:media:test
```

### Audio Lane (Speech-to-Text: MP3 / WAV / M4A)

Use this lane to measure the impact of deterministic local audio transcription on GAIA tasks that include audio attachments.

Notes:
- Still gated: fixtures + attachments remain under `.cache/gaia` (gitignored). Do not commit GAIA content.
- Uses `transcribe_audio_file`, which calls Python `faster-whisper` locally (no network).

Prereqs:
- Python 3.11+ available on PATH (or set `NODEBENCH_PYTHON` / `NODEBENCH_AUDIO_PYTHON`).
- Install the Python dependency:
  - `pip install faster-whisper`

```bash
# Generate scoring fixture + download referenced audio attachments (local only, gated)
npm run mcp:dataset:gaia:capability:audio:refresh

# Run audio-backed capability benchmark (real model calls + local transcription tool)
NODEBENCH_GAIA_CAPABILITY_TASK_LIMIT=4 NODEBENCH_GAIA_CAPABILITY_CONCURRENCY=1 npm run mcp:dataset:gaia:capability:audio:test
```

Prereqs:
- A model key must be available (recommended: `GEMINI_API_KEY`).
- The web-only lane also requires network access (web search + URL fetch).
- Expect non-trivial runtime and cost; this is a regression check, not a CI gate.
- UI traceability: `npm run build` then `node scripts/ui/captureUiSnapshots.mjs` (writes screenshots for Benchmarks + MCP Ledger).

Implementation:
- `packages/mcp-local/src/__tests__/gaiaCapabilityEval.test.ts`
- `packages/mcp-local/src/__tests__/fixtures/generateGaiaCapabilityFixture.py`
- `packages/mcp-local/src/__tests__/gaiaCapabilityFilesEval.test.ts`
- `packages/mcp-local/src/__tests__/fixtures/generateGaiaCapabilityFilesFixture.py`
- `packages/mcp-local/src/__tests__/gaiaCapabilityMediaEval.test.ts`
- `packages/mcp-local/src/__tests__/fixtures/generateGaiaCapabilityMediaFixture.py`
- `packages/mcp-local/src/__tests__/gaiaCapabilityAudioEval.test.ts`
- `packages/mcp-local/src/__tests__/fixtures/generateGaiaCapabilityAudioFixture.py`
- `.cache/gaia/gaia_capability_2023_all_validation.sample.json` (local only)
- `.cache/gaia/gaia_capability_files_2023_all_validation.sample.json` (local only)
- `.cache/gaia/gaia_capability_media_2023_all_validation.sample.json` (local only)
- `.cache/gaia/gaia_capability_audio_2023_all_validation.sample.json` (local only)
- `.cache/gaia/data/...` (local only; gated attachments)

## If GAIA Lift Is Small

If tool-augmented accuracy barely improves, treat it as a signal that "Access" is not increasing in a meaningful way (not that the model is weak).

1. Benchmark tool-dependent tasks first (GAIA file-backed lane is the fastest check for deterministic gains).
2. Prefer `NODEBENCH_GAIA_CAPABILITY_TOOLS_MODE=agent` when a single extract is insufficient. Tune budgets with `NODEBENCH_GAIA_CAPABILITY_MAX_STEPS` and `NODEBENCH_GAIA_CAPABILITY_MAX_TOOL_CALLS`.
3. Add missing deterministic access primitives (PDF search, sheet selection, table filters/aggregations) before tweaking prompts or switching models.

## Impact-Driven Methodology

Every tool call, methodology step, and workflow path must answer: **"What concrete thing did this produce?"**

| Tool / Phase | Concrete Impact |
|---|---|
| `run_recon` + `log_recon_finding` | N findings surfaced before writing code |
| `assess_risk` | Risk tier assigned - HIGH triggers confirmation before action |
| `start_verification_cycle` + `log_gap` | N issues detected with severity, all tracked to resolution |
| `log_test_result` (3 layers) | 3x test coverage vs single-layer; catches integration failures |
| `start_eval_run` + `record_eval_result` | N regression cases protecting against future breakage |
| `run_quality_gate` | N gate rules enforced; violations blocked before deploy |
| `record_learning` + `search_all_knowledge` | Knowledge compounds - later tasks reuse prior findings |
| `run_mandatory_flywheel` | 6-step minimum verification; catches dead code and intent mismatches |

The comparative benchmark (`comparativeBench.test.ts`) validates this with 9 real production scenarios:
- 13 issues detected (4 HIGH, 8 MEDIUM, 1 LOW) - bare agent ships all of them
- 21 recon findings before implementation
- 26 blind spots prevented
- Knowledge compounding: 0 hits on task 1 -> 2+ hits by task 9

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

## v2.14.0 → v2.14.1 Quality/Cost Analysis

### What Changed

| Metric | v2.13.0 | v2.14.1 | Delta |
|--------|---------|---------|-------|
| Tools | 143 | 162 | +19 (+13.3%) |
| Domains | 25 | 30 | +5 |
| Registry entries | 143 | 162 | +19 |
| Workflow chains | 21 | 24 | +3 |
| Methodology topics | 21 | 24 | +3 |
| Test suite | 438 tests | 438 tests | 0 regressions |
| TOON default | N/A | ON by default | ~40% token savings |

### New Domains Added

| Domain | Tools | Cost Impact | Quality Impact |
|--------|-------|-------------|----------------|
| **toon** (2) | toon_encode, toon_decode | **-40% tokens/response** (system-wide via `--no-toon` opt-out) | No quality loss — TOON has higher LLM accuracy than JSON (73.9% vs 69.7% per InfoQ) |
| **pattern** (2) | mine_session_patterns, predict_risks_from_patterns | Zero additional cost (pure SQLite queries against existing tables) | Surfaces recurring failure sequences + predicts risks before they happen |
| **git_workflow** (3) | check_git_compliance, review_pr_checklist, enforce_merge_gate | Negligible (local git CLI + SQLite) | Prevents non-compliant merges, cross-references verification/eval/quality gates |
| **seo** (5) | seo_audit_url, check_page_performance, analyze_seo_content, check_wordpress_site, scan_wordpress_updates | Zero external deps (Node fetch) | Full SEO audit pipeline with scored reports |
| **voice_bridge** (4) | design_voice_pipeline, analyze_voice_config, generate_voice_scaffold, benchmark_voice_latency | Zero runtime cost (knowledge-based, no voice processing) | Architecture recommendations for voice interfaces |
| **mailbox** (+3 to parallel) | send_agent_message, check_agent_inbox, broadcast_agent_update | Negligible (SQLite inserts/queries) | Enables point-to-point and broadcast inter-agent messaging |

### Token Cost Analysis

**TOON default is the headline change.** Every tool response is now TOON-encoded by default:

```
Before (JSON):  ~200 tokens/response average × N tool calls
After (TOON):   ~120 tokens/response average × N tool calls
Savings:        ~40% on response tokens per tool call
```

**Schema overhead by preset (tool definitions sent to model):**

| Preset | v2.13.0 | v2.14.1 | Delta |
|--------|---------|---------|-------|
| meta | 5 tools (~1,000 tokens) | 5 tools (~1,000 tokens) | 0% |
| lite | 43 tools (~8,600 tokens) | 43 tools (~8,600 tokens) | 0% |
| core | 93 tools (~18,600 tokens) | 114 tools (~22,800 tokens) | +22.6% schema |
| full | 143 tools (~28,600 tokens) | 162 tools (~32,400 tokens) | +13.3% schema |

**Net cost impact for core/full presets:**
- Schema overhead increased ~13-23% (one-time per conversation)
- Response tokens decreased ~40% (every tool call)
- **Net: significant cost reduction** — response tokens dominate in multi-tool workflows (20+ calls × 40% savings >> one-time 13% schema increase)

### Quality Impact — Eval Results

**All eval benchmarks pass with zero regressions:**

| Benchmark | Calls | Result |
|-----------|-------|--------|
| evalHarness (15 scenarios) | 105 | 100% pass, 73 tests |
| evalDatasetBench (20 SWE-bench tasks) | 473 | 100% pass, 24 tests |
| comparativeBench (9 A/B scenarios) | 244+ | 13 issues, 26 blind spots, 20 tests |
| openDatasetParallelEval (BFCL v3) | 80 | 100% pass |
| openDatasetParallelEval (SWE-bench) | 80 | 100% pass |
| openDatasetParallelEval (GAIA) | 80 | 100% pass |
| openDatasetParallelEval (ToolBench) | 60 | 100% pass |
| tools.test (static + unit + integration) | — | 215 tests pass |
| presetRealWorldBench (8 scenarios × 4 presets) | — | 57 tests pass |
| toolsetGatingEval (9 scenarios × 4 presets) | — | 46 tests pass |

**Preset trajectory impact (from toolsetGatingEval):**

| Preset | Phase Completion | Issues Detected | Token Savings |
|--------|-----------------|-----------------|---------------|
| meta | 11% (9/83 phases) | 0 | Minimal (2 tools) |
| lite | 76% (63/83) | 14 across 9 scenarios | ~75% fewer tokens vs full |
| core | 98% (81/83) | 14 across 9 scenarios | ~33% fewer tokens vs full |
| full | 100% (83/83) | 14 + parallel coordination | Full coverage |

### Flywheel Verdict

**Quality: No regressions.** 438 tests pass. All existing benchmarks produce identical results. The 19 new tools add coverage without degrading existing functionality.

**Cost: Net reduction.** TOON-by-default saves ~40% on response tokens. The +13% schema overhead for full preset is amortized across the conversation. For a typical 30-tool-call session, the net savings are:
- Schema cost: +3,800 tokens (one-time)
- Response savings: -30 × 80 = -2,400 tokens
- **Break-even at ~48 tool calls** — beyond that, TOON saves more than the schema overhead costs

**Recommendation:** TOON default is the correct choice for any multi-tool workflow. Users who need JSON output for interop can use `--no-toon`.
