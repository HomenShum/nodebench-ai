# NodeBench Plugin Integration Spec — Claude Code + Codex + Memory Layer

## What Was Researched

### 1. OpenAI Codex Plugin for Claude Code (`openai/codex-plugin-cc`)

**What it is:** An official OpenAI plugin that lets you use Codex from inside Claude Code. 12.4k stars, actively maintained.

**Architecture:**
- `.claude-plugin/marketplace.json` — plugin manifest with name, owner, metadata, version
- `plugins/codex/skills/codex/SKILL.md` — skill definition (slash commands)
- `plugins/codex/` — plugin implementation directory
- Install: `/plugin marketplace add openai/codex-plugin-cc` → `/plugin install codex@openai-codex`

**Capabilities:**
- `/codex:review` — read-only code review (same quality as Codex /review)
- `/codex:adversarial-review` — steerable challenge review (pressure-test assumptions, tradeoffs)
- `/codex:rescue` — delegate a task to Codex to run in background
- `/codex:status` — check background job progress
- `/codex:result` — get final output (includes session ID for `codex resume`)
- `/codex:cancel` — cancel background job
- `/codex:setup` — check if Codex is ready, offer to install
- **Review gate**: Stop hook that auto-reviews Claude's response via Codex before allowing it through. WARNING: can drain usage limits in a loop.

**Key pattern:** Codex runs as a background agent (worktree/sandbox). Claude Code delegates TO Codex, gets results back. The plugin bridges two AI systems.

### 2. Claude Code Plugin Architecture

**Plugin structure:**
```
.claude-plugin/
  marketplace.json     # { name, owner, metadata, plugins[] }

plugins/<name>/
  package.json         # Standard npm package
  skills/<name>/
    SKILL.md           # Skill definition (frontmatter + instructions)
  hooks/               # Optional lifecycle hooks (Stop, PreToolUse, etc.)
```

**Available plugin types** (from anthropics/claude-code/plugins/):
- agent-sdk-dev, claude-opus-4-5-migration, code-review, commit-commands
- explanatory-output-style, feature-dev, frontend-design, hookify
- memory, mcp-client, sequential-thinking, todoist, and more

**Key hooks for integration:**
- `Stop` hook — intercept before Claude finishes (codex uses this for review gate)
- `PreToolUse` hook — intercept before a tool is called
- `SessionStart` hook — inject context at session start
- `UserPromptSubmit` hook — modify/enrich user prompts before processing

### 3. retention.sh

**Status:** Very early stage. Website shows only: "retention.sh — AI agents forget. retention.sh remembers." No GitHub repo found. No public docs. Tagline matches the memory-for-agents category but no product surface to analyze yet.

**Alternatives in the same space:**
- **Mem0** (mem0.ai) — dedicated memory layer, extracts memories from interactions
- **Letta** — OS-inspired virtual context management for LLMs
- **claude-mem** (thedotmack/claude-mem) — Claude Code plugin that captures sessions + injects context
- **memory-mcp** (yuvalsuede/memory-mcp) — persistent memory for Claude Code via MCP
- **claude_memory** (codenamev/claude_memory) — hooks + MCP + SQLite memory

## The Integration Chain: NodeBench → Claude Code → Codex

### What NodeBench Should Pass Down

When a user (founder, banker, CEO) has completed a search/diligence session in NodeBench, the result should be passable to Claude Code and Codex as actionable context:

```
NodeBench diligence packet
  ↓ (via MCP tool or Claude Code plugin)
Claude Code receives:
  - Company truth (identity, stage, wedge)
  - Contradictions found
  - Gap remediation steps (what to build/fix)
  - Delegation packet (objective, constraints, success criteria)
  ↓ (via /codex:rescue or Claude Code task)
Codex/Claude executes:
  - Build the pricing page (remediation item)
  - Fix the SEO structured data (remediation item)
  - Write the blog post (remediation item)
  - Run the test suite after changes
```

### Implementation Plan

#### Phase 1: NodeBench as Claude Code Plugin

Create a Claude Code plugin that:
1. Adds `/nodebench:search` — search any company from Claude Code
2. Adds `/nodebench:diligence` — run deep diligence, get packet in context
3. Adds `/nodebench:remediate` — pick a gap, get implementation instructions
4. Adds `/nodebench:packet` — inject the latest company truth packet into context
5. Uses `SessionStart` hook to inject subconscious whispers

**Plugin structure:**
```
.claude-plugin/
  marketplace.json

plugins/nodebench/
  package.json
  skills/nodebench/
    SKILL.md            # All slash commands
  hooks/
    session-start.ts    # Inject subconscious context
    stop.ts             # Optional: validate output against company truth
```

#### Phase 2: Codex Bridge

When NodeBench generates a remediation item, offer "Delegate to Codex":
1. NodeBench formats the remediation as a Codex-compatible task
2. Claude Code runs `/codex:rescue` with the task prompt
3. Codex executes in background (worktree sandbox)
4. `/codex:result` returns the output
5. NodeBench records the execution as a founder episode span

**Example flow:**
```
User searches "NodeBench" → gets remediation: "Create /about page"
  → Click "Delegate to Codex"
  → Claude Code: /codex:rescue Create an /about page for NodeBench AI with:
      - Founder: Homen Shum, banking + AI background
      - Product: Entity intelligence, 350 MCP tools
      - Mission: Hidden diligence requirements made visible
  → Codex creates src/pages/About.tsx in a worktree
  → /codex:result → Review → Merge
```

#### Phase 3: Memory Chain (NodeBench Subconscious ↔ Claude Code ↔ retention.sh)

The subconscious memory blocks should sync bidirectionally:
1. **NodeBench → Claude Code**: SessionStart hook injects relevant blocks
2. **Claude Code → NodeBench**: Stop hook captures what Claude learned, updates blocks
3. **retention.sh / Mem0**: If the user has a memory layer, NodeBench reads from it too

**This is exactly what the subconscious was built for.** The 12 memory blocks + whisper policy + graph engine are the persistence layer. The Claude Code hooks are the injection/capture mechanism.

#### Phase 4: Full Chain

```
Founder opens NodeBench → searches company → gets diligence packet
  ↓
Remediation items generated (SEO, pricing page, blog post)
  ↓
"Delegate to Claude Code" → packet injected as context
  ↓
Claude Code builds → /codex:rescue for background tasks
  ↓
Results flow back → NodeBench records as episode spans
  ↓
Subconscious updates memory blocks (company truth, validated workflows)
  ↓
Next session: whisper injects "you built the pricing page last session, SEO score improved from 50 to 72"
```

## File Inventory for NodeBench Plugin

```
packages/claude-code-plugin/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/nodebench/
│   ├── package.json
│   ├── skills/nodebench/
│   │   └── SKILL.md          # /nodebench:search, :diligence, :remediate, :packet
│   └── hooks/
│       ├── session-start.ts  # Inject subconscious whispers
│       └── stop.ts           # Capture learnings → update blocks
└── README.md
```

## Priority

1. **Now**: Write the SKILL.md + marketplace.json (plugin definition)
2. **Next**: Wire hooks to existing subconscious engine
3. **Later**: Codex bridge for remediation delegation
4. **Future**: retention.sh / Mem0 integration when those products mature
