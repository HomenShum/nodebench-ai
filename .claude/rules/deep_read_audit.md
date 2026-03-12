# Deep-Read Audit Protocol

When collocating across tools, prompts, skills, or rules — NEVER edit from a section-level read. Full end-to-end reads only.

## Protocol

1. **Categorize** — Group all target files into 4-6 non-overlapping categories by domain
2. **Parallel subagents** — Launch one Explore subagent per category, all simultaneously
3. **Full reads required** — Each subagent reads EVERY file in its category end-to-end. No partial reads, no grep-only
4. **Numbered findings** — Each finding must include:
   - `[N] FILE:LINE` — exact location
   - `"exact quote of relevant code/text"` — verbatim from the file
   - `ISSUE:` — description of duplication, obscurity, or centralization need
5. **Wait for all** — Do not synthesize until ALL subagents complete
6. **Synthesize** — Produce a single consolidated report with:
   - P0 (extract immediately), P1 (fix this sprint), P2 (next sprint)
   - Estimated impact per tier
   - Proposed module paths for centralized code

## What to look for
- Duplicated helper functions across files
- Overlapping tool/rule descriptions that confuse discovery
- Shared patterns that should be centralized (DB setup, ID generation, timestamps, fetch wrappers)
- Inconsistent naming conventions (params, response shapes, error formats)
- Tools/rules that do similar things in different files
- Hardcoded values that should be shared constants
- Stale/deprecated code still callable
- Instructions duplicated across CLAUDE.md, .claude/rules/, .cursor/rules/

## Anti-patterns
- Reading only the first 50 lines and inferring the rest
- Grepping for keywords instead of reading full context
- Editing before the audit completes
- Skipping large files (72KB+ agent files are WHERE the duplication hides)

## Related rules
- `analyst_diagnostic` — root cause before fix
- `reexamine_process` — orchestrator for when/how to re-examine
- `completion_traceability` — cite back to original request
