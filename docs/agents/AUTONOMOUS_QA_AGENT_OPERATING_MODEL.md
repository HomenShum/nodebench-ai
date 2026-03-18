# Autonomous QA Agent Operating Model

## Purpose

This document converts the media-only material in [Agent_setup/README.md](/d/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/agents/Agent_setup/README.md) into a maintainable operating spec and maps it onto the existing NodeBench harness.

The goal is not to build a second agent platform. The goal is to make NodeBench operate with the same discipline:

- better implementation style
- better utilization style
- better organization style

## Source Constraint

The original source pack under `docs/agents/Agent_setup/` is image and video only. The comparison below is based on direct inventory plus OCR-assisted extraction from those files.

## What The Source Pack Is Actually Doing

The documented agent is not just "an agent with tools". It is a tightly-scoped execution system with five visible layers:

1. Role pack
- strong role priming
- task-specific persona and responsibility boundaries
- clear difference between product bug, infra blocker, and unrelated anomaly

2. Skill pack
- on-demand skills loaded for resilience, anomaly detection, and verdict shaping
- focused skills, not one giant universal prompt

3. Eval pack
- reusable verdict schemas
- evidence-strength grading
- pre-verdict validation gates
- bounded retry rules

4. Workflow contract
- verify setup before trigger
- retry the trigger, not the whole workflow
- preserve the primary mission
- classify `BLOCKED_INFRA` explicitly

5. Evidence contract
- screenshots, logs, and context edits are first-class
- anomalies are documented separately
- verdicts are expected to be defensible, not just plausible

## Extracted Operating Rules

The source pack repeatedly reinforces these rules:

- Verify preconditions before reproduction.
- Keep trigger and verification as separate steps.
- Do not retry the same ambiguous action indefinitely.
- Stop early when the environment is the blocker.
- Do not let a newly found anomaly overwrite the primary bug verdict.
- Capture evidence before continuing once an anomaly is detected.
- Treat verdict quality as a gated outcome, not an unstructured narrative.

## Comparison To Current NodeBench

### What NodeBench Already Has

NodeBench already has the core substrate needed to support this style:

- mission harness for planner, worker, judge, retry, merge, and human review
- execution trace for step, decision, evidence, and verification logging
- quality gates for deterministic boolean checks
- workflow chains for reusable operating sequences
- learnings and verification cycles for persistence and recovery

### What Was Missing

Before this revamp, the repo had the primitives but not the operating contract. The main gaps were:

- workflow chains were broad and generic rather than evidence-first
- the QA-style pre-verdict gate was not encoded as a reusable preset
- the media-only setup folder had no canonical text translation
- the distinction between primary verdict and anomaly logging was implied, not made explicit in a standard chain

## Implementation Mapping

### New Quality Gate Preset

Added `agent_bug_verdict` in [qualityGateTools.ts](/d/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/packages/mcp-local/src/tools/qualityGateTools.ts).

It encodes eight boolean checks:

- `preconditions_verified`
- `trigger_verify_split`
- `evidence_attached`
- `primary_mission_preserved`
- `anomalies_logged_separately`
- `retry_budget_respected`
- `blocked_infra_classified`
- `verdict_is_defensible`

This is the reusable pre-verdict discipline that was visible in the source pack.

### New Workflow Chain

Added `autonomous_qa_bug` in [toolRegistry.ts](/d/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/packages/mcp-local/src/tools/toolRegistry.ts) and exposed it through [progressiveDiscoveryTools.ts](/d/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/packages/mcp-local/src/tools/progressiveDiscoveryTools.ts).

This chain maps the external operating model onto NodeBench's existing stack:

1. `search_all_knowledge`
2. `start_execution_run`
3. `plan_decompose_mission`
4. `record_execution_step`
5. `record_execution_verification`
6. `record_execution_step`
7. `attach_execution_evidence`
8. `get_gate_preset`
9. `run_quality_gate`
10. `judge_verify_subtask`
11. `judge_request_retry`
12. `log_gap`
13. `sniff_record_human_review`
14. `complete_execution_run`
15. `save_session_note`
16. `record_learning`

## Better Organization Style

The source pack suggests a better organizational pattern for future agent work in this repo:

### 1. Role-first, not tool-first

Start with the job contract:

- what counts as success
- what counts as blocked
- what evidence is required
- what retries are allowed

Then map tools to the contract.

### 2. Skill-first, not mega-prompt-first

Reusable, narrow operating patterns should live as:

- workflow chains
- quality gate presets
- concise docs
- eval cases

Not as screenshots, one-off prompts, or tribal memory.

### 3. Evidence-first, not narration-first

Every non-trivial agent flow should make it obvious:

- what triggered the result
- how it was verified
- what evidence was attached
- whether the environment blocked completion

### 4. Primary-task preservation

New anomalies are valuable, but they are not permission to abandon the original mission. In NodeBench this now maps to:

- primary verdict in mission harness
- anomaly recording via `log_gap`
- persistent summary via `save_session_note`

## Recommended Utilization Style

When the task is bug verification, UI QA, or any evidence-sensitive workflow, prefer this sequence:

- use `autonomous_qa_bug` instead of the generic `fix_bug` chain
- load `agent_bug_verdict` before the final verdict
- use execution trace for auditable setup and verification steps
- use mission harness for bounded retries and explicit ownership
- use `log_gap` for side anomalies instead of overloading the main verdict

Use the simpler `fix_bug` chain when the work is ordinary engineering debugging. Use `autonomous_qa_bug` when the work needs defensible verdicting.

## Practical Result

Yes, NodeBench can work like the documented agent setup now, with one important clarification:

- not by cloning that external system
- by translating its operating discipline into the existing NodeBench harness

That produces a better fit for this repo because the implementation stays unified:

- one trace system
- one mission harness
- one quality gate system
- one workflow discovery surface

## Files Changed In This Revamp

- [Agent_setup/README.md](/d/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/agents/Agent_setup/README.md)
- [qualityGateTools.ts](/d/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/packages/mcp-local/src/tools/qualityGateTools.ts)
- [toolRegistry.ts](/d/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/packages/mcp-local/src/tools/toolRegistry.ts)
- [progressiveDiscoveryTools.ts](/d/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/packages/mcp-local/src/tools/progressiveDiscoveryTools.ts)

## Next Step

The next worthwhile upgrade would be eval coverage for the new chain:

- ensure `autonomous_qa_bug` is discoverable and stable
- assert `agent_bug_verdict` returns the expected rules
- assert the chain preserves traceability with `save_session_note`

That turns the new operating model from documentation plus structure into a fully guarded contract.
