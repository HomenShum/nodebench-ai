# NodeBench AI — Agent‑Managed Notebook & Document System

> Collaborative, Notion‑like editor on **Convex + Chef + React/Vite** with **agentic workflows**, **timeline/trace observation**, and multi‑modal document support (PDF/Word/CSV/Markdown; audio/video via transcripts).

[![Watch the demo](https://img.youtube.com/vi/XRYUUDNh4GQ/hqdefault.jpg)](https://www.youtube.com/watch?v=XRYUUDNh4GQ)

---

## Table of Contents

1. [Highlights](#highlights)
2. [Architecture at a Glance](#architecture-at-a-glance)
3. [Quick Start](#quick-start)
4. [Project Structure](#project-structure)
5. [Authentication](#authentication)
6. [Configuration & Environment](#configuration--environment)

   * [OpenRouter (Grok 4 Fast)](#openrouter-grok-4-fast)
   * [Linkup API](#linkup-api)
7. [Agents CLI Quickstart](#agents-cli-quickstart)
8. [HTTP API](#http-api)
9. [Testing & Evaluation](#testing--evaluation)
10. [Deployment](#deployment)
11. [Screenshots & Previews](#screenshots--previews)
12. [Changelog (Excerpt)](#changelog-excerpt)

---

## Highlights

* **Collaborative, Notion‑like editing** with rich‑text, lists, and paste‑preserving structure.
* **Multi‑modal documents**: PDFs, Word, CSV/Spreadsheets, Markdown; audio/video via transcript ingestion.
* **Agentic orchestration** with a **Timeline/Gantt** view for step‑level traces (plan → tool → verify → render).
* **Observability**: run history, token/latency badges, final output panel with copy & collapse.
* **Convex backend via Chef**: real‑time data, auth, file/document APIs, action functions for RAG/agents.
* **Auth**: Anonymous sign‑in for frictionless onboarding (switchable), Google OAuth supported.
* **Offline/stub mode** ready: run demos without external API keys.

---

## Architecture at a Glance

* **Frontend**: React + Vite UI; Agents Dashboard with **Tasks**, **Timeline**, and **Run History**.
* **Backend**: Convex (functions, storage, auth). `convex/router.ts` exposes user HTTP routes separate from auth.
* **Agents**: Planner/Executor/Verifier loops (standalone CLI + Convex actions). Typed tool I/O and traces.
* **Observation**: JSONL trace emitter → Timeline Gantt visualization; metrics & statuses.

---

## Quick Start

**Prerequisites**

* Node.js LTS, npm (or pnpm)
* [Convex CLI](https://docs.convex.dev/)

**Run locally**

```bash
npm install
npm run dev            # Starts Vite frontend + Convex backend (Chef)
```

* Visit the dev URL; sign in anonymously or with Google.
* If your workspace appears empty, click **Seed Onboard** to load sample docs and tasks.

---

## Project Structure

```
root
├─ src/                # React/Vite app (UI, views, components)
├─ convex/             # Convex functions, schema, router/http split
├─ agents/             # Standalone agent CLI, services, demo scenarios
├─ updated_screenshot/ # Images used in README & previews
├─ tests/              # Vitest test suites (live/eval)
└─ ...
```

**Dev convenience**

* `npm run dev` → runs both frontend and backend.

---

## Authentication

This app uses **Convex Auth**. Default is **Anonymous auth** for easy sign‑in in dev. You can swap to stricter auth before deployment. See: [https://auth.convex.dev/](https://auth.convex.dev/).

---

## Configuration & Environment

Create `.env.local` at the project root for provider keys and options.

### OpenRouter (Grok 4 Fast)

Used by standalone agents and Convex RAG actions.

```
# Required for OpenRouter
OPENROUTER_API_KEY=sk-or-...

# Optional overrides
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=x-ai/grok-4-fast:free

# Attribution (defaults when OPENROUTER_API_KEY is set)
OPENROUTER_SITE_URL=https://nodebench-ai.vercel.app/
OPENROUTER_SITE_NAME=NodeBench AI
```

See `agents/README.md` and `DESIGN_SPECS.md` for deeper details.

### Linkup API

Minimal wrapper at `agents/services/linkup.ts`.

```
LINKUP_API_KEY=sk-linkup-...
# or
NEXT_PUBLIC_LINKUP_API_KEY=sk-linkup-...
```

**Smoke test**

```bash
node tests/linkupSmoke.mjs
```

**Helpers**

* `linkupSourcedAnswer(query)` → answer + sources
* `linkupPersonProfile(fullNameAndCompany)` → structured JSON profile
* `linkupCompanyProfile(companyName)` → structured JSON profile

---

## Agents CLI Quickstart

Quick examples (see `agents/README.md` for full details):

```bash
# Research scenario
npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_1.json

# Summarize scenario
npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_2.json

# Multi-agent scaffold
npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_multi_agent_scaffold.json

# Orchestrate graph scenario
npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_orchestrate_graph.json

# Multimodal Grok
npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_multimodal_grok.json
```

**Optional env**

```
OPENROUTER_API_KEY=...
# or
OPENAI_API_KEY=...

# Using Convex-backed data from CLI
AGENTS_DATA=convex
CONVEX_URL=...
# + an auth token if required
```

---

## HTTP API

User‑defined HTTP routes live in **`convex/router.ts`** and are **split from `convex/http.ts`** to keep auth routes isolated from LLM‑modifiable code paths.

---

## Testing & Evaluation

Run targeted live tests (may call providers—ensure keys are set):

```bash
npx vitest run src/test/Orchestrator.live.e2e.test.ts
npx vitest run src/test/Orchestrator.live.eval.e2e.test.ts
```

---

## Deployment

* General guides: [Convex Docs](https://docs.convex.dev/)

  * **Overview**: [https://docs.convex.dev/understanding/](https://docs.convex.dev/understanding/)
  * **Hosting & Deployment**: [https://docs.convex.dev/production/](https://docs.convex.dev/production/)
  * **Best Practices**: [https://docs.convex.dev/understanding/best-practices/](https://docs.convex.dev/understanding/best-practices/)

This project is currently connected to the Convex deployment: [`formal-shepherd-851`](https://dashboard.convex.dev/d/formal-shepherd-851).

---

## Screenshots & Previews

### Preview (091925) — AI Agent Timeline View

![AI Agent Timeline View](./updated_screenshot/091925_preview_ai_agent_timeline_view.png)

### Preview (091925) — Mini calendar → Full Calendar Hub (parity)

![Mini calendar → Full Calendar Hub](./updated_screenshot/091925_mini_calendar_full_calendar_hub.png)
![Mini calendar → Full Calendar Hub (2)](./updated_screenshot/091925_mini_calendar_full_calendar_hub_2.png)

### AI analysis → Quick note + AI‑tagged header

![AI analysis → Quick note + AI-tagged header](./updated_screenshot/091725_ai_file_analysis_quick_note_ai_tagged.png)

### More previews (091825)

![Updated doc/filetype cards](./updated_screenshot/091825_updated_doc_filetype_cards_homepage.png)
![Better file viewer sizing](./updated_screenshot/091825_better_file_viewer_sizing.png)
![File analysis prompt popover](./updated_screenshot/091825_file_analysis_prompt_popover.png)
![Spreadsheet view updated](./updated_screenshot/091825_spreadsheet_view_updated.png)

### Preview (092325) — Agent Dashboard updates

* Tasks: centered multi‑line prompt (parity with Timeline)
  ![Tasks view centered prompt (092323)](./updated_screenshot/092323_dynamic_search_ai_agent_tasks_view_grid.png)

* Final Output: Copy button + collapse/expand (preference persisted)
  ![Final Output copy + collapse (092323)](./updated_screenshot/092323_dynamic_search_ai_agent_timeline_view_expanded\(1\).png)

* Run history: metrics badges (tokens, elapsed, model, retries)
  ![Run history with metrics badges (092323)](./updated_screenshot/092323_dynamic_search_ai_agent_timeline_view_expanded\(2\).png)

* Timeline: current‑time line freezes when workflow completes
  ![Timeline now freezes on completion (092323)](./updated_screenshot/092323_dynamic_search_ai_agent_timeline_view.png)

---

## Changelog (Excerpt)

* **2025‑09‑23** — Agent Dashboard: centered Tasks prompt; Final Output copy/collapse; Run History metrics badges; timeline freeze on completion; Linkup integration docs. See full details in [CHANGELOG](./CHANGELOG.md).
* **2025‑09‑19** — UI refactor (Home Hubs), streamlined layout/navigation, improved MiniEditorPopover, Convex file/document API updates, cleanup of legacy views, and new screenshots. See [CHANGELOG](./CHANGELOG.md).
* **2025‑09‑18** — Chat input multiline & paste‑structure; Convex agent fixes: remove write conflicts on `appendRunEvent`, await streaming event writes, fix `propose_pm_ops` schema (array items), require `kind` in streamed plan steps.
* **2025‑09‑17** — Analyze with Gemini → Quick notes; header tags (AI‑generated, colored by kind, inline rename, ghost add pill); new backend tag mutations. See [CHANGELOG](./CHANGELOG.md).

---

> **Notes**
>
> * For a production setup, replace Anonymous auth, configure environment variables, and harden agent/tool timeouts, retries, and telemetry.
> * If external calls are restricted, use the offline/stub path and seeded data to demo the full agent→trace→report flow.
