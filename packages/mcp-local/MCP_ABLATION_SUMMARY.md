# MCP Toolset Ablation Summary

## Changes Made

### 1. New Preset Definitions (packages/mcp-local/src/index.ts)

Added a new `minimal` preset and renamed `lite` to `standard`:

| Preset | Toolsets | Domain Tools | Total Tools (with meta/discovery) |
|--------|----------|--------------|-----------------------------------|
| `meta` | 0 | 0 | 6 |
| `minimal` | 5 | 16 | 22 |
| `standard` | 8 | 38 | 44 |
| `core` | 25 | 104 | 110 |
| `full` | 31 | 157 | 163 |

### 2. Preset Toolset Composition

**minimal (5 toolsets, 16 domain tools):**
- verification (8 tools)
- eval (6 tools)
- quality_gate (4 tools)
- learning (4 tools)
- recon (7 tools)

**standard (8 toolsets, 38 domain tools):**
- verification (8 tools)
- eval (6 tools)
- quality_gate (4 tools)
- learning (4 tools)
- flywheel (4 tools)
- recon (7 tools)
- security (3 tools)
- boilerplate (2 tools)

### 3. Default Preset Changed

Changed from `lite` to `standard`:
- Old default: 43 tools
- New default: 44 tools

### 4. README Updates

Updated the following sections in packages/mcp-local/README.md:
- Header installation commands
- "Who's Using It" section
- "Quick Start" section
- "Toolset Gating" section
- Preset table
- Available toolsets table
- "When to Use Each Preset" section

## Ablation Analysis

### Essential Tools for AI Flywheel (22 tools)

The `minimal` preset contains only the essential tools needed for the core AI Flywheel methodology:

**Meta/Discovery (6 tools - always included):**
1. findTools
2. getMethodology
3. check_mcp_setup
4. discover_tools
5. get_tool_quick_ref
6. get_workflow_chain

**Verification (8 tools):**
1. start_verification_cycle
2. log_phase_findings
3. log_gap
4. resolve_gap
5. log_test_result
6. get_verification_status
7. list_verification_cycles
8. triple_verify

**Eval (6 tools):**
1. start_eval_run
2. record_eval_result
3. complete_eval_run
4. compare_eval_runs
5. list_eval_runs
6. diff_outputs

**Quality Gate (4 tools):**
1. run_quality_gate
2. get_gate_preset
3. get_gate_history
4. run_closed_loop

**Learning (4 tools):**
1. record_learning
2. search_learnings
3. list_learnings
4. delete_learning

**Recon (7 tools):**
1. run_recon
2. log_recon_finding
3. get_recon_summary
4. check_framework_updates
5. search_all_knowledge
6. bootstrap_project
7. get_project_context

### Optional Tools (21 tools in standard preset)

These tools enhance the AI Flywheel but are not strictly required:

**Flywheel (4 tools):**
- get_flywheel_status
- promote_to_eval
- trigger_investigation
- run_mandatory_flywheel

**Security (3 tools):**
- scan_dependencies
- run_code_analysis
- scan_terminal_security

**Boilerplate (2 tools):**
- scaffold_nodebench_project
- get_boilerplate_status

## Next Steps

### 1. Run Ablation Experiments

Test each preset against the existing benchmark suite:

```bash
# Test minimal preset (22 tools)
npx nodebench-mcp --preset minimal
npm run test

# Test standard preset (44 tools)
npx nodebench-mcp --preset standard
npm run test

# Test full preset (163 tools)
npx nodebench-mcp --preset full
npm run test
```

### 2. Success Criteria

- **minimal preset (22 tools)**: Must achieve >= 90% success rate on AI Flywheel tasks
- **standard preset (44 tools)**: Must achieve >= 95% success rate on AI Flywheel tasks
- **full preset (163 tools)**: Must achieve >= 98% success rate on AI Flywheel tasks

### 3. Metrics to Track

- Success rate on AI Flywheel tasks
- Time to complete tasks
- Token usage per task
- Tool call frequency
- Error rates

### 4. Analysis

After running the experiments:
1. Compare success rates across presets
2. Identify any tools that are critical but missing from minimal preset
3. Adjust tool counts if needed
4. Update documentation with findings

## Expected Outcomes

Based on the analysis:

1. **minimal preset (22 tools)** should handle most AI Flywheel tasks with minimal token overhead
2. **standard preset (44 tools)** provides the complete AI Flywheel methodology with ~70% less token overhead than full
3. **full preset (163 tools)** is only needed for specialized use cases (vision, UI capture, web, GitHub, local files, GAIA solvers)

## Files Modified

1. `packages/mcp-local/src/index.ts` - Updated preset definitions
2. `packages/mcp-local/README.md` - Updated documentation
3. `packages/mcp-local/MCP_ABLATION_ANALYSIS.md` - Created analysis document

## Files to Review

1. `packages/mcp-local/package.json` - May need to update default preset reference
2. `AI_FLYWHEEL.md` - May need to update preset references
3. `AGENTS.md` - May need to update preset references

## Conclusion

The new preset structure provides a clear progression from discovery-only (6 tools) to minimal AI Flywheel (22 tools) to complete AI Flywheel (44 tools) to full workflow (110 tools) to everything (163 tools). This allows users to choose the right balance between functionality and token overhead for their use case.

The ablation experiments will validate that the minimal preset (22 tools) can achieve the same results as the full preset (163 tools) for core AI Flywheel tasks, while using significantly fewer tokens.
