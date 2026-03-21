# OpenClaw Deep Agent Architecture — Self-Diagnosis Reference

> Drop this into any codebase. Claude Code (or any agent) can read it, compare against the existing repo, and self-diagnose what to adopt.

## NodeBench Reference Status

This document is the reference pattern for the deep-agent / agentic-system model in this repo.

Use it as the conceptual benchmark for:

- multi-level orchestration
- role-specialized agent systems
- boolean judgment gates
- institutional memory
- self-evolution loops
- persistent operator surfaces

In NodeBench, this is a reference architecture, not a claim that the current implementation fully matches OpenClaw yet.

Read this document alongside the current NodeBench implementation surfaces:

- `convex/domains/agents/core/coordinatorAgent.ts`
- `convex/domains/agents/orchestrator/toolRouter.ts`
- `convex/domains/agents/orchestrator/queueProtocol.ts`
- `convex/domains/agents/orchestrator/worker.ts`
- `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx`
- `src/layouts/AgentPresenceRail.tsx`
- `src/layouts/CockpitLayout.tsx`

Interpretation rule:

- `docs/agents/OPENCLAW_ARCHITECTURE.md` = target deep-agent pattern and design language
- current Convex + cockpit code = implementation reality and adoption path

---

## System Overview

OpenClaw is an autonomous multi-agent system that continuously monitors, deliberates, self-improves, and executes — with boolean safety gates, institutional memory, and 6 specialized roles. It runs as a "startup-team-in-Slack" that never sleeps.

**Core loop:** `observe → decide → act → learn → evolve`

**Key differentiator:** The system doesn't just execute workflows. It evaluates *whether* to act (boolean rubric), *who* should act (role selection), *how well* it acted (engagement tracking), and *how to improve* (self-evolution loop).

---

## 1. SOUL Contract (Identity + Operating Principles)

Every agent system needs an immutable identity document. This prevents drift and makes behavior auditable.

```markdown
## Identity
You are an autonomous, self-directing intelligence. Not a chatbot.
You observe, decide, act, and evolve.

## Operating Principles

### 1. Boolean Gates with Mandatory Reasoning
Every decision is TRUE or FALSE with a string reason. Never numerical scores.
This makes reasoning auditable and evolution tractable.

### 2. Calculus Made Easy (Thompson Pattern)
- Plain English analogy first
- Ratios before absolutes
- "What this means" before "here are the numbers"
- Technical footnotes for the curious

### 3. Self-Evolution Over Self-Preservation
Actively seek evidence your rubric is wrong. The evolution loop runs daily.
Measure your own engagement (reactions, replies) and adjust.

### 4. Role Specialization
6 personas, each with own expertise, voice, and success metrics.
Select the right persona for each opportunity.

### 5. Memory as Infrastructure
Decisions, discussions, recurring topics are extracted and stored.
When a topic recurs, surface prior context. Detect FAQ patterns.
Track decision follow-through. Memory compounds value over time.

## Boundaries
- Post only when boolean rubric says POST. Never out of obligation.
- Never share sensitive information.
- Log every decision for auditing, including decisions NOT to act.
- Flag uncertainty honestly — "low confidence" is a valid output.
```

---

## 2. Six Specialized Roles (AGENTS Contract)

No two roles share workspace or identity. Role assignment is **deterministic** based on opportunity type.

| Role | Division | Handles Types | Tools | Voice |
|------|----------|---------------|-------|-------|
| **Strategy Architect** | Product | E (Decision Support), H (Timeline) | investor_brief, web_search | Senior strategist. Decisive but transparent about uncertainty. |
| **Growth Analyst** | Marketing | F (Knowledge), G (Cross-Thread) | competitive.search, web_search | Data-driven researcher. Cites sources, quantifies claims. |
| **Engineering Lead** | Engineering | A (Direct Question), C (Incident), D (Blocker) | codebase.search, codebase.read_file, git_status | Pragmatic architect. "What breaks if we do this?" |
| **Design Steward** | Design | A (Direct Question), F (Knowledge) | codebase.search, codebase.read_file | UX-focused. Thinks in systems, not screens. |
| **Security Auditor** | Testing | C (Incident), D (Blocker) | codebase.search, codebase.read_file | Methodical. Never approves without evidence. STRIDE modeling. |
| **Ops Coordinator** | PM | B (Meta-Feedback), D (Blocker), G (Cross-Thread) | (no specialized tools — synthesizes across all) | Connective tissue. Stories, not lists. |

### Orchestration Rules
1. **One agent per opportunity.** No committee discussions.
2. **Agents don't talk to each other externally.** Internal coordination via swarm. External = one voice.
3. **Each agent has own success metrics.** Evolution tracks per-role effectiveness.
4. **Role assignment is deterministic.** Type A → Engineering Lead. Type B → Ops Coordinator. Explicit mapping.

### MiroFish Prediction Pattern
When multi-perspective analysis needed:
1. Up to 4 agents independently assess scenario
2. Synthesis step identifies consensus and divergence
3. One unified report posted with confidence level + recommended action

---

## 3. Boolean Rubric (Decision Gates)

This is the core judgment layer. Every action passes through these gates.

### 8 Opportunity Types (A-H)

```python
class OpportunityType(str, Enum):
    DIRECT_QUESTION = "A"       # Someone asks a question
    META_FEEDBACK = "B"         # Feedback about the agent itself (HIGHEST PRIORITY)
    INCIDENT = "C"              # Something is broken
    BLOCKER = "D"               # Someone is blocked
    DECISION_SUPPORT = "E"      # A decision is being discussed
    KNOWLEDGE_SURFACING = "F"   # Agent knows something not yet mentioned
    CROSS_THREAD = "G"          # Two threads discuss same topic unknowingly
    TIMELINE_AWARENESS = "H"    # Deadline context the team may be missing
```

### Keyword-Driven Initial Detection

```python
OPPORTUNITY_PATTERNS = {
    DIRECT_QUESTION: [r"\?$", r"anyone know", r"how do (we|i|you)", r"can someone"],
    META_FEEDBACK: [r"bot", r"agent", r"too (much|many|noisy)", r"helpful"],
    INCIDENT: [r"broken", r"crash", r"error", r"bug", r"not working", r"500"],
    BLOCKER: [r"block(ed|er|ing)", r"stuck", r"can't (get|make)", r"help me"],
    DECISION_SUPPORT: [r"should we", r"what if we", r"trade.?off", r"pros? (and|&) cons?"],
    KNOWLEDGE_SURFACING: [r"where (is|are)", r"documentation", r"who (knows|owns)"],
    CROSS_THREAD: [],  # Detected via memory search, not keywords
    TIMELINE_AWARENESS: [r"deadline", r"due (date|by)", r"launch", r"sprint"],
}
```

### 5 Required Gates (ALL must be TRUE to post)

| Gate | Question |
|------|----------|
| `opportunity_identified` | Is there a clear opportunity where the agent can add value? |
| `agent_has_unique_value` | Does the agent have info NOT already in the thread? Must add something new. |
| `actionable_outcome` | Would the response lead to a concrete action, decision, or understanding? |
| `right_audience_right_time` | Is this the right moment? Conversation still active (within 2 hours)? |
| `information_would_be_lost` | If agent stays silent, would valuable info be lost? Cost of silence > cost of speaking? |

### 6 Disqualifiers (ALL must be FALSE to post)

| Gate | Question |
|------|----------|
| `already_resolved` | Has the question already been resolved in the thread? |
| `social_only` | Is this purely social with no actionable content? |
| `bot_already_replied` | Has the bot already posted a substantive reply within 2 hours? |
| `sensitive_topic` | Does this involve personal, HR, compensation, or sensitive topics? |
| `rapid_fire_limit` | Has the bot already posted 3+ messages in the last hour? |
| `command_word_required` | Is a command word required but missing from this message? |

### Gate Evaluation (LLM-as-Judge)

```python
async def evaluate_gate(gate_name, gate_question, context) -> GateResult:
    prompt = f"""You are a boolean gate evaluator.
    QUESTION: {gate_question}
    CONTEXT: {context}
    Respond with ONLY JSON: {{"value": true/false, "reason": "2-3 sentences"}}"""

    text = await call_responses_api(prompt, task="gate_evaluation")
    result = json.loads(text)
    return GateResult(name=gate_name, value=bool(result["value"]), reason=result["reason"])

# Batch evaluation for efficiency (all gates in one LLM call)
async def evaluate_gates_batch(gates, context) -> list[GateResult]:
    # Sends all gates + context in one prompt, returns JSON array
```

### RubricResult Data Structure

```python
@dataclass
class GateResult:
    name: str
    value: bool
    reason: str

@dataclass
class RubricResult:
    required_gates: list[GateResult]
    disqualifiers: list[GateResult]

    @property
    def should_post(self) -> bool:
        return all(g.value for g in self.required_gates) and not any(g.value for g in self.disqualifiers)

    @property
    def decision_chain(self) -> str:
        """Human-readable: opportunity_identified=TRUE → agent_has_unique_value=FALSE → SKIP"""
        parts = [f"{g.name}={'TRUE' if g.value else 'FALSE'}" for g in self.required_gates]
        parts += [f"DISQUALIFY:{g.name}=TRUE" for g in self.disqualifiers if g.value]
        return " → ".join(parts) + f" → {self.decision}"
```

---

## 4. Monitor Service (Every 30 Minutes)

The core autonomous loop. Scans for opportunities, evaluates rubric, posts or logs decision.

```
run_monitor()
  1. Fetch recent messages (last 30 min, limit 50)
  2. Filter to human messages only
  3. Detect command-word setup/clear requests
  4. Run keyword-based opportunity detection → list[Opportunity]
  5. Apply command-word gate (Type B bypasses)
  6. Sort by priority: B > C > D > A > E > F > G > H
  7. Count recent bot posts (rapid-fire check)
  8. Get thread context for top candidate
  9. Evaluate full boolean rubric (5 required + 6 disqualifiers)
  10. If should_post → select role → compose response → post to thread
  11. Extract decisions from conversation → store in institutional memory
  12. Surface relevant prior context for future runs
  13. Log everything to Convex (with local JSONL fallback)
```

---

## 5. Agent Swarm (Every 2 Hours)

Six roles deliberate as a team in real-time, post conversation to Slack, extract action items.

### 2026 Best Practices Implemented

**Smart Speaker Selection (AG2 Pattern):**
Instead of all 6 roles every round, LLM picks 3-4 most relevant per round.

```python
ROUTING_MODEL = "gpt-5.4-nano"   # Fast, cheap for speaker selection
PRIMARY_MODEL = "gpt-5.4"        # Substantive deliberation
DEEP_MODEL = "gpt-5.4"           # Deep simulations with web_search
```

**Early Termination:**
Consensus check via fast model stops conversation early if agreement reached.

**Intent-Residual Context Compaction (3-stage pipeline):**

```
STAGE 1: Tool result collapse
  → Strip verbose outputs, mark long results as "...[collapsed]"
  → Preserve structure, drop verbosity

STAGE 2: Intent-residual extraction (LLM-powered)
  → Extract ONLY what matters for next round:
    * POSITIONS: what each role recommended
    * DISAGREEMENTS: where roles diverged
    * OPEN QUESTIONS: unresolved issues
    * ACTION ITEMS: commitments
    * CONSTRAINTS: hard limits
  → Drop: greetings, analogies, repetition, hedging, meta-commentary

STAGE 3: Sliding window
  → Keep last N messages verbatim as working memory
  → Overlap ensures no logical discontinuity
```

**Why:** gpt-5.4-mini degrades past ~50K tokens. Compacting to ~3K intent-residual + ~3K recent verbatim keeps it in the sweet spot.

### Swarm Flow

```python
async def run_swarm_conversation(topic, initiator_role, max_rounds=4):
    messages = [{"role": "system", "content": swarm_system_prompt}]
    messages.append({"role": "user", "content": f"Topic: {topic}"})

    # Round 1: initiator + 2 heuristic respondents
    # Round 2+: LLM-selected speakers (3-4 roles)
    for round_num in range(max_rounds):
        speakers = await _select_speakers(messages, round_num)  # AG2 pattern

        for speaker in speakers:
            response = await _generate_role_response(speaker, messages)
            messages.append(response)
            await slack.post_thread_reply(channel, thread_ts, response)  # Real-time

        # Compress context for next round
        messages = await _compact_context(messages)  # Intent-residual pipeline

        # Early termination check
        if await _check_consensus(messages):
            break

    # Extract action items
    action_items = await _extract_action_items(messages)
    # Persist to Convex institutional memory
    await convex.store_memory({"topic": topic, "actions": action_items})

    return SwarmResult(rounds=round_num+1, action_items=action_items)
```

### Deep Simulation Mode

Roles get full tool-calling via AgentRunner:
- Tool categories per role (codebase, investor_brief, web_search, slack, spawn)
- Max 15 turns per role
- Citation requirement (sources, URLs, file paths)

### Continuous Swarm Entry Point

```python
async def run_continuous_swarm():
    """Called every 2 hours by cron."""
    # 1. Scan recent Slack activity (50 messages)
    # 2. Check recent Convex decisions
    # 3. Boolean gate: "Is there something worth discussing?"
    # 4. Topic selection via LLM
    # 5. Pick initiator role based on topic keywords
    # 6. Run conversation → SwarmResult
```

---

## 6. Self-Evolution Loop (Daily)

The agent's most important capability. Inspired by Karpathy's autoresearch pattern.

### 10 Boolean Health Metrics

| Metric | Healthy When |
|--------|-------------|
| `post_rate_in_range` | Between 10% and 50% |
| `opportunity_type_coverage` | ≥3 different types in decisions |
| `gate_distribution_balanced` | No single gate blocks >60% of SKIPs |
| `no_regret_posts` | No posts received negative reactions |
| `no_missed_opportunities` | No unanswered questions went cold |
| `meta_feedback_responsiveness` | All Type B opportunities addressed |
| `disqualifier_precision` | Disqualifiers catch truly inappropriate moments |
| `digest_post_rate_in_range` | 2-4 digests per day during active periods |
| `digest_gate_balance` | Gates not blocking everything during slow days |
| `log_completeness` | All decisions have complete gate traces |

### Evolution Flow

```python
async def run_evolve():
    # 1. Query last 48 decisions from Convex (monitor + digest)
    monitor_decisions = await convex.get_recent_decisions("monitor", limit=48)

    # 2. Compute stats (post rate, gate blocks, type distribution)
    stats = _compute_stats(monitor_decisions)

    # 3. Check bot engagement (reactions, thread replies on bot posts)
    engagement = await _check_bot_engagement(slack)

    # 4. Evaluate 10 health metrics via LLM batch gate evaluation
    health = await _evaluate_health(stats, engagement)

    # 5. Generate proposals for unhealthy metrics (max 3, conservative)
    proposals = await _generate_proposals(health, stats)

    # 6. Post health report to Slack
    # 7. Log everything to Convex for auditing
```

### Proposal Format

```python
@dataclass
class EvolutionProposal:
    target: str          # "information_would_be_lost"
    change_type: str     # "adjust_threshold|add_gate|remove_gate|modify_question"
    description: str     # "Relax gate — currently blocking 45% of valid opportunities"
    evidence: str        # "Post rate dropped to 8%, below healthy 10% floor"
    risk: str            # "May increase noise if relaxed too much"
```

---

## 7. Institutional Memory (3-Layer Architecture)

### Memory Layers

| Layer | Scope | Contents | TTL |
|-------|-------|----------|-----|
| **L0** | Per-run | Current 30-min messages, thread context, recent bot posts | Ephemeral |
| **L1** | Per-day | Last 48 decisions, health metrics, active memory (7 days) | 7 days |
| **L2** | Persistent | Full institutional memory, all decision logs, evolution reviews | Forever (with decay) |

### Memory Operations

**Decision Extraction** — LLM scans conversations for decisions:
```python
async def extract_decisions(messages, channel) -> list[MemoryEntry]:
    prompt = """Analyze these Slack messages. Extract decisions, conclusions, notable knowledge.
    Return JSON array: [{"topic": "...", "summary": "...", "decision": "...",
                         "participants": [...], "source_type": "decision|question|discussion"}]
    Rules: Only extract clear decisions. Skip casual chat. Include recurring topics."""
```

**Memory Surfacing** — When topic recurs, surface prior context:
```python
async def surface_relevant(current_messages, convex) -> list[str]:
    topics = await _extract_topics(current_messages)  # LLM extracts 1-3 main topics
    for topic in topics[:3]:
        memories = await convex.search_memory(topic, limit=2)
        # Returns: "Re: _topic_ — discussed on Mar 5. Decision: use JWT over sessions"
```

**FAQ Detection** — Topic appears ≥3 times as "question" type → proactive FAQ surfacing.

### Convex Persistence Tables

| Table | Purpose | Indexed By |
|-------|---------|-----------|
| `slackMonitorDecisions` | Every monitor decision with full gate trace | timestamp, decision |
| `slackDigestDecisions` | Every digest decision with activity metrics | timestamp |
| `slackEvolveReviews` | Daily health check results + proposals | timestamp |
| `institutionalMemory` | Extracted decisions + knowledge | topic, timestamp |
| `slackTaskState` | Runtime state for each service | taskName |

### Convex Client (HTTP, no SDK dependency)

```python
class ConvexClient:
    """HTTP client — calls Convex HTTP actions via httpx."""

    async def log_monitor_decision(self, decision: dict) -> dict
    async def log_evolve_review(self, review: dict) -> dict
    async def get_recent_decisions(self, task: str, limit: int = 48) -> list[dict]
    async def store_memory(self, entry: dict) -> dict
    async def search_memory(self, topic: str, limit: int = 5) -> list[dict]
    async def update_task_state(self, task_name: str, state: dict) -> dict
    async def get_task_state(self, task_name: str) -> dict | None

    @staticmethod
    def log_local_fallback(log_file, entry):
        """JSONL fallback when Convex unavailable."""
```

---

## 8. LLM Judge (Centralized Model Routing)

All LLM calls go through one shared helper with dynamic model routing.

```python
# Model tiers
FAST_MODEL = "gpt-5.4-nano"      # ~$0.0001/call — routing, classification
DEFAULT_JUDGE_MODEL = "gpt-5.4"  # ~$0.03/call — gates, composition
HIGH_JUDGE_MODEL = "gpt-5.4"     # ~$0.08/call — deliberation, synthesis

async def call_responses_api(
    prompt: str,
    task: str | None = None,      # Dynamic routing via model_registry
    model: str | None = None,      # Explicit override
    reasoning_effort: str = None,  # "low" | "medium" | "high"
    instructions: str = None,      # System prompt
    web_search: bool = False,      # Enable web_search_preview tool
) -> str:
    """Single point of contact for ALL LLM calls across every service."""

    # Task-based routing: model_registry picks optimal model + effort
    if task:
        model, effort = get_model_for_task(task)

    # Rate limiting: token-bucket, max 30 calls/minute
    await _rate_limit()

    # Call OpenAI Responses API
    # Log telemetry: model, tokens, reasoning_tokens, elapsed_ms
```

### Telemetry Footer

Every LLM call logs: `task, model, input_tokens, output_tokens, reasoning_tokens, elapsed_ms, reasoning_effort`. Accessible via `get_last_call_meta()`.

---

## 9. Scheduled Task Architecture (Cron Routes)

All tasks are HTTP endpoints called by Convex crons with auth token verification.

| Endpoint | Frequency | Mode | Purpose |
|----------|-----------|------|---------|
| `POST /api/slack/monitor/run` | 30 min | Sync | Opportunity detection + rubric evaluation |
| `POST /api/slack/digest/run` | 1 hour | Sync | Activity summary, trending topics |
| `POST /api/slack/evolve/run` | Daily | Background | Self-evolution health check |
| `POST /api/slack/standup/run` | Daily | Background | Team synthesis, blockers |
| `POST /api/slack/drift/run` | Weekly | Background | Architecture/code health trends |
| `POST /api/slack/swarm/run` | 2 hours | Background | Multi-role deliberation |
| `POST /api/slack/swarm/evolve` | Weekly | Background | Swarm self-improvement |
| `POST /api/slack/swarm/competitive` | Ad-hoc | Background | Competitive landscape analysis |
| `POST /api/slack/swarm/deep-sim` | Ad-hoc | Background | Deep research (parametrized topic) |
| `POST /api/slack/housekeeping/run` | 4 hours | Background | Channel maintenance |
| `POST /api/slack/model-monitor/run` | Weekly | Sync | Eval harness across model tiers |
| `POST /api/slack/predict/run` | Ad-hoc | Sync | Multi-perspective prediction |

### Fire-and-Forget Pattern

Long tasks (2-10 min with gpt-5.4) use background execution to avoid HTTP timeouts:

```python
async def _bg(coro, task_name: str):
    """Background wrapper with Slack error reporting."""
    try:
        result = await coro
        logger.info("Task %s done: posted=%s", task_name, getattr(result, "posted", None))
    except Exception as e:
        logger.error("Task %s failed: %s", task_name, e, exc_info=True)
        # Report error to Slack so failures aren't silent
        tb = traceback.format_exc()[-400:]
        await slack.post_message(channel, f"*[Cron Error]* `{task_name}` failed:\n```{tb}```")

@router.post("/swarm/run")
async def run_swarm(authorization = Header(None)):
    _verify_auth(authorization)
    asyncio.ensure_future(_bg(run_continuous_swarm(), "swarm"))
    return {"success": True, "status": "started"}  # Returns immediately
```

---

## 10. Tool Access Policy (TOOLS Contract)

Deny by default. Each role has explicit permissions.

### Per-Role Tool Matrix

| Tool Category | Strategy | Growth | Engineering | Design | Security | Ops |
|---------------|----------|--------|-------------|--------|----------|-----|
| slack.* | Yes | Yes | Yes | Yes | Yes | Yes |
| codebase.* | — | — | Yes | Yes | Yes | — |
| investor_brief.* | Yes | — | — | — | — | — |
| competitive.* | — | Yes | — | — | — | — |
| memory.* | Yes | Yes | Yes | Yes | Yes | Yes |
| predict.* | Yes | Yes | — | — | — | — |
| claude_code.* | — | — | Yes (approval required) | — | — | — |
| swarm.* | Yes | Yes | Yes | Yes | Yes | Yes |

### Safety Rules

- All tool calls logged, no direct filesystem writes except via Claude Code bridge
- Slack posting requires rubric approval (5 required gates + 6 disqualifiers all pass)
- Claude Code changes require explicit human approval via Slack buttons
- Max 1 post per 15-minute window per role
- Rate limits: max 30 LLM calls per minute (token bucket)
- No credentials, no user impersonation, no message deletion, no force pushes

---

## 11. Slack Observer Daemon (Real-Time Message Polling)

Bash daemon that polls Slack every 60 seconds for @mentions and new thread messages.

```
Poll → Detect @mention or thread reply → Command-word gate check
  → Route to strategy-brief agent (streaming response to thread)
  → YouTube URL enrichment (auto-fetch transcript, 12K chars)
  → Rate limit: max 5 replies per 10-minute window
```

---

## 12. What To Self-Diagnose In Your Codebase

When Claude Code reads this document alongside your codebase, ask it to evaluate:

### Decision Layer
- [ ] Do your workflows have boolean gates before executing? Or do they blindly fire on schedule?
- [ ] Can you audit WHY a workflow ran or didn't run?
- [ ] Is role/agent selection deterministic or LLM-decided?

### Self-Evolution
- [ ] Do you track engagement on your outputs (reactions, replies, usage)?
- [ ] Do you review your own past decisions daily?
- [ ] Can you propose and log rubric changes?

### Memory
- [ ] Do decisions persist across sessions?
- [ ] Can you surface prior context when a topic recurs?
- [ ] Do you detect FAQ patterns (topic appears ≥3 times)?

### Multi-Perspective Analysis
- [ ] Do you have multi-role deliberation with consensus/divergence tracking?
- [ ] Do you use smart speaker selection (not all roles every round)?
- [ ] Do you compact context to keep reasoning quality high?

### Safety
- [ ] Is tool access deny-by-default with per-role permissions?
- [ ] Do you have disqualifier gates (already_resolved, sensitive_topic, rapid_fire)?
- [ ] Do background task failures get surfaced (not silently swallowed)?
- [ ] Is there a SOUL contract with explicit "what I will never do"?

### Observability
- [ ] Do you log every LLM call with model, tokens, cost, latency?
- [ ] Do you have a health endpoint showing service status?
- [ ] Do you have a model monitor that evaluates allocation efficiency?

---

## 13. File Reference Map

If adapting this architecture, these are the key source files to study:

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| SOUL contract | `openclaw_workspace/SOUL.md` | 49 | Identity + principles |
| Agent registry | `openclaw_workspace/AGENTS.md` | 76 | 6 roles + orchestration rules |
| Tool policy | `openclaw_workspace/TOOLS.md` | 68 | Per-role permissions |
| Memory contract | `openclaw_workspace/MEMORY.md` | 52 | L0/L1/L2 layers |
| Monitor | `services/slack_monitor.py` | 455 | Opportunity detection + rubric |
| Swarm | `services/agent_swarm.py` | ~1000 | Multi-role deliberation |
| Evolution | `services/slack_evolve.py` | 267 | Self-improvement loop |
| Memory | `services/slack_memory.py` | 232 | Decision extraction + surfacing |
| LLM Judge | `services/llm_judge.py` | 451 | Gate evaluation + composition |
| Convex Client | `services/convex_client.py` | 156 | State persistence |
| Cron Routes | `api/slack_cron_routes.py` | 373 | Scheduled task endpoints |
| Observer Daemon | `scripts/slack-channel-observer.sh` | 744 | Real-time Slack polling |
