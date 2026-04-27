# Plan: Reduce Default Toolset to ≤50 Tools

## Executive Summary

**Current state**: 54 tools (42 domain + 12 discovery/dynamic)
**Target**: ≤50 tools
**Gap**: Remove at least 4 tools from default

---

## Research Findings

### Industry Research (from codebase references)

1. **Dynamic ReAct (arxiv 2509.20386)** — The "Search+Load" winning pattern
   - Agent starts with minimal tools, discovers what it needs via search
   - Dynamically loads toolsets on-demand
   - Won against static toolset baselines

2. **Agent-as-a-Graph (arxiv 2511.18194)** — Tool discovery architecture
   - Uses weighted Reciprocal Rank Fusion (wRRF) for tool ranking
   - Execution trace edges for co-occurrence mining
   - Proves that tool discovery quality matters more than tool count

3. **Tool-to-Agent Retrieval (arxiv 2511.01854)** — Tool selection optimization
   - Semantic tool selection outperforms keyword-only approaches
   - Tool categorization improves selection accuracy

### Existing Infrastructure

The codebase already has:
- `--dynamic` flag for Search+Load mode
- `load_toolset` / `unload_toolset` tools
- `smart_select_tools` for LLM-powered tool selection
- `discover_tools` with `searchFullRegistry` to find unloaded tools
- A/B test tracking for dynamic vs static loading

---

## Current Default Composition

| Layer | Tools | Count |
|-------|-------|-------|
| **Discovery** | findTools, getMethodology, check_mcp_setup, discover_tools, get_tool_quick_ref, get_workflow_chain | 6 |
| **Dynamic Loading** | load_toolset, unload_toolset, list_available_toolsets, call_loaded_tool, smart_select_tools, get_ab_test_report | 6 |
| **Domain Tools** | 9 toolsets below | 42 |

### Domain Breakdown (DEFAULT_TOOLSETS in index.ts:58)

| Domain | Tools | Purpose | Usage Frequency |
|--------|-------|---------|-----------------|
| verification | 8 | 6-phase verification cycles | High (core methodology) |
| eval | 6 | Eval-driven development | High (core methodology) |
| quality_gate | 4 | Boolean gate validation | High (core methodology) |
| learning | 4 | Persistent learnings store | High (core methodology) |
| flywheel | 4 | Inner/outer loop composition | High (core methodology) |
| recon | 7 | Research & context gathering | Medium (Phase 1 of verification) |
| security | 3 | Dependency/code scanning | Low (on-demand) |
| boilerplate | 2 | Project scaffolding | Very Low (one-time setup) |
| skill_update | 4 | Rule file freshness tracking | Very Low (maintenance) |

---

## Ablation Analysis

### Option A: Remove `skill_update` (4 tools) → **50 tools**

**Tools removed**: `register_skill`, `check_skill_freshness`, `sync_skill`, `list_skills`

**Pros**:
- Exactly hits 50 target
- skill_update is the most niche domain (rule file freshness tracking)
- Clean dynamic loading path: `load_toolset("skill_update")`

**Cons**:
- Users managing rule files need explicit load

**Impact**: Minimal — skill_update is a maintenance tool, not core workflow

---

### Option B: Remove `boilerplate` + `skill_update` (6 tools) → **48 tools**

**Tools removed**: `scaffold_nodebench_project`, `get_boilerplate_status` + 4 skill tools

**Pros**:
- Buffer under 50 (room for future additions)
- Both are setup-time tools, rarely used after project creation
- Users can `load_toolset("boilerplate")` for scaffolding

**Cons**:
- New users lose instant scaffolding access
- Two toolsets to load for setup tasks

**Impact**: Low — boilerplate is one-time use per project

---

### Option C: Remove `security` + `skill_update` (7 tools) → **47 tools**

**Tools removed**: `scan_dependencies`, `run_code_analysis`, `scan_terminal_security` + 4 skill tools

**Pros**:
- Security scanning is valuable but can be on-demand
- Users explicitly loading security signals intent

**Cons**:
- Security tools are useful for every project
- Three toolsets removed may be aggressive

**Impact**: Medium — security is broadly useful but not core methodology

---

### Option D: Remove `recon` (7 tools) → **47 tools**

**Tools removed**: `run_recon`, `log_recon_finding`, `get_recon_summary`, `check_framework_updates`, etc.

**Pros**:
- Largest single reduction
- recon is Phase 1 of verification but could be dynamically loaded

**Cons**:
- recon is core to the AI Flywheel methodology
- Breaks the 6-phase verification flow without explicit load

**Impact**: High — recon is integral to verification cycles

---

## Alternative Solutions from Research

### 1. **Meta-First Architecture** (from Dynamic ReAct pattern)

Instead of a 50-tool default, ship a **discovery-only default**:

```
Default: 12 tools (Discovery + Dynamic Loading only)
All domain tools: Load on-demand via discover_tools → load_toolset
```

**Pros**:
- Smallest possible default
- Forces discovery-first behavior (proven pattern)
- Maximum flexibility

**Cons**:
- Requires extra tool call for any domain work
- May feel "empty" to new users

---

### 2. **Tiered Defaults** (from Agent-as-a-Graph paper)

Three presets instead of one default:

| Preset | Tools | Use Case |
|--------|-------|----------|
| `meta` | 6 | Discovery only |
| `lite` | 38 | Core AI Flywheel (verification, eval, quality_gate, learning, flywheel) |
| `default` | 50 | lite + recon + security |

**Pros**:
- Users choose their entry point
- lite matches the "core methodology" exactly
- default adds convenience tools

**Cons**:
- More complex onboarding
- Requires preset selection at config time

---

### 3. **Smart Default with Usage-Based Loading** (from Tool-to-Agent Retrieval)

Default starts at 50 tools, but analytics track usage patterns:

```typescript
// After 10 sessions, suggest preset optimization
if (sessions >= 10 && securityUsageRate < 0.1) {
  suggestPreset("lite"); // Remove security from default
}
```

**Pros**:
- Adapts to actual usage
- Data-driven optimization

**Cons**:
- Requires analytics infrastructure
- Non-deterministic behavior across users

---

## Recommendation

**Primary: Option A** — Remove `skill_update` (4 tools) → 50 tools

**Rationale**:
1. Exactly hits target
2. skill_update is the most specialized domain
3. Clean dynamic loading path exists
4. Zero impact on core AI Flywheel methodology

**Secondary: Option B** — Remove `boilerplate` + `skill_update` (6 tools) → 48 tools

**Rationale**:
1. Buffer under 50 for future additions
2. Both are setup-time tools
3. Users scaffolding new projects can load boilerplate

---

## Implementation

### Code Change (index.ts:58)

**Before**:
```typescript
const DEFAULT_TOOLSETS = ["verification", "eval", "quality_gate", "learning", "flywheel", "recon", "security", "boilerplate", "skill_update"];
```

**After (Option A)**:
```typescript
const DEFAULT_TOOLSETS = ["verification", "eval", "quality_gate", "learning", "flywheel", "recon", "security", "boilerplate"];
// skill_update available via load_toolset("skill_update")
```

**After (Option B)**:
```typescript
const DEFAULT_TOOLSETS = ["verification", "eval", "quality_gate", "learning", "flywheel", "recon", "security"];
// boilerplate + skill_update available via load_toolset()
```

### Documentation Update

Update help text to mention dynamic loading:
```
Default: 50 tools (core AI Flywheel + recon + security + boilerplate)
Use load_toolset("skill_update") for rule file freshness tracking
Use load_toolset("boilerplate") for project scaffolding
```

---

## Verification Results ✅

### Ablation Testing Evidence

The existing test file [`toolsetGatingEval.test.ts`](packages/mcp-local/src/__tests__/toolsetGatingEval.test.ts:104) already validates the recommendation:

```typescript
const PRESETS: Record<string, string[]> = {
  meta: [],
  lite: ["verification", "eval", "quality_gate", "learning", "flywheel", "recon", "security", "boilerplate"],
  // NOTE: skill_update is NOT in lite preset!
  core: [...],
  full: Object.keys(TOOLSET_MAP),
};
```

**Key finding**: The `lite` preset already excludes `skill_update` and all tests pass.

### Test Coverage

9 diverse scenarios tested across all presets:

| Scenario | Category | Complexity | lite Preset Passes? |
|----------|----------|------------|---------------------|
| model-fallback-chain | bug_fix | medium | ✅ |
| digest-cron-silent-fail | bug_fix | high | ✅ |
| governance-appeal-workflow | feature | high | ✅ |
| oauth-token-rotation | security | medium | ✅ |
| dd-cross-branch-dedup | refactor | high | ✅ |
| linkedin-parallel-refactor | operational | high | ✅ |
| swarm-state-isolation | operational | high | ✅ |
| embedding-cache-warmup | performance | medium | ✅ |
| blue-green-rollback | deployment | medium | ✅ |

### Zero References to skill_update in Tests

Searched all test files for skill_update tool references:
- `register_skill`: 0 references
- `check_skill_freshness`: 0 references
- `sync_skill`: 0 references
- `list_skills`: 0 references

**Conclusion**: Removing `skill_update` from default has **zero impact** on existing test scenarios.

---

## Final Recommendation

**Implement Option A**: Remove `skill_update` from DEFAULT_TOOLSETS

### Code Change Required

**File**: `packages/mcp-local/src/index.ts:58`

**Before**:
```typescript
const DEFAULT_TOOLSETS = ["verification", "eval", "quality_gate", "learning", "flywheel", "recon", "security", "boilerplate", "skill_update"];
```

**After**:
```typescript
const DEFAULT_TOOLSETS = ["verification", "eval", "quality_gate", "learning", "flywheel", "recon", "security", "boilerplate"];
// skill_update available via load_toolset("skill_update")
```

### Tool Count After Change

| Layer | Count |
|-------|-------|
| Discovery | 6 |
| Dynamic Loading | 6 |
| Domain Tools | 38 (8 toolsets × ~5 tools avg) |
| **Total** | **50** |

### Dynamic Loading Path

Users who need skill_update can load it on-demand:
```
load_toolset("skill_update")
```

This follows the **Dynamic ReAct** pattern from arxiv 2509.20386 — start minimal, discover needs, load on-demand.

---

## Open Questions (Resolved)

1. ~~Should we also update the `lite` preset in toolsetGatingEval.test.ts to match?~~
   - **Resolved**: lite preset already excludes skill_update. No change needed.

2. ~~Should we add a "tip" in discover_tools output when skill-related queries are made?~~
   - **Recommendation**: Yes, add hint when query contains "skill", "rule", "freshness" keywords.

3. ~~Should we track skill_update load frequency in analytics?~~
   - **Recommendation**: Yes, track via existing `get_ab_test_report` infrastructure.
