# Production Deploy And Agent Architecture Findings

Date: 2026-04-23

## Outcome

Production is live and healthy after a fresh Vercel production deployment.

- Deployment: `https://nodebench-ahop6tl3w-hshum2018-gmailcoms-projects.vercel.app`
- Status: `READY`
- Aliases:
  - `https://www.nodebenchai.com`
  - `https://nodebenchai.com`
  - `https://nodebench-ai.vercel.app`

## Production Verification

Verified on 2026-04-23:

- `https://www.nodebenchai.com` returned `200`
- Root HTML returned the latest production asset references, including:
  - `assets/index-Bp_E2P6x.js`
  - `assets/index-DiMBjALU.css`
- `https://www.nodebenchai.com/manifest.webmanifest` returned `200`
- `https://www.nodebenchai.com/api/search-health` returned `200` with:
  - `status: "ok"`
  - `toolsAvailable: 8`
  - `toolsExpected: 8`

The Vercel production build also completed the Convex push successfully:

- `Deployed Convex functions to https://agile-caribou-964.convex.cloud`
- custom domain aliasing completed to `https://www.nodebenchai.com`

## Deploy Fix

The blocking production build failure was the shared-layer import crossing back into `convex/`:

- failing import path:
  - `shared/ultraLongChatContext.ts -> ../convex/domains/research/angleRegistry`

That was corrected by keeping angle ids in a shared-safe module and preserving type compatibility from the Convex registry side.

## Competitor Architecture References

This pass focused on current official references for production agent architecture patterns that matter for NodeBench.

### 1. Claude Code / Claude Code SDK

Relevant official references:

- [Claude Code overview](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview)
- [Subagents](https://docs.anthropic.com/en/docs/claude-code/sub-agents)
- [Hooks reference](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude Code SDK overview](https://docs.anthropic.com/s/claude-code-sdk)

What matters:

- Claude Code's current production pattern is specialized subagents with:
  - separate context windows
  - per-agent tool restrictions
  - reusable project-level agent definitions
- Hooks give deterministic control around tool execution, prompt submit, session start, compaction, and subagent completion.
- The Claude Code SDK is explicitly positioned as the production harness behind Claude Code, with:
  - prompt caching and performance optimizations
  - MCP extensibility
  - permissions
  - session management
  - monitoring

Implication for NodeBench:

- The strongest Claude Code patterns to borrow are:
  - advisor plus specialist subagents
  - tool permissioning
  - deterministic hook points around tool execution and compaction
- The docs do not present an official named "advisor/executor mode" product primitive. That mapping is an architectural inference, not a quoted Anthropic product term.

### 2. OpenAI Agents SDK

Relevant official references:

- [Agents SDK overview](https://openai.github.io/openai-agents-js/)
- [Agent orchestration](https://openai.github.io/openai-agents-js/guides/multi-agent/)
- [Handoffs](https://openai.github.io/openai-agents-js/guides/handoffs/)
- [Guardrails](https://openai.github.io/openai-agents-js/guides/guardrails/)
- [Tracing](https://openai.github.io/openai-agents-js/guides/tracing/)

What matters:

- OpenAI's official split is:
  - manager-style orchestration when one agent owns the final answer
  - handoffs when a specialist should take over the turn
- Handoffs are modeled as tools.
- Guardrails are first-class at:
  - input
  - output
  - tool boundaries
- Tracing is first-class, with spans for:
  - generations
  - tool calls
  - handoffs
  - guardrails

Implication for NodeBench:

- NodeBench should keep its own runtime and artifact model, but its answer-control and run-event model should continue to converge on:
  - tool-boundary checks
  - explicit handoff visibility
  - structured traces, not prompt-only orchestration

### 3. Google ADK and Gemini Deep Research

Relevant official references:

- [ADK overview](https://google.github.io/adk-docs/)
- [Session state](https://google.github.io/adk-docs/sessions/state/)
- [Parallel agents](https://google.github.io/adk-docs/agents/workflow-agents/parallel-agents/)
- [Resume agents](https://google.github.io/adk-docs/runtime/resume/)
- [Gemini Deep Research](https://ai.google.dev/gemini-api/docs/deep-research)
- [Gemini models](https://ai.google.dev/gemini-api/docs/models)

What matters:

- Google ADK's strongest pattern is deterministic workflow agents:
  - `SequentialAgent`
  - `ParallelAgent`
  - `LoopAgent`
- It separates full event history from mutable session state.
- Resume and rewind are explicit runtime features.
- Google documents tool parallelism and workflow determinism as core runtime behaviors.
- Gemini Deep Research is a distinct async research capability, not just a normal one-shot generation call.

Implication for NodeBench:

- NodeBench's fast and slow split is most defensible when:
  - fast stays bounded and artifact-first
  - slow uses deterministic orchestration with resumable checkpoints
- Gemini Deep Research fits the slow background research lane, not the foreground state model.

### 4. LangGraph

Relevant official references:

- [Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [Durable execution](https://docs.langchain.com/oss/python/langgraph/durable-execution)
- [LangGraph v1](https://docs.langchain.com/oss/javascript/releases/langgraph-v1)

What matters:

- LangGraph's current production value is durable execution with checkpointing.
- It treats threads and checkpoints as first-class execution primitives.
- Durability modes explicitly trade off latency vs persistence guarantees.

Implication for NodeBench:

- LangGraph remains a good reference for the deep-work spine, but Convex should still remain the durable source of truth for product state.

### 5. Manus

Relevant official references:

- [Manus docs welcome](https://manus.im/docs)
- [Scheduled Tasks](https://manus.im/docs/features/scheduled-tasks)
- [Task create API](https://open.manus.im/docs/v2/task.create)
- [Task lifecycle](https://open.manus.im/docs/v2/task-lifecycle)
- [Introducing My Computer](https://manus.im/blog/manus-my-computer-desktop)
- [Manus 1.6 Max release](https://manus.im/en/blog/manus-max-release)

What matters:

- Manus's product shape is task-centric and asynchronous:
  - create task
  - poll lifecycle
  - handle waiting states
  - deliver files and results
- Manus emphasizes a full sandbox runtime with:
  - browser
  - terminal
  - filesystem
- It also exposes recurring task scheduling and increasingly explicit multi-agent / wide-research execution.

Implication for NodeBench:

- The strongest Manus pattern to borrow is not its state model.
- It is the product surface:
  - inspectable task objects
  - waiting/approval states
  - files/results surfaces
  - scheduled recurring execution

## NodeBench Positioning

The clearest architecture position after this review is:

- Convex remains the durable system of record.
- Vercel remains the delivery surface and production host.
- Provider SDKs remain worker adapters, not product architecture.
- LangGraph remains an execution reference for slow/resumable work.
- Claude Code contributes:
  - subagent patterns
  - tool restrictions
  - deterministic hook points
- OpenAI contributes:
  - guardrail boundaries
  - trace semantics
  - explicit handoff modeling
- Google contributes:
  - deterministic workflow agents
  - resumable state
  - deep research as a background lane
- Manus contributes:
  - task UX
  - waiting-state UX
  - file/result visibility

## Practical Recommendation

For NodeBench's next production-hardening slice:

1. Keep the current shared runtime kernel and answer-control pipeline as the system center.
2. Add more deterministic tool-boundary enforcement and compaction hooks in the Claude Code style.
3. Keep slow research resumable and inspectable in the ADK/LangGraph style.
4. Improve task/run UX with clearer waiting states and result objects in the Manus style.
5. Continue treating provider frameworks as replaceable worker layers beneath Convex-backed product state.
