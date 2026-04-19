# NodeBench Agent Rules

## Root-cause first (Analyst Diagnostic)
- Reproduce the failure mode before touching code.
- Trace symptom -> intermediate state -> root cause (5 whys).
- Fix the cause so the symptom is impossible (no band-aids).
- Verify adjacent behavior (avoid sideways regressions).
- Document learnings.

## Agent-run verdict workflow
- For agent-run, task-session, proof-pack, citation, or execution-trace changes, follow:
  1. contract + data model wiring
  2. backend issue context enrichment
  3. frontend live workflow panels
  4. verdict exactness UI surfacing
  5. tests + verification
- Prefer deriving verdict state from existing session and trace metadata before adding new persistence.
- Surface verdict, evidence, citations, open issues, and next actions in the app UI, not only in logs.
- Treat `completed` as distinct from `verified`.

## Owner mode end-to-end
- Direct yourself as if you are the accountable product owner, technical lead, and reliability lead.
- Finish the full loop: contract, data model, backend, UI/operator surface, exact status or verdict, verification, and workflow documentation.
- Do not stop after one layer if the user outcome still cannot be achieved end to end.
- Prefer canonical substrates and derived views over parallel systems and duplicate storage.
- If the workflow changed, update docs, rules, skills, or eval contracts so the next agent does not have to rediscover it.

## Flywheel Mode (UI dogfood)
- Poll every 60 seconds for issues and regressions.
- After 3 consecutive failures on the same issue, change strategy.
- Never declare done without dogfood artifacts visible in `/dogfood`.

## Motion Safety (Seizure / Flash Policy)
- Avoid high-contrast flashes and large-area pulses/fades.
- Prefer stable backgrounds and subtle/non-animated loading states.
- Always honor `prefers-reduced-motion`.

## References
- `AGENTS.md`
- `skills/flywheel-ui-dogfood/SKILL.md`
- `skills/agent-run-verdict-workflow/SKILL.md`
- `skills/owner-mode-end-to-end/SKILL.md`
- `docs/agents/AGENT_RUN_VERDICT_WORKFLOW.md`
- `docs/agents/OWNER_MODE_END_TO_END.md`
- `.claude/rules/flywheel_continuous.md`
- `.claude/rules/owner_mode_end_to_end.md`
- `.cursor/rules/flywheel_continuous.mdc`
- `.cursor/rules/owner_mode_end_to_end.mdc`
- `.windsurf/rules/flywheel_continuous.md`
- `.windsurf/rules/owner_mode_end_to_end.md`
