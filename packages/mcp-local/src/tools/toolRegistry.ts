/**
 * Tool Registry — Central metadata catalog for all NodeBench MCP tools.
 *
 * Every tool gets: category, tags (for hybrid search), quickRef (what to do next),
 * relatedTools, and phase (which methodology phase it belongs to).
 *
 * The progressive disclosure system uses this to:
 * 1. Score tools by relevance (hybrid: keyword + tag + category matching)
 * 2. Append quickRefs to every tool response (so agents always know what to do next)
 * 3. Build tool chains (recommended sequences for common workflows)
 */

import { isEmbeddingReady, embeddingSearch } from "./embeddingProvider.js";

export interface ToolQuickRef {
  /** 1-2 sentence guidance on what to do after calling this tool */
  nextAction: string;
  /** Tools commonly used after this one */
  nextTools: string[];
  /** Which methodology to consult for full guidance */
  methodology?: string;
  /** Short tip for effective use */
  tip?: string;
}

export interface ToolRegistryEntry {
  name: string;
  category: string;
  tags: string[];
  quickRef: ToolQuickRef;
  /** Where this tool sits in a typical workflow: research, implement, test, verify, ship */
  phase: "research" | "implement" | "test" | "verify" | "ship" | "meta" | "utility";
  /** Recommended model tier: low=Haiku, medium=Sonnet, high=Opus. Used for cost-aware routing. */
  complexity?: "low" | "medium" | "high";
}

// ── Registry: every tool mapped with metadata ────────────────────────────

const REGISTRY_ENTRIES: ToolRegistryEntry[] = [
  // ═══ VERIFICATION ═══
  {
    name: "start_verification_cycle",
    category: "verification",
    tags: ["verify", "cycle", "start", "6-phase", "begin", "correctness", "integration"],
    quickRef: {
      nextAction: "Cycle started. Now gather context with run_recon or search_all_knowledge, then call log_phase_findings for Phase 1.",
      nextTools: ["search_all_knowledge", "run_recon", "log_phase_findings"],
      methodology: "verification",
      tip: "Always search_all_knowledge first to avoid repeating past mistakes.",
    },
    phase: "verify",
  },
  {
    name: "log_phase_findings",
    category: "verification",
    tags: ["phase", "findings", "log", "record", "progress", "advance"],
    quickRef: {
      nextAction: "Phase recorded. If passed, proceed to next phase. If failed, loop back to fix issues before re-submitting.",
      nextTools: ["log_gap", "log_test_result", "get_verification_status"],
      methodology: "verification",
    },
    phase: "verify",
  },
  {
    name: "log_gap",
    category: "verification",
    tags: ["gap", "issue", "bug", "finding", "severity", "critical", "high", "medium", "low"],
    quickRef: {
      nextAction: "Gap logged. Fix CRITICAL/HIGH gaps immediately. Call resolve_gap after fixing each one.",
      nextTools: ["resolve_gap", "log_phase_findings"],
      methodology: "verification",
      tip: "Include rootCause and fixStrategy for future reference.",
    },
    phase: "verify",
  },
  {
    name: "resolve_gap",
    category: "verification",
    tags: ["resolve", "fix", "gap", "close", "done"],
    quickRef: {
      nextAction: "Gap resolved. Check remaining gaps with get_verification_status. When all resolved, advance phase.",
      nextTools: ["get_verification_status", "log_phase_findings", "log_test_result"],
      methodology: "verification",
    },
    phase: "verify",
  },
  {
    name: "log_test_result",
    category: "verification",
    tags: ["test", "result", "static", "unit", "integration", "manual", "e2e", "pass", "fail"],
    quickRef: {
      nextAction: "Test recorded. Ensure all 5 layers pass: static, unit, integration, manual, live_e2e. Then call log_phase_findings for Phase 4.",
      nextTools: ["run_closed_loop", "log_phase_findings"],
      methodology: "verification",
      tip: "Use run_closed_loop for the compile→lint→test→debug cycle.",
    },
    phase: "test",
  },
  {
    name: "get_verification_status",
    category: "verification",
    tags: ["status", "check", "progress", "cycle", "overview"],
    quickRef: {
      nextAction: "Review status. Focus on current phase and unresolved gaps. Proceed to next uncompleted phase.",
      nextTools: ["log_phase_findings", "log_gap", "resolve_gap"],
      methodology: "verification",
    },
    phase: "verify",
  },
  {
    name: "list_verification_cycles",
    category: "verification",
    tags: ["list", "cycles", "history", "past", "review"],
    quickRef: {
      nextAction: "Review past cycles for patterns. Use active cycles' IDs with get_verification_status.",
      nextTools: ["get_verification_status", "start_verification_cycle"],
      methodology: "verification",
    },
    phase: "verify",
  },
  {
    name: "abandon_cycle",
    category: "verification",
    tags: ["abandon", "cancel", "cleanup", "stale", "orphan"],
    quickRef: {
      nextAction: "Cycle abandoned. Start a fresh cycle if the work is still needed.",
      nextTools: ["start_verification_cycle", "list_verification_cycles"],
      methodology: "verification",
    },
    phase: "verify",
  },

  // ═══ EVAL ═══
  {
    name: "start_eval_run",
    category: "eval",
    tags: ["eval", "evaluation", "batch", "test", "cases", "benchmark", "measure"],
    quickRef: {
      nextAction: "Eval run created. Execute each test case and call record_eval_result for each one.",
      nextTools: ["record_eval_result", "complete_eval_run"],
      methodology: "eval",
      tip: "Define clear input/intent/expected for each case. Quality of eval cases determines quality of measurement.",
    },
    phase: "test",
  },
  {
    name: "record_eval_result",
    category: "eval",
    tags: ["eval", "result", "verdict", "pass", "fail", "partial", "score"],
    quickRef: {
      nextAction: "Result recorded. Continue with remaining cases. When all done, call complete_eval_run.",
      nextTools: ["complete_eval_run", "record_eval_result"],
      methodology: "eval",
    },
    phase: "test",
  },
  {
    name: "complete_eval_run",
    category: "eval",
    tags: ["eval", "complete", "aggregate", "score", "summary", "finish"],
    quickRef: {
      nextAction: "Run completed. Compare against baseline with compare_eval_runs to decide if change ships.",
      nextTools: ["compare_eval_runs", "list_eval_runs"],
      methodology: "eval",
      tip: "Rule: no change ships without eval improvement.",
    },
    phase: "test",
  },
  {
    name: "compare_eval_runs",
    category: "eval",
    tags: ["compare", "baseline", "candidate", "deploy", "revert", "regression", "improvement"],
    quickRef: {
      nextAction: "Follow the recommendation: DEPLOY if improved, REVERT if regressed, INVESTIGATE if flat.",
      nextTools: ["trigger_investigation", "record_learning", "run_mandatory_flywheel"],
      methodology: "eval",
    },
    phase: "ship",
  },
  {
    name: "list_eval_runs",
    category: "eval",
    tags: ["eval", "list", "history", "trend", "drift"],
    quickRef: {
      nextAction: "Review trends. If scores are dropping, call trigger_investigation to start a verification cycle.",
      nextTools: ["compare_eval_runs", "trigger_investigation"],
      methodology: "eval",
    },
    phase: "test",
  },
  {
    name: "diff_outputs",
    category: "eval",
    tags: ["diff", "compare", "output", "text", "changes"],
    quickRef: {
      nextAction: "Review diffs to understand what changed. Use findings to inform eval scoring or gap analysis.",
      nextTools: ["record_eval_result", "log_gap"],
      methodology: "eval",
    },
    phase: "test",
  },

  // ═══ QUALITY GATE ═══
  {
    name: "run_quality_gate",
    category: "quality_gate",
    tags: ["gate", "quality", "check", "boolean", "rules", "pass", "fail", "validate"],
    quickRef: {
      nextAction: "Gate evaluated. Fix any failures before proceeding. Record patterns with record_learning.",
      nextTools: ["record_learning", "get_gate_history", "run_mandatory_flywheel"],
      methodology: "quality_gates",
      tip: "Use get_gate_preset for built-in rule sets: engagement, code_review, deploy_readiness, ui_ux_qa.",
    },
    phase: "verify",
  },
  {
    name: "get_gate_preset",
    category: "quality_gate",
    tags: ["preset", "rules", "engagement", "code_review", "deploy", "ui_ux", "template"],
    quickRef: {
      nextAction: "Evaluate each rule against your target. Then call run_quality_gate with your boolean results.",
      nextTools: ["run_quality_gate"],
      methodology: "quality_gates",
    },
    phase: "verify",
  },
  {
    name: "get_gate_history",
    category: "quality_gate",
    tags: ["history", "trend", "gate", "quality", "over-time"],
    quickRef: {
      nextAction: "Review pass/fail trends. If quality is dropping, investigate with start_verification_cycle.",
      nextTools: ["run_quality_gate", "start_verification_cycle"],
      methodology: "quality_gates",
    },
    phase: "verify",
  },
  {
    name: "run_closed_loop",
    category: "quality_gate",
    tags: ["closed-loop", "compile", "lint", "test", "debug", "green", "build"],
    quickRef: {
      nextAction: "Loop result recorded. If any step failed, fix and re-run from the failed step. Never present work without a green loop.",
      nextTools: ["log_test_result", "run_mandatory_flywheel"],
      methodology: "closed_loop",
    },
    phase: "test",
  },

  // ═══ LEARNING ═══
  {
    name: "record_learning",
    category: "learning",
    tags: ["learning", "edge-case", "gotcha", "pattern", "regression", "convention", "remember", "knowledge"],
    quickRef: {
      nextAction: "Learning persisted. It will surface in future search_all_knowledge queries. Add tags for better discoverability.",
      nextTools: ["search_all_knowledge", "list_learnings"],
      methodology: "learnings",
      tip: "Record immediately when you discover something — don't wait until the end.",
    },
    phase: "ship",
  },
  {
    name: "search_learnings",
    category: "learning",
    tags: ["search", "find", "lookup", "past", "knowledge", "history"],
    quickRef: {
      nextAction: "Review matches. Prefer search_all_knowledge for unified search across learnings + recon + gaps.",
      nextTools: ["search_all_knowledge", "record_learning"],
      methodology: "learnings",
    },
    phase: "research",
  },
  {
    name: "list_learnings",
    category: "learning",
    tags: ["list", "browse", "all", "learnings", "review"],
    quickRef: {
      nextAction: "Browse the knowledge base. Filter by category to find specific types of learnings.",
      nextTools: ["search_all_knowledge", "record_learning", "delete_learning"],
      methodology: "learnings",
    },
    phase: "research",
  },
  {
    name: "delete_learning",
    category: "learning",
    tags: ["delete", "remove", "outdated", "incorrect", "cleanup"],
    quickRef: {
      nextAction: "Learning deleted. Consider recording an updated learning if the information changed rather than just being wrong.",
      nextTools: ["record_learning"],
      methodology: "learnings",
    },
    phase: "utility",
  },

  // ═══ FLYWHEEL ═══
  {
    name: "get_flywheel_status",
    category: "flywheel",
    tags: ["flywheel", "status", "dual-loop", "inner", "outer", "overview"],
    quickRef: {
      nextAction: "Review both loops. Active verification cycles are inner loop, eval runs are outer loop. Address blocking items first.",
      nextTools: ["start_verification_cycle", "start_eval_run", "run_mandatory_flywheel"],
      methodology: "flywheel",
    },
    phase: "verify",
  },
  {
    name: "promote_to_eval",
    category: "flywheel",
    tags: ["promote", "inner-to-outer", "verification-to-eval", "bridge", "feed"],
    quickRef: {
      nextAction: "Verification findings promoted to eval cases. Run the eval batch to establish a baseline score.",
      nextTools: ["start_eval_run", "record_eval_result", "complete_eval_run"],
      methodology: "flywheel",
      tip: "This is how the inner loop feeds the outer loop — every verification produces eval artifacts.",
    },
    phase: "test",
  },
  {
    name: "trigger_investigation",
    category: "flywheel",
    tags: ["investigate", "regression", "outer-to-inner", "eval-to-verification"],
    quickRef: {
      nextAction: "Investigation cycle started. Follow the 6-phase verification process to root-cause the regression.",
      nextTools: ["get_verification_status", "log_phase_findings", "search_all_knowledge"],
      methodology: "flywheel",
    },
    phase: "verify",
  },
  {
    name: "run_mandatory_flywheel",
    category: "flywheel",
    tags: ["mandatory", "6-step", "minimum", "before-ship", "final-check", "deploy-gate"],
    quickRef: {
      nextAction: "All 6 steps must pass before declaring work done. If any failed, fix and re-run from step 1. Only skip for trivial changes with explicit justification.",
      nextTools: ["record_learning", "promote_to_eval"],
      methodology: "mandatory_flywheel",
      tip: "This caught a dead-code bug that smoke tests missed. Never skip it.",
    },
    phase: "ship",
  },

  // ═══ RECONNAISSANCE ═══
  {
    name: "run_recon",
    category: "reconnaissance",
    tags: ["recon", "research", "context", "gather", "plan", "sources", "investigate"],
    quickRef: {
      nextAction: "Recon session started. Visit each suggested source, then call log_recon_finding for each discovery.",
      nextTools: ["log_recon_finding", "check_framework_updates", "fetch_url", "web_search"],
      methodology: "reconnaissance",
      tip: "Include projectContext for holistic analysis. Check both external and internal sources.",
    },
    phase: "research",
  },
  {
    name: "log_recon_finding",
    category: "reconnaissance",
    tags: ["finding", "discovery", "log", "breaking-change", "deprecation", "new-feature", "pattern"],
    quickRef: {
      nextAction: "Finding logged. Continue visiting sources. When done, call get_recon_summary to aggregate.",
      nextTools: ["get_recon_summary", "log_recon_finding"],
      methodology: "reconnaissance",
    },
    phase: "research",
  },
  {
    name: "get_recon_summary",
    category: "reconnaissance",
    tags: ["summary", "aggregate", "prioritize", "action-items", "complete"],
    quickRef: {
      nextAction: "Summary generated. Use prioritized action items to inform gap analysis in your verification cycle.",
      nextTools: ["log_gap", "log_phase_findings", "record_learning"],
      methodology: "reconnaissance",
    },
    phase: "research",
  },
  {
    name: "check_framework_updates",
    category: "reconnaissance",
    tags: ["framework", "updates", "sdk", "version", "anthropic", "langchain", "openai", "google", "mcp"],
    quickRef: {
      nextAction: "Source checklist returned. Visit each source URL and log findings with log_recon_finding.",
      nextTools: ["log_recon_finding", "fetch_url", "web_search"],
      methodology: "reconnaissance",
    },
    phase: "research",
  },
  {
    name: "search_all_knowledge",
    category: "reconnaissance",
    tags: ["search", "unified", "knowledge", "learnings", "recon", "gaps", "everything", "before-start"],
    quickRef: {
      nextAction: "Review all matches across learnings, recon findings, and resolved gaps. Apply relevant past findings to current task.",
      nextTools: ["record_learning", "run_recon", "start_verification_cycle"],
      methodology: "learnings",
      tip: "ALWAYS call this before starting any new work. Past findings prevent repeating mistakes.",
    },
    phase: "research",
  },
  {
    name: "bootstrap_project",
    category: "reconnaissance",
    tags: ["bootstrap", "setup", "project", "register", "tech-stack", "architecture", "first-time"],
    quickRef: {
      nextAction: "Project registered. Now call getMethodology('overview') to see all methodologies, then search_all_knowledge for your first task.",
      nextTools: ["search_all_knowledge", "run_recon", "setup_local_env"],
      methodology: "reconnaissance",
    },
    phase: "research",
  },
  {
    name: "get_project_context",
    category: "reconnaissance",
    tags: ["project", "context", "tech-stack", "architecture", "conventions", "refresh"],
    quickRef: {
      nextAction: "Project context loaded. Use it to inform your current task. Update with bootstrap_project if anything changed.",
      nextTools: ["bootstrap_project", "search_all_knowledge"],
      methodology: "reconnaissance",
    },
    phase: "research",
  },

  // ═══ UI CAPTURE ═══
  {
    name: "capture_ui_screenshot",
    category: "ui_capture",
    tags: ["screenshot", "capture", "ui", "visual", "viewport", "mobile", "tablet", "desktop"],
    quickRef: {
      nextAction: "Screenshot captured. Send to analyze_screenshot for AI-powered visual analysis, or save for visual reference.",
      nextTools: ["analyze_screenshot", "capture_responsive_suite", "manipulate_screenshot"],
      methodology: "agentic_vision",
      tip: "Use capture_responsive_suite for 3-breakpoint coverage in one call.",
    },
    phase: "test",
  },
  {
    name: "capture_responsive_suite",
    category: "ui_capture",
    tags: ["responsive", "mobile", "tablet", "desktop", "breakpoints", "suite", "all-viewports"],
    quickRef: {
      nextAction: "3 screenshots captured (375px, 768px, 1280px). Review each for layout issues. Send to analyze_screenshot for AI analysis.",
      nextTools: ["analyze_screenshot", "run_quality_gate"],
      methodology: "ui_ux_qa",
    },
    phase: "test",
  },

  // ═══ VISION ═══
  {
    name: "discover_vision_env",
    category: "vision",
    tags: ["vision", "environment", "api-keys", "providers", "gemini", "openai", "anthropic", "setup"],
    quickRef: {
      nextAction: "Check which providers are available. Set API keys for missing ones. Gemini recommended for best agentic vision.",
      nextTools: ["capture_ui_screenshot", "analyze_screenshot"],
      methodology: "agentic_vision",
    },
    phase: "utility",
  },
  {
    name: "analyze_screenshot",
    category: "vision",
    tags: ["analyze", "vision", "ai", "layout", "spacing", "typography", "accessibility", "visual-qa"],
    quickRef: {
      nextAction: "Analysis complete. Fix identified issues, then re-capture and re-analyze. Use manipulate_screenshot to crop regions for deeper analysis.",
      nextTools: ["manipulate_screenshot", "capture_ui_screenshot", "run_quality_gate"],
      methodology: "agentic_vision",
    },
    phase: "test",
  },
  {
    name: "manipulate_screenshot",
    category: "vision",
    tags: ["crop", "resize", "annotate", "manipulate", "region", "highlight"],
    quickRef: {
      nextAction: "Image processed. Feed cropped/annotated image back to analyze_screenshot for focused analysis.",
      nextTools: ["analyze_screenshot"],
      methodology: "agentic_vision",
    },
    phase: "test",
  },
  {
    name: "diff_screenshots",
    category: "vision",
    tags: ["diff", "compare", "before-after", "visual-regression", "change-detection"],
    quickRef: {
      nextAction: "Visual diff computed. Review changed regions. If unexpected changes found, investigate and fix.",
      nextTools: ["analyze_screenshot", "log_gap"],
      methodology: "agentic_vision",
    },
    phase: "test",
  },

  // ═══ LOCAL FILE ═══
  {
    name: "read_csv_file",
    category: "local_file",
    tags: ["csv", "read", "parse", "table", "data", "spreadsheet"],
    quickRef: {
      nextAction: "CSV parsed. Use csv_select_rows to filter or csv_aggregate to compute stats.",
      nextTools: ["csv_select_rows", "csv_aggregate"],
    },
    phase: "utility",
  },
  {
    name: "read_xlsx_file",
    category: "local_file",
    tags: ["xlsx", "excel", "read", "parse", "spreadsheet", "sheet"],
    quickRef: {
      nextAction: "XLSX parsed. Use xlsx_select_rows to filter or xlsx_aggregate to compute stats.",
      nextTools: ["xlsx_select_rows", "xlsx_aggregate"],
    },
    phase: "utility",
  },
  {
    name: "csv_select_rows",
    category: "local_file",
    tags: ["csv", "filter", "select", "where", "query", "rows"],
    quickRef: {
      nextAction: "Rows filtered. Use csv_aggregate for statistics on the filtered set, or read more data.",
      nextTools: ["csv_aggregate", "read_csv_file"],
    },
    phase: "utility",
  },
  {
    name: "csv_aggregate",
    category: "local_file",
    tags: ["csv", "aggregate", "sum", "min", "max", "avg", "count", "stats"],
    quickRef: {
      nextAction: "Aggregation computed. Use the result for analysis or record as eval/test data.",
      nextTools: ["record_eval_result", "record_learning"],
    },
    phase: "utility",
  },
  {
    name: "xlsx_select_rows",
    category: "local_file",
    tags: ["xlsx", "excel", "filter", "select", "where", "query", "rows"],
    quickRef: {
      nextAction: "Rows filtered. Use xlsx_aggregate for statistics on the filtered set.",
      nextTools: ["xlsx_aggregate", "read_xlsx_file"],
    },
    phase: "utility",
  },
  {
    name: "xlsx_aggregate",
    category: "local_file",
    tags: ["xlsx", "excel", "aggregate", "sum", "min", "max", "avg", "count"],
    quickRef: {
      nextAction: "Aggregation computed. Use the result for analysis or record as eval/test data.",
      nextTools: ["record_eval_result", "record_learning"],
    },
    phase: "utility",
  },
  {
    name: "read_pdf_text",
    category: "local_file",
    tags: ["pdf", "read", "extract", "text", "pages", "document"],
    quickRef: {
      nextAction: "PDF text extracted. Use pdf_search_text to find specific content, or process the text for analysis.",
      nextTools: ["pdf_search_text"],
    },
    phase: "utility",
  },
  {
    name: "pdf_search_text",
    category: "local_file",
    tags: ["pdf", "search", "find", "query", "match", "snippet"],
    quickRef: {
      nextAction: "Matches found. Use page numbers and snippets to locate relevant sections.",
      nextTools: ["read_pdf_text"],
    },
    phase: "utility",
  },

  {
    name: "read_text_file",
    category: "local_file",
    tags: ["text", "read", "file", "txt", "md", "xml", "utf8", "slice"],
    quickRef: {
      nextAction:
        "Text read. If you need a specific region, adjust startChar/maxChars. If it's JSON/JSONL, prefer read_json_file/read_jsonl_file for structured output.",
      nextTools: ["read_json_file", "read_jsonl_file", "json_select"],
    },
    phase: "utility",
  },
  {
    name: "read_json_file",
    category: "local_file",
    tags: ["json", "read", "parse", "file", "preview", "prune"],
    quickRef: {
      nextAction: "JSON parsed (pruned for preview). Use json_select to pull an exact field/path for analysis.",
      nextTools: ["json_select", "read_text_file"],
    },
    phase: "utility",
  },
  {
    name: "json_select",
    category: "local_file",
    tags: ["json", "pointer", "select", "extract", "field", "path", "rfc6901"],
    quickRef: {
      nextAction: "Value selected via JSON Pointer. If it is still large, narrow the pointer further.",
      nextTools: ["json_select", "read_json_file"],
    },
    phase: "utility",
  },
  {
    name: "read_jsonl_file",
    category: "local_file",
    tags: ["jsonl", "ndjson", "read", "parse", "lines"],
    quickRef: {
      nextAction:
        "JSONL parsed for a bounded number of lines. Increase offsetLines/limitLines or disable parseJson to inspect raw lines.",
      nextTools: ["read_jsonl_file", "read_text_file"],
    },
    phase: "utility",
  },
  {
    name: "zip_list_files",
    category: "local_file",
    tags: ["zip", "list", "archive", "entries", "inspect"],
    quickRef: {
      nextAction:
        "ZIP entries listed. Use zip_read_text_file for small text entries or zip_extract_file to extract an attachment to disk for downstream parsing.",
      nextTools: ["zip_read_text_file", "zip_extract_file"],
    },
    phase: "utility",
  },
  {
    name: "zip_read_text_file",
    category: "local_file",
    tags: ["zip", "read", "text", "archive", "innerpath"],
    quickRef: {
      nextAction:
        "Inner ZIP text read. If you need a different file, list entries again or extract the file for structured parsing (PDF/XLSX/etc).",
      nextTools: ["zip_list_files", "zip_extract_file"],
    },
    phase: "utility",
  },
  {
    name: "zip_extract_file",
    category: "local_file",
    tags: ["zip", "extract", "archive", "file", "unzip"],
    quickRef: {
      nextAction:
        "File extracted to disk. Now parse it with the appropriate local_file tool (read_pdf_text/read_xlsx_file/read_csv_file/read_text_file/etc).",
      nextTools: ["read_pdf_text", "read_xlsx_file", "read_csv_file", "read_text_file"],
    },
    phase: "utility",
  },
  {
    name: "read_docx_text",
    category: "local_file",
    tags: ["docx", "word", "read", "extract", "text", "ooxml"],
    quickRef: {
      nextAction:
        "DOCX text extracted. Use the text to answer questions or to locate specific sections to cite.",
      nextTools: ["read_text_file"],
    },
    phase: "utility",
  },
  {
    name: "read_pptx_text",
    category: "local_file",
    tags: ["pptx", "powerpoint", "read", "extract", "slides", "text", "ooxml"],
    quickRef: {
      nextAction:
        "PPTX slide text extracted. Use the [SLIDE N] markers to locate relevant content quickly.",
      nextTools: ["read_text_file"],
    },
    phase: "utility",
  },

  // ═══ WEB ═══
  {
    name: "read_image_ocr_text",
    category: "local_file",
    tags: ["image", "ocr", "png", "jpg", "jpeg", "tesseract", "text-extraction"],
    quickRef: {
      nextAction:
        "OCR text extracted. If results are noisy, rerun with preprocess=true or set lang/langPath. Use the extracted text to answer the question or to drive follow-up calculations.",
      nextTools: ["record_eval_result", "record_learning"],
    },
    phase: "utility",
  },
  {
    name: "transcribe_audio_file",
    category: "local_file",
    tags: ["audio", "mp3", "wav", "transcribe", "speech-to-text", "whisper", "faster-whisper"],
    quickRef: {
      nextAction:
        "Audio transcribed to text. Use the transcript to answer the question, or to drive follow-up web/file parsing tasks.",
      nextTools: ["transcribe_audio_file"],
    },
    phase: "utility",
  },

  {
    name: "web_search",
    category: "web",
    tags: ["search", "web", "internet", "google", "research", "find", "discover"],
    quickRef: {
      nextAction: "Results returned. Use fetch_url to read promising pages in full. Log findings with log_recon_finding.",
      nextTools: ["fetch_url", "log_recon_finding"],
      methodology: "reconnaissance",
    },
    phase: "research",
  },
  {
    name: "fetch_url",
    category: "web",
    tags: ["fetch", "url", "read", "page", "docs", "documentation", "scrape", "content"],
    quickRef: {
      nextAction: "Content fetched. Extract key findings and log with log_recon_finding or record_learning.",
      nextTools: ["log_recon_finding", "record_learning", "web_search"],
      methodology: "reconnaissance",
    },
    phase: "research",
  },

  // ═══ RESEARCH OPTIMIZER ═══
  {
    name: "merge_research_results",
    category: "research_optimizer",
    tags: ["merge", "aggregate", "parallel", "sub-agent", "research", "join", "dataset", "coordinator"],
    quickRef: {
      nextAction: "Results merged. Use multi_criteria_score to rank options, or compare_options for a side-by-side table.",
      nextTools: ["multi_criteria_score", "compare_options"],
      methodology: "agent_contract",
      tip: "Pass a join_key that exists in all sub-agent records (e.g., 'hotel_name'). Use conflict_resolution to handle overlapping fields.",
    },
    phase: "utility",
  },
  {
    name: "multi_criteria_score",
    category: "research_optimizer",
    tags: ["score", "optimize", "rank", "criteria", "weight", "MCDM", "decision", "compare", "valuation", "points"],
    quickRef: {
      nextAction: "Options scored and ranked. Use compare_options for a formatted report, or run_quality_gate to validate thresholds.",
      nextTools: ["compare_options", "run_quality_gate", "save_session_note"],
      methodology: "agent_contract",
      tip: "Weights must sum to 1.0. Use direction 'minimize' for costs/distances, 'maximize' for value/scores. classify_field adds tier labels (e.g., cpp_value → poor/acceptable/good/excellent).",
    },
    phase: "utility",
  },
  {
    name: "compare_options",
    category: "research_optimizer",
    tags: ["compare", "table", "report", "side-by-side", "recommendation", "present", "markdown", "format"],
    quickRef: {
      nextAction: "Comparison generated. Present to user or save with save_session_note for persistence.",
      nextTools: ["save_session_note", "send_email", "record_learning"],
      methodology: "agent_contract",
      tip: "Pass score_id from multi_criteria_score to auto-load ranked results. Use highlight_fields to control column order.",
    },
    phase: "utility",
  },

  // ═══ WEB SCRAPING (Scrapling) ═══
  {
    name: "scrapling_fetch",
    category: "web_scraping",
    tags: ["scrape", "fetch", "stealth", "anti-bot", "cloudflare", "tls", "fingerprint", "crawl", "http"],
    quickRef: {
      nextAction: "Page fetched. Use scrapling_extract for structured data, or merge_research_results to combine with other sources.",
      nextTools: ["scrapling_extract", "extract_structured_data", "merge_research_results"],
      methodology: "agent_contract",
      tip: "Use tier 'stealth' for Cloudflare-protected sites, 'dynamic' for JS-rendered pages. Default 'http' works for most public pages.",
    },
    phase: "research",
  },
  {
    name: "scrapling_extract",
    category: "web_scraping",
    tags: ["extract", "css", "xpath", "selector", "structured", "parse", "scrape", "deterministic"],
    quickRef: {
      nextAction: "Data extracted. Use merge_research_results to combine sources, or multi_criteria_score to rank options.",
      nextTools: ["merge_research_results", "multi_criteria_score", "save_session_note"],
      methodology: "agent_contract",
      tip: "Zero LLM tokens — deterministic CSS/XPath extraction. Use '::text' suffix for text content, '::attr(href)' for attributes.",
    },
    phase: "research",
  },
  {
    name: "scrapling_batch_fetch",
    category: "web_scraping",
    tags: ["batch", "parallel", "multi-url", "concurrent", "bulk", "competitive", "comparison"],
    quickRef: {
      nextAction: "Batch complete. Use merge_research_results to join results by key, or scrapling_extract on individual pages.",
      nextTools: ["merge_research_results", "scrapling_extract", "multi_criteria_score"],
      methodology: "agent_contract",
      tip: "Up to 20 URLs with 1-10 concurrency. All URLs share the same tier and extraction config.",
    },
    phase: "research",
    complexity: "medium",
  },
  {
    name: "scrapling_track_element",
    category: "web_scraping",
    tags: ["track", "monitor", "element", "change", "adaptive", "price", "watch", "dom"],
    quickRef: {
      nextAction: "Element tracked. Compare with previous snapshots or set up monitoring with save_session_note.",
      nextTools: ["save_session_note", "scrapling_fetch", "multi_criteria_score"],
      methodology: "agent_contract",
      tip: "Scrapling's adaptive tracking survives CSS class renames and DOM restructuring. Great for price monitoring.",
    },
    phase: "research",
    complexity: "medium",
  },
  {
    name: "scrapling_crawl",
    category: "web_scraping",
    tags: ["crawl", "spider", "multi-page", "sitemap", "deep", "sec", "edgar", "news"],
    quickRef: {
      nextAction: "Crawl started. Poll with scrapling_crawl_status to check progress and get items.",
      nextTools: ["scrapling_crawl_status", "scrapling_crawl_stop"],
      methodology: "agent_contract",
      tip: "Returns a session_id. Set domain_whitelist to prevent crawling external sites. Max 500 pages.",
    },
    phase: "research",
    complexity: "high",
  },
  {
    name: "scrapling_crawl_status",
    category: "web_scraping",
    tags: ["crawl", "status", "progress", "poll", "items", "results"],
    quickRef: {
      nextAction: "Check if crawl is complete. If so, use merge_research_results on the items.",
      nextTools: ["merge_research_results", "scrapling_crawl_stop", "multi_criteria_score"],
      methodology: "agent_contract",
      tip: "Poll periodically until status is 'completed'. Items are available incrementally.",
    },
    phase: "research",
  },
  {
    name: "scrapling_crawl_stop",
    category: "web_scraping",
    tags: ["crawl", "stop", "abort", "pause", "cancel"],
    quickRef: {
      nextAction: "Crawl stopped. Items collected so far are preserved. Process with merge_research_results.",
      nextTools: ["merge_research_results", "scrapling_crawl_status"],
      methodology: "agent_contract",
      tip: "Use when you have enough data or need to abort. Collected items are not lost.",
    },
    phase: "research",
  },

  // ═══ GITHUB ═══
  {
    name: "search_github",
    category: "github",
    tags: ["github", "search", "repos", "repositories", "open-source", "discover", "prior-art"],
    quickRef: {
      nextAction: "Repos found. Use analyze_repo for deep-dive into promising results. Log findings with log_recon_finding.",
      nextTools: ["analyze_repo", "log_recon_finding"],
      methodology: "reconnaissance",
    },
    phase: "research",
  },
  {
    name: "analyze_repo",
    category: "github",
    tags: ["analyze", "repo", "repository", "structure", "tech-stack", "architecture", "dependencies"],
    quickRef: {
      nextAction: "Repo analyzed. Extract patterns and record with record_learning. Use fetch_url for their docs.",
      nextTools: ["record_learning", "fetch_url", "log_recon_finding"],
      methodology: "reconnaissance",
    },
    phase: "research",
  },
  {
    name: "monitor_repo",
    category: "github",
    tags: ["monitor", "watch", "repo", "changes", "releases", "issues"],
    quickRef: {
      nextAction: "Monitoring set up. Review changes periodically. Log important updates with log_recon_finding.",
      nextTools: ["log_recon_finding", "check_framework_updates"],
      methodology: "reconnaissance",
    },
    phase: "research",
  },

  // ═══ DOCUMENTATION ═══
  {
    name: "update_agents_md",
    category: "documentation",
    tags: ["agents", "documentation", "update", "read", "append", "section", "instructions"],
    quickRef: {
      nextAction: "AGENTS.md updated. Verify changes are accurate with a build/test cycle. Keep in sync with actual code.",
      nextTools: ["run_closed_loop", "record_learning"],
      methodology: "agents_md_maintenance",
    },
    phase: "ship",
  },
  {
    name: "research_job_market",
    category: "documentation",
    tags: ["job", "market", "skills", "salary", "career", "trends", "hiring"],
    quickRef: {
      nextAction: "Market data returned. Use for project ideation or learning priority decisions.",
      nextTools: ["record_learning", "web_search"],
      methodology: "project_ideation",
    },
    phase: "research",
  },
  {
    name: "setup_local_env",
    category: "documentation",
    tags: ["setup", "environment", "local", "diagnose", "api-keys", "node", "git", "package-manager"],
    quickRef: {
      nextAction: "Environment scanned. Set up any missing API keys or SDKs. Run bootstrap_project to register your project.",
      nextTools: ["bootstrap_project", "discover_vision_env"],
      methodology: "agent_bootstrap",
    },
    phase: "utility",
  },
  {
    name: "generate_report",
    category: "documentation",
    tags: ["report", "generate", "markdown", "summary", "export", "document"],
    quickRef: {
      nextAction: "Report generated. Review for accuracy. Use run_quality_gate to validate quality before sharing.",
      nextTools: ["run_quality_gate", "record_learning"],
    },
    phase: "ship",
  },

  // ═══ BOOTSTRAP / AUTONOMOUS ═══
  {
    name: "discover_infrastructure",
    category: "bootstrap",
    tags: ["discover", "infrastructure", "scan", "agent-loop", "telemetry", "evaluation", "gaps"],
    quickRef: {
      nextAction: "Scan complete. Use self_implement to bootstrap missing components. Use triple_verify to validate.",
      nextTools: ["self_implement", "triple_verify", "scaffold_directory"],
      methodology: "agent_bootstrap",
    },
    phase: "research",
  },
  {
    name: "triple_verify",
    category: "bootstrap",
    tags: ["triple", "verify", "internal", "external", "authoritative", "validation", "sources"],
    quickRef: {
      nextAction: "3-layer verification complete. Address any discrepancies found. Record findings with record_learning.",
      nextTools: ["record_learning", "generate_self_instructions"],
      methodology: "agent_bootstrap",
    },
    phase: "verify",
  },
  {
    name: "self_implement",
    category: "bootstrap",
    tags: ["self-implement", "scaffold", "bootstrap", "create", "component", "template"],
    quickRef: {
      nextAction: "Component implemented. Run run_closed_loop to verify it compiles and works. Then run_mandatory_flywheel.",
      nextTools: ["run_closed_loop", "run_mandatory_flywheel"],
      methodology: "agent_bootstrap",
    },
    phase: "implement",
  },
  {
    name: "generate_self_instructions",
    category: "bootstrap",
    tags: ["instructions", "self", "generate", "skills", "rules", "claude-md", "agents-md"],
    quickRef: {
      nextAction: "Instructions generated. Review and save to the appropriate file (AGENTS.md, CLAUDE.md, etc.).",
      nextTools: ["update_agents_md", "record_learning"],
      methodology: "agent_bootstrap",
    },
    phase: "ship",
  },
  {
    name: "connect_channels",
    category: "bootstrap",
    tags: ["channels", "slack", "telegram", "discord", "email", "web", "github", "multi-channel"],
    quickRef: {
      nextAction: "Channel data gathered. Synthesize findings across channels. Log key discoveries with log_recon_finding.",
      nextTools: ["log_recon_finding", "record_learning"],
      methodology: "agent_bootstrap",
    },
    phase: "research",
  },
  {
    name: "assess_risk",
    category: "bootstrap",
    tags: ["risk", "assess", "safety", "tier", "low", "medium", "high", "approve", "confirm"],
    quickRef: {
      nextAction: "Follow the recommendation: auto_approve → proceed, log_and_proceed → log then proceed, require_confirmation → stop and ask.",
      nextTools: ["run_autonomous_loop", "decide_re_update"],
      methodology: "autonomous_maintenance",
      tip: "Always assess risk before destructive actions (delete, push, post externally).",
    },
    phase: "verify",
  },
  {
    name: "decide_re_update",
    category: "bootstrap",
    tags: ["re-update", "create-vs-update", "file", "instructions", "documentation", "sprawl"],
    quickRef: {
      nextAction: "Follow recommendation: update_existing → edit that file, create_new → proceed, merge → add to section.",
      nextTools: ["update_agents_md", "record_learning"],
      methodology: "autonomous_maintenance",
      tip: "Always check before creating new files. Prevents documentation sprawl.",
    },
    phase: "implement",
  },
  {
    name: "run_self_maintenance",
    category: "bootstrap",
    tags: ["maintenance", "self", "check", "health", "compile", "docs-sync", "coverage"],
    quickRef: {
      nextAction: "Maintenance report ready. Address issues found. Set autoFix=true for low-risk auto-corrections.",
      nextTools: ["run_closed_loop", "record_learning"],
      methodology: "autonomous_maintenance",
    },
    phase: "verify",
  },
  {
    name: "scaffold_directory",
    category: "bootstrap",
    tags: ["scaffold", "directory", "structure", "openclaw", "template", "create"],
    quickRef: {
      nextAction: "Structure scaffolded. Use self_implement to add code templates. Then run_closed_loop to verify.",
      nextTools: ["self_implement", "run_closed_loop"],
      methodology: "autonomous_maintenance",
    },
    phase: "implement",
  },
  {
    name: "run_autonomous_loop",
    category: "bootstrap",
    tags: ["autonomous", "loop", "guardrails", "iteration", "timeout", "ralph-wiggum"],
    quickRef: {
      nextAction: "Loop completed. Review results. If stopped early, check the reason. Record patterns with record_learning.",
      nextTools: ["record_learning", "run_mandatory_flywheel"],
      methodology: "autonomous_maintenance",
    },
    phase: "verify",
  },
  {
    name: "run_tests_cli",
    category: "bootstrap",
    tags: ["test", "cli", "run", "command", "vitest", "jest", "pytest"],
    quickRef: {
      nextAction: "Tests executed. If failures, fix and re-run. When green, proceed to run_mandatory_flywheel.",
      nextTools: ["run_closed_loop", "run_mandatory_flywheel", "log_test_result"],
      methodology: "closed_loop",
    },
    phase: "test",
  },

  // ═══ SELF-EVAL ═══
  {
    name: "log_tool_call",
    category: "self_eval",
    tags: ["log", "tool", "call", "instrument", "trace", "timing", "telemetry"],
    quickRef: {
      nextAction: "Call logged. Continue working. Periodically call get_trajectory_analysis to review patterns.",
      nextTools: ["get_trajectory_analysis"],
      methodology: "self_reinforced_learning",
    },
    phase: "utility",
  },
  {
    name: "get_trajectory_analysis",
    category: "self_eval",
    tags: ["trajectory", "analysis", "patterns", "frequency", "errors", "bottlenecks"],
    quickRef: {
      nextAction: "Review topTools, topPatterns, and errorProneTools. Address bottlenecks. Get full report with get_self_eval_report.",
      nextTools: ["get_self_eval_report", "get_improvement_recommendations"],
      methodology: "self_reinforced_learning",
    },
    phase: "verify",
  },
  {
    name: "get_self_eval_report",
    category: "self_eval",
    tags: ["self-eval", "report", "health", "grade", "score", "assessment"],
    quickRef: {
      nextAction: "Review health score and grade. Focus on low-scoring areas. Get actionable items with get_improvement_recommendations.",
      nextTools: ["get_improvement_recommendations", "cleanup_stale_runs"],
      methodology: "self_reinforced_learning",
    },
    phase: "verify",
  },
  {
    name: "get_improvement_recommendations",
    category: "self_eval",
    tags: ["improvement", "recommendations", "suggestions", "gaps", "unused-tools", "optimize"],
    quickRef: {
      nextAction: "Address high-priority recommendations first. Record each fix with record_learning. Re-run self-eval to verify improvement.",
      nextTools: ["record_learning", "get_self_eval_report"],
      methodology: "self_reinforced_learning",
    },
    phase: "verify",
  },
  {
    name: "cleanup_stale_runs",
    category: "self_eval",
    tags: ["cleanup", "stale", "orphan", "runs", "eval", "verification"],
    quickRef: {
      nextAction: "Stale data cleaned. Re-run get_self_eval_report — health score should improve.",
      nextTools: ["get_self_eval_report", "synthesize_recon_to_learnings"],
      methodology: "self_reinforced_learning",
    },
    phase: "utility",
  },
  {
    name: "synthesize_recon_to_learnings",
    category: "self_eval",
    tags: ["synthesize", "recon", "learnings", "convert", "persist", "knowledge"],
    quickRef: {
      nextAction: "Recon findings converted to searchable learnings. They'll now appear in search_all_knowledge results.",
      nextTools: ["search_all_knowledge", "get_self_eval_report"],
      methodology: "self_reinforced_learning",
    },
    phase: "utility",
  },
  {
    name: "check_contract_compliance",
    category: "self_eval",
    tags: ["contract", "compliance", "audit", "trajectory", "score", "grade", "violations", "front-door", "ship-gates", "agent-eval"],
    quickRef: {
      nextAction: "Review compliance score and violations. Address CRITICAL recommendations first. Re-run after fixes to verify improvement.",
      nextTools: ["get_self_eval_report", "record_learning", "search_all_knowledge"],
      methodology: "agent_evaluation",
      tip: "Run after each agent session to measure contract adherence. Track scores over time to verify agent quality is improving.",
    },
    phase: "verify",
  },
  {
    name: "create_task_bank",
    category: "self_eval",
    tags: ["task", "bank", "eval", "ablation", "benchmark", "bugfix", "refactor", "controlled", "experiment", "harness"],
    quickRef: {
      nextAction: "Task added. Target 30-200 tasks for statistical significance. Use grade_agent_run to score runs against tasks.",
      nextTools: ["create_task_bank", "grade_agent_run", "start_eval_run"],
      methodology: "controlled_evaluation",
      tip: "Each task should have deterministic success criteria, forbidden behaviors, and a time budget. Categories: bugfix/refactor/integration/ui/security/performance/migration.",
    },
    phase: "research",
  },
  {
    name: "grade_agent_run",
    category: "self_eval",
    tags: ["grade", "run", "outcome", "process", "ablation", "comparison", "bare", "lite", "full", "score", "agent-eval"],
    quickRef: {
      nextAction: "Run graded. Compare with other conditions (bare/lite/full/cold_kb/no_gates) to isolate NodeBench MCP's value.",
      nextTools: ["grade_agent_run", "compare_eval_runs", "check_contract_compliance"],
      methodology: "controlled_evaluation",
      tip: "Run the same task under multiple conditions (ablations) and multiple trials to get statistically meaningful comparisons.",
    },
    phase: "verify",
  },

  // ═══ PARALLEL AGENTS ═══
  {
    name: "claim_agent_task",
    category: "parallel_agents",
    tags: ["claim", "task", "lock", "parallel", "agent", "coordinate", "prevent-duplicate"],
    quickRef: {
      nextAction: "Task claimed. Do the work. When done, call release_agent_task with a progress note.",
      nextTools: ["assign_agent_role", "log_context_budget", "release_agent_task"],
      methodology: "parallel_agent_teams",
      tip: "Always claim before working to prevent two agents solving the same problem.",
    },
    phase: "implement",
  },
  {
    name: "release_agent_task",
    category: "parallel_agents",
    tags: ["release", "task", "unlock", "complete", "handoff", "progress-note"],
    quickRef: {
      nextAction: "Task released. Pick next unclaimed task with list_agent_tasks, or check overall status with get_parallel_status.",
      nextTools: ["list_agent_tasks", "get_parallel_status", "claim_agent_task"],
      methodology: "parallel_agent_teams",
    },
    phase: "ship",
  },
  {
    name: "list_agent_tasks",
    category: "parallel_agents",
    tags: ["list", "tasks", "parallel", "status", "claimed", "available", "blocked"],
    quickRef: {
      nextAction: "Review task list. Claim an available task or check blocked tasks that need fresh eyes.",
      nextTools: ["claim_agent_task", "get_parallel_status"],
      methodology: "parallel_agent_teams",
    },
    phase: "research",
  },
  {
    name: "assign_agent_role",
    category: "parallel_agents",
    tags: ["role", "assign", "specialize", "implementer", "reviewer", "tester", "documenter"],
    quickRef: {
      nextAction: "Role assigned. Work within your specialization. Claim tasks matching your focus area.",
      nextTools: ["claim_agent_task", "get_agent_role"],
      methodology: "parallel_agent_teams",
    },
    phase: "implement",
  },
  {
    name: "get_agent_role",
    category: "parallel_agents",
    tags: ["role", "get", "check", "current", "specialization"],
    quickRef: {
      nextAction: "Review your role and focus area. Stay specialized — don't drift outside your lane.",
      nextTools: ["assign_agent_role", "claim_agent_task"],
      methodology: "parallel_agent_teams",
    },
    phase: "research",
  },
  {
    name: "log_context_budget",
    category: "parallel_agents",
    tags: ["context", "budget", "tokens", "window", "limit", "pollution", "checkpoint"],
    quickRef: {
      nextAction: "Budget logged. If approaching limit, summarize and checkpoint. Don't dump large outputs into context.",
      nextTools: ["release_agent_task"],
      methodology: "parallel_agent_teams",
      tip: "Pre-compute summaries instead of dumping raw test output. Log details to files.",
    },
    phase: "utility",
  },
  {
    name: "run_oracle_comparison",
    category: "parallel_agents",
    tags: ["oracle", "comparison", "reference", "known-good", "diff", "validate", "golden"],
    quickRef: {
      nextAction: "Comparison complete. If mismatch, fix the issue. Each failing comparison is an independent debuggable work item for parallel agents.",
      nextTools: ["claim_agent_task", "record_learning", "get_parallel_status"],
      methodology: "parallel_agent_teams",
    },
    phase: "test",
  },
  {
    name: "get_parallel_status",
    category: "parallel_agents",
    tags: ["parallel", "status", "overview", "all-agents", "progress", "dashboard"],
    quickRef: {
      nextAction: "Review all agent activity. Identify blocked tasks, context budget warnings, and oracle test failures.",
      nextTools: ["list_agent_tasks", "claim_agent_task", "run_oracle_comparison"],
      methodology: "parallel_agent_teams",
    },
    phase: "research",
  },
  {
    name: "bootstrap_parallel_agents",
    category: "parallel_agents",
    tags: ["bootstrap", "parallel", "scaffold", "external-repo", "infrastructure", "setup"],
    quickRef: {
      nextAction: "Gap report generated. If dryRun, review gaps then re-run with dryRun=false to scaffold. Follow the returned flywheel plan.",
      nextTools: ["generate_parallel_agents_md", "record_learning"],
      methodology: "parallel_agent_teams",
    },
    phase: "implement",
  },
  {
    name: "generate_parallel_agents_md",
    category: "parallel_agents",
    tags: ["generate", "agents-md", "parallel", "section", "documentation", "portable"],
    quickRef: {
      nextAction: "AGENTS.md section generated. Copy into the target repo's AGENTS.md. Verify with a test claim/release cycle.",
      nextTools: ["update_agents_md", "claim_agent_task", "release_agent_task"],
      methodology: "parallel_agent_teams",
    },
    phase: "ship",
  },

  // ═══ LLM ═══
  {
    name: "call_llm",
    category: "llm",
    tags: ["llm", "call", "generate", "prompt", "gemini", "openai", "anthropic", "gpt", "claude", "model", "ai", "inference", "completion", "analyze", "text"],
    quickRef: {
      nextAction: "LLM response received. Validate output quality. Use for analysis, generation, or judgment tasks.",
      nextTools: ["extract_structured_data", "record_learning"],
    },
    phase: "utility",
  },
  {
    name: "extract_structured_data",
    category: "llm",
    tags: ["extract", "structured", "data", "json", "parse", "schema", "llm", "model", "ai", "transform", "output"],
    quickRef: {
      nextAction: "Structured data extracted. Validate against expected schema. Use for downstream processing.",
      nextTools: ["record_eval_result", "record_learning"],
    },
    phase: "utility",
  },
  {
    name: "benchmark_models",
    category: "llm",
    tags: ["benchmark", "models", "compare", "latency", "quality", "cost", "llm", "ai", "gpt", "claude", "gemini", "evaluate"],
    quickRef: {
      nextAction: "Benchmark complete. Compare models on quality, latency, and cost. Record winner with record_learning.",
      nextTools: ["record_learning", "call_llm"],
    },
    phase: "test",
  },

  // ═══ SECURITY ═══
  {
    name: "scan_dependencies",
    category: "security",
    tags: ["security", "dependencies", "vulnerabilities", "audit", "npm", "cve", "supply-chain"],
    quickRef: {
      nextAction: "Scan complete. Fix critical vulnerabilities immediately. Log gaps for others.",
      nextTools: ["log_gap", "record_learning"],
    },
    phase: "verify",
  },
  {
    name: "run_code_analysis",
    category: "security",
    tags: ["security", "code", "analysis", "static", "sast", "patterns", "secrets"],
    quickRef: {
      nextAction: "Analysis complete. Fix critical findings. Record patterns with record_learning.",
      nextTools: ["log_gap", "record_learning"],
    },
    phase: "verify",
  },
  {
    name: "scan_terminal_security",
    category: "security",
    tags: ["terminal", "security", "scan", "history", "secrets", "credentials", "leak"],
    quickRef: {
      nextAction: "Terminal scan complete. Rotate any exposed credentials immediately.",
      nextTools: ["record_learning", "assess_risk"],
    },
    phase: "verify",
  },

  // ═══ PLATFORM ═══
  {
    name: "query_daily_brief",
    category: "platform",
    tags: ["daily-brief", "query", "nodebench", "platform", "morning", "intelligence"],
    quickRef: {
      nextAction: "Brief data retrieved. Use for context in your current task or for report generation.",
      nextTools: ["generate_report", "record_learning"],
    },
    phase: "research",
  },
  {
    name: "query_funding_entities",
    category: "platform",
    tags: ["funding", "entities", "query", "startups", "vc", "deals", "data"],
    quickRef: {
      nextAction: "Funding data retrieved. Analyze trends or use for content generation.",
      nextTools: ["generate_report", "record_learning"],
    },
    phase: "research",
  },
  {
    name: "query_research_queue",
    category: "platform",
    tags: ["research", "queue", "query", "tasks", "pending", "status"],
    quickRef: {
      nextAction: "Queue status retrieved. Process pending items or publish new ones.",
      nextTools: ["publish_to_queue"],
    },
    phase: "research",
  },
  {
    name: "publish_to_queue",
    category: "platform",
    tags: ["publish", "queue", "submit", "task", "research"],
    quickRef: {
      nextAction: "Published to queue. Monitor with query_research_queue for completion.",
      nextTools: ["query_research_queue"],
    },
    phase: "ship",
  },

  // ═══ RESEARCH WRITING ═══
  {
    name: "start_execution_run",
    category: "platform",
    tags: ["execution-trace", "run", "start", "session", "receipt", "workflow", "traceable", "begin"],
    quickRef: {
      nextAction: "Execution run started. Record the first meaningful step immediately so the trace has a visible timeline.",
      nextTools: ["record_execution_step", "attach_execution_evidence", "record_execution_decision"],
      methodology: "agent_bootstrap",
      tip: "Use one run per user-visible workflow. Keep the title operator-friendly because it appears in the UI.",
    },
    phase: "implement",
    complexity: "low",
  },
  {
    name: "complete_execution_run",
    category: "platform",
    tags: ["execution-trace", "run", "complete", "finish", "close", "status", "traceable", "ship"],
    quickRef: {
      nextAction: "Execution run closed. Review the resulting Execution Trace tabs to confirm evidence, decisions, and verification all landed correctly.",
      nextTools: ["record_learning", "save_session_note"],
      methodology: "closed_loop",
      tip: "Pass token usage and toolsUsed when available so the run is useful for later benchmarking.",
    },
    phase: "ship",
    complexity: "low",
  },
  {
    name: "record_execution_step",
    category: "platform",
    tags: ["execution-trace", "receipt", "step", "timeline", "workflow", "action", "traceable", "span"],
    quickRef: {
      nextAction: "Step recorded. Add evidence for supporting facts and record a decision if the step changed direction or selected an option.",
      nextTools: ["attach_execution_evidence", "record_execution_decision", "record_execution_verification"],
      methodology: "closed_loop",
      tip: "Use this for meaningful transitions only. Good traces read like operator receipts, not noisy debug logs.",
    },
    phase: "implement",
    complexity: "low",
  },
  {
    name: "record_execution_decision",
    category: "platform",
    tags: ["execution-trace", "decision", "ranking", "selection", "basis", "alternatives", "confidence", "traceable"],
    quickRef: {
      nextAction: "Decision recorded. Attach the evidence that supports it and add a limitation note if the choice depends on incomplete information.",
      nextTools: ["attach_execution_evidence", "record_execution_verification", "complete_execution_run"],
      methodology: "verification",
      tip: "Record the basis and alternatives considered. That gives explainability without exposing raw hidden reasoning.",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "record_execution_verification",
    category: "platform",
    tags: ["execution-trace", "verification", "qa", "check", "render", "formula", "artifact", "traceable"],
    quickRef: {
      nextAction: "Verification recorded. If it failed, fix the issue and record a follow-up verification so the trace shows the correction loop clearly.",
      nextTools: ["record_execution_step", "complete_execution_run", "record_learning"],
      methodology: "closed_loop",
      tip: "Use warnings for incomplete checks, failed for blocking issues, and fixed when the trace should show a successful repair.",
    },
    phase: "test",
    complexity: "low",
  },
  {
    name: "attach_execution_evidence",
    category: "platform",
    tags: ["execution-trace", "evidence", "sources", "truth-boundary", "urls", "files", "support", "claims"],
    quickRef: {
      nextAction: "Evidence attached. Cross-check that unsupported claims are listed explicitly before you finalize the run.",
      nextTools: ["record_execution_decision", "record_execution_verification", "complete_execution_run"],
      methodology: "reconnaissance",
      tip: "Use supportedClaims and unsupportedClaims to make the truth boundary visible in the run, not just in the final answer.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "request_execution_approval",
    category: "platform",
    tags: ["execution-trace", "approval", "human-in-the-loop", "risk", "gate", "policy", "handoff", "traceable"],
    quickRef: {
      nextAction: "Approval requested. Pause risky execution and let the operator resolve the pending gate before continuing.",
      nextTools: ["record_execution_step", "record_execution_verification", "complete_execution_run"],
      methodology: "quality_gates",
      tip: "Use for externally visible writes, destructive edits, or any action you would want an operator to justify later.",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "polish_academic_text",
    category: "research_writing",
    tags: ["polish", "academic", "writing", "grammar", "tone", "venue", "neurips", "icml"],
    quickRef: {
      nextAction: "Text polished. Run remove_ai_signatures to eliminate AI-generated patterns. Then check_paper_logic.",
      nextTools: ["remove_ai_signatures", "check_paper_logic"],
      methodology: "academic_paper_writing",
    },
    phase: "implement",
  },
  {
    name: "translate_academic",
    category: "research_writing",
    tags: ["translate", "academic", "chinese", "english", "bilingual", "latex"],
    quickRef: {
      nextAction: "Translation complete. Run polish_academic_text on the translated text, then check_paper_logic.",
      nextTools: ["polish_academic_text", "check_paper_logic"],
      methodology: "academic_paper_writing",
    },
    phase: "implement",
  },
  {
    name: "compress_or_expand_text",
    category: "research_writing",
    tags: ["compress", "expand", "length", "page-limit", "word-count", "adjust"],
    quickRef: {
      nextAction: "Length adjusted. Verify the text still reads naturally. Run check_paper_logic to confirm no logic was lost.",
      nextTools: ["check_paper_logic", "polish_academic_text"],
      methodology: "academic_paper_writing",
    },
    phase: "implement",
  },
  {
    name: "remove_ai_signatures",
    category: "research_writing",
    tags: ["ai-signatures", "remove", "de-ai", "leverage", "delve", "tapestry", "detection"],
    quickRef: {
      nextAction: "AI patterns removed. Run check_paper_logic to verify the rewrite maintained meaning.",
      nextTools: ["check_paper_logic", "polish_academic_text"],
      methodology: "academic_paper_writing",
    },
    phase: "implement",
  },
  {
    name: "check_paper_logic",
    category: "research_writing",
    tags: ["logic", "check", "contradictions", "terminology", "undefined-terms", "review"],
    quickRef: {
      nextAction: "Logic check complete. Fix critical/high issues. Then run review_paper_as_reviewer for full peer review simulation.",
      nextTools: ["review_paper_as_reviewer", "polish_academic_text"],
      methodology: "academic_paper_writing",
    },
    phase: "verify",
  },
  {
    name: "generate_academic_caption",
    category: "research_writing",
    tags: ["caption", "figure", "table", "academic", "generate", "publication"],
    quickRef: {
      nextAction: "Caption generated. Use short version in paper, detailed in appendix. Run check_paper_logic on the full section.",
      nextTools: ["check_paper_logic"],
      methodology: "academic_paper_writing",
    },
    phase: "implement",
  },
  {
    name: "analyze_experiment_data",
    category: "research_writing",
    tags: ["experiment", "data", "analysis", "results", "latex", "table", "comparison"],
    quickRef: {
      nextAction: "Analysis generated. Verify all conclusions are grounded in provided data. Run check_paper_logic.",
      nextTools: ["check_paper_logic", "generate_academic_caption"],
      methodology: "academic_paper_writing",
    },
    phase: "implement",
  },
  {
    name: "review_paper_as_reviewer",
    category: "research_writing",
    tags: ["review", "peer-review", "reviewer", "harsh", "weaknesses", "submission"],
    quickRef: {
      nextAction: "Review complete. Address critical weaknesses before submission. Use polish_academic_text for rewrites.",
      nextTools: ["polish_academic_text", "compress_or_expand_text", "record_learning"],
      methodology: "academic_paper_writing",
    },
    phase: "verify",
  },

  // ═══ FLICKER DETECTION ═══
  {
    name: "run_flicker_detection",
    category: "flicker_detection",
    tags: ["flicker", "detection", "android", "ui", "visual-regression", "surfaceflinger"],
    quickRef: {
      nextAction: "Detection complete. Review SSIM scores and flagged frames. Use generate_flicker_report for a full report.",
      nextTools: ["generate_flicker_report", "record_learning"],
    },
    phase: "test",
  },
  {
    name: "capture_surface_stats",
    category: "flicker_detection",
    tags: ["surface", "stats", "surfaceflinger", "android", "metrics"],
    quickRef: {
      nextAction: "Surface stats captured. Feed into run_flicker_detection for full analysis.",
      nextTools: ["run_flicker_detection"],
    },
    phase: "test",
  },
  {
    name: "extract_video_frames",
    category: "flicker_detection",
    tags: ["video", "frames", "extract", "ffmpeg", "screenshots"],
    quickRef: {
      nextAction: "Frames extracted. Feed into compute_ssim_analysis for pixel-level comparison.",
      nextTools: ["compute_ssim_analysis"],
    },
    phase: "test",
  },
  {
    name: "compute_ssim_analysis",
    category: "flicker_detection",
    tags: ["ssim", "analysis", "similarity", "pixel", "comparison", "threshold"],
    quickRef: {
      nextAction: "SSIM computed. Low scores indicate visual flicker. Use generate_flicker_report for formatted output.",
      nextTools: ["generate_flicker_report"],
    },
    phase: "test",
  },
  {
    name: "generate_flicker_report",
    category: "flicker_detection",
    tags: ["report", "flicker", "generate", "summary", "visualization"],
    quickRef: {
      nextAction: "Report generated. Share with the team. Record flicker patterns with record_learning.",
      nextTools: ["record_learning", "run_quality_gate"],
    },
    phase: "ship",
  },

  // ═══ FIGMA FLOW ═══
  {
    name: "analyze_figma_flows",
    category: "figma_flow",
    tags: ["figma", "analyze", "flows", "design", "ux", "user-journey"],
    quickRef: {
      nextAction: "Flows analyzed. Use cluster_figma_flows to group by patterns. Use render_flow_visualization for visual output.",
      nextTools: ["cluster_figma_flows", "render_flow_visualization"],
    },
    phase: "research",
  },
  {
    name: "extract_figma_frames",
    category: "figma_flow",
    tags: ["figma", "frames", "extract", "design", "components"],
    quickRef: {
      nextAction: "Frames extracted. Feed into analyze_figma_flows for flow analysis.",
      nextTools: ["analyze_figma_flows"],
    },
    phase: "research",
  },
  {
    name: "cluster_figma_flows",
    category: "figma_flow",
    tags: ["figma", "cluster", "group", "patterns", "sections", "prototypes"],
    quickRef: {
      nextAction: "Flows clustered. Use render_flow_visualization to create visual diagrams.",
      nextTools: ["render_flow_visualization"],
    },
    phase: "research",
  },
  {
    name: "render_flow_visualization",
    category: "figma_flow",
    tags: ["figma", "render", "visualization", "diagram", "flow-chart"],
    quickRef: {
      nextAction: "Visualization rendered. Share with team. Record design patterns with record_learning.",
      nextTools: ["record_learning"],
    },
    phase: "ship",
  },

  // ═══ BOILERPLATE ═══
  {
    name: "scaffold_nodebench_project",
    category: "boilerplate",
    tags: ["scaffold", "boilerplate", "project", "template", "setup", "init", "create", "agents-md", "mcp-json"],
    quickRef: {
      nextAction: "Project scaffolded. Run get_boilerplate_status to verify completeness. Then bootstrap_project to register with NodeBench.",
      nextTools: ["get_boilerplate_status", "bootstrap_project", "run_closed_loop"],
      methodology: "agent_bootstrap",
      tip: "Use dryRun=true first to preview what will be created. Enable includeParallelAgents and includeGithubActions for full infra.",
    },
    phase: "implement",
  },
  {
    name: "get_boilerplate_status",
    category: "boilerplate",
    tags: ["status", "boilerplate", "check", "completeness", "missing", "audit", "gaps"],
    quickRef: {
      nextAction: "Review missing files and recommendations. Run scaffold_nodebench_project to fill gaps.",
      nextTools: ["scaffold_nodebench_project", "bootstrap_project"],
      methodology: "agent_bootstrap",
    },
    phase: "verify",
  },

  // ═══ BENCHMARK ═══
  {
    name: "start_autonomy_benchmark",
    category: "benchmark",
    tags: ["benchmark", "autonomy", "c-compiler", "challenge", "start", "measure", "capability", "anthropic"],
    quickRef: {
      nextAction: "Benchmark started. Work through milestones in order. Call log_benchmark_milestone after each verified step.",
      nextTools: ["log_benchmark_milestone", "run_closed_loop", "claim_agent_task"],
      methodology: "verification",
      tip: "Use challenge='list' to see all available challenges with difficulty and point breakdowns.",
    },
    phase: "test",
  },
  {
    name: "log_benchmark_milestone",
    category: "benchmark",
    tags: ["benchmark", "milestone", "log", "progress", "points", "verify", "step"],
    quickRef: {
      nextAction: "Milestone recorded. Continue to next milestone. Call complete_autonomy_benchmark when done or stuck.",
      nextTools: ["log_benchmark_milestone", "complete_autonomy_benchmark", "run_closed_loop"],
      methodology: "verification",
      tip: "Only verified milestones earn points. Use run_closed_loop to verify each milestone passes tests.",
    },
    phase: "test",
  },
  {
    name: "complete_autonomy_benchmark",
    category: "benchmark",
    tags: ["benchmark", "complete", "score", "grade", "finish", "analysis", "report"],
    quickRef: {
      nextAction: "Benchmark scored. Review strengths/weaknesses analysis. Record patterns with record_learning for future improvement.",
      nextTools: ["record_learning", "start_autonomy_benchmark", "promote_to_eval"],
      methodology: "eval",
      tip: "Compare scores across runs to measure agent improvement over time.",
    },
    phase: "ship",
  },

  // ═══ PROGRESSIVE DISCOVERY ═══
  {
    name: "discover_tools",
    category: "progressive_discovery",
    tags: ["discover", "search", "find", "tools", "hybrid", "relevance", "score", "explore"],
    quickRef: {
      nextAction: "Tools ranked by relevance. Call the top result, or use get_tool_quick_ref for detailed guidance on any tool.",
      nextTools: ["get_tool_quick_ref", "get_workflow_chain"],
      tip: "Filter by category or phase to narrow results. Check matchingWorkflows for recommended sequences.",
    },
    phase: "meta",
  },
  {
    name: "get_tool_quick_ref",
    category: "progressive_discovery",
    tags: ["quick-ref", "guidance", "next-step", "tool", "details", "related", "chain"],
    quickRef: {
      nextAction: "Quick ref loaded. Follow the nextAction guidance. Use includeRelatedDetails=true for deep chain exploration.",
      nextTools: ["discover_tools", "get_workflow_chain"],
      tip: "This is your compass — call it whenever you're unsure what to do after using a tool.",
    },
    phase: "meta",
  },
  {
    name: "get_workflow_chain",
    category: "progressive_discovery",
    tags: ["workflow", "chain", "sequence", "steps", "guide", "recipe", "end-to-end"],
    quickRef: {
      nextAction: "Chain loaded. Follow steps in order. Each step includes the tool to call and quickRef for guidance.",
      nextTools: ["discover_tools", "get_tool_quick_ref"],
      tip: "Use chain='list' to see all available workflow chains. Great for learning the system.",
    },
    phase: "meta",
  },

  // ═══ META ═══
  {
    name: "findTools",
    category: "meta",
    tags: ["find", "search", "discover", "tools", "available", "what-can-i-do"],
    quickRef: {
      nextAction: "Tools found. Call the most relevant tool, or use getMethodology for step-by-step guidance on a full workflow.",
      nextTools: ["getMethodology"],
      tip: "Use category filter to narrow results. Use discover_tools for hybrid search with relevance scoring.",
    },
    phase: "meta",
  },
  {
    name: "getMethodology",
    category: "meta",
    tags: ["methodology", "guide", "steps", "workflow", "how-to", "process", "overview"],
    quickRef: {
      nextAction: "Follow the steps in order. Each step lists the tools to use. Start with step 1.",
      nextTools: ["findTools"],
      tip: "Call with 'overview' to see all available methodologies.",
    },
    phase: "meta",
  },
  {
    name: "check_mcp_setup",
    category: "meta",
    tags: ["setup", "wizard", "diagnostic", "config", "env", "api-key", "onboarding", "health-check", "status", "readiness"],
    quickRef: {
      nextAction: "Review the readiness report. Configure missing domains by following setupInstructions. Re-run to verify.",
      nextTools: ["check_email_setup", "discover_tools", "getMethodology"],
      tip: "Run this FIRST when starting with NodeBench MCP. Checks all env vars, API keys, npm packages, and servers across every domain.",
    },
    phase: "meta",
  },
  // ── Image solver tools (GAIA media lane) ──────────────────────────────
  {
    name: "solve_red_green_deviation_average_from_image",
    category: "gaia_solvers",
    tags: ["image", "ocr", "statistics", "deviation", "red", "green", "color", "pixel", "media"],
    quickRef: {
      nextAction: "Pass the image path. Tool extracts red/green numbers via color masking, computes population/sample std-dev, returns average.",
      nextTools: ["read_image_ocr_text", "log_test_result"],
      methodology: "gaia_media_solve",
      tip: "Specify decimals parameter for precision control (default 2).",
    },
    phase: "utility",
  },
  {
    name: "solve_green_polygon_area_from_image",
    category: "gaia_solvers",
    tags: ["image", "polygon", "area", "green", "geometry", "pixel", "ocr", "media"],
    quickRef: {
      nextAction: "Pass the image path. Tool segments green pixels, traces boundary, reads purple labels for scale, computes area via Shoelace formula.",
      nextTools: ["read_image_ocr_text", "log_test_result"],
      methodology: "gaia_media_solve",
      tip: "Works best on clean diagrams with distinct green fill and purple numeric labels.",
    },
    phase: "utility",
  },
  {
    name: "grade_fraction_quiz_from_image",
    category: "gaia_solvers",
    tags: ["image", "ocr", "fractions", "quiz", "grading", "math", "score", "media"],
    quickRef: {
      nextAction: "Pass image path and scoring params (bonusPoints, pointsAddSubtract, etc.). Tool OCRs problems, computes correct answers, grades each.",
      nextTools: ["read_image_ocr_text", "log_test_result"],
      methodology: "gaia_media_solve",
      tip: "Extracts problem types (add/sub, mul/div, improper, mixed) and scores per type.",
    },
    phase: "utility",
  },
  {
    name: "extract_fractions_and_simplify_from_image",
    category: "gaia_solvers",
    tags: ["image", "ocr", "fractions", "simplify", "math", "worksheet", "media"],
    quickRef: {
      nextAction: "Pass image path. Tool detects slash fractions in body text and stacked fractions in worksheet region, simplifies all via GCD.",
      nextTools: ["read_image_ocr_text", "log_test_result"],
      methodology: "gaia_media_solve",
      tip: "Returns comma-separated simplified fractions. Handles both 3/4 and stacked numerator-over-denominator formats.",
    },
    phase: "utility",
  },
  {
    name: "solve_bass_clef_age_from_image",
    category: "gaia_solvers",
    tags: ["image", "ocr", "music", "bass-clef", "notes", "staff", "media"],
    quickRef: {
      nextAction: "Pass image path. Tool detects staff lines, maps note positions to bass-clef letters, forms a word, and derives the age value.",
      nextTools: ["read_image_ocr_text", "log_test_result"],
      methodology: "gaia_media_solve",
      tip: "Works on simple single-staff bass-clef images. Upscales small images for robust detection.",
    },
    phase: "utility",
  },
  {
    name: "solve_storage_upgrade_cost_per_file_from_image",
    category: "gaia_solvers",
    tags: ["image", "ocr", "storage", "pricing", "cost", "upgrade", "media"],
    quickRef: {
      nextAction: "Pass image path and plan params (currentPlanName, filesUploaded, overLimitGb, additionalFiles). Tool OCRs pricing table and computes cost/file.",
      nextTools: ["read_image_ocr_text", "log_test_result"],
      methodology: "gaia_media_solve",
      tip: "Detects plan tiers (Standard/Plus/Premium) and their storage limits from the image.",
    },
    phase: "utility",
  },

  // ═══ SESSION MEMORY (inspired by claude-mem, planning-with-files, oh-my-claudecode) ═══
  {
    name: "save_session_note",
    category: "session_memory",
    tags: ["note", "save", "persist", "compaction", "memory", "finding", "decision", "progress", "filesystem"],
    quickRef: {
      nextAction: "Note saved to filesystem. Continue working — it survives context compaction. Use load_session_notes after /clear to recover.",
      nextTools: ["load_session_notes", "refresh_task_context", "record_learning"],
      methodology: "session_recovery",
      tip: "Call after every major finding or decision. 2-action save rule: save after every 2 web searches.",
    },
    phase: "utility",
  },
  {
    name: "load_session_notes",
    category: "session_memory",
    tags: ["note", "load", "recover", "compaction", "resume", "session", "filesystem", "context"],
    quickRef: {
      nextAction: "Notes loaded. Review findings and decisions, then continue where you left off. Use refresh_task_context for a full context refresher.",
      nextTools: ["refresh_task_context", "search_all_knowledge", "save_session_note"],
      methodology: "session_recovery",
      tip: "Use date='all' to search across sessions. Use keyword filter to find specific topics.",
    },
    phase: "research",
  },
  {
    name: "refresh_task_context",
    category: "session_memory",
    tags: ["refresh", "context", "attention", "drift", "goal", "focus", "recite", "mid-session", "compaction"],
    quickRef: {
      nextAction: "Context refreshed. Re-read the taskDescription and open gaps. Focus on the highest-severity gap first.",
      nextTools: ["save_session_note", "get_verification_status", "search_all_knowledge"],
      methodology: "session_recovery",
      tip: "Call after 30+ tool calls to prevent attention drift. Re-state your original goal in taskDescription.",
    },
    phase: "meta",
  },

  // ═══ TOON FORMAT ═══
  {
    name: "toon_encode",
    category: "toon",
    tags: ["toon", "encode", "token", "compress", "serialize", "format", "json", "optimize"],
    quickRef: {
      nextAction: "Data encoded to TOON. Pass the toon string to another LLM call or agent for ~40% token savings.",
      nextTools: ["toon_decode", "save_session_note"],
      methodology: "toon_format",
      tip: "Use for large data payloads before LLM calls. Savings compound in iterative workflows.",
    },
    phase: "utility",
  },
  {
    name: "toon_decode",
    category: "toon",
    tags: ["toon", "decode", "parse", "deserialize", "format", "json"],
    quickRef: {
      nextAction: "Data decoded to JSON. Process the result with any standard tool.",
      nextTools: ["toon_encode"],
      methodology: "toon_format",
    },
    phase: "utility",
  },

  // ═══ PATTERN MINING ═══
  {
    name: "mine_session_patterns",
    category: "pattern",
    tags: ["pattern", "mine", "session", "trajectory", "bigram", "trigram", "sequence", "analytics"],
    quickRef: {
      nextAction: "Patterns extracted. Review success rates — high-failure sequences indicate workflow issues. Use predict_risks_from_patterns before your next task.",
      nextTools: ["predict_risks_from_patterns", "record_learning"],
      methodology: "self_reinforced_learning",
      tip: "Run periodically to discover which tool sequences reliably succeed vs fail.",
    },
    phase: "meta",
  },
  {
    name: "predict_risks_from_patterns",
    category: "pattern",
    tags: ["predict", "risk", "pattern", "failure", "session", "forecast", "gap"],
    quickRef: {
      nextAction: "Risk predictions generated. Address high-confidence risks before starting. Use assess_risk for formal risk assessment.",
      nextTools: ["assess_risk", "search_all_knowledge", "mine_session_patterns"],
      methodology: "self_reinforced_learning",
      tip: "Run at the start of every task to catch known failure modes before they bite.",
    },
    phase: "research",
  },

  // ═══ AGENT MAILBOX ═══
  {
    name: "send_agent_message",
    category: "parallel_agents",
    tags: ["message", "send", "mailbox", "agent", "handoff", "communication", "blocker"],
    quickRef: {
      nextAction: "Message sent. The recipient will see it when they call check_agent_inbox. For urgent blockers, use broadcast_agent_update instead.",
      nextTools: ["check_agent_inbox", "broadcast_agent_update", "get_parallel_status"],
      methodology: "parallel_agent_teams",
    },
    phase: "implement",
  },
  {
    name: "check_agent_inbox",
    category: "parallel_agents",
    tags: ["inbox", "check", "message", "mailbox", "agent", "read", "handoff"],
    quickRef: {
      nextAction: "Messages retrieved. Handle blockers first (CRITICAL priority). Task assignments should be claimed with claim_agent_task.",
      nextTools: ["claim_agent_task", "send_agent_message", "get_parallel_status"],
      methodology: "parallel_agent_teams",
      tip: "Call at session start to pick up handoffs and blockers from other agents.",
    },
    phase: "research",
  },
  {
    name: "broadcast_agent_update",
    category: "parallel_agents",
    tags: ["broadcast", "update", "agent", "status", "announce", "milestone"],
    quickRef: {
      nextAction: "Broadcast sent to all agents. Continue your work — others will see it in their inbox.",
      nextTools: ["get_parallel_status", "send_agent_message"],
      methodology: "parallel_agent_teams",
    },
    phase: "implement",
  },

  // ═══ GIT WORKFLOW ═══
  {
    name: "check_git_compliance",
    category: "git_workflow",
    tags: ["git", "compliance", "branch", "commit", "conventional", "protected"],
    quickRef: {
      nextAction: "Git compliance checked. Fix any warnings before proceeding. If on a protected branch, create a feature branch first.",
      nextTools: ["review_pr_checklist", "enforce_merge_gate", "assess_risk"],
      methodology: "verification",
      tip: "Run before starting work to ensure you're on the right branch with clean state.",
    },
    phase: "verify",
  },
  {
    name: "review_pr_checklist",
    category: "git_workflow",
    tags: ["pr", "pull-request", "review", "checklist", "merge", "code-review"],
    quickRef: {
      nextAction: "PR checklist evaluated. Address failing items. If verificationCycleId provided, cross-references NodeBench verification status.",
      nextTools: ["enforce_merge_gate", "run_quality_gate", "record_learning"],
    },
    phase: "verify",
  },
  {
    name: "enforce_merge_gate",
    category: "git_workflow",
    tags: ["merge", "gate", "pre-merge", "validation", "branch", "deploy"],
    quickRef: {
      nextAction: "Merge gate evaluated. If canMerge=false, resolve all blockingIssues before merging.",
      nextTools: ["check_git_compliance", "run_quality_gate", "run_mandatory_flywheel"],
      methodology: "verification",
      tip: "Enable requireVerification and requireTests for maximum safety.",
    },
    phase: "ship",
  },

  // ═══ SEO ═══
  {
    name: "seo_audit_url",
    category: "seo",
    tags: ["seo", "audit", "meta", "title", "description", "og", "heading", "structured-data"],
    quickRef: {
      nextAction: "SEO audit complete. Address low-scoring elements first. Use analyze_seo_content for deeper content analysis.",
      nextTools: ["analyze_seo_content", "check_page_performance", "check_wordpress_site"],
      methodology: "seo_audit",
    },
    phase: "verify",
  },
  {
    name: "check_page_performance",
    category: "seo",
    tags: ["performance", "speed", "response-time", "compression", "cache", "lighthouse"],
    quickRef: {
      nextAction: "Performance checked. Enable compression and caching if missing. For deeper analysis, use browser dev tools.",
      nextTools: ["seo_audit_url", "record_learning"],
      methodology: "seo_audit",
    },
    phase: "verify",
  },
  {
    name: "analyze_seo_content",
    category: "seo",
    tags: ["content", "readability", "keyword", "density", "flesch-kincaid", "headings", "links"],
    quickRef: {
      nextAction: "Content analyzed. Target readability score 60-80. Keyword density 0.5-3% is optimal.",
      nextTools: ["seo_audit_url", "record_learning"],
      methodology: "seo_audit",
    },
    phase: "verify",
  },
  {
    name: "check_wordpress_site",
    category: "seo",
    tags: ["wordpress", "wp", "security", "login", "xmlrpc", "plugin", "theme"],
    quickRef: {
      nextAction: "WordPress check complete. Address security risks (xmlrpc, exposed login) immediately. Use scan_wordpress_updates for vulnerability details.",
      nextTools: ["scan_wordpress_updates", "seo_audit_url", "record_learning"],
      methodology: "seo_audit",
    },
    phase: "verify",
  },
  {
    name: "scan_wordpress_updates",
    category: "seo",
    tags: ["wordpress", "plugin", "theme", "vulnerability", "wpscan", "update", "cve"],
    quickRef: {
      nextAction: "WordPress scan complete. Update plugins with known vulnerabilities immediately. Provide wpscanApiToken for full vulnerability data.",
      nextTools: ["check_wordpress_site", "record_learning"],
      methodology: "seo_audit",
    },
    phase: "verify",
  },

  // ═══ VOICE BRIDGE ═══
  {
    name: "design_voice_pipeline",
    category: "voice_bridge",
    tags: ["voice", "pipeline", "stt", "tts", "architecture", "design", "latency", "whisper", "deepgram"],
    quickRef: {
      nextAction: "Pipeline designed. Review the recommended stack. Use analyze_voice_config to validate compatibility, then generate_voice_scaffold for starter code.",
      nextTools: ["analyze_voice_config", "generate_voice_scaffold", "benchmark_voice_latency"],
      methodology: "voice_bridge",
    },
    phase: "research",
  },
  {
    name: "analyze_voice_config",
    category: "voice_bridge",
    tags: ["voice", "config", "validate", "compatibility", "cost", "bottleneck"],
    quickRef: {
      nextAction: "Config analyzed. Address compatibility issues and bottlenecks. Use benchmark_voice_latency to compare alternatives.",
      nextTools: ["benchmark_voice_latency", "generate_voice_scaffold", "design_voice_pipeline"],
      methodology: "voice_bridge",
    },
    phase: "research",
  },
  {
    name: "generate_voice_scaffold",
    category: "voice_bridge",
    tags: ["voice", "scaffold", "code", "template", "whisper", "deepgram", "webspeech", "piper"],
    quickRef: {
      nextAction: "Scaffold generated. Write files to disk, install dependencies, and test the pipeline. Use run_closed_loop for build verification.",
      nextTools: ["run_closed_loop", "log_test_result", "record_learning"],
      methodology: "voice_bridge",
    },
    phase: "implement",
  },
  {
    name: "benchmark_voice_latency",
    category: "voice_bridge",
    tags: ["voice", "benchmark", "latency", "comparison", "performance", "streaming"],
    quickRef: {
      nextAction: "Latency benchmarked. Pick the config rated 'excellent' or 'good'. Use generate_voice_scaffold with the winning stack.",
      nextTools: ["generate_voice_scaffold", "design_voice_pipeline", "record_learning"],
      methodology: "voice_bridge",
    },
    phase: "research",
  },

  // ═══ CRITTER (pre-action intentionality check) ═══
  {
    name: "critter_check",
    category: "critter",
    tags: ["intentionality", "why", "who", "purpose", "audience", "reflection", "scope", "pre-action", "metacognition"],
    quickRef: {
      nextAction: "Answered critter check. If verdict is 'proceed', continue with your task. If 'reconsider', sharpen answers and re-run.",
      nextTools: ["save_session_note", "start_verification_cycle", "run_recon"],
      methodology: "agent_contract",
      tip: "Call at the start of any non-trivial task. Prevents scope creep and aimless exploration.",
    },
    phase: "research",
  },

  // ═══ EMAIL (SMTP send, IMAP read, draft replies) ═══
  {
    name: "send_email",
    category: "email",
    tags: ["email", "smtp", "send", "gmail", "notification", "alert", "digest", "report"],
    quickRef: {
      nextAction: "Email sent. Log the action with save_session_note and continue with your workflow.",
      nextTools: ["save_session_note", "record_learning", "build_research_digest"],
      methodology: "agent_contract",
      tip: "Requires EMAIL_USER and EMAIL_PASS env vars. For Gmail, use an App Password. Supports html parameter for rich emails.",
    },
    phase: "implement",
  },
  {
    name: "read_emails",
    category: "email",
    tags: ["email", "imap", "read", "inbox", "gmail", "fetch", "messages", "unread"],
    quickRef: {
      nextAction: "Emails retrieved. Review subjects/content, then draft_email_reply for actionable items or save_session_note to persist context.",
      nextTools: ["draft_email_reply", "save_session_note", "extract_structured_data"],
      methodology: "agent_contract",
      tip: "Requires EMAIL_USER and EMAIL_PASS env vars. Use folder param for specific mailboxes (INBOX default). Limit controls count.",
    },
    phase: "research",
  },
  {
    name: "draft_email_reply",
    category: "email",
    tags: ["email", "reply", "draft", "compose", "response", "assistant"],
    quickRef: {
      nextAction: "Draft generated. Review the draft, then send_email to deliver or edit and re-draft.",
      nextTools: ["send_email", "save_session_note"],
      methodology: "agent_contract",
      tip: "Generates a professional reply draft from original email context. Always review before sending.",
    },
    phase: "implement",
  },

  // ═══ RSS (subscribe, fetch, digest feeds) ═══
  {
    name: "add_rss_source",
    category: "rss",
    tags: ["rss", "atom", "feed", "subscribe", "source", "monitor", "research", "news"],
    quickRef: {
      nextAction: "RSS source registered. Call fetch_rss_feeds to pull articles, then build_research_digest for a summary.",
      nextTools: ["fetch_rss_feeds", "build_research_digest", "save_session_note"],
      methodology: "research_digest",
      tip: "Validates the feed URL on add. Use category param to group sources for filtered digests.",
    },
    phase: "research",
  },
  {
    name: "fetch_rss_feeds",
    category: "rss",
    tags: ["rss", "atom", "feed", "fetch", "articles", "news", "update", "pull"],
    quickRef: {
      nextAction: "Feeds fetched. New articles stored in SQLite. Call build_research_digest to generate a summary of new items.",
      nextTools: ["build_research_digest", "save_session_note", "record_learning"],
      methodology: "research_digest",
      tip: "Deduplicates automatically — same article won't be stored twice. Fetches all registered sources if no URLs specified.",
    },
    phase: "research",
  },
  {
    name: "build_research_digest",
    category: "rss",
    tags: ["rss", "digest", "summary", "research", "newsletter", "report", "markdown", "html"],
    quickRef: {
      nextAction: "Digest generated. Use send_email with html format to distribute, or save_session_note to persist the digest.",
      nextTools: ["send_email", "save_session_note", "record_learning"],
      methodology: "research_digest",
      tip: "Marks articles as seen after digest — next call only shows truly new content. Use format='html' for email-ready output.",
    },
    phase: "implement",
  },

  // ═══ SETUP WIZARDS ═══
  {
    name: "check_email_setup",
    category: "email",
    tags: ["email", "setup", "wizard", "diagnostic", "config", "smtp", "imap", "onboarding", "gmail", "outlook"],
    quickRef: {
      nextAction: "Setup check complete. If ready, try send_email or read_emails. If not, follow the setup instructions.",
      nextTools: ["send_email", "read_emails", "get_workflow_chain"],
      methodology: "agent_contract",
      tip: "Run this FIRST before using any email tools. Tests SMTP/IMAP connections and generates MCP config snippets.",
    },
    phase: "research",
  },
  {
    name: "scaffold_research_pipeline",
    category: "rss",
    tags: ["rss", "scaffold", "pipeline", "project", "cron", "automation", "digest", "email", "standalone", "setup", "wizard"],
    quickRef: {
      nextAction: "Pipeline scaffolded. Save the generated files, configure .env, add feeds, and run.",
      nextTools: ["save_session_note", "check_email_setup"],
      methodology: "research_digest",
      tip: "Generates a ZERO-dependency standalone Node.js project. Copy files, add feeds, run. No nodebench-mcp needed at runtime.",
    },
    phase: "implement",
  },

  // ═══════════════════════════════════════════
  // UI/UX FULL DIVE — Parallel subagent swarm
  // ═══════════════════════════════════════════
  {
    name: "start_ui_dive",
    category: "ui_ux_dive",
    tags: ["ui", "ux", "dive", "session", "traversal", "swarm", "parallel", "subagent", "app", "start"],
    quickRef: {
      nextAction: "Session created. Navigate to the app URL, identify top-level pages, and register each with register_component.",
      nextTools: ["register_component", "start_component_flow", "get_dive_tree"],
      methodology: "agentic_vision",
      tip: "Set agentCount to the number of parallel subagents you plan to use. Each subagent gets isolated context.",
    },
    phase: "research",
  },
  {
    name: "register_component",
    category: "ui_ux_dive",
    tags: ["ui", "component", "register", "tree", "hierarchy", "page", "section", "form", "modal", "menu"],
    quickRef: {
      nextAction: "Component registered in the tree. Claim it for traversal with start_component_flow, or register child components under it.",
      nextTools: ["start_component_flow", "register_component", "get_dive_tree"],
      methodology: "agentic_vision",
      tip: "Build the tree top-down: pages first, then sections, then interactive elements. Use parentId to nest.",
    },
    phase: "research",
  },
  {
    name: "start_component_flow",
    category: "ui_ux_dive",
    tags: ["ui", "component", "claim", "flow", "agent", "subagent", "context", "isolation", "start"],
    quickRef: {
      nextAction: "Component claimed. Interact with it: log_interaction for each step, tag_ui_bug for issues. Call end_component_flow when done.",
      nextTools: ["log_interaction", "tag_ui_bug", "end_component_flow", "register_component"],
      methodology: "agentic_vision",
      tip: "Each subagent should claim one component at a time for context isolation. Register child components as you discover them.",
    },
    phase: "test",
  },
  {
    name: "log_interaction",
    category: "ui_ux_dive",
    tags: ["ui", "interaction", "click", "type", "navigate", "submit", "scroll", "hover", "test", "trace"],
    quickRef: {
      nextAction: "Interaction logged. If result is not 'success', consider tagging a bug. Continue testing or end_component_flow when done.",
      nextTools: ["tag_ui_bug", "log_interaction", "end_component_flow"],
      methodology: "agentic_vision",
      tip: "Log every meaningful interaction for a complete trace. The sequence builds an interaction timeline per component.",
    },
    phase: "test",
  },
  {
    name: "end_component_flow",
    category: "ui_ux_dive",
    tags: ["ui", "component", "complete", "flow", "summary", "done", "finish"],
    quickRef: {
      nextAction: "Component completed. Pick up the next unclaimed component or generate the final report with get_dive_report.",
      nextTools: ["start_component_flow", "get_dive_tree", "get_dive_report"],
      methodology: "agentic_vision",
    },
    phase: "test",
  },
  {
    name: "tag_ui_bug",
    category: "ui_ux_dive",
    tags: ["ui", "bug", "issue", "visual", "functional", "accessibility", "performance", "responsive", "ux", "tag"],
    quickRef: {
      nextAction: "Bug tagged to the component tree. Continue testing or end_component_flow when done.",
      nextTools: ["log_interaction", "end_component_flow", "get_dive_tree"],
      methodology: "agentic_vision",
      tip: "Link bugs to specific interactions via interactionId for precise root-cause mapping in the final report.",
    },
    phase: "test",
  },
  {
    name: "get_dive_tree",
    category: "ui_ux_dive",
    tags: ["ui", "tree", "xml", "overview", "structure", "mermaid", "diagram", "components", "hierarchy"],
    quickRef: {
      nextAction: "Review the component tree. Check for unclaimed components and bug hotspots. Use get_dive_report for the full report.",
      nextTools: ["start_component_flow", "get_dive_report", "register_component"],
      methodology: "agentic_vision",
      tip: "Use format='mermaid' for visual rendering. The XML tree gives a quick structural overview of any complex app.",
    },
    phase: "verify",
  },
  {
    name: "get_dive_report",
    category: "ui_ux_dive",
    tags: ["ui", "report", "final", "summary", "bugs", "health", "score", "mermaid", "recommendations"],
    quickRef: {
      nextAction: "Report generated. Fix critical/high bugs first. Record patterns with record_learning. Share the Mermaid diagram for stakeholder review.",
      nextTools: ["record_learning", "log_gap", "run_quality_gate"],
      methodology: "agentic_vision",
      tip: "The health score (0-100) gives a quick app quality indicator. Grade A (90+) means production-ready.",
    },
    phase: "ship",
  },
  {
    name: "dive_snapshot",
    category: "ui_ux_dive",
    tags: ["ui", "screenshot", "snapshot", "accessibility", "a11y", "capture", "visual", "evidence", "image"],
    quickRef: {
      nextAction: "Screenshot captured. Use it as visual evidence for bugs (tag_ui_bug) or to document current state. Use mode='accessibility' for a11y tree.",
      nextTools: ["tag_ui_bug", "log_interaction", "end_component_flow"],
      methodology: "agentic_vision",
      tip: "Use selector to screenshot specific elements. Use mode='accessibility' for a11y tree inspection without vision models.",
    },
    phase: "test",
  },
  {
    name: "dive_auto_discover",
    category: "ui_ux_dive",
    tags: ["ui", "discover", "scan", "dom", "components", "landmarks", "auto", "register", "navigate"],
    quickRef: {
      nextAction: "Components auto-registered from DOM. Claim them with start_component_flow for testing.",
      nextTools: ["start_component_flow", "register_component", "get_dive_tree"],
      methodology: "agentic_vision",
      tip: "Use navigateUrl to discover components on a different page. Use parentId to nest under an existing component.",
    },
    phase: "research",
  },
  {
    name: "ingest_dive_screenshots",
    category: "ui_ux_dive",
    tags: ["ui", "screenshot", "ingest", "import", "bulk", "disk", "gallery", "dive", "png", "jpg"],
    quickRef: {
      nextAction: "Screenshots ingested into dive session. View them in the dashboard or use dive_screenshot to capture new ones.",
      nextTools: ["dive_screenshot", "tag_ui_bug", "end_component_flow", "get_dive_tree"],
      methodology: "agentic_vision",
      tip: "Scans a directory for PNG/JPG files and bulk-imports them into a dive session's screenshot gallery. Use after external Playwright captures.",
    },
    phase: "test",
  },

  // ═══════════════════════════════════════════
  // UI/UX DIVE V2 — Deep interaction testing,
  // screenshots, design audit, backend links,
  // changelog, and walkthrough generation
  // ═══════════════════════════════════════════
  {
    name: "dive_preflight",
    category: "ui_ux_dive_v2",
    tags: ["ui", "preflight", "setup", "project", "scan", "framework", "routes", "ports", "services", "launch", "dive", "step0"],
    quickRef: {
      nextAction: "Review the launch plan. Start any services that aren't running, then proceed with start_ui_dive.",
      nextTools: ["start_ui_dive", "connect_mcp_driver"],
      methodology: "agentic_vision",
      tip: "Always run this first. It detects framework, finds dev scripts, checks ports, scans routes, and builds a launch plan. Saves time and prevents ERR_CONNECTION_REFUSED.",
    },
    phase: "research",
  },
  {
    name: "dive_save_screenshot",
    category: "ui_ux_dive_v2",
    tags: ["ui", "screenshot", "save", "evidence", "visual", "capture", "base64", "image", "dive"],
    quickRef: {
      nextAction: "Screenshot saved. Reference the screenshotId in bugs, test steps, design issues, or changelogs.",
      nextTools: ["dive_interaction_test", "dive_record_test_step", "tag_ui_bug", "dive_design_issue", "dive_changelog"],
      methodology: "agentic_vision",
      tip: "Pass base64Data from bridge's browser_take_screenshot. Screenshots are saved to ~/.nodebench/dive-screenshots/.",
    },
    phase: "test",
  },
  {
    name: "dive_interaction_test",
    category: "ui_ux_dive_v2",
    tags: ["ui", "test", "interaction", "steps", "preconditions", "expected", "actual", "pass", "fail", "walkthrough", "dive"],
    quickRef: {
      nextAction: "Test created. Execute each step via bridge (browser_click, browser_type), take screenshots, then record results with dive_record_test_step.",
      nextTools: ["dive_record_test_step", "dive_save_screenshot", "call_driver_tool"],
      methodology: "agentic_vision",
      tip: "Define preconditions and steps upfront. The agent executes steps via bridge and records actual results. Each step gets pass/fail.",
    },
    phase: "test",
  },
  {
    name: "dive_record_test_step",
    category: "ui_ux_dive_v2",
    tags: ["ui", "test", "step", "result", "pass", "fail", "actual", "expected", "screenshot", "dive"],
    quickRef: {
      nextAction: "Step recorded. Continue with next step or check if test is complete.",
      nextTools: ["dive_save_screenshot", "dive_record_test_step", "tag_ui_bug", "dive_walkthrough"],
      methodology: "agentic_vision",
      tip: "Auto-completes the test when all steps are recorded. Failed steps generate a useful expected vs actual comparison.",
    },
    phase: "test",
  },
  {
    name: "dive_design_issue",
    category: "ui_ux_dive_v2",
    tags: ["ui", "design", "inconsistency", "color", "spacing", "font", "alignment", "contrast", "responsive", "audit", "visual", "dive"],
    quickRef: {
      nextAction: "Design issue tagged. Fix it and track with dive_changelog. View all issues in dive_walkthrough.",
      nextTools: ["dive_changelog", "dive_save_screenshot", "dive_walkthrough"],
      methodology: "agentic_vision",
      tip: "Use bridge's browser_evaluate to extract computed styles, then compare across components to find deviations.",
    },
    phase: "test",
  },
  {
    name: "dive_link_backend",
    category: "ui_ux_dive_v2",
    tags: ["ui", "backend", "link", "api", "convex", "query", "mutation", "endpoint", "database", "fullstack", "traceability", "dive"],
    quickRef: {
      nextAction: "Backend links created. When a UI bug is found, the report shows which backend code is involved.",
      nextTools: ["tag_ui_bug", "dive_walkthrough", "register_component"],
      methodology: "agentic_vision",
      tip: "Link types: convex_query, convex_mutation, convex_action, api_endpoint, db_table, auth_guard, websocket, external_service, env_var, cron_job.",
    },
    phase: "research",
  },
  {
    name: "dive_changelog",
    category: "ui_ux_dive_v2",
    tags: ["ui", "changelog", "change", "fix", "before", "after", "screenshot", "diff", "git", "commit", "audit", "dive"],
    quickRef: {
      nextAction: "Changelog entry recorded. Re-run the dive to verify fixes. The walkthrough shows before/after comparison.",
      nextTools: ["dive_save_screenshot", "dive_walkthrough", "dive_interaction_test"],
      methodology: "agentic_vision",
      tip: "Link before/after screenshots for visual diff. Reference git commits and changed files for full audit trail.",
    },
    phase: "ship",
  },
  {
    name: "dive_walkthrough",
    category: "ui_ux_dive_v2",
    tags: ["ui", "walkthrough", "report", "document", "qa", "page", "component", "test", "bug", "design", "backend", "changelog", "comprehensive", "dive"],
    quickRef: {
      nextAction: "Walkthrough generated. Share with stakeholders or use as QA baseline. Re-run after fixes to update.",
      nextTools: ["get_dive_report", "dive_changelog"],
      methodology: "agentic_vision",
      tip: "format='json' for programmatic use, 'markdown' for human-readable, 'summary' for condensed version.",
    },
    phase: "ship",
  },

  // ═══════════════════════════════════════════
  // UI/UX DIVE v3 — Flywheel: Bug→Code→Fix→
  // Verify→Reexplore→Test→Review
  // ═══════════════════════════════════════════
  {
    name: "dive_code_locate",
    category: "ui_ux_dive_v2",
    tags: ["ui", "code", "locate", "grep", "ripgrep", "bug", "source", "file", "line", "root-cause", "traceability", "dive", "flywheel"],
    quickRef: {
      nextAction: "Code located. Review the snippets, fix the code, then verify with dive_fix_verify.",
      nextTools: ["dive_fix_verify", "dive_generate_tests"],
      methodology: "agentic_vision",
      tip: "Pass multiple searchQueries — tries each in order. Links bug→file:line for full traceability. Uses ripgrep with fallback to findstr.",
    },
    phase: "research",
  },
  {
    name: "dive_fix_verify",
    category: "ui_ux_dive_v2",
    tags: ["ui", "fix", "verify", "flywheel", "bug", "resolve", "changelog", "before-after", "screenshot", "regression", "dive"],
    quickRef: {
      nextAction: "Fix verified. Re-explore the route to check for regressions, then generate a regression test.",
      nextTools: ["dive_reexplore", "dive_generate_tests", "dive_code_review"],
      methodology: "agentic_vision",
      tip: "Core flywheel step. Auto-creates changelog, updates bug status. Set verified:true only after visually confirming the fix via Playwright.",
    },
    phase: "test",
  },
  {
    name: "dive_reexplore",
    category: "ui_ux_dive_v2",
    tags: ["ui", "reexplore", "regression", "diff", "route", "verify", "components", "flywheel", "dive"],
    quickRef: {
      nextAction: "Route diffed. If regression-free, generate tests. If regressions found, fix and re-verify.",
      nextTools: ["dive_generate_tests", "tag_ui_bug", "dive_fix_verify"],
      methodology: "agentic_vision",
      tip: "Navigate to the route via Playwright first, then pass what you observe. Diffs against previously registered components and flags missing ones.",
    },
    phase: "test",
  },
  {
    name: "dive_generate_tests",
    category: "ui_ux_dive_v2",
    tags: ["ui", "test", "generate", "playwright", "regression", "bug", "interaction", "code", "ci", "flywheel", "dive"],
    quickRef: {
      nextAction: "Tests generated. Save to a file and run with 'npx playwright test'. Add to CI for ongoing protection.",
      nextTools: ["dive_code_review", "dive_reexplore"],
      methodology: "agentic_vision",
      tip: "Generates Playwright test code from bugs, interaction tests, and design issues. Use outputPath to save directly to a .spec.ts file.",
    },
    phase: "ship",
  },
  {
    name: "dive_code_review",
    category: "ui_ux_dive_v2",
    tags: ["ui", "code-review", "review", "quality", "score", "grade", "findings", "recommendations", "coderabbit", "augment", "pr", "github", "flywheel", "dive"],
    quickRef: {
      nextAction: "Review complete. Address critical/high findings first. Use github_comments format to post to PRs.",
      nextTools: ["dive_code_locate", "dive_fix_verify", "dive_generate_tests"],
      methodology: "agentic_vision",
      tip: "Like CodeRabbit/Augment but from live UI exploration. Produces score, grade, prioritized findings with file:line, and PR-ready comments.",
    },
    phase: "ship",
  },

  {
    name: "open_dive_dashboard",
    category: "ui_ux_dive_v2",
    tags: ["ui", "dashboard", "dive", "flywheel", "browser", "local", "report", "overview", "session", "open", "visualization"],
    quickRef: {
      nextAction: "Dashboard is open. Continue the dive — the dashboard auto-refreshes every 5s to show live progress.",
      nextTools: ["start_ui_dive", "dive_auto_discover", "dive_code_locate", "dive_fix_verify"],
      methodology: "agentic_vision",
      tip: "Opens a local web dashboard (port 6274) showing the full flywheel cycle: routes, components, bugs, fixes, tests, reviews. Like Serena MCP's local page but for UI dives.",
    },
    phase: "utility",
  },

  // ═══════════════════════════════════════════
  // SKILL SELF-UPDATE PROTOCOL — Track rule
  // file provenance, staleness, and resync
  // ═══════════════════════════════════════════
  {
    name: "register_skill",
    category: "skill_update",
    tags: ["skill", "rule", "register", "source", "hash", "frontmatter", "provenance", "memory", "agents-md", "cursor", "windsurf", "update"],
    quickRef: {
      nextAction: "Skill registered. Use check_skill_freshness periodically to detect when source files change.",
      nextTools: ["check_skill_freshness", "list_skills"],
      methodology: "self_reinforced_learning",
      tip: "Register every .md rule file (e.g. .windsurf/rules/, AGENTS.md) with its source files, triggers, and update instructions. Enables automatic staleness detection.",
    },
    phase: "verify",
  },
  {
    name: "check_skill_freshness",
    category: "skill_update",
    tags: ["skill", "freshness", "stale", "hash", "check", "drift", "source", "detect", "sync", "update", "rule"],
    quickRef: {
      nextAction: "If stale skills found, follow their update_instructions then call sync_skill to record the resync.",
      nextTools: ["sync_skill", "list_skills", "register_skill"],
      methodology: "self_reinforced_learning",
      tip: "Run at session start or after big code changes. Compares SHA-256 hashes of source files to detect drift. Auto-updates skill status in DB.",
    },
    phase: "verify",
  },
  {
    name: "sync_skill",
    category: "skill_update",
    tags: ["skill", "sync", "resync", "update", "hash", "refresh", "frontmatter", "rule", "source", "stale"],
    quickRef: {
      nextAction: "Skill synced. Verify the updated skill file is correct, then continue with your task.",
      nextTools: ["check_skill_freshness", "list_skills"],
      methodology: "self_reinforced_learning",
      tip: "Call AFTER you have read the changed source files and updated the skill .md content. This tool records the sync and updates the hash.",
    },
    phase: "verify",
  },
  {
    name: "list_skills",
    category: "skill_update",
    tags: ["skill", "list", "status", "overview", "rule", "memory", "history", "sync", "fresh", "stale"],
    quickRef: {
      nextAction: "Review skill statuses. Register any untracked rule files, check freshness for stale ones.",
      nextTools: ["register_skill", "check_skill_freshness", "sync_skill"],
      methodology: "self_reinforced_learning",
      tip: "Use includeHistory:true to see the full sync timeline for each skill. Filter by status:'stale' to focus on what needs updating.",
    },
    phase: "utility",
  },

  // ═══════════════════════════════════════════
  // MCP BRIDGE — Connect external MCP servers
  // ═══════════════════════════════════════════
  {
    name: "connect_mcp_driver",
    category: "mcp_bridge",
    tags: ["mcp", "bridge", "driver", "playwright", "mobile", "connect", "spawn", "external", "server", "proxy"],
    quickRef: {
      nextAction: "Driver connected. Use list_driver_tools to see available tools, then call_driver_tool to invoke them.",
      nextTools: ["list_driver_tools", "call_driver_tool", "start_ui_dive"],
      methodology: "agentic_vision",
      tip: "Predefined drivers: 'playwright' (browser automation) and 'mobile' (iOS/Android). Add extraArgs like ['--headless'] for Playwright.",
    },
    phase: "research",
  },
  {
    name: "list_driver_tools",
    category: "mcp_bridge",
    tags: ["mcp", "bridge", "driver", "tools", "list", "discover", "playwright", "mobile"],
    quickRef: {
      nextAction: "Review available tools and their parameters. Use call_driver_tool to invoke the one you need.",
      nextTools: ["call_driver_tool", "connect_mcp_driver"],
      methodology: "agentic_vision",
      tip: "Use verbose=true to see full input schemas. Useful for understanding what parameters each tool accepts.",
    },
    phase: "research",
  },
  {
    name: "call_driver_tool",
    category: "mcp_bridge",
    tags: ["mcp", "bridge", "driver", "call", "invoke", "proxy", "playwright", "mobile", "browser", "device"],
    quickRef: {
      nextAction: "Tool result returned. Continue with more tool calls, or use log_interaction to record the result in a dive session.",
      nextTools: ["call_driver_tool", "log_interaction", "tag_ui_bug", "dive_snapshot"],
      methodology: "agentic_vision",
      tip: "Combines well with UI/UX Full Dive: use call_driver_tool for browser/mobile actions, log_interaction to record results.",
    },
    phase: "test",
  },
  {
    name: "disconnect_driver",
    category: "mcp_bridge",
    tags: ["mcp", "bridge", "driver", "disconnect", "cleanup", "shutdown"],
    quickRef: {
      nextAction: "Driver disconnected. Reconnect with connect_mcp_driver if needed.",
      nextTools: ["connect_mcp_driver", "get_dive_report"],
      methodology: "agentic_vision",
    },
    phase: "utility",
  },
  {
    name: "check_dive_drivers",
    category: "mcp_bridge",
    tags: ["mcp", "bridge", "driver", "check", "setup", "status", "playwright", "mobile", "config", "ide"],
    quickRef: {
      nextAction: "Review driver status. Connect available drivers with connect_mcp_driver.",
      nextTools: ["connect_mcp_driver", "start_ui_dive"],
      methodology: "agentic_vision",
      tip: "Also shows IDE config snippets for adding these MCP servers directly to Windsurf/Claude Code/Cursor.",
    },
    phase: "research",
  },

  // ═══════════════════════════════════════════
  // ARCHITECT — Structural code analysis
  // ═══════════════════════════════════════════
  {
    name: "scan_capabilities",
    category: "architect",
    tags: ["structural-analysis", "capability-scan", "code-patterns", "regex-scan", "react", "backend", "state-management", "layout", "interaction", "rendering"],
    quickRef: {
      nextAction: "Review the capability report. Use verify_concept_support to check if a specific concept is implemented.",
      nextTools: ["verify_concept_support", "generate_implementation_plan", "save_session_note"],
      tip: "Pure regex analysis — no LLM needed, instant results. Scans React hooks, layout patterns, interaction handlers, rendering, and backend patterns.",
    },
    phase: "research",
  },
  {
    name: "verify_concept_support",
    category: "architect",
    tags: ["concept-verification", "gap-analysis", "structural-analysis", "regex-scan", "implementation-check", "progress-tracking"],
    quickRef: {
      nextAction: "If gaps found, use generate_implementation_plan to build a plan. If fully implemented, move on.",
      nextTools: ["generate_implementation_plan", "scan_capabilities", "record_learning"],
      tip: "Define required signatures from web research, then verify against code. Results persisted to SQLite for tracking progress.",
    },
    phase: "research",
  },
  {
    name: "generate_implementation_plan",
    category: "architect",
    tags: ["implementation-plan", "gap-analysis", "code-generation", "structural-analysis", "concept-verification", "strategy"],
    quickRef: {
      nextAction: "Follow the step-by-step plan. After each step, re-run verify_concept_support to track progress.",
      nextTools: ["verify_concept_support", "scan_capabilities", "start_verification_cycle"],
      tip: "Pass current_context from scan_capabilities to get conflict-aware injection strategies.",
    },
    phase: "implement",
  },

  // ═══════════════════════════════════════════
  // QA ORCHESTRATION — Overstory multi-agent QA
  // ═══════════════════════════════════════════
  {
    name: "overstory_fleet_status",
    category: "qa_orchestration",
    tags: ["overstory", "agent", "fleet", "status", "health", "multi-agent", "orchestration", "qa", "dogfood", "worktree"],
    quickRef: {
      nextAction: "Review agent states. If agents are idle, run dogfood:overstory to start a QA session.",
      nextTools: ["overstory_qa_summary", "overstory_mail_log", "run_visual_qa_suite"],
      methodology: "ai_flywheel",
      tip: "Reads .overstory/agent-manifest.json and overstory.db. Shows configured agents, capabilities, gate policy, and live agent health.",
    },
    phase: "utility",
  },
  {
    name: "overstory_qa_summary",
    category: "qa_orchestration",
    tags: ["overstory", "qa", "gate", "summary", "stability", "grade", "ssim", "triage", "p0", "p1", "dogfood"],
    quickRef: {
      nextAction: "If gate fails, check failing routes and fix p0/p1 issues. If gate passes, proceed to merge.",
      nextTools: ["overstory_mail_log", "overstory_fleet_status", "run_visual_qa_suite", "burst_capture"],
      methodology: "ai_flywheel",
      tip: "Aggregates SSIM stability grades from visual_qa_runs and Gemini QA triage from Overstory mail. Returns gate pass/fail verdict.",
    },
    phase: "verify",
  },
  {
    name: "overstory_mail_log",
    category: "qa_orchestration",
    tags: ["overstory", "mail", "log", "message", "route", "triage", "dispatch", "agent", "coordination"],
    quickRef: {
      nextAction: "Review messages to understand QA session state. Filter by type or agent for focused view.",
      nextTools: ["overstory_qa_summary", "overstory_fleet_status", "overstory_merge_queue"],
      methodology: "ai_flywheel",
      tip: "Supports type_filter (result/dispatch/worker_done/escalation) and agent_filter. Shows structured mail payloads from the QA agent fleet.",
    },
    phase: "utility",
  },
  {
    name: "overstory_merge_queue",
    category: "qa_orchestration",
    tags: ["overstory", "merge", "queue", "branch", "conflict", "gate", "builder", "qa", "resolution"],
    quickRef: {
      nextAction: "If branches are blocked, check QA gate failures. If pending, trigger merge with overstory merge --all.",
      nextTools: ["overstory_qa_summary", "overstory_mail_log", "overstory_fleet_status"],
      methodology: "ai_flywheel",
      tip: "Shows FIFO merge queue with conflict resolution tiers. Use include_completed:true to see merge history.",
    },
    phase: "utility",
  },

  // ═══════════════════════════════════════════
  // VISUAL QA — Deep interaction captures & stability
  // ═══════════════════════════════════════════
  {
    name: "burst_capture",
    category: "visual_qa",
    tags: ["burst", "capture", "screenshot", "rapid", "interaction", "deep", "animation", "transition", "hover", "click", "popup", "drawer", "modal", "streaming", "agent", "component"],
    quickRef: {
      nextAction: "Burst captured. Run compute_web_stability to measure SSIM across frames, or generate_grid_collage for visual comparison.",
      nextTools: ["compute_web_stability", "generate_grid_collage", "run_visual_qa_suite"],
      methodology: "ai_flywheel",
      tip: "Use burst capture for deep interaction testing — popups, hover states, streaming responses, drawer opens, thread switches. Captures rapid frame sequences during UI transitions.",
    },
    phase: "test",
    complexity: "medium",
  },
  {
    name: "generate_grid_collage",
    category: "visual_qa",
    tags: ["grid", "collage", "visual", "comparison", "before-after", "screenshot", "composite", "overview", "review"],
    quickRef: {
      nextAction: "Collage generated. Review visually for inconsistencies. Use run_visual_qa_suite for automated scoring.",
      nextTools: ["run_visual_qa_suite", "compute_web_stability", "analyze_screenshot"],
      methodology: "ai_flywheel",
      tip: "Generates a composite grid image from multiple screenshots — useful for comparing dark/light, desktop/mobile, or before/after states side-by-side.",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "compute_web_stability",
    category: "visual_qa",
    tags: ["stability", "ssim", "structural", "similarity", "flicker", "jank", "layout-shift", "regression", "diff", "frame", "comparison"],
    quickRef: {
      nextAction: "Stability computed. If SSIM < 0.95, investigate layout shifts or animation jank. Log issues with tag_ui_bug.",
      nextTools: ["burst_capture", "tag_ui_bug", "log_gap", "run_visual_qa_suite"],
      methodology: "ai_flywheel",
      tip: "Computes block-based SSIM between frame pairs to detect visual instability — layout shifts, flicker, and rendering regressions.",
    },
    phase: "test",
    complexity: "medium",
  },
  {
    name: "run_visual_qa_suite",
    category: "visual_qa",
    tags: ["visual", "qa", "suite", "end-to-end", "automated", "gemini", "scoring", "jony-ive", "design", "review", "deep-interaction", "scenario", "agent", "streaming", "popup", "drawer"],
    quickRef: {
      nextAction: "QA suite complete. Fix P0/P1 issues first (highest score impact), then P2/P3. Re-run to verify improvements.",
      nextTools: ["burst_capture", "log_gap", "record_learning", "save_session_note"],
      methodology: "ai_flywheel",
      tip: "End-to-end visual QA: captures all routes + deep interactions (agent queries, streaming, popups, drawers) → Gemini scores against Jony Ive design principles → auto-triages by P-level. Formula: 100 - P1×6 - P2×2 - P3×1.",
    },
    phase: "verify",
    complexity: "high",
  },

  // ═══════════════════════════════════════════
  // LOCAL DASHBOARD — Daily brief + narrative + ops
  // ═══════════════════════════════════════════
  {
    name: "sync_daily_brief",
    category: "local_dashboard",
    tags: ["sync", "daily", "brief", "convex", "sqlite", "pull", "refresh", "narrative", "dashboard", "data"],
    quickRef: {
      nextAction: "Data synced. Call get_daily_brief_summary to read the brief, or open_local_dashboard for visual review.",
      nextTools: ["get_daily_brief_summary", "get_narrative_status", "open_local_dashboard"],
      methodology: "ai_flywheel",
      tip: "Pulls latest dashboard snapshot + narrative threads from Convex into local SQLite. Requires CONVEX_SITE_URL and MCP_SECRET env vars.",
    },
    phase: "research",
    complexity: "medium",
  },
  {
    name: "get_daily_brief_summary",
    category: "local_dashboard",
    tags: ["daily", "brief", "summary", "metrics", "features", "sources", "dashboard", "offline", "local"],
    quickRef: {
      nextAction: "Review the brief. Check key signals and source quality. Use get_narrative_status for thread analysis.",
      nextTools: ["get_narrative_status", "get_ops_dashboard", "open_local_dashboard"],
      methodology: "ai_flywheel",
      tip: "Reads from local SQLite — zero network needed. Returns dashboard metrics, features, and source summary from the last sync.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "get_narrative_status",
    category: "local_dashboard",
    tags: ["narrative", "thread", "status", "phase", "emerging", "escalating", "climax", "resolution", "dormant", "story"],
    quickRef: {
      nextAction: "Review thread distribution. Focus on escalating/climax threads for timely action. Use get_ops_dashboard for pipeline health.",
      nextTools: ["get_daily_brief_summary", "get_ops_dashboard", "open_local_dashboard"],
      methodology: "ai_flywheel",
      tip: "Returns narrative threads grouped by phase with event counts. Filter by phase to focus on specific lifecycle stages.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "get_ops_dashboard",
    category: "local_dashboard",
    tags: ["ops", "operational", "dashboard", "sync", "tool-call", "frequency", "verification", "health", "monitoring"],
    quickRef: {
      nextAction: "Review ops health. If tool error rates are high, investigate root causes. If sync is stale, run sync_daily_brief.",
      nextTools: ["sync_daily_brief", "get_daily_brief_summary", "open_local_dashboard"],
      methodology: "ai_flywheel",
      tip: "Returns last sync info, tool call frequency (24h), active verification cycles, data counts, and privacy mode status.",
    },
    phase: "utility",
    complexity: "low",
  },
  {
    name: "open_local_dashboard",
    category: "local_dashboard",
    tags: ["open", "dashboard", "browser", "server", "html", "visual", "brief", "narrative", "ops", "local", "ui"],
    quickRef: {
      nextAction: "Dashboard is running. Open the URL in a browser to see Brief metrics, Narrative thread lanes, and Ops status.",
      nextTools: ["sync_daily_brief", "get_daily_brief_summary", "get_narrative_status"],
      methodology: "ai_flywheel",
      tip: "Starts the local dashboard server on port 6275 if not already running. Auto-refreshes every 30s from local SQLite.",
    },
    phase: "utility",
    complexity: "low",
  },

  // ═══════════════════════════════════════════
  // DESIGN GOVERNANCE — Spec enforcement & compliance
  // ═══════════════════════════════════════════
  {
    name: "get_design_spec",
    category: "design_governance",
    tags: ["design", "governance", "spec", "tokens", "colors", "typography", "spacing", "components", "rules", "system"],
    quickRef: {
      nextAction: "Review the spec. Use check_design_compliance on specific files, or get_design_violations for a full scan.",
      nextTools: ["check_design_compliance", "get_design_violations"],
      methodology: "ai_flywheel",
      tip: "Returns the machine-readable design governance spec — approved colors, typography classes, component primitives, spacing scale, uppercase policy. Read before making UI changes.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "check_design_compliance",
    category: "design_governance",
    tags: ["design", "compliance", "lint", "check", "validate", "file", "violations", "governance", "tokens", "patterns"],
    quickRef: {
      nextAction: "Fix the reported violations. Re-run check_design_compliance to verify. Then run get_design_violations for remaining issues.",
      nextTools: ["get_design_violations", "get_design_spec"],
      methodology: "ai_flywheel",
      tip: "Validates a single file against the design governance spec. Returns violations with line numbers, severity, and fix suggestions.",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "get_design_violations",
    category: "design_governance",
    tags: ["design", "violations", "scan", "audit", "governance", "bulk", "report", "compliance", "quality", "lint"],
    quickRef: {
      nextAction: "Focus on high-severity violations first. Use check_design_compliance on the worst files. Fix and re-scan.",
      nextTools: ["check_design_compliance", "get_design_spec", "log_gap"],
      methodology: "ai_flywheel",
      tip: "Scans entire src/ for design governance violations. Filter by severity or category. Returns top files and fix suggestions.",
    },
    phase: "verify",
    complexity: "medium",
  },
  {
    name: "sync_figma_tokens",
    category: "design_governance",
    tags: ["figma", "tokens", "sync", "drift", "design", "variables", "css", "compare", "validation"],
    quickRef: {
      nextAction: "Review drift report. Update src/index.css or Figma variables to reconcile mismatches. Run check_design_compliance to verify.",
      nextTools: ["check_design_compliance", "get_design_spec", "get_design_violations"],
      methodology: "ai_flywheel",
      tip: "Compares Figma design token variables against CSS custom properties. Requires FIGMA_ACCESS_TOKEN env var.",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "get_figma_design_context",
    category: "design_governance",
    tags: ["figma", "design", "context", "component", "patterns", "typography", "spacing", "tokens", "rules"],
    quickRef: {
      nextAction: "Use the returned design context to implement or review the component. Run check_design_compliance after changes.",
      nextTools: ["check_design_compliance", "get_design_spec", "sync_figma_tokens"],
      methodology: "ai_flywheel",
      tip: "Returns design system rules for a specific component (button, card, page-shell, sidebar, empty-state, stat-badge).",
    },
    phase: "research",
    complexity: "low",
  },

  // AGENT TRAVERSAL — Frontend view navigation for OpenClaw agents
  // ═══════════════════════════════════════════
  {
    name: "list_available_views",
    category: "agent_traverse",
    tags: ["views", "manifest", "discover", "navigate", "frontend", "agent", "traversal", "sitemap"],
    quickRef: {
      nextAction: "Pick a view from the manifest and navigate to it with navigate_to_view.",
      nextTools: ["navigate_to_view", "get_view_capabilities"],
      methodology: "agent_traversal",
      tip: "Use search parameter to filter by keyword. Returns 27 views with actions, data endpoints, and tags.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "get_view_capabilities",
    category: "agent_traverse",
    tags: ["view", "capabilities", "actions", "tools", "endpoints", "agent", "traversal", "inspect"],
    quickRef: {
      nextAction: "Now navigate to the view or invoke its per-view tools with invoke_view_tool.",
      nextTools: ["navigate_to_view", "invoke_view_tool", "query_view_data"],
      methodology: "agent_traversal",
      tip: "Returns full view metadata including per-view WebMCP tools. Call before interacting with a view.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "navigate_to_view",
    category: "agent_traverse",
    tags: ["navigate", "view", "route", "go", "switch", "frontend", "agent", "session"],
    quickRef: {
      nextAction: "You're on the target view. Use invoke_view_tool for actions or query_view_data for reading.",
      nextTools: ["invoke_view_tool", "query_view_data", "get_view_state"],
      methodology: "agent_traversal",
      tip: "Tracks navigation in session history for audit. Returns target view capabilities.",
    },
    phase: "implement",
    complexity: "low",
  },
  {
    name: "invoke_view_tool",
    category: "agent_traverse",
    tags: ["invoke", "tool", "view", "action", "interact", "agent", "per-view", "webmcp"],
    quickRef: {
      nextAction: "Check results. Navigate to another view or invoke more tools.",
      nextTools: ["invoke_view_tool", "navigate_to_view", "get_view_state"],
      methodology: "agent_traversal",
      tip: "Auto-detects current view from session. Use get_view_capabilities to see available tools first.",
    },
    phase: "implement",
    complexity: "medium",
  },
  {
    name: "query_view_data",
    category: "agent_traverse",
    tags: ["query", "data", "endpoint", "read", "fetch", "view", "agent", "api"],
    quickRef: {
      nextAction: "Process the data. Navigate to another view or invoke view tools.",
      nextTools: ["invoke_view_tool", "navigate_to_view", "traverse_feed"],
      methodology: "agent_traversal",
      tip: "Use get_view_capabilities to see available data endpoints for a view.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "traverse_feed",
    category: "agent_traverse",
    tags: ["feed", "traverse", "hot", "new", "top", "rising", "paginate", "moltbook", "discovery"],
    quickRef: {
      nextAction: "Process items. Use cursor for next page, or switch feed type.",
      nextTools: ["traverse_feed", "navigate_to_view", "invoke_view_tool"],
      methodology: "agent_traversal",
      tip: "Supports hot/new/top/rising sort across 6 feed types. Cursor-based pagination.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "get_view_state",
    category: "agent_traverse",
    tags: ["state", "session", "history", "audit", "introspect", "agent", "traversal"],
    quickRef: {
      nextAction: "Review session state. Continue navigating or end session.",
      nextTools: ["navigate_to_view", "list_available_views"],
      methodology: "agent_traversal",
      tip: "Returns navigation history, interaction log, and session duration for self-awareness.",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "get_traversal_plan",
    category: "agent_traverse",
    tags: ["plan", "goal", "multi-view", "journey", "strategy", "agent", "traversal", "optimize"],
    quickRef: {
      nextAction: "Follow the plan step by step: navigate_to_view for each step, then invoke_view_tool or query_view_data.",
      nextTools: ["navigate_to_view", "invoke_view_tool", "query_view_data"],
      methodology: "agent_traversal",
      tip: "Describe your goal in natural language. Returns ranked views with suggested actions and tools.",
    },
    phase: "research",
    complexity: "medium",
  },

  // ENGINE CONTEXT — Accumulated knowledge and content archive
  // ═══════════════════════════════════════════
  {
    name: "get_engine_context_health",
    category: "engine_context",
    tags: ["context", "health", "learnings", "trend", "conformance", "knowledge", "accumulated", "engine"],
    quickRef: {
      nextAction: "Review context health. If learnings are low, run more workflows. If trend is regressing, investigate failing steps.",
      nextTools: ["get_workflow_history", "search_content_archive", "search_all_knowledge"],
      methodology: "ai_flywheel",
      tip: "Call at session start to understand how much accumulated knowledge is available.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "get_workflow_history",
    category: "engine_context",
    tags: ["workflow", "history", "runs", "scores", "grades", "trend", "conformance", "engine"],
    quickRef: {
      nextAction: "Compare scores across runs. If regressing, check failed steps. If improving, document what changed.",
      nextTools: ["get_engine_context_health", "search_all_knowledge", "record_learning"],
      methodology: "ai_flywheel",
      tip: "Track conformance scores over time to detect quality drift.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "archive_content",
    category: "engine_context",
    tags: ["archive", "content", "save", "digest", "post", "report", "dedup", "themes"],
    quickRef: {
      nextAction: "Content archived. Use search_content_archive before next generation to avoid repetition.",
      nextTools: ["search_content_archive", "get_engine_context_health"],
      methodology: "ai_flywheel",
      tip: "Archive every generated digest/post to prevent theme repetition in future runs.",
    },
    phase: "ship",
    complexity: "low",
  },
  {
    name: "search_content_archive",
    category: "engine_context",
    tags: ["search", "content", "archive", "fts5", "themes", "dedup", "topics", "covered"],
    quickRef: {
      nextAction: "Review results. Adjust new content to cover gaps, not repeat existing themes.",
      nextTools: ["archive_content", "get_engine_context_health", "search_all_knowledge"],
      methodology: "ai_flywheel",
      tip: "Call before generating content to check what's already been covered.",
    },
    phase: "research",
    complexity: "low",
  },

  // ═══ CONTEXT SANDBOX — Context window protection via FTS5 indexing ═══
  {
    name: "sandbox_ingest",
    category: "context_sandbox",
    tags: ["sandbox", "ingest", "index", "context", "fts5", "chunk", "store", "compress"],
    quickRef: {
      nextAction: "Content indexed. Use sandbox_search to query it without pulling raw data into context.",
      nextTools: ["sandbox_search", "sandbox_stats"],
      methodology: "context_management",
      tip: "Use for large API responses, file contents, or any data you want searchable without flooding context.",
    },
    phase: "utility",
    complexity: "low",
  },
  {
    name: "sandbox_search",
    category: "context_sandbox",
    tags: ["sandbox", "search", "bm25", "fts5", "query", "context", "retrieve", "snippet"],
    quickRef: {
      nextAction: "Review search results. Follow up with more specific queries or use sandbox_ingest for new content.",
      nextTools: ["sandbox_ingest", "sandbox_execute", "sandbox_stats"],
      methodology: "context_management",
      tip: "Pass multiple queries as an array to batch all questions in one call.",
    },
    phase: "utility",
    complexity: "low",
  },
  {
    name: "sandbox_execute",
    category: "context_sandbox",
    tags: ["sandbox", "execute", "shell", "command", "index", "output", "compress", "context"],
    quickRef: {
      nextAction: "Output indexed. Use sandbox_search to find specific details. Check exitCode for errors.",
      nextTools: ["sandbox_search", "sandbox_batch", "sandbox_stats"],
      methodology: "context_management",
      tip: "Use instead of raw shell execution for commands producing >20 lines. Pass queries param for immediate search.",
    },
    phase: "utility",
    complexity: "low",
  },
  {
    name: "sandbox_batch",
    category: "context_sandbox",
    tags: ["sandbox", "batch", "execute", "search", "multi", "efficient", "context", "compress"],
    quickRef: {
      nextAction: "Batch complete. Review search results. Use sandbox_search for follow-up queries.",
      nextTools: ["sandbox_search", "sandbox_stats"],
      methodology: "context_management",
      tip: "One sandbox_batch replaces N sandbox_execute + M sandbox_search calls. Use for research phases.",
    },
    phase: "utility",
    complexity: "medium",
  },
  {
    name: "sandbox_stats",
    category: "context_sandbox",
    tags: ["sandbox", "stats", "token", "savings", "context", "metrics", "session", "compression"],
    quickRef: {
      nextAction: "Review savings ratio. If low, route more heavy outputs through sandbox_execute or sandbox_ingest.",
      nextTools: ["sandbox_ingest", "sandbox_execute", "sandbox_batch"],
      methodology: "context_management",
    },
    phase: "meta",
    complexity: "low",
  },
  // ── Thompson Protocol (6 tools) ─────────────────────────────────────────
  {
    name: "thompson_write",
    category: "thompson_protocol",
    tags: ["content", "writing", "plain-english", "analogy", "jargon", "translation", "accessibility", "thompson", "calculus-made-easy"],
    quickRef: {
      nextAction: "Content written. Send sections to thompson_feynman_edit for skeptical beginner review.",
      nextTools: ["thompson_feynman_edit", "call_llm"],
      methodology: "thompson_protocol",
      tip: "Use call_llm with the system_prompt from this tool's output to generate the actual content. The tool provides constraints, the LLM does the creative work.",
    },
    phase: "implement",
    complexity: "high",
  },
  {
    name: "thompson_feynman_edit",
    category: "thompson_protocol",
    tags: ["editing", "review", "rejection", "readability", "feynman", "skeptical-beginner", "quality", "rewrite"],
    quickRef: {
      nextAction: "Review complete. If REWRITE sections exist, send back to thompson_write. If all PASS, proceed to thompson_visual_map.",
      nextTools: ["thompson_write", "thompson_visual_map"],
      methodology: "thompson_protocol",
      tip: "Max 3 rewrite cycles. After 3 consecutive failures on same criterion, escalate to user.",
    },
    phase: "verify",
    complexity: "medium",
  },
  {
    name: "thompson_visual_map",
    category: "thompson_protocol",
    tags: ["visual", "metaphor", "image", "prompt", "analogy", "illustration", "accessibility", "alt-text"],
    quickRef: {
      nextAction: "Visual prompts generated. Send content + visuals to thompson_anti_elitism_lint for final scan.",
      nextTools: ["thompson_anti_elitism_lint"],
      methodology: "thompson_protocol",
      tip: "Each visual maps 1:1 with a text analogy. No generic b-roll. Include alt-text for accessibility.",
    },
    phase: "implement",
    complexity: "medium",
  },
  {
    name: "thompson_anti_elitism_lint",
    category: "thompson_protocol",
    tags: ["lint", "elitism", "gatekeeping", "banned-phrases", "readability", "inclusivity", "passive-voice", "jargon"],
    quickRef: {
      nextAction: "Lint complete. If CLEAN, proceed to thompson_quality_gate. If FLAGGED, fix banned phrases and re-lint.",
      nextTools: ["thompson_quality_gate", "thompson_write"],
      methodology: "thompson_protocol",
      tip: "Fully deterministic — no LLM needed. 22 banned phrase patterns + readability metrics.",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "thompson_quality_gate",
    category: "thompson_protocol",
    tags: ["quality", "gate", "checklist", "grade", "content", "verification", "thompson"],
    quickRef: {
      nextAction: "Quality gate scored. If passing/exemplary, content is ready for distribution. If needs_work/failing, review failing_checks and restart.",
      nextTools: ["save_session_note", "record_learning", "send_email"],
      methodology: "thompson_protocol",
      tip: "10-point boolean checklist. Grade thresholds: exemplary (9-10), passing (7-8), needs_work (5-6), failing (0-4).",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "thompson_pipeline",
    category: "thompson_protocol",
    tags: ["pipeline", "orchestrator", "content", "end-to-end", "thompson", "workflow", "multi-agent"],
    quickRef: {
      nextAction: "Pipeline plan generated. Execute steps sequentially: thompson_write → thompson_feynman_edit (loop) → thompson_visual_map → thompson_anti_elitism_lint → thompson_quality_gate.",
      nextTools: ["thompson_write", "call_llm"],
      methodology: "thompson_protocol",
      tip: "This is the orchestrator. Start here for end-to-end content transformation. Each step's output feeds the next.",
    },
    phase: "meta",
    complexity: "low",
  },
  // ═══ OBSERVABILITY ═══
  {
    name: "get_system_pulse",
    category: "observability",
    tags: ["health", "status", "pulse", "monitoring", "dashboard", "uptime", "errors", "diagnostics"],
    quickRef: {
      nextAction: "Pulse captured. If healthScore < 70, run get_drift_report for details. If critical, run run_self_heal.",
      nextTools: ["get_drift_report", "run_self_heal", "get_uptime_stats"],
      tip: "Call this first when investigating system issues — it gives you the full picture in one shot.",
    },
    phase: "utility",
    complexity: "low",
  },
  {
    name: "get_drift_report",
    category: "observability",
    tags: ["drift", "detection", "orphaned", "stale", "bloat", "maintenance", "audit", "cleanup"],
    quickRef: {
      nextAction: "Drift detected. Review healable issues, then call run_self_heal with targets to auto-fix.",
      nextTools: ["run_self_heal", "get_system_pulse", "cleanup_stale_runs"],
      tip: "Include include_history=true to see trend over time — one-off spikes are different from sustained degradation.",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "run_self_heal",
    category: "observability",
    tags: ["heal", "repair", "fix", "autonomous", "maintenance", "cleanup", "self-healing", "auto-fix"],
    quickRef: {
      nextAction: "Healing complete. Re-run get_drift_report to verify fixes took effect.",
      nextTools: ["get_drift_report", "get_system_pulse"],
      tip: "Use dry_run=true first to preview what would be fixed without actually changing anything.",
    },
    phase: "utility",
    complexity: "low",
  },
  {
    name: "get_uptime_stats",
    category: "observability",
    tags: ["uptime", "metrics", "calls", "errors", "trends", "rate", "performance", "statistics"],
    quickRef: {
      nextAction: "Stats captured. Check error trend direction — if 'increasing', investigate with get_drift_report.",
      nextTools: ["get_drift_report", "get_system_pulse", "get_trajectory_analysis"],
      tip: "Compare 1hr vs 24hr error rates — a recent spike in an otherwise stable system needs different treatment than chronic errors.",
    },
    phase: "utility",
    complexity: "low",
  },
  {
    name: "set_watchdog_config",
    category: "observability",
    tags: ["watchdog", "config", "interval", "thresholds", "monitoring", "background", "schedule"],
    quickRef: {
      nextAction: "Watchdog reconfigured. Changes take effect immediately. Check get_watchdog_log after one cycle to verify.",
      nextTools: ["get_watchdog_log", "get_system_pulse"],
      tip: "Set interval_minutes=1 for debugging, then raise to 5-10 for normal operation to reduce overhead.",
    },
    phase: "utility",
    complexity: "low",
  },
  {
    name: "get_watchdog_log",
    category: "observability",
    tags: ["watchdog", "log", "history", "trend", "background", "audit", "timeline"],
    quickRef: {
      nextAction: "Log reviewed. If trend is 'degrading', investigate the most common issue type with get_drift_report.",
      nextTools: ["get_drift_report", "set_watchdog_config", "get_system_pulse"],
      tip: "Use only_issues=true to filter noise and focus on entries where something actually went wrong.",
    },
    phase: "utility",
    complexity: "low",
  },
  {
    name: "get_sentinel_report",
    category: "observability",
    tags: ["sentinel", "probes", "quality", "testing", "build", "e2e", "voice", "a11y", "visual", "performance"],
    quickRef: {
      nextAction: "Report reviewed. For failing probes, check diagnosis root causes and apply suggested fixes.",
      nextTools: ["get_drift_report", "get_system_pulse", "run_self_heal"],
      tip: "Use probe_filter to focus on specific areas like 'build,e2e' instead of reviewing all 9 probes.",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "get_observability_summary",
    category: "observability",
    tags: ["summary", "unified", "health", "sentinel", "watchdog", "quick-check", "overview"],
    quickRef: {
      nextAction: "Summary reviewed. Follow nextActions recommendations for highest-impact improvements.",
      nextTools: ["get_drift_report", "run_self_heal", "get_sentinel_report", "get_uptime_stats"],
      tip: "Best starting point for any session — gives you MCP health, sentinel status, and watchdog state in one call.",
    },
    phase: "utility",
    complexity: "low",
  },

  // ═══ TEMPORAL INTELLIGENCE (Unified Temporal Agentic OS) ═══
  {
    name: "ingest_temporal_observation",
    category: "temporal_intelligence",
    tags: ["temporal", "observation", "ingest", "time-series", "stream", "signal", "data", "event"],
    quickRef: {
      nextAction: "Observation ingested. Run detect_temporal_signal on the same streamKey to find patterns, or ingest more observations to build a richer time series.",
      nextTools: ["detect_temporal_signal", "build_causal_chain", "query_temporal_signals"],
      methodology: "temporal_agentic_os",
      tip: "Use consistent streamKey naming (e.g. 'github/commits/repo', 'jira/velocity/team') for clean signal detection.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "detect_temporal_signal",
    category: "temporal_intelligence",
    tags: ["temporal", "signal", "detect", "anomaly", "momentum", "regime-shift", "trend", "analysis", "statistics"],
    quickRef: {
      nextAction: "Signals detected. Build a causal_chain to explain significant signals, or generate a zero_draft to communicate findings. Use query_temporal_signals to retrieve stored signals.",
      nextTools: ["build_causal_chain", "generate_zero_draft", "query_temporal_signals", "forecast_temporal_trend"],
      methodology: "temporal_agentic_os",
      tip: "Need 5+ numeric observations for momentum, 10+ for regime shift detection. Use lookbackDays to control analysis window.",
    },
    phase: "research",
    complexity: "medium",
  },
  {
    name: "build_causal_chain",
    category: "temporal_intelligence",
    tags: ["temporal", "causal", "chain", "causality", "root-cause", "analysis", "timeline", "explanation"],
    quickRef: {
      nextAction: "Causal chain built. Generate a zero_draft to communicate the analysis, or create a proof_pack to verify the chain's conclusions.",
      nextTools: ["generate_zero_draft", "create_proof_pack", "detect_temporal_signal"],
      methodology: "temporal_agentic_os",
      tip: "Nodes must be chronological. Link evidenceObservationIds to ground each causal step in data.",
    },
    phase: "research",
    complexity: "medium",
  },
  {
    name: "generate_zero_draft",
    category: "temporal_intelligence",
    tags: ["temporal", "draft", "artifact", "generate", "email", "slack", "spec", "pr", "content", "auto-draft"],
    quickRef: {
      nextAction: "Draft generated. Review the bodyMarkdown, edit as needed, then approve or create a proof_pack before sending.",
      nextTools: ["create_proof_pack", "detect_temporal_signal", "build_causal_chain"],
      methodology: "temporal_agentic_os",
      tip: "Link signal IDs and chain IDs to auto-populate the draft with evidence. Always review before approving.",
    },
    phase: "implement",
    complexity: "high",
  },
  {
    name: "create_proof_pack",
    category: "temporal_intelligence",
    tags: ["temporal", "proof", "pack", "verification", "checklist", "metrics", "dogfood", "immutable", "audit"],
    quickRef: {
      nextAction: "Proof pack created. If pass rate is 100%, status is 'ready' for approval. Otherwise, address failing items and create a new pack.",
      nextTools: ["query_temporal_signals", "generate_zero_draft", "detect_temporal_signal"],
      methodology: "temporal_agentic_os",
      tip: "100% pass rate auto-sets status to 'ready'. Include metrics for cost/performance tracking.",
    },
    phase: "verify",
    complexity: "medium",
  },
  {
    name: "query_temporal_signals",
    category: "temporal_intelligence",
    tags: ["temporal", "signal", "query", "search", "filter", "retrieve", "list", "status"],
    quickRef: {
      nextAction: "Signals retrieved. Investigate high-confidence signals with build_causal_chain, or forecast trends with forecast_temporal_trend.",
      nextTools: ["build_causal_chain", "forecast_temporal_trend", "detect_temporal_signal", "generate_zero_draft"],
      methodology: "temporal_agentic_os",
      tip: "Filter by status='open' to focus on unresolved signals. Use date range to scope analysis.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "forecast_temporal_trend",
    category: "temporal_intelligence",
    tags: ["temporal", "forecast", "trend", "prediction", "time-series", "regression", "smoothing", "statistics"],
    quickRef: {
      nextAction: "Forecast generated. Compare predictions with actual observations as they arrive. Use detect_temporal_signal to monitor for deviations from forecast.",
      nextTools: ["detect_temporal_signal", "ingest_temporal_observation", "query_temporal_signals", "generate_zero_draft"],
      methodology: "temporal_agentic_os",
      tip: "Linear method works best with clear trends. Exponential smoothing handles noisy data better. Naive is a baseline.",
    },
    phase: "research",
    complexity: "high",
  },

  // ── Mission Harness (Hierarchical execution) ──────────────────────────

  {
    name: "plan_decompose_mission",
    category: "mission_harness",
    tags: ["mission", "planner", "decompose", "subtask", "verifiability", "orchestration", "hierarchy", "execution"],
    quickRef: {
      nextAction: "Mission decomposed. Assign agents to subtasks, then use judge_verify_subtask as each completes.",
      nextTools: ["judge_verify_subtask", "harness_get_mission_status", "harness_list_runs"],
      methodology: "mission_execution_harness",
      tip: "Every subtask needs verifiabilityTier + outputContract. Tier 1 = machine-checkable, Tier 2 = expert-checkable.",
    },
    phase: "research",
    complexity: "high",
  },
  {
    name: "judge_verify_subtask",
    category: "mission_harness",
    tags: ["judge", "verify", "review", "evidence", "artifact", "verdict", "quality", "gate"],
    quickRef: {
      nextAction: "Subtask verified. If passed and requiresSniffCheck, use sniff_record_human_review. If failed, use judge_request_retry.",
      nextTools: ["sniff_record_human_review", "judge_request_retry", "merge_compose_output", "harness_get_mission_status"],
      methodology: "mission_execution_harness",
      tip: "No hardcoded score floors — 0 means 0. Evidence refs create the traceability chain.",
    },
    phase: "verify",
    complexity: "high",
  },
  {
    name: "judge_request_retry",
    category: "mission_harness",
    tags: ["retry", "escalate", "replan", "budget", "failure", "recovery", "resilience"],
    quickRef: {
      nextAction: "Retry requested. Worker should re-attempt with newInstructions. If budget exhausted, auto-escalates.",
      nextTools: ["judge_verify_subtask", "harness_get_mission_status", "plan_decompose_mission"],
      methodology: "mission_execution_harness",
      tip: "Retry budget enforced — exhausted budget auto-escalates. Use 'stop' only for unverifiable subtasks.",
    },
    phase: "verify",
    complexity: "medium",
  },
  {
    name: "merge_compose_output",
    category: "mission_harness",
    tags: ["merge", "compose", "output", "artifact", "boundary", "orchestration", "finalize"],
    quickRef: {
      nextAction: "Output merged. If requiresJudgeReview, run judge_verify_subtask on the merge. Otherwise check mission status.",
      nextTools: ["judge_verify_subtask", "sniff_record_human_review", "harness_get_mission_status"],
      methodology: "mission_execution_harness",
      tip: "Judge-gated: all subtasks must be 'passed' before merge. No shared free-for-all editing.",
    },
    phase: "ship",
    complexity: "high",
  },
  {
    name: "sniff_record_human_review",
    category: "mission_harness",
    tags: ["human", "review", "sniff", "check", "approval", "block", "concern", "quality"],
    quickRef: {
      nextAction: "Sniff-check recorded. If 'block', subtask enters force-retry. If 'pass', proceed to merge.",
      nextTools: ["merge_compose_output", "judge_request_retry", "harness_get_mission_status"],
      methodology: "mission_execution_harness",
      tip: "Issue tags: unsupported_claim, weak_evidence, not_credible, too_risky, scope_drift, missing_source, contradictory, stale_data.",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "harness_get_mission_status",
    category: "mission_harness",
    tags: ["status", "mission", "dashboard", "trace", "receipt", "progress", "overview"],
    quickRef: {
      nextAction: "Review subtask states and decide next action: verify pending subtasks, merge passed ones, or record sniff-checks.",
      nextTools: ["judge_verify_subtask", "merge_compose_output", "sniff_record_human_review", "harness_list_runs"],
      methodology: "mission_execution_harness",
      tip: "Use includeEvidence=true for full traceability audit. Default omits evidence for performance.",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "harness_list_runs",
    category: "mission_harness",
    tags: ["list", "runs", "missions", "history", "discovery", "overview"],
    quickRef: {
      nextAction: "Pick a run to inspect with harness_get_mission_status, or create a new mission with plan_decompose_mission.",
      nextTools: ["harness_get_mission_status", "plan_decompose_mission"],
      methodology: "mission_execution_harness",
      tip: "Filter by status to find active, failed, or completed runs.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "compute_dimension_profile",
    category: "mission_harness",
    tags: ["deeptrace", "dimension", "profile", "regime", "company", "capital", "capability", "time"],
    quickRef: {
      nextAction: "Profile computed. Export the full bundle, inspect evidence rows and interaction effects, then record any regime-sensitive recommendation in the execution trace.",
      nextTools: ["export_dimension_bundle", "list_dimension_evidence", "list_dimension_interactions", "record_execution_decision"],
      methodology: "mission_execution_harness",
      tip: "Recompute after new company evidence, hiring signals, financing events, or world events land.",
    },
    phase: "research",
    complexity: "medium",
  },
  {
    name: "get_dimension_profile",
    category: "mission_harness",
    tags: ["deeptrace", "dimension", "profile", "regime", "policy_context", "confidence", "company"],
    quickRef: {
      nextAction: "Read the latest normalized state, regime label, and policy context. If it looks stale, recompute. If it looks material, drill into bundle details.",
      nextTools: ["compute_dimension_profile", "export_dimension_bundle", "list_dimension_snapshots"],
      methodology: "mission_execution_harness",
      tip: "Use this for a fast read before pulling the heavier evidence and snapshot bundle.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "list_dimension_snapshots",
    category: "mission_harness",
    tags: ["deeptrace", "dimension", "snapshots", "history", "regime_transition", "timeline"],
    quickRef: {
      nextAction: "Review how the entity moved across regimes over time, then use those transitions to qualify the current recommendation.",
      nextTools: ["get_dimension_profile", "export_dimension_bundle", "record_execution_verification"],
      methodology: "mission_execution_harness",
      tip: "Use snapshots to answer whether a company became stronger after funding, hiring, or strategic events rather than assuming a static state.",
    },
    phase: "research",
    complexity: "low",
  },
  {
    name: "list_dimension_evidence",
    category: "mission_harness",
    tags: ["deeptrace", "dimension", "evidence", "audit", "verified", "estimated", "inferred"],
    quickRef: {
      nextAction: "Audit the evidence behind each score and availability status. If a recommendation depends on a weak signal, call that out explicitly.",
      nextTools: ["list_dimension_interactions", "record_execution_decision", "record_execution_verification"],
      methodology: "mission_execution_harness",
      tip: "Availability labels matter. Verified and inferred evidence should not be treated as equally strong.",
    },
    phase: "verify",
    complexity: "low",
  },
  {
    name: "list_dimension_interactions",
    category: "mission_harness",
    tags: ["deeptrace", "dimension", "interaction", "causal", "capital", "network", "fragility"],
    quickRef: {
      nextAction: "Use interaction effects to explain why the recommendation changes under different regimes instead of collapsing everything into one score.",
      nextTools: ["export_dimension_bundle", "record_execution_decision", "record_execution_verification"],
      methodology: "mission_execution_harness",
      tip: "Interaction effects are where capital, capability, and narrative signals become causal rather than just descriptive.",
    },
    phase: "research",
    complexity: "medium",
  },
  {
    name: "export_dimension_bundle",
    category: "mission_harness",
    tags: ["deeptrace", "dimension", "bundle", "profile", "snapshots", "evidence", "interactions", "audit"],
    quickRef: {
      nextAction: "Use the bundle as the auditable substrate for your memo, execution trace, or judge review. Cite the profile, evidence, and interactions directly.",
      nextTools: ["run_research_cell", "record_execution_step", "record_execution_decision", "record_execution_verification"],
      methodology: "mission_execution_harness",
      tip: "This is the safest handoff artifact for Claude Code because it preserves the profile, evidence, and history in one fetch.",
    },
    phase: "research",
    complexity: "medium",
  },
  {
    name: "run_research_cell",
    category: "mission_harness",
    tags: ["deeptrace", "research", "reanalysis", "confidence", "coverage", "evidence", "gaps", "counter_hypothesis"],
    quickRef: {
      nextAction: "Review the merged findings for gaps, counter-hypotheses, and coverage deficiencies. If evidence is still sparse, escalate to due-diligence orchestrator for external acquisition.",
      nextTools: ["export_dimension_bundle", "compute_dimension_profile", "run_entity_intelligence_mission", "record_execution_decision"],
      methodology: "mission_execution_harness",
      tip: "This cell re-analyzes existing DeepTrace data — it does NOT acquire new evidence. Use it to surface what is missing before committing to expensive external research.",
    },
    phase: "research",
    complexity: "high",
  },
  {
    name: "run_entity_intelligence_mission",
    category: "mission_harness",
    tags: ["deeptrace", "mission", "entity", "intelligence", "investigation", "relationship", "ownership", "supply_chain", "research_cell"],
    quickRef: {
      nextAction: "Review the unified mission output (graph, ownership, supply chain, signals, causal chains). If researchCell was enabled or forceResearchCell was used, check whether the cell triggered and review its findings.",
      nextTools: ["run_research_cell", "export_dimension_bundle", "record_execution_step", "record_execution_verification"],
      methodology: "mission_execution_harness",
      tip: "Pass researchCell=true for threshold-driven bounded re-analysis, or forceResearchCell=true when an operator wants the cell to run even if confidence and coverage look healthy.",
    },
    phase: "research",
    complexity: "high",
  },

  // ═══ DEEP SIM (claim graph → simulation → decision memo) ═══
  {
    name: "build_claim_graph",
    category: "deep_sim",
    tags: ["deeptrace", "claims", "evidence", "graph", "provenance"],
    quickRef: {
      nextAction: "Claim graph built. Extract variables to identify levers, or generate countermodels to stress-test the graph.",
      nextTools: ["extract_variables", "generate_countermodels"],
      methodology: "deep_sim",
    },
    phase: "research",
    complexity: "high",
  },
  {
    name: "extract_variables",
    category: "deep_sim",
    tags: ["deeptrace", "variables", "weights", "sensitivity"],
    quickRef: {
      nextAction: "Variables extracted with sensitivity weights. Generate countermodels to falsify, run a sim to explore branches, or score compounding drift.",
      nextTools: ["generate_countermodels", "run_deep_sim", "score_compounding"],
      methodology: "deep_sim",
    },
    phase: "research",
    complexity: "high",
  },
  {
    name: "generate_countermodels",
    category: "deep_sim",
    tags: ["deeptrace", "counter", "hypothesis", "falsification"],
    quickRef: {
      nextAction: "Countermodels generated. Run a deep sim to test them under branching scenarios, or rank interventions by delta.",
      nextTools: ["run_deep_sim", "rank_interventions"],
      methodology: "deep_sim",
    },
    phase: "research",
    complexity: "high",
  },
  {
    name: "run_deep_sim",
    category: "deep_sim",
    tags: ["deeptrace", "simulation", "scenario", "branching", "agents"],
    quickRef: {
      nextAction: "Simulation complete. Rank interventions by impact delta, render a decision memo, or score compounding trajectory drift.",
      nextTools: ["rank_interventions", "render_decision_memo", "score_compounding"],
      methodology: "deep_sim",
    },
    phase: "research",
    complexity: "high",
  },
  {
    name: "rank_interventions",
    category: "deep_sim",
    tags: ["deeptrace", "interventions", "ranking", "delta"],
    quickRef: {
      nextAction: "Interventions ranked by delta. Render a decision memo for stakeholders, or score compounding to check trajectory drift.",
      nextTools: ["render_decision_memo", "score_compounding"],
      methodology: "deep_sim",
    },
    phase: "research",
    complexity: "medium",
  },
  {
    name: "score_compounding",
    category: "deep_sim",
    tags: ["deeptrace", "trajectory", "compounding", "drift", "score"],
    quickRef: {
      nextAction: "Compounding score computed. Render a decision memo summarizing the trajectory, or re-rank interventions if drift is significant.",
      nextTools: ["render_decision_memo", "rank_interventions"],
      methodology: "deep_sim",
    },
    phase: "verify",
    complexity: "medium",
  },
  {
    name: "render_decision_memo",
    category: "deep_sim",
    tags: ["deeptrace", "memo", "decision", "executive", "report"],
    quickRef: {
      nextAction: "Decision memo rendered. Share with stakeholders. To iterate, rebuild the claim graph or extract new variables.",
      nextTools: ["build_claim_graph", "extract_variables"],
      methodology: "deep_sim",
    },
    phase: "ship",
    complexity: "medium",
  },
];

// ── Exported lookup structures ───────────────────────────────────────────

/** Map of tool name → registry entry for O(1) lookup */
export const TOOL_REGISTRY = new Map<string, ToolRegistryEntry>(
  REGISTRY_ENTRIES.map((e) => [e.name, e])
);

/** All registry entries as array */
export const ALL_REGISTRY_ENTRIES = REGISTRY_ENTRIES;

/** Get quick ref for a tool, with fallback for unregistered tools */
export function getQuickRef(toolName: string): ToolQuickRef | null {
  return TOOL_REGISTRY.get(toolName)?.quickRef ?? null;
}

/**
 * Compatibility helper for older callers that expect a "related tools" list.
 * The current registry models this through quickRef.nextTools.
 */
export function computeRelatedTools(toolName: string): string[] {
  return getQuickRef(toolName)?.nextTools ?? [];
}

/** Get all tools in a category */
export function getToolsByCategory(category: string): ToolRegistryEntry[] {
  return REGISTRY_ENTRIES.filter((e) => e.category === category);
}

/** Get all tools in a workflow phase */
export function getToolsByPhase(phase: ToolRegistryEntry["phase"]): ToolRegistryEntry[] {
  return REGISTRY_ENTRIES.filter((e) => e.phase === phase);
}

// ── Model-tier complexity routing ─────────────────────────────────────────

/** Default complexity by category (tools can override via the complexity field) */
const CATEGORY_COMPLEXITY: Record<string, "low" | "medium" | "high"> = {
  verification: "medium",
  eval: "medium",
  quality_gate: "medium",
  learning: "low",
  flywheel: "medium",
  reconnaissance: "medium",
  ui_capture: "medium",
  vision: "high",
  local_file: "low",
  web: "medium",
  github: "medium",
  documentation: "medium",
  bootstrap: "medium",
  self_eval: "high",
  parallel_agents: "medium",
  llm: "high",
  security: "medium",
  platform: "medium",
  research_writing: "high",
  flicker_detection: "high",
  figma_flow: "high",
  boilerplate: "low",
  benchmark: "high",
  progressive_discovery: "low",
  meta: "low",
  session_memory: "low",
  gaia_solvers: "high",
  toon: "low",
  pattern: "medium",
  git_workflow: "medium",
  seo: "medium",
  voice_bridge: "medium",
  critter: "low",
  email: "medium",
  rss: "low",
  architect: "low",
  qa_orchestration: "low",
  visual_qa: "medium",
  local_dashboard: "low",
  design_governance: "low",
  agent_traverse: "low",
  engine_context: "low",
};

/** Per-tool complexity overrides (when category default is wrong) */
const TOOL_COMPLEXITY_OVERRIDES: Record<string, "low" | "medium" | "high"> = {
  // Verification: logging is low
  log_phase_findings: "low",
  log_gap: "low",
  resolve_gap: "low",
  log_test_result: "low",
  get_verification_status: "low",
  list_verification_cycles: "low",
  // Eval: recording is low, comparison is high
  record_eval_result: "low",
  list_eval_runs: "low",
  compare_eval_runs: "high",
  // Quality gate
  get_gate_history: "low",
  get_gate_preset: "low",
  // Flywheel
  get_flywheel_status: "low",
  // Recon
  log_recon_finding: "low",
  get_recon_summary: "low",
  // Self-eval: logging is low
  log_tool_call: "low",
  cleanup_stale_runs: "low",
  // Parallel: simple operations are low
  claim_agent_task: "low",
  release_agent_task: "low",
  get_parallel_status: "low",
  get_agent_role: "low",
  log_context_budget: "low",
  list_agent_tasks: "low",
  // Bootstrap
  get_project_context: "low",
  // Local file: image/audio processing is medium/high
  read_image_ocr_text: "medium",
  transcribe_audio_file: "medium",
  extract_structured_data: "medium",
  solve_red_green_deviation_average_from_image: "high",
  solve_green_polygon_area_from_image: "high",
  grade_fraction_quiz_from_image: "high",
  extract_fractions_and_simplify_from_image: "high",
  solve_bass_clef_age_from_image: "high",
  solve_storage_upgrade_cost_per_file_from_image: "high",
  // Web
  fetch_url: "low",
  // Research Optimizer
  merge_research_results: "low",
  multi_criteria_score: "low",
  compare_options: "low",
  // Web Scraping
  scrapling_fetch: "low",
  scrapling_extract: "low",
  scrapling_batch_fetch: "medium",
  scrapling_track_element: "medium",
  scrapling_crawl: "high",
  scrapling_crawl_status: "low",
  scrapling_crawl_stop: "low",
  // GitHub
  search_github: "low",
  // Boilerplate
  get_boilerplate_status: "low",
  // Benchmark
  log_benchmark_milestone: "low",
};

/** Get the recommended model complexity tier for a tool */
export function getToolComplexity(toolName: string): "low" | "medium" | "high" {
  // 1. Check per-tool override
  if (TOOL_COMPLEXITY_OVERRIDES[toolName]) return TOOL_COMPLEXITY_OVERRIDES[toolName];
  // 2. Check explicit field on registry entry
  const entry = TOOL_REGISTRY.get(toolName);
  if (entry?.complexity) return entry.complexity;
  // 3. Fall back to category default
  if (entry) return CATEGORY_COMPLEXITY[entry.category] ?? "medium";
  return "medium";
}

// ── MCP security annotations (readOnlyHint, destructiveHint, openWorldHint) ──

import type { McpToolAnnotations } from "../types.js";

/**
 * Category-level annotation defaults.
 * Every tool inherits its category's annotations unless overridden per-tool.
 *
 * Classification logic:
 * - readOnlyHint: true  → category only reads/analyzes, no mutations
 * - destructiveHint: true → category creates, writes, deletes, or sends data
 * - openWorldHint: true  → category hits external services (network, APIs)
 */
const CATEGORY_ANNOTATIONS: Record<string, McpToolAnnotations> = {
  // ── Read-only categories (no side effects, no network) ──
  reconnaissance:        { readOnlyHint: true },
  progressive_discovery: { readOnlyHint: true },
  meta:                  { readOnlyHint: true },
  toon:                  { readOnlyHint: true },
  pattern:               { readOnlyHint: true },
  local_file:            { readOnlyHint: true },
  architect:             { readOnlyHint: true },
  local_dashboard:       { readOnlyHint: true },
  design_governance:     { readOnlyHint: true },
  agent_traverse:        { readOnlyHint: true },
  observability:         { readOnlyHint: true },
  research_optimizer:    { readOnlyHint: true },
  documentation:         { readOnlyHint: true },
  security:              { readOnlyHint: true },
  gaia_solvers:          { readOnlyHint: true },
  ui_ux_dive:            { readOnlyHint: true },
  ui_ux_dive_v2:         { readOnlyHint: true },

  // ── Stateful but non-destructive categories (write to local DB/state) ──
  verification:          { readOnlyHint: false, destructiveHint: false },
  eval:                  { readOnlyHint: false, destructiveHint: false },
  quality_gate:          { readOnlyHint: false, destructiveHint: false },
  learning:              { readOnlyHint: false, destructiveHint: false },
  flywheel:              { readOnlyHint: false, destructiveHint: false },
  session_memory:        { readOnlyHint: false, destructiveHint: false },
  self_eval:             { readOnlyHint: false, destructiveHint: false },
  critter:               { readOnlyHint: false, destructiveHint: false },
  engine_context:        { readOnlyHint: false, destructiveHint: false },
  qa_orchestration:      { readOnlyHint: false, destructiveHint: false },
  skill_update:          { readOnlyHint: false, destructiveHint: false },
  benchmark:             { readOnlyHint: false, destructiveHint: false },
  thompson_protocol:     { readOnlyHint: false, destructiveHint: false },
  parallel_agents:       { readOnlyHint: false, destructiveHint: false },
  research_writing:      { readOnlyHint: false, destructiveHint: false },
  platform:              { readOnlyHint: false, destructiveHint: false },

  // ── Destructive categories (create, write, delete, execute) ──
  boilerplate:           { destructiveHint: true },
  bootstrap:             { destructiveHint: true },
  git_workflow:          { destructiveHint: true },
  context_sandbox:       { destructiveHint: true },

  // ── Open-world categories (external network access) ──
  web:                   { openWorldHint: true },
  web_scraping:          { openWorldHint: true },
  github:                { openWorldHint: true },
  llm:                   { openWorldHint: true },
  email:                 { openWorldHint: true, destructiveHint: true },
  rss:                   { openWorldHint: true },
  voice_bridge:          { openWorldHint: true },
  mcp_bridge:            { openWorldHint: true },
  flicker_detection:     { openWorldHint: true },
  figma_flow:            { openWorldHint: true },
  seo:                   { readOnlyHint: true, openWorldHint: true },
  visual_qa:             { readOnlyHint: true, openWorldHint: true },
  ui_capture:            { readOnlyHint: false, openWorldHint: true },
  vision:                { readOnlyHint: true, openWorldHint: true },
};

/**
 * Per-tool annotation overrides (when category default is wrong).
 * Sparse — only tools that deviate from their category.
 */
const TOOL_ANNOTATION_OVERRIDES: Record<string, McpToolAnnotations> = {
  // ── Explicitly destructive tools ──
  send_email:                        { destructiveHint: true, openWorldHint: true },
  execute_shell_command:             { destructiveHint: true },
  sandbox_execute:                   { destructiveHint: true },
  scaffold_nodebench_project:        { destructiveHint: true },
  scaffold_research_pipeline:        { destructiveHint: true },
  git_create_branch:                 { destructiveHint: true },
  git_commit_changes:                { destructiveHint: true },
  git_push_branch:                   { destructiveHint: true, openWorldHint: true },
  create_visual_pr:                  { destructiveHint: true, openWorldHint: true },
  cleanup_stale_runs:                { destructiveHint: true },

  // ── Explicitly read-only tools in otherwise mutable categories ──
  get_verification_status:           { readOnlyHint: true },
  list_verification_cycles:          { readOnlyHint: true },
  list_eval_runs:                    { readOnlyHint: true },
  compare_eval_runs:                 { readOnlyHint: true },
  get_gate_history:                  { readOnlyHint: true },
  get_gate_preset:                   { readOnlyHint: true },
  get_flywheel_status:               { readOnlyHint: true },
  get_parallel_status:               { readOnlyHint: true },
  get_agent_role:                    { readOnlyHint: true },
  list_agent_tasks:                  { readOnlyHint: true },
  get_project_context:               { readOnlyHint: true },
  get_boilerplate_status:            { readOnlyHint: true },
  load_session_notes:                { readOnlyHint: true },
  refresh_task_context:              { readOnlyHint: true },
  get_engine_context_health:         { readOnlyHint: true },
  get_workflow_history:              { readOnlyHint: true },
  search_content_archive:            { readOnlyHint: true },
  search_all_knowledge:              { readOnlyHint: true },
  get_recon_summary:                 { readOnlyHint: true },
  save_session_note:                 { destructiveHint: false },

  // ── Open-world overrides for specific tools ──
  fetch_url:                         { openWorldHint: true, readOnlyHint: true },
  web_search:                        { openWorldHint: true, readOnlyHint: true },
  search_github:                     { openWorldHint: true, readOnlyHint: true },
  check_mcp_setup:                   { readOnlyHint: true, openWorldHint: true },
  scrapling_crawl_stop:              { destructiveHint: false, openWorldHint: true },

  // ── Discovery tools are always read-only ──
  discover_tools:                    { readOnlyHint: true },
  get_tool_quick_ref:                { readOnlyHint: true },
  get_workflow_chain:                { readOnlyHint: true },
  findTools:                         { readOnlyHint: true },
  getMethodology:                    { readOnlyHint: true },
};

/**
 * Get MCP security annotations for a tool.
 * Resolution: per-tool override merged ON TOP of category default → empty (no hints).
 */
export function getToolAnnotations(toolName: string): McpToolAnnotations {
  const entry = TOOL_REGISTRY.get(toolName);
  const categoryDefaults = entry ? (CATEGORY_ANNOTATIONS[entry.category] ?? {}) : {};
  const overrides = TOOL_ANNOTATION_OVERRIDES[toolName];
  if (overrides) {
    return { ...categoryDefaults, ...overrides };
  }
  return categoryDefaults;
}

// ── Multi-modal search engine ─────────────────────────────────────────────

export interface SearchResult {
  name: string;
  description: string;
  category: string;
  score: number;
  /** Human-readable breakdown of why this tool matched */
  matchReasons: string[];
  quickRef: ToolQuickRef;
  phase: string;
  tags: string[];
}

export type SearchMode = "hybrid" | "fuzzy" | "regex" | "prefix" | "semantic" | "exact" | "dense" | "embedding";

// ── Synonym / semantic expansion map ──────────────────────────────────────
const SYNONYM_MAP: Record<string, string[]> = {
  // ── Existing technical synonyms ──
  verify: ["validate", "check", "confirm", "test", "assert", "ensure", "correct"],
  test: ["verify", "validate", "check", "assert", "spec", "expect"],
  search: ["find", "discover", "lookup", "query", "locate", "browse"],
  find: ["search", "discover", "lookup", "locate"],
  create: ["scaffold", "generate", "build", "init", "setup", "make", "new"],
  setup: ["bootstrap", "init", "configure", "scaffold", "create"],
  fix: ["resolve", "repair", "debug", "patch", "correct"],
  deploy: ["ship", "publish", "release", "launch", "ci", "cd", "pipeline"],
  analyze: ["inspect", "review", "examine", "audit", "scan", "screenshot"],
  monitor: ["watch", "observe", "track", "follow"],
  security: ["vulnerability", "audit", "cve", "secret", "credential", "leak", "exposure"],
  benchmark: ["measure", "evaluate", "score", "grade", "performance", "capability"],
  parallel: ["multi-agent", "coordinate", "team", "concurrent", "distributed", "multiple"],
  document: ["doc", "documentation", "readme", "agents-md", "report"],
  research: ["recon", "investigate", "discover", "explore", "gather"],
  quality: ["gate", "check", "validate", "standard", "rule"],
  code: ["implement", "build", "develop", "write", "program"],
  debug: ["fix", "investigate", "diagnose", "troubleshoot", "stacktrace"],
  ui: ["frontend", "visual", "screenshot", "responsive", "layout", "css", "component"],
  llm: ["model", "ai", "generate", "prompt", "gpt", "claude", "gemini"],
  migrate: ["upgrade", "update", "port", "convert", "transition", "refactor"],
  review: ["inspect", "audit", "pr", "pull-request", "feedback", "critique", "merge"],
  performance: ["speed", "latency", "optimize", "fast", "slow", "bottleneck"],
  data: ["csv", "xlsx", "json", "pdf", "file", "parse", "extract", "spreadsheet"],
  paper: ["academic", "research", "write", "publish", "neurips", "icml", "arxiv", "section"],
  start: ["begin", "init", "kick-off", "launch", "bootstrap", "new"],
  report: ["generate", "summary", "output", "export", "document"],
  clean: ["cleanup", "prune", "remove", "delete", "stale", "orphan"],
  remember: ["save", "record", "persist", "store", "note", "session"],
  save: ["remember", "record", "persist", "store", "note", "keep"],
  wrong: ["investigate", "debug", "diagnose", "error", "issue", "problem", "fail"],
  correct: ["verify", "validate", "check", "ensure", "confirm"],
  write: ["paper", "section", "draft", "compose", "author", "document"],
  task: ["claim", "assign", "work", "agent", "parallel", "concurrent"],
  why: ["purpose", "reason", "intentionality", "motivation", "goal", "critter"],
  purpose: ["why", "reason", "intentionality", "motivation", "goal", "critter"],
  reflect: ["think", "pause", "reconsider", "intentionality", "metacognition", "critter"],
  // ── New user natural language expansions (ablation-driven) ──
  website: ["seo", "url", "web", "fetch", "page", "lighthouse", "performance"],
  webpage: ["seo", "url", "web", "fetch", "page", "html"],
  fast: ["seo", "performance", "speed", "latency", "lighthouse"],
  slow: ["seo", "performance", "speed", "latency", "lighthouse", "bottleneck"],
  inbox: ["email", "read_emails", "send_email", "messages"],
  email: ["send_email", "read_emails", "inbox", "messages", "smtp", "imap"],
  ai: ["llm", "model", "prompt", "generate", "gpt", "claude", "gemini", "call_llm"],
  summarize: ["llm", "extract", "generate", "analyze", "call_llm"],
  bugs: ["scan", "code", "analysis", "dependencies", "vulnerabilities", "debug"],
  readme: ["documentation", "generate", "report", "markdown", "document"],
  compiles: ["closed_loop", "build", "test", "verify", "compile"],
  works: ["test", "verify", "closed_loop", "flywheel", "quality", "check"],
  commits: ["git", "commit", "messages", "conventional", "pr"],
  push: ["git", "commit", "merge", "pr", "deploy"],
  merge: ["git", "pr", "review", "checklist", "enforce"],
  open: ["read", "file", "csv", "json", "parse", "load"],
  look: ["read", "analyze", "inspect", "view", "examine", "fetch"],
  good: ["quality", "gate", "check", "validate", "analysis"],
  screenshot: ["analyze", "capture", "vision", "ui", "responsive", "visual"],
  run: ["test", "execute", "closed_loop", "quality", "cli"],
  check: ["verify", "validate", "audit", "scan", "review", "gate", "test"],
  help: ["generate", "create", "scaffold", "analyze", "recommend"],
  computer: ["llm", "ai", "model", "analyze", "extract"],
  text: ["extract", "parse", "read", "llm", "structured", "analyze"],
};

// ── TF-IDF: compute inverse document frequency for tags ───────────────────
let _idfCache: Map<string, number> | null = null;

function computeIDF(): Map<string, number> {
  if (_idfCache) return _idfCache;
  const docCount = REGISTRY_ENTRIES.length;
  const tagDocFreq = new Map<string, number>();
  for (const entry of REGISTRY_ENTRIES) {
    const seen = new Set<string>();
    for (const tag of entry.tags) {
      if (!seen.has(tag)) {
        tagDocFreq.set(tag, (tagDocFreq.get(tag) ?? 0) + 1);
        seen.add(tag);
      }
    }
  }
  const idf = new Map<string, number>();
  for (const [tag, freq] of tagDocFreq) {
    idf.set(tag, Math.log(docCount / freq));
  }
  _idfCache = idf;
  return idf;
}

// ── Levenshtein distance for fuzzy matching ──────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ── N-gram generator ─────────────────────────────────────────────────────
function ngrams(str: string, n: number): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i <= str.length - n; i++) {
    result.add(str.slice(i, i + n));
  }
  return result;
}

function ngramSimilarity(a: string, b: string, n = 3): number {
  if (a.length < n || b.length < n) return a.includes(b) || b.includes(a) ? 0.5 : 0;
  const setA = ngrams(a, n);
  const setB = ngrams(b, n);
  let intersection = 0;
  for (const g of setA) { if (setB.has(g)) intersection++; }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Dense search: TF-IDF cosine similarity on full text ──────────────────

/** Tokenize text into lowercase words (alpha + underscore only) */
export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z_]+/g) ?? [];
}

/** Build a TF vector: word → frequency */
function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  // Normalize by max frequency
  const maxFreq = Math.max(...tf.values(), 1);
  for (const [k, v] of tf) tf.set(k, v / maxFreq);
  return tf;
}

/** Pre-computed document TF-IDF vectors for dense search (lazy init) */
let _denseVectorsCache: Map<string, Map<string, number>> | null = null;
let _denseIDFCache: Map<string, number> | null = null;

export function buildDenseIndex(): { vectors: Map<string, Map<string, number>>; idf: Map<string, number> } {
  if (_denseVectorsCache && _denseIDFCache) return { vectors: _denseVectorsCache, idf: _denseIDFCache };

  // Build corpus: each tool's full text (name + tags + description + category)
  const corpus = new Map<string, string[]>();
  for (const entry of REGISTRY_ENTRIES) {
    const tokens = tokenize(`${entry.name} ${entry.tags.join(" ")} ${entry.category} ${entry.quickRef.nextAction}`);
    corpus.set(entry.name, tokens);
  }

  // Compute IDF across corpus
  const docCount = corpus.size;
  const docFreq = new Map<string, number>();
  for (const tokens of corpus.values()) {
    const unique = new Set(tokens);
    for (const t of unique) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [term, freq] of docFreq) {
    idf.set(term, Math.log((docCount + 1) / (freq + 1)) + 1); // smoothed IDF
  }

  // Build TF-IDF vectors per tool
  const vectors = new Map<string, Map<string, number>>();
  for (const [name, tokens] of corpus) {
    const tf = termFreq(tokens);
    const tfidf = new Map<string, number>();
    for (const [term, tfVal] of tf) {
      tfidf.set(term, tfVal * (idf.get(term) ?? 1));
    }
    vectors.set(name, tfidf);
  }

  _denseVectorsCache = vectors;
  _denseIDFCache = idf;
  return { vectors, idf };
}

/** Cosine similarity between two sparse vectors */
function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0;
  for (const [k, v] of a) {
    normA += v * v;
    const bv = b.get(k);
    if (bv !== undefined) dot += v * bv;
  }
  for (const v of b.values()) normB += v * v;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Domain cluster boosting ──────────────────────────────────────────────
const DOMAIN_CLUSTERS: Record<string, string[]> = {
  verification: ["verification", "quality_gate", "flywheel"],
  testing: ["quality_gate", "eval", "verification"],
  research: ["reconnaissance", "web", "github"],
  implementation: ["bootstrap", "boilerplate", "parallel_agents"],
  analysis: ["vision", "ui_capture", "flicker_detection", "figma_flow"],
  knowledge: ["learning", "self_eval", "reconnaissance"],
  writing: ["research_writing", "documentation"],
  measurement: ["eval", "benchmark", "self_eval"],
};

// ── Execution trace edges — co-occurrence mining from tool_call_log ────────
// Based on Agent-as-a-Graph (arxiv:2511.18194): execution trace edges
// mine sequential co-occurrence patterns to discover implicit tool relationships.
let _cooccurrenceCache: Map<string, string[]> | null = null;
let _cooccurrenceCacheTime = 0;
const COOCCURRENCE_TTL_MS = 60_000; // refresh every 60s

/** Agent-as-a-Graph wRRF constants (arxiv:2511.18194).
 *
 *  Paper optimal: α_A=1.5, α_T=1.0, K=60. Ablation confirmed this beats 5 alternatives
 *  even for single-server tool retrieval (Recall@5=0.625 vs 0.583 for α_D=0.6/K=20).
 *
 *  Key finding: K and α_D are coupled. K=60 dampens scores enough that α_D=1.5 lifts
 *  category siblings gently. K=20 with α_D=1.5 overshoots (domain boost drowns lexical).
 *  The paper's full parameter set is internally consistent — don't cherry-pick.
 *
 *  Max embedding contribution at rank 1: α_T * 1000/(60+1) ≈ 16 pts (tool),
 *  α_D * 1000/(60+1) ≈ 25 pts (domain). These slot into the additive scoring system
 *  alongside keyword (3-50), fuzzy (4-12), dense (0-40) as a moderate signal.
 *
 *  Validated via 6-config ablation grid: see tools.test.ts "wRRF α ratio ablation". */
let WRRF_ALPHA_T = 1.0; // tool weight — direct embedding match
let WRRF_ALPHA_D = 1.5; // domain weight — upward traversal boost (paper optimal)
let WRRF_K = 60;        // RRF smoothing constant (paper optimal)

/** Bonus score for tools that frequently co-occur with top-ranked results.
 *  Calibrated to lift borderline tools ~1-2 positions without overriding strong lexical matches.
 *  At +4, a tool needs ≥8 points of lexical evidence to appear in results at all (score > 0),
 *  then trace edges nudge it up. Compare: keyword:desc = +3, semantic:tag = +6, domain_boost = +5. */
const TRACE_EDGE_BOOST = 4;

// DB accessor injected at init time to avoid circular import (toolRegistry is pure ESM)
let _dbAccessor: (() => any) | null = null;

/** Inject the DB accessor — called once from index.ts at startup. */
export function _setDbAccessor(accessor: () => any): void {
  _dbAccessor = accessor;
}

/**
 * Mine co-occurrence patterns from tool_call_log.
 * Returns a map of toolName → [most co-occurring tools] based on session adjacency.
 *
 * Approach: for each session, pull the ordered tool sequence, then count
 * pairs within a sliding window of 5 calls. O(n) per session, no self-join.
 */
export function getCooccurrenceEdges(): Map<string, string[]> {
  const now = Date.now();
  if (_cooccurrenceCache && now - _cooccurrenceCacheTime < COOCCURRENCE_TTL_MS) {
    return _cooccurrenceCache;
  }

  const edges = new Map<string, string[]>();
  if (!_dbAccessor) {
    _cooccurrenceCache = edges;
    _cooccurrenceCacheTime = now;
    return edges;
  }

  try {
    const db = _dbAccessor();

    // Pull recent sessions' tool sequences, ordered by creation time
    const rows = db.prepare(`
      SELECT session_id, tool_name
      FROM tool_call_log
      WHERE created_at > datetime('now', '-7 days')
      ORDER BY session_id, created_at ASC
    `).all() as Array<{ session_id: string; tool_name: string }>;

    // Group by session
    const sessions = new Map<string, string[]>();
    for (const row of rows) {
      const list = sessions.get(row.session_id) ?? [];
      list.push(row.tool_name);
      sessions.set(row.session_id, list);
    }

    // Count co-occurrences within sliding window of 5
    const pairCounts = new Map<string, number>();
    for (const [, sequence] of sessions) {
      for (let i = 0; i < sequence.length; i++) {
        const toolA = sequence[i];
        for (let j = i + 1; j < Math.min(i + 6, sequence.length); j++) {
          const toolB = sequence[j];
          if (toolA === toolB) continue;
          const key = `${toolA}\0${toolB}`;
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
          // Bidirectional
          const keyR = `${toolB}\0${toolA}`;
          pairCounts.set(keyR, (pairCounts.get(keyR) ?? 0) + 1);
        }
      }
    }

    // Filter to pairs with 2+ co-occurrences, sort by count
    const sorted = [...pairCounts.entries()]
      .filter(([, cnt]) => cnt >= 2)
      .sort((a, b) => b[1] - a[1]);

    for (const [key] of sorted) {
      const [toolA, toolB] = key.split("\0");
      const list = edges.get(toolA) ?? [];
      if (list.length < 10) {
        list.push(toolB);
        edges.set(toolA, list);
      }
    }
  } catch {
    // No DB or table not yet created — return empty (graceful degradation)
  }

  _cooccurrenceCache = edges;
  _cooccurrenceCacheTime = now;
  return edges;
}

/** Reset co-occurrence cache — for testing only. */
export function _resetCooccurrenceCache(): void {
  _cooccurrenceCache = null;
  _cooccurrenceCacheTime = 0;
}

/** Inject co-occurrence edges directly — for testing only. */
export function _setCooccurrenceForTesting(edges: Map<string, string[]>): void {
  _cooccurrenceCache = edges;
  _cooccurrenceCacheTime = Date.now() + 999_999_999; // never expire
}

/** Override wRRF weights — for ablation testing only.
 *  Allows comparing paper's α_A=1.5,α_T=1.0,K=60 vs our α_T=1.0,α_D=0.6,K=20. */
export function _setWrrfParamsForTesting(params: { alphaT?: number; alphaD?: number; k?: number }): void {
  if (params.alphaT !== undefined) WRRF_ALPHA_T = params.alphaT;
  if (params.alphaD !== undefined) WRRF_ALPHA_D = params.alphaD;
  if (params.k !== undefined) WRRF_K = params.k;
}

/** Restore default wRRF weights — for ablation testing only. */
export function _resetWrrfParamsForTesting(): void {
  WRRF_ALPHA_T = 1.0;
  WRRF_ALPHA_D = 1.5;
  WRRF_K = 60;
}

function getDomainBoost(category: string, topCategories: Set<string>): number {
  for (const [, cluster] of Object.entries(DOMAIN_CLUSTERS)) {
    if (cluster.includes(category) && cluster.some((c) => topCategories.has(c) && c !== category)) {
      return 5;
    }
  }
  return 0;
}

/**
 * Multi-modal hybrid search engine with Agent-as-a-Graph bipartite retrieval.
 *
 * Search modes (all run in parallel, scores merged):
 * - **keyword**: Exact and partial word matching on name, tags, description, category
 * - **fuzzy**: Levenshtein distance for typo tolerance (e.g., "verifiy" → "verify")
 * - **n-gram**: Trigram similarity for partial word overlap (e.g., "screen" → "screenshot")
 * - **prefix**: Matches tool names starting with query words (e.g., "cap" → "capture_*")
 * - **semantic**: Synonym expansion using curated map (e.g., "check" → also "verify", "validate")
 * - **TF-IDF**: Rare tags score higher than common ones
 * - **regex**: Pass a regex pattern to match against tool names/descriptions
 * - **bigram**: Two-word phrase matching (e.g., "quality gate" matched as phrase)
 * - **domain boost**: Related categories get boosted when top results cluster
 * - **embedding**: Neural embedding with type-specific wRRF (tool α_T + domain α_D nodes)
 * - **graph traversal**: Upward traversal from tools → domains → sibling tools
 * - **trace edges**: Execution co-occurrence mining from tool_call_log (dynamic graph edges)
 *
 * Graph architecture based on arxiv:2511.18194 (Agent-as-a-Graph).
 */
export function hybridSearch(
  query: string,
  tools: Array<{ name: string; description: string }>,
  options?: {
    category?: string;
    phase?: string;
    limit?: number;
    mode?: SearchMode;
    /** If true, includes matchReasons in results explaining why each tool matched */
    explain?: boolean;
    /** Pre-computed query embedding vector for semantic search (passed from async caller) */
    embeddingQueryVec?: Float32Array;
    /** If true, search ALL_REGISTRY_ENTRIES (full 175-tool registry) regardless of loaded preset.
     *  Needed for dynamic loading: discover_tools must find unloaded tools to suggest load_toolset. */
    searchFullRegistry?: boolean;
    /** Ablation flags: disable individual strategies to measure their contribution */
    ablation?: {
      disableSynonyms?: boolean;
      disableFuzzy?: boolean;
      disableTagCoverage?: boolean;
      disableTfIdf?: boolean;
      disableNgram?: boolean;
      disableBigram?: boolean;
      disableDense?: boolean;
      disableDomainBoost?: boolean;
      disableTraceEdges?: boolean;
      disablePrefix?: boolean;
      disableEmbedding?: boolean;
    };
  }
): SearchResult[] {
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(Boolean);
  const limit = options?.limit ?? 15;
  const explain = options?.explain ?? false;
  const mode = options?.mode ?? "hybrid";
  const idf = computeIDF();
  const ab = options?.ablation ?? {};

  // Regex mode: compile pattern, match against name+description
  let regexPattern: RegExp | null = null;
  if (mode === "regex") {
    try { regexPattern = new RegExp(queryLower, "i"); } catch { /* invalid regex, fall through to keyword */ }
  }

  // Build bigrams from query for phrase matching
  const queryBigrams: string[] = [];
  for (let i = 0; i < queryWords.length - 1; i++) {
    queryBigrams.push(`${queryWords[i]} ${queryWords[i + 1]}`);
  }

  // Expand query with synonyms
  const expandedWords = new Set(queryWords);
  if (mode === "hybrid" || mode === "semantic") {
    for (const word of queryWords) {
      const syns = SYNONYM_MAP[word];
      if (syns) syns.forEach((s) => expandedWords.add(s));
    }
  }

  // ── Pre-compute query-invariant data ONCE before the per-tool loop ──

  // Dense: TF-IDF query vector (query-invariant — don't recompute per tool)
  let denseQueryVec: Map<string, number> | null = null;
  let denseDocVectors: Map<string, Map<string, number>> | null = null;
  if (mode === "dense" || mode === "hybrid") {
    const { vectors, idf: denseIdf } = buildDenseIndex();
    const queryTokens = tokenize(queryLower);
    if (queryTokens.length > 0) {
      const queryTf = termFreq(queryTokens);
      denseQueryVec = new Map<string, number>();
      for (const [term, tfVal] of queryTf) {
        denseQueryVec.set(term, tfVal * (denseIdf.get(term) ?? 1));
      }
      denseDocVectors = vectors;
    }
  }

  // Embedding: pre-split ranks by node type (query-invariant — don't recompute per tool)
  let embToolRanks: Map<string, number> | null = null;
  let embDomainRanks: Map<string, number> | null = null;
  if ((mode === "embedding" || mode === "hybrid") && isEmbeddingReady() && options?.embeddingQueryVec) {
    const vecResults = embeddingSearch(options.embeddingQueryVec, 50);
    embToolRanks = new Map<string, number>();
    embDomainRanks = new Map<string, number>();
    let toolIdx = 0, domainIdx = 0;
    for (const r of vecResults) {
      if (r.nodeType === "domain") {
        domainIdx++;
        embDomainRanks.set(r.name.replace("domain:", ""), domainIdx);
      } else {
        toolIdx++;
        embToolRanks.set(r.name, toolIdx);
      }
    }
  }

  const toolScores = new Map<string, { score: number; reasons: string[] }>();

  // When searchFullRegistry is enabled, search ALL registry entries (not just loaded tools).
  // This lets discover_tools find unloaded tools and suggest load_toolset.
  const toolDescMap = new Map(tools.map(t => [t.name, t.description]));
  const searchList: Array<{ name: string; description: string }> = options?.searchFullRegistry
    ? ALL_REGISTRY_ENTRIES.map(e => ({
        name: e.name,
        description: toolDescMap.get(e.name) ?? `${e.tags.join(" ")} ${e.category} ${e.phase}`,
      }))
    : tools;

  for (const tool of searchList) {
    const entry = TOOL_REGISTRY.get(tool.name);
    if (!entry) continue;

    if (options?.category && entry.category !== options.category) continue;
    if (options?.phase && entry.phase !== options.phase) continue;

    let score = 0;
    const reasons: string[] = [];
    const nameLower = tool.name.toLowerCase();
    const nameParts = nameLower.split("_");
    const descLower = tool.description.toLowerCase();
    const allText = `${nameLower} ${entry.tags.join(" ")} ${descLower} ${entry.category}`;

    // ── MODE: regex ──
    if (regexPattern) {
      if (regexPattern.test(nameLower)) { score += 30; reasons.push(`regex:name`); }
      if (regexPattern.test(descLower)) { score += 10; reasons.push(`regex:description`); }
      if (entry.tags.some((t) => regexPattern!.test(t))) { score += 15; reasons.push(`regex:tag`); }
    }

    // ── MODE: exact ──
    if (mode === "exact") {
      if (nameLower === queryLower) { score += 100; reasons.push(`exact:name`); }
      if (entry.tags.includes(queryLower)) { score += 50; reasons.push(`exact:tag`); }
    }

    // ── MODE: prefix ──
    if ((mode === "hybrid" || mode === "prefix") && !ab.disablePrefix) {
      for (const word of queryWords) {
        if (nameLower.startsWith(word)) { score += 20; reasons.push(`prefix:name(${word})`); }
        if (nameParts.some((p) => p.startsWith(word))) { score += 12; reasons.push(`prefix:name_part(${word})`); }
        if (entry.tags.some((t) => t.startsWith(word))) { score += 8; reasons.push(`prefix:tag(${word})`); }
      }
    }

    // ── KEYWORD matching (core, always runs unless regex-only or exact-only) ──
    if (mode !== "regex" && mode !== "exact") {
      for (const word of queryWords) {
        // Exact name match
        if (nameLower === word) { score += 50; reasons.push(`keyword:exact_name(${word})`); }
        // Name contains word
        else if (nameLower.includes(word)) { score += 15; reasons.push(`keyword:name(${word})`); }

        // Tag exact match (weighted by TF-IDF)
        if (entry.tags.includes(word)) {
          const idfWeight = idf.get(word) ?? 3;
          const tagScore = ab.disableTfIdf ? 10 : Math.round(10 * (idfWeight / 3));
          score += tagScore;
          reasons.push(`keyword:tag(${word},idf=${idfWeight.toFixed(1)})`);
        }
        // Tag partial match
        else if (entry.tags.some((t) => t.includes(word))) {
          score += 5;
          reasons.push(`keyword:tag_partial(${word})`);
        }

        // Description contains word
        if (descLower.includes(word)) { score += 3; reasons.push(`keyword:desc(${word})`); }

        // Category match
        if (entry.category.includes(word)) { score += 8; reasons.push(`keyword:category(${word})`); }
      }

      // Methodology match
      if (entry.quickRef.methodology && queryLower.includes(entry.quickRef.methodology)) {
        score += 12;
        reasons.push(`keyword:methodology(${entry.quickRef.methodology})`);
      }

      // ── TAG COVERAGE BONUS: reward tools where many query words hit tags ──
      // If 60%+ of query words match tags, that's a strong relevance signal.
      if (queryWords.length >= 3 && !ab.disableTagCoverage) {
        const tagSet = new Set(entry.tags);
        const hits = queryWords.filter(w => tagSet.has(w)).length;
        const coverage = hits / queryWords.length;
        if (coverage >= 0.6) {
          const coverageBonus = Math.round(coverage * hits * 5);
          score += coverageBonus;
          reasons.push(`tag_coverage:${hits}/${queryWords.length}(${(coverage * 100).toFixed(0)}%,+${coverageBonus})`);
        }
      }
    }

    // ── SEMANTIC: synonym expansion (only score expanded words, not original) ──
    if ((mode === "hybrid" || mode === "semantic") && !ab.disableSynonyms) {
      for (const syn of expandedWords) {
        if (queryWords.includes(syn)) continue; // skip original words
        if (entry.tags.includes(syn)) { score += 6; reasons.push(`semantic:tag(${syn})`); }
        else if (nameLower.includes(syn)) { score += 4; reasons.push(`semantic:name(${syn})`); }
        else if (descLower.includes(syn)) { score += 2; reasons.push(`semantic:desc(${syn})`); }
      }
    }

    // ── FUZZY: Levenshtein distance for typo tolerance ──
    if ((mode === "hybrid" || mode === "fuzzy") && !ab.disableFuzzy) {
      for (const word of queryWords) {
        if (word.length < 4) continue; // skip short words for fuzzy
        // Check against name parts
        for (const part of nameParts) {
          if (part.length < 3) continue;
          const dist = levenshtein(word, part);
          const maxLen = Math.max(word.length, part.length);
          if (dist > 0 && dist <= 2 && dist / maxLen < 0.4) {
            score += Math.round(12 * (1 - dist / maxLen));
            reasons.push(`fuzzy:name_part(${word}→${part},d=${dist})`);
          }
        }
        // Check against tags
        for (const tag of entry.tags) {
          const dist = levenshtein(word, tag);
          const maxLen = Math.max(word.length, tag.length);
          if (dist > 0 && dist <= 2 && dist / maxLen < 0.4) {
            score += Math.round(8 * (1 - dist / maxLen));
            reasons.push(`fuzzy:tag(${word}→${tag},d=${dist})`);
          }
        }
      }
    }

    // ── N-GRAM: trigram similarity ──
    if ((mode === "hybrid" || mode === "fuzzy") && !ab.disableNgram) {
      for (const word of queryWords) {
        if (word.length < 4) continue;
        const nameSim = ngramSimilarity(word, nameLower);
        if (nameSim > 0.2 && !nameLower.includes(word)) {
          score += Math.round(nameSim * 10);
          reasons.push(`ngram:name(${word},sim=${nameSim.toFixed(2)})`);
        }
        for (const tag of entry.tags) {
          if (tag.length < 4) continue;
          const tagSim = ngramSimilarity(word, tag);
          if (tagSim > 0.3 && !tag.includes(word) && word !== tag) {
            score += Math.round(tagSim * 6);
            reasons.push(`ngram:tag(${word}↔${tag},sim=${tagSim.toFixed(2)})`);
          }
        }
      }
    }

    // ── BIGRAM: phrase matching ──
    if (queryBigrams.length > 0 && !ab.disableBigram) {
      for (const bigram of queryBigrams) {
        if (allText.includes(bigram)) {
          score += 15;
          reasons.push(`bigram:phrase("${bigram}")`);
        }
      }
    }

    // ── DENSE: TF-IDF cosine similarity (query vec pre-computed above) ──
    if (denseQueryVec && denseDocVectors && !ab.disableDense) {
      const docVec = denseDocVectors.get(tool.name);
      if (docVec) {
        const sim = cosineSimilarity(denseQueryVec, docVec);
        if (sim > 0.05) {
          const denseScore = Math.round(sim * 40);
          score += denseScore;
          reasons.push(`dense:cosine(sim=${sim.toFixed(3)},+${denseScore})`);
        }
      }
    }

    // ── EMBEDDING: Agent-as-a-Graph bipartite RRF (ranks pre-computed above) ──
    if (embToolRanks && embDomainRanks && !ab.disableEmbedding) {
      const toolRank = embToolRanks.get(tool.name);
      if (toolRank) {
        const rrfScore = Math.round(WRRF_ALPHA_T * 1000 / (WRRF_K + toolRank));
        score += rrfScore;
        reasons.push(`embedding:tool_rrf(rank=${toolRank},+${rrfScore})`);
      }

      // Upward traversal: if this tool's domain matched, boost it (sibling expansion)
      const toolCategory = entry.category;
      const domainRank = embDomainRanks.get(toolCategory);
      if (domainRank) {
        const domainRrf = Math.round(WRRF_ALPHA_D * 1000 / (WRRF_K + domainRank));
        score += domainRrf;
        reasons.push(`embedding:domain_rrf(${toolCategory},rank=${domainRank},+${domainRrf})`);
      }
    }

    if (score > 0) {
      toolScores.set(tool.name, { score, reasons });
    }
  }

  // ── Domain cluster boosting (2nd pass) ──
  const topCategories = new Set<string>();
  const sortedPrelim = [...toolScores.entries()].sort((a, b) => b[1].score - a[1].score);
  for (const [name] of sortedPrelim.slice(0, 5)) {
    const entry = TOOL_REGISTRY.get(name);
    if (entry) topCategories.add(entry.category);
  }

  // ── Execution trace edges (2nd pass) — co-occurrence boost ──
  // Agent-as-a-Graph: mine tool_call_log for sequential co-occurrence.
  // If a top-ranked tool frequently co-occurs with another tool, boost the sibling.
  const cooccurrence = getCooccurrenceEdges();
  const topToolNames = sortedPrelim.slice(0, 5).map(([name]) => name);
  const traceBoostTargets = new Set<string>();
  for (const topTool of topToolNames) {
    const neighbors = cooccurrence.get(topTool);
    if (neighbors) neighbors.forEach((n) => traceBoostTargets.add(n));
  }

  const results: SearchResult[] = [];
  for (const tool of searchList) {
    const entry = TOOL_REGISTRY.get(tool.name);
    const scored = toolScores.get(tool.name);
    if (!entry || !scored) continue;

    const domainBoost = ab.disableDomainBoost ? 0 : getDomainBoost(entry.category, topCategories);
    if (domainBoost > 0) {
      scored.score += domainBoost;
      scored.reasons.push(`domain_boost:+${domainBoost}`);
    }

    // Execution trace edge: boost tools that frequently co-occur with top results
    if (traceBoostTargets.has(tool.name) && !topToolNames.includes(tool.name) && !ab.disableTraceEdges) {
      scored.score += TRACE_EDGE_BOOST;
      scored.reasons.push(`trace_edge:+${TRACE_EDGE_BOOST}`);
    }

    results.push({
      name: tool.name,
      description: tool.description,
      category: entry.category,
      score: scored.score,
      matchReasons: explain ? scored.reasons : [],
      quickRef: entry.quickRef,
      phase: entry.phase,
      tags: entry.tags,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/** Available search modes for discover_tools */
export const SEARCH_MODES: SearchMode[] = ["hybrid", "fuzzy", "regex", "prefix", "semantic", "exact", "dense", "embedding"];

// ── Workflow chains ──────────────────────────────────────────────────────

export interface WorkflowChain {
  name: string;
  description: string;
  steps: Array<{ tool: string; action: string }>;
}

/** Pre-built workflow chains for common tasks */
export const WORKFLOW_CHAINS: Record<string, WorkflowChain> = {
  new_feature: {
    name: "Build a New Feature",
    description: "End-to-end workflow from research to ship",
    steps: [
      { tool: "search_all_knowledge", action: "Check past findings for this area" },
      { tool: "start_verification_cycle", action: "Begin 6-phase process" },
      { tool: "run_recon", action: "Research context and latest updates" },
      { tool: "log_phase_findings", action: "Record Phase 1 context" },
      { tool: "log_gap", action: "Document gaps found" },
      { tool: "resolve_gap", action: "Fix each gap" },
      { tool: "run_closed_loop", action: "Compile→lint→test→debug" },
      { tool: "log_test_result", action: "Record test results" },
      { tool: "run_quality_gate", action: "Validate against rules" },
      { tool: "run_mandatory_flywheel", action: "6-step final verification" },
      { tool: "record_learning", action: "Capture what you learned" },
      { tool: "promote_to_eval", action: "Feed into eval batch" },
      { tool: "save_session_note", action: "Save traceability note — cite original request, summarize what was delivered" },
    ],
  },
  fix_bug: {
    name: "Fix a Bug",
    description: "Structured debugging with verification",
    steps: [
      { tool: "search_all_knowledge", action: "Check if this bug was seen before" },
      { tool: "assess_risk", action: "Evaluate fix risk" },
      { tool: "run_closed_loop", action: "Reproduce → fix → verify green loop" },
      { tool: "log_test_result", action: "Record regression test" },
      { tool: "run_mandatory_flywheel", action: "6-step verification" },
      { tool: "record_learning", action: "Record the gotcha/pattern" },
      { tool: "save_session_note", action: "Save traceability note — cite original request, record root cause and fix" },
    ],
  },
  autonomous_qa_bug: {
    name: "Autonomous QA Bug Verdict",
    description: "Evidence-first bug reproduction with trigger/verify split, bounded retries, blocked-infra classification, and anomaly isolation",
    steps: [
      { tool: "search_all_knowledge", action: "Check prior bug signatures, setup blockers, and learned repro patterns before touching the workflow" },
      { tool: "start_execution_run", action: "Open an execution trace so setup, trigger, verification, and verdict all land in one auditable run" },
      { tool: "plan_decompose_mission", action: "Break the bug into setup, trigger, verify, evidence, and verdict subtasks with bounded contracts" },
      { tool: "record_execution_step", action: "Log environment setup and preconditions before attempting reproduction" },
      { tool: "record_execution_verification", action: "Verify setup state explicitly before trigger; classify missing environment or auth as blocked infra" },
      { tool: "record_execution_step", action: "Execute the smallest trigger needed to reproduce the reported symptom" },
      { tool: "attach_execution_evidence", action: "Attach screenshots, logs, videos, metrics, or diffs that show actual behavior" },
      { tool: "get_gate_preset", action: "Load the agent_bug_verdict gate so the pre-verdict checks stay explicit and boolean" },
      { tool: "run_quality_gate", action: "Run the agent_bug_verdict gate before deciding pass/fail/block" },
      { tool: "judge_verify_subtask", action: "Judge the primary bug against the output contract with evidence-backed verdict and confidence" },
      { tool: "judge_request_retry", action: "Retry only the failing trigger or setup step, up to budget; escalate blocked infra instead of looping blindly" },
      { tool: "log_gap", action: "Log anomalies or newly found bugs separately so they do not overwrite the main bug verdict" },
      { tool: "sniff_record_human_review", action: "Record human sniff-check when the verdict is high-risk, ambiguous, or externally visible" },
      { tool: "complete_execution_run", action: "Close the trace with final status, evidence summary, and any drift from the original bug mission" },
      { tool: "save_session_note", action: "Save traceability note — cite original bug, blocker classification, evidence path, and final verdict" },
      { tool: "record_learning", action: "Record the reproduction pattern, blocker signature, and anomaly handling guidance for future runs" },
    ],
  },
  ui_change: {
    name: "UI/UX Change",
    description: "Frontend implementation with visual verification",
    steps: [
      { tool: "search_all_knowledge", action: "Check past UI gotchas" },
      { tool: "run_closed_loop", action: "Build and test components" },
      { tool: "capture_responsive_suite", action: "Screenshot at 3 breakpoints" },
      { tool: "analyze_screenshot", action: "AI-powered visual analysis" },
      { tool: "run_quality_gate", action: "Run ui_ux_qa gate" },
      { tool: "run_mandatory_flywheel", action: "Final verification" },
      { tool: "record_learning", action: "Record UI patterns" },
      { tool: "save_session_note", action: "Save traceability note — cite original request, record visual evidence path" },
    ],
  },
  parallel_project: {
    name: "Parallel Agent Project",
    description: "Multi-agent coordination for large tasks",
    steps: [
      { tool: "get_parallel_status", action: "Check what agents are doing" },
      { tool: "assign_agent_role", action: "Specialize your role" },
      { tool: "claim_agent_task", action: "Lock your task" },
      { tool: "log_context_budget", action: "Track context usage" },
      { tool: "run_oracle_comparison", action: "Validate against reference" },
      { tool: "release_agent_task", action: "Release with progress note" },
      { tool: "record_learning", action: "Persist findings" },
    ],
  },
  research_phase: {
    name: "Research & Context Gathering",
    description: "Structured reconnaissance before implementation",
    steps: [
      { tool: "search_all_knowledge", action: "Check existing knowledge" },
      { tool: "run_recon", action: "Start structured research session" },
      { tool: "check_framework_updates", action: "Check SDK/framework updates" },
      { tool: "web_search", action: "Search for latest info" },
      { tool: "fetch_url", action: "Read documentation pages" },
      { tool: "search_github", action: "Find prior art" },
      { tool: "log_recon_finding", action: "Log each discovery" },
      { tool: "get_recon_summary", action: "Aggregate and prioritize" },
    ],
  },
  academic_paper: {
    name: "Academic Paper Writing",
    description: "Polish, verify, and prepare paper for submission",
    steps: [
      { tool: "polish_academic_text", action: "Polish for top-venue quality" },
      { tool: "remove_ai_signatures", action: "Remove AI-generated patterns" },
      { tool: "check_paper_logic", action: "Verify logical consistency" },
      { tool: "compress_or_expand_text", action: "Adjust for page limits" },
      { tool: "generate_academic_caption", action: "Create publication-ready captions" },
      { tool: "analyze_experiment_data", action: "Generate data analysis" },
      { tool: "review_paper_as_reviewer", action: "Simulate harsh peer review" },
    ],
  },
  c_compiler_benchmark: {
    name: "C-Compiler Benchmark (Anthropic Pattern)",
    description: "Build a complex project autonomously, measuring how far the agent gets",
    steps: [
      { tool: "bootstrap_project", action: "Register the project" },
      { tool: "search_all_knowledge", action: "Check for relevant patterns" },
      { tool: "start_verification_cycle", action: "Begin verification" },
      { tool: "claim_agent_task", action: "Claim implementation task" },
      { tool: "run_closed_loop", action: "Compile→lint→test cycle" },
      { tool: "run_oracle_comparison", action: "Compare against reference" },
      { tool: "log_context_budget", action: "Track context usage" },
      { tool: "run_mandatory_flywheel", action: "Final 6-step verification" },
      { tool: "record_learning", action: "Record all findings" },
      { tool: "promote_to_eval", action: "Feed into eval suite" },
    ],
  },
  security_audit: {
    name: "Security Audit",
    description: "Security audit of dependencies, code, and terminal history",
    steps: [
      { tool: "search_all_knowledge", action: "Check past security findings" },
      { tool: "scan_dependencies", action: "Check npm/pip packages for known CVEs" },
      { tool: "run_code_analysis", action: "Static analysis for secrets, injection, patterns" },
      { tool: "scan_terminal_security", action: "Check terminal history for leaked credentials" },
      { tool: "log_gap", action: "Record each vulnerability as a gap" },
      { tool: "assess_risk", action: "Evaluate severity and remediation priority" },
      { tool: "resolve_gap", action: "Fix critical/high vulnerabilities" },
      { tool: "run_quality_gate", action: "Validate against deploy_readiness gate" },
      { tool: "record_learning", action: "Persist security patterns and gotchas" },
    ],
  },
  code_review: {
    name: "Code Review",
    description: "Code review with quality gates and learning capture",
    steps: [
      { tool: "search_all_knowledge", action: "Check for relevant past patterns and gotchas" },
      { tool: "run_closed_loop", action: "Verify code compiles and tests pass" },
      { tool: "run_code_analysis", action: "Static analysis for code quality" },
      { tool: "run_quality_gate", action: "Run code_review gate preset" },
      { tool: "log_gap", action: "Document issues found" },
      { tool: "resolve_gap", action: "Fix issues or provide feedback" },
      { tool: "run_mandatory_flywheel", action: "Final 6-step verification" },
      { tool: "record_learning", action: "Capture review patterns" },
    ],
  },
  deployment: {
    name: "Deployment",
    description: "Ship changes with full quality verification",
    steps: [
      { tool: "search_all_knowledge", action: "Check for deployment gotchas" },
      { tool: "run_closed_loop", action: "Final compile→lint→test green loop" },
      { tool: "run_quality_gate", action: "Run deploy_readiness gate" },
      { tool: "scan_dependencies", action: "Quick security check" },
      { tool: "assess_risk", action: "Evaluate deployment risk" },
      { tool: "run_mandatory_flywheel", action: "All 6 steps must pass" },
      { tool: "record_learning", action: "Record deployment patterns" },
      { tool: "promote_to_eval", action: "Feed into eval suite for regression tracking" },
    ],
  },
  migration: {
    name: "Migration / Upgrade",
    description: "Safely migrate SDKs, frameworks, or major dependencies",
    steps: [
      { tool: "search_all_knowledge", action: "Check past migration learnings" },
      { tool: "run_recon", action: "Research the upgrade (breaking changes, new features)" },
      { tool: "check_framework_updates", action: "Get structured update checklist" },
      { tool: "fetch_url", action: "Read migration guides and changelogs" },
      { tool: "start_verification_cycle", action: "Begin 6-phase verification" },
      { tool: "log_gap", action: "Document all breaking changes and incompatibilities" },
      { tool: "resolve_gap", action: "Fix each breaking change" },
      { tool: "run_closed_loop", action: "Verify everything compiles and tests pass" },
      { tool: "run_mandatory_flywheel", action: "Final verification" },
      { tool: "record_learning", action: "Persist migration patterns for next time" },
    ],
  },
  coordinator_spawn: {
    name: "Coordinator → Subagent Spawn",
    description: "Coordinate parallel subagents with task locks and gates",
    steps: [
      { tool: "search_all_knowledge", action: "Check prior coordination patterns" },
      { tool: "get_parallel_status", action: "Check current agent activity" },
      { tool: "assign_agent_role", action: "Assign specialized role to each subagent" },
      { tool: "claim_agent_task", action: "Lock task before subagent starts work" },
      { tool: "log_context_budget", action: "Track context usage per subagent" },
      { tool: "run_oracle_comparison", action: "Validate subagent output against reference" },
      { tool: "release_agent_task", action: "Release task with progress note" },
      { tool: "run_quality_gate", action: "Gate the aggregate result" },
      { tool: "run_mandatory_flywheel", action: "Final 6-step verification on combined output" },
      { tool: "record_learning", action: "Bank coordination patterns for future spawns" },
    ],
  },
  self_setup: {
    name: "Self-Setup / Capability Escalation",
    description: "Detect and resolve missing capabilities before work",
    steps: [
      { tool: "discover_tools", action: "Search for needed capability" },
      { tool: "get_tool_quick_ref", action: "Check if tool exists but needs configuration" },
      { tool: "scaffold_nodebench_project", action: "Bootstrap repo infra if missing" },
      { tool: "get_boilerplate_status", action: "Audit what files/config are missing" },
      { tool: "bootstrap_project", action: "Register project with NodeBench" },
      { tool: "run_recon", action: "Research how to configure missing providers" },
      { tool: "run_closed_loop", action: "Smoke-test the capability is working" },
      { tool: "record_learning", action: "Record setup patterns for next time" },
    ],
  },
  flicker_detection: {
    name: "Android Flicker Detection",
    description: "Detect Android UI flicker via 4-layer pipeline",
    steps: [
      { tool: "search_all_knowledge", action: "Check past flicker patterns and known issues" },
      { tool: "capture_surface_stats", action: "L0: Capture SurfaceFlinger jank metrics" },
      { tool: "extract_video_frames", action: "L1+L2: Record screen and extract key frames" },
      { tool: "compute_ssim_analysis", action: "L2: Compute block-based SSIM on frame pairs" },
      { tool: "run_flicker_detection", action: "Full pipeline: all 4 layers end-to-end" },
      { tool: "generate_flicker_report", action: "Generate SSIM timeline chart and comparison images" },
      { tool: "record_learning", action: "Record flicker patterns for future detection" },
    ],
  },
  figma_flow_analysis: {
    name: "Figma Flow Analysis",
    description: "Extract, cluster, and visualize Figma flows",
    steps: [
      { tool: "search_all_knowledge", action: "Check past design flow analysis patterns" },
      { tool: "extract_figma_frames", action: "Phase 1: Depth-3 tree traversal for frames" },
      { tool: "cluster_figma_flows", action: "Phase 2: Multi-signal priority cascade clustering" },
      { tool: "render_flow_visualization", action: "Phase 3: Colored bounding box overlay" },
      { tool: "analyze_figma_flows", action: "Full pipeline: extract → cluster → visualize" },
      { tool: "record_learning", action: "Record design flow patterns" },
    ],
  },
  agent_eval: {
    name: "Agent Evaluation Pipeline",
    description: "Measure and improve agent performance via closed-loop eval",
    steps: [
      { tool: "check_contract_compliance", action: "Score the agent session against the 6-dimension contract (front-door, self-setup, pre-impl, parallel, ship-gates, efficiency)" },
      { tool: "get_trajectory_analysis", action: "Analyze tool usage patterns — frequency, errors, sequential bigrams, phase distribution" },
      { tool: "get_self_eval_report", action: "Cross-reference all data: verification cycles, eval runs, quality gates, gaps, learnings" },
      { tool: "get_improvement_recommendations", action: "Surface actionable fixes based on accumulated data — unused tools, missing gates, knowledge gaps" },
      { tool: "start_eval_run", action: "Create eval test cases for agent behavior scenarios (contract compliance, tool selection, self-setup recovery)" },
      { tool: "record_eval_result", action: "Record actual agent behavior against expected contract adherence for each eval case" },
      { tool: "complete_eval_run", action: "Aggregate scores — pass rate, failure patterns, improvement suggestions" },
      { tool: "compare_eval_runs", action: "Compare before/after to verify agent performance improved (never ship without eval improvement)" },
      { tool: "record_learning", action: "Bank agent evaluation patterns and violation signatures for future detection" },
    ],
  },
  contract_compliance: {
    name: "Contract Compliance Audit",
    description: "Verify agent session followed the NodeBench contract",
    steps: [
      { tool: "log_tool_call", action: "Ensure all tool calls in the session are logged (auto-instrumented or manual)" },
      { tool: "check_contract_compliance", action: "Score the session across 6 dimensions (25 front-door + 10 self-setup + 15 pre-impl + 10 parallel + 30 ship-gates + 10 efficiency = 100)" },
      { tool: "get_gate_history", action: "Check contract_compliance gate trend over time" },
      { tool: "record_learning", action: "Record violation patterns to prevent repeat offenses" },
      { tool: "run_quality_gate", action: "Run contract_compliance as a formal quality gate with boolean rules per dimension" },
    ],
  },
  ablation_eval: {
    name: "Ablation Evaluation (Prove NodeBench MCP Value)",
    description: "A/B test agent performance across 5 conditions with eval stats",
    steps: [
      { tool: "create_task_bank", action: "Step 1: Define tasks with deterministic success criteria, forbidden behaviors, and budgets. Target 30-200 tasks." },
      { tool: "get_gate_preset", action: "Step 2: Load agent_comparison gate preset — 10 boolean rules covering outcome + process quality" },
      { tool: "grade_agent_run", action: "Step 3: Run task with condition=bare and grade both outcome (50pts) and process (50pts)" },
      { tool: "grade_agent_run", action: "Step 4: Run same task with condition=lite and grade" },
      { tool: "grade_agent_run", action: "Step 5: Run same task with condition=full and grade" },
      { tool: "grade_agent_run", action: "Step 6: (Optional) Run with condition=cold_kb (no prior knowledge) to test knowledge value" },
      { tool: "grade_agent_run", action: "Step 7: (Optional) Run with condition=no_gates (gates disabled) to test gate contribution" },
      { tool: "run_quality_gate", action: "Step 8: Run agent_comparison gate to validate process quality for each condition" },
      { tool: "compare_eval_runs", action: "Step 9: Compare across conditions — NodeBench must win on outcome AND process to ship" },
      { tool: "record_learning", action: "Step 10: Bank findings — which tools, gates, and knowledge types contributed most" },
    ],
  },
  session_recovery: {
    name: "Session Recovery (Post-Compaction)",
    description: "Recover state after compaction, /clear, or session resume",
    steps: [
      { tool: "load_session_notes", action: "Step 1: Load today's session notes from filesystem" },
      { tool: "refresh_task_context", action: "Step 2: Re-inject active verification cycle, open gaps, and recent learnings" },
      { tool: "search_all_knowledge", action: "Step 3: Search for relevant prior findings" },
      { tool: "get_verification_status", action: "Step 4: Check progress on active verification cycle" },
      { tool: "get_parallel_status", action: "Step 5: Check if other agents are working (parallel scenarios)" },
      { tool: "save_session_note", action: "Step 6: Save a 'session resumed' note with current state" },
    ],
  },
  attention_refresh: {
    name: "Attention Refresh (Mid-Session)",
    description: "Re-inject goals and re-anchor focus after 30+ tool calls",
    steps: [
      { tool: "refresh_task_context", action: "Step 1: Re-inject current goals, open gaps, and session stats" },
      { tool: "save_session_note", action: "Step 2: Save progress checkpoint before continuing" },
      { tool: "get_verification_status", action: "Step 3: Check which phases remain" },
      { tool: "search_all_knowledge", action: "Step 4: Re-check learnings for current phase" },
    ],
  },
  task_bank_setup: {
    name: "Task Bank Setup (50-Task Starter Kit)",
    description: "Build a task bank for agent eval across 7 categories",
    steps: [
      { tool: "search_all_knowledge", action: "Step 1: Search past learnings and recon findings for real bugs/tasks to include" },
      { tool: "create_task_bank", action: "Step 2: Add 10 bugfix tasks (easy→expert) with test-based success criteria" },
      { tool: "create_task_bank", action: "Step 3: Add 8 refactor tasks with lint/type/test criteria" },
      { tool: "create_task_bank", action: "Step 4: Add 8 integration tasks with API/DB/auth criteria" },
      { tool: "create_task_bank", action: "Step 5: Add 8 UI tasks with responsive/accessible/visual criteria" },
      { tool: "create_task_bank", action: "Step 6: Add 6 security tasks with vulnerability/secret/injection criteria" },
      { tool: "create_task_bank", action: "Step 7: Add 5 performance tasks with latency/memory/bundle criteria" },
      { tool: "create_task_bank", action: "Step 8: Add 5 migration tasks with backward-compat/rollback criteria" },
      { tool: "record_learning", action: "Step 9: Record task bank design patterns for future expansion" },
    ],
  },
  pr_review: {
    name: "Pull Request Review",
    description: "PR review with git compliance and merge gate",
    steps: [
      { tool: "check_git_compliance", action: "Verify branch state and commit conventions" },
      { tool: "review_pr_checklist", action: "Run structured PR checklist with verification cross-reference" },
      { tool: "run_quality_gate", action: "Validate against quality rules" },
      { tool: "enforce_merge_gate", action: "Pre-merge validation combining all checks" },
      { tool: "record_learning", action: "Record PR patterns and review feedback" },
    ],
  },
  seo_audit: {
    name: "Full SEO Audit",
    description: "SEO audit: technical, content, performance, WordPress",
    steps: [
      { tool: "seo_audit_url", action: "Analyze meta tags, headings, images, structured data" },
      { tool: "analyze_seo_content", action: "Check readability, keyword density, link ratios" },
      { tool: "check_page_performance", action: "Measure response time, compression, caching" },
      { tool: "check_wordpress_site", action: "Detect WordPress, assess security posture" },
      { tool: "scan_wordpress_updates", action: "Check plugins/themes for known vulnerabilities" },
      { tool: "record_learning", action: "Record SEO patterns and findings" },
    ],
  },
  voice_pipeline: {
    name: "Voice Pipeline Implementation",
    description: "Design, validate, scaffold, and benchmark a voice interface",
    steps: [
      { tool: "design_voice_pipeline", action: "Get architecture recommendation based on requirements" },
      { tool: "analyze_voice_config", action: "Validate component compatibility and estimate costs" },
      { tool: "benchmark_voice_latency", action: "Compare pipeline configurations side-by-side" },
      { tool: "generate_voice_scaffold", action: "Generate starter code for chosen stack" },
      { tool: "run_closed_loop", action: "Build and test the scaffold" },
      { tool: "record_learning", action: "Record voice pipeline implementation patterns" },
    ],
  },
  intentionality_check: {
    name: "Intentionality Check (Critter)",
    description: "Articulate why and who before acting, then proceed",
    steps: [
      { tool: "critter_check", action: "Answer: Why are you doing this? Who is it for? Score your intentionality" },
      { tool: "save_session_note", action: "Persist the critter check so it survives context compaction" },
      { tool: "run_recon", action: "Gather context now that purpose is clear" },
    ],
  },
  research_digest: {
    name: "Automated Research Digest",
    description: "Subscribe to RSS/Atom feeds, build digest, email it",
    steps: [
      { tool: "add_rss_source", action: "Register RSS/Atom feed URLs for topics of interest (arXiv, blogs, news)" },
      { tool: "fetch_rss_feeds", action: "Pull latest articles from all registered sources — new items stored in SQLite" },
      { tool: "build_research_digest", action: "Generate a categorized digest of new (unseen) articles in markdown, json, or html" },
      { tool: "send_email", action: "Email the html digest to yourself or your team for daily/weekly review" },
      { tool: "save_session_note", action: "Persist key findings so they survive context compaction" },
      { tool: "record_learning", action: "Record insights from noteworthy articles for the knowledge base" },
    ],
  },
  email_assistant: {
    name: "Email Draft Assistant",
    description: "Read inbox, draft replies, review, and send via agent",
    steps: [
      { tool: "read_emails", action: "Fetch recent/unread emails from IMAP inbox to understand what needs attention" },
      { tool: "draft_email_reply", action: "Generate a professional reply draft from original email context and your instructions" },
      { tool: "send_email", action: "Send the reviewed and approved draft reply" },
      { tool: "save_session_note", action: "Log sent emails so you have an audit trail that survives compaction" },
    ],
  },
  webmcp_discovery: {
    name: "WebMCP Origin Discovery",
    description: "Connect to WebMCP origin, discover and invoke tools",
    steps: [
      { tool: "connect_webmcp_origin", action: "Connect to the target origin URL and establish a WebMCP session" },
      { tool: "list_webmcp_tools", action: "List all tools exposed by the origin with schemas and annotations" },
      { tool: "call_webmcp_tool", action: "Invoke a specific tool on the remote origin with arguments" },
      { tool: "disconnect_webmcp_origin", action: "Clean up the WebMCP session when done" },
    ],
  },
  batch_autopilot: {
    name: "Batch Autopilot Run",
    description: "Set up operator profile and run batch autopilot session",
    steps: [
      { tool: "setup_operator_profile", action: "Create or update USER.md and operator profile for autopilot context" },
      { tool: "get_autopilot_status", action: "Check current autopilot readiness, profile completeness, and last run status" },
      { tool: "trigger_batch_run", action: "Start a batch autopilot run using the operator profile as context" },
      { tool: "get_batch_run_history", action: "Review history of past batch runs, outcomes, and timing" },
      { tool: "sync_operator_profile", action: "Sync operator profile state from disk after manual edits" },
    ],
  },
  daily_review: {
    name: "Daily Brief Review",
    description: "Pull daily brief, review narratives, check ops dashboard",
    steps: [
      { tool: "sync_daily_brief", action: "Pull today's brief and narrative from Convex into local SQLite" },
      { tool: "get_daily_brief_summary", action: "Get the full brief summary with key signals and insights" },
      { tool: "get_narrative_status", action: "Check narrative thread status — dominant story, under-reported angle, evidence scores" },
      { tool: "get_ops_dashboard", action: "Review pipeline health: posting status, tool usage, active workflows" },
      { tool: "open_local_dashboard", action: "Open the local HTML dashboard in the browser for visual review" },
    ],
  },
  deep_interaction: {
    name: "Deep Interaction Discovery & Capture",
    description: "Discover, capture, and verify interactive UI behaviors",
    steps: [
      { tool: "dive_auto_discover", action: "Auto-discover interactive components (buttons, drawers, modals, expandable rows) across all routes" },
      { tool: "start_ui_dive", action: "Start a structured UI dive session to track interaction coverage" },
      { tool: "burst_capture", action: "Rapid-fire capture during interaction transitions (open drawer, hover tooltip, type in agent panel)" },
      { tool: "dive_interaction_test", action: "Test specific interaction patterns: click→open→verify, type→submit→stream, hover→preview→dismiss" },
      { tool: "compute_web_stability", action: "Measure SSIM stability across interaction frames — detect layout shifts, flicker, animation jank" },
      { tool: "dive_record_test_step", action: "Record each interaction test step with expected vs actual behavior" },
      { tool: "run_visual_qa_suite", action: "Run full visual QA suite including deep interaction captures" },
      { tool: "tag_ui_bug", action: "Tag issues found during interaction testing (broken hover, drawer z-index, missing focus trap)" },
      { tool: "get_dive_report", action: "Generate interaction coverage report — which components were tested, which remain" },
      { tool: "record_learning", action: "Record interaction patterns, common failure modes, and selector strategies" },
    ],
  },
  gemini_qa: {
    name: "Gemini Vision QA Loop",
    description: "Gemini vision QA loop: capture, score, fix, repeat",
    steps: [
      { tool: "check_mcp_setup", action: "Verify Gemini API key (GOOGLE_AI_KEY) and vision domain are ready" },
      { tool: "start_verification_cycle", action: "Open a verification cycle titled 'Gemini QA Loop' to track progress" },
      { tool: "save_session_note", action: "Shell: `npx vite build` then `npx playwright test tests/e2e/full-ui-dogfood.spec.ts --project=chromium --workers=1` — capture 4-variant screenshots" },
      { tool: "save_session_note", action: "Shell: `npm run dogfood:publish` — copy screenshots to public/dogfood/ with variant metadata manifest" },
      { tool: "save_session_note", action: "Shell: `npx vite build && node scripts/ui/runDogfoodGeminiQa.mjs` — rebuild, launch preview, trigger Gemini QA" },
      { tool: "log_test_result", action: "Log QA score from public/dogfood/qa-results.json — formula: 100 - P1×6 - P2×2 - P3×1" },
      { tool: "save_session_note", action: "Fix P1 issues (6pts each) then P2 (2pts) then P3 (1pt) — root-cause each before fixing" },
      { tool: "get_overstory_qa_gate", action: "Check QA gate for per-route stability grades and issue counts" },
      { tool: "record_learning", action: "Record QA trajectory and Gemini finding patterns for regression tracking" },
    ],
  },
  six_hour_qa: {
    name: "6-Hour Comprehensive QA Workflow",
    description: "9-phase automated pipeline covering all 39 routes, 18 interaction scenarios (before/during/after captures), 12 animation-critical routes (SSIM burst analysis), 6 screenshot variants (dark/light × desktop/mobile × normal/reduced-motion), 15 Jony Ive aesthetic criteria, Gemini Vision dogfood, 10 agent eval scenarios via LLM judge, learning loop, and final verdict synthesis. Parallelized in batches of 6 concurrent routes.",
    steps: [
      { tool: "start_verification_cycle", action: "Phase 1 SETUP: Create root QA session, run vite build + tsc --noEmit + vitest, capture baseline test counts and screenshot manifest" },
      { tool: "run_closed_loop", action: "Phase 1 SETUP: Verify build compiles, zero type errors, all tests pass — establish baseline metrics" },
      { tool: "get_gate_preset", action: "Phase 2 APP_QA: Load a11y gate (12 WCAG 2.1 AA rules) — ARIA, contrast, keyboard, focus, skip-link, tab-order, touch-targets" },
      { tool: "run_quality_gate", action: "Phase 2 APP_QA: Run a11y + visual_regression + code_review + ui_ux_qa + performance gates on all 39 routes (batched ×6 parallel)" },
      { tool: "capture_ui_screenshot", action: "Phase 3 INTERACTIONS: Capture BEFORE state for 18 interaction scenarios (command palette, sidebar hover, tab switch, entity search, etc.)" },
      { tool: "run_visual_qa_suite", action: "Phase 3 INTERACTIONS: Trigger each interaction, capture DURING state (tooltip visible, modal open, thread expanding), wait settle delay" },
      { tool: "diff_screenshots", action: "Phase 3 INTERACTIONS: Capture AFTER state (settled, restored), diff BEFORE→AFTER to verify clean state restoration" },
      { tool: "run_visual_qa_suite", action: "Phase 4 ANIMATION: Burst capture 12 animation-critical routes (10-15 frames each, 40-100ms interval), compute SSIM stability scores" },
      { tool: "compute_web_stability", action: "Phase 4 ANIMATION: Verify no jank frames (SSIM>threshold), effective FPS>30, frame delta variance<2× median per route" },
      { tool: "run_visual_qa_suite", action: "Phase 4 ANIMATION: Re-test all 12 routes with prefers-reduced-motion:reduce — SSIM must be >0.98 (near-static)" },
      { tool: "analyze_screenshot", action: "Phase 5 AESTHETIC: Gemini Vision Pro review of 39 routes × 4 variants — 15 Jony Ive criteria (earned complexity, visual hierarchy, spacing, typography, color harmony, alignment, whitespace, icons, loading elegance, empty states, mobile adaptation, dark mode refinement, animation purpose, focus states, error states)" },
      { tool: "save_session_note", action: "Phase 6 DOGFOOD: Trigger Gemini Vision dogfood QA (screenshotQa + videoQa) on 6 screenshot variants, compute score (100 - P0×10 - P1×6 - P2×2 - P3×1)" },
      { tool: "start_eval_run", action: "Phase 7 AGENT_EVAL: Create eval suite with 10 agent scenarios (research thesis, DD verify, QA bug, contract compliance, workflow chain, discovery, evidence gathering, cross-check, multi-agent coordination, error recovery)" },
      { tool: "save_session_note", action: "Phase 7 AGENT_EVAL: Execute each scenario, grade with LLM judge (8 boolean criteria), record evalResults with per-scenario reasoning" },
      { tool: "complete_eval_run", action: "Phase 7 AGENT_EVAL: Finalize eval run — pass rate, critical criteria check (noHallucination + noForbiddenActions), failure patterns" },
      { tool: "compare_eval_runs", action: "Phase 7 AGENT_EVAL: Compare against baseline — DEPLOY/REVERT/INVESTIGATE recommendation" },
      { tool: "get_improvement_recommendations", action: "Phase 8 LEARNING: Extract failure patterns from all 9 phases — gate failures, interaction mismatches, jank, aesthetic violations, agent failures" },
      { tool: "record_learning", action: "Phase 8 LEARNING: 5-whys root cause → targeted fix → re-eval → compare. Bank edge cases for regression prevention" },
      { tool: "save_session_note", action: "Phase 9 SYNTHESIS: Cross-check all evidence, compute final verdict (verified/provisionally_verified/needs_review/failed), generate proof pack with coverage: 39 routes × 6 variants × 18 interactions × 12 animation routes" },
    ],
  },
  comprehensive_qa: {
    name: "Comprehensive QA Suite",
    description: "Full QA pipeline: accessibility audit, visual regression, code review, deploy readiness, and verdict derivation",
    steps: [
      { tool: "start_verification_cycle", action: "Open a QA verification cycle to track all checks in one auditable run" },
      { tool: "get_gate_preset", action: "Load the a11y gate preset — 8 WCAG 2.1 AA rules for accessibility compliance" },
      { tool: "run_quality_gate", action: "Run the a11y gate against changed components — check ARIA, contrast, keyboard, focus, motion, forms, landmarks" },
      { tool: "get_gate_preset", action: "Load the visual_regression gate — 6 rules for baseline comparison, layout shift, responsive, dark/light" },
      { tool: "run_quality_gate", action: "Run the visual_regression gate — compare screenshots against baselines at 3 viewports" },
      { tool: "get_gate_preset", action: "Load the code_review gate — compile, lint, tests, secrets, error handling, patterns, regression test" },
      { tool: "run_quality_gate", action: "Run the code_review gate against all changed files" },
      { tool: "run_closed_loop", action: "Execute compile→lint→test→debug closed loop until full green" },
      { tool: "get_gate_preset", action: "Load deploy_readiness gate — all tests, no critical gaps, eval scores, learnings, no TODOs" },
      { tool: "run_quality_gate", action: "Run deploy_readiness gate to confirm the change is ready to ship" },
      { tool: "log_test_result", action: "Record the full QA suite result with layer=integration and all gate scores" },
      { tool: "record_learning", action: "Bank QA findings, edge cases, and accessibility patterns for future runs" },
      { tool: "save_session_note", action: "Save traceability note linking this QA run to the original request, with citedFrom reference" },
    ],
  },
  content_pipeline: {
    name: "Daily Content Pipeline",
    description: "Gather signals, build digest, generate 3-post thread, publish",
    steps: [
      { tool: "fetch_rss_feeds", action: "Pull latest articles from all registered RSS/Atom sources — new items stored in SQLite" },
      { tool: "web_search", action: "Search for breaking developments in target topics (AI, infrastructure, security) to supplement RSS" },
      { tool: "build_research_digest", action: "Generate a categorized digest of new articles — groups by topic, highlights key signals" },
      { tool: "call_llm", action: "Generate Post 1 (The Signal): narrative framing, numbered signals with hard numbers + URLs, competing explanations" },
      { tool: "call_llm", action: "Generate Post 2 (The Analysis): fact-checks with badges (VERIFIED/PARTIAL/UNVERIFIED), evidence breakdown per explanation" },
      { tool: "call_llm", action: "Generate Post 3 (The Agency): actionable steps, stress-test each explanation with score badge, engagement hook" },
      { tool: "run_quality_gate", action: "Quality-gate all 3 posts: check source attribution, evidence scores, character limits, no hallucinated claims" },
      { tool: "save_session_note", action: "Persist the final 3-post thread and digest to session notes — survives context compaction" },
      { tool: "record_learning", action: "Record which signals resonated, content patterns, and quality gate pass/fail reasons for future runs" },
    ],
  },
  content_publish: {
    name: "Content Publish & Distribute",
    description: "Distribute content across email, LinkedIn, and archive",
    steps: [
      { tool: "search_all_knowledge", action: "Load the latest content pipeline output from session notes or knowledge base" },
      { tool: "call_llm", action: "Format content for target platform (LinkedIn character limits, email HTML, markdown archive)" },
      { tool: "run_quality_gate", action: "Final quality gate before publish — verify formatting, links, attribution, no sensitive data" },
      { tool: "send_email", action: "Email the formatted content digest to distribution list" },
      { tool: "save_session_note", action: "Archive the published content with timestamp and distribution metadata" },
      { tool: "record_learning", action: "Record distribution outcomes and engagement signals for optimization" },
    ],
  },
  agent_traversal: {
    name: "Agent Frontend Traversal",
    description: "Navigate frontend views, invoke per-view tools, traverse feeds",
    steps: [
      { tool: "list_available_views", action: "Discover all 27 views with capabilities and available tools" },
      { tool: "get_traversal_plan", action: "Generate a goal-based traversal plan ranking views by relevance" },
      { tool: "navigate_to_view", action: "Navigate to the first target view (creates session)" },
      { tool: "get_view_capabilities", action: "Inspect the view's actions, data endpoints, and per-view tools" },
      { tool: "invoke_view_tool", action: "Call a per-view tool (e.g., nb_search_research, nb_list_deals)" },
      { tool: "query_view_data", action: "Query data from view endpoints" },
      { tool: "traverse_feed", action: "Browse content feeds with hot/new/top/rising sort" },
      { tool: "get_view_state", action: "Audit session — navigation history, interactions, duration" },
    ],
  },
  research_optimizer: {
    name: "Research Optimization Pipeline",
    description: "Deep research, extract, score, and rank multi-attribute options",
    steps: [
      { tool: "web_search", action: "Search for options and pricing across multiple queries (hotels, flights, products)" },
      { tool: "fetch_url", action: "Fetch detailed pages for top search results — extract pricing, reviews, specs" },
      { tool: "extract_structured_data", action: "Convert fetched content into structured records with consistent fields" },
      { tool: "save_session_note", action: "Persist extracted data so it survives context compaction" },
      { tool: "multi_criteria_score", action: "Score all options against weighted criteria (cost, distance, value, risk)" },
      { tool: "compare_options", action: "Generate formatted comparison table with rankings and decision explanation" },
      { tool: "run_quality_gate", action: "Validate recommendation meets minimum thresholds before presenting" },
    ],
  },
  parallel_research: {
    name: "Parallel Multi-Agent Research",
    description: "Spawn parallel sub-agents for research, merge and score results",
    steps: [
      { tool: "bootstrap_parallel_agents", action: "Scaffold parallel agent infrastructure — define roles for each research domain" },
      { tool: "claim_task", action: "Each sub-agent claims a research domain (pricing, reviews, logistics, availability)" },
      { tool: "web_search", action: "Sub-agents search their domain in parallel — each focuses on specific queries" },
      { tool: "fetch_url", action: "Sub-agents fetch and extract data from their search results" },
      { tool: "extract_structured_data", action: "Each sub-agent extracts structured records with domain-specific fields" },
      { tool: "save_session_note", action: "Sub-agents persist findings to shared knowledge base" },
      { tool: "merge_research_results", action: "Coordinator merges all sub-agent results by join key into unified dataset" },
      { tool: "multi_criteria_score", action: "Coordinator scores merged options against weighted optimization criteria" },
      { tool: "compare_options", action: "Generate final ranked comparison with decision explanation" },
      { tool: "run_quality_gate", action: "Final validation — check data completeness, scoring sanity, recommendation quality" },
    ],
  },
  competitive_intel: {
    name: "Competitive Intelligence Pipeline",
    description: "Stealth-fetch competitor pages, extract and rank data",
    steps: [
      { tool: "web_search", action: "Identify competitor URLs and market landscape" },
      { tool: "scrapling_batch_fetch", action: "Stealth-fetch 5-10 competitor pages in parallel with anti-bot bypass" },
      { tool: "scrapling_extract", action: "Extract pricing, features, positioning data with CSS/XPath selectors" },
      { tool: "merge_research_results", action: "Join competitor data by company name into unified comparison dataset" },
      { tool: "call_llm", action: "Analyze competitive positioning, strengths/weaknesses, market gaps" },
      { tool: "multi_criteria_score", action: "Score competitors against weighted criteria (price, features, market share)" },
      { tool: "compare_options", action: "Generate ranked comparison table with strategic recommendations" },
    ],
  },
  price_monitor: {
    name: "Price Monitoring Pipeline",
    description: "Crawl product pages, track prices, alert on changes",
    steps: [
      { tool: "scrapling_crawl", action: "Start multi-page crawl of product catalog or competitor pricing pages" },
      { tool: "scrapling_crawl_status", action: "Poll crawl progress and collect extracted items" },
      { tool: "scrapling_extract", action: "Extract price, availability, and product details with CSS selectors" },
      { tool: "scrapling_track_element", action: "Set up adaptive element tracking for key price elements" },
      { tool: "merge_research_results", action: "Merge multi-source pricing data by product identifier" },
      { tool: "multi_criteria_score", action: "Score products against price/value/availability criteria" },
      { tool: "save_session_note", action: "Persist price snapshot for historical comparison" },
      { tool: "send_email", action: "Alert on significant price changes or threshold breaches" },
    ],
  },
  thompson_protocol: {
    name: "Thompson Protocol Content Pipeline",
    description: "Transform complex topics into plain-English content via 4 agents",
    steps: [
      { tool: "thompson_pipeline", action: "Initialize the full pipeline — generates execution plan with all agent prompts and handoff points" },
      { tool: "thompson_write", action: "Transform the complex topic into plain-English sections with jargon translations, analogies, and difficulty acknowledgments" },
      { tool: "call_llm", action: "Execute the Thompson Writer system prompt against the topic — LLM does the creative writing, tool provides constraints" },
      { tool: "thompson_feynman_edit", action: "Run Skeptical Beginner review — 8 rejection criteria, deterministic readability checks, max 3 rewrite cycles" },
      { tool: "thompson_write", action: "(Loop) Rewrite any REWRITE-flagged sections with specific fix instructions from Feynman Editor" },
      { tool: "thompson_visual_map", action: "Generate visual prompts for each analogy — literal 1:1 mapping, consistent style, accessibility alt-text" },
      { tool: "thompson_anti_elitism_lint", action: "Scan for banned phrases (22 patterns), passive voice, readability, jargon density — fully deterministic" },
      { tool: "thompson_quality_gate", action: "10-point boolean checklist → grade (exemplary/passing/needs_work/failing). Gate before distribution." },
      { tool: "save_session_note", action: "Persist the Thompson-processed content for distribution via content_publish workflow" },
      { tool: "record_learning", action: "Record which analogies, styles, and audience levels produced the best engagement" },
    ],
  },
  system_observability: {
    name: "system_observability",
    description: "System health check, drift detection, and auto-maintenance",
    steps: [
      { tool: "get_system_pulse", action: "Capture real-time health snapshot — DB, dashboards, errors, embedding cache, health score" },
      { tool: "get_drift_report", action: "Detect configuration and state drift — orphaned cycles, stale runs, DB bloat, error spikes" },
      { tool: "run_self_heal", action: "Auto-fix healable drift issues — abandoned cycles, stale runs, log pruning (use dry_run first)" },
      { tool: "get_uptime_stats", action: "Review call rates, error trends, and top tools across time windows" },
      { tool: "get_watchdog_log", action: "Check background watchdog history — health score trend, auto-healed actions" },
      { tool: "save_session_note", action: "Record health findings and any manual interventions for future reference" },
    ],
  },
  mission_execution: {
    name: "Mission Execution Harness",
    description: "Hierarchical Planner → Worker → Judge → Human Sniff-Check → Merge pipeline for verifiable work",
    steps: [
      { tool: "plan_decompose_mission", action: "Decompose mission into subtasks with verifiability tiers, judge methods, retry budgets, and output contracts" },
      { tool: "harness_get_mission_status", action: "Check execution board — which subtasks are pending, assigned, or blocked" },
      { tool: "judge_verify_subtask", action: "Judge reviews subtask output against output contract — verdict + evidence + artifacts" },
      { tool: "judge_request_retry", action: "If failed: retry (with new instructions), replan, escalate, or stop if unverifiable" },
      { tool: "sniff_record_human_review", action: "Human sniff-check: pass / concern / block with issue tags (weak_evidence, unsupported_claim, etc.)" },
      { tool: "merge_compose_output", action: "Judge-gated merge of passed subtask artifacts into composed output" },
      { tool: "harness_get_mission_status", action: "Final traceability audit — receipts, evidence refs, decisions, verifications, diffs, approvals" },
    ],
  },
};
