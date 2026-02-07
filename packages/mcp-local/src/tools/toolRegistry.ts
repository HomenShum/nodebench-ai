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
    tags: ["llm", "call", "generate", "prompt", "gemini", "openai", "anthropic", "gpt", "claude"],
    quickRef: {
      nextAction: "LLM response received. Validate output quality. Use for analysis, generation, or judgment tasks.",
      nextTools: ["extract_structured_data", "record_learning"],
    },
    phase: "utility",
  },
  {
    name: "extract_structured_data",
    category: "llm",
    tags: ["extract", "structured", "data", "json", "parse", "schema", "llm"],
    quickRef: {
      nextAction: "Structured data extracted. Validate against expected schema. Use for downstream processing.",
      nextTools: ["record_eval_result", "record_learning"],
    },
    phase: "utility",
  },
  {
    name: "benchmark_models",
    category: "llm",
    tags: ["benchmark", "models", "compare", "latency", "quality", "cost", "llm"],
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

/** Get all tools in a category */
export function getToolsByCategory(category: string): ToolRegistryEntry[] {
  return REGISTRY_ENTRIES.filter((e) => e.category === category);
}

/** Get all tools in a workflow phase */
export function getToolsByPhase(phase: ToolRegistryEntry["phase"]): ToolRegistryEntry[] {
  return REGISTRY_ENTRIES.filter((e) => e.phase === phase);
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

export type SearchMode = "hybrid" | "fuzzy" | "regex" | "prefix" | "semantic" | "exact";

// ── Synonym / semantic expansion map ──────────────────────────────────────
const SYNONYM_MAP: Record<string, string[]> = {
  verify: ["validate", "check", "confirm", "test", "assert", "ensure"],
  test: ["verify", "validate", "check", "assert", "spec", "expect"],
  search: ["find", "discover", "lookup", "query", "locate", "browse"],
  find: ["search", "discover", "lookup", "locate"],
  create: ["scaffold", "generate", "build", "init", "setup", "make", "new"],
  setup: ["bootstrap", "init", "configure", "scaffold", "create"],
  fix: ["resolve", "repair", "debug", "patch", "correct"],
  deploy: ["ship", "publish", "release", "launch", "ci", "cd", "pipeline"],
  analyze: ["inspect", "review", "examine", "audit", "scan"],
  monitor: ["watch", "observe", "track", "follow"],
  security: ["vulnerability", "audit", "cve", "secret", "credential", "leak", "exposure"],
  benchmark: ["measure", "evaluate", "score", "grade", "performance", "capability"],
  parallel: ["multi-agent", "coordinate", "team", "concurrent", "distributed"],
  document: ["doc", "documentation", "readme", "agents-md", "report"],
  research: ["recon", "investigate", "discover", "explore", "gather"],
  quality: ["gate", "check", "validate", "standard", "rule"],
  code: ["implement", "build", "develop", "write", "program"],
  debug: ["fix", "investigate", "diagnose", "troubleshoot", "stacktrace"],
  ui: ["frontend", "visual", "screenshot", "responsive", "layout", "css", "component"],
  llm: ["model", "ai", "generate", "prompt", "gpt", "claude", "gemini"],
  migrate: ["upgrade", "update", "port", "convert", "transition", "refactor"],
  review: ["inspect", "audit", "pr", "pull-request", "feedback", "critique"],
  performance: ["speed", "latency", "optimize", "fast", "slow", "bottleneck"],
  data: ["csv", "xlsx", "json", "pdf", "file", "parse", "extract", "spreadsheet"],
  paper: ["academic", "research", "write", "publish", "neurips", "icml", "arxiv"],
  start: ["begin", "init", "kick-off", "launch", "bootstrap", "new"],
  report: ["generate", "summary", "output", "export", "document"],
  clean: ["cleanup", "prune", "remove", "delete", "stale", "orphan"],
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

function getDomainBoost(category: string, topCategories: Set<string>): number {
  for (const [, cluster] of Object.entries(DOMAIN_CLUSTERS)) {
    if (cluster.includes(category) && cluster.some((c) => topCategories.has(c) && c !== category)) {
      return 5;
    }
  }
  return 0;
}

/**
 * Multi-modal hybrid search engine.
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
  }
): SearchResult[] {
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(Boolean);
  const limit = options?.limit ?? 15;
  const explain = options?.explain ?? false;
  const mode = options?.mode ?? "hybrid";
  const idf = computeIDF();

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

  const toolScores = new Map<string, { score: number; reasons: string[] }>();

  for (const tool of tools) {
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
    if (mode === "hybrid" || mode === "prefix") {
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
          const tagScore = Math.round(10 * (idfWeight / 3));
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
    }

    // ── SEMANTIC: synonym expansion (only score expanded words, not original) ──
    if (mode === "hybrid" || mode === "semantic") {
      for (const syn of expandedWords) {
        if (queryWords.includes(syn)) continue; // skip original words
        if (entry.tags.includes(syn)) { score += 6; reasons.push(`semantic:tag(${syn})`); }
        else if (nameLower.includes(syn)) { score += 4; reasons.push(`semantic:name(${syn})`); }
        else if (descLower.includes(syn)) { score += 2; reasons.push(`semantic:desc(${syn})`); }
      }
    }

    // ── FUZZY: Levenshtein distance for typo tolerance ──
    if (mode === "hybrid" || mode === "fuzzy") {
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
    if (mode === "hybrid" || mode === "fuzzy") {
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
    if (queryBigrams.length > 0) {
      for (const bigram of queryBigrams) {
        if (allText.includes(bigram)) {
          score += 15;
          reasons.push(`bigram:phrase("${bigram}")`);
        }
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

  const results: SearchResult[] = [];
  for (const tool of tools) {
    const entry = TOOL_REGISTRY.get(tool.name);
    const scored = toolScores.get(tool.name);
    if (!entry || !scored) continue;

    const domainBoost = getDomainBoost(entry.category, topCategories);
    if (domainBoost > 0) {
      scored.score += domainBoost;
      scored.reasons.push(`domain_boost:+${domainBoost}`);
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
export const SEARCH_MODES: SearchMode[] = ["hybrid", "fuzzy", "regex", "prefix", "semantic", "exact"];

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
    description: "Comprehensive security assessment of dependencies, code, and terminal history",
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
    description: "Structured code review with quality gates and learning capture",
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
};
