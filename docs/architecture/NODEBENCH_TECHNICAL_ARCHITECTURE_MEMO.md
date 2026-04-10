# NodeBench Technical Architecture Memo

Status: codebase-grounded memo, April 2026

Purpose: replace the generic external architecture writeup with a repo-backed explanation of what NodeBench is today, what is partial, and what is still proposed.

Commercial frame: NodeBench turns ambiguous research work into packetized, reusable workflows that can become cheaper and more consistent over time.

This memo uses Meta HyperAgents, Meta ARE, and the software-engineering HyperAgent paper as comparison frames only. It does not claim NodeBench is identical to any of them.

## Plain-English First Page

NodeBench is already more than a chatbot UI.

NodeBench is the product. `Retention / Attrition` are the internal replay and cost-compression substrate underneath it, not separate top-level products.

Today, the repo contains a working research stack that:

1. takes an ambiguous company or finance question through the Ask surface
2. runs a typed research pipeline that classifies, searches, analyzes, and packages findings
3. renders the result as an evidence-aware packet with `Founder Truth`, `Why This Holds / Breaks`, `Next Move`, and `Ready Packet`
4. lets the user publish that packet into shared context or delegate it to downstream workers such as Claude Code or OpenClaw
5. reviews and improves system behavior through builder-facing Oracle, flywheel, benchmark, and trajectory infrastructure

What is already real:

- a typed search pipeline
- a packet-first ask surface
- a shared packet and task handoff protocol
- delegation targets and execution bridges
- builder-facing evaluation and trajectory infrastructure
- early replay and reusable workflow-template primitives

What is not fully real yet:

- one canonical workflow-asset model across every surface
- automatic replay and distillation as the default runtime path
- a production-grade `Retention / Attrition` cost-compression engine

The most accurate way to describe NodeBench today is:

> NodeBench is a research product with a working packetized runtime, a real handoff protocol, and a growing evaluation/flywheel layer. It is moving toward workflow-learning infrastructure, but that learning substrate is still only partially unified.

Source refs: [README](../../README.md), [pipelineRoute](../../server/routes/pipelineRoute.ts), [searchPipeline](../../server/pipeline/searchPipeline.ts), [ResultWorkspace](../../src/features/controlPlane/components/ResultWorkspace.tsx), [sharedContext](../../server/routes/sharedContext.ts), [Oracle Vision](../../ORACLE_VISION.md), [Oracle State](../../ORACLE_STATE.md), [AI Flywheel](./AI_FLYWHEEL.md), [Retention Bridge](../../server/routes/retentionBridge.ts)

## 1. Thesis

The external memo was directionally correct about the destination: NodeBench wants to become workflow-learning research infrastructure for ambiguous startup and finance questions.

NodeBench is the user-facing product and runtime. `Retention / Attrition` are the internal systems meant to make that runtime cheaper and more repeatable over time.

The repo shows that NodeBench is not starting from a blank slate:

- the flagship runtime already exists as a packetized Ask surface
- the pipeline is already structured and typed, not a single free-form agent prompt
- shared context and delegation are already explicit protocol concepts
- Oracle and the flywheel already provide a builder-facing evaluation layer
- replay, trajectory, and workflow-template primitives already exist in adjacent subsystems

So the right architecture story is not "NodeBench will someday become a workflow-learning system."

The right story is:

> NodeBench already has a working research runtime and multiple partial workflow-learning primitives. The next architectural task is consolidation, not invention.

Source refs: [README](../../README.md), [agentHarness](../../server/agentHarness.ts), [pipelineRoute](../../server/routes/pipelineRoute.ts), [AI Flywheel](./AI_FLYWHEEL.md), [Oracle Vision](../../ORACLE_VISION.md)

## 2. What NodeBench Is Today

NodeBench is currently best understood as a hybrid of five real subsystems.

### 2.1 Typed Research Pipeline

The current research core is a typed pipeline, not just a chat turn.

- `POST /api/pipeline/search` is the clean search entrypoint for the current packet flow.
- The route runs pre-search hooks, executes the pipeline, converts pipeline state into a `ResultPacket`-compatible payload, and then runs post-search hooks.
- The pipeline itself is explicitly staged as `classify -> search -> analyze -> package`.
- The route also performs best-effort HyperLoop evaluation and archive promotion after the packet is produced.

This is the most concrete current implementation of the external memo's "live research layer."

Source refs: [pipelineRoute](../../server/routes/pipelineRoute.ts), [searchPipeline](../../server/pipeline/searchPipeline.ts)

### 2.2 Ask / Control-Plane Packet Surface

The current flagship user runtime is the packetized Ask surface.

- `ResultWorkspace` is structured around tabs and packet rendering, not a raw transcript.
- The packet already exposes the recent ask-surface architecture directly in UI:
  - `Founder Truth`
  - `Why This Holds / Breaks`
  - `Next Move`
  - `Ready Packet`
- The UI renders supporting claims, contradictions, citations, export actions, and delegation actions from the packet.
- This means the product is already moving toward "portable packet first, transcript second."

This is not theoretical direction. It is implemented UI.

Source refs: [ResultWorkspace](../../src/features/controlPlane/components/ResultWorkspace.tsx)

### 2.3 Shared Context and Delegation Protocol

NodeBench already has a durable handoff model with peers, packets, tasks, messages, scopes, and roles.

- The shared-context protocol defines:
  - peers
  - context packets
  - task handoffs
  - messages
  - sync scopes
  - packet/resource manifests
- The shared-context router exposes runtime surfaces for:
  - snapshots
  - packet publish
  - delegation
  - event streaming
  - founder episodes and spans
- Delegation is bounded to explicit targets today:
  - `claude_code`
  - `openclaw`
- Persistence is dual-path:
  - local SQLite path in local runtime
  - Convex-backed durable path when configured

This is the clearest current implementation of workflow memory and clean handoff.

Source refs: [sharedContext](../../server/routes/sharedContext.ts), [sharedContext protocol](../../packages/mcp-local/src/sync/protocol.ts), [sharedContext store](../../packages/mcp-local/src/sync/store.ts), [founderEpisodeStore](../../packages/mcp-local/src/sync/founderEpisodeStore.ts)

### 2.4 Oracle, Flywheel, and Evaluation Infrastructure

Oracle is the builder-facing improvement layer, not the end-user search product.

- `ORACLE_VISION.md` defines Oracle v1 as an internal-builder control tower, not a consumer chatbot.
- The Oracle contract requires vision snapshots, source refs, cross-check status, and explicit remaining-risk notes.
- `AI_FLYWHEEL.md` defines a compound loop:
  - inner verification
  - outer eval
  - benchmark-backed capability checking
- `ORACLE_STATE.md` shows that trajectory, success loops, response flywheel, benchmark surfaces, and dogfood verification are already wired into the builder-facing system.

This is the strongest codebase-grounded analog to the external memo's "meta improvement layer" and "eval/environment layer."

Source refs: [Oracle Vision](../../ORACLE_VISION.md), [Oracle State](../../ORACLE_STATE.md), [AI Flywheel](./AI_FLYWHEEL.md)

### 2.5 Early Retention / Distillation Bridge

The repo contains early replay and distillation-adjacent primitives, but not yet a single mature distillation engine.

- `Retention Bridge API` exists as an explicit integration surface with:
  - register
  - sync
  - status
  - webhook
  - push-packet
- The current Retention bridge is intentionally lightweight and in-memory.
- Reusable workflow-template CRUD and replay already exist in `workflowTemplates.ts`.
- The sync protocol also already includes packet, task, receipt, and replay-oriented object kinds.
- `Attrition` appears in collaboration findings and architectural docs, but not yet as a first-class runtime subsystem with the same maturity as the core Ask pipeline.

This means the right description is "early bridge and replay primitives exist," not "full distillation engine shipped."

Source refs: [Retention Bridge](../../server/routes/retentionBridge.ts), [workflowTemplates](../../packages/mcp-local/src/profiler/workflowTemplates.ts), [sharedContext protocol](../../packages/mcp-local/src/sync/protocol.ts), [CODEV Findings](./CODEV_FINDINGS.md)

## 3. Flagship Runtime Path

The current flagship runtime path is:

1. **Ask surface receives a query**
   - User enters a company or startup question through the web Ask/control-plane surface.

2. **Pipeline route executes the typed search flow**
   - `POST /api/pipeline/search`
   - pre-search hooks
   - classify
   - search
   - analyze
   - package

3. **Pipeline state is converted into a packet**
   - `stateToResultPacket()` maps search state into:
     - answer
     - claims
     - sources
     - evidence summary
     - next actions
     - routing hints

4. **Ask surface renders the packet as a research object**
   - `Founder Truth`
   - `Why This Holds / Breaks`
   - `Next Move`
   - `Ready Packet`

5. **User can publish or delegate**
   - `POST /api/shared-context/publish` publishes the packet into shared context
   - `POST /api/shared-context/delegate` publishes the packet and proposes a downstream task

6. **Delegation bridge targets downstream workers**
   - current bounded targets are `claude_code` and `openclaw`
   - Claude Code has an explicit `ImplementationPacket` bridge contract in `server/claudeCodeBridge.ts`

7. **Evaluation and archive systems observe the run**
   - HyperLoop best-effort evaluation and promotion run from the pipeline route
   - founder episode traces, packet lineage, Oracle, flywheel, and benchmark systems provide the builder-facing review layer

This is the current production architecture narrative that an engineer should carry in their head.

Source refs: [pipelineRoute](../../server/routes/pipelineRoute.ts), [searchPipeline](../../server/pipeline/searchPipeline.ts), [ResultWorkspace](../../src/features/controlPlane/components/ResultWorkspace.tsx), [sharedContext](../../server/routes/sharedContext.ts), [Claude Code bridge](../../server/claudeCodeBridge.ts)

## 4. Relationship Hierarchy

The hierarchy below is the cleanest decision-complete way to describe the current system.

| Term | What it is | What it is not |
| --- | --- | --- |
| **NodeBench** | The umbrella product and runtime. Includes the Ask surface, packet system, MCP surfaces, delegation paths, and research workflows. | Not just Oracle. Not just the trust/control-plane story. Not just the MCP server. |
| **NodeBench Control Plane** | A major NodeBench surface and product framing for packets, receipts, delegation, and trust/control rails. | Not a separate company or separate runtime from NodeBench. |
| **Oracle** | Builder-facing control tower for evaluation, trajectory, success loops, flywheel review, and institutional-memory diagnostics. | Not the main end-user company-research product. |
| **Shared Context** | The durable protocol and storage layer for peers, packets, tasks, messages, and handoffs across web, runtime, and worker surfaces. | Not a separate product brand. Not a generic chat memory feature. |
| **Retention / Attrition** | The internal workflow capture, replay, and future cost-compression substrate NodeBench is moving toward. Current footholds exist, but the full engine is not yet unified. | Not a mature first-class runtime path in the repo today. Not the current flagship user surface. |
| **HyperLoop / Flywheel** | Internal evaluation, review, archive, and continuous-improvement mechanisms. | Not the full end-user product story. |

Source refs: [README](../../README.md), [Oracle Vision](../../ORACLE_VISION.md), [sharedContext protocol](../../packages/mcp-local/src/sync/protocol.ts), [Retention Bridge](../../server/routes/retentionBridge.ts), [AI Flywheel](./AI_FLYWHEEL.md), [Control Plane roadmap](./CONTROL_PLANE_90DAY_ROADMAP.md)

## 5. Mapping External Memo Concepts to Repo Reality

| External concept | Current NodeBench reality | Current state |
| --- | --- | --- |
| **Live research layer** | Typed pipeline plus packet generation through `pipelineRoute.ts` and `searchPipeline.ts` | **Implemented today** |
| **Meta improvement layer** | Oracle control tower, response flywheel, trajectory, success loops, dogfood, benchmark and verification systems | **Implemented today**, though spread across multiple builder-facing surfaces |
| **Eval and environment layer** | AI flywheel, GAIA capability evals, dogfood verification, Oracle benchmark surfaces | **Implemented today** |
| **Workflow asset layer** | Shared-context packets, founder episodes, task handoffs, workflow templates, trace/replay primitives | **Partially implemented** |
| **Distillation / replay layer** | Retention bridge, workflow-template replay, replay-oriented sync types, scattered replay infrastructure | **Partially implemented** |
| **Planner / Navigator / Synthesizer / Evaluator split** | Typed search pipeline plus `agentHarness.ts` structured orchestration path and Oracle/flywheel review systems | **Partially implemented** |

Important nuance:

- The repo already supports specialized roles and stages.
- What it does not yet have is one canonical workflow-asset backbone that every surface and improvement loop shares.

Source refs: [pipelineRoute](../../server/routes/pipelineRoute.ts), [searchPipeline](../../server/pipeline/searchPipeline.ts), [agentHarness](../../server/agentHarness.ts), [sharedContext](../../server/routes/sharedContext.ts), [workflowTemplates](../../packages/mcp-local/src/profiler/workflowTemplates.ts), [AI Flywheel](./AI_FLYWHEEL.md), [Oracle State](../../ORACLE_STATE.md)

## 6. Exists Now / Partial / Next Matrix

| Area | Exists now | Partial today | Proposed next |
| --- | --- | --- | --- |
| **Ask / control plane** | Packet-first Ask surface with `Founder Truth`, `Why This Holds / Breaks`, `Next Move`, `Ready Packet` | Some adjacent control-plane trust surfaces remain split across docs, investigations, and roadmap items | Keep Ask as the flagship user runtime and make packet quality the primary product loop |
| **Pipeline** | Clean `POST /api/pipeline/search`; typed `classify -> search -> analyze -> package`; hooks and HyperLoop calls | Search, evidence, and packaging are still separate code paths from some older orchestration systems | Converge on one canonical packet-producing runtime and reuse it everywhere |
| **Shared context** | Peer, packet, task, message, scope, snapshot, event, founder-episode model is real | Different persistence paths and packet producers still exist | Make shared packet lineage the default identity spine across surfaces |
| **Delegation** | Publish and delegate routes, bounded `claude_code` / `openclaw` targets, implementation-packet bridge | Not every downstream worker uses the same contract depth or review loop | Promote shared-context task handoff as the single delegation contract |
| **Eval / flywheel** | Oracle, flywheel, dogfood, trajectory, success loops, benchmark infrastructure | Evaluation data is strong but still spread across multiple artifacts and surfaces | Unify packet, eval, and trajectory into one operator-facing review loop |
| **Trust / control rails** | Strong product direction and some shipped proof surfaces in investigation/control-plane work | Action receipts, passports, and intent ledger are not yet one consolidated production plane | Continue control-plane trust surfaces as reusable NodeBench primitives, not a separate architecture story |
| **Retention / distillation** | Retention bridge, workflow templates, replay primitives, replay-aware protocol types | No single canonical distillation engine or cheap-path routing layer yet | Build one workflow-asset + replay + cost-routing substrate under NodeBench |

Source refs: [ResultWorkspace](../../src/features/controlPlane/components/ResultWorkspace.tsx), [pipelineRoute](../../server/routes/pipelineRoute.ts), [sharedContext](../../server/routes/sharedContext.ts), [Claude Code bridge](../../server/claudeCodeBridge.ts), [AI Flywheel](./AI_FLYWHEEL.md), [Control Plane roadmap](./CONTROL_PLANE_90DAY_ROADMAP.md), [Retention Bridge](../../server/routes/retentionBridge.ts), [workflowTemplates](../../packages/mcp-local/src/profiler/workflowTemplates.ts)

## 7. Current Public and Runtime Interfaces

These are the interfaces that matter to the current architecture story.

### Search and packetization

- `POST /api/pipeline/search`
  - clean search pipeline entrypoint
  - returns ResultPacket-compatible JSON
- `GET /api/pipeline/health`
  - pipeline health and component availability

Source refs: [pipelineRoute](../../server/routes/pipelineRoute.ts), [server index mounts](../../server/index.ts)

### Shared context and handoff

- `GET /api/shared-context/snapshot`
- `GET /api/shared-context/peers/:peerId/snapshot`
- `GET /api/shared-context/subscriptions/manifest`
- `GET /api/shared-context/packets/:contextId`
- `GET /api/shared-context/events`
- `POST /api/shared-context/publish`
- `POST /api/shared-context/delegate`
- `GET /api/shared-context/episodes`
- `POST /api/shared-context/episodes/start`
- `POST /api/shared-context/episodes/:episodeId/span`
- `POST /api/shared-context/episodes/:episodeId/finalize`

These are not auxiliary routes. They are the current durable protocol layer for packet portability and delegation.

Source refs: [sharedContext](../../server/routes/sharedContext.ts), [server index mounts](../../server/index.ts), [sharedContext protocol](../../packages/mcp-local/src/sync/protocol.ts)

### Sync and device/account context

- `GET /api/sync-bridge/health`
- `GET /api/sync-bridge/accounts/:userId`

These provide account/device sync visibility for the broader shared-context identity spine.

Source refs: [server index mounts](../../server/index.ts), [syncBridge](../../server/syncBridge.ts)

### Bridge surfaces

- `server/claudeCodeBridge.ts`
  - internal execution bridge for `ImplementationPacket -> ExecutionResult`
- `/retention/register`
- `/retention/sync`
- `/retention/status`
- `/retention/webhook`
- `/retention/push-packet`

These are the current bridge surfaces for downstream execution and external workflow/replay integration.

Source refs: [Claude Code bridge](../../server/claudeCodeBridge.ts), [Retention Bridge](../../server/routes/retentionBridge.ts), [server index mounts](../../server/index.ts)

## 8. Workflow-Learning Reality vs. Scaffolding

The most important architectural distinction is between real learning/replay behavior and architectural intent.

### Real today

- Search runs through a staged pipeline rather than a single opaque prompt.
- Hooks already exist around pipeline execution.
- HyperLoop evaluation and archive promotion are already called from the live pipeline route.
- Shared packets, packet publication, task proposals, and founder-episode traces are real runtime behaviors.
- Workflow templates can already be saved, listed, validated, and replayed.
- Oracle and the flywheel already evaluate outcomes, trajectory, and response quality in builder-facing surfaces.

### Partial today

- Workflow assets are spread across several data shapes:
  - result packets
  - shared-context packets
  - founder episodes
  - workflow templates
  - replay/eval artifacts
- Retention is present as a bridge, not as a fully durable distillation engine.
- Attrition is present in findings and strategy language, not as a mature first-class runtime subsystem.
- The product has replay primitives, but replay is not yet the universal default for every learning loop.
- Cost-aware routing from cheap replay path to strong frontier path is still more architectural direction than day-to-day runtime behavior.

### Implication

NodeBench already has workflow-learning ingredients. The missing work is to unify them into one canonical workflow-asset backbone rather than adding more isolated subsystems.

Source refs: [pipelineRoute](../../server/routes/pipelineRoute.ts), [sharedContext](../../server/routes/sharedContext.ts), [founderEpisodeStore](../../packages/mcp-local/src/sync/founderEpisodeStore.ts), [workflowTemplates](../../packages/mcp-local/src/profiler/workflowTemplates.ts), [Retention Bridge](../../server/routes/retentionBridge.ts), [Oracle State](../../ORACLE_STATE.md), [AI Flywheel](./AI_FLYWHEEL.md), [CODEV Findings](./CODEV_FINDINGS.md)

## 9. Proposed Next Architecture

This section is explicitly proposed future direction, not a statement of current implementation.

### 9.1 Make the shared packet the canonical workflow envelope

Unify:

- pipeline packet
- shared-context packet
- founder episode lineage
- workflow template identity
- eval / replay references

into one canonical workflow-asset model with explicit lineage and replay pointers.

### 9.2 Make replay and distillation first-class under NodeBench

Promote today's partial replay/template/bridge primitives into a consistent substrate that can:

- capture successful workflows
- benchmark them
- replay them with cheaper execution paths
- escalate only when ambiguity or failure risk is high

### 9.3 Keep Oracle builder-facing

Do not collapse Oracle into the main user product.

Oracle should remain the operator and builder surface that answers:

- what happened
- what drifted
- what cost what
- what should improve next

### 9.4 Keep Ask as the flagship runtime

For users, the main story should remain simple:

- ask
- inspect packet
- publish
- delegate
- monitor

The workflow-learning system should improve this flow without replacing it with internal jargon.

### 9.5 Treat trust/control rails as reusable primitives

Action receipts, policy, delegation scope, and packet lineage should be built as reusable NodeBench primitives that strengthen both:

- research workflows
- agent trust/control workflows

They should not require splitting the product story into disconnected brands.

Source refs: [ResultWorkspace](../../src/features/controlPlane/components/ResultWorkspace.tsx), [sharedContext protocol](../../packages/mcp-local/src/sync/protocol.ts), [AI Flywheel](./AI_FLYWHEEL.md), [Oracle Vision](../../ORACLE_VISION.md), [Control Plane roadmap](./CONTROL_PLANE_90DAY_ROADMAP.md), [Agent Trust Infrastructure](./AGENT_TRUST_INFRASTRUCTURE.md)

## 10. Do Not Claim

To keep the architecture story honest, avoid these claims:

- Do not claim NodeBench is identical to Meta HyperAgents.
- Do not claim NodeBench is identical to Meta ARE.
- Do not claim NodeBench is identical to the software-engineering HyperAgent paper.
- Do not claim the repo already has one unified distillation engine.
- Do not claim `Retention / Attrition` is already a fully shipped first-class runtime subsystem.
- Do not claim workflow learning is automatic end-to-end today.

The accurate claim is narrower and stronger:

> NodeBench already has a working packetized research runtime, a real shared-context and delegation protocol, and a real builder-facing evaluation stack. It is partway through consolidating those pieces into a true workflow-learning and cost-compression system.

Build directive: unify packets, templates, lineage, eval references, and replay into one canonical workflow asset, then route replay before frontier escalation.

Source refs: [Oracle Vision](../../ORACLE_VISION.md), [AI Flywheel](./AI_FLYWHEEL.md), [Retention Bridge](../../server/routes/retentionBridge.ts), [workflowTemplates](../../packages/mcp-local/src/profiler/workflowTemplates.ts), [CODEV Findings](./CODEV_FINDINGS.md)

## Primary Repo Evidence

These files are the main evidence base for this memo:

- [README](../../README.md)
- [ORACLE_VISION.md](../../ORACLE_VISION.md)
- [ORACLE_STATE.md](../../ORACLE_STATE.md)
- [AI_FLYWHEEL.md](./AI_FLYWHEEL.md)
- [CONTROL_PLANE_90DAY_ROADMAP.md](./CONTROL_PLANE_90DAY_ROADMAP.md)
- [AGENT_TRUST_INFRASTRUCTURE.md](./AGENT_TRUST_INFRASTRUCTURE.md)
- [server/routes/pipelineRoute.ts](../../server/routes/pipelineRoute.ts)
- [server/pipeline/searchPipeline.ts](../../server/pipeline/searchPipeline.ts)
- [server/routes/sharedContext.ts](../../server/routes/sharedContext.ts)
- [server/claudeCodeBridge.ts](../../server/claudeCodeBridge.ts)
- [server/routes/retentionBridge.ts](../../server/routes/retentionBridge.ts)
- [server/agentHarness.ts](../../server/agentHarness.ts)
- [packages/mcp-local/src/sync/protocol.ts](../../packages/mcp-local/src/sync/protocol.ts)
- [packages/mcp-local/src/sync/store.ts](../../packages/mcp-local/src/sync/store.ts)
- [packages/mcp-local/src/sync/founderEpisodeStore.ts](../../packages/mcp-local/src/sync/founderEpisodeStore.ts)
- [packages/mcp-local/src/profiler/workflowTemplates.ts](../../packages/mcp-local/src/profiler/workflowTemplates.ts)
- [src/features/controlPlane/components/ResultWorkspace.tsx](../../src/features/controlPlane/components/ResultWorkspace.tsx)
