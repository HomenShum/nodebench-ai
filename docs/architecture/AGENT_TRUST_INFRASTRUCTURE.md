# NodeBench: Agent Trust Infrastructure

**Product framing:** `NodeBench Control Plane` is the platform. `NodeBench Receipts` is the concrete object users inspect. `DeepTrace by NodeBench` is the optional hero/demo wrapper for investigation and replay surfaces.

## Category

NodeBench is **agent trust infrastructure** â€” the control plane that makes personal and enterprise agents trustworthy enough to touch money, work, school, and family.

**One-liner:** When everyone has a personal agent, NodeBench is the layer that makes those agents trustworthy enough to matter.

**Shorter:** Don't build the butler. Build the badge, wallet, memory, and receipts behind every butler.

## Why Now

Personal and enterprise agents are gaining action surfaces faster than trust surfaces.

- **MCP is real.** Tool-calling agents can now reach files, APIs, databases, and external services through a standardized protocol. The integration surface exists.
- **Agent shells are shipping.** OpenClaw, custom GPTs, Claude agents, and enterprise copilots are giving users action-taking agents. The shell layer is commoditizing.
- **Trust is the bottleneck.** Broad permissions, weak auditability, and unsafe extension surfaces are the failure mode already visible in the ecosystem. Microsoft explicitly frames agents as needing human-like safeguards.
- **No one owns the trust layer.** Platform players will build walled-garden versions. The open, portable, interoperable trust layer does not exist yet.

The gap: agents can act, but nobody can prove what they did, why, under what authority, or how to undo it.

## The Four Primitives

### 1. Agent Passport

A persistent identity for the user's agent with scoped authority.

- What it can read, spend, sign, reveal, and execute
- Fine-grained, revocable delegation
- Device and app bindings
- Trust tier (sandbox / supervised / autonomous)

### 2. Intent Ledger

A structured store of what the user wants, tolerates, values, and forbids.

- Not chat memory. Decision policy.
- Spend thresholds, content boundaries, escalation rules
- Portable across models, devices, and agent shells
- Versioned â€” what the policy was at any point in time

### 3. Action Receipt

A tamper-evident record of what the agent saw, decided, and did.

- Content-addressed evidence (SHA-256 hashes prove artifact integrity)
- Policy reference â€” which rule allowed this action
- Reversibility â€” can this be undone, and how
- Violation flags â€” did this action trigger a policy warning

### 4. Delegation Graph

Authority flows downward in narrow scopes when agents spawn subagents.

- Parent agent delegates specific capabilities to child agents
- Scope narrows at each delegation level â€” no unlimited daisy-chaining
- Trust decays over time without reconfirmation
- Visual graph of who acted under whose authority

## Proof Surfaces (shipped or in progress)

### Proof #0: OpenClaw Receipts + Approval Queue (shipped)

The first Convex-backed OpenClaw slice now lives on the existing `actionReceipts` substrate instead of a parallel trust system:

- OpenClaw executions can emit receipts with `sessionKey`, `channelId`, `direction`, and OpenClaw session/execution linkage
- Escalated actions now carry explicit `approvalState`
- The receipts UI shows receipt-backed pending approvals instead of only the generic human-request queue
- Approve or deny updates the receipt itself, preserving one operator-visible source of truth

This is the minimal product loop we want from Convex + OpenClaw:

`action -> receipt -> approval -> investigation`

### Proof #1: Investigation View = Action Receipt

The Enterprise Investigation demo (FTX golden dataset) demonstrates what a high-stakes Action Receipt looks like:

- 4 observed facts with per-fact confidence and provenance badges
- 2 competing hypotheses scored against evidence
- 6 adversarial review challenges with deterministic confidence adjustment
- 7 evidence catalog entries with content hashes and capture methods
- Traceability footer with trace ID, tool call count, OTel span status
- Limitations section â€” explicit system honesty about what it cannot know

This is not "an investigation product." It is what the control plane produces when a research agent runs.

### Proof #2: Scoped Tool Delegation (next)

The existing toolset gating system (10 presets, 45 domain keys, security sandbox) exposed as a user-facing permission surface:

> "This agent can read Gmail metadata, search the web, and draft â€” but cannot send, pay, execute shell, or export files."

### Proof #3: Action Receipt Feed (after)

A chronological feed of agent actions with policy references, evidence links, warning flags, and undo buttons.

## Mapping from Current Assets

| Primitive | Existing NodeBench Asset | Gap |
|-----------|-------------------------|-----|
| Agent Passport | `security/config.ts` (3 modes), `pathSandbox`, `commandSandbox`, `urlValidator`, toolset gating (10 presets) | Persistent identity, revocation API, device bindings |
| Intent Ledger | `sessionMemoryTools.ts` (3 tools), SQLite persistence, `~/.nodebench/notes/` | Structured policy schema, thresholds, escalation rules, versioning |
| Action Receipt | `replay-store.ts`, `traceability` object, `evidence_catalog` with content hashes, adversarial review engine | Receipt feed UI, rollback hooks, policy-violation flagging |
| Delegation Graph | Swarm orchestration (TeammateTool, Task system), preset-based tool routing | Scope narrowing on delegation, visual graph, trust decay |

## Non-Goals

- Not another agent shell or chat UI
- Not a generic personal assistant
- Not autonomous execution without scope and review
- Not dependent on one frontier model
- Not "social network for agents" as core business

## The Wedge

**For developers:** OpenClaw is the shell. NodeBench is the badge, ledger, and receipts behind it.

**For enterprise:** Bring-your-own-agent needs a control plane.

**For families:** A parent scoping a kid's agent and a CISO scoping an employee's agent are the same problem in different clothes.

## The Key Sentence

NodeBench provides tamper-evident provenance for captured artifacts and evidence-grounded hypotheses about what happened; it does not provide cryptographic proof of causation.

**Integrity of evidence, not proof of truth.**

Every hash proves "this artifact has not changed since capture." It does NOT prove the artifact's claims are true. Causation is argued from evidence, tested against alternatives, and scored with uncertainty.
