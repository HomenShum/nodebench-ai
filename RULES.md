# NodeBench Agent Rules

## Root-cause first (Analyst Diagnostic)
- Reproduce the failure mode before touching code.
- Trace symptom -> intermediate state -> root cause (5 whys).
- Fix the cause so the symptom is impossible (no band-aids).
- Verify adjacent behavior (avoid sideways regressions).
- Document learnings.

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
- `.claude/rules/flywheel_continuous.md`
- `.cursor/rules/flywheel_continuous.mdc`
- `.windsurf/rules/flywheel_continuous.md`

