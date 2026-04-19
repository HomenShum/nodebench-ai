# NodeBench AI — Architecture at a Glance

This is the top-level pointer. The actual architecture lives in
[`docs/architecture/`](docs/architecture/README.md) — 13 canonical docs in a
4-tier structure. Start there for depth.

## One-minute summary

NodeBench is an open-source (MIT) **founder-intelligence MCP**.

```
User pastes a company / URL / notes
           │
           ▼
┌────────────────────────────────────┐
│ Orchestrator (harnessed agent)     │  ← orchestrator-workers pattern
│  shared scratchpad (markdown)      │  ← agent's working memory
└────────────────────────────────────┘
           │ fans out
           ▼
┌──────────────────────────────────────────────────┐
│ Sub-agent per diligence block (fresh context):   │
│ founder · product · funding · news · hiring ·    │
│ patent · publicOpinion · competitor · regulatory │
└──────────────────────────────────────────────────┘
           │ each writes to its section of the scratchpad
           ▼
┌────────────────────────────────────┐
│ Self-review + structuring pass     │  ← second LLM call, markdown → structured data
└────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Attribution + contribution log     │  ← deterministic merge into entities
└────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ UI surfaces:                        │
│  • Chat with live trace block      │
│  • Company entity page (sections)  │
│  • Session Artifacts panel         │
│  • Reports grid                    │
└────────────────────────────────────┘
```

## The 13 canonical docs (and what they cover)

See [`docs/architecture/README.md`](docs/architecture/README.md) for the
full indexed map. Quick preview:

### Tier 1 — core pipeline
- [`AGENT_PIPELINE.md`](docs/architecture/AGENT_PIPELINE.md) — orchestrator-workers, scratchpad, telemetry, self-review, auto-feedback
- [`DILIGENCE_BLOCKS.md`](docs/architecture/DILIGENCE_BLOCKS.md) — block contract, 10 blocks, authority allowlists
- [`USER_FEEDBACK_SECURITY.md`](docs/architecture/USER_FEEDBACK_SECURITY.md) — 8-threat model, layered controls

### Tier 2 — sub-patterns
- [`SCRATCHPAD_PATTERN.md`](docs/architecture/SCRATCHPAD_PATTERN.md) — write-revise-structure, version-lock, drift detection
- [`PROSEMIRROR_DECORATIONS.md`](docs/architecture/PROSEMIRROR_DECORATIONS.md) — decoration-first render, accept-to-convert
- [`AGENT_OBSERVABILITY.md`](docs/architecture/AGENT_OBSERVABILITY.md) — live trace tree, metric rollups
- [`SESSION_ARTIFACTS.md`](docs/architecture/SESSION_ARTIFACTS.md) — live panel, wrap-up, pending strip

### Tier 3 — features
- [`FOUNDER_FEATURE.md`](docs/architecture/FOUNDER_FEATURE.md) — founder as a trait, Me + Reports trickles
- [`REPORTS_AND_ENTITIES.md`](docs/architecture/REPORTS_AND_ENTITIES.md) — grid, entity page modes, freshness tiering
- [`AUTH_AND_SHARING.md`](docs/architecture/AUTH_AND_SHARING.md) — public URLs, anonymous fidelity, claim flow

### Tier 4 — cross-cutting
- [`MCP_INTEGRATION.md`](docs/architecture/MCP_INTEGRATION.md) — 350-tool MCP server, install, presets
- [`EVAL_AND_FLYWHEEL.md`](docs/architecture/EVAL_AND_FLYWHEEL.md) — current harness + deferred Karpathy flywheel
- [`DESIGN_SYSTEM.md`](docs/architecture/DESIGN_SYSTEM.md) — glass DNA, terracotta, typography, state pills

## Where things live in the repo

See the "Codebase map" section in [`README.md`](README.md). Canonical paths:

| Layer | Path | Purpose |
|---|---|---|
| UI (React) | `src/features/<feature>/` | Feature-first, tests colocated |
| Backend (Convex) | `convex/domains/<domain>/` | 19 domain folders, not 55 |
| Agent harness (Node) | `server/pipeline/` | Pipeline primitive + blocks |
| MCP packages | `packages/mcp-local/` | Published npm (`nodebench-mcp`) |
| Claude Code conventions | `.claude/rules/` + `.claude/skills/` | 31 rules + skills · modular · cross-linked |
| Docs | `docs/` | Golden-standard reference |

## Prior art

Patterns in this codebase are borrowed with attribution from:

- **Anthropic** — "Building Effective Agents" (orchestrator-workers, evaluator-optimizer); Claude Code's layered file-based memory (CLAUDE.md + MEMORY.md + topic files + skills); Opus 4.7 file-system memory release notes
- **Manus AI** — virtual workspace, streaming scratchpad
- **Cognition (Devin)** — bounded iteration, markdown notes
- **Cursor** — checked-in conventions (`.cursorrules`), composer sub-agents
- **Perplexity** — agent mode with live step cards
- **OpenAI** — o1 reasoning display, memory extraction
- **LangSmith / Helicone / Braintrust** — agent trace schemas
- **Linear** — keyboard-first + feedback templates

Each doc in `docs/architecture/` has its own "Prior art" section with the
specific references that shaped that subsystem.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT. See [`LICENSE`](LICENSE).
