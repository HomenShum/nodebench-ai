# AI Flywheel

## Purpose
The flywheel exists to stop shallow implementation loops. It forces the system to verify, dogfood, and learn from changes until the result is stable enough to trust.

## Core loop
1. Gather context and restate the target.
2. Implement the smallest viable change.
3. Run the verification floor.
4. Dogfood the changed surface.
5. Inspect failures and trace upstream to the cause.
6. Fix the cause, not the symptom.
7. Re-run verification and dogfood.
8. Completion traceability: cite the original request, summarize what changed, attach evidence, and record any residual risk before declaring the work done.

## Completion traceability
When the loop is complete, the final audit should cite the original request, link the changed artifacts, and explain whether the implementation stayed aligned with the intended result.
