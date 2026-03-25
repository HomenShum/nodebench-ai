# Phase 2: Mobile UX + Flywheel Visual Proof

## Context
Phase 1 shipped the quality spine (live telemetry hooks, judge heatmap, cost waterfall, failure clusters, 8 MCP tools, 103 eval queries). But users interact through mobile surfaces, and the mobile scorecard is 5.3/10. The telemetry proves the system works. The mobile UX proves the product works.

## Revised Priority (mobile-first, visual proof)

### Wave 1: P0 Accessibility + Core Mobile Data Object (fastest visible impact)

1. **44px touch targets** — CSS media query, all interactive elements min 44px on mobile. Score: 3→7.
   - Files: `src/index.css` or new `src/styles/mobile.css`
   - Impact: Every button, link, card action becomes thumb-friendly

2. **Claim/Change visual cards** — Transform text lists into structured cards with type badge (NEW/CHANGED/CONTRADICTION), evidence icons, confidence bar. This is the #1 mobile UX gap per the principles doc.
   - Files: New `src/features/founder/components/ClaimCard.tsx`
   - Wire into: `FounderDashboardView.tsx` (WhatChangedPanel)
   - Impact: Core data object goes from invisible prose to scannable mobile cards

3. **Contradiction accent treatment** — Add terracotta `#d97757` left border + [Investigate] action to contradiction cards. Make them visually distinct attention magnets.
   - Files: `FounderDashboardView.tsx` (contradiction section)
   - Impact: Contradictions pop instead of blending in

### Wave 2: Structural Mobile Changes

4. **Bottom-sheet agent panel** — Replace full-screen overlay with 3-state bottom sheet (collapsed 25%, half 60%, full 100%) with drag handle. CSS `snap-type` v1.
   - Files: New `src/features/agents/components/BottomSheet.tsx`, modify `FastAgentPanel.tsx`, `CockpitLayout.tsx`
   - Impact: Agent panel no longer blocks all content. Score: 6→8.

5. **Inline actionable agent response cards** — Every agent response gets [Save Memo] [Share] [Go Deeper] buttons. Not just chat bubbles.
   - Files: `FastAgentPanel.tsx` message rendering
   - Impact: Zero-navigation actions on agent output

6. **Typography scaling** — `clamp()` based fluid type for mobile readability
   - Files: `src/index.css`
   - Impact: Score 4→7 on typography

### Wave 3: Navigation + Return Hook

7. **Mobile daily brief landing** — On `@media (max-width: 768px)`, `/` routes to `/founder` (daily brief) not Ask surface
   - Files: Router config or CockpitLayout mobile detection
   - Impact: 5-second wow on mobile open

8. **IMPORTANT/MONITOR/STALE categorization** — Triage daily brief changes by severity
   - Files: `FounderDashboardView.tsx` WhatChangedPanel
   - Impact: Daily brief isn't flat — attention-weighted

### Wave 4: Remaining from Phase 1

9. **Tool registry entries** for 8 new tools in `toolRegistry.ts`
10. **Run eval harness** to seed real data into EvalScorecard
11. **SearchTrace provenance enhancement** (confidence bands, validation checklist)

## Success Metrics
- Mobile overall score: 5.3 → 7.5+
- Touch targets: 3 → 7
- Agent/Chat UX: 6 → 8
- Data density: 5 → 7
- Zero console errors on all surfaces
- Visual proof: screenshots at 375px showing each improvement
