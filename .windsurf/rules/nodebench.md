---
trigger: always_on
---

## Implementation Guidelines

### 1. Code Reuse & Existing Components
- **MANDATORY**: Before creating any new component, search the codebase for existing similar components and reuse them
- Leverage existing patterns:

### 2. Architecture & File Organization
- Follow the existing hierarchical domain-organized structure:
  ```
  src/features/editor/          # Editor-specific features
    ├── components/             # React components
    ├── hooks/                  # Custom hooks
    └── utils/                  # Utility functions
  
  src/features/agents/          # Agent-specific features
    └── components/FastAgentPanel/  # Fast Agent UI components
  
  convex/domains/               # Backend domain logic
    ├── documents/              # Document operations
    └── agents/                 # Agent operations
  ```
- Group related functionality together (hooks with hooks, components with components)
- Keep backend (Convex) and frontend (React) clearly separated

### 3. Documentation & API Verification
- **BEFORE implementing any library/framework feature**:
  1. Use Context7 MCP to fetch the latest official documentation
  2. Verify API signatures, parameter types, and return values
  3. Check for version-specific changes or deprecations
- **For external integrations** (Convex Agent, BlockNote, TipTap, RTVI):
  1. Use web search to find latest best practices
  2. Cross-reference with existing usage in the codebase
  3. Ensure compatibility with current versions in package.json

### 4. The Standard Development Cycle (Request → Ship)
Follow this exact loop for every task to ensure stability and transparency:

**A. Analyze & Plan (Request)**
- **Search First**: Use `grep` or file reads to locate relevant files before coding.
- **Context Check**: Identify if the change affects multiple views (e.g., *Does this Sidebar change affect both Research and Workspace modes?*).

**B. Implement**
- Write the code following the **Architecture** and **Reuse** rules above.
- Apply changes iteratively (e.g., create the component → export it → integrate it).

**C. Verify (Test)**
- **Build Check**: Always run the build/type-check command to catch compilation errors immediately.
- **Browser Verification**: Use Playwright/Browser tools to validate the flow:
  1. **Navigate** to the specific view.
  2. **Interact** (Click, Type, Drag) to test functionality.
  3. **Screenshot**: Capture the final state to visually confirm the fix.
- *Note: Do not write `*.test.ts` files unless explicitly requested; rely on interactive verification.*

**D. Finalize (Commit & Push)**
Run git status, review changes, understand readme format, update readme, commit and push

Context7 MCP + Playwright MCP Expert Assistant Protocol (v2 concise)

Overall priorities (in order)

Answer the user’s request correctly and concretely.

When code or SDKs are involved, ground yourself on real docs via Context7.

When UI or flows are involved, verify behavior with Playwright MCP calls instead of writing manual tests, unless the user explicitly asks for test files.

Keep responses structured but not bloated.

Knowledge Retrieval and Validation (Context7)

Prefer official or spec documentation. Always:
– Pin versions when relevant.
– Pull only minimal, relevant snippets.
– Provide links and, when available, last-updated information.

For any library/SDK/framework usage:
– Use Context7 to confirm API shapes, patterns, and constraints.
– Explicitly state what you validated (library name, version, key methods) and which docs you used.

Library docs workflow:
– If a library ID is not provided, call resolve-library-id by name and choose the best match by:
name similarity, doc coverage, trust score.
– Then call get-library-docs with that ID.
– If options are ambiguous, briefly note them and continue with the best match. If nothing fits, say so and suggest a better query.

Use Context7 to keep frontend and backend aligned on:
– API endpoints, request/response shapes, and versioning.
– Shared models or types.

Browser Automation and Testing (Playwright MCP)

Environment:
– mcp-playwright commands always run assuming Windows PowerShell.

Testing policy:
– Default: do NOT generate manual test files or test code.
– Instead, use Playwright MCP tools to interactively:
• Navigate, click, type, submit.
• Validate end-to-end flows.
• Capture screenshots and snapshots.
– Only create test files when the user explicitly says things like “write tests”, “add a test suite”, or “create a spec”.

Core MCP usage patterns:

– For flows and regression checks:
• browser_install (if needed).
• browser_navigate and browser_navigate_back.
• browser_click, browser_type, browser_fill_form, browser_press_key.
• browser_wait_for when waiting on async UI changes.

– For responsiveness and structure:
• browser_resize for testing key breakpoints (mobile, tablet, desktop).
• browser_snapshot to capture page structure and accessibility tree.

– For debugging:
• browser_console_messages and browser_network_requests to inspect errors and API calls.
• browser_take_screenshot or playwright.screenshot for visual evidence.

– For existing formal test suites:
• playwright.test(path/glob, { project: "chromium", headless: true }) when the repo already has tests.

On any failure or broken flow:
– Run playwright.diagnose with the relevant identifier.
– Summarize briefly:
• What failed.
• Why it likely failed (root cause).
• Which part of the code or configuration is responsible.
– Propose and apply a concrete fix.
– Re-run the relevant Playwright commands or tests to confirm the fix.

When to use sequentialthinking

Use sequentialthinking for non-trivial work:
– Multi-file changes.
– New feature design.
– Complex debugging or refactors.

Do not call sequentialthinking for trivial questions or one-liner changes; go straight to the answer plus any needed Context7/Playwright usage.

Response structure (Universal Contract)

Always answer in this order:

Direct answer:
– State the outcome in clear, plain language.
– If code is requested, show the final version first.

How I got there:
– Short, numbered reasoning steps.
– Mention any Context7 or Playwright calls used and their key findings.
– Include 1–3 authoritative links for important factual or API claims (from docs or specs).

Alternatives and trade-offs:
– Only when meaningful (e.g., different libraries, architectures, patterns).
– Brief explanation of when to choose each alternative.

Action plan:
– A short checklist of next steps:
• Commands to run.
• Files or components to touch.
• Flows to re-test (and how, via Playwright MCP).

Architecture and implementation rules (scope this to your known repos)

When working in NodeBench or a similar app that uses this pattern, prefer:

src/features/<domain>/{api,components,hooks,types}
src/app/{providers,routes}
src/shared/{ui,utils,hooks}

Implementation style:
– Short functions, early returns, const by default, clear names.
– Prefer parameter objects for functions with many options.
– Use discriminated unions for variant states and results.
– One main React component per file; keep presentational vs. logic separation in mind.

State management:
– TanStack Query for server state.
– React Context (or equivalent) for local-global client state.
– Centralized error handling and loading behavior where practical.

Code review and assessment (only when explicitly reviewing code)

When the user asks for a code review or PR-style assessment, follow this exact format:

Interview-style summary:
– 2–4 sentences describing overall quality, risks, and strengths.

Files touched or reviewed:
– List every repo-relative path that you referenced.

Detailed findings:
– For each finding, specify:
• Severity: Critical, Major, or Suggestion.
• Location (file + line or section).
• Impact and rationale.
• Concrete fix, ideally including a code snippet.

Fix plan:
– Numbered steps with:
• What to change.
• Where to change it.
• How to verify (which Playwright flows or commands to run).

Process control and review loop

Use Context7 operations in parallel when multiple libraries or APIs are involved; then consolidate all findings into a single coherent explanation.

Avoid ephemeral “mental” designs for non-trivial features:
– Summarize key decisions in DESIGN_SPECS.md, FOLDER_STRUCTURES.md, or feature-specific READMEs when appropriate.

On any failed attempt or incorrect answer:
– Output a short diagnostic:
• What went wrong.
• Which constraints were missed.
• How the next attempt will differ.
– Then correct and proceed; up to three iterative improvements per task is acceptable before you mark it as “good enough for now.”

Only call tools when they materially improve correctness, grounding, or verification. Do not call Context7, Playwright, or sequentialthinking just to satisfy the protocol; the priority is solving the user’s request efficiently and accurately.