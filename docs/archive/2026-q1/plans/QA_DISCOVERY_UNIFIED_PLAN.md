# QA Tools + Discovery Improvement — Unified Plan

**Date**: 2026-03-13
**Status**: In Progress
**Scope**: MCP QA tool improvements + app discovery UX + dogfood verification

---

## Problem Statement

Three interconnected gaps exist:
1. **MCP QA tools** have strong eval/verification coverage (34 tools) but lack accessibility audit, visual regression baselines, and verdict state machine tests
2. **App discovery** has excellent infrastructure (14 search strategies, 239+ tools) but user-facing discoverability is hardcoded and non-contextual
3. **Dogfood verification** rules define comprehensive protocols but several scripts are missing and proof pack logic has no test coverage

These reinforce each other: new QA tools get dogfooded on the app, discovery improvements make QA tools findable, dogfood verification proves both work end-to-end.

---

## Deliverables

### Stream A: MCP QA Tool Improvements

| # | Deliverable | File | Impact |
|---|------------|------|--------|
| A1 | Proof pack verdict state machine tests | `src/test/taskSessionProofPack.test.ts` | P0 — validates 6 verdict transitions |
| A2 | Accessibility audit quality gate preset | `packages/mcp-local/src/tools/qualityGateTools.ts` | P0 — `a11y` preset with 8 WCAG rules |
| A3 | Visual regression baseline gate preset | `packages/mcp-local/src/tools/qualityGateTools.ts` | P1 — `visual_regression` preset |
| A4 | QA workflow chains | `packages/mcp-local/src/tools/progressiveDiscoveryTools.ts` | P1 — `comprehensive_qa` chain |

### Stream B: App Discovery Improvements

| # | Deliverable | File | Impact |
|---|------------|------|--------|
| B1 | Dynamic suggestion chips | `src/features/controlPlane/views/ControlPlaneLanding.tsx` | P0 — time/role-aware suggestions |
| B2 | Contextual tool suggestion hook | `src/hooks/useContextualToolSuggestions.ts` | P1 — view-aware tool cards |
| B3 | Discovery explain mode | Future — search strategy breakdown | P2 |

### Stream C: Dogfood Verification

| # | Deliverable | Evidence |
|---|------------|---------|
| C1 | Verdict tests dogfood the proof pack logic | Tests validate verdict derivation end-to-end |
| C2 | New gate presets dogfooded against the app | Run a11y + visual_regression gates against ControlPlaneLanding |
| C3 | Discovery improvements verified with dynamic chips | Screenshots of dynamic vs static chips |

---

## Execution Order

1. **A1** — Proof pack tests (unblocks confidence in verdict logic)
2. **A2** — A11y gate preset (unblocks QA coverage)
3. **B1** — Dynamic suggestions (unblocks discovery UX)
4. **A3** — Visual regression preset
5. **B2** — Contextual tool hook
6. **A4 + Wire** — Workflow chains + integration
7. **Verify** — typecheck + vitest + dogfood

---

## Success Criteria

- [ ] `buildTaskSessionProofPack` has 100% verdict path coverage in tests
- [ ] `a11y` gate preset exists with 8+ WCAG-derived rules
- [ ] `visual_regression` gate preset exists with baseline comparison rules
- [ ] ControlPlaneLanding shows time-of-day and role-aware suggestion chips
- [ ] New tools appear in `discover_tools` search results for "qa", "accessibility", "visual regression"
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` passes
