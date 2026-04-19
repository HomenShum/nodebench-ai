# NodeBench Control Plane — 90-Day Execution Brief

**Thesis:** The next platform war is not model vs. model. It is agent trust infrastructure. Whoever owns the rails for delegation, memory portability, receipts, and policy enforcement becomes the operating system for personal agents.

**Sequence logic:** Visibility first (receipts), then control (permissions), then personalization (intent), then scale (delegation). Each quarter ships one primitive.

**Branding:** Platform name = `NodeBench Control Plane`. Core product object = `NodeBench Receipts`. Optional flagship demo wrapper = `DeepTrace by NodeBench`.

---

## Days 0–30: Action Receipts (Proof Surface #1)

**Goal:** Make the Investigation View the canonical example of what an Action Receipt looks like for a high-stakes agent task.

### Already shipped

- [x] `EnterpriseInvestigationResult` V2 interface with observed_facts / hypotheses / counter_analysis / evidence_catalog / traceability / limitations
- [x] FTX golden dataset with 7 evidence entries, 4 observed facts, 2 hypotheses, 6 adversarial challenges
- [x] Adversarial review engine — 6 deterministic rules, explicit confidence formula
- [x] ProvenanceBadge component — 3-tier evidence provenance
- [x] Evidence catalog grouped by provenance tier
- [x] "Integrity ≠ Truth" disclaimer chip
- [x] View registered at `/investigation`

### Days 1–10: Receipt schema formalization

| Task | File | Est. |
|------|------|------|
| Define `ActionReceipt` TypeScript interface | `src/features/controlPlane/types/actionReceipt.ts` | ~60 lines |
| Fields: receiptId, agentId, timestamp, action (tool name + params), policyRef (which rule allowed it), evidenceRefs, result, reversible (boolean + undo instructions), violations[] | — | — |
| Adapter: `investigationToReceipt()` — maps existing investigation traceability to ActionReceipt shape | `src/features/controlPlane/adapters/investigationAdapter.ts` | ~40 lines |
| Adapter: `toolCallToReceipt()` — maps MCP tool dispatch to ActionReceipt shape | `src/features/controlPlane/adapters/toolCallAdapter.ts` | ~50 lines |

### Days 10–20: Receipt feed UI

| Task | File | Est. |
|------|------|------|
| `ActionReceiptFeed` — chronological feed of agent actions | `src/features/controlPlane/views/ActionReceiptFeed.tsx` | ~200 lines |
| Each receipt card shows: action, policy reference, evidence count, violation badges, undo button | — | — |
| Filter by: agent, time range, violation status, reversibility | — | — |
| Register at `/receipts` in viewRegistry | `src/lib/registry/viewRegistry.ts` | ~8 lines |

### Days 20–30: Receipt API endpoint

| Task | File | Est. |
|------|------|------|
| `POST /v1/receipts` — store action receipt | `apps/api-headless/src/routes/receipts.ts` | ~80 lines |
| `GET /v1/receipts?agentId=&since=&limit=` — query receipts | — | — |
| Content-hash each receipt for tamper evidence | — | — |
| Wire into existing tool dispatch in MCP server | `packages/mcp-local/src/index.ts` | ~30 lines modified |

### Day 30 checkpoint

- [ ] Navigate to `/receipts` — feed renders with sample data
- [ ] Investigation view links to its receipt
- [ ] Receipt API stores and retrieves with content hashes
- [ ] Build clean, tsc 0 errors

---

## Days 30–60: Scoped Tool Delegation (Proof Surface #2)

**Goal:** User-facing permission UI that makes agent scope visually obvious.

### Days 30–40: Permission schema

| Task | File | Est. |
|------|------|------|
| Define `AgentPassport` interface | `src/features/controlPlane/types/agentPassport.ts` | ~50 lines |
| Fields: agentId, userId, displayName, trustTier (sandbox / supervised / autonomous), allowedTools[], deniedTools[], spendLimit, dataScope, createdAt, revokedAt | — | — |
| Define `PermissionPolicy` interface | `src/features/controlPlane/types/permissionPolicy.ts` | ~40 lines |
| Fields: policyId, name, description, rules[] (each: toolPattern, action: allow/deny/escalate, condition?) | — | — |
| Map existing toolset presets to PermissionPolicy shapes | `src/features/controlPlane/adapters/presetAdapter.ts` | ~60 lines |

### Days 40–50: Permission UI

| Task | File | Est. |
|------|------|------|
| `ScopedPermissionView` — visual permission editor | `src/features/controlPlane/views/ScopedPermissionView.tsx` | ~250 lines |
| Tool grid: each tool shows allow/deny/escalate toggle | — | — |
| Preset selector: maps to existing toolset presets (default, web_dev, research, etc.) | — | — |
| Visual diff: "what changes if I switch from research to web_dev preset?" | — | — |
| Register at `/permissions` in viewRegistry | `src/lib/registry/viewRegistry.ts` | ~8 lines |

### Days 50–60: Passport enforcement

| Task | File | Est. |
|------|------|------|
| `enforcePassport()` middleware — checks tool call against active passport | `packages/mcp-local/src/security/passportEnforcement.ts` | ~80 lines |
| Wire into tool dispatch: denied tools return structured error, escalated tools pause for approval | `packages/mcp-local/src/index.ts` | ~20 lines modified |
| Passport violations generate Action Receipts with violation flags | — | — |

### Day 60 checkpoint

- [ ] Navigate to `/permissions` — permission grid renders with preset mapping
- [ ] Switching presets shows visual diff of tool access changes
- [ ] Denied tool calls produce violation receipts
- [ ] Escalated tool calls pause for approval
- [ ] Build clean, tsc 0 errors

---

## Days 60–90: Intent Ledger (Foundation for Q2)

**Goal:** Structured user policy that survives across sessions, models, and agent shells.

### Days 60–70: Ledger schema

| Task | File | Est. |
|------|------|------|
| Define `IntentLedger` interface | `src/features/controlPlane/types/intentLedger.ts` | ~70 lines |
| Fields: userId, entries[] (each: category, rule, threshold?, escalation?, createdAt, expiresAt?) | — | — |
| Categories: spending, communication, data_access, content_boundaries, scheduling, delegation | — | — |
| Versioning: each ledger change creates immutable snapshot with content hash | — | — |
| SQLite storage: `~/.nodebench/intent_ledger.db` | `packages/mcp-local/src/security/intentLedgerStore.ts` | ~100 lines |

### Days 70–80: Ledger UI

| Task | File | Est. |
|------|------|------|
| `IntentLedgerView` — policy editor with category tabs | `src/features/controlPlane/views/IntentLedgerView.tsx` | ~200 lines |
| Each rule shows: natural language description, structured constraint, active/paused toggle | — | — |
| Version history: "what was my policy on March 1?" | — | — |
| Register at `/intent` in viewRegistry | `src/lib/registry/viewRegistry.ts` | ~8 lines |

### Days 80–90: Ledger enforcement integration

| Task | File | Est. |
|------|------|------|
| `checkIntent()` — evaluates tool call against active ledger rules | `packages/mcp-local/src/security/intentCheck.ts` | ~60 lines |
| Wire into passport enforcement: passport checks scope, intent checks policy | — | — |
| Violations produce receipts with intent rule reference | — | — |
| Export: `GET /v1/intent/export` — portable JSON of user's intent ledger | `apps/api-headless/src/routes/intent.ts` | ~40 lines |

### Day 90 checkpoint

- [ ] Navigate to `/intent` — policy editor renders with category tabs
- [ ] Adding a spending rule blocks tool calls exceeding threshold
- [ ] Ledger changes produce versioned snapshots with content hashes
- [ ] Intent ledger exportable as portable JSON
- [ ] Build clean, tsc 0 errors

---

## File Structure

```
src/features/controlPlane/
  types/
    actionReceipt.ts          # Action Receipt schema
    agentPassport.ts          # Agent Passport schema
    permissionPolicy.ts       # Permission Policy schema
    intentLedger.ts           # Intent Ledger schema
  adapters/
    investigationAdapter.ts   # Investigation → Receipt
    toolCallAdapter.ts        # Tool call → Receipt
    presetAdapter.ts          # Toolset preset → Permission Policy
  views/
    ActionReceiptFeed.tsx     # Receipt feed UI
    ScopedPermissionView.tsx  # Permission editor UI
    IntentLedgerView.tsx      # Intent policy editor UI

packages/mcp-local/src/security/
    passportEnforcement.ts    # Passport enforcement middleware
    intentLedgerStore.ts      # SQLite intent storage
    intentCheck.ts            # Intent rule evaluation

apps/api-headless/src/routes/
    receipts.ts               # Receipt API
    intent.ts                 # Intent export API
```

---

## Quarterly Cadence (beyond 90 days)

| Quarter | Primitive | Key Deliverable |
|---------|-----------|-----------------|
| Q1 (days 0–90) | Action Receipts + Passport + Intent Ledger | Three proof surfaces shipped |
| Q2 | Delegation Graph | Visual graph of agent-to-subagent authority flow, scope narrowing, trust decay |
| Q3 | Multi-agent coordination | Cross-agent memory sharing under policy, negotiation receipts, agent-to-agent trust |
| Q4 | Policy templates + enterprise crossover | Child-safe, financial-scoped, enterprise-compliant preset policies |

---

## Success Metrics

| Metric | Target (90 days) |
|--------|-----------------|
| Receipt feed renders with live data | Yes |
| Permission UI shows tool scope diffs | Yes |
| Intent ledger stores versioned snapshots | Yes |
| All three views registered and navigable | Yes |
| Zero new security sandbox bypasses | Yes |
| Build clean (tsc 0, vite clean) at every checkpoint | Yes |

---

## The Pitch (use this externally)

**For developers:**
> NodeBench is the trust layer for agents. Plug in identity, permissions, receipts, and policy through MCP. Your agent gets scoped authority, tamper-evident action logs, and human approval gates — without building trust infrastructure from scratch.

**For enterprise:**
> When employees bring their own agents to work, NodeBench is how the CISO knows what those agents can access, what they did, and how to revoke authority.

**For families:**
> When your kid has an AI agent, NodeBench is how you set boundaries — what it can research, who it can message, what it can spend — with a clear record of everything it did.

**The one line:**
> When agents touch money, work, school, or family, NodeBench is how you know what happened, why it happened, and what it was allowed to do.
