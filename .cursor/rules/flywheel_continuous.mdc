---
alwaysApply: true
related_: [process, analyst_diagnostic, dogfood_verification, product_design_dogfood, completion_traceability]
---

# Flywheel Continuous Improvement

When in flywheel mode, operate as a continuous improvement loop.

## Protocol
1. **Launch** - Start dev server, capture baseline state, publish a trajectory link in-app within 60 seconds.
2. **Poll** - Every 60 seconds, check logs, console, and visual state.
3. **Diagnose** - At each checkpoint, immediately seek issues. Do a 5-whys root-cause chain before any fix.
4. **Fix** - Apply a minimal targeted fix that makes the failure mode impossible, not just hidden.
5. **Dogfood** - Verify the fix end-to-end in the UI and capture evidence (screenshots + walkthrough video).
6. **Iterate** - Return to step 2. Never ask "should I continue?" - just keep going until verified.
7. **Adapt** - After 3 consecutive failures on the same issue, change strategy (instrumentation, isolation, or rollback).
8. **Document** - Log every iteration: symptom, root cause, fix, verification result, and what to watch next.

## Motion Safety (Seizure / Flash Policy)
- Avoid high-contrast flashes and large-area pulses/fades.
- Prefer stable backgrounds and subtle loading states; default to non-animated skeletons for full-viewport surfaces.
- Always honor `prefers-reduced-motion` and ship a UI toggle when motion is used.

## Anti-patterns
- Band-aids: swallowing errors, `as any`, masking with `?.`, retry loops without idempotency.
- Declaring done without dogfood artifacts and deterministic verification.

## Standards
- Target: industry-standard UI performance + product design polish.
- Every route loads without jank, no layout shift, and fast interaction response.
- All interactive elements have focus rings, aria labels, and keyboard support.
