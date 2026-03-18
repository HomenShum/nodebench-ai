# Handoff

## Context
- Workspace: `d:\VSCode Projects\cafecorner_nodebench\nodebench_ai4\nodebench-ai`
- User goal: wire live data/agent pipelines while keeping audit mocks; pass 10-persona deep dive; verify live data in Research Hub drawers/deep-dive.
- Constraints: approval_policy=never, sandbox_mode=danger-full-access, network_access=enabled.
- Skill system: No `AGENTS.md` found in repo. Serena MCP server appears in `c:\Users\hshum\.codex\config.toml` but no tool is available in this session.

## Current State
- Research Hub and EntityContextDrawer open, but console logs show `Maximum update depth exceeded` after opening the entity drawer. The error persists even after closing the drawer. This is the blocker to proceed with UI verification.
- EntityContextDrawer now merges live data with audit mocks and filters low-signal summaries, but the key facts and sources are still too noisy for Open-AutoGLM (e.g., generic "only closely related mention" and irrelevant "Open"/"OpenAI" sources). Needs tuning.
- Audit mocks must remain; live data should match the mock schema.

## Code Changes (already applied)
- `src/features/research/components/EntityContextDrawer.tsx`
  - Added low-signal summary/fact filters, mock matching with normalized entity keys, and source relevance ranking.
  - Added `fetchInsightsRef` and `requestKey` to avoid repeated action ref changes.
  - Uses fallback mock when live data is low quality.
- `src/features/research/components/Sparkline.tsx`
  - `SparkBars` supports optional `labels`, `onBarHover`, `onBarLeave` with `<title>` tooltips.
- `src/features/research/components/SignalTimeseriesPanel.tsx`
  - Added hover/active day state, event ledger list, and mapping of events to chart bars.
- `src/features/research/components/RepoSignalPanel.tsx`
  - Added `SignalMomentumMini` to show momentum.
- `convex/domains/research/repoStats.ts`
  - Added fallback record in catch to avoid empty results when GitHub API fails.
- `convex/domains/research/stackImpact.ts`
  - CVE extraction now searches reader content context.

## Known Issues / Debugging Leads
- **React infinite update loop**: "Maximum update depth exceeded" appears after opening EntityContextDrawer.
  - Suspects: a `useEffect` with unstable deps, or a state update triggered by render in a Research Hub child.
  - Places to check:
    - `src/features/research/components/EntityContextDrawer.tsx` (effects on `requestKey`, `isOpen` resets)
    - `src/features/research/components/FeedReaderModal.tsx` (uses `useReaderContent`)
    - `src/features/research/hooks/useReaderContent.ts` (not yet reviewed; last read was interrupted)
    - `src/features/research/views/ResearchHub.tsx` (act observer + Convex focus update)
- **Entity drawer relevance**: Filter out low-signal facts and generic source matches ("Open", "OpenAI") when entity is Open-AutoGLM.

## Environment & Data
- Convex env keys (LINKUP and LLM providers) are present in deployment, do not expose values in logs.
- Convex deploy was run with `npx convex dev --once --typecheck=disable` and succeeded.

## Validation
- Manual UI: Open Research Hub, click entity (e.g., Open-AutoGLM). Drawer opens and displays mock summary, but infinite update depth error appears. Needs fix before further persona verification.

## Next Steps
1. Fix the "Maximum update depth exceeded" loop:
   - Inspect `useReaderContent.ts` and any effect that sets state based on changing dependencies.
   - If needed, add guards or `useRef` to prevent re-entrant state updates.
2. Tighten EntityContextDrawer filters:
   - Expand `LOW_SIGNAL_FACT_PATTERNS` and drop generic sources by entity token matching with higher threshold.
3. Re-test Research Hub:
   - Click audit entities and confirm live data fills drawer and deep-dive panels.
   - Verify no infinite update loop and no console errors.
4. Complete the 10-persona deep dive and document any remaining failures.

## Commands Run
- `rg --files -g "AGENTS.md" d:\VSCode Projects\cafecorner_nodebench\nodebench_ai4\nodebench-ai`
- `npx convex dev --once --typecheck=disable`

## Notes
- The task requires live data wiring but audit mocks must remain as fallback. Ensure live schema matches `audit_mocks.ts` structure.
