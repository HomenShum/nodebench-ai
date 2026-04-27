# r/ClaudeAI Post

**Title:** I built a 260-tool MCP server that makes Claude Code agents actually verify their work before shipping

**Body:**

I got tired of Claude Code agents that generate code, say "done!", and move on without checking if anything actually works. So I built NodeBench MCP -- an open-source MCP server that gives Claude structured quality gates, verification cycles, and a methodology that forces a second look before shipping.

## The problem

Claude Code is great at generating code. It's bad at:
- Verifying what it built actually works
- Remembering what it was doing after context compaction
- Catching accessibility, performance, and resilience issues
- Not skipping tests when it gets confident

## What NodeBench does

260 tools across 49 domains. But you don't get 260 tools dumped in your context. It uses **progressive discovery** -- Claude starts with 6 meta-tools and searches for what it needs. Tools link to related tools via graph edges, so Claude naturally chains them.

The core loop is the **AI Flywheel**: recon -> verify -> quality gate -> learn -> persist -> ship -> re-examine. That last step is the key one. It forces Claude to re-examine its work through checklists for a11y, resilience, performance, and design before declaring done.

**Session memory** persists notes to disk so Claude remembers context across compaction. This alone was worth building the whole thing.

## Install (one command)

```bash
claude mcp add nodebench -- npx nodebench-mcp@latest
```

That's it. Zero config, zero API keys needed for core functionality. Just npx.

## What's in the box

- **Quality gates** with structured pass/fail criteria
- **Verification cycles** that track what was checked and what wasn't
- **Web scraping** via Scrapling (no Playwright dependency)
- **Embedding search** (local HuggingFace model, falls back to Google/OpenAI)
- **Session memory** that survives context compaction
- **Agent contract** -- behavioral rules Claude follows for self-setup, parallel work, and pre-ship checklists
- **Visual QA** tools for UI work
- **Email** (raw TLS SMTP/IMAP) and **RSS** feed parsing
- **10 presets** so you only load tools relevant to your workflow (54 for default, 260 for full)

## Where to get it

- npm: `nodebench-mcp`
- GitHub: https://github.com/HomenShum/nodebench-ai
- Official MCP Registry: `io.github.HomenShum/nodebench`
- Also listed on Cline Marketplace, awesome-mcp-servers, mcp.so, mcpservers.org, Glama.ai

Works with Claude Code, Cursor, Cline, Windsurf -- any MCP client.

The biggest shift I noticed: Claude stops saying "I've implemented X" and starts saying "I've verified X works because [evidence]." That's the difference between generating code and shipping software.

Happy to answer questions or hear what tools you'd want added.
