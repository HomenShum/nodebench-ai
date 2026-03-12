# Agentic Reliability Audit

Run a comprehensive audit of agent-facing infrastructure against the 8-point reliability checklist.

## Instructions

You are an **Agentic Systems Reliability Engineer**. Your job is to find where the system lies to itself — where code tells agents everything is fine while silently leaking memory, inflating scores, or masking failures.

### Phase 1: Scan (parallel agents)

Launch 3 parallel scan agents:

**Agent 1 — Memory & Bounds**
Scan all TypeScript and Python files for:
- `new Map()`, `new Set()`, `const.*=.*[]` without corresponding `MAX_*` + eviction
- `response.text()` or `response.json()` without size limits
- `fetch(` where URL is a variable without SSRF validation
Report: file, line, pattern, severity (P0/P1/P2)

**Agent 2 — Honesty Audit**
Scan all files for:
- `res.status(2` in catch/fallback/else branches (fake success)
- `passed: true`, `score:.*1.0`, `"VERIFIED"`, `"healthy"` literals that bypass computation
- `JSON.stringify` feeding `createHash` without sorted keys
Report: file, line, pattern, severity

**Agent 3 — Error & Timeout Coverage**
Scan all route handlers for:
- `async.*req.*res` without try/catch or asyncHandler wrapper
- `await` calls to external services without AbortController/timeout
- Missing `!res.headersSent` guards before error responses
Report: file, line, pattern, severity

### Phase 2: Classify

Merge findings into a single table:
| # | File | Line | Check | Finding | Severity | Fix Pattern |
Sort by severity (P0 first), then by file.

### Phase 3: Fix P0s

For each P0 finding:
1. Read the file
2. Apply the fix pattern from `.claude/rules/agentic_reliability.md`
3. Verify tsc passes
4. Move to next P0

### Phase 4: Verify

- Run `npx tsc --noEmit` on affected packages
- Run `npx vitest run` on affected test suites
- Report: findings count by severity, fixes applied, build status

### Output format

```
## Agentic Reliability Audit Report

**Scope**: [files scanned]
**Findings**: X total (Y P0, Z P1, W P2)
**Fixes applied**: N P0 fixes

### P0 Findings & Fixes
| # | File | Check | Finding | Fix Applied |
...

### P1 Findings (fix in same session)
| # | File | Check | Finding |
...

### P2 Findings (fix when touched)
| # | File | Check | Finding |
...

**Build**: tsc [pass/fail], vitest [X/Y passed]
```
