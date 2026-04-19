# Diligence Blocks — The Block Contract

**Status:** Living · Last reviewed 2026-04-19
**Owner:** Core team
**Supersedes:** `DELTA_SELF_DILIGENCE_SPEC.md`, `DEEP_SIM_PRODUCT_SPEC.md`, `COMPETITIVE_INTEL_MAR29.md`, `ATTRITION_REDESIGN_SPEC.md`, `funding-detection-architecture.md`, `COMPETITIVE_GAP_ANALYSIS.md` — archived under `docs/archive/2026-q1/`.

## TL;DR

Diligence blocks are a **primitive** (`DiligenceBlock<T>`) — one generic pipeline, many configs. Each block identifies a specific dimension of public intelligence about a company / market / person (founders, products, patents, news, hiring, etc.). Adding a new block = writing a config + a renderer + fixtures, not a new pipeline.

## Prior art

The block abstraction borrows from:

- **Bloomberg terminal panel system** — orthogonal information categories per entity
- **Crunchbase entity profiles** — source-attributed facts per dimension
- **SEC EDGAR filings schema** — the authority-allowlist pattern
- **Anthropic tool schemas** — typed I/O contract per block

## Invariants

1. **One primitive, many configs.** No block file duplicates pipeline logic.
2. **Every block has an authority allowlist.** A block cannot consult arbitrary sources — only domains explicitly on its allowlist count toward confidence tiers.
3. **Every block emits honest confidence.** No hardcoded `"verified"` — confidence is computed from source count × source authority × agreement × `isGrounded()`.
4. **Every block is independently opt-out-able.** Me-level preference lets users skip specific blocks per-query OR globally.
5. **Always-all by default** — first-time users get full enrichment. Opt-out is user-initiated.
6. **Blocks run in parallel** — no block depends on another's completion (except via shared scratchpad read).
7. **Legal fence holds:** no Glassdoor scraping · no X read-without-paid-API · no PitchBook · no paid SimilarWeb/Apptopia in v1.

## The block contract

```ts
export type DiligenceBlock<TSchema> = {
  blockType:
    | "founder" | "product" | "patent" | "news" | "hiring"
    | "publicOpinion" | "funding" | "competitor" | "regulatory"
    | "financial";

  sources: SourceConfig[];              // which surfaces to query
  extractor: LLMExtractor<TSchema>;     // structured output schema + prompt
  gates: BooleanGate[];                 // block-specific verification gates
  attribution: {
    targetEntity: "company" | "person" | "market";
    mergeStrategy: MergeStrategy;       // how new facts combine with existing
  };
  authority: DomainAllowlist;           // what counts as "official" for tiering
  budget: {
    maxToolCalls: number;
    maxTokensOut: number;
    maxWallMs: number;
  };
};
```

## The ten blocks

| Block | Extracts | Authority allowlist | Attribution target | v1 priority |
|---|---|---|---|---|
| `founder` | Co-founders, operators, roles, tenure | Company About · LinkedIn (public) · YC · Crunchbase · press allowlist | person-as-founder | **Phase 1** |
| `product` | Products, features, pricing, launch dates | Company site · ProductHunt · App Store · Play Store | product-of-company | Phase 2 |
| `funding` | Rounds, investors, valuations | SEC EDGAR · Crunchbase · press releases | company (funding history) | Phase 2 |
| `news` | Headlines, dates, reputable coverage | Newsroom allowlist (WSJ · Bloomberg · Reuters · TechCrunch · FT · local press) | company (timeline) | Phase 3 |
| `hiring` | Open roles, headcount trend, team shape | Company careers page · LinkedIn Jobs (if licensed) | company (hiring signal) | Phase 3 |
| `patent` | Filings, inventors, priority dates | USPTO · EPO · Google Patents | company + inventor | Phase 4 |
| `publicOpinion` | Sentiment aggregate, recurring themes | Reddit (free tier) · HN · forum allowlist | company (reputation) | Phase 4 |
| `competitor` | Companies in same market, relative positioning | Byproduct of news + product | market-of-company | Phase 5 |
| `regulatory` | Lawsuits, court filings, agency actions | CourtListener (free) · SEC enforcement · FTC/CFPB | company (risk flags) | Phase 5 |
| `financial` | Revenue proxies, traffic, app DAU | SimilarWeb · Apptopia · PitchBook | company (scale) | **v2 — paid APIs** |

## Confidence tiers

Every candidate emerging from a block gets one of four tiers, computed — never hardcoded:

```
verified      — ≥2 independent authority sources + agreement + passed all gates
corroborated  — 1 authority source + 1 non-authority source, agreement, passed gates
single-source — 1 source (of any tier), passed gates
unverified    — failed any gate OR ≤1 non-authority source
```

Unverified candidates are **surfaced in the company report** as "mentioned but not saved," never silent-dropped. User can manually verify to promote.

## Legal fence — what we don't do

| Source | Why excluded from v1 | Path to enable later |
|---|---|---|
| Glassdoor | TOS prohibits scraping | Official partner API (requires paid license) |
| X / Twitter | Paid API tier required even for read | Defer or use public previews only |
| PitchBook | Paid data product | Partnership or skip |
| SimilarWeb / Apptopia | Paid | v2 with paid-API tier |
| News article bodies | Copyright | RSS + OG metadata + headline only · never reproduce body |

## How to extend — adding a new block

1. **Create config**

   ```ts
   // server/pipeline/blocks/<name>.ts
   export const PatentBlock: DiligenceBlock<PatentSchema> = {
     blockType: "patent",
     sources: [usptoSource, epoSource, googlePatentsSource],
     extractor: { prompt: "...", schema: PatentSchema },
     gates: [nameMatches, inventorCorroborated, priorityDateValid],
     attribution: { targetEntity: "company", mergeStrategy: "append" },
     authority: patentOfficesAllowlist,
     budget: { maxToolCalls: 15, maxTokensOut: 3000, maxWallMs: 90_000 },
   };
   ```

2. **Add authority allowlist**
   `server/pipeline/authority/patentOfficesAllowlist.ts` — list of domains that count as "official" for tiering.

3. **Add extraction schema + prompt**
   Zod schema + block-specific extraction prompt. Keep prompt under 800 tokens.

4. **Add prose-native renderer**
   `src/features/entities/components/notebook/renderers/PatentRenderer.tsx` — renders as a ProseMirror decoration (see [PROSEMIRROR_DECORATIONS.md](PROSEMIRROR_DECORATIONS.md)). Same component reused for Classic view.

5. **Add fixtures + tests**
   `packages/mcp-local/src/benchmarks/fixtures/patent-corpus-seed.json` — 5–10 representative cases.

6. **Register in orchestrator's default block set** — simply add the config to the fan-out list.

Pipeline primitive (`server/pipeline/diligenceBlock.ts`) handles the rest.

## Failure modes per block

| Block | Common failure | Mitigation |
|---|---|---|
| `founder` | Homonym collision (4 "John Smith"s match) | `noHomonymCollision` gate requires confirming tenure + role consistency |
| `patent` | USPTO 429 | Exponential backoff, mark as known-gap, auto-feedback draft |
| `news` | Paywall blocks body text | OG metadata + headline only, never reproduce body |
| `hiring` | Careers page JavaScript-rendered | Puppeteer fallback with bounded size limit |
| `publicOpinion` | Reddit API quota | Sample N items, degrade gracefully, honest "partial" tier |

## Block render order on the entity page

```
Founders → Products → Funding → Recent news → Hiring → Patents → Public opinion → Competitor → Regulatory
```

Founder-first matches the product pitch ("Founder-Intelligence MCP"). Render order is configurable at the Me level for users who want a different default.

## Related docs

- [AGENT_PIPELINE.md](AGENT_PIPELINE.md) — the orchestrator that fans out blocks
- [SCRATCHPAD_PATTERN.md](SCRATCHPAD_PATTERN.md) — how blocks share state
- [PROSEMIRROR_DECORATIONS.md](PROSEMIRROR_DECORATIONS.md) — how blocks render in the live notebook
- [EVAL_AND_FLYWHEEL.md](EVAL_AND_FLYWHEEL.md) — block-level eval corpus (deferred to v2)

## Changelog

| Date | Change |
|---|---|
| 2026-04-19 | Initial consolidation. 10 blocks + legal fence declared. |
