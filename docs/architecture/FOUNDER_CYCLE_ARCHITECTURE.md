# NodeBench Founder Cycle Architecture

Canonical reference for the full founder cycle, research pipeline, minimal UI,
and Paperclip runtime integration. Everything connects through one primitive:
the **Artifact Packet**.

---

## The Core Loop

```
search / upload / ask
  -> entity + company truth
  -> change / contradiction / adjacency
  -> ranked next steps
  -> Artifact Packet
  -> memo / brief / deck / delegation packet
  -> agent handoff / implementation
  -> action / path / before-after tracking
  -> daily / weekly / monthly / quarterly rollups
  -> ambient monitoring + refreshed packets
```

**Principle: minimal UI pages, maximal continuity underneath.**

---

## 7 Stages of the Founder Cycle

### Stage 1: Intake / Orientation
The founder arrives with one of:
- A company they want to understand
- Their own company / product / idea
- Adjacent companies / competitors / people / frameworks
- Messy notes, docs, links, screenshots, Slack, codebase, or agent outputs

**UI action:** type / paste / upload. That's it.

The "Tuesday afternoon" interaction: after a meeting, conference, request
from a senior person, or random thought — just search or upload.

### Stage 2: Canonical Truth
NodeBench figures out:
- What entity / company / product this is
- Whether it's my own entity or an external one
- What changed
- What is contradictory
- What adjacent entities matter
- What role/lens to shape the answer for

For founders specifically — the **weekly reset**:
1. What company are we actually building
2. What changed
3. Biggest contradiction
4. Next 3 moves

### Stage 3: Packetization
Everything resolves into an **Artifact Packet**.

The packet is the reusable truth layer between messy context and
the actual thing people need to send upward or hand off.

**Packet contents:**
- Audience
- Objective
- Canonical company/entity truth
- What changed
- Contradictions / risks
- Key evidence
- Recommended framing
- Next actions
- Agent instructions
- Source/provenance

### Stage 4: Human Artifact Output
Every serious workflow ends in a presentable artifact:
- Memo / doc
- Spreadsheet
- Slide deck / HTML brief
- Delegation packet
- Decision memo
- Competitor intelligence brief
- Banker / CEO brief

**NodeBench is not just memory or search. It is the restructuring
layer between context and presentation.**

### Stage 5: Delegation / Orchestration
Only AFTER NodeBench earns trust by clarifying what the company is,
what changed, and what matters — then it helps delegate to:
- Claude Code
- OpenClaw
- Gemini / Codex / other providers
- Contractors
- Internal agents (via Paperclip)

**Product hierarchy:**
```
understand first
  -> packetize second
  -> delegate third
  -> orchestrate fourth
```

### Stage 6: Tracking / Continuity
After delegation or action, NodeBench tracks:
- Actions taken
- Paths explored
- Before state / after state
- Packet versions
- Memo versions
- Exports
- Agent handoffs
- Important changes
- Trajectory over time

This turns the product from one-off answers into **compounding operating memory**.

### Stage 7: Ambient Monitoring
Instead of the user re-asking every day, NodeBench already knows:

```
Since your last session:
- 3 strategy shifts
- 2 competitor signals
- 1 contradiction got stronger
- 4 build items were decided
- 1 packet is ready for export or delegation
```

---

## Research Pipeline

Not a separate product. Feeds the same packet system.

```
public web / articles / research / GitHub / company sites / competitor updates
+ private notes / uploads / Slack / codebase / agent findings
  -> canonical entities
  -> claim graph / variable extraction / contradictions / risks
  -> role-shaped synthesis
  -> packet / memo / brief / recommendation
```

Works for both external entities AND your own company with private context.

---

## Minimal UI (4+3 pages)

### Public / Broad-Market (4 pages)

| # | Surface | Purpose |
|---|---------|---------|
| 1 | **Search / Upload** | Front door. Type, paste, upload, ask. |
| 2 | **Result Workspace** | Entity truth, signals, risks, comparables, next actions, packet CTA |
| 3 | **Packet / Export** | Review, export (memo/sheet/deck/HTML), delegation, version compare |
| 4 | **History / Delta** | Prior state compare, important changes, packet/memo history |

### Founder / Power (3 additional)

| # | Surface | Purpose |
|---|---------|---------|
| 5 | **Dashboard** | Company truth, what changed, contradiction, next 3 moves |
| 6 | **Coordination** | Peer presence, task delegation, agent command, approval queue |
| 7 | **Entities** | Nearby companies, comparables, watchlist |

**Total: 7 pages. Not 80.**

---

## Layer Architecture

```
L1. NodeBench AI App
    search / upload / ask
    result workspace
    role-shaped packets and artifacts

L2. NodeBench Shared Context / Memory
    canonical entities
    packet lineage
    action/path/state memory
    contradictions
    important changes
    trajectory

L3. Paperclip Runtime (or direct dispatch)
    org chart
    tickets
    heartbeats
    budgets
    governance
    traces
    agent execution

L4. Workers
    Claude Code
    OpenClaw
    Codex / Cursor
    HTTP tools
    Bash tools
```

**L4 is downstream of L1 and L2. It is not the opening identity.**

---

## Paperclip Integration

### NodeBench decides WHAT. Paperclip decides HOW.

NodeBench creates:
- Canonical packet
- Recommended owner / role
- Budget suggestion
- Approval requirement
- Success condition
- Review artifact

Paperclip runs that packet as a ticket.

### Execution Role Packet

```typescript
interface ExecutionRolePacket {
  roleId: string;
  roleName: string;            // "Research Analyst", "CTO Builder", "Operator Reviewer"
  workType: string;            // "research", "implementation", "review"
  recommendedPreset: string;   // nodebench-mcp preset (researcher, founder, web_dev, etc.)
  toolDomains: string[];       // specific MCP domains to load
  packetContext: ArtifactPacket;
  outputType: string;          // "memo", "diff", "brief", "evidence_table"
  budgetPolicy: { monthlyUsd: number; approvalRequired: boolean };
  escalationRules: string[];
  successCriteria: string[];
}
```

### 3 Initial Execution Roles

| Role | Preset | Tools | Output |
|------|--------|-------|--------|
| Research Analyst | `researcher` | recon, web, learning, entity_enrichment | Brief + evidence table |
| Builder / Implementer | `founder` | founder, causal_memory, local_dashboard, web_dev | Implementation diff + validation memo |
| Operator / Reviewer | `default` | founder_tracking, causal_memory, dogfood_judge | Change review + contradiction escalation |

### Data Flow

```
NodeBench -> Paperclip:
  ExecutionRolePacket + ArtifactPacket + tool domain list

Paperclip -> NodeBench:
  ticket status + trace summary + artifacts + before/after state
```

---

## 3 Must-Win Proof Loops

1. **Weekly founder reset** — what changed, biggest contradiction, next 3 moves
2. **Pre-delegation agent briefing** — packet + tool assignment + handoff
3. **Blank-state company search** — non-technical user types a company, gets useful result

If these feel excellent, the rest of the surface area becomes an asset.
If these feel weak, everything else becomes noise.

---

## Core Invariant

> Every serious workflow ends in a presentable artifact.

That is why the founder cycle, research pipeline, delegation loop,
and ambient monitoring all connect through the same thing:

**NodeBench turns evolving context into reusable, decision-ready
packets and artifacts.**

---

## Current State vs Target

| Component | Built | Wired | Target |
|-----------|-------|-------|--------|
| Search / Upload canvas | Yes | Yes (Gemini + Linkup on prod) | Working |
| Entity extraction | Yes | Yes | Working |
| Result workspace | Yes | Partial (complex multi-panel) | Simplify to single clean view |
| Artifact Packet generation | Yes | Yes (7 packet types) | Working |
| Packet export (memo/md/html) | Yes | Yes | Working |
| Shareable memo (/memo/:id) | Yes | Yes | Working |
| Delegation (/delegate endpoint) | Yes | Yes | Working |
| Coordination Hub | Yes | Yes (SSE + Convex) | Working |
| History / packet lineage | Yes | Yes (Convex tables) | Needs UI simplification |
| Ambient monitoring (session delta) | Yes | Partial | Needs live data |
| Paperclip integration | No | No | Spec ready |
| Execution Role assignment | No | No | Spec ready |
| Weekly founder reset (live) | Yes | Partial (fixture data) | Needs real data pipeline |
