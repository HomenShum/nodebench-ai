# Orchestrator-Workers Pattern

Use this rule when any task involves an agent producing multi-faceted output
across heterogeneous sources (diligence blocks, code changes spanning areas,
multi-domain research).

## Mandate

**One orchestrator + N sub-agents with fresh context + one shared scratchpad.**
Never do multi-faceted work in one monolithic agent call.

## Prior art

- Anthropic — "Building Effective Agents" (2024), canonical orchestrator-workers pattern
- Anthropic Claude Code — `Task` tool with `subagent_type` + fresh context per spawn
- Manus AI — virtual workspace with sub-agents writing to shared files
- Cognition Devin — per-task worker sessions spawned from a main planner
- LangGraph / CrewAI / AutoGen — OSS frameworks with the same shape

## Protocol

1. **Orchestrator holds state.** The shared scratchpad is the only source of truth the orchestrator mutates directly.
2. **Each sub-agent gets a scoped task.** Fresh context window. Tool allowlist enumerated per sub-agent role.
3. **Sub-agent writes only to its own scratchpad section.** Read-only across sections.
4. **Orchestrator fans out in parallel when sub-agents are independent.** Serial only when B depends on A's output.
5. **Budget envelope per sub-agent.** Wall-clock, output tokens, and tool-call count — all three capped.
6. **Every sub-agent spawn emits a trace event.** Hierarchy: orchestrator → sub-agent → tool call.
7. **Orchestrator runs self-review after fan-out.** Before structuring pass.

## Tool allowlist convention

```typescript
type SubAgentConfig<T> = {
  role: string;                    // "founder" | "product" | "news" | ...
  tools: ToolAllowlist;            // fetch · search · extract · verify · write(scratchpadSection)
  budget: { wallMs: number; outTokens: number; toolCalls: number };
  scratchpadSection: string;       // where this sub-agent writes
  // Fresh context — never reuse parent's context
};
```

## What this rule enforces

- A sub-agent cannot write outside its declared `scratchpadSection`.
- A sub-agent cannot call tools outside its `tools` allowlist.
- A sub-agent that exceeds `budget` gets force-terminated with its partial output preserved.
- A sub-agent never silently fails — failure → bounded output + failure marker in scratchpad.

## Anti-patterns

- One giant prompt with "do all of this" in a single agent call
- Sub-agents writing to each other's scratchpad sections (cross-contamination)
- Skipping the budget envelope ("it'll probably finish")
- Orchestrator using sub-agent's in-context state instead of the scratchpad

## Related

- [scratchpad_first.md](scratchpad_first.md) — how the shared state is organized
- [layered_memory.md](layered_memory.md) — scratchpads plus MEMORY.md plus topic files
- [agentic_reliability.md](agentic_reliability.md) — BOUND, TIMEOUT, and HONEST_STATUS apply per sub-agent
- [reference_attribution.md](reference_attribution.md) — cite prior art in module headers

## Canonical reference

`docs/architecture/AGENT_PIPELINE.md`
