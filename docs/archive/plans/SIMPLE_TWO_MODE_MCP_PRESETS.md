# Plan: Simplify NodeBench MCP to 2 Presets

## Problem Statement

Current state has 5 presets (meta, minimal, standard, core, full) which is too many options. User wants only **2 modes**:

1. **Default Mode** (≤50 tools with meta tools included) - for everyday development
2. **Full Mode** (all 163 tools) - for specialized tasks (vision, web search, files, etc.)

## Proposed Design

### Preset 1: `default` (≤50 tools)

**Goal**: Complete AI Flywheel methodology with minimal token overhead

**Toolsets (with exact counts):**

| Toolset | Tools | Description |
|---------|-------|-------------|
| verification | 8 | Cycles, gaps, triple-verify, status |
| eval | 6 | Eval runs, results, comparison, diff |
| quality_gate | 4 | Gates, presets, history |
| learning | 4 | Knowledge, search, record |
| flywheel | 4 | Mandatory flywheel, promote, investigate |
| recon | 7 | Research, findings, framework checks |
| security | 3 | Dependency scanning, code analysis |
| boilerplate | 2 | Scaffold projects + status |
| **Total Domain Tools** | **38** | |
| **+ Meta Tools (6)** | **findTools, getMethodology, check_mcp_setup, discover_tools, get_tool_quick_ref, get_workflow_chain** | |
| **Grand Total** | **44 tools** | ✓ Under 50 |

**Configuration:**
```bash
npx nodebench-mcp                    # Default (44 tools)
npx nodebench-mcp --preset default   # Explicit
```

### Preset 2: `full` (163 tools)

**Goal**: Everything - vision, UI capture, web search, GitHub, local files, GAIA solvers, parallel agents, etc.

**All 31 toolsets** from TOOLSET_MAP

**Configuration:**
```bash
npx nodebench-mcp --preset full      # All 163 tools
npx nodebench-mcp --preset extra     # Alias for full
```

### Removed Presets

| Old Preset | Status | Reason |
|------------|--------|--------|
| `meta` | Removed | Discovery tools now always included in default |
| `minimal` | Removed | Too stripped down, not practical |
| `standard` | Renamed to `default` | Clear naming |
| `core` | Removed | Falls between default and full, not needed |
| `full` | Kept | All tools option |

### Meta Tools Behavior Change

**Current behavior**: Meta tools (findTools, getMethodology, etc.) are always included regardless of preset.

**New behavior**: 
- Meta tools are **always included** in both presets (same as before)
- No standalone "meta" preset anymore
- Users always have discovery tools available

## Implementation Plan

### Phase 1: Update index.ts Presets

```typescript
const PRESETS: Record<string, string[]> = {
  default: ["verification", "eval", "quality_gate", "learning", "flywheel", "recon", "security", "boilerplate"],
  full: Object.keys(TOOLSET_MAP),  // All 31 toolsets
};
```

### Phase 2: Update CLI Argument Parsing

- Change default return from `PRESETS.standard` to `PRESETS.default`
- Update help text to show only 2 presets
- Keep `--toolsets` and `--exclude` for fine-grained control

### Phase 3: Update README.md

- Simplify installation commands
- Update preset table
- Update "When to Use Each Preset" section
- Remove references to removed presets

### Phase 4: Update package.json (if needed)

- Check for any preset references that need updating

## Files to Modify

1. `packages/mcp-local/src/index.ts`
   - Update PRESETS constant
   - Update parseToolsets() function
   - Update help text

2. `packages/mcp-local/README.md`
   - Update installation commands
   - Update preset table
   - Update all preset references

3. `packages/mcp-local/package.json` (check)
   - Verify no preset references

## Backward Compatibility

| Old Command | New Command | Notes |
|-------------|-------------|-------|
| `npx nodebench-mcp` | `npx nodebench-mcp` | Still works, now uses "default" preset |
| `--preset meta` | Removed | Meta tools always included |
| `--preset lite` | `--preset default` | Renamed |
| `--preset minimal` | `--preset default` | Simplified |
| `--preset standard` | `--preset default` | Renamed |
| `--preset core` | `--preset full` | Falls between, point to full |
| `--preset full` | `--preset full` | Still works |

## Migration Guide for Users

```bash
# Old (5 presets)
npx nodebench-mcp --preset meta
npx nodebench-mcp --preset lite
npx nodebench-mcp --preset minimal
npx nodebench-mcp --preset standard
npx nodebench-mcp --preset core
npx nodebench-mcp --preset full

# New (2 presets)
npx nodebench-mcp                    # Default (44 tools)
npx nodebench-mcp --preset default   # Explicit default
npx nodebench-mcp --preset full      # All 163 tools
```

## Benefits

1. **Simpler choice**: Default vs Full, no confusion
2. **Clear default**: 44 tools covers all AI Flywheel methodology
3. **Easy opt-in**: Just add `--preset full` for specialized tools
4. **Under 50 tools**: Meets user's requirement for default mode
5. **Meta tools always available**: Discovery works in both modes

## Verification Steps

After implementation:

1. Run `npx nodebench-mcp --help` → Should show only 2 presets
2. Count default tools → Should be 44 (6 meta + 38 domain)
3. Test with `--preset full` → Should load all 163 tools
4. Verify all AI Flywheel workflows work with default preset

## Open Questions

1. Should `--preset extra` be added as an alias for `--preset full`?
2. Should the meta/discovery tools be documented separately or always mentioned with the presets?
3. Should the README show the exact tool count per toolset?

## Next Steps

1. Review and approve this plan
2. Switch to Code mode to implement changes
3. Test the implementation
4. Update documentation
5. Publish changes
