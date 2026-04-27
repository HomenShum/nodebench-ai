---
name: dep-convex-agent
description: Migration runbook for @convex-dev/agent. Currently pinned to 0.2.10 because v0.6 requires a coordinated AI SDK v5 → v6 bump across many files. Use when bumping the agent or when CI shows the "args was removed in v0.6.0" error pattern.
trigger: when @convex-dev/agent appears in package.json diff, when typecheck fails with "'args' was removed in @convex-dev/agent v0.6.0" or "'handler' was removed", when user asks to bump the convex agent
---

# `@convex-dev/agent` migration runbook

## Last verified

- Working pin: `0.2.10` (held since 2026-04-26)
- Last attempted upgrade: `0.6.1` (reverted same day in PR #150 — produced 422 typecheck errors)

## Why we're pinned

`@convex-dev/agent` 0.6 is a coordinated v0.5 → v0.6 release that piggybacks on the AI SDK v5 → v6 major. It renames two property names on every tool definition (`args` → `inputSchema`, `handler` → `execute`) and changes the `execute` function signature from `(ctx, args)` to `(ctx, input, options)`. We have ~12 files in `convex/domains/agents/` that need the rewrite, plus coupled bumps to the entire AI SDK provider family.

When the `convex-runtime` group bumped this in PR #107 (admin-merged without CI), it silently broke main with 422 typecheck errors. Reverted in [PR #150](https://github.com/HomenShum/nodebench-ai/pull/150).

## Coupled bumps (do all together or not at all)

```json
"@convex-dev/agent":            "^0.6.1",
"ai":                            "^6.0.35",   // AI SDK core, currently ^5.0.71
"@ai-sdk/openai":                "^3.0.10",   // currently 1.x or 2.x
"@ai-sdk/anthropic":             "^3.0.13",
"@ai-sdk/groq":                  "^3.0.8",
"@ai-sdk/google":                "^3.0.8",
"@openrouter/ai-sdk-provider":   "^2.0.0"
```

Other `@convex-dev/*` packages from PR #107 are independent of agent and may move separately:
- `@convex-dev/auth` 0.0.80 → 0.0.91 (small, may be safe)
- `@convex-dev/persistent-text-streaming` 0.2 → 0.3
- `@convex-dev/polar` 0.6 → 0.9
- `@convex-dev/presence` 0.1 → 0.3 (component-API break)
- `@convex-dev/rag` 0.5 → 0.7
- `@convex-dev/twilio` 0.1 → 0.2
- `@convex-dev/workflow` 0.2 → 0.3 (component-API break)
- `@convex-dev/workpool` 0.2 → 0.4 (component-API break)

## Recipe (when ready to migrate to v0.6)

### Step 1 — Stage the bumps as one commit

```bash
npm install \
  @convex-dev/agent@^0.6.1 \
  ai@^6.0.35 \
  @ai-sdk/openai@^3.0.10 \
  @ai-sdk/anthropic@^3.0.13 \
  @ai-sdk/groq@^3.0.8 \
  @ai-sdk/google@^3.0.8 \
  @openrouter/ai-sdk-provider@^2.0.0
```

If npm complains about peer-dep resolution, check `node_modules/@convex-dev/agent/MIGRATION.md` for the exact compat matrix.

### Step 2 — Mechanical renames in tool definitions

For every `createTool({ ... })` callsite:

```diff
 const myTool = createTool({
   description: "...",
-  parameters: z.object({ ... }),
+  inputSchema: z.object({ ... }),
-  handler: async (ctx, args) => { ... }
+  execute: async (ctx, input, _options) => { ... }
 })
```

Note: rename the parameter `args` → `input` inside the function body too. The library maintains backwards-compat aliases but types complain.

### Step 3 — Agent config rename

Anywhere we instantiate `new Agent(...)`:

```diff
 new Agent(components.agent, {
-  textEmbeddingModel: openai.embedding("text-embedding-3-small")
+  embeddingModel: openai.embedding("text-embedding-3-small")
 })
```

### Step 4 — Optional: maxSteps → stopWhen

Cosmetic, library still accepts maxSteps. If we want to be forward-compatible:

```diff
-await agent.generateText(ctx, { threadId }, { prompt: "...", maxSteps: 5 })
+import { stepCountIs } from "ai"
+await agent.generateText(ctx, { threadId }, { prompt: "...", stopWhen: stepCountIs(5) })
```

### Step 5 — Verify

```bash
npx tsc --noEmit                          # 0 errors
npx tsc --noEmit -p convex/tsconfig.json  # 0 errors (was 422 before fix)
npx vite build                            # success
```

If you see `EmbeddingModelV2 vs EmbeddingModelV3` errors, an `@ai-sdk/*` package didn't update to v3.x. Re-run Step 1 with `--force` if needed.

## Affected files (regenerate via `tsc -p convex/tsconfig.json` after the bump)

Confirmed from the 2026-04-26 attempt — these had the `args was removed` / `handler was removed` errors:

- `convex/domains/agents/adapters/convex/convexAgentAdapter.ts`
- `convex/domains/agents/adapters/multiSdkDelegation.ts`
- `convex/domains/agents/core/coordinatorAgent.ts`
- `convex/domains/agents/core/delegation/delegationTools.ts`

Plus an unknown number more — the `tsc` output had 422 errors total, only the first 10 were sampled. Re-run after bumping to capture the full list.

## Verification

```bash
# Full sweep (all three must pass before merging)
npx tsc --noEmit                              # 0 errors
npx tsc --noEmit -p convex/tsconfig.json      # 0 errors
npx vite build                                # success in ~7s

# Optional runtime sanity (if Convex dev is available)
npx convex dev --once --typecheck=enable
```

## Rollback

If anything is wrong, restore in `package.json`:
```json
"@convex-dev/agent": "0.2.10"
```
Then `npm install`. Should restore 0 typecheck errors. (Other `@convex-dev/*` packages' compatibility versions are documented in [PR #150](https://github.com/HomenShum/nodebench-ai/pull/150).)

## Why upstream did this

AI SDK v6 is a major rework focused on streaming + observability + tool-call semantics. Convex agent had to track upstream because it wraps the SDK. The `args` → `inputSchema` rename matches AI SDK's own naming (`args` is now the runtime tool-call payload, `inputSchema` is the static schema). See [AI SDK v6 migration](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0).

## When to revisit the pin

- AI SDK v6 ecosystem stabilizes (most third-party providers ship v3 wrappers)
- We have a focused 2-3 hour block with local Convex dev to test runtime behavior of the agent migration
- A security alert appears against the pinned 0.2.10 (none today, 2026-04-26)
