# Agents Log Scratchpad

This scratchpad records outcomes and design notes as we enabled inter‑agent messaging/memory channels, an explicit task schema (agent graph), and strict structured outputs.

## Inter‑agent messaging/memory channels
- Mechanism: orchestrator creates per‑node memories and a shared `channels` bus.
- Data flow:
  - Each node’s result is appended to `channels[nodeId]`.
  - Prompt templates in downstream nodes can reference upstream outputs via `{{channel:<nodeId>.last}}`.
  - Example: `outline` node receives `research.last` and `kb.last`.
- Collaboration pattern used: research → kb → outline → edit.

Excerpt of a real run (truncated):
- research.last: "Top 2024–2025 multi‑agent benchmarks ..."
- kb.last: "Definitions: Orchestrator, Leaf agent, Tool use, Memory channels, ..."
- outline.last: "I. Concepts ... II. Architectures ... III. Tooling ..."
- edit.last: "Improved Outline: Multi‑Agent Systems in Production (2025) ..."

## Explicit Task Schema (Agent Graph)
- Schema file: agents/app/demo_scenarios/task_spec_orchestrate_graph.json
- Orchestrator reads `graph.nodes` and `graph.edges`, executes nodes (sequentially), and wires prompts with channel substitutions.
- Node kinds supported: `search`, `answer`, `summarize`, `structured`, `custom`.

## Strict structured outputs (tool‑mode with fallback)
- Tool: agents/tools/structured.ts
- Uses OpenAI/OpenRouter tool‑calling (strict parameters) first; if no tool_calls, falls back to `response_format: json_object`.
- Ensures strong key adherence when supported by the model.

## Server‑side orchestration (Convex actions)
- Action (to add): convex/agents/orchestrate.ts
- Plan: run orchestrator in a Convex action, then write tasks/links to agentTimelines via `applyPlan` or `importSnapshot`.
- Authentication: uses `getAuthUserId` to ensure authorized runs.

## Next ideas
- Topological scheduling with parallel groups based on `edges`.
- Message schemas per channel (type‑safe bus).
- Streaming traces to UI with step‑level timing.

