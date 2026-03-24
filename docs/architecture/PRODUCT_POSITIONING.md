# NodeBench Product Positioning — Final Framework

**Date:** 2026-03-21
**Status:** Refined positioning. Two products, two utilities, no ambiguity.

---

## The Market Shift (March 2026)

The agent landscape has fundamentally changed. Cursor has async background agents. Windsurf has local preview + element/error handoff into its agent loop. Claude Code has subagents and hooks. OpenAI is pushing long-running steerable coding agents. OpenClaw runs on Discord/Telegram with self-modifying skills. NemoClaw exists.

"An agent that can act" is table stakes. The moat has moved.

**What's NOT table stakes:** Sharp judgment under uncertainty. Decision support that maps variables, scenarios, and interventions. QA assurance that produces evidence-backed verdicts.

---

## Two Products, Two Utilities

### NodeBench — Decision Intelligence Layer

**Use when:** "What matters, what might happen, what should I do next?"

Not another agent that "does work." The system that helps decide what matters, what may happen next, what variables drive the outcome, and what intervention most changes the slope.

Owns: multi-angle memo, scenario map, variable graph, intervention ladder, confidence view, compounding score.

Users plug it into Claude Code, OpenClaw, or their own workflow when they need sharp judgment rather than another autonomous worker.

### TA Studio — QA Assurance & Fix-Loop Layer

**Use when:** "Did this workflow actually work, where did it fail, and what do I fix now?"

Not generic QA automation. The system that runs the workflow locally, captures traces/screenshots/logs, compresses the failure into a precise evidence bundle, and feeds that back into Claude Code or OpenClaw so the agent can fix the right thing with minimal token waste.

Wins by being the trustworthy QA loop inside the agent IDE, while NodeBench wins by being the intelligence layer above it.

---

## Practical Real-Time Use Cases

### NodeBench Use Cases

**CEO: Deciding what to do next**
- Input: Board notes, sales calls, product metrics, competitor updates, strategy memos
- Ask: "What are the top 3 variables affecting growth this quarter, what are the most plausible scenarios, and what should we do next?"
- Output: Ranked variable map, 3 scenario cards, intervention list, signal-vs-noise memo
- Value: Clear decision surface instead of disconnected information

**Investor: Evaluating a startup**
- Input: Pitch deck notes, founder background, product demo notes, market comps, public traction signals
- Ask: "Is this company actually compounding or just good at storytelling?"
- Output: Founder/product trajectory view, trust/distribution variables, key risks, intrinsic vs network-amplified assessment, highest-leverage diligence questions
- Value: Sharper diligence, better sense of what changes the slope

**Founder: Figuring out why growth is stuck**
- Input: Product feedback, churn notes, onboarding drop-off, landing page copy, feature releases
- Ask: "Why are we not converting and what should we test next?"
- Output: Friction map, likely root variables, ranked intervention list, experiment plan
- Value: Concrete next move rather than generic advice

**Product/GTM team: Planning a launch**
- Input: Launch copy, competitor screenshots, user personas, market notes, prior campaign outcomes
- Ask: "How should we position this and what could go wrong?"
- Output: Narrative angles, likely market reactions, scenario branches, recommended adjustments
- Value: More informed launch strategy with clearer assumptions

**Artist/Creator: Adapting without losing identity**
- Input: Recent content, audience response, collaborator network, trend signals
- Ask: "How do I adapt to what people want without becoming generic?"
- Output: Audience clusters, resonance signals, derivative vs distinct analysis, compounding collaboration/theme opportunities
- Value: Creative evolution becomes intentional

### TA Studio Use Cases

**Engineer using Claude Code locally**
- Input: Broken workflow in Claude Code
- Output: Screenshots, traces, logs, verdict, failure summary with likely files and root cause
- Value: Faster, more precise fixes with less token waste

**PM/QA lead validating a release**
- Input: 3 critical workflows (login, checkout, settings save)
- Output: Judged report with verdict, screenshots, trace bundle, logs, rerun history
- Value: Release confidence with evidence instead of vague status updates

**Founder testing a staging build**
- Input: Staging URL + 3 workflows
- Output: Simple dashboard: what passed, what failed, where it failed, fix priority
- Value: Real QA coverage without a full QA team

**Design/UX quality review**
- Input: App flows
- Output: Failure-and-friction package: not just what broke, but what's confusing, overloaded, or poorly structured
- Value: Product quality, not just bug catching

**Benchmarking workflow against baseline Claude Code**
- Input: Same task run twice (raw Claude Code vs Claude Code + TA Studio)
- Output: Comparison table: success rate, reruns, time to verdict, evidence completeness, fix quality
- Value: Prove whether your workflow is actually better

---

## NodeBench Expected Outputs

Every NodeBench analysis should return:

1. One-page memo (best current answer + recommendation)
2. Top variables (ranked, clickable, source-backed)
3. Scenario cards (base/bull/bear, max 3)
4. Intervention ladder (ranked actions with expected impact, confidence, owner, time horizon)
5. Confidence/evidence drawer (sources, provenance, dissent, timeline)
6. Next-step recommendation

## TA Studio Expected Outputs

Every TA Studio run should return:

1. Pass/fail verdict
2. Screenshots at each step
3. Traces (network, console, DOM)
4. Logs (server, client)
5. Compact failure bundle
6. Likely root-cause area
7. Rerun result after fix

---

## Architecture: Platform Agent → Local Agent Bridge

NodeBench is NOT another agent. It is the analysis layer that coordinates other agents.

### Flow:

1. NodeBench platform agent helps user connect their local agent
2. Guides setup: repos, files, URLs, data sources, docs, metrics, notes, external tools
3. User's local agent does private/local work
4. NodeBench receives only structured outputs, artifacts, summaries
5. NodeBench runs: variable extraction, scenario generation, intervention ranking, compounding analysis, memo rendering
6. User sees: one-page answer, top variables, scenarios, interventions, evidence drawer

---

## Pricing Model

### NodeBench sells: Decision Leverage (cognitive scale)

"Pay more to see more, compare more, track more, and decide better."

**Free / Personal**
- 1 workspace, limited source ingestion, limited memo runs
- No/light deep sim, local agent integration only
- Watermark or limited export
- Goal: adoption, proof, easy sharing

**Pro ($29-49/mo)**
- 3-10 workspaces/projects
- More source ingestion, persistent tracking
- Intervention history, monthly deep sim credits
- Exports, premium memo rendering
- Main revenue tier

**Team / Investor / Executive ($99-199/seat/mo)**
- Shared workspace, team collaboration
- Tracked entities, alerts
- Deeper simulation, report exports
- Admin controls, custom connectors, white-glove onboarding

**Enterprise (custom)**
- SSO, private deployment/hybrid
- Secure connector setup, custom MCP integrations
- Long retention, governance, audit trails

**Usage-based add-ons:**
- Extra deep sim credits
- Extra tracked entities
- Premium report exports
- Custom connector setup
- Ongoing monitoring/alerting

### TA Studio sells: Execution Assurance (execution scale)

"Pay more to run more, faster, with more evidence."

- Runs, emulator capacity, concurrency
- Evidence storage, premium integrations, team seats

---

## Interface Design

### Core Principle

Perplexity above the fold (immediate answer). Bloomberg after the fold (density). Linear in the workflow (saved views, keyboard shortcuts). Notion in the detail layer (composable, collapsible). Vercel in the navigation (focused, consistent sidebar).

### Design Hierarchy

1. **Level 1: Answer** — One paragraph. One recommendation.
2. **Level 2: Variables** — Top 5 ranked variables.
3. **Level 3: Scenarios** — 3 scenario cards max.
4. **Level 4: Interventions** — Ranked actions with expected impact.
5. **Level 5: Evidence** — Source drawer, provenance, dissent, timeline.

### Layout Structure

```
+--------------------------------------------------------------------------+
| Top bar: Search / Ask NodeBench / Workflow preset / Share / Export        |
+--------------+--------------------------------------+--------------------+
| Left rail    | Main answer canvas                   | Right evidence     |
|              |                                      |                    |
| Workspaces   | Question                             | Sources            |
| Saved views  | "Should we raise now or wait?"       | Variable list      |
| Companies    |                                      | Counter-models     |
| Products     | Best current answer                  | Intervention log   |
| Creators     | Clear paragraph + recommendation     | Timeline           |
| Recent runs  |                                      |                    |
|              | Top variables                        |                    |
|              | 1. distribution quality              |                    |
|              | 2. trust-node access                 |                    |
|              | 3. retention trend                   |                    |
|              |                                      |                    |
|              | Best next actions                    |                    |
|              | 1. run pilot with X                  |                    |
|              | 2. tighten landing page proof        |                    |
|              | 3. test pricing narrative            |                    |
|              |                                      |                    |
|              | Scenario cards                       |                    |
|              | Base / Bull / Bear                   |                    |
+--------------+--------------------------------------+--------------------+
```

### First Screen: Decision Snapshot

- Question
- Best answer (one paragraph)
- Top variables (5 max)
- Best next action
- Confidence score
- Number of sources

Do NOT start with charts, graphs, or dashboards. Start with answer, then action, then confidence.

### Workflow Presets (top bar)

- Investor diligence
- CEO strategy
- GTM planning
- Product launch
- Creator growth
- Competitive analysis

### Aesthetic

- Dark graphite background, slightly warm black panels
- Muted gray structure, one blue accent
- Subtle green/amber for confidence states
- Clean sans typography (Manrope)
- Very restrained borders, almost no shadows
- Zero decorative gradients except maybe hero
- Feels: quiet, sharp, expensive, deliberate, information-rich without chaos

### 5 Core Views (ship these only)

1. Decision Snapshot
2. Variables
3. Scenarios
4. Interventions
5. Evidence

### What NOT to look like

- Giant graph database UI
- Generic chat window
- Cluttered BI dashboard
- Pseudo-terminal everywhere

### Landing Page (above fold)

**Headline:** Make better decisions with variables, scenarios, and evidence.

**Subhead:** NodeBench turns messy inputs into a clear next move -- with ranked variables, scenario branches, intervention options, and source-backed confidence.

**Primary CTA:** Run a Decision Packet

**Secondary CTA:** See Example Analysis

**Preview image:** Shows question, answer, variables, intervention ladder, source drawer. NOT a generic hero illustration.

---

## Wedge Copy

**For founders/CEOs:** NodeBench helps you turn messy inputs into clear next decisions.

**For investors:** NodeBench helps you separate hype from compounding trajectory.

**For teams:** NodeBench helps your local agents feed a shared intelligence layer that maps variables, scenarios, and interventions over time.

---

## Kill Criteria

- If fewer than 5 teams using team features by day 60: pivot positioning
- If time-to-value exceeds 60 seconds consistently: simplify onboarding
- If users default to ChatGPT for the same questions: the answer quality is not differentiated enough
- If no one shares a Decision Packet in first 30 days: shareability failed

---

## The Honest Risk

The biggest risk is that NodeBench becomes a "nice to have" analysis layer that people admire but don't use daily. The defense against this is:

1. Persistent tracking (return hook -- new data every session)
2. Integration into existing workflows (MCP, not standalone)
3. Output quality that actually beats what a smart person can do with ChatGPT + a spreadsheet
4. Speed -- if it takes longer than ChatGPT, it loses regardless of depth
