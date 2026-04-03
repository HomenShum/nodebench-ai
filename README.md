# NodeBench AI

Operating intelligence for founders. Search any company, get a structured intelligence packet, delegate to your agents.

**Live:** [nodebenchai.com](https://www.nodebenchai.com)

---

## 10 Eras of NodeBench (Commit 1 to 758)

We’ve evolved rapidly based on rigorous engineering loops and verifiable intelligence pipelines. Below is an exhaustive structural changelog mapping everything we have explored, built, and shipped since the repository’s origin.

### Era 1: Collaborative Editor & Early Agents (Commits 1-40)
- **Genesis:** Started as "NodeBench AI3" – a Notion-like collaborative editor built on Convex + Chef with a Vite frontend.
- **Early Intelligence:** Implemented base AI agents for document creation, Youtube parsing, CSV lead scoring, and sheet ops.
- **Components:** Created `FastAgentPanel` streaming and initially integrated the Linkup search API.

### Era 2: LLM-as-a-Judge & Evaluator Milestones (Commits 41-110)
- **Validation Drive:** Built our initial LLM-as-a-judge system to rigorously validate Agent tool output instead of eyeballing responses.
- **Scaling Pass Rates:** Pushed evaluation limits from 50% up to 100% on 33 internal test cases. 
- **Model Shift:** Migrated orchestration models up to the GPT-5-chat-latest series to handle complex payloads.

### Era 3: VDR Patterns & The Dossier System (Commits 111-210)
- **Architecture:** Introduced `FileViewer` and `DossierViewer`, heavily patterned after Virtual Data Rooms (VDR) to handle document-intensive investigations.
- **Intelligence Upgrades:** Shipped SEC entity disambiguation, hashtag dossiers, and an overhauled `DocumentCard` supporting Rich Previews and direct Excel/CSV parsing via SheetJS.
- **News Stand:** Integrated the "Living Briefing" feed combining real-time data from arbitrary feeds into a Central Newsstand architecture.

### Era 4: Agentic Context & Search Fusion (Commits 211-376)
- **Frameworking:** Formularized the 9-principle "Agentic Context Engineering Framework".
- **Search Pipeline:** Deployed "Multi-Source Search Fusion" to power comprehensive Daily Brief pipelines.
- **Optimization Grind:** Conducted a massive performance push—migrating architectures (briefly achieving 100/100 Lighthouse via SSR) and ruthlessly optimizing bundles. Added critical outreach tools via Twilio 10DLC, Resend, and ntfy for digests.

### Era 5: DRANE Engine & MCP Architectures (Commits 377-450)
- **Narrative Engine:** Shipped `v0.4.0` pivoting strongly towards the **DRANE Narrative Engine** focusing on hypothesis testing and signal tracking.
- **Protocol Pivot:** Heavily adopted the Model Context Protocol (MCP) gateway, moving to modular Convex-side dispatchers and localized MCP packages (`mcp-local` hitting v2.24).
- **Subagent Swarms:** Shipped the crucial UI/UX Full Dive toolset allowing parallel subagents to autonomously browse our app using Playwright—the autonomous `BugCodeFixVerify` flywheel.

### Era 6: Jony Ive Design Sweeps & Linear-Grade Polish (Commits 451-533)
- **The Purge:** A rigorous 4-phase "Jony Ive" design review stripping visual noise, UI jargon, and accessibility gaps across 255 files.
- **Linear-Grade Identity:** Upgraded all UI components to Linear/Vercel grade styling with motion-safe skeletons, strict typography scales, and a formalized Signature Orb identity.
- **Governance:** Deployed automated design governance linters synced with our Figma instances via a newly created Figma MCP server.

### Era 7: Enterprise Oracles & Deep Traces (Commits 534-599)
- **Control Plane:** Deployed the Oracle temporal API allowing enterprise investigations via live telemetry mapping.
- **Trajectory Disclosure:** Shipped execution trace flows that progressively disclose node decisions rather than presenting a black-box answer blob.
- **Eval Scaling:** Executed massive 500-query longitudinal benchmarks against multiple models, raising our semantic search quality and structural pass rates from ~36% up to 92.8%.

### Era 8: 100% Pass Rates & Pipeline Maturity (Commits 600-619)
- **Deterministic Reliability:** Hit total fidelity markers (100% pipeline execution rates) on complicated, chained multi-step agent workflows.
- **Grounding Layer:** Solidified a pristine 4-layer grounding pipeline (claim verification ➝ citation chaining) managed by a majority-vote hybrid judge (Code + LLM).

### Era 9: Peer-to-Peer Coordination (Commits 620-692)
- **Swarms Over Bots:** Shifted the system logic from generic Chatbots to Collaborative Swarms. Shipped the Coordination Hub allowing cross-agent Slack-style messaging and shared server-side environments.
- **Surface Consolidation:** Reduced 78 zombie views down to a highly focused 7-surface "Founder Cycle Architecture" (Ask, Memo, Research, Workspace, Dashboard, Coordination, Entities).

### Era 10: Founder Platform & Autonomous Harness (Commits 693-758)
- **Profile Architecture:** Designed around Live Signal Sweeps and Behavioral Profiling to dynamically align with founder intent.
- **Agent Harness:** Replaced rudimentary agent logic with the dynamic dynamic Agent Harness orchestration layer—featuring cost budget tracking, multi-provider API failovers, and intense Monte Carlo decision simulations.
- **Culmination:** Reached Investment Bank Analyst equivalent operations mapped cleanly onto the founder-ready workspace dashboard.

## Adaptive Strategy & Competitive Landscape

### Defending the Moat in the Era of "Claude Mythos"

As raw intelligence scales exponentially—manifested by models exhibiting zero-shot cyber and coding genius like **Claude Mythos**—intelligence itself rapidly commoditizes. 

This necessitates our structural shift observed across Eras 5 through 10. NodeBench acts as the **verification, orchestration, and memory layer.** When models get drastically smarter, users don't need a wrapper; they need **Parallel Subagent Swarms**, robust **LLM-as-Judge eval loops**, and our dynamic **Agent Harnesses**. We wrap temporary external brilliance into auditable, compressed, repeatable decision architectures.

### Our Competitors

Our shift toward verification vs prompt-passing reorganizes our competitive edge:
1. **Agent Platforms (Devin, AutoGPT)**: They offer autonomy but often drift. We leverage our strict **LLM-as-a-judge QA pipelines** and the structural **DRANE engine** to ensure deterministic validation post-execution.
2. **Traditional Intelligence Datanodes (AlphaSense, PitchBook)**: Focused on static, manual queries. We bring the intelligence to the founder via live **Agent Harnesses** running Monte Carlo simulations under the hood seamlessly.
3. **Consumer AI Search (Perplexity, Consensus)**: Focused on single-shot answers treated as transient. We operate through our **Coordination Hubs** and shared historical contexts, allowing for intelligent trajectory rerolls over weeks of interaction.

---

### 🚀 The Next Horizon: NodeBench Subconscious (Or, Fixing AI Amnesia)

*“What one founder can remember, an AI should not instantly forget.”*

If you have ever used modern AI, you know its fatal flaw: **Amnesia**.
You spend an hour teaching it about your company's core strategy, your competitor's recent price drop, and your strict tone for investor decks. It does brilliant work. Then, you close the window. The next day, you ask it a question, and the AI stares blankly at you, having forgotten everything.

To fix this, tech platforms usually build massive, bloated databases that dump every word you've ever typed back into the AI’s brain before it answers. This is like trying to remind a CEO about a budget report by forcing them to reread every email from the last five years. It’s noisy, expensive, and leads to confused answers.

**NodeBench Subconscious** does something fundamentally simpler and vastly more powerful. 

Here is how it works, explained simply for everyone—whether you are a CTO writing code, a non-technical manager, or an investor tracking the bottom line:

#### 1. The Quiet Note-Taker
Usually, an AI only works when you talk directly to it. The Subconscious is different. It acts like a silent partner sitting in the corner of the room. While you work in NodeBench—reading industry news, updating business metrics, or running intelligence sweeps—the Subconscious quietly observes the moving pieces of your business. 

#### 2. Tiny Index Cards (Not Giant Transcripts)
When the Subconscious notices a shift (e.g., *"Ah, the founder just pivoted from targeting small tech startups to Enterprise healthcare"*), it doesn't hoard a massive transcript of your conversation. It simply writes a tiny, durable index card. It maintains a neat little stack of these cards labeled `Company Truth`, `Current Priorities`, `Validated Cost-Saving Workflows`, and `Missing Investor Proof`. 

#### 3. The "Whisper" 
Here is where the magic happens. The next time you ask your main working AI to do a complex task, the Subconscious doesn't scream all its index cards at once. Instead, right before the worker starts typing, the Subconscious slides a single sticky note across the table. 
* *“Psst. This deliverable touches our new healthcare pivot. Make sure it aligns with the strict HIPAA research packets.”*
* *“Psst. You’ve run this exact competitor analysis 4 times recently. Here is a historical shortcut that saves 38% of your computing costs.”*
* *“Psst. This startup we are researching is missing proper banking evidence. Flag it.”*

By doing this, **NodeBench Subconscious** transforms the software from a reactive, forgetful chatbot into a genuinely persistent operating system. It remembers your most critical business truths, natively routes the cheapest and fastest workflows, and warns of narrative blind spots before you make a mistake—all while staying completely out of your way.

---

## 7 Pages, 1 Workspace

| Page | Path | Purpose |
|------|------|---------|
| **Ask** | `/` | Search, upload, get intelligence packets |
| **Memo** | `/deep-sim` | Decision workbench — variables, scenarios, interventions |
| **Research** | `/research` | Track what changed, daily brief, signals |
| **Workspace** | `/workspace` | Documents, notes |
| **Dashboard** | `/founder` | Company truth, what changed, next moves |
| **Coordination** | `/founder/coordination` | Peer presence, task delegation, messaging |
| **Entities** | `/founder/entities` | Competitors, partners, watchlist |

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/HomenShum/nodebench-ai.git
cd nodebench-ai
npm install

# 2. Set up environment
cp .env.example .env.local
# Add your GEMINI_API_KEY (required for search)

# 3. Run
npm run dev
# Open http://localhost:5191
```

### MCP server (use in Claude Code, Cursor, Windsurf)

```bash
# Claude Code
claude mcp add nodebench -- npx -y nodebench-mcp

# Cursor / Windsurf — add to MCP config:
{ "command": "npx", "args": ["-y", "nodebench-mcp"] }
```

### Stack & Architecture

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Convex (real-time database + serverless functions)
- **Search:** Gemini (entity extraction) + Linkup (web search)
- **MCP server:** 350+ tools across 57 domains (`packages/mcp-local/`)
- **Deployment:** Vercel (frontend + API) + Convex (backend)

## Environment variables

Only `GEMINI_API_KEY` is required for the search pipeline. See `.env.example` for all options.

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes | Entity extraction + grounding |
| `VITE_CONVEX_URL` | For backend | Convex deployment URL |
| `LINKUP_API_KEY` | Recommended | Web search |
| `OPENAI_API_KEY` | Optional | Embedding fallback |
| `ELEVENLABS_API_KEY` | Optional | Voice output |

## Development

```bash
npm run dev              # Start Vite dev server (port 5191)
npm run build            # Production build
npx tsc --noEmit         # Type-check
npx vitest run           # Run tests (from packages/mcp-local/)
```
