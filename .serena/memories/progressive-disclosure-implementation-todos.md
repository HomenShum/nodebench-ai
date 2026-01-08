# Progressive Disclosure Implementation TODOs (Authoritative)

**Last Updated:** 2026-01-08
**Status:** ALL PHASES + INTEGRATION COMPLETE ✅

---

## Implementation Status Summary

### P0 — COMPLETE ✅
| Item | File | Status |
|------|------|--------|
| DisclosureEvent type + logger | `convex/domains/telemetry/disclosureEvents.ts` | ✅ DONE |
| Tool execution gateway | `convex/tools/meta/toolGateway.ts` | ✅ DONE |
| Episode-level disclosure reducer | `convex/domains/evaluation/personaEpisodeEval.ts` | ✅ DONE |
| NDJSON output mode | `scripts/run-fully-parallel-eval.ts` | ✅ DONE |
| Non-scored disclosure warnings | `scripts/run-fully-parallel-eval.ts` | ✅ DONE |
| Summarize disclosure script | `scripts/summarize-disclosure.ts` | ✅ DONE |

### P1 — COMPLETE ✅
| Item | File | Status |
|------|------|--------|
| Retrieval-first persona - `classifyPersona` tool | `convex/tools/meta/skillDiscovery.ts` | ✅ DONE |
| Action drafts table - schema for write op confirmation | `convex/schema.ts` | ✅ DONE |
| Tool schema token metric (`estimatedToolSchemaTokens`) | `convex/domains/evaluation/personaEpisodeEval.ts` | ✅ DONE |
| Gateway + meta-tools in coordinatorAgent | `convex/domains/agents/core/coordinatorAgent.ts` | ✅ DONE |

### P2 — COMPLETE ✅
| Item | File | Status |
|------|------|--------|
| Gateway skill allowlist enforcement | `convex/tools/meta/toolGateway.ts:162-171` | ✅ DONE |
| Risk tier confirmation flow (draft→confirm) | `convex/tools/meta/toolGateway.ts:176-204` | ✅ DONE |
| Action draft mutations | `convex/tools/meta/actionDraftMutations.ts` | ✅ DONE |
| New workflow skills (5) | `convex/tools/meta/seedSkillRegistry.ts` | ✅ DONE |

### P3 — COMPLETE ✅
| Item | File | Status |
|------|------|--------|
| 16 Digest persona skills | `convex/tools/meta/seedSkillRegistry.ts` | ✅ DONE |
| L3 nested resource schema support | `convex/schema.ts:3796-3803` | ✅ DONE |
| Skill caching (contentHash + version) | `convex/schema.ts:3805-3807` | ✅ DONE |
| New indexes for caching | `convex/schema.ts:3825-3826` | ✅ DONE |

---

## Integration Work Completed (2026-01-08)

| Integration Point | File | Status |
|-------------------|------|--------|
| DisclosureTrace UI component | `src/features/agents/components/FastAgentPanel/FastAgentPanel.DisclosureTrace.tsx` | ✅ DONE |
| FastAgentPanel state integration | `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx` | ✅ DONE |
| Digest persona skill loading | `convex/domains/agents/digestAgent.ts` | ✅ DONE |
| DisclosureMetrics in streamAsync | `convex/domains/agents/fastAgentPanelStreaming.ts` | ✅ DONE |

---

## Skills Inventory (31 Total)

### Research Skills (10)
1. `company-research` - Comprehensive company dossier
2. `document-creation` - Document creation workflow
3. `media-research` - Media discovery and analysis
4. `financial-analysis` - Financial data analysis
5. `bulk-entity-research` - Batch entity research
6. `persona-inference` - Query → persona classification
7. `vc-thesis-evaluation` - Investment thesis generation
8. `quant-signal-analysis` - Signal extraction
9. `product-designer-schema` - UI-ready JSON output
10. `sales-engineer-summary` - One-screen summaries

### Workflow Skills (5)
11. `meeting-scheduler` - Calendar scheduling with availability check
12. `email-outreach` - Professional email drafting and sending
13. `document-section-enrichment` - Enrich sections with research
14. `document-citation-audit` - Audit and fix citations
15. `calendar-availability-check` - Find open time slots

### Digest Persona Skills (16)
16. `digest-jpm-startup-banker` - Funding, M&A, deal flow
17. `digest-early-stage-vc` - Seed/Series A, thesis validation
18. `digest-cto-tech-lead` - Security, architecture, engineering
19. `digest-founder-strategy` - Positioning, competitive moves
20. `digest-academic-rd` - Research papers, methodology
21. `digest-enterprise-exec` - Vendor risk, procurement, P&L
22. `digest-ecosystem-partner` - Partnerships, ecosystem shifts
23. `digest-quant-analyst` - Signals, metrics, KPIs
24. `digest-product-designer` - UI patterns, design systems
25. `digest-sales-engineer` - Outbound, objection handling
26. `digest-pm-product-manager` - Product launches, features
27. `digest-ml-engineer` - Model releases, MLOps, benchmarks
28. `digest-security-analyst` - CVEs, breaches, compliance
29. `digest-growth-marketer` - Viral trends, channel opportunities
30. `digest-data-analyst` - Data tools, analytics platforms
31. `digest-general` - Broad tech and business coverage

---

## Key Files Summary

| Component | File | Lines Added |
|-----------|------|-------------|
| Gateway | `convex/tools/meta/toolGateway.ts` | ~400 |
| Action Drafts | `convex/tools/meta/actionDraftMutations.ts` | ~200 (NEW) |
| Skills Registry | `convex/tools/meta/seedSkillRegistry.ts` | ~700 |
| Schema | `convex/schema.ts` | ~20 |
| Skill Discovery | `convex/tools/meta/skillDiscovery.ts` | ~140 |
| Coordinator | `convex/domains/agents/core/coordinatorAgent.ts` | ~15 |
| DisclosureTrace UI | `src/features/agents/components/FastAgentPanel/FastAgentPanel.DisclosureTrace.tsx` | ~430 (NEW) |
| DigestAgent Skills | `convex/domains/agents/digestAgent.ts` | ~80 |
| StreamAsync Metrics | `convex/domains/agents/fastAgentPanelStreaming.ts` | ~30 |
