# NodeBench AI — Postable Benchmarks

Generated: 2026-01-04T07:21:52.155Z
Git SHA: d547fac9b26843b5b6921d9b9b7b3297e918324e
Convex: https://formal-shepherd-851.convex.cloud
Iterations (MCP smoke): 3
Include Linkup: yes
Include Persona Live Eval: no

## 1) MCP + Live API Smoke (MCP-1/4/5)
This suite validates: Core-agent planning/memory tools, OpenBB executeTool, Research fusion_search, plus public provider health checks.

| Check | Pass | p50 (ms) | p95 (ms) | mean (ms) |
|---|---:|---:|---:|---:|
| openbb_executeTool | 100% (3/3) | 8811 | 9693 | 8927 |
| research_executeTool | 100% (3/3) | 2332 | 6395 | 3445 |
| linkup_search | 100% (3/3) | 3950 | 4517 | 3993 |
| openbb_health | 100% (3/3) | 1007 | 2480 | 1326 |
| coreAgentMcp_toolsCall | 100% (3/3) | 1994 | 2455 | 2120 |
| openai_modelsList | 100% (3/3) | 556 | 727 | 603 |
| research_health | 100% (3/3) | 308 | 334 | 302 |
| youtube_search | 100% (3/3) | 292 | 316 | 299 |
| openbb_listTools | 100% (3/3) | 200 | 204 | 194 |
| coreAgentMcp_toolsList | 100% (3/3) | 156 | 195 | 165 |
| research_listTools | 100% (3/3) | 176 | 181 | 174 |
| anthropic_modelsList | 100% (3/3) | 98 | 126 | 103 |
| gemini_modelsList | 100% (3/3) | 71 | 122 | 87 |

## 2) System E2E (Daily Brief + Fast Agent Context + QA)
Overall: PASS

- Daily brief: ok=true day=2026-01-04 title=Morning Dossier - 2026-01-04
- Fast Agent local context: ok=true elapsedMs=8885
  - timezone=America/Los_Angeles, location=San Francisco, CA, US, utcDay=2026-01-04
  - trendingTopics=Trending, Research, AI, ML, Python
- Anonymous QA suite: ok=true passed=3/3

## Notes
- This report is generated without printing secrets; MCP/LLM keys are not included.
- Re-run with: `set CONVEX_URL=...; set MCP_SECRET=...; npx tsx scripts/run-postable-benchmarks.ts --iterations 5 --include-linkup --include-persona`
