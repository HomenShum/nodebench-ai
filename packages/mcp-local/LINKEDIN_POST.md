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
