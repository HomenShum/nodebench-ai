# X/Twitter Thread

---

1/

I built an open-source MCP server with 260 tools that makes AI agents catch bugs they normally ship.

Just published to the Official MCP Registry.

Zero config. One command. Works with Claude Code, Cursor, Cline, Windsurf.

Here's what it does and why it exists:

---

2/

The problem: AI agents generate code, say "done!", and move on.

They skip verification. They forget context mid-session. They don't check accessibility or performance.

NodeBench MCP adds quality gates, verification cycles, and a methodology that forces a second look before shipping.

---

3/

260 tools sounds like context suicide. It would be -- if you loaded them all at once.

Progressive discovery: agents start with 6 meta-tools. They search for what they need. Results include graph edges to related tools.

The agent builds its own toolchain per task.

---

4/

The search system fuses 14 strategies via Reciprocal Rank Fusion:

- Keyword, fuzzy, n-gram, semantic
- Local embedding model (no API needed)
- Graph traversal + execution trace edges

Lexical search: 60% recall
Hybrid + embedding: 87% recall

Zero regressions.

---

5/

Core methodology -- the AI Flywheel:

recon -> verify -> quality gate -> learn -> persist -> ship -> RE-EXAMINE

That last step is key. It forces agents to re-examine work through a11y, resilience, performance, and design checklists before declaring done.

---

6/

10 presets so you only pay for what you use:

default: 54 tools
web_dev: 106
research: 71
data: 78
full: 260

Plus model-tier routing -- each tool is tagged low/medium/high complexity so your orchestrator can route cheap calls to smaller models.

---

7/

Session memory that survives context compaction. Notes persist to disk. When the agent loses context, it can reload what it was doing.

This alone fixed half my issues with long coding sessions.

---

8/

Install:

claude mcp add nodebench -- npx nodebench-mcp@latest

That's it. No API keys needed for core tools.

npm: nodebench-mcp
GitHub: github.com/HomenShum/nodebench-ai
MCP Registry: io.github.HomenShum/nodebench

---

9/

497+ tests. 13 test files. Eval bench includes:

- 20 SWE-bench-style tasks (473 tool calls)
- BFCL v3 parallel eval (4 concurrent workers)
- Comparative bench: bare agent vs MCP-augmented
- 15-scenario eval harness

This isn't a toy. It's tested like infrastructure.

---

10/

The shift I see when agents use this:

Before: "I've implemented the feature"
After: "I've verified the feature works because [evidence]"

That's the gap between generating code and shipping software.

Try it. Break it. Tell me what's missing.

github.com/HomenShum/nodebench-ai
