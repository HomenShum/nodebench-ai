# Getting Started with NodeBench MCP

> From zero to productive in 5 minutes. Progressive adoption — start small, add what you need.

---

## Quick Install

```json
// Add to your MCP config (Claude Desktop, Cursor, Windsurf, etc.)
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "@nodebench/mcp"]
    }
  }
}
```

That's it. Zero config. Data stored locally in `~/.nodebench/nodebench.db`.

---

## Step 1: Start with Default (44 tools)

The default preset gives you the complete **AI Flywheel** methodology:

| Toolset | Tools | What It Does |
|---|---|---|
| **verification** | 8 | 6-Phase structured investigation for any change |
| **eval** | 6 | Track quality over time with eval runs |
| **quality_gate** | 4 | Boolean pass/fail checks before shipping |
| **learning** | 4 | Persistent knowledge base across sessions |
| **flywheel** | 4 | Connects verification and eval loops |
| **recon** | 7 | Structured research with findings |
| **security** | 3 | Dependency scanning and code analysis |
| **boilerplate** | 2 | Project scaffolding |
| *+ meta/discovery* | 6 | Tool search and workflow chains |

**Your first session — try these prompts:**

```
"Bootstrap this project so you know what it is."

"Search all knowledge for authentication — what do we already know?"

"Start a verification cycle for adding user login."

"Run the mandatory flywheel for my changes."

"Record a learning: the auth library requires Node 18+."
```

---

## Step 2: Pick a Themed Preset (When You Need More)

Once you're comfortable with default, upgrade to a themed preset that matches your project:

```
npx nodebench-mcp --preset web_dev       # 62 tools — web projects
npx nodebench-mcp --preset research      # 63 tools — research workflows
npx nodebench-mcp --preset data          # 71 tools — data analysis
npx nodebench-mcp --preset devops        # 57 tools — CI/CD & operations
npx nodebench-mcp --preset mobile        # 55 tools — mobile apps
npx nodebench-mcp --preset academic      # 75 tools — academic papers
npx nodebench-mcp --preset multi_agent   # 67 tools — parallel agent teams
npx nodebench-mcp --preset content       # 62 tools — content & publishing
```

### Which preset is right for me?

| I'm building... | Use this | Key extra tools |
|---|---|---|
| A **React/Next.js** app | `web_dev` | Screenshot capture, vision analysis, SEO audit, git workflow |
| A **data pipeline** or doing **analysis** | `data` | CSV/XLSX/PDF parsing, LLM extraction, web fetch |
| A **research** project or monitoring feeds | `research` | Web search, LLM calls, RSS feeds, email delivery |
| An **academic paper** | `academic` | Paper polish, peer review simulation, data analysis |
| A **mobile** app (Android) | `mobile` | UI capture, vision analysis, flicker detection |
| **CI/CD** or **DevOps** workflows | `devops` | Git compliance, merge gating, benchmarks, pattern mining |
| With **multiple AI agents** in parallel | `multi_agent` | Task locking, agent messaging, oracle testing, roles |
| **LinkedIn/blog/newsletter** content | `content` | LLM calls, accountability check, email, RSS, publishing queue |

---

## Step 3: Discover Tools at Runtime

You don't need to memorize anything. Use these 3 discovery tools (always available):

### Find the right tool
```
"Discover tools for testing — I need to run tests and track results."
```

### Get next-step guidance
```
"Get quick ref for start_verification_cycle — what should I do next?"
```

### Get a full workflow sequence
```
"Get workflow chain for feature_development."
```

There are **25 pre-built workflow chains** covering:
feature dev, bug fix, security audit, deployment, research, academic writing, CI/CD, multi-agent coordination, visual QA, and more.

---

## Step 4: Let the Smart Preset Decide

After using NodeBench for a few sessions, it learns your patterns:

```bash
npx nodebench-mcp --smart-preset
```

This analyzes your project type, usage history, and tool patterns to recommend the ideal preset with confidence scores.

---

## Common First-Session Workflows

### Workflow A: "I'm starting a new feature"

```
1. "Get project context"                        → Know the project
2. "Search all knowledge for [topic]"            → Check existing knowledge
3. "Start verification cycle for [feature]"      → Begin structured work
4. [implement the feature]
5. "Run closed loop: compile passed, lint passed, test passed"
6. "Record learning: [edge case you found]"
```

### Workflow B: "I'm investigating a bug"

```
1. "Search all knowledge for [error message]"    → Has this been seen before?
2. "Start verification cycle for [bug title]"    → Structured investigation
3. "Log gap: [root cause]"                       → Document what's wrong
4. [fix the bug]
5. "Resolve gap: [what you did]"                 → Track the fix
6. "Log test result: regression test passed"     → Prove it's fixed
7. "Run mandatory flywheel"                      → Final check
```

### Workflow C: "I need to research something"

```
1. "Run recon for [topic]"                       → Start structured research
2. "Log recon finding: [what you learned]"       → Record each finding
3. "Get recon summary"                           → Aggregate into action plan
4. "Record learning: [key takeaway]"             → Persist for future sessions
```

---

## Configuration Reference

### MCP Config with a Themed Preset

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "@nodebench/mcp", "--preset", "web_dev"]
    }
  }
}
```

### Mix and Match Toolsets

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "@nodebench/mcp", "--toolsets", "verification,eval,recon,llm,web"]
    }
  }
}
```

### Full Preset (Everything)

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "@nodebench/mcp", "--preset", "full"]
    }
  }
}
```

### Environment Variables (Optional)

| Variable | Required For | Example |
|---|---|---|
| `GEMINI_API_KEY` | Vision analysis, LLM calls, web search | `AIza...` |
| `OPENAI_API_KEY` | LLM calls, web search | `sk-...` |
| `ANTHROPIC_API_KEY` | LLM calls | `sk-ant-...` |
| `GITHUB_TOKEN` | GitHub search/analysis | `ghp_...` |
| `EMAIL_USER` / `EMAIL_PASS` | Email tools | Gmail + App Password |
| `FIGMA_ACCESS_TOKEN` | Figma flow analysis | Personal access token |
| `CONVEX_SITE_URL` / `MCP_SECRET` | Platform tools | Convex deployment URL |

None are required for the default preset. Add them as you adopt more tools.

---

## CLI Quick Reference

```bash
npx nodebench-mcp --help           # See all options, toolsets, and presets
npx nodebench-mcp --list-presets   # List all presets with tool counts
npx nodebench-mcp --smart-preset   # AI-powered preset recommendation
npx nodebench-mcp --stats          # Usage statistics for this project
npx nodebench-mcp --export-stats   # Export stats as JSON
```

---

## Progression Path

```
Week 1:  default (44 tools)     → Learn the flywheel methodology
Week 2:  themed preset           → Add tools specific to your project
Week 3:  --smart-preset          → Let usage history guide you
Week 4+: custom --toolsets       → Fine-tune to your exact workflow
```

The goal is never to use all 175 tools. The goal is to use the **right 50-70 tools** for your specific project. Themed presets get you there without trial and error.

---

## Next Steps

- **[USE_CASES.md](./USE_CASES.md)** — Exact prompts and workflow chains for every tool
- **[README.md](./README.md)** — Full documentation and architecture
- **`--help`** — Always up-to-date CLI reference
