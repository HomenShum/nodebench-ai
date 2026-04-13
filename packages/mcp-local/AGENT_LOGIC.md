# How NodeBench MCP Thinks

> Plain-English guide to NodeBench's agent logic. Read this before the code.

NodeBench is the operating memory and entity-context layer for founders, bankers, researchers, and operators. It now starts with a 9-tool workflow lane and expands on demand via `discover_tools` and `load_toolset`, instead of dropping the whole registry into the initial context.

---

## 1. How the AI Agent Thinks — Plain English

Think of NodeBench as a really good chief of staff sitting next to you. When a new question or task comes in, the agent follows this mental model:

**Step 1: Read the request — what entity, what context, what role?**
The agent classifies the intent. Is this about a company? A competitor? A weekly check-in? A delegation? The classification determines which tool chain fires.

**Step 2: Check local memory — has this been asked before?**
NodeBench keeps a local SQLite database at `~/.nodebench/`. Every prior packet, learning, session note, and causal event is searchable. If you asked about Anthropic last Tuesday, the agent finds that packet and diffs against it.

**Step 3: Check the web — any recent news, filings, competitor moves?**
If a Gemini API key is configured, the agent runs `web_search` to pull fresh signals. No key? It falls back to local memory only — never crashes, just narrows scope.

**Step 4: Pick the right workflow — weekly reset? Company search? Delegation?**
Each intent maps to a specific tool chain. The agent does not freestyle. It follows structured workflows with validation gates between steps.

**Step 5: Synthesize a packet — structured, citation-ready, exportable**
Every analysis produces a shareable artifact: a decision memo, a delegation brief, an investigation report. The output is designed to be forwarded, not just read.

**Step 6: Track everything — actions, intents, state changes for next time**
After every interaction, the agent records learnings, updates session memory, and logs the tool chain used. By session 9, it finds 2+ relevant prior findings before writing a single new line.

---

## 2. The 6 Canonical Situations

### Situation 1: Founder Weekly Reset — "What changed this week?"

The founder opens their coding agent on Monday morning and asks what happened.

```
User: "What changed this week?"

Agent thinks:
  → This is a weekly reset request
  → I need to check local packets, learnings, and causal events from the past 7 days
  → Then surface what drifted, what resolved, and what needs attention

Tool chain:
  1. founder_local_weekly_reset    → scan all packets, learnings, and events from past 7 days
  2. get_important_changes         → surface flagged changes sorted by severity
  3. get_proactive_alerts          → check for alerts the user hasn't dismissed
  4. render_decision_memo          → produce a structured weekly summary memo

Output: A decision memo with 3 sections:
  - What resolved (closed items, completed delegations)
  - What drifted (contradictions, stale assumptions, overdue actions)
  - What needs attention now (new alerts, unresolved tensions)
```

### Situation 2: Company Intelligence Search — "Analyze Anthropic"

The user wants a full intelligence packet on a company.

```
User: "Analyze Anthropic"

Agent thinks:
  → This is an entity intelligence request
  → Do I have a prior packet on Anthropic? Check local memory first.
  → If yes, diff against it. If no, build from scratch.
  → Web search for fresh signals, then synthesize.

Tool chain:
  1. search_all_knowledge          → check for prior packets, learnings about "Anthropic"
  2. founder_local_gather          → pull entity context from local memory
  3. web_search                    → fresh news, filings, product announcements
  4. founder_local_synthesize      → combine local + web into structured intelligence
  5. founder_packet_validate       → quality gate: are all required sections present?
  6. export_artifact_packet        → produce shareable artifact

Output: An entity intelligence packet with:
  - Company overview, key people, recent moves
  - Competitive positioning, funding, product timeline
  - Risk signals, open questions, recommended next steps
  - Citations for every claim
```

### Situation 3: Competitor Brief — "What is Supermemory doing?"

The user wants competitive intelligence on a specific player.

```
User: "What is Supermemory doing?"

Agent thinks:
  → Competitor intelligence request
  → Check if I have prior packets on Supermemory
  → Search for fresh web signals
  → Compare against the user's own positioning (if packets exist)

Tool chain:
  1. search_all_knowledge          → prior mentions, packets, learnings about "Supermemory"
  2. web_search                    → recent announcements, launches, social mentions
  3. founder_local_synthesize      → structured competitor brief
  4. founder_packet_diff           → if prior packet exists, show what changed
  5. render_decision_memo          → formatted brief with action items

Output: A competitor brief with:
  - What they shipped recently
  - How their positioning compares to yours
  - What signals suggest about their roadmap
  - Recommended responses or non-responses
```

### Situation 4: Pre-Delegation Packet — "Prepare a brief for my contractor"

The user is about to hand off a task and needs context assembled.

```
User: "Prepare a delegation packet for the landing page redesign"

Agent thinks:
  → This is a delegation preparation request
  → I need to gather all context the contractor will need
  → Include decisions made, constraints, prior art, open questions
  → Package it as a standalone document

Tool chain:
  1. founder_deep_context_gather   → pull all related packets, decisions, constraints
  2. search_all_knowledge          → find relevant learnings and prior art
  3. compile_decision_packet       → assemble into structured delegation brief
  4. founder_packet_validate       → quality gate: is this self-contained? Can a stranger act on it?
  5. export_artifact_packet        → export as shareable markdown/JSON

Output: A delegation packet with:
  - Context: why this work matters, what was already decided
  - Scope: what to do, what NOT to do
  - Constraints: budget, timeline, technical boundaries
  - Open questions: what the contractor should ask about
  - Success criteria: how the user will evaluate the output
```

### Situation 5: Important Change Review — "What needs my attention?"

The user wants a triage of everything flagged since their last session.

```
User: "What needs my attention?"

Agent thinks:
  → This is an attention triage request
  → Check flagged changes, proactive alerts, unresolved tensions
  → Rank by severity and recency

Tool chain:
  1. get_important_changes         → all flagged changes since last session
  2. get_proactive_alerts          → alerts not yet dismissed
  3. get_session_journal           → what happened in the last session
  4. render_decision_memo          → structured attention report

Output: A prioritized attention report:
  - P0: Act now (new contradictions, broken assumptions, overdue items)
  - P1: Review today (drift signals, competitor moves, stale packets)
  - P2: Background (minor updates, informational changes)
```

### Situation 6: Session Memory Cycle — Intent Tracking, Synthesis, Compaction Recovery

This is not a single question — it is the background loop that makes NodeBench compound across sessions.

```
During every session, the agent silently:

  1. track_intent                  → records what the user is trying to accomplish
  2. record_learning               → captures findings worth remembering
  3. save_session_note             → persists session-level context
  4. mine_session_patterns         → detects recurring themes across sessions

On session end:
  5. summarize_session             → produces a session summary
  6. judge_session                 → self-evaluates: did I actually help?

On session start (after compaction):
  7. load_session_notes            → recovers prior session context
  8. search_all_knowledge          → finds relevant prior learnings
  9. get_session_journal           → reconstructs what happened before compaction

This is why session 9 is better than session 1.
The agent remembers what you care about and what already failed.
```

---

## 3. Chat Commands / Natural Language

NodeBench responds to natural language. Here is what happens behind the scenes:

| You say | Agent interprets as | Tool chain fired |
|---|---|---|
| "What changed this week?" | Weekly reset | `founder_local_weekly_reset` → `get_important_changes` → `render_decision_memo` |
| "Analyze Anthropic" | Entity intelligence | `search_all_knowledge` → `founder_local_gather` → `web_search` → `founder_local_synthesize` |
| "What is Supermemory doing?" | Competitor brief | `search_all_knowledge` → `web_search` → `founder_local_synthesize` → `founder_packet_diff` |
| "Prepare a delegation packet" | Pre-delegation | `founder_deep_context_gather` → `compile_decision_packet` → `export_artifact_packet` |
| "What needs my attention?" | Attention triage | `get_important_changes` → `get_proactive_alerts` → `render_decision_memo` |
| "Show me the tool graph" | Tool graph visualization | `get_tool_graph` |
| "Find tools for SEO audit" | Progressive discovery | `discover_tools` → `load_toolset` |
| "Run a decision simulation" | Deep Sim | `run_deep_sim` → `extract_variables` → `compile_scenarios` → `render_decision_memo` |
| "What did I learn last week?" | Knowledge retrieval | `search_all_knowledge` → `list_learnings` |
| "Score this trajectory" | Compounding analysis | `score_compounding` → `build_claim_graph` |

---

## 4. Privacy / Data Boundaries

NodeBench is local-first. Your data stays on your machine unless you explicitly opt into web search.

**NodeBench reads:**
- Local SQLite at `~/.nodebench/nodebench.db` (packets, learnings, sessions, events, causal chains)
- Environment variables for API keys (never logged, never stored)
- Files on disk only if the `local_file` toolset is loaded (not in the default preset)

**NodeBench writes:**
- Local SQLite at `~/.nodebench/nodebench.db` only
- Session notes, learnings, packets, causal events — all local

**NodeBench calls externally (only with API keys):**
- `web_search` calls Gemini grounding API (with `GEMINI_API_KEY`)
- GitHub API (with `GITHUB_TOKEN`) for repo analysis
- No other external calls by default

**NodeBench never:**
- Sends your packets, memos, or learnings to any external service
- Accesses files outside `~/.nodebench/` unless `local_file` toolset is explicitly loaded
- Logs or stores API keys
- Phones home, tracks analytics externally, or shares usage data
- Makes external calls without an API key you explicitly provided

---

## 5. Technical Architecture

### Request Flow

```
QUERY
  │
  ▼
INTENT CLASSIFIER
  │  What kind of request is this? (entity search, weekly reset, delegation, discovery...)
  ▼
CONTEXT ASSEMBLY
  │  Pull from: local SQLite, prior packets, session memory, web search (if API key)
  ▼
TOOL CHAIN EXECUTION
  │  Run the matching workflow: gather → synthesize → validate → export
  ▼
ARTIFACT PRODUCTION
  │  Decision memo, delegation brief, intelligence packet, or raw tool output
  ▼
TRACKING
  │  Record learnings, update session memory, log tool usage, flag important changes
  ▼
RESPONSE
```

### Preset Hierarchy

```
default (9 tools)       ← DEFAULT. One workflow lane: ask → check → write → save
  │
  ├── power             ← + founder, recon, web, packets, deeper research lanes
  ├── founder           ← compatibility preset for existing founder workflows
  ├── cursor            ← constrained preset for Cursor's tool cap
  ├── core              ← full verification / eval / learning methodology lane
  ├── admin             ← profiling, observability, dashboards, and operator tooling
  └── full              ← everything loaded, only when you explicitly want the warehouse
```

### Representative Tool Categories

| Category | Tools | Purpose |
|---|---|---|
| **deep_sim** | 7 | Decision simulation, claim graphs, countermodels, memos |
| **founder** | 35 | Packets, weekly reset, delegation, entity intelligence |
| **core_workflow** | 7 | `investigate`, `compare`, `track`, `summarize`, `search`, `report`, `ask_context` |
| **progressive_discovery** | 4 | `discover_tools`, `get_tool_graph`, `get_tool_quick_ref`, `get_workflow_chain` |
| **dynamic_loading** | 5 | `load_toolset`, `unload_toolset`, `list_available_toolsets`, `call_loaded_tool`, `get_ab_test_report` |
| **learning** | 4 | `record_learning`, `search_all_knowledge`, `list_learnings`, `delete_learning` |
| **session_memory** | 5 | `track_intent`, `save_session_note`, `summarize_session`, `mine_session_patterns`, `judge_session` |
| **local_file** | 19 | File parsing: CSV, XLSX, PDF, DOCX, JSON, images |
| **verification** | 8 | Verification cycles, gap logging, phase findings |
| **parallel_agents** | 13 | Task locks, roles, context budget, self-eval |
| **web** | 2 | `web_search` (Gemini grounding), web scraping |
| **temporal_intelligence** | 7 | Temporal graphs, causal chains, entity timelines |
| **observability** | 8 | System pulse, watchdog, execution tracing |
| *...plus optional specialist domains loaded on demand* | | |

### Progressive Discovery Engine

`discover_tools` is a 14-strategy hybrid search engine:

| Strategy | What it does |
|---|---|
| Keyword + TF-IDF | Exact match, rare tags score higher |
| Fuzzy (Levenshtein) | Tolerates typos ("desision" finds "decision") |
| Semantic synonyms | 30 word families ("check" finds "verify", "validate") |
| N-gram + Bigram | Partial words and phrases |
| Dense TF-IDF cosine | Vector-like ranking without embeddings |
| Neural embedding | Agent-as-a-Graph bipartite search (with HuggingFace/Google/OpenAI) |
| Execution traces | Co-occurrence mining from usage history |
| Intent pre-filter | Narrow to relevant categories before scoring |

Plus: cursor pagination (`offset`/`limit`), result expansion (`expand: N` adds neighbors), and multi-hop BFS traversal (`depth: 1-3`) via `get_tool_quick_ref`.

---

## 6. Decision Tree

How NodeBench routes a request to the right workflow:

```
                         User sends a message
                                │
                    ┌───────────┴───────────┐
                    │                       │
              About a tool?           About content?
                    │                       │
            ┌───────┴───────┐       ┌───────┴───────────┐
            │               │       │                   │
        discover_tools   load_toolset   What kind of content?
            │               │       │
       get_tool_quick_ref   │   ┌───┴────────┬──────────┬──────────┐
            │               │   │            │          │          │
       get_workflow_chain   │   Entity    Weekly     Delegate   Attention
            │               │   search    reset      packet     triage
            ▼               ▼   │            │          │          │
        Tool results    Toolset    │            │          │          │
        returned        activated  ▼            ▼          ▼          ▼
                                search_all  weekly     deep_      important
                                knowledge   _reset     context    _changes
                                    │           │      _gather        │
                                web_search  important     │      proactive
                                    │       _changes  compile     _alerts
                                synthesize      │     _decision       │
                                    │       decision  _packet     decision
                                validate    _memo         │       _memo
                                    │           │     validate
                                export      export        │
                                _artifact   _artifact  export
                                _packet     _packet    _artifact
```

---

## 7. Tools the Agent Can Call

### Default Preset (loaded by default)

| Tool | Input | Output | Purpose |
|---|---|---|---|
| `investigate` | Topic, entity, URL, file path, or messy note | Sourced report artifact | Research a topic and return something reusable |
| `compare` | 2-4 entities plus optional comparison lens | Side-by-side comparison brief | Compare companies, vendors, products, or people |
| `track` | Entity plus add/list/check action | Watchlist state + recent status | Track what matters across sessions |
| `summarize` | Raw notes, links, files, or saved context | Compact brief with key points | Compress messy context fast |
| `search` | Query string | Web + saved-knowledge search results | Search fresh signals and local memory together |
| `report` | Topic plus structured or messy context | Human-readable report artifact | Turn findings into a memo or diligence report |
| `ask_context` | Question against saved context | Grounded answer from saved memory | Reuse previous work without re-deriving it |
| `discover_tools` | Natural language query | Ranked deeper-tool suggestions | Find a more specialized lane only when needed |
| `load_toolset` | Domain name (for example `recon`) | Confirmation + newly visible tools | Expand the session deliberately |
| `unload_toolset` | Domain name | Confirmation | Free context budget |
| `call_loaded_tool` | Tool name, arguments | Tool result | Fallback for clients without dynamic loading |
| `list_available_toolsets` | None | All available toolsets with tool counts | See what can be loaded |

### Founder Preset (adds ~25 tools)

| Tool | Input | Output | Purpose |
|---|---|---|---|
| `founder_local_weekly_reset` | Time range (default: 7 days) | Weekly summary with drift, resolutions, alerts | Monday morning reset |
| `founder_local_gather` | Entity name or query | Local context bundle | Pull all local knowledge about an entity |
| `founder_local_synthesize` | Context bundle + web signals | Structured intelligence packet | Combine local + web into a packet |
| `founder_deep_context_gather` | Topic or entity | Deep context with all related packets | Exhaustive context assembly |
| `founder_packet_validate` | Packet | Pass/fail + missing sections | Quality gate before export |
| `founder_packet_diff` | Two packets or packet + entity | Structured diff showing changes | What changed between packets |
| `founder_packet_history_diff` | Entity, time range | Historical drift analysis | How an entity's story changed over time |
| `export_artifact_packet` | Packet | Shareable artifact (markdown/JSON) | Export for sharing or delegation |
| `compile_decision_packet` | Context, constraints, decisions | Structured decision packet | Package a decision with full context |
| `record_learning` | Finding, source, tags | Stored learning | Persist a finding for future sessions |
| `search_all_knowledge` | Query | Matching learnings, ranked | Search across all stored knowledge |
| `get_important_changes` | Time range | Flagged changes, sorted by severity | What drifted or broke |
| `get_proactive_alerts` | None | Active alerts | Things the agent thinks you should know |
| `flag_important_change` | Change description, severity | Stored flag | Mark something as worth reviewing |
| `track_intent` | Intent description | Tracked intent | Record what the user is trying to do |
| `save_session_note` | Note content | Stored note | Persist session context |
| `summarize_session` | None | Session summary | Wrap up a session |

---

## 8. Agentic Loop Pseudocode

```
function agentLoop(userMessage):
    // Phase 1: Classify
    intent = classifyIntent(userMessage)  // entity_search | weekly_reset | delegation | discovery | ...

    // Phase 2: Check memory
    priorContext = search_all_knowledge(userMessage)
    sessionNotes = load_session_notes()
    importantChanges = get_important_changes(since: lastSession)

    // Phase 3: Route to workflow
    if intent == "weekly_reset":
        result = founder_local_weekly_reset()
        changes = get_important_changes(days: 7)
        alerts = get_proactive_alerts()
        memo = render_decision_memo(result, changes, alerts)

    elif intent == "entity_search":
        entity = extractEntity(userMessage)
        local = founder_local_gather(entity)
        web = web_search(entity)                    // only if GEMINI_API_KEY set
        packet = founder_local_synthesize(local, web)
        founder_packet_validate(packet)             // quality gate
        artifact = export_artifact_packet(packet)

    elif intent == "delegation":
        context = founder_deep_context_gather(userMessage)
        packet = compile_decision_packet(context)
        founder_packet_validate(packet)
        artifact = export_artifact_packet(packet)

    elif intent == "discovery":
        results = discover_tools(userMessage)
        // suggest: load_toolset(results[0].domain)

    elif intent == "decision_sim":
        sim = run_deep_sim(userMessage)
        vars = extract_variables(sim)
        scenarios = compile_scenarios(vars)
        memo = render_decision_memo(sim, scenarios)

    // Phase 4: Track
    track_intent(userMessage, intent)
    record_learning(result.keyFindings)             // if any
    save_session_note(summary)

    return artifact or memo or result
```

---

## 9. Fallback Chain

NodeBench degrades gracefully. Each level works without the capabilities below it.

| Level | Name | What works | What is missing | When it activates |
|---|---|---|---|---|
| **1** | Full intelligence | Gemini synthesis + web search + local memory + neural embeddings | Nothing | `GEMINI_API_KEY` set, all systems operational |
| **2** | Heuristic synthesis | Local memory + web search + keyword/fuzzy discovery | Neural embedding search, Gemini-powered synthesis | No embedding model available |
| **3** | Local memory only | All local tools: packets, learnings, session memory, discovery (14 strategies minus embeddings) | Web search, external API calls | No `GEMINI_API_KEY`, no `OPENAI_API_KEY` |
| **4** | Raw tool output | Individual tools return structured data, no cross-tool synthesis | Synthesized packets, decision memos | Synthesis tools fail or time out |
| **5** | Progressive discovery only | `discover_tools`, `load_toolset`, `get_tool_quick_ref`, `get_workflow_chain` | All domain-specific tools | Minimal install, no API keys, no local data |

The agent never crashes. It narrows scope and tells you what it could not do.

---

## 10. Cost Estimates

NodeBench itself is free and open source. Costs come only from optional external API calls.

| Operation | External calls | Estimated cost |
|---|---|---|
| Single entity synthesis | 1-2 Gemini Flash calls + 1 web search | $0.001 - $0.005 |
| Weekly founder reset | 3-5 Gemini Flash calls + 1-2 web searches | $0.01 - $0.05 |
| Competitor brief | 2-3 Gemini Flash calls + 2-3 web searches | $0.005 - $0.02 |
| Decision simulation (Deep Sim) | 0 external calls (runs locally) | $0.00 |
| Progressive discovery | 0 external calls (runs locally) | $0.00 |
| Session memory operations | 0 external calls (local SQLite) | $0.00 |
| **Monthly estimate** (10 queries/day) | ~300 Gemini calls | **$3 - $15/month** |

All local-only operations (discovery, memory, Deep Sim, session tracking) cost nothing.

---

## 11. Data Boundaries

| | What | Details |
|---|---|---|
| **READS** | Local SQLite database | `~/.nodebench/nodebench.db` — packets, learnings, sessions, causal events, tool usage |
| **READS** | Environment variables | API keys for Gemini, OpenAI, GitHub (never stored, never logged) |
| **READS** | Local files | Only if `local_file` toolset is explicitly loaded (not in the default preset) |
| **WRITES** | Local SQLite database | Same `~/.nodebench/nodebench.db` — all writes are local |
| **WRITES** | Stdout (MCP protocol) | Tool results sent to the connected AI client via MCP |
| **CALLS** | Gemini API | Web search + grounding (only with `GEMINI_API_KEY`) |
| **CALLS** | GitHub API | Repo analysis (only with `GITHUB_TOKEN`) |
| **CALLS** | HuggingFace/OpenAI | Embedding generation for neural search (optional, falls back gracefully) |
| **NEVER** | Send packets/memos externally | Your intelligence packets stay on your machine |
| **NEVER** | Phone home or track usage | No analytics, no telemetry, no external reporting |
| **NEVER** | Access files outside ~/.nodebench/ | Unless `local_file` toolset is explicitly loaded |
| **NEVER** | Store API keys | Read from env vars at runtime, never persisted |
| **NEVER** | Make external calls without opt-in | No API key = no external calls, period |

---

## 12. Quick Reference

| You say | Tools called | Output |
|---|---|---|
| "What changed this week?" | `founder_local_weekly_reset` → `get_important_changes` → `get_proactive_alerts` → `render_decision_memo` | Weekly reset memo with drift, resolutions, and action items |
| "Analyze Anthropic" | `search_all_knowledge` → `founder_local_gather` → `web_search` → `founder_local_synthesize` → `founder_packet_validate` → `export_artifact_packet` | Entity intelligence packet with citations |
| "What is Supermemory doing?" | `search_all_knowledge` → `web_search` → `founder_local_synthesize` → `founder_packet_diff` → `render_decision_memo` | Competitor brief with positioning comparison |
| "Prepare a delegation packet" | `founder_deep_context_gather` → `compile_decision_packet` → `founder_packet_validate` → `export_artifact_packet` | Self-contained delegation brief |
| "What needs my attention?" | `get_important_changes` → `get_proactive_alerts` → `render_decision_memo` | Prioritized attention report (P0/P1/P2) |
| "Simulate hiring a CTO" | `run_deep_sim` → `extract_variables` → `generate_countermodels` → `rank_interventions` → `render_decision_memo` | Decision simulation with scored outcomes |
| "Find tools for SEO" | `discover_tools("SEO")` | Ranked list of SEO tools with load commands |
| "Show the tool graph" | `get_tool_graph` | Graph of the registered tool relationships and domain clusters |
| "What did I learn last week?" | `search_all_knowledge` → `list_learnings` | Prior findings, ranked by relevance |
| "Score my progress" | `score_compounding` | 8-dimension trajectory score + trend label |
