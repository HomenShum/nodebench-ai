Agents Module

Overview
- Goal: Extract and reorganize all AI agent-related logic into a clean, modular folder with bounded control flows that are easy to reason about, debug, and demo.
- This folder is standalone and framework-agnostic (no Convex or UI dependencies). Convex functions can optionally wrap these modules.

Folder Structure
/agents
  /app
    cli.ts                    # Main entry to run demo scenarios
    /demo_scenarios
      task_spec_1.json        # Research plan sample
      task_spec_2.json        # Document summarization/edit sample
      seed_notes.md           # Local notes corpus
      sample_page.html        # Local HTML page for demo
  /core
    plan.ts                   # Planner: takes a task spec + state → Plan
    execute.ts                # Executor: runs steps via tools registry
    memory.ts                 # In-memory KV + doc store
    trace.ts                  # JSONL structured logger
    eval.ts                   # Lightweight validations
  /tools
    search.ts                 # Local search tool (stub)
    fetchUrl.ts               # Local file/http fetcher (stub)

Quick Start (60 seconds)
1) Ensure Node.js >= 18 (for global fetch and fs/promises).
2) Copy your scenario to /agents/app/demo_scenarios or use the provided ones.
3) Run with ts-node or tsx (install one if you don’t have it):
   - npm i -D tsx  (or)  npm i -D ts-node
   - npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_1.json
   - npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_2.json


OpenAI integration
- Set environment variables before running the CLI:
  - OPENAI_API_KEY=<your key>
  - Optional: OPENAI_BASE_URL=<custom endpoint, will normalize to /v1>
  - Optional: OPENAI_MODEL (defaults to gpt-5-nano)
- The CLI now registers tools:
OpenRouter + Grok 4 fast
- To use OpenRouter end-to-end (including Grok 4 fast):
  - Set OPENROUTER_API_KEY=<your key>
  - Optional: OPENAI_BASE_URL=https://openrouter.ai/api/v1 (auto-assumed if OPENROUTER_API_KEY is present)
  - Optional: OPENROUTER_SITE_URL and OPENROUTER_SITE_NAME for ranking headers
  - Optional: OPENAI_MODEL=x-ai/grok-4-fast:free (auto-defaults to this when OPENROUTER_API_KEY is present)
- The answer, summarize, and structured tools will route via OpenRouter when configured. Multimodal (image_url) is supported in answer via args.imageUrl/imageUrls.

  - answer — LLM answer generation using optional contextual data
  - summarize — LLM summarization of a provided text or the active document

Optional Convex data provider (NodeBench AI schema)
- To enable live data retrieval/mutation from your Convex backend set:
  - AGENTS_DATA=convex
  - CONVEX_URL=<your convex deployment URL>
  - Optional auth: CONVEX_AUTH_TOKEN or AGENTS_CONVEX_TOKEN
- Multimodal Grok fast scenario: npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_multimodal_grok.json

- Structured from caption scenario: npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_structured_from_caption.json

- When enabled, tools will use Convex-backed queries:
  - Documents search and retrieval (documents:getSearch, documents:getById)
- Multi‑agent scaffold scenario: npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_multi_agent_scaffold.json

- Graph orchestrate scenario: npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_orchestrate_graph.json
- Logs scratchpad: see agents/app/log/scratchpad.md for inter-agent channel notes

Server-side (Convex) orchestration
- Action: convex/agents/orchestrate.ts (api.agents.orchestrate.run)
- Example (client): await convex.mutation(api.agents.orchestrate.run, { documentId, name: "Orchestration", taskSpec })

  - Agenda aggregation (calendar:listAgendaInRange)
  - Agent timeline by document (agentTimelines:getByDocumentId)
- Additional tool: structured — produce JSON matching a provided JSON Schema (agents/tools/structured.ts)


Examples
- Research scenario: npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_1.json
- Summarize scenario: npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_2.json

What this CLI does
- Loads a TaskSpec (JSON) that clearly defines inputs and expected outputs.
- Uses /core/plan.ts to construct a bounded Plan (groups of Steps with explicit args).
- Uses /core/execute.ts to execute each Step via named tools registered from /tools.
- Records a JSONL trace at stdout; also prints a concise summary at the end.
- Persists intermediate artifacts in memory (process-lifetime only, by design).

Design principles
- Bounded control flow: Explicit Plan and Step types; no hidden recursion.
- Separation of concerns:
  - plan.ts — no IO; pure decision logic.
  - execute.ts — orchestration and side-effects via tools.
  - tools/* — leaf effects; easy to stub/mock.
  - memory.ts — explicit ephemeral state boundary.
  - trace.ts — structured logs for easy replay/diagnostics.
- Extendable: Add tools in /agents/tools and register them in cli.ts.

Mapping from existing code
- convex/aiAgents.ts → planning/execution/tool catalog concepts are mirrored here with a minimal interface.
- convex/agents/lib/* → concepts like planning schemas, tool execution, and context gathering are represented by plan.ts/execute.ts/tools/* in a framework-agnostic way.
- No Convex calls here; server code can import plan.ts/execute.ts if desired and supply Convex-aware tools.

TaskSpec format (minimal)
{
  "goal": "string: what to accomplish",
  "type": "research|summarize|edit|custom",
  "input": { ... },
  "constraints": { "maxSteps": 5 },
  "planHints": ["optional hints"]
}

Outputs
- CLI prints a final object: { success, result, artifacts, logsCount }
- Tools can attach artifacts into memory.docs (e.g., summaries or extracted content)

Notes
- Demo tools are intentionally simple and deterministic.
- For real integrations, replace /tools implementations with production ones.
- Keep this directory in sync with DESIGN_SPECS.md and FOLDER_STRUCTURES.md.

