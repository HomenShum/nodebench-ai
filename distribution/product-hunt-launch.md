# Product Hunt Launch — NodeBench MCP

## Tagline

> The AI agent toolkit that ships fewer bugs (60 chars)

Alternative options:
- "260 MCP tools. Zero config. One npx command." (46 chars)
- "Make AI agents catch the bugs they normally ship" (49 chars)
- "The missing test harness for AI agent workflows" (48 chars)

---

## Description (~300 words)

**NodeBench MCP is a 260-tool Model Context Protocol server that gives AI agents structured verification, progressive discovery, and real evaluation — not just vibes.**

Most AI coding agents ship code without checking their own work. They hallucinate tool names, skip edge cases, and can't tell you what went wrong. NodeBench fixes this by embedding a verification methodology directly into the agent's tool layer.

**What it does:**

- **260 tools across 49 domains** — verification, eval harnesses, security audits, code architecture analysis, git workflows, email, RSS, SEO, voice bridging, and more. Every tool follows a strict schema with typed inputs and structured outputs.
- **Progressive discovery** — Agents don't see all 260 tools at once. Neural embedding search (local HuggingFace, Google, or OpenAI fallback) surfaces the right tools for the task. Graph-based traversal connects related capabilities across domains.
- **AI Flywheel methodology** — A 6-phase verification loop (recon, plan, execute, verify, learn, re-examine) that agents follow to catch their own mistakes before shipping.
- **10 presets** — Default (54 tools), web_dev (106), research (71), data (78), devops (68), mobile (95), academic (86), multi_agent (102), content (77), or full (260). Pick the surface area that fits your workflow.
- **CLI + MCP dual mode** — Use as a standard MCP server in Claude Code, Cursor, or any MCP client. Or run standalone CLI commands: `npx nodebench-mcp discover "security audit"`.

**Who it's for:**

- AI engineers building agent pipelines who need structured tool orchestration
- Developers using Claude Code, Cursor, or Windsurf who want their agent to verify its own work
- Teams evaluating LLM tool-use accuracy with real harnesses, not toy benchmarks

**How to start:**

```bash
npx nodebench-mcp@latest
```

Zero config. No API keys required for core tools. Optional integrations (email, vision, GitHub) unlock with environment variables — the built-in setup wizard (`check_mcp_setup`) tells you exactly what to configure.

Listed on the official MCP Registry. MIT licensed. Free forever.

---

## First Comment by Maker (~200 words)

Hey Product Hunt! I'm Homen — background in banking/finance turned data engineer turned agentic AI builder.

I built NodeBench because I kept watching AI agents confidently ship broken code. Not edge cases — fundamental stuff. Wrong function signatures, missing error handling, tests that pass in isolation but fail in production. The agent would say "Done!" and I'd spend an hour cleaning up.

The core idea: what if the agent had a structured methodology to check its own work? Not just "write tests" — an actual verification loop with evidence collection, gap tracking, and a quality gate that blocks shipping until coverage thresholds are met.

That became the AI Flywheel — 6 phases that turn an agent from a code generator into something closer to a careful engineer. Then I kept adding tools: architecture analysis, security audits, eval harnesses, embedding-powered search so agents discover what they need without memorizing 260 tool names.

What surprised me: the progressive discovery system changed how agents navigate the toolkit. Instead of dumping a massive tool list, agents start with 6 meta-tools and explore outward. Graph traversal + neural embeddings mean they find domain-crossing connections I didn't explicitly program.

What's next: deeper eval benchmarks (SWE-bench integration is in progress), multi-agent swarm coordination tools, and a visual dashboard for watching agent verification in real time.

Would love your feedback — especially if you're building with MCP clients today.

---

## Topics

1. Artificial Intelligence
2. Developer Tools
3. Open Source
4. Software Testing
5. APIs

---

## Gallery Images (4-5 screenshots to capture)

### Image 1: Hero — Progressive Discovery in Action
**What to show:** Terminal output of `npx nodebench-mcp discover "security audit"` showing the embedding-powered search results with relevance scores, domain labels, and suggested next tools. Demonstrates the zero-config entry point.
**Caption:** "260 tools, but agents only see what they need. Neural embeddings surface the right capabilities."

### Image 2: AI Flywheel Verification Loop
**What to show:** A diagram or terminal session showing the 6-phase flywheel in action — recon phase discovering gaps, verification cycle with evidence collection, quality gate score, and the re-examine step catching a missed edge case. Could use the `start_verification_cycle` + `log_test_result` + `check_quality_gate` sequence.
**Caption:** "The AI Flywheel: 6 phases that turn 'Done!' into 'Actually done.'"

### Image 3: Preset Comparison
**What to show:** Side-by-side comparison of 3-4 preset configurations (default 54 tools, web_dev 106, research 71, full 260) with domain breakdowns. Visual table or grid showing which domains each preset includes.
**Caption:** "10 presets from minimal to full. Pick the surface area that fits your stack."

### Image 4: MCP Client Integration
**What to show:** NodeBench running inside Claude Code or Cursor, with the agent using `discover_tools` to find relevant capabilities, then executing a multi-step workflow. Show the tool call sequence with structured outputs.
**Caption:** "Drop into any MCP client. Claude Code, Cursor, Windsurf — one config line."

### Image 5: Eval Harness Results
**What to show:** Terminal output from the eval bench — scenario completion rates, tool coverage metrics, A/B comparison (bare agent vs. NodeBench-augmented agent). Show the 60% to 87% search accuracy lift from embedding integration.
**Caption:** "Real eval harnesses, not toy benchmarks. 497+ tests across 13 test suites."

---

## Pricing

**Free / Open Source**

- MIT License
- All 260 tools included, no gating
- Optional integrations (email, vision, GitHub) require your own API keys
- No telemetry, no accounts, no cloud dependency

---

## Links

| Asset | URL |
|-------|-----|
| **GitHub** | https://github.com/HomenShum/nodebench-ai |
| **npm** | https://www.npmjs.com/package/nodebench-mcp |
| **MCP Registry** | Listed on official MCP Registry |
| **Install** | `npx nodebench-mcp@latest` |
| **Documentation** | See `AGENTS.md` in repo root |

---

## Launch Checklist

- [ ] Finalize tagline (test 2-3 variants in draft)
- [ ] Capture all 5 gallery screenshots at 1270x760px (Product Hunt recommended)
- [ ] Record 1-min demo GIF or video (optional but high-impact)
- [ ] Write and schedule first comment
- [ ] Prepare 3-5 upvoter DMs with context (not cold asks)
- [ ] Schedule launch for Tuesday 12:01 AM PT (highest traffic day)
- [ ] Set up maker profile with headshot + bio
- [ ] Cross-post announcement to LinkedIn, Twitter/X, relevant Discord/Slack communities
- [ ] Monitor comments for first 4 hours — respond to every question within 15 minutes
