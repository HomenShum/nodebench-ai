# LinkedIn Post 1 (Published — Founder Voice — Instructional)

---

hey so we just open sourced something we've been using internally at cafecorner and i think it might save you a lot of setup time

we call it the nodebench mcp. it's basically an agent operating system in one npm package. 46 tools your AI agents can use out of the box.

here's how you set it up. one line in your claude code settings:

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp"]
    }
  }
}
```

restart claude code. done. your agent now has web search, github discovery, vision analysis, a verification flywheel, and a persistent learning database.

but the real unlock isn't the tools. it's the protocol.

we ship a file called NODEBENCH_AGENTS.md with the package. drop it in any repo and your agents will auto-configure themselves to follow a 6-step verification process before shipping anything:

1. static analysis (zero errors, no exceptions)
2. happy-path test (does it work with valid inputs)
3. failure-path test (does it handle edge cases)
4. gap analysis (dead code? missing integrations? hardcoded values?)
5. fix and re-verify (if anything found, restart from step 1)
6. document learnings (record what you discovered)

we call this the AI flywheel. no change ships without passing all 6 steps.

why does this matter? because we caught a bug in our own pipeline where the variety check fetched scheduled items but never actually compared them. dead code. would have gone to production silently without the flywheel forcing us to re-verify.

the agents.md file is designed to be portable. works in any repo, any language. agents can even update it themselves using the update_agents_md tool.

npm: https://www.npmjs.com/package/nodebench-mcp
agents protocol: curl -o AGENTS.md https://raw.githubusercontent.com/nodebench/nodebench-ai/main/packages/mcp-local/NODEBENCH_AGENTS.md

still shipping and praying or have you closed the loop?

---

# LinkedIn Post 2 (Day 2 — User Stories + v2.1)

---

two people tried our open source MCP server this week and built completely different things with it

one engineer built agentic vision analysis — GPT 5.2 with Set-of-Mark boundary boxing, similar to how Gemini 3 Flash does agentic code execution. he uses NodeBench's verification pipeline to validate detection accuracy across screenshot variants before shipping model changes.

another engineer was transitioning her manual QA workflow website into an AI agent-driven app for a pet care messaging platform. she uses the quality gates, verification cycles, and eval runs to make sure the AI agent catches edge cases that manual QA used to catch but bare AI agents miss.

they each used completely different subsets of the 75 tools. which told us something important: most people don't need all 75.

so v2.1 ships with preset gating:

```
npx nodebench-mcp --preset lite    # 30 tools, ~60% less tokens
npx nodebench-mcp --preset core    # 50 tools
npx nodebench-mcp                  # all 75 (default)
```

why this matters: 75 tool schemas = ~19K tokens per API call. LLM tool selection accuracy degrades past ~30 tools. now you load only what you need.

the full pipeline is still there for when you need it — structured recon, 3-layer testing, quality gates, persistent knowledge, parallel agent coordination.

we benchmarked 9 real production prompts. bare agent: 0 issues caught, 26 blind spots shipped. with NodeBench: 13 issues caught, 0 blind spots shipped.

one command to set it up:

```
claude mcp add nodebench -- npx -y nodebench-mcp
```

npm: https://www.npmjs.com/package/nodebench-mcp
github: https://github.com/nodebench/nodebench-ai

what are you building with MCP tools?

---

# LinkedIn Post 3 (Day 3 — Daily Brief Spawns New Tools)

---

our AI agents now build their own tools while we sleep

here's what happened: we set up a daily cron that reads our platform's daily brief — funding signals, trending repos, research papers — and asks Claude: "what tool is missing from our 90-tool MCP server that would help an agent act on this signal?"

yesterday's brief had 5 signals. the pipeline identified 3 tool gaps and spun up 3 new open source repos overnight:

1. **ai-research-writer** — polishes AI research papers. detects passive voice, hedging language, contractions, mixed citation styles. scores 0-100. 10 tests.
https://github.com/HomenShum/ai-research-writer

inspired by awesome-ai-research-writing (Leey21) which was trending in the brief.

2. **paper-diagram-gen** — generates SVG diagrams from text descriptions. "Encoder[CNN,RNN] -> Latent -> Decoder" becomes a publication-ready architecture diagram. 10 tests.
https://github.com/HomenShum/paper-diagram-gen

inspired by PaperBanana (dwzhu-pku) — an academic illustration tool the brief surfaced.

3. **claude-model-benchmark** — benchmarks Haiku vs Sonnet vs Opus side-by-side. latency, tokens, cost, P50/P95/P99. has a dry-run mode that needs no API key. 9 tests.
https://github.com/HomenShum/claude-model-benchmark

inspired by Claude Opus 4.6 trending on Hacker News.

every repo has:
- TypeScript source with CLI entry point
- full test suite (node:test, zero deps)
- agent integration instructions for Claude Code / Cursor / Windsurf
- NodeBench MCP integration (recon, verification, quality gates, learnings)

the pipeline that built these:
1. fetch daily brief from Convex HTTP API
2. Claude analyzes signals against existing 90-tool catalog
3. Claude generates tool code following McpTool patterns
4. deterministic scripts patch index.ts, metaTools.ts, tests
5. tsc + vitest must pass ALL existing tests + new ones
6. auto-PR or auto-repo push

zero manual intervention. the brief comes in, the tools come out.

this is what we mean by the AI flywheel — agents don't just use tools, they identify gaps and create new ones.

github (pipeline): https://github.com/HomenShum/nodebench-ai
npm (MCP server): https://www.npmjs.com/package/nodebench-mcp

what signals is your daily brief surfacing?

---

# LinkedIn Post 4 (Day 3 — ai-research-writer standalone)

---

most AI research papers have the same 5 problems

1. passive voice everywhere ("the experiment was conducted" instead of "we ran the experiment")
2. hedging language ("perhaps", "somewhat", "arguably" — just say what you found)
3. contractions in academic text (reviewers notice, even if they don't flag it)
4. mixed citation styles (APA in one paragraph, IEEE brackets in the next)
5. sections that are too long or too short for their content

we built a CLI that catches all of them:

```
npx ai-research-writer analyze paper.txt
```

it outputs a score (0-100), line-by-line issues with severity, and per-section readability grades (Flesch-Kincaid).

for AI agents it's even more useful. add this to your AGENTS.md:

"when reviewing papers, run `npx ai-research-writer analyze <file> --format json`. fix all ERROR issues first. target score 80+."

your agent now has a quality gate for research writing. no more shipping drafts with "it's" in the abstract.

works with nodebench-mcp too — pipe the JSON output into a verification cycle and the agent will iterate until the paper passes.

github: https://github.com/HomenShum/ai-research-writer
10 tests, zero deps, MIT license.

what's your paper review workflow look like?

---

# LinkedIn Post 5 (Day 3 — paper-diagram-gen standalone)

---

i used to spend 45 minutes making one diagram for a paper

open Figma. draw boxes. align them. connect arrows. realize the architecture changed. start over.

now i type this:

```
npx paper-diagram-gen "Input -> Preprocessing -> Encoder[CNN,RNN,Transformer] -> Latent Space -> Decoder[MLP] -> Output" --type architecture --output fig1.svg
```

and i get a publication-ready SVG with color-coded nodes, arrowhead markers, and sub-component labels. 2 seconds.

it handles 3 diagram types:
- **pipeline**: horizontal, left-to-right (data flows, ML pipelines)
- **architecture**: vertical, top-to-bottom (system layers, network stacks)
- **flowchart**: with decision diamonds ("Converged? -> Yes: Deploy, No: Tune")

for AI agents this is a game changer. your agent finishes analyzing a codebase, then auto-generates the architecture diagram:

```
npx paper-diagram-gen "API Gateway -> Auth -> Router -> DB" --type architecture --output arch.svg
```

drop it in the PR. reviewer instantly sees the system design.

inspired by PaperBanana which automates academic illustrations. we wanted something simpler — text in, SVG out, no deps.

github: https://github.com/HomenShum/paper-diagram-gen
10 tests, zero deps, MIT license.

still making diagrams by hand?

---

# LinkedIn Post 6 (Day 3 — claude-model-benchmark standalone)

---

"which Claude model should i use?" is the wrong question

the right question: "which Claude model gives me the best cost/latency/quality trade-off for THIS specific workload?"

we built a CLI to answer it:

```
npx claude-model-benchmark run --models haiku,sonnet,opus
```

runs 4 default prompts (code gen, reasoning, summarization, creative) against all 3 models. outputs:

| Model | Avg Latency | P95 | Tokens | Cost |
|-------|------------|-----|--------|------|
| haiku | 230ms | 310ms | 147 | $0.0008 |
| sonnet | 580ms | 720ms | 203 | $0.0035 |
| opus | 1,200ms | 1,450ms | 251 | $0.0200 |

(sample numbers — your results will vary)

the real power is custom prompt suites. define your actual production prompts:

```json
[{"name": "entity-extraction", "prompt": "Extract all company names from...", "rubric": ["precision", "recall"]}]
```

then benchmark. now you know: haiku handles 80% of your workload at 1/20th the cost.

don't need an API key? use `dry-run` mode to see the report format with mock data.

for AI agents: pair this with nodebench-mcp's `benchmark_models` tool. agent benchmarks, picks the optimal model, records the decision as a learning. next time it encounters a similar task, it already knows.

github: https://github.com/HomenShum/claude-model-benchmark
9 tests, zero deps, MIT license.

are you benchmarking or guessing?

---
