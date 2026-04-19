# NodeBench AI — Postable Benchmarks

Generated: 2026-01-04T09:30:58.598Z
Git SHA: d547fac9b26843b5b6921d9b9b7b3297e918324e
Convex: https://formal-shepherd-851.convex.cloud
Iterations (MCP smoke): 5
Include Linkup: no
Include Persona Live Eval: no

## 1) MCP + Live API Smoke (MCP-1/4/5)
This suite validates: Core-agent planning/memory tools, OpenBB executeTool, Research fusion_search, plus public provider health checks.

| Check | Pass | p50 (ms) | p95 (ms) | mean (ms) |
|---|---:|---:|---:|---:|
| openbb_executeTool | 100% (5/5) | 8065 | 8283 | 8038 |
| research_executeTool | 100% (5/5) | 868 | 4323 | 1641 |
| coreAgentMcp_toolsCall | 100% (5/5) | 1857 | 2069 | 1920 |
| openai_modelsList | 100% (5/5) | 611 | 1012 | 680 |
| openbb_health | 100% (5/5) | 313 | 485 | 354 |
| research_health | 100% (5/5) | 315 | 346 | 318 |
| youtube_search | 100% (5/5) | 294 | 308 | 298 |
| openbb_listTools | 100% (5/5) | 194 | 244 | 204 |
| research_listTools | 100% (5/5) | 189 | 232 | 199 |
| coreAgentMcp_toolsList | 100% (5/5) | 150 | 159 | 152 |
| sourceArtifacts_created | 100% (5/5) | 121 | 147 | 127 |
| anthropic_modelsList | 100% (5/5) | 83 | 93 | 81 |
| gemini_modelsList | 100% (5/5) | 58 | 71 | 61 |
| linkup_fetch | 100% (5/5) | 0 | 0 | 0 |
| linkup_search | 100% (5/5) | 0 | 0 | 0 |

## 2) System E2E (Daily Brief + Fast Agent Context + QA)
Overall: PASS

- Daily brief: ok=true day=2026-01-04 title=Morning Dossier - 2026-01-04
- Fast Agent local context: ok=true elapsedMs=8913
  - timezone=America/Los_Angeles, location=San Francisco, CA, US, utcDay=2026-01-04
  - trendingTopics=Trending, Research, AI, ML, Python
- Anonymous QA suite: ok=true passed=3/3

## Notes
- This report is generated without printing secrets; MCP/LLM keys are not included.
- Re-run with: `set CONVEX_URL=...; set MCP_SECRET=...; npx tsx scripts/run-postable-benchmarks.ts --iterations 5 --include-linkup --include-persona`
