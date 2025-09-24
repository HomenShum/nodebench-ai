Folder Structure: Agents Dashboard & Convex Wiring

Key Paths
- convex/
  - agentTimelines.ts        # queries/mutations for timelines, tasks, links
  - schema.ts                # agentTimelines/agentTasks/agentLinks tables
- src/components/agentDashboard/
  - AgentDashboard.tsx       # header, timeline selector, tabs, bottom Full View
  - AgentTimeline.tsx        # left hierarchy, right timeline grid + bars + popover (shows L{n} level badges from graph links)
  - AgentTasks.tsx           # task cards grid, hover overlay actions
  - AgentPopover.tsx         # fixed-position popover anchored to timeline bars
- src/components/
  - AIChatPanel.tsx           # AI chat with model selector; now includes an Orchestrator toggle to route send to Convex orchestrator and link to Agents timeline

  - CalendarHomeHub.tsx      # uses UnifiedHubPills for Documents | Calendar | Agents
  - DocumentsHomeHub.tsx     # header replaced with UnifiedHubPills
  - timelineRoadmap/
    - TimelineRoadmapView.tsx  # mocked roadmap (week/month/quarter/year) slices and domain chips
  - MiniEditorPopover.tsx    # existing popover infra (not modified)
  - agenda/*                 # existing popover/hover components (reference only)
- src/components/shared/
  - UnifiedHubPills.tsx      # shared "Documents | Calendar | Agents | Roadmap" pill group
- src/styles/
  - agentDashboard.css       # scoped badge styles, helper chips/now-line
- src/test/
  - AgentDashboard.test.tsx  # dashboard rendering + tab switch assertions
  - CalendarAgentsNav.test.tsx # deep-link/nav (unchanged)
  - Plan.research.schemaArgs.test.ts # planner injects intent + schema flags for web.search
  - StructuredToTimeline.test.ts     # structured → timeline mapping similar to timelineMock

Components & Props
- AgentDashboard

Header Controls
- Both CalendarHomeHub and DocumentsHomeHub render UnifiedHubPills in TopDividerBar.left:
  - Documents → navigate:documents
  - Calendar → #calendar
  - Agents → #calendar/agents
  - Roadmap → #roadmap and navigate:roadmap (enabled)


Unified Sidebar
- Retractable mini calendar/upcoming column with a minimal edge handle.
- State persists via localStorage key "unifiedSidebar.open" and is shared across DocumentsHomeHub and CalendarHomeHub.

Defaults
- AgentDashboard default tab: tasks.

  - State: tab ('timeline' | 'tasks'), selected timelineId, fullViewTask
  - Data: useQuery(listForUser), useMutation(createForDocument), useMutation(updateTaskMetrics)
  - Renders: AgentTimeline | AgentTasks, and a fixed bottom panel when fullViewTask

- AgentTimeline
  - Props: { timelineId }
  - Data: useQuery(getByTimelineId)
  - UI: Left hierarchy (grouped by agentType), Right chart (grid + bars)
  - Popover: AgentPopover (isOpen, anchorEl, agent, onClose)
  - Also includes a "Run Orchestrator" button that triggers convex/agents/orchestrate.runOnTimeline using the prompt field as goal; live updates stream into the same timeline.


  - Controls: Data Source select (Auto | Convex | Scaffold), Time Window select (Fixed 10m | Fit tasks | Center now), Model select (Grok | OpenAI), buttons: "Seed from Scaffold", "Seed From Web", and "Download JSON" (full timeline snapshot). Model selection persists via localStorage (agents.planner).

- AgentTasks
  - Props: { timelineId, onOpenFullView?, onViewTimeline? }
  - Data: useQuery(getByTimelineId)
  - Actions: addTask (prompt), updateTaskMetrics (accept/reject)
  - Hover overlay: View Timeline, Open Full View, Accept, Reject

CSS
- agentDashboard.css (scoped)
  - Timeline container parity: .timeline-shell, .timeline-controls (+ .btn/.btn-primary), .timeline-container, .agent-hierarchy, .hierarchy-header/.hierarchy-title,
    .timeline-chart, .timeline-header, .time-scale, .time-units/.time-unit(.now), .current-time-line,
    .timeline-rows, .timeline-row(.main-row/.sub-row), .timeline-grid/.grid-column,
    .execution-bar(.pending/.running/.complete), .progress-indicator
  - Badges: .badge-orchestrator, .badge-main, .badge-leaf mirror prototype badges
  - Helpers: .chip, .now-line

Notes
- AgentPopover is a lightweight custom popover tailored for the agent timeline; portal-based and anchored to bars.
- Timeline supports window modes: Fixed 10-minute (0–600s), Fit tasks (auto-rescale to min/max task offsets with padding), and Center now (10-minute window centered on current time). Bars are positioned by baseStartMs + startOffsetMs relative to the current window.
- Assignee and Re-run logic flows through convex/agentTimelines.updateTaskMetrics.



Task Card Files
- src/components/agentDashboard/AgentTasks.tsx  # Renders .task-card per task (prototype parity)
- src/styles/agentDashboard.css                  # Provides .task-card, .mini-timeline, .hover-card, status dots, metrics

Notes
- Cards expose a11y roles and keyboard interactions to match prototype guidance.
- Hover actions map to: View Scaffold → onViewTimeline; Open Full View → onOpenFullView.



Agents (Extracted, Modular)
- agents/
  - app/
    - cli.ts                    # CLI runner for demo scenarios
    - demo_scenarios/
      - task_spec_1.json
      - task_spec_2.json
      - task_spec_multimodal_grok.json
      - task_spec_structured_from_caption.json
      - task_spec_multi_agent_scaffold.json
      - task_spec_orchestrate_graph.json

      - seed_notes.md
      - sample_page.html
  - core/
    - plan.ts                   # pure planner
    - orchestrator.ts           # supervisor that delegates to leaf agents (Plans)
    - execute.ts                # step executor over tools registry
    - memory.ts                 # ephemeral KV & doc store
    - trace.ts                  # JSONL trace logger
    - eval.ts                   # minimal validations
  - tools/
    - search.ts                 # schema-aware: Grok 4 fast synthesizes JSON Schema; Linkup structured search (standard depth)
    - fetchUrl.ts               # local/http fetch
    - openai.ts                 # OpenAI-backed answer & summarize tools
    - structured.ts             # OpenAI structured output (JSON Schema / function calling + local validator)
  - services/
    - linkup.ts                 # LinkupClient factory + structured search/profile helpers
  - mappers/
    - structuredToTimeline.ts   # pure adapter from structured result → {tasks, links}
  - test/
    - orchestrator.graph.test.ts                 # channel substitutions + topo order
    - orchestrator.eval-branch.test.ts           # dynamic branching: eval adds nodes/edges at runtime
    - Orchestrator.selfConducting.research.test.ts     # self-conducting orchestrator with stubbed tools (no network)
    - Orchestrator.selfConducting.realTools.test.ts    # real registry shape; linkup/openai mocked; optional Grok judge
  - app/log/
  - agents/
    - timelineMock.ts            # Actions to generate structured timeline & seed deterministic mock

    - scratchpad.md              # run notes: inter-agent channels, graph orchestration, structured outputs
  - convex/agents/
    - orchestrate.ts             # Convex action to run orchestrations server-side and write to agentTimelines (streams status)
  - data/
    - contextStore.ts           # ContextStore interface + Convex/InMemory implementations

Notes
- This directory is framework-agnostic and can be imported by Convex actions/queries or used via CLI.
- Keep DESIGN_SPECS.md in sync with any changes to this directory.


Additions
- src/components/agentDashboard/scaffoldData.ts  # Static research scaffold JSON + transformer for timeline fallback
- src/components/agentDashboard/__tests__/AgentTimeline.scaffold.test.tsx  # Snapshot/interaction tests for scaffold rendering


Updates: Tasks layouts and tests
- src/components/agentDashboard/AgentTasks.tsx now supports a persisted layout selector (Grid | Grouped | Tree). Grouped renders an orchestrator full-width section, then main-agent sections with sub-agent grids; Tree renders expandable nested nodes from links.
- src/styles/agentDashboard.css includes styles for:
  - .mini-execution-bar.highlight (emphasis for responsible agent)
  - grouped layout (.orchestrator-section, .group-header, .main-agent-card, .sub-agents-grid)
  - tree layout (.tree-view, .tree-node, .node-header, .task-card-inline)
- src/test/AgentTasks.layouts.test.tsx validates grouped/tree layouts and mini-timeline highlighting.

New visual enhancements (Sep 24, 2025)
- Mini timeline
  - Subtle time ticks and a live now-line; compressed to 3 lanes (orchestrator | mains | hot sub-steps).
  - Scrub-to-preview: header scrub updates a preview tooltip without committing selection.
- Execution bars
  - Dynamic phase separators from task.phaseBoundariesMs via .phase-sep; inner .progress-fill overlay indicates predicted vs actual progress; inline .eta-label.
  - Running stripes applied via .execution-bar.running::after; pending uses dashed borders; error class supported; retry/error markers rendered from task.retryOffsetsMs/failureOffsetMs.
- Alternatives
  - Micro-gantt sparkline per task card to convey concurrency density and predicted vs actual.
  - Table layout for power users with compact rows and tiny inline bars.
- Popovers
  - Hover delay + pin-on-click; richer metrics (queue time, ETA, tokens, output bytes); keyboard accessible (Esc to close).
- CSS additions
  - agentDashboard.css: added .execution-bar .phase-sep/.progress-fill/.eta-label, .retry-marker, .error-marker, and .scrub-tooltip
  - Maintains existing .badge-* and status dot styles.
- Tests
  - src/components/agentDashboard/__tests__/AgentTasks.interactions.test.tsx covers mini timeline ticks/now-line and Table layout toggle.
  - src/components/agentDashboard/__tests__/AgentTimeline.markers.test.tsx validates phase/retry/error marker rendering from backend fields.
  - src/components/agentDashboard/__tests__/AgentTimeline.scrub.test.tsx validates interactive scrub-to-preview tooltip appears.
  - All tests pass via `npm run test:run`.


Notes
- AgentTimeline uses scaffold fallback when Convex data is undefined/null to display the full hierarchy and timeline bars.


Enhancements (Dynamic graph extend + CSS truncation)
- Dynamic spawning:
  - agents/core/orchestrator.ts now emits trace "graph.extend" with addNodes/addEdges when eval branches expand the plan.
  - convex/agents/orchestrate.ts listens and calls agentTimelines.addTask/addLink to materialize new tasks/links mid-run.
  - Fallback: when node.start/node.end arrives for an unknown node (no pre-applied plan and no prior graph.extend), runOnTimeline creates a task on-the-fly (agentType inferred from id, name includes topic/goal) so the hierarchy and timeline grow live.

- UI polish:
  - src/styles/agentDashboard.css: .agent-name clamps long titles with ellipsis; prevents text from overflowing the hierarchy row.
  - src/components/agentDashboard/AgentTasks.tsx: task metrics derive from live data (elapsedMs/durationMs, children count, progress fallback).
  - Prompt planning providers: Default is Grok via OpenRouter when OPENROUTER_API_KEY is present (override model with OPENROUTER_MODEL). The UI exposes a Model select (Grok | OpenAI). Fallbacks: OpenAI (OPENAI_API_KEY) → heuristic planner (agents/core/plan). No more fixed 3-node stub.



Additions (Final Output + UnifiedEditor)
- src/components/UnifiedEditor.tsx
  - Integrated BlockNote + Convex ProseMirror sync for timeline documents.
  - Props used by AgentTimeline:
    - documentId: Id<'documents'>
    - seedMarkdown?: string (latestRunOutput)
    - autoCreateIfEmpty?: boolean (true in Final Output panel)
    - restoreSignal?: number (ticks to trigger reseed)
    - restoreMarkdown?: string (latestRunOutput)
    - registerExporter?: (fn) => void (returns { plain } for Save as Final Output)
- src/components/agentDashboard/AgentTimeline.tsx
  - Final Output panel renders UnifiedEditor above Run History.
  - Header actions: Copy, Restore (reseed from Final Output), Save as Final Output (convex.agentTimelines.setLatestRun), Collapse/Expand.
  - Run History panel moved below Final Output; each entry supports Copy and inline expand.
- convex/agentsPrefs.ts
  - getAgentsPrefs/setAgentsPrefs used to persist `doc.hasContent.<documentId>` = '1' for cross-device reseed gating.
- convex/agentTimelines.ts
  - setLatestRun(timelineId, input, output) updates latestRunOutput used to seed/restore editor.
