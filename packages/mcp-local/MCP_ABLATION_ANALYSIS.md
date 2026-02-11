# MCP Toolset Ablation Analysis

## Goal
Find the minimal number of tools needed to achieve the same AI Flywheel results as the current 163-tool full preset.

## Current Toolset Structure

### Meta/Discovery (6 tools - Always Included)
1. `findTools` - Search available methodology tools by keyword
2. `getMethodology` - Get step-by-step guidance for a development methodology
3. `check_mcp_setup` - Comprehensive diagnostic wizard for the entire NodeBench MCP
4. `discover_tools` - Multi-modal tool search engine with 14 scoring strategies
5. `get_tool_quick_ref` - Get the quick ref for a specific tool
6. `get_workflow_chain` - Get a recommended tool sequence for a common workflow

### Core AI Flywheel Toolsets

#### Verification (8 tools)
- `start_verification_cycle` - Start a new 6-phase verification cycle
- `log_phase_findings` - Record phase completion and findings
- `log_gap` - Record a gap/issue found during verification
- `resolve_gap` - Mark a gap as resolved
- `log_test_result` - Record test results (5 layers)
- `get_verification_status` - Get current status of a verification cycle
- `list_verification_cycles` - List all verification cycles
- `triple_verify` - Run 3-layer verification (V1 internal, V2 external, V3 synthesis)

#### Eval (6 tools)
- `start_eval_run` - Start a new eval run
- `record_eval_result` - Record the actual result for a specific eval case
- `complete_eval_run` - Complete an eval run and calculate summary
- `compare_eval_runs` - Compare two eval runs
- `list_eval_runs` - List all eval runs
- `diff_outputs` - Compare two outputs

#### Quality Gate (4 tools)
- `run_quality_gate` - Run a quality gate with boolean rules
- `get_gate_preset` - Get a gate preset (rules)
- `get_gate_history` - Get gate history
- `run_closed_loop` - Run compile→lint→test→debug cycle

#### Learning (4 tools)
- `record_learning` - Store an edge case, gotcha, pattern, or regression
- `search_learnings` - [DEPRECATED] Search past learnings
- `list_learnings` - List all learnings
- `delete_learning` - Delete a learning

#### Flywheel (4 tools)
- `get_flywheel_status` - Get current state of both loops
- `promote_to_eval` - Promote verification findings to eval cases
- `trigger_investigation` - Trigger an investigation based on eval regression
- `run_mandatory_flywheel` - Run 6-step minimum verification

#### Recon (7 tools)
- `run_recon` - Start a recon session
- `log_recon_finding` - Record a recon finding
- `get_recon_summary` - Get recon session summary
- `check_framework_updates` - Check framework sources for updates
- `search_all_knowledge` - Unified search (learnings + recon findings + gaps)
- `bootstrap_project` - Register project context
- `get_project_context` - Get project context

#### Security (3 tools)
- `scan_dependencies` - Scan dependencies for vulnerabilities
- `run_code_analysis` - Run code analysis
- `scan_terminal_security` - Scan terminal security

#### Boilerplate (2 tools)
- `scaffold_nodebench_project` - Scaffold NodeBench projects
- `get_boilerplate_status` - Get boilerplate status

### Optional Toolsets (Not Core to AI Flywheel)

#### Bootstrap (11 tools)
- `discover_infrastructure` - Scan codebase for existing agent patterns
- `triple_verify` - Run 3-layer verification with authoritative sources
- `self_implement` - Self-implement missing components
- `generate_self_instructions` - Generate self instructions
- `connect_channels` - Connect notification channels
- `assess_risk` - Assess risk before action
- `decide_re_update` - Decide whether to re-update before create
- `run_self_maintenance` - Run self-maintenance cycle
- `scaffold_directory` - Scaffold directory structure
- `run_autonomous_loop` - Run autonomous loop
- `run_tests_cli` - Run tests via CLI

#### Self Eval (9 tools)
- `log_tool_call` - Record a tool invocation
- `get_trajectory_analysis` - Analyze tool usage patterns
- `get_self_eval_report` - Get self-evaluation report
- `get_improvement_recommendations` - Get improvement recommendations
- `cleanup_stale_runs` - Cleanup stale runs
- `synthesize_recon_to_learnings` - Synthesize recon to learnings
- `check_contract_compliance` - Check contract compliance
- `create_task_bank` - Create evaluation task bank
- `grade_agent_run` - Grade agent run

#### Parallel (13 tools)
- `claim_agent_task` - Claim a task lock
- `release_agent_task` - Release a task lock
- `list_agent_tasks` - List agent tasks
- `assign_agent_role` - Assign agent role
- `get_agent_role` - Get agent role
- `log_context_budget` - Log context budget
- `run_oracle_comparison` - Run oracle comparison
- `get_parallel_status` - Get parallel status
- `bootstrap_parallel_agents` - Bootstrap parallel agents
- `generate_parallel_agents_md` - Generate parallel agents markdown
- `send_agent_mailbox` - Send agent mailbox message
- `broadcast_agent_mailbox` - Broadcast agent mailbox message
- `receive_agent_mailbox` - Receive agent mailbox message

#### Vision (4 tools)
- `discover_vision_env` - Discover vision environment
- `analyze_screenshot` - Analyze screenshot
- `manipulate_screenshot` - Manipulate screenshot
- `diff_screenshots` - Diff screenshots

#### UI Capture (2 tools)
- `capture_ui_screenshot` - Capture UI screenshot
- `capture_responsive_suite` - Capture responsive suite

#### Web (2 tools)
- `web_search` - Web search
- `fetch_url` - Fetch URL

#### GitHub (3 tools)
- `search_github` - Search GitHub
- `analyze_repo` - Analyze repo
- `monitor_repo` - Monitor repo

#### Docs (4 tools)
- `update_agents_md` - Update AGENTS.md
- `research_job_market` - Research job market
- `setup_local_env` - Setup local environment
- `generate_report` - Generate report

#### Local File (19 tools)
- CSV/XLSX/PDF/DOCX/PPTX/JSON/JSONL/TXT/ZIP parsing tools
- OCR tools
- Audio transcription tools

#### LLM (3 tools)
- `call_llm` - Call LLM
- `extract_structured_data` - Extract structured data
- `benchmark_models` - Benchmark models

#### Platform (4 tools)
- `query_daily_brief` - Query daily brief
- `query_funding_entities` - Query funding entities
- `query_research_queue` - Query research queue
- `publish_to_queue` - Publish to queue

#### Research Writing (8 tools)
- Academic paper writing tools

#### Flicker Detection (5 tools)
- Android flicker detection tools

#### Figma Flow (4 tools)
- Figma flow analysis tools

#### Benchmark (3 tools)
- Autonomous benchmark lifecycle tools

#### Session Memory (3 tools)
- Compaction-resilient notes tools

#### GAIA Solvers (6 tools)
- GAIA media image solvers

#### TOON (2 tools)
- `toon_encode` - TOON encode
- `toon_decode` - TOON decode

#### Pattern (2 tools)
- Session pattern mining tools

#### Git Workflow (3 tools)
- Branch compliance tools

#### SEO (5 tools)
- Technical SEO audit tools

#### Voice Bridge (4 tools)
- Voice pipeline tools

#### Critter (1 tool)
- `critter_check` - Intentionality checkpoint

#### Email (3 tools)
- Email intelligence tools

#### RSS (1 tool)
- RSS tools

#### Architect (1 tool)
- Architect tools

## Analysis: Essential vs Optional

### Essential for AI Flywheel (22 tools)
These tools are required for the core AI Flywheel methodology:

**Meta/Discovery (6 tools)**
1. `findTools`
2. `getMethodology`
3. `check_mcp_setup`
4. `discover_tools`
5. `get_tool_quick_ref`
6. `get_workflow_chain`

**Verification (6 tools)**
7. `start_verification_cycle`
8. `log_phase_findings`
9. `log_gap`
10. `resolve_gap`
11. `log_test_result`
12. `get_verification_status`

**Learning (3 tools)**
13. `record_learning`
14. `list_learnings`
15. `search_all_knowledge` (from recon)

**Eval (4 tools)**
16. `start_eval_run`
17. `record_eval_result`
18. `complete_eval_run`
19. `compare_eval_runs`

**Quality Gate (2 tools)**
20. `run_quality_gate`
21. `get_gate_preset`

**Recon (1 tool)**
22. `run_recon`

### Optional but Useful (21 tools)
These tools enhance the AI Flywheel but are not strictly required:

**Verification (2 tools)**
- `list_verification_cycles` - List all cycles (nice to have)
- `triple_verify` - 3-layer verification (advanced)

**Learning (1 tool)**
- `delete_learning` - Delete learning (cleanup)

**Eval (2 tools)**
- `list_eval_runs` - List eval runs (nice to have)
- `diff_outputs` - Compare outputs (nice to have)

**Quality Gate (2 tools)**
- `get_gate_history` - Get gate history (nice to have)
- `run_closed_loop` - Run compile→lint→test→debug (nice to have)

**Flywheel (4 tools)**
- `get_flywheel_status` - Get flywheel status (nice to have)
- `promote_to_eval` - Promote to eval (nice to have)
- `trigger_investigation` - Trigger investigation (nice to have)
- `run_mandatory_flywheel` - Run mandatory flywheel (nice to have)

**Recon (6 tools)**
- `log_recon_finding` - Record recon finding (nice to have)
- `get_recon_summary` - Get recon summary (nice to have)
- `check_framework_updates` - Check framework updates (nice to have)
- `bootstrap_project` - Bootstrap project (nice to have)
- `get_project_context` - Get project context (nice to have)

**Security (3 tools)**
- `scan_dependencies` - Scan dependencies (nice to have)
- `run_code_analysis` - Run code analysis (nice to have)
- `scan_terminal_security` - Scan terminal security (nice to have)

**Boilerplate (2 tools)**
- `scaffold_nodebench_project` - Scaffold project (nice to have)
- `get_boilerplate_status` - Get boilerplate status (nice to have)

### Domain-Specific (120 tools)
These tools are for specific use cases (vision, web, GitHub, local files, etc.) and are not required for the core AI Flywheel methodology.

## Proposed Minimal Preset: "core" (22 tools)

```typescript
const CORE_PRESET: string[] = [
  // Meta/Discovery (6 tools)
  "meta",
  "progressive_discovery",
  
  // Verification (6 tools)
  "verification",
  
  // Learning (3 tools)
  "learning",
  
  // Eval (4 tools)
  "eval",
  
  // Quality Gate (2 tools)
  "quality_gate",
  
  // Recon (1 tool)
  "recon",
];
```

**Total: 22 tools**

This minimal preset provides:
- Complete 6-phase verification process
- Knowledge compounding
- Eval-driven development
- Quality gates
- Structured research
- Progressive discovery

## Proposed Lite Preset: "lite" (43 tools)

Keep the current lite preset but rename it to "standard":

```typescript
const STANDARD_PRESET: string[] = [
  // Core (22 tools)
  ...CORE_PRESET,
  
  // Additional useful tools (21 tools)
  "flywheel",      // 4 tools
  "security",      // 3 tools
  "boilerplate",   // 2 tools
  // Plus 12 more from verification, learning, eval, quality_gate, recon
];
```

**Total: 43 tools**

## Ablation Experiment Design

### Experiment 1: Core Preset (22 tools)
- Test: Can agents complete the AI Flywheel methodology with only 22 tools?
- Metrics: Success rate, time to complete, token usage
- Expected: High success rate, minimal token usage

### Experiment 2: Lite Preset (43 tools)
- Test: Can agents complete the AI Flywheel methodology with 43 tools?
- Metrics: Success rate, time to complete, token usage
- Expected: High success rate, moderate token usage

### Experiment 3: Full Preset (163 tools)
- Test: Can agents complete the AI Flywheel methodology with 163 tools?
- Metrics: Success rate, time to complete, token usage
- Expected: High success rate, high token usage

### Success Criteria
- Core preset (22 tools) must achieve >= 90% success rate on AI Flywheel tasks
- Lite preset (43 tools) must achieve >= 95% success rate on AI Flywheel tasks
- Full preset (163 tools) must achieve >= 98% success rate on AI Flywheel tasks

## Next Steps

1. Implement the new preset definitions in `index.ts`
2. Run ablation experiments using the existing benchmark suite
3. Analyze results and adjust tool counts if needed
4. Update README with new preset recommendations
5. Update package.json with new default preset
