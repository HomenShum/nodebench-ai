Title: Agents Dashboard (Timeline + Tasks) — Design Specs

Overview
- Goal: Achieve full UI parity with HTML prototypes for agent timeline and tasks; integrate with Convex; deliver richer popovers, in-row interactions, and a bottom "Full View" panel with actions.
- Status: Implemented React components, Convex wiring, popover parity, and bottom panel actions. Tests added/updated for AgentDashboard.

Data Model (Convex)
- Tables
  - agentTimelines
    - documentId: Id<'documents'>
    - name: string
    - baseStartMs?: number
    - createdBy: Id<'users'>
    - createdAt: number
    - updatedAt: number
  - agentTasks
    - timelineId: Id<'agentTimelines'>
    - parentId?: Id<'agentTasks'>
    - name: string
    - startOffsetMs?: number (preferred)
    - startMs?: number (legacy; normalized to offset when fetched)
    - durationMs: number
    - progress?: number (0..1)
    - status?: 'pending' | 'running' | 'complete' | 'paused' | 'error'
    - agentType?: 'orchestrator' | 'main' | 'leaf'
    - assigneeId?: Id<'users'>
    - icon?: string
    - color?: string
    - sequence?: 'parallel' | 'sequential'
    - description?: string
    - inputTokens?: number
    - outputTokens?: number
    - phaseBoundariesMs?: number[]   (relative to task start)
    - retryOffsetsMs?: number[]      (relative to task start)
    - failureOffsetMs?: number       (relative to task start)

UI Defaults
- Agents dashboard defaults to the Tasks tab (so users click into a task to view its timeline details).
- Calendar and Documents Home Hubs now use a shared unified pill group: Documents | Calendar | Agents (+ Timeline coming soon).
- AI Chat Panel now includes an "Orchestrator" toggle (persisted) that, when enabled and a document is focused, routes the send action to convex/agents/orchestrate.run. The run creates/updates an Agent Timeline for the document and returns a result plus timelineId. Assistant messages show a "View in Agents Timeline" link.
- Agent Timeline header adds a "Run Orchestrator" button that triggers convex/agents/orchestrate.runOnTimeline using the prompt field as the goal. Live status and token metrics stream into the same timeline via node.start/end events.


Visual Parity Details
- Timeline header shows a wall-clock row and evenly spaced columns.
- Current time line is rendered as an accent vertical rule and updates every 500ms.
- Running tasks display animated loading stripes (CSS repeating-linear-gradient + keyframes) over the bar.

Recent Enhancements (Mini timeline + Execution bars)
- Mini timeline view: added subtle time ticks and a live “now” line; compressed to 3 stacked lanes (orchestrator | mains | hot sub-steps). Header now supports fully interactive scrub-to-preview with a tooltip.
- Execution bars: dynamic phase separators driven by task.phaseBoundariesMs; inner progress-fill overlay shows predicted vs actual; non-janky running stripes via .execution-bar.running::after; inline ETA label.
- Retry/error markers: rendered from task.retryOffsetsMs and task.failureOffsetMs; error state also uses .execution-bar.error.
- Popovers: hover delay + pin-on-click; keyboard: Esc closes, Enter focuses primary action; richer metrics (queue time, ETA, token usage, output size) when available.
- Task cards: added compact metrics row (duration, agent count, last update, SLA/priority pill), and a one-line final-output summary. Deep links (#task-<id>) preserved.
- Alternatives: micro‑gantt sparkline per card (concurrency density and predicted vs actual), plus a compact Table layout (agent, start, duration, ETA, state) with tiny inline bars.


    - outputSizeBytes?: number
    - elapsedMs?: number
    - startedAtMs?: number
    - order?: number
    - createdAt: number
    - updatedAt: number
  - agentLinks
    - timelineId, sourceTaskId, targetTaskId, type?, createdAt

- Functions (convex/agentTimelines.ts)
  - listForUser(): list of timelines for current user
  - createForDocument(documentId, name)
  - getByTimelineId(timelineId) => { baseStartMs, tasks[], links[] } with offset normalization
  - addTask(timelineId, name, durationMs, startOffsetMs?, ...optional meta)
  - updateTaskMetrics(taskId, { progress?, status?, startedAtMs?, elapsedMs?, outputSizeBytes?, inputTokens?, outputTokens?, assigneeId?, phaseBoundariesMs?, retryOffsetsMs?, failureOffsetMs? })
  - exportSnapshot(timelineId, includeReport?, includeIoPairs?) => { timeline: { timelineId, name, baseStartMs, tasks[], links[] }, report?, ioPairs? } (tasks include phaseBoundariesMs/retryOffsetsMs/failureOffsetMs)


Interaction Model
- Time model: absolute start = baseStartMs + startOffsetMs. Bars positioned using pxPerMs scaling.
- Real-time sync: mutations patch tasks; components subscribe via useQuery(getByTimelineId).
- Parity features:
  - Hover popover for timeline bars (AgentPopover): title, type badge, status, progress; anchored to bar element.
  - Tasks hover overlay: preview output, actions (View Timeline, Open Full View, Accept, Reject).
  - Full View bottom panel: header actions (Assign, Re-run, Download), left content (timeline text/output), right output pane.

UI/UX Details
- Popovers: fixed-position, portal to body; constrained to viewport; exact badge coloring mirrored via CSS (.badge-orchestrator/main/leaf).
- Micro-interactions: hover elevation on bars/cards; hover overlay on task cards; optimistic action feedback via immediate UI change then Convex update.
- Navigation: UnifiedHubPills provides Documents | Calendar | Agents in the top bar (Calendar hub respects #calendar and #calendar/agents). Timeline pill is present but disabled for now; can be enabled later.

Testing
- src/test/AgentDashboard.test.tsx
  - Renders dashboard, switches tabs, asserts key UI elements
  - Replaced brittle snapshots with targeted assertions
- Schema-aware search + timeline mapping
  - src/test/Plan.research.schemaArgs.test.ts ensures web.search steps include intent and schemaGenerator (grok) or pass through provided schema
  - src/test/StructuredToTimeline.test.ts validates mapping a structured result into tasks/links similar to convex/agents/timelineMock.ts
- Orchestrator self-conducting (dynamic spawn + real registry shape)
  - src/test/Orchestrator.selfConducting.research.test.ts exercises dynamic spawn via eval with fully stubbed tools (no network)
  - src/test/Orchestrator.selfConducting.realTools.test.ts uses the real registry shape (web.search, answer, structured) with network mocked at module boundaries (linkup, openai); asserts spawned agents and that web.search was invoked; optionally calls Grok 4 fast to judge output quality if OPENROUTER_API_KEY is present.
- src/test/Orchestrator.live.e2e.test.ts runs a real end-to-end orchestrator flow against live providers (Linkup + OpenRouter/OpenAI). It is gated and skipped by default; enable with LIVE_E2E=1 and set LINKUP_API_KEY plus either OPENROUTER_API_KEY or OPENAI_API_KEY. Uses a simple graph (search -> answer), 120s timeout.
- Other tests left untouched; targeted run used for verification (npx vitest run -t AgentDashboard --run)

Constraints/Notes
- Assign action uses a prompt to input assigneeId, then updateTaskMetrics({assigneeId}). UI for assignee selection can be upgraded later to a mini popover with user list.
- Re-run action resets status to 'running', progress 0, startedAtMs now.
- Download action exports current task text (description/output) as a JSON file.

Future Enhancements
- Popover content can include metrics (elapsed, tokens) and secondary fields from agentTasks when available.
- Full-view can embed a mini timeline for the single task and its children.
- Replace assign prompt with a user-search popover.
- Add highlight/scroll-to behavior from Tasks → Timeline using a custom event.

Roadmap View
- Concept: A master, user-centric timeline driven by progress/changes over time (not just agent runs).
- Purpose: Weekly, monthly, quarterly, annual and YoY analysis to show what was done, domains touched, frequency, and trends.
- Philosophy: "You are what you repetitively perform" — surface domains the user reinforces into their default state.
- UI: UnifiedHubPills includes an enabled Roadmap pill; route is #roadmap and event is navigate:roadmap.
- Component: src/components/timelineRoadmap/TimelineRoadmapView.tsx provides mocked slices (week/month/quarter/year) with domain chips and progress bars.
- Reuse: Leverage existing chips, badge styles, and layout primitives; later, integrate Convex to compute slices from tasks/events/agents.



Task Card Parity (Dashboard)
- Component: src/components/agentDashboard/AgentTasks.tsx
- Structure mirrors prototype:
  - .task-card (role=button, tabindex=0, aria-label)
  - .task-header → .task-title (icon, title, .agent-type-badge "auto") + .task-meta (status with .status-dot, relative time)
  - .mini-timeline → multiple .mini-agent-row with .mini-execution-bar (absolute positioned bars with hex-alpha backgrounds)
  - .task-output (label + <pre> with final output preview)
  - .task-actions → .task-metrics (⏱, 🤖, 📊) + hint text
  - .hover-card overlay (title, subtitle, output, actions: View Scaffold, Open in Timeline, Open Full View)
- Interactions:
  - Single click: opens scaffold (onViewTimeline)
  - Double click: opens bottom Full View (onOpenFullView)
  - Keyboard: Enter = Full View; Space = Scaffold
- Styles: added to src/styles/agentDashboard.css (scoped under .agent-dashboard) to match spacing, borders, hover elevation, and colors from prototype.
- Accessibility: aria-label guides keyboard usage; status text + dot visible; overlay buttons stopPropagation for correct action routing.


Timeline Container Parity
- Component: src/components/agentDashboard/AgentTimeline.tsx
- Matches prototype structure and behaviors:
  - Shell: .timeline-shell with .timeline-controls at top containing action buttons and a live status badge ("Pipeline Active • N agents running").
  - Two-pane layout: .timeline-container with left .agent-hierarchy and right .timeline-chart. Scroll positions are synchronized.
  - Agent Hierarchy: .hierarchy-header ("Agent Scaffold" + + Add Agent button), groups for orchestrator and each main agent, optional .sub-agent rows. Status dots reflect pending/running/complete/error.
  - Time Header: .timeline-header includes .time-scale and .time-units labeled in mm:ss at 30s intervals with a .now highlight near the current wall-clock.
  - Current Time: .current-time-line positioned as a percentage of the 10-minute window (0–600s).
  - Rows: .timeline-rows with .timeline-row.main-row for orchestrator and main agents, and .timeline-row.sub-row for leaves. Absolute-positioned .execution-bar with gradient background and border color derived from agent color/type.
  - Parallel groups: each bar renders a small L{n} level badge computed from links (topological level) to visualize fan-out/fan-in batches.
  - Popover: Hover over bars shows AgentPopover with icon, type badge, status, and progress.
- Data model mapping:
  - Uses baseStartMs + startOffsetMs for positioning. Default window mode is Fit tasks; Fixed 10m and Center now are selectable options.
  - Groups by agentType (orchestrator, main, leaf). Sub-agents linked via parentId when available.
- Styles: Added parity CSS to src/styles/agentDashboard.css under the "Timeline container" section with class names matching the prototype.
- Accessibility: Status badge uses role=status and aria-live=polite; buttons are standard <button> with clear labels.
- Unified Sidebar Integration
  - Mini calendar preview popovers are constrained within the sidebar to avoid overlaying the timeline.
  - Sidebar Upcoming list uses compact rows; no z-fighting with timeline due to z-index scoping under the sidebar container.
  - New: Minimal retract/expand handle on the sidebar; state persists via localStorage key "unifiedSidebar.open" and is shared across DocumentsHomeHub and CalendarHomeHub (AgentDashboard/Timeline).




Agents Module Extraction & Bounded Control Flows
- New top-level folder: /agents (framework-agnostic)
  - /app/cli.ts: run demo scenarios end-to-end (requires tsx/ts-node in dev)
  - /app/demo_scenarios: task_spec_*.json, seed_notes.md, sample_page.html
  - /core: plan.ts (pure planner), execute.ts (orchestrator), memory.ts (ephemeral KV/docs), trace.ts (JSONL logs), eval.ts (light asserts)
  - /tools: search.ts (local search), fetchUrl.ts (local/http fetch)

  - /tools: openai.ts (answer/summarize via OpenAI SDK)
  - /data: contextStore.ts (ContextStore interface; Convex and in-memory impls)

OpenAI & Web Search Providers
- LLM tools (answer/summarize) use OpenAI-compatible chat.completions (OpenRouter supported via OPENROUTER_API_KEY)
- Schema-aware web.search:
  - If args.schema is omitted, Grok 4 fast synthesizes a task-suited JSON Schema (draft-07)
  - Linkup runs with outputType=structured and depth=standard using that schema
  - Callers can supply args.schema to override; args.intent helps tailor the schema per task
- Env:
  - OPENROUTER_API_KEY (preferred for Grok 4 fast), OPENAI_API_KEY fallback, OPENAI_BASE_URL optional (/v1 normalized), OPENAI_MODEL optional
- When AGENTS_DATA=convex and CONVEX_URL provided, search.ts prefers ConvexContextStore for:
  - documents:getSearch, documents:getById, calendar:listAgendaInRange, agentTimelines:getByDocumentId
- CLI wires the provider automatically and passes it through execute context for tools to use.

Default OpenRouter site URL
- When OPENROUTER_API_KEY is set, HTTP-Referer defaults to https://nodebench-ai.vercel.app/ (can be overridden via OPENROUTER_SITE_URL). This is used for OpenRouter ranking attribution in agents/tools/openai.ts, agents/tools/structured.ts, and convex/rag.ts.

Principles
- Bounded control flows: explicit Plan (groups -> steps) with clear inputs/outputs.
- Separation of concerns: plan (decision) vs execute (effects) vs tools (leaves) vs memory (state) vs trace (observability).
- Deterministic demos: stub tools avoid external network by default; easy to swap with real adapters.

Integration Notes
Multi‑agent (leaf agent scaffold)
- Orchestrator: agents/core/orchestrator.ts implements a high‑level supervisor that spawns specialized leaf agents as bounded Plans and coordinates their outputs.
- Leaf agents: composed from existing tools (web.search, web.fetch, answer, summarize, structured) via Plans executed by executePlan.
- Memory model: each leaf uses its own InMemoryStore; orchestrator aggregates artifacts and returns a final synthesized result.
- CLI integration: when a TaskSpec has type="orchestrate", cli.ts routes to orchestrate() instead of makePlan/executePlan.
- Demo: agents/app/demo_scenarios/task_spec_multi_agent_scaffold.json.

- Logs: agents/app/log/scratchpad.md records inter-agent channels and graph orchestration outcomes.
- Server action: convex/agents/orchestrate.ts runs the orchestrator under Convex Node actions and writes to agentTimelines.
- Topological scheduler: orchestrator computes indegree/adjacency from edges and executes ready nodes in parallel batches (true parallel groups).
- Dynamic branching: new node kind "eval" returns { pass, addNodes?, addEdges? } via structured tool; when pass=false, nodes/edges are inserted at runtime and scheduled.
- Metrics & streaming: tools capture elapsedMs and token usage; Convex action streams node.start/node.end to update task status/timing during the run and writes tokens after completion.
- Structured outputs: structured tool uses function calling when available with strict parameters and falls back to JSON mode; local validator prunes extras and fills required keys.

- New actions for timeline mocks:
  - convex/agents/timelineMock.ts
    - generateFromStructured(documentId, name?, prompt, schema?) → calls agents/tools/structured with a strict JSON Schema to produce {agents[], timeline[]} and applies them to agentTimelines.
    - generateFromWebSearch(documentId, name?, query, intent?, schema?) → research → web.search (schema via Grok) → mapStructuredToTimeline → applyPlan to render a live, data‑driven timeline.
    - seedDeterministicMock(documentId, name?) → writes the exact mock hierarchy/timeline without model calls (10‑minute window), updates statuses to match the example.

- Graph schema: taskSpec.graph with nodes (id, kind, label?, prompt?) and edges; orchestrator substitutes {{channel:<nodeId>.last}} and {{topic}} in prompts.

- Existing Convex agents (convex/aiAgents.ts, convex/agents/lib/*) remain intact.
- Server code may import from /agents/core to reuse planner/executor and supply Convex-aware tools.
- Frontend remains unchanged; this module is for demos, CLI, and future server reuse.

Testing Guidance
- Add small integration tests that import /agents/core/plan and /agents/core/execute with stub tools.
- For local smoke, run: npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_1.json


Scaffold Fallback
- To ensure the Agent Timeline always demonstrates the intended hierarchy when no Convex data is available, a static scaffold is provided:
  - File: src/components/agentDashboard/scaffoldData.ts
  - Exports: `researchScaffold` (static JSON) and `toTimelineData()` (maps to { baseStartMs, tasks[], links[] })
  - AgentTimeline consumes this as a fallback: `const tasks = data?.tasks ?? scaffold.tasks;`

Enhancements (Scaffold toggle, window modes, seeding)
- Data Source select in AgentTimeline controls: Auto | Convex | Scaffold. Auto prefers Convex when available; Scaffold forces the demo scaffold even if live data exists.
- Time Window select: Fixed 10m | Fit tasks | Center now. Fit expands window to min/max task offsets (+10% padding). Center now keeps a 10m window centered on current wall-clock relative to baseStartMs.
- Seed from Scaffold button: Writes the scaffold tasks/links into Convex via agentTimelines.applyPlan so “Convex” and “Scaffold” views match. Persists selection via localStorage (agents.dataSource, agents.windowMode).

- Tests: src/components/agentDashboard/__tests__/AgentTimeline.scaffold.test.tsx verifies rendering and popover interaction using the fallback.


Tasks View: Hierarchy-aware layouts and mini timeline sync
- Layout selector (persisted at localStorage key agents.tasksLayout):
  - Grid (existing cards)
  - Grouped (Orchestrator full-width; each Main agent as a section header with its Sub-agents grouped below)
  - Tree (Expandable nested nodes built from links; inline card rendering)
- Mini timeline sync:
  - Cards render a mini 3-lane timeline (orchestrator, main, leaf) using the same windowMode as the full timeline (agents.windowMode) and baseStartMs.
  - Bars are positioned using startOffsetMs/durationMs relative to {windowStartMs, windowMs} computed exactly like AgentTimeline.
  - The agent responsible for the card is highlighted (its own bar; for Main cards, all descendant leaf bars are emphasized).
- Files:
  - src/components/agentDashboard/AgentTasks.tsx (layout selector, grouped/tree layouts, synced mini-timelines)
  - src/styles/agentDashboard.css (highlight styles, grouped/tree layout styles)
- Tests:
  - src/test/AgentTasks.layouts.test.tsx verifies Grouped and Tree layouts and highlights in mini timelines.



Updates (Dynamic Spawning + UI polish)
- Orchestrator emits graph.extend traces when eval nodes request additional work at runtime. Payload: { addNodes, addEdges }.
- Convex handler (convex/agents/orchestrate.ts runOnTimeline) listens for graph.extend and inserts tasks/links on-the-fly via agentTimelines.addTask/addLink. New tasks default to parent=orchestrator, agentType inferred (eval→main, else leaf), startOffsetMs≈now-baseStartMs.
- Streaming node.start/node.end continue to update status and elapsedMs.
- Fallback spawn: If a node.start/node.end arrives for an unknown node (no prior plan applied and no graph.extend yet), runOnTimeline now creates a task on-the-fly with:
  - agentType inferred from node id: orchestrate→orchestrator, main→main, else leaf
  - name "Orchestrator/Main/Leaf: <topic|goal>" when available; fallback to node id
  - parent set to orchestrator when applicable
  - startOffsetMs≈now-baseStartMs; status transitions to running/complete accordingly
- Header parity: AgentTimeline left header shows "Agent Scaffold" when viewing the demo source, matching prototype wording.
- Prompt planner: startFromPrompt now uses Grok (OpenRouter) by default and offers a model toggle in the UI:
  - Default: If OPENROUTER_API_KEY is set → Grok via OpenRouter generates a structured step plan (parallel groups) mapped to timeline tasks/links. Override model via OPENROUTER_MODEL.
  - Toggle: A "Model" select in AgentTimeline controls lets you choose Grok (OpenRouter) or OpenAI at send time; selection persists in localStorage (agents.planner).
  - Fallbacks: If OpenRouter is not configured, it falls back to OpenAI when OPENAI_API_KEY is present; otherwise to a heuristic planner (agents/core/plan). The old deterministic 3-node local stub is removed.


- UI: .agent-name now clamps with ellipsis to prevent overflow; task metrics now bind to workflow data:
  - ⏱ uses elapsedMs (fallback durationMs)
  - 🤖 counts immediate children from links
  - 📊 uses task.progress (fallback elapsedMs/durationMs)



Final Output Panel + UnifiedEditor (Sep 24, 2025)
- Final Output location: The Final Output panel appears directly below the Timeline container. The Run History panel appears below the Final Output panel.
- Editor integration: The Final Output panel embeds UnifiedEditor bound to the timeline's documentId. The editor auto-creates the document when missing and seeds content from latestRunOutput only when the doc is truly empty (whitespace/empty-paragraph). Once content has ever existed, automatic reseeding is disabled to respect intentional clears.
- Restore from Final Output: The panel header includes a "Restore" button. When clicked and Final Output exists, the editor replaces its content from the latestRunOutput snapshot.
- Save as Final Output: The panel header includes a "Save as Final Output" button. It exports the editor's current plain text and updates convex/agentTimelines.setLatestRun, setting latestRunOutput while preserving latestRunInput. Success/failure is tosted inline.
- Server-side had-content flag: A server-side preference key (agentsPrefs) `doc.hasContent.<documentId>` is set to '1' after seeding or any edit, ensuring reseed gating is consistent across devices. A localStorage mirror is also maintained for immediate UX.
- Copy buttons: Copy respects the panel context: Copy (header) copies the Final Output snapshot; a separate Copy in Run History copies a specific run output.
- Tests: Existing tests continue to pass; add targeted tests later to cover restore/save interactions if needed.
