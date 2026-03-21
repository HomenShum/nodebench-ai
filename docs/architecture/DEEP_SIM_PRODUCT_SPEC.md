# NodeBench Deep Sim Product Spec

## Product Thesis

NodeBench is a decision workbench for CEOs, investors, founders, and operators working under uncertainty.

It should not behave like a vibe machine, a generic chatbot, or a theatrical simulation toy. It should turn messy source packets into a defensible next move by making the variables, scenarios, interventions, confidence, and evidence explicit.

The product goal is to match the narrative depth of a strong historical or strategic synthesis while exceeding it on reliability.

## One-Line Positioning

NodeBench helps users see which variables matter, which branches are plausible, which interventions change the slope, and which trajectories are actually compounding.

## Who It Is For

### CEO / Founder

Questions:
- Should we ship this feature now?
- Should we change pricing?
- Should we pursue this partner, investor, or distribution channel?
- Is our growth intrinsic or trust-assisted?

### Investor / Diligence Lead

Questions:
- What variables actually drive this company?
- What risks are not priced into the obvious story?
- Which intervention would most change the trajectory?
- Is this momentum compounding or narrative amplification?

### Operator / PM / Builder

Questions:
- What is drifting even though the workflow still completes?
- Which experiments improved the underlying slope?
- Which outputs are useful, reused, and retained?
- What should we do next week rather than debate abstractly?

## The Job To Be Done

Take a source packet, a target entity, and a high-stakes question. Return:
- a one-screen executive answer
- the top variables
- a bounded scenario tree
- ranked interventions
- confidence and dissent
- an evidence drawer
- a scorecard that can be checked later against reality

## Product Principles

1. Evidence before eloquence.
2. One screen should answer the practical question.
3. Every major claim should have provenance.
4. Confidence must be explicit.
5. Counter-models are mandatory, not optional.
6. Intervention tracking is first-class.
7. Forecasts must be scorekept later.
8. Trust and distribution effects must not be confused with intrinsic quality.

## What "Deep" Means In NodeBench

Every Deep Sim analysis should synthesize six layers:

| Layer | Core question | Output |
| --- | --- | --- |
| Event | What happened? | Claim graph with dated evidence |
| Actor | Who matters and why? | Entity graph and incentive map |
| Narrative | What story is each side telling? | Narrative map and audience framing |
| Constraint | What limits the available moves? | Variable registry with bounds |
| Scenario | What branches are plausible from here? | Three primary scenario cards |
| Intervention | What changes the slope? | Ranked intervention ladder |

## Reliability Layer

NodeBench only exceeds high-production-value essay or analyst content if the following are first-class objects in the system:

- `Claim`
- `Evidence`
- `Variable`
- `Assumption`
- `Scenario`
- `Intervention`
- `TrustNode`
- `Confidence`
- `Outcome`
- `Scorecard`

The minimum reliability requirements are:

1. Explicit claim graph.
2. Counter-model generation.
3. Variable registry with explicit weighting.
4. Intervention logging with observation windows.
5. Confidence accounting: known, inferred, speculative, narrative.
6. Forecast scorekeeping.
7. Trust graph modeling.
8. Consistent outcome taxonomy.

## Product Surfaces

### 1. Decision Workbench

Primary surface for the live demo and the day-to-day workflow.

Above the fold it shows:
- question
- best current answer
- top five variables
- best three actions
- confidence and source count

### 2. Deep Sim Mode

For scenario exploration and branch comparison.

The user can:
- vary assumptions
- compare scenario branches
- inspect counter-models
- examine trust-node effects
- review intervention sensitivity

### 3. Postmortem Mode

For calibration and learning.

The user can:
- compare prior memo vs reality
- see which variables moved
- inspect which assumptions failed
- record which intervention actually mattered
- update priors and scorecards

## Day-To-Day Workflow

### For a CEO or Founder

1. Drop in a source packet or select an existing company context.
2. Choose a workflow such as strategy, GTM, fundraising, or diligence.
3. Review the top variables and three scenarios.
4. Select the best-next-action path.
5. Export the memo to a doc, issue, or internal note.

### For an Investor

1. Load a company dossier, filing set, market packet, or transcript bundle.
2. Run the diligence workflow.
3. Review scenario cards, trust graph, and intervention map.
4. Inspect dissent and confidence.
5. Save the memo and reopen later for scorekeeping.

## Demo Flow For Tomorrow Morning

Use one concrete question. Do not demo the entire platform breadth.

Recommended live flow:

1. Load a company or product packet.
2. Ask one high-stakes question.
3. Show top variables.
4. Show three scenarios.
5. Show ranked interventions.
6. Open the evidence drawer.
7. End on the one-screen memo.

Spoken line:

"This is a decision workbench. It takes messy inputs, maps the variables, compares the branches, and tells you the clearest next move with evidence and confidence."

## Architecture

### Layer A: Ingest And Structure Reality

Inputs:
- articles
- transcripts
- filings
- benchmark outputs
- workflow traces
- user notes
- market and social signals

Outputs:
- entity graph
- claim graph
- timeline
- variable registry
- intervention registry
- trust graph

### Layer B: Simulate Plausible Futures

Simulation responsibilities:
- instantiate agent roles
- vary incentives and assumptions
- generate bounded scenario branches
- surface narrative spread and trust propagation
- generate branch summaries suitable for executive review

### Layer C: Judge And Calibrate

Judgment responsibilities:
- compare alternate hypotheses
- evaluate evidence coverage
- assign confidence
- record what would falsify the view
- compare later outcomes against prior predictions

### Layer D: Deliver Decisions

Decision deliverables:
- executive memo
- scenario cards
- intervention ladder
- evidence drawer
- scorecard
- best-next-action tree

## Benchmark Ladder

NodeBench should prove quality on four layers, in order:

| Tier | Benchmark | Purpose | Official source |
| --- | --- | --- | --- |
| 1 | SWE-bench | Coding-agent reliability | https://github.com/SWE-bench/SWE-bench |
| 2 | WebArena | Browser workflow reliability | https://github.com/web-arena-x/webarena |
| 3 | OSWorld | Computer-use reliability | https://github.com/xlang-ai/OSWorld |
| 4 | Internal golden sets | Domain-specific decision quality | repo-local fixtures |

### Internal Golden Set Packs

Create four packs first:
- CEO strategy packet
- Investor diligence packet
- Founder / GTM packet
- Trend / creator packet

Each pack should include:
- frozen source packet
- target question
- golden memo
- variable list
- intervention list
- scenario tree
- rubric
- later-known outcome for backtesting

### Backtesting Method

Use time-split evaluation.

At `T0`:
- freeze only what was knowable then
- generate variables, scenarios, interventions, and memo

At `T1`:
- compare against later reality
- score variable recall
- score scenario usefulness
- score intervention usefulness
- score recommendation clarity
- score outcome alignment
- score confidence calibration

## Coding Agent Implementation Prompts

The working prompt set should be narrow and repeatable.

### Prompt 1: Benchmark Harness

"Build a reproducible benchmark harness for NodeBench Deep Sim. Support golden input packets and golden output memos. Score traceability, variable completeness, counter-model quality, intervention usefulness, and final recommendation clarity. Emit machine-readable JSON and a markdown report. Keep evaluation deterministic wherever possible. Support SWE-bench, WebArena, OSWorld, and NodeBench internal golden sets. Fail CI if benchmark scores regress."

### Prompt 2: Core MCP Tools

"Implement typed MCP tools for `build_claim_graph`, `extract_variables`, `generate_countermodels`, `run_deep_sim`, `rank_interventions`, `score_compounding`, and `render_decision_memo`. Each tool must emit structured JSON, provenance, confidence, and a `whatWouldChangeMyMind` field. Keep extraction, judgment, and rendering as separate layers. Add tests and golden fixtures."

### Prompt 3: Eval-Fix Loop

"Given failing benchmark cases, inspect benchmark JSON, logs, traces, and rendered outputs. Find the root cause, implement the smallest safe fix, rerun the benchmark, and summarize what failed, why it failed, what changed, and whether the score improved. Do not edit benchmark targets unless explicitly instructed."

### Prompt 4: Memo Renderer

"Build a production-grade memo renderer for CEO, investor, and founder workflows. Show a one-screen summary first. Keep top variables visible immediately. Show at most three scenario cards in the primary view. Keep ranked interventions above the fold. Include a source drawer and confidence view. Optimize for speed and executive legibility."

### Prompt 5: Landing Page

"Build a premium landing page for NodeBench with a reduced, high-trust aesthetic. Keep the `frontend-slides` discipline of exact viewport fitting and show-don't-tell sections. Use the restraint of modern product surfaces. The hero must answer what it is, who it is for, and what users get. Add a live example section, variable map, scenario cards, intervention ladder, and evidence drawer. Optimize first for executive clarity, second for beauty."

## Distribution Wedge

The lowest-friction wedge is not a new standalone behavior. It is a repo-local and desktop-local decision copilot inside workflows users already have:
- Claude Code and other coding-agent desktops
- MCP-compatible clients
- GitHub issues, PRs, releases, and status pages
- internal docs and executive memos

The wedge message:

NodeBench fits into the workflow people already have today: IDE, repo, PR, benchmark page, changelog, and executive memo. It helps them make better next decisions with sharper evidence.

## Safe Continuous Operation

NodeBench should use bounded autonomy, not unrestricted autonomy.

Allowed pattern:
- scheduled runs
- scoped subagents
- hook-based logging and policy checks
- draft changelog updates
- human approval for sensitive actions

Disallowed pattern:
- blanket personal environment access
- open-ended self-modification without review
- automatic deploys and production pushes

## Acceptance Criteria

The product is ready for the tomorrow-morning demo when:
- one workflow can run end-to-end on a real packet
- the output is legible above the fold in under 15 seconds
- every major claim has evidence access
- the output names three scenarios and three interventions max
- the user can see confidence and dissent immediately
- the memo can be exported into an existing workflow artifact

## Reference Links

- Claude Code hooks: https://docs.anthropic.com/en/docs/claude-code/hooks
- Claude Code subagents: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- Claude Code MCP: https://docs.anthropic.com/en/docs/claude-code/mcp
- GitHub Actions scheduling: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run
- GitHub workflow status badges: https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/monitoring-workflows/adding-a-workflow-status-badge
- GitHub automatic release notes: https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes
- SWE-bench: https://github.com/SWE-bench/SWE-bench
- WebArena: https://github.com/web-arena-x/webarena
- OSWorld: https://github.com/xlang-ai/OSWorld
- SEC EDGAR APIs: https://www.sec.gov/edgar/sec-api-documentation
- Hacker News API: https://github.com/HackerNews/API
