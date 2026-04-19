# `.claude/` — Claude Code conventions

This directory tells Claude Code (and any agent that respects the convention)
how this repo wants to be worked on. It is **auto-loaded** by Claude Code at
session start. Treat it as a contract.

## Layout

```
.claude/
├── README.md              ← you are here
├── rules/                 ← 31 modular rules with two-hop cross-references
├── skills/                ← reusable how-to procedures
├── agents/                ← subagent configs
├── commands/              ← custom slash commands
├── hooks.json             ← pre/post tool-use hooks
├── launch.json            ← dev server configurations
├── plans/                 ← in-flight implementation plans
└── settings.local.json    ← machine-local settings (gitignored)
```

## Rules (`rules/`)

The 31 rules are **modular and cross-linked**. Each rule focuses on one
concern and declares `related_` neighbors in frontmatter. Follow the
cross-references for depth — one hop gives you neighbors, two hops gives you
the whole concern.

### Core rules (read these first)

| Rule | Concern |
|---|---|
| [`agentic_reliability.md`](rules/agentic_reliability.md) | 8-point checklist: BOUND · HONEST_STATUS · HONEST_SCORES · TIMEOUT · SSRF · BOUND_READ · ERROR_BOUNDARY · DETERMINISTIC |
| [`analyst_diagnostic.md`](rules/analyst_diagnostic.md) | Trace root cause before any fix; don't bandaid |
| [`scenario_testing.md`](rules/scenario_testing.md) | Every test = persona + goal + scale + duration + failure mode |
| [`completion_traceability.md`](rules/completion_traceability.md) | Every task-complete quotes the original ask |
| [`self_direction.md`](rules/self_direction.md) | Decide, act, verify visually. Don't wait for permission |

### Process rules

| Rule | Concern |
|---|---|
| [`reexamine_process.md`](rules/reexamine_process.md) | Orchestrator for when & how to re-examine — hops into a11y, resilience, polish, keyboard, perf |
| [`pre_release_review.md`](rules/pre_release_review.md) | 13-layer review stack before any deploy |
| [`qa_dogfood.md`](rules/qa_dogfood.md) | Post-change visual + behavioral verification |
| [`dogfood_verification.md`](rules/dogfood_verification.md) | Jony Ive design critique layered onto dogfood |
| [`flywheel_continuous.md`](rules/flywheel_continuous.md) | Continuous poll → diagnose → fix → dogfood loop |

### Specialized rules

| Rule | Concern |
|---|---|
| [`grounded_eval.md`](rules/grounded_eval.md) | 4-layer anti-hallucination pipeline |
| [`eval_flywheel.md`](rules/eval_flywheel.md) | Self-judging search quality loop (Karpathy-style) |
| [`self_building_loop.md`](rules/self_building_loop.md) | Self-diagnosing infrastructure gaps |
| [`interview_before_execute.md`](rules/interview_before_execute.md) | 3-5 rapid questions before non-trivial work |
| [`deep_read_audit.md`](rules/deep_read_audit.md) | Full end-to-end reads, never section-level |
| [`usability_scorecard.md`](rules/usability_scorecard.md) | 10-dimension scoring for time-to-value, friction, shareability |

### Agent pipeline rules (Phase 1 additions, 2026-04-19)

| Rule | Concern |
|---|---|
| [`orchestrator_workers.md`](rules/orchestrator_workers.md) | One orchestrator + N sub-agents with fresh context + shared scratchpad |
| [`scratchpad_first.md`](rules/scratchpad_first.md) | Markdown scratchpad → revise → structure (never one-shot structured output) |
| [`layered_memory.md`](rules/layered_memory.md) | 5-layer file-based memory · JIT retrieval · compaction boundary |
| [`async_reliability.md`](rules/async_reliability.md) | Live vs background mode · retries · DLQ · partial-success UX |
| [`feedback_security.md`](rules/feedback_security.md) | 8-threat model · server-composed body · preview-before-send |
| [`reference_attribution.md`](rules/reference_attribution.md) | Every borrowed pattern cites prior art in code header + doc |

### Re-examine family (visual + a11y polish)

| Rule | Concern |
|---|---|
| [`reexamine_a11y.md`](rules/reexamine_a11y.md) | ARIA · reduced motion · color-blind · screen readers |
| [`reexamine_keyboard.md`](rules/reexamine_keyboard.md) | Skip links, shortcuts, tab order, focus traps |
| [`reexamine_polish.md`](rules/reexamine_polish.md) | Skeleton loading, micro-interactions, print stylesheet |
| [`reexamine_performance.md`](rules/reexamine_performance.md) | Progressive disclosure, smart refresh, lazy loading |
| [`reexamine_resilience.md`](rules/reexamine_resilience.md) | Retry/backoff, partial failures, graceful degradation |
| [`reexamine_design_reduction.md`](rules/reexamine_design_reduction.md) | Jony Ive: earned complexity, kill jargon |
| [`product_design_dogfood.md`](rules/product_design_dogfood.md) | Jony Ive design review + dogfood evidence in-app |

### Narrative & post-shipping

| Rule | Concern |
|---|---|
| [`forecasting_os.md`](rules/forecasting_os.md) | Forecasting architecture, Brier scoring, LinkedIn Δ badges |
| [`autoresearch_loop.md`](rules/autoresearch_loop.md) | DeepTrace research cell optimization loop |
| [`telemetry_trajectory.md`](rules/telemetry_trajectory.md) | Telemetry + agent trajectory visualization |

### Misc & operational

| Rule | Concern |
|---|---|
| [`agent_run_verdict_workflow.md`](rules/agent_run_verdict_workflow.md) | Agent verdict surfacing contract |
| [`owner_mode_end_to_end.md`](rules/owner_mode_end_to_end.md) | Multi-layer task ownership |
| [`gemini_qa_loop.md`](rules/gemini_qa_loop.md) | Gemini 3 vision QA automated scoring |
| [`swarm_orchestration.md`](rules/swarm_orchestration.md) | TeammateTool + multi-agent coordination |

## Skills (`skills/`)

Skills are **reusable how-to procedures**. Each skill is a `SKILL.md` with
frontmatter that tells Claude Code when to auto-load it.

Current skills:

| Skill | Use when |
|---|---|
| `agent-run-verdict-workflow/` | You're touching agent run state or verdict surfacing |
| `flywheel-ui-dogfood/` | You're running the visual QA flywheel |
| `owner-mode-end-to-end/` | You're doing multi-layer (backend + UI + test) work |

Add new skills per the template in existing `SKILL.md` files — frontmatter
with `when:` and `use:` triggers.

## Agents (`agents/`)

Subagent configurations for delegated work. Each agent has a `name.md`
with a role description and tool allowlist.

## Commands (`commands/`)

Custom slash commands. Invoke via `/<command-name>` in Claude Code.

## Hooks (`hooks.json`)

Pre/post hooks for tool use. Used to enforce constraints (e.g., verification
workflow after Edit).

## Launch configs (`launch.json`)

Dev server configurations for Claude Code's preview tooling (Vite, Convex,
MCP server, etc.).

## Plans (`plans/`)

Active implementation plans. Drafts and in-flight specs live here; completed
plans move to `docs/archive/` with full provenance.

## How rules are evaluated

1. Claude Code reads `.claude/rules/*.md` at session start
2. Rules are matched to the current task via frontmatter metadata
3. Each rule's `related_` list lets Claude hop two degrees to find neighbors
4. Conflicts resolve by specificity (a rule targeting the exact file beats a broad rule)

## Authoring a new rule

Template:

```markdown
# <Name>

<One-sentence mandate.>

## When to trigger
- <condition 1>
- <condition 2>

## Protocol
1. <step>
2. <step>

## Anti-patterns
- <what not to do>

## Related
- [related_rule_1](related_rule_1.md)
- [related_rule_2](related_rule_2.md)
```

Keep rules short, focused, and connected. Long rules signal missing
sub-rules — split instead.

## See also

- [`docs/README.md`](../docs/README.md) — docs tree overview
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — contribution bar
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — top-level architecture pointer
