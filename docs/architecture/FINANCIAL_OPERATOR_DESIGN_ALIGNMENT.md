# Financial Operator Console — Design Alignment

How the new `/finance-demo` route, typed cards, and `FinancialOperatorOverlay` build on top of the existing NodeBench UI kit per surface (web, mobile, workspace, CLI/MCP).

The shared discipline: **same tokens, same primitives, surface-specific entry**. No new design language; only new content types (typed cards) that compose existing primitives.

---

## 1. Web (desktop, `nodebenchai.com`)

**Existing kit baseline**
- Glass-DNA card: `border border-edge bg-surface/50` (utility class `.nb-card`)
- Card row: `.nb-card-row`
- Section header: `text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted` (`.nb-section-title`)
- Pill: `.nb-badge` (border + bg/5 fill)
- Color tokens: `border-edge`, `bg-surface`, `bg-surface-hover`, `text-content`, `text-content-secondary`, `text-content-muted`
- Accent: terracotta `#d97757` for selected/CTA states
- Type: Manrope (UI) + JetBrains Mono (data, formulas, tool names)
- Background: `--bg-primary: #151413`

**What the financial cards reuse (verbatim)**
- Every card body uses `.nb-card` chrome with a colored left-border accent stripe per `kind` (`border-l-emerald-400` for calculation, `border-l-[#d97757]` for approval, etc.). The accent stripe is a 1-line addition; everything else is the existing card class.
- Badges use `.nb-badge` shape (rounded-full + border + small text).
- Section headers (`Plan`, `Tool`, `Extraction`, …) follow the existing `text-[11px] uppercase tracking-[0.2em]` pattern.
- Mono-font for: tool names (`document.locate_sections`), formula text, sequence numbers, source refs.
- Standard `max-w-3xl mx-auto p-6` layout matches `/developers`, `/changelog`, etc.

**What's new (purely additive)**
- 9 typed step kinds (`run_brief`, `tool_call`, `extraction`, `validation`, `calculation`, `evidence`, `artifact`, `approval_request`, `result`) — each is a new content shape, but all rendered through `.nb-card` chrome.
- Status pills in 7 states (`pending`, `running`, `complete`, `error`, `needs_review`, `approved`, `rejected`) — color-coded but use existing badge chrome.
- 1 sandbox-disclosure note ("Math executed in JS sandbox, not by the language model.") — emerald accent, single instance per calculation card.

**Where it lives on web**
- Standalone view: `/finance-demo` (aliases `/financial-operator`, `/finops`) — full-width 4-tile picker + live timeline.
- Global overlay: `<FinancialOperatorOverlay />` mounted in `App.tsx`. Reads `?finRun=<id>` from URL → renders timeline as a right-side drawer alongside whatever surface the user is on. Collapsible to a corner pill.
- No changes to existing routes' visual language; the overlay docks beside them.

---

## 2. Mobile (375 px viewport)

**Existing kit baseline**
- Bottom nav (Home/Reports/Chat/Inbox/Me) — `xl:hidden`, fixed bottom
- Agent panel: full-screen slide-over on `xl:hidden`
- `QuickCommandChips`: mobile-only chip strip above input, dispatches `cmd.query` on tap
- Capture FAB
- All grids degrade to `grid-cols-1` below `sm:`

**What financial cards do at this width**
- All cards stack vertically (cards are `space-y-3` lists by default).
- Approval card grid: `sm:grid-cols-2` → falls back to single column on phones, so 4 options stack.
- Calculation inputs/outputs: `sm:grid-cols-2` → single column on small. Long mono formulas use `whitespace-pre-wrap` so they wrap rather than horizontal-scroll.
- The overlay drawer is `max-w-md` on phones (~448 px) and full-screen-width-with-margin on truly small viewports — matches the existing agent slide-over behavior.

**Mobile-only entry point**
- Added to `QuickCommandChips`: `{ id: "fin-att-demo", label: "AT&T cost of debt", icon: Calculator, navigate: "/finance-demo" }`.
- The chip type was extended with an optional `navigate?: string` field (single-line schema change). When set, click navigates instead of dispatching the chat query — same fork the existing chip flow already understood, just a new branch.
- Chip placement is identical to all existing mobile chips (above input, scroll-x).

**What's intentionally NOT mobile**
- The picker grid on `/finance-demo` collapses fine, but reading 9 cards on a phone is dense. Mobile users should generally trigger from the chip → see the run in the right-drawer overlay, not the standalone picker.

---

## 3. Workspace (`workspace.nodebenchai.com`)

**Existing kit baseline**
- Workspace is a separate deployed surface (its own subdomain alias) with its own layout: ExactChatSurface, ProductTopNav, document-as-canvas pattern.
- Reports/notebooks live as documents in `convex/schema.ts:documents`.
- Workspace tabs (`brief`, `cards`, `notebook`, `sources`, `chat`, `map`) are typed in `productEventWorkspaces.defaultTabs`.

**Current state of the financial operator on Workspace**
- The `FinancialOperatorOverlay` is mounted in `App.tsx` and is surface-agnostic — it works on workspace.nodebenchai.com just by appending `?finRun=<id>` to any URL.
- The artifact card is shaped to drop a notebook entry — but the `artifactRef` field is currently unused. The wire-up to actually create a `documents` row + back-link the run lives in a follow-up.

**Planned (next PR)**
- `Artifact.kind === "notebook" | "memo"` will create a `documents` row tagged `kind: "financial_run"` and store the runId on it. Workspace's existing notebook tab can then surface the financial runs as document entries.
- A new workspace tab `financial` would render `FinancialOperatorTimeline` for runs scoped to a given event workspace — same component, new mount point.

**Token-level fit**
- Workspace already uses the same `nb-card`/`border-edge`/etc tokens, so the cards drop in without restyling.
- The overlay's `bg-[#151413]/95 backdrop-blur-md` matches the workspace dark stage.

---

## 4. CLI / MCP (`packages/mcp-local`, `nodebench-mcp`)

**Existing kit baseline**
- ~304 MCP tools, gated by preset (`starter`, `founder`, `banker`, `operator`, `researcher`, `web_dev`, `data`, `full`).
- Tool schema: `{ name, description, inputSchema, handler }` (the `McpTool` type).
- CLI subcommands: `discover`, `setup`, `workflow`, `quickref`, `call`, `demo`.
- Progressive discovery: each tool entry has `nextTools` + `relatedTools` for one-hop navigation.

**Status of the financial operator on CLI**
- Currently the financial actions exist server-side as Convex actions (`runAttCostOfDebtDemo`, `runCrmCleanupDemo`, `runCovenantComplianceDemo`, `runVarianceAnalysisDemo`, `runRealCostOfDebtFromPdf`).
- They are NOT yet exposed as MCP tools — agents (Claude Code, Cursor, Windsurf) cannot drive runs from outside the browser today.

**Planned exposure (next PR — sketched here for design parity)**

Surface as 4 demo tools + 1 production tool + 4 helpers:

| Tool name | Purpose | Returns |
|---|---|---|
| `finance_start_att_demo` | Trigger Example A run | `{ runId }` |
| `finance_start_crm_cleanup` | Trigger Example B run | `{ runId }` |
| `finance_start_covenant_compliance` | Trigger Example C run | `{ runId }` |
| `finance_start_variance_analysis` | Trigger Example D run | `{ runId }` |
| `finance_extract_from_pdf` | Production: take a PDF storageId, return runId | `{ runId }` |
| `finance_get_run` | Inspect run header | `{ runId, status, finalSummary, … }` |
| `finance_list_steps` | Get the typed step stream | `Step[]` |
| `finance_record_decision` | Approve/reject/override an approval gate | `{ stepId, status }` |
| `finance_open_in_chat` | Return a deep-link URL `/?surface=ask&finRun=<id>` | `{ url }` |

These would live in `packages/mcp-local/src/tools/financialOperatorTools.ts`, register under domain key `finance_ops`, and slot into the `banker` and `operator` presets by default. Each tool lists `relatedTools` pointing to the other tools in the same chain (e.g. `finance_start_att_demo.relatedTools = ["finance_get_run", "finance_list_steps", "finance_record_decision"]`).

**Token-level fit**
- CLI doesn't have visual tokens — it's text. The "design alignment" for CLI is the **schema language**: same `kind` enum, same status enum, same field names as the frontend cards. So an MCP client can render its own CLI representation of a step stream and the text layout maps 1:1 to what the web cards render.
- Output formatting in `finance_list_steps` should reuse the same labels (`Plan`, `Tool`, `Extraction`, …) so a Claude Code session reads the same vocabulary the web user sees.

---

## Composition matrix

| Surface | Existing primitive reused | New primitive added | Entry point |
|---|---|---|---|
| Web (desktop) | `.nb-card`, `.nb-section-title`, `.nb-badge`, terracotta accent, Manrope/JetBrains Mono | 9 typed step shapes; sandbox disclosure; overlay drawer | `/finance-demo` route + global overlay |
| Mobile | `QuickCommandChips`, slide-over drawer, `xl:hidden` bottom nav | Chip `navigate` field; overlay max-w-md | Mobile chip → overlay |
| Workspace | Document model, `productEventWorkspaces` tabs, ExactChatSurface | (Pending) `Artifact.kind === "notebook"` writes a documents row; new `financial` workspace tab | Same overlay; future workspace tab |
| CLI / MCP | `McpTool` schema, presets, progressive discovery | (Pending) `finance_*` tool family in `finance_ops` domain | `nodebench-mcp call finance_start_att_demo` |

The shared invariants across all four surfaces:

1. **Same step kinds** — `run_brief / tool_call / extraction / validation / calculation / evidence / artifact / approval_request / result` everywhere.
2. **Same status enum** — `pending / running / complete / error / needs_review / approved / rejected`.
3. **Same source-attribution rule** — every value carries `sourceRef` + `confidence`.
4. **Same sandbox guarantee** — math runs in `convex/domains/financialOperator/sandbox.ts`, never in the LLM, regardless of surface.

The result: a financial workflow that started in Claude Code via MCP can be picked up in the web overlay via deep-link, viewed mid-run on mobile, and ultimately archived as a workspace notebook — without any rendering surface needing to know the others exist. The runId + step stream is the contract.

---

## Anti-patterns this design avoids

- **Surface-specific styling** — no per-surface tweaks to the cards. If a card needs to change, it changes everywhere.
- **Parallel chat protocols** — the overlay reads URL params, which any surface already supports. No new postMessage bus, no new context provider, no new agent-panel internals.
- **Tokens duplicated as inline values** — every color/spacing reads from the existing token alias (`border-edge`, `text-content-muted`, etc). A future theme change ripples through the new cards automatically.
- **Hidden math** — the calculation card forces the sandbox disclosure on screen; agents reading the same step record see the same `sandboxKind: "js_pure"` guarantee. No surface can lie about who computed what.

## Pointers

- Cards: [src/features/financialOperator/components/](../../src/features/financialOperator/components/)
- Overlay: [src/features/financialOperator/components/FinancialOperatorOverlay.tsx](../../src/features/financialOperator/components/FinancialOperatorOverlay.tsx)
- Demo view: [src/features/financialOperator/views/FinancialOperatorDemo.tsx](../../src/features/financialOperator/views/FinancialOperatorDemo.tsx)
- Mobile chip: [src/features/agents/components/FastAgentPanel/QuickCommandChips.tsx](../../src/features/agents/components/FastAgentPanel/QuickCommandChips.tsx)
- Backend orchestrators: [convex/domains/financialOperator/orchestrator.ts](../../convex/domains/financialOperator/orchestrator.ts), [orchestratorExamples.ts](../../convex/domains/financialOperator/orchestratorExamples.ts), [realExtractors.ts](../../convex/domains/financialOperator/realExtractors.ts)
- Sandbox: [convex/domains/financialOperator/sandbox.ts](../../convex/domains/financialOperator/sandbox.ts)
- Token reference: [src/shared/ui/surface-tokens.css](../../src/shared/ui/surface-tokens.css)
