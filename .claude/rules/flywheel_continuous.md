---
alwaysApply: true
related_: [process, analyst_diagnostic, dogfood_verification, product_design_dogfood, completion_traceability]
---

# Flywheel Continuous Improvement

When in flywheel mode, operate as a continuous improvement loop:

## Protocol
1. **Launch** — Start dev server, capture baseline state
2. **Poll** — Every 60 seconds, check logs, console, visual state
3. **Diagnose** — At each checkpoint, immediately seek issues. Deep-dive 5-whys multi-layer root cause before any fix
4. **Fix** — Apply minimal targeted fix, verify build passes
5. **Dogfood** — Visually verify the fix in-app, capture evidence
6. **Iterate** — Return to step 2. Never ask "should I continue?" — just keep going
7. **Adapt** — After 3 consecutive failures on the same issue, change strategy entirely
8. **Document** — Log every iteration: what was found, root cause, fix applied, verification result

## Anti-patterns
- Never ask for permission to continue iterating
- Never skip root cause analysis to slap on a bandaid
- Never leave a fix unverified
- Never ignore console warnings or visual regressions

## Standards
- Target: latest industry-standard UI performance and Jony Ive product design
- Every route must load without jank, render without layout shift, and respond to interaction within 100ms
- Skeleton → content transitions must be smooth, no flash of unstyled content
- All interactive elements must have focus rings, aria-labels, and keyboard support
