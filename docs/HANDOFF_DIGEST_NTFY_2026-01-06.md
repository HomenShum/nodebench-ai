# Handoff: DailyBrief Digest + NTFY Export (2026-01-06)

## Goal
- Save **only** the DailyBrief NTFY payloads (`title`/`body`) to JSON for offline inspection, then use that JSON to iterate on digest quality.

## What’s Working Now
- Public Convex endpoint to export DailyBrief NTFY payloads:
  - `convex/domains/agents/digestAgent.ts`: `exportDailyBriefNtfyPayloads` (public `action`, secret-gated via `MCP_SECRET`)
  - Reads from `digestCache` via `ctx.runQuery(internal...getDigestsForDate)` and returns only:
    - `persona`, `model`, `title`, `body`, `sentToNtfy`, `createdAt`, `usage {inputTokens, outputTokens}`
- Local export script that writes JSON artifacts:
  - `scripts/export-dailybrief-ntfy-results.ts`
  - Writes:
    - `docs/architecture/benchmarks/dailybrief-ntfy-latest.json`
    - `docs/architecture/benchmarks/<out>.json` (optional)
- Digest structured-output mode reliability improved:
  - `convex/domains/agents/digestAgent.ts` now uses a **strict “JSON-only” prompt** for `generateObject(...)` and falls back to text-mode if schema validation fails.
- Workflow runner accepts prompt-size knobs (helps keep runs fast):
  - `convex/workflows/dailyMorningBrief.ts` `runAgentPoweredDigest` now supports:
    - `maxFeedItems` (limits feed items passed into digest agent)
    - `maxDigestChars` (passes to digest agent `maxLength`)

## Files Changed / Added
- `convex/domains/agents/digestAgent.ts`
  - Added `exportDailyBriefNtfyPayloads` action.
  - Tightened structured-output prompt + added fallback to text when schema mismatch occurs.
- `scripts/export-dailybrief-ntfy-results.ts`
  - Uses `ConvexHttpClient.action(...)` to call `exportDailyBriefNtfyPayloads`.
- `convex/workflows/dailyMorningBrief.ts`
  - Added `maxFeedItems` + `maxDigestChars` params to `runAgentPoweredDigest`.

## How to Run
1) Ensure Convex is synced (types + functions):
   - `npx convex dev --once`

2) Generate digests (writes rows into `digestCache` and includes `ntfyPayload`):
   - Example (don’t send NTFY, keep it smaller/faster):
     - `npx convex run workflows/dailyMorningBrief:runAgentPoweredDigest --args '{\"sendNtfy\":false,\"useTools\":false,\"persona\":\"GENERAL\",\"maxFeedItems\":18,\"maxDigestChars\":2800}'`
     - Repeat for other personas as needed (e.g. `JPM_STARTUP_BANKER`, `EARLY_STAGE_VC`, `CTO_TECH_LEAD`, etc.)

3) Export “dailyBrief NTFY results only”:
   - `npx tsx scripts/export-dailybrief-ntfy-results.ts --date 2026-01-06 --sentOnly false --out dailybrief-ntfy-2026-01-06-all`
   - Output:
     - `docs/architecture/benchmarks/dailybrief-ntfy-latest.json`
     - `docs/architecture/benchmarks/dailybrief-ntfy-2026-01-06-all.json`

## Current Artifacts Produced (this session)
- `docs/architecture/benchmarks/dailybrief-ntfy-latest.json`
- `docs/architecture/benchmarks/dailybrief-ntfy-2026-01-06.json`
- `docs/architecture/benchmarks/dailybrief-ntfy-2026-01-06-all.json`

Note: these were initially empty because `digestCache` had no rows for the requested date until `runAgentPoweredDigest` was executed.

## Known Gaps / Issues
- **Multi-persona generation not fully executed in this session**
  - One-off runs were created (e.g. `GENERAL`, `JPM_STARTUP_BANKER`), but running “all personas” back-to-back can take long enough that some orchestration calls may time out depending on the runner.
  - Recommendation: run via `npx convex run ...` locally per persona (or write a small loop script) and then export once.
- **NTFY body truncation can cut off `ACT III`**
  - In at least one payload, the body ended with `**ACT III:...` indicating the formatter hit the max length before action items rendered.
  - Recommendation: budget lengths per section (Act I/II/III + Entity Spotlight) so that **Act III always survives**, even if it means dropping entity spotlight first.
- **Structured output only enforced in non-tool mode**
  - When `useTools=true`, the digest is generated via coordinator-agent text output and parsed; that path can still drift in format.
  - Recommendation: add a second pass “extract-to-schema” after tool-mode completion, or use structured generation with tools behind the scenes.

## Next Steps (Suggested)
1) Add a small analyzer script for `dailybrief-ntfy-*.json`:
   - Metrics: body length distribution, missing `ACT I/II/III`, empty action items, presence of `Now:` reflections, truncation indicators.
2) Update `formatDigestForNtfy(...)` to guarantee:
   - `ACT III` always included (even if it must drop entity spotlight / shorten act II).
3) Run and export all personas for the same date:
   - Generate digests for the 10 audit-trail personas, then export once to a single JSON pack for review.

