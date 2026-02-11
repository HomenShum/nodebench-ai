# MCP Server Submission Review: nodebench-mcp

**Reviewer**: Automated review via Cascade  
**Date**: 2026-02-10  
**Package**: `nodebench-mcp` v2.17.0 (server reports v2.18.0)  
**Server name**: `nodebench-mcp-methodology`  
**Overall verdict**: **CONDITIONAL PASS** — 3 blockers, 7 improvements needed

---

## 1. Package Metadata

| Criterion | Status | Notes |
|---|---|---|
| `name` field | PASS | `nodebench-mcp` — clear, follows npm naming conventions |
| `version` field | **FAIL** | package.json says `2.17.0`, server reports `2.18.0` (line 1409 of index.ts) — **version mismatch** |
| `description` | WARN | 1,100+ characters — functional but extremely long. npm truncates at ~256 chars on the registry page. First sentence should be self-contained |
| `bin` entry | PASS | `"nodebench-mcp": "./dist/index.js"` — correct, maps to compiled output |
| `main` field | PASS | `./dist/index.js` |
| `files` array | PASS | `["dist", "README.md", "NODEBENCH_AGENTS.md", "STYLE_GUIDE.md"]` — includes only what users need |
| `type: "module"` | PASS | ESM, consistent with `import` usage throughout |
| `license` | **FAIL** | package.json says `"MIT"` but **no LICENSE file exists** at the package root or repo root |
| `keywords` | PASS | 30 relevant keywords covering all major domains |
| `repository` / `homepage` / `bugs` | PASS | All point to correct GitHub URLs |
| `engines` | PASS | `"node": ">=18.0.0"` — reasonable minimum |
| `author` | PASS | `"HomenShum"` |
| `prepublishOnly` | PASS | Runs `build && test` before publish — good practice |

### Blockers in this section
1. **Version mismatch**: `package.json` says `2.17.0`, `Server()` constructor says `2.18.0`. Must be synchronized.
2. **Missing LICENSE file**: `"license": "MIT"` is declared but no `LICENSE` or `LICENSE.md` file exists. npm requires this for MIT claims. Create one at the package root.

---

## 2. MCP Protocol Compliance

| Criterion | Status | Notes |
|---|---|---|
| Protocol version | PASS | Responds with `"protocolVersion": "2024-11-05"` — current spec |
| `tools` capability | PASS | `{ tools: { listChanged: true } }` — correctly declares dynamic tool support |
| `prompts` capability | PASS | `{ prompts: {} }` — correctly declares prompt support |
| `instructions` field | PASS | Includes `SERVER_INSTRUCTIONS` string for Claude Code Tool Search compatibility |
| `tools/list` handler | PASS | Returns all tools with `name`, `description`, `inputSchema`. Includes `annotations` (category, phase, complexity) |
| `tools/call` handler | PASS | Full dispatch with error handling, instrumentation, TOON encoding |
| `tools/call` error response | PASS | Returns `{ isError: true }` with error message on both thrown errors and soft errors (`{ error: true }`) |
| Unknown tool handling | PASS | Returns `{ isError: true, content: [{ type: "text", text: "Unknown tool: ..." }] }` |
| `prompts/list` handler | PASS | Returns 7 prompts with descriptions and argument schemas |
| `prompts/get` handler | PASS | Returns prompt messages, supports both static and dynamic (function) messages |
| Unknown prompt handling | PASS | Throws `Error("Unknown prompt: ...")` — correct per MCP spec |
| `notifications/tools/list_changed` | PASS | Sent after `load_toolset` and `unload_toolset` — wrapped in try/catch for client compat |
| Stdio transport | PASS | Uses `StdioServerTransport` — standard MCP transport |
| Server ready signal | PASS | `console.error("nodebench-mcp ready ...")` — stderr, doesn't pollute stdout JSON-RPC |
| Graceful shutdown | PASS | `process.on('exit')` finalizes analytics and A/B session |
| Content block format | PASS | All responses use `{ type: "text", text: "..." }` content blocks. Image tools use `rawContent` flag correctly |

### Annotations (MCP 2025-11-25 spec)
| Field | Status | Notes |
|---|---|---|
| `title` | PASS | Auto-generated from tool name (underscores → spaces) |
| `category` | PASS | From TOOL_REGISTRY — maps to 34 domain categories |
| `phase` | PASS | Pipeline phase (recon, utility, test, meta, etc.) |
| `complexity` | PASS | Model tier hint from `getToolComplexity()` |

**No blockers in this section.**

---

## 3. Documentation Quality

| Criterion | Status | Notes |
|---|---|---|
| README exists | PASS | 874 lines, comprehensive |
| One-line description | PASS | "Make AI agents catch the bugs they normally ship." — clear, compelling |
| Install instructions | PASS | Both `claude mcp add` and JSON config shown. Includes `npx -y` for zero-install |
| Quick start examples | PASS | 4 concrete first prompts to try |
| Feature overview | PASS | Tables showing concrete impact for each tool category |
| Architecture explanation | PASS | AI Flywheel pipeline diagram, inner/outer loop explanation |
| API key documentation | PASS | Optional env vars clearly documented with purpose |
| Preset system explained | PASS | Table comparing default vs full, with CLI examples |
| Advanced features | PASS | Dynamic loading, ablation study, context management all documented with research citations |
| GETTING_STARTED.md | PASS | Progressive adoption guide exists |
| USE_CASES.md | PASS | All 175 tools with exact prompts |
| DYNAMIC_LOADING.md | PASS | Full research methodology with A/B test results |
| NODEBENCH_AGENTS.md | PASS | Included in `files` array for npm distribution |
| STYLE_GUIDE.md | PASS | Included in `files` array |
| --help output | PASS | Comprehensive: options, toolsets, presets, examples |
| CHANGELOG | WARN | No CHANGELOG.md found — recommended for tracking breaking changes across versions |

### Documentation issues

- **Semantic version inconsistency**: README mentions "44 tools" in some places, "39 tools" in others for the default preset. The `--help` output shows the actual count. Standardize on one number.
- **`lite` preset reference**: Line 241 and 427 reference a `"lite"` preset that doesn't exist in `PRESETS`. Should be `"default"`.
- **Presets table malformed**: Line 438 has `|---|---|---|---|---|` (5 columns) but the header has only 4 columns.

---

## 4. Functional Testing

| Test | Status | Notes |
|---|---|---|
| Server starts | PASS | Responds to `initialize` within 2s |
| Protocol handshake | PASS | Returns correct `serverInfo`, `capabilities`, `instructions` |
| Unit tests | PASS | 266 passed, 1 skipped, 0 failures (4.96s) |
| Dynamic loading tests | PASS | All edge cases pass (full-registry search, load/unload, structural correctness) |
| A/B harness (28 scenarios) | PASS | 100% success rate in both static and dynamic modes |
| Discovery accuracy | PASS | 18/18 (100%) — all domain queries suggest the correct toolset |
| Ablation tests (54 queries) | PASS | 3 user segments tested, baselines established |
| TypeScript compilation | PASS | `tsc --noEmit` clean — no type errors |
| Build (`tsc`) | PASS | Compiles to `dist/` without errors |

**No blockers in this section.**

---

## 5. Tool Input Schemas

Reviewed a sample of tool schemas across different categories:

| Tool | Schema quality | Notes |
|---|---|---|
| `load_toolset` | PASS | `required: ["toolset"]`, description includes available options |
| `unload_toolset` | PASS | `required: ["toolset"]`, clear description |
| `list_available_toolsets` | PASS | Empty properties object — correct for zero-arg tool |
| `call_loaded_tool` | PASS | `required: ["tool"]`, `args` is optional with `additionalProperties: true` |
| `smart_select_tools` | PASS | `required: ["task"]`, `provider` has `enum` validation |
| `get_ab_test_report` | PASS | Optional `detailed` boolean |
| Discovery tools (from `progressiveDiscoveryTools.ts`) | PASS | `query`, `limit`, `mode`, `explain`, `intent`, `compact` — well-typed with descriptions |

### Schema observations
- All checked schemas use proper JSON Schema types (`string`, `number`, `boolean`, `object`, `array`)
- `required` arrays are consistently present where needed
- Descriptions are consistently provided for all parameters
- `enum` constraints used where appropriate (e.g., `smart_select_tools.provider`)
- **No schema uses `$ref` or complex JSON Schema features** that might confuse LLMs — good practice

**No blockers in this section.**

---

## 6. Security Practices

| Criterion | Status | Notes |
|---|---|---|
| No hardcoded API keys | PASS | All 199 `process.env` references read from environment; no `sk-*`, `key-*`, or password literals found in source |
| API keys via env vars only | PASS | `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `EMAIL_PASS` — all from `process.env` |
| API key in URL (Gemini) | WARN | `smart_select_tools` passes Gemini API key as URL query parameter (`?key=${geminiKey}`). This is Google's documented pattern but keys can appear in server logs. Consider using header-based auth if available |
| Data locality | PASS | All data stored locally in `~/.nodebench/nodebench.db` and `~/.nodebench/analytics.db` — explicitly documented as never leaving the machine |
| Error isolation | PASS | All instrumentation wrapped in `try/catch` with comments like "never let instrumentation break tool dispatch" |
| SQL injection | PASS | All DB queries use parameterized statements (`.prepare().run(...)`) — no string concatenation in SQL |
| File system access | WARN | `local_file` tools can read arbitrary files. This is expected for a development tool but should be documented as a trust boundary |
| External API calls | PASS | Only made when user provides API keys. No phone-home, no telemetry to external servers |
| `optionalDependencies` | PASS | Heavy deps (playwright, sharp, tesseract.js) are optional — won't break install if unavailable |

**No blockers in this section.**

---

## 7. Value to End Users

| Criterion | Status | Notes |
|---|---|---|
| Clear value proposition | PASS | "Make AI agents catch the bugs they normally ship" — concrete, measurable claim backed by benchmark data |
| Benchmark evidence | PASS | 9 real production scenarios with before/after comparison table |
| User testimonials | PASS | 2 concrete user profiles (vision engineer, QA engineer) with specific use cases |
| Progressive complexity | PASS | Default preset (39 tools) → themed presets (44-60) → full (175). Users aren't overwhelmed |
| Zero-config start | PASS | `npx -y nodebench-mcp` works out of the box with SQLite — no external services required |
| Graceful degradation | PASS | API-dependent features (web search, vision, LLM) have clear fallbacks or skip gracefully |
| Discovery system | PASS | `discover_tools`, `findTools`, `getMethodology`, `get_workflow_chain` — multiple entry points for finding tools |
| 7 MCP prompts | PASS | Onboarding, project setup, UI QA, parallel agents, oracle testing, Claude Code parallel, agent contract — comprehensive agent instruction set |

---

## Summary: Required Actions

### Blockers (must fix before listing)

| # | Issue | Severity | Fix |
|---|---|---|---|
| B1 | **Version mismatch** | HIGH | Sync `package.json` version (`2.17.0`) with `Server()` constructor (`2.18.0`). Pick one and update the other |
| B2 | **Missing LICENSE file** | HIGH | Create `LICENSE` file at package root with MIT license text. Required for `"license": "MIT"` claim |
| B3 | **`lite` preset reference** | MEDIUM | README lines 241 and 427 reference `"lite"` preset which doesn't exist. Should be `"default"` |

### Improvements (recommended before listing)

| # | Issue | Severity | Fix |
|---|---|---|---|
| I1 | Description too long | LOW | Trim `package.json` description to ~200 chars. Move details to README |
| I2 | Tool count inconsistency | LOW | README says "44 tools" and "39 tools" for default preset in different places. Standardize |
| I3 | Presets table column mismatch | LOW | Line 438 has 5 separator columns but 4 header columns |
| I4 | Add CHANGELOG.md | LOW | Track breaking changes, new tools, and deprecations per version |
| I5 | Gemini API key in URL | LOW | Consider header-based auth to avoid key exposure in server logs |
| I6 | `nodebench-ai` file dependency | WARN | `"nodebench-ai": "file:../.."` in dependencies — this won't resolve for npm users. Must be published or bundled |
| I7 | File system trust boundary | LOW | Document that `local_file` tools have read access to the filesystem in a security section |

---

## Reviewer Notes

**Strengths:**
- Exceptional MCP protocol compliance — correct capabilities declaration, annotations, list_changed notifications, instructions field, error handling
- Outstanding documentation — 874-line README with benchmarks, examples, user testimonials, and research citations
- Rigorous testing — 266 unit tests, 28-scenario A/B harness, 54-query ablation study across 3 user segments
- Thoughtful architecture — progressive disclosure (presets → discovery → dynamic loading), TOON encoding for token savings, graceful degradation
- 7 MCP prompts provide excellent agent onboarding and workflow guidance
- Security practices are solid — parameterized SQL, env-only keys, local-only data, error isolation

**Risks:**
- The `file:../..` dependency on `nodebench-ai` is the most serious practical concern — this means the package **cannot be installed from npm as-is**. This must be resolved (publish `nodebench-ai` as a separate package, or inline the dependency)
- 175 tools is ambitious. The preset system and discovery engine mitigate this well, but the default preset should be verified to contain only tools that work without any API keys

**Recommendation:** Fix the 3 blockers (version sync, LICENSE file, `lite` → `default` reference), resolve the `file:` dependency, and this server is ready for listing. The quality of implementation, documentation, and testing is well above typical MCP server submissions.
