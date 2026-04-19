# Competitive Intelligence — March 29, 2026

## Verdict: Stay stealth. Our moat is real but thin. Distribution is the #1 gap.

---

## Threat Matrix

| Competitor | Threat | Actual Product | Moat | Can they copy us? |
|---|---|---|---|---|
| **Canary** (YC W26) | LOW | PR-triggered QA from code reading. Closed source, free beta. | Code-intent inference (reads backend routes, not just DOM) | No — pure CI/QA, no entity intel, no MCP breadth |
| **Bug0** | LOW | Managed QA at $2,500/mo. 200+ teams paying. SOC2. | Forward-deployed engineers + self-healing selectors | No — services model, no knowledge layer |
| **Pensieve** | MEDIUM | Knowledge graph from internal tools (Slack, Linear). Launched PH today. Free, BYOI. | Proactive intelligence ("you should know X") + outcome learning | Could overlap entity-context positioning in 6+ months |
| **Context7** | LOW direct / HIGH lesson | 2 tools: resolve library ID + fetch docs. 51k stars, 240k weekly npm downloads. | First-mover simplicity. Scored F on schema quality but still #1. | No — single-concept utility vs 350-tool platform |
| **retention.sh** | PARTNER | MCP QA with trajectory replay. 70+ tools. | Run-N-is-free memory compounding | Complementary, not competitive |
| **Composio** | LOW direct | 982 integrations, managed OAuth. $29/mo. 27k stars. SOC2/ISO. | Auth plumbing for 850+ toolkits | Horizontal plumbing vs our vertical intelligence. Complement. |

## What we have that nobody else has

1. 350-tool breadth + progressive discovery + lazy loading — nobody
2. External entity intelligence for diligence — Pensieve does internal only
3. Multi-persona presets (founder/banker/operator/researcher) — nobody
4. Co-occurrence edges + BFS traversal for tool discovery — nobody
5. Integrated MCP server + web app + CLI in one package — nobody

## What they have that we don't

1. **Distribution** — Context7: 51k stars. Composio: 27k. Us: ~0 public signal
2. **Revenue** — Bug0: 200+ teams at $250-$2,500/mo. Us: $0
3. **CI/CD integration** — Canary: PR comments with test results. Us: none
4. **Managed auth** — Composio: OAuth for 982 services. Us: manual API keys
5. **SOC2** — Bug0 + Composio certified. Us: not started
6. **Proactive intelligence** — Pensieve: surfaces insights before you ask. Us: requires explicit queries

## The Context7 lesson (most important finding)

Context7 is the #1 MCP server with 51k stars and 240k weekly downloads. It has exactly 2 tools. It scored F (7.5/100) on schema quality. It wins because:
- Solves ONE universal pain (stale docs in LLM training data)
- Frictionless install (one JSON line)
- Two tools = instant understanding
- Backed by Upstash brand

Our 350-tool breadth is a power-user moat but a discovery barrier. We need a "Context7-like" entry point — one tool that hooks people, then progressive discovery expands.

## Strategic recommendation

**Don't broadcast. Build deeper. Ship the hook.**

1. One killer tool that stands alone (entity_lookup or site_map)
2. Get 3-5 real users silently (teammates, friends)
3. Wait for Claude/Cursor marketplace reviews (distribution without broadcasting)
4. Consider Composio partnership (their auth + our intelligence)
5. Ship npm 2.71.0 so the product works if someone finds it
