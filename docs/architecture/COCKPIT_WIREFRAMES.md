# NodeBench Cockpit Wireframes

Design DNA: Perplexity Labs artifact clarity + Bloomberg persistent shell + Linear restraint.

---

## Screen 1: Default State (Ask Surface)

The user opens NodeBench. Clean, calm, focused on one action: ask a question.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [N] NodeBench           ┌─────────────────────┐    ⚡ Ready  [⚙]  │
│                          │ ⌘K Ask, search, jump │                   │
├──────────┬───────────────┴─────────────────────┴──┬──────────────────┤
│          │                                        │                  │
│  RECENT  │                                        │  AGENT           │
│          │           NodeBench                     │                  │
│  ○ Acme  │                                        │  No active run   │
│    Series│     See the variables. Compare          │                  │
│    A DD  │     the branches. Choose the            │  Start by asking │
│          │     next move.                          │  a question or   │
│  ○ GTM   │                                        │  picking a       │
│    Plan  │                                        │  workflow.       │
│          │  ┌────────────────────────────────┐    │                  │
│  ○ Market│  │ What should we build next?     │    │  ─────────────   │
│    Watch │  │                            [→] │    │                  │
│          │  └────────────────────────────────┘    │  QUICK START     │
│          │                                        │                  │
│  ──────  │  ┌──────────┐ ┌──────────┐ ┌────────┐ │  Investor DD     │
│          │  │ Investor │ │ Founder  │ │ Market │ │  Founder GTM     │
│  ENTITIES│  │ Diligence│ │ Strategy │ │ Watch  │ │  Product Memo    │
│          │  └──────────┘ └──────────┘ └────────┘ │  Competitive     │
│  Acme AI │                                        │                  │
│  Tests A.│                                        │                  │
│  OpenAI  │                                        │                  │
│  Anthr.  │                                        │                  │
│          │                                        │                  │
├──────────┴────────────────────────────────────────┴──────────────────┤
│  No recent activity                                          ⌃ Trace │
└──────────────────────────────────────────────────────────────────────┘
```

Key design choices:
- Center is hero + input + 3 workflow cards (Perplexity Labs feel)
- Left rail shows recent runs + entities (Bloomberg workspace)
- Right rail shows agent status (idle) + quick starts
- Bottom strip is collapsed trace (expandable)
- No sidebar nav items. Navigation IS the workspace rail + ⌘K.

---

## Screen 2: Active Decision Memo (Memo Surface)

User asked "Should Acme AI raise a Series A now or wait 6 months?"
The center canvas transforms into a full decision artifact.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [N] NodeBench  ▸ Acme AI Series A    ⌘K    ⚡ Researching...  [⚙] │
├──────────┬───────────────────────────────────────┬───────────────────┤
│          │                                       │                   │
│  RECENT  │  INVESTOR DILIGENCE                   │  AGENT            │
│          │  ━━━━━━━━━━━━━━━━━━━━                 │                   │
│  ● Acme  │                                       │  ● Analyzing      │
│    Active│  Should Acme AI raise a Series A      │    sources...     │
│          │  now or wait 6 months?                 │                   │
│  ○ GTM   │                                       │  Plan:            │
│  ○ Market│  Raise now. Conditional on activating  │  1. ✓ Extract vars│
│          │  2 trust-node intros this week and     │  2. ✓ Build claims│
│  ──────  │  validating enterprise pipeline.       │  3. ● Run sims   │
│          │                                       │  4. ○ Rank actions │
│  ENTITIES│  ┌─────────┐ ┌─────────┐ ┌─────────┐ │  5. ○ Render memo │
│          │  │QUESTION │ │SOURCES  │ │CONFID.  │ │                   │
│  Acme AI │  │Raise now│ │   7     │ │  68%    │ │  Tools:           │
│  Tests A.│  │or wait? │ │verified │ │ current │ │  extract_variables│
│  OpenAI  │  └─────────┘ └─────────┘ └─────────┘ │  build_claim_graph│
│          │                                       │  run_deep_sim     │
│          │  TOP VARIABLES               weight   │                   │
│          │  ┌─ Runway          ████████  0.92    │  Approvals:       │
│          │  ├─ NRR trajectory  ███████   0.85    │  None pending     │
│          │  ├─ Trust nodes     ██████    0.78    │                   │
│          │  ├─ Competition     █████     0.71    │  Evidence:        │
│          │  └─ Team gaps       ████      0.65    │  7 sources        │
│          │                                       │  4 verified       │
│          │  SCENARIOS                            │  23 claims        │
│          │  ┌────────────────────────────────┐   │                   │
│          │  │ Base: Raise at $48M pre        │   │  Confidence:      │
│          │  │ Optimistic: Close oversubscr.  │   │  ████████░░  68%  │
│          │  │ Defensive: Wait, build proof   │   │                   │
│          │  └────────────────────────────────┘   │  Drift: Low       │
│          │                                       │                   │
│          │  TOP INTERVENTIONS                    │                   │
│          │  1. Activate trust-node intros  +12%  │                   │
│          │  2. Ship enterprise pilot       +8%   │                   │
│          │  3. Publish benchmark proof     +6%   │                   │
│          │                                       │                   │
│          │  [📄 Evidence] [📊 Compare] [⬇ Export]│                   │
├──────────┴───────────────────────────────────────┴───────────────────┤
│  extract_variables ✓ 1.2s │ build_claim_graph ✓ 2.1s │ run_deep ●  │
└──────────────────────────────────────────────────────────────────────┘
```

Key design choices:
- Center is the ARTIFACT (not chat). Full decision memo above the fold.
- Variable chips with weight bars (Perplexity data viz feel)
- 3 scenario cards in compact view
- 3 ranked interventions with delta scores
- Right rail shows agent's LIVE state: plan progress, tools running, evidence count, confidence
- Bottom trace strip shows tool call timeline (like Bloomberg ticker)
- Left rail: active run highlighted, entities available for drill-down

---

## Screen 3: Research Mode

User switched to Research or agent is researching an entity.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [N] NodeBench  ▸ Research: AI Infrastructure   ⌘K   ⚡ Idle   [⚙] │
├──────────┬───────────────────────────────────────┬───────────────────┤
│          │                                       │                   │
│  RECENT  │  THE DAILY BRIEF                      │  AGENT            │
│          │  March 19, 2026 · 43 stories          │                   │
│  ○ Acme  │                                       │  No active run    │
│  ○ GTM   │  ┌────────────────────────────────┐   │                   │
│  ○ Market│  │ CVE-2026-32746 GNU telnetd     │   │  OPERATING PIC.  │
│          │  │ Buffer Overflow PoC - Critical  │   │                   │
│  ──────  │  │ r/netsec · 35 min ago          │   │  Sources: 65     │
│          │  └────────────────────────────────┘   │  Top star: 27    │
│  ENTITIES│                                       │  Active alerts: 0 │
│          │  ┌──────────────┐ ┌──────────────┐   │                   │
│  Acme AI │  │ Anti-Cheats  │ │ Strategy Pat.│   │  FINANCE          │
│  Tests A.│  │ Deep Dive    │ │ Low coupling │   │  Capital pulse    │
│  OpenAI  │  │ r/programming│ │ r/programming│   │  No new deals     │
│  Anthr.  │  └──────────────┘ └──────────────┘   │                   │
│          │                                       │  ENGINEERING      │
│  WATCHES │  ┌──────────────┐ ┌──────────────┐   │  GitHub radar     │
│          │  │ AWS S3 1PB/s │ │ Gov panel:   │   │  3 trending repos │
│  AI Infra│  │ on slow HDDs │ │ pay creators │   │                   │
│  Crypto  │  │ r/programming│ │ r/technology │   │                   │
│  Biotech │  └──────────────┘ └──────────────┘   │                   │
│          │                                       │                   │
│          │  ┌──────────────┐ ┌──────────────┐   │                   │
│          │  │ Instagram vs │ │ AI Brief     │   │                   │
│          │  │ WhatsApp     │ │ Morning      │   │                   │
│          │  │ r/technology │ │ Dossier      │   │                   │
│          │  └──────────────┘ └──────────────┘   │                   │
├──────────┴───────────────────────────────────────┴───────────────────┤
│  Last refresh: 12h ago                                       ⌃ Trace │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Screen 4: Investigation Mode (Split Pane)

User opened an investigation from Research. Center splits into evidence chain.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [N] NodeBench  ▸ Investigation: FTX   ⌘K    ⚡ Analyzing...  [⚙]  │
├──────────┬───────────────────────────────────────┬───────────────────┤
│          │                                       │                   │
│  RECENT  │  INVESTIGATION MODE: EVIDENCE-GROUNDED│  AGENT            │
│          │                                       │                   │
│  ● FTX   │  Investigate the FTX/Alameda balance  │  ● Tracing chain  │
│    Active│  sheet collapse: trace evidence,       │                   │
│          │  identify hypotheses, remediate.       │  Evidence: 7      │
│  ○ Acme  │                                       │  Hypotheses: 2    │
│          │  14.3s · 11 steps · 7 sources · 98%   │  Counter: 1       │
│  ──────  │                                       │                   │
│          │  OBSERVED FACTS                        │  Confidence:      │
│  ENTITIES│  1. CoinDesk reported Alameda held     │  ████████░░  77%  │
│          │     $14.6B in assets...        94%  ✓  │                   │
│  Acme AI │  2. Binance CEO liquidated FTT         │  Severity:        │
│  FTX     │     holdings...                92%  ✓  │  ████████████ 96% │
│  Alameda │  3. $6B withdrawals in 72h     94%  ✓  │                   │
│          │  4. FTX filed for bankruptcy    99%  ✓  │                   │
│          │                                       │                   │
│          │  DERIVED SIGNALS                       │                   │
│          │  ftt token price   96% severity        │                   │
│          │  ftx withdrawal    96% severity        │                   │
│          │                                       │                   │
│          │  HYPOTHESES                            │                   │
│          │  1. Alameda exposure + contagion       │                   │
│          │  2. Broader crypto market contagion    │                   │
│          │                                       │                   │
│          │  COUNTER-ANALYSIS                      │                   │
│          │  Was the decline contained or systemic?│                   │
├──────────┴───────────────────────────────────────┴───────────────────┤
│  web_search ✓ │ fetch_url ✓ │ extract_data ✓ │ judge_task ✓        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Screen 5: Postmortem / Compare Mode

After a decision memo plays out, the user reviews what actually happened.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [N] NodeBench  ▸ Postmortem: Acme A  ⌘K     ⚡ Idle          [⚙]  │
├──────────┬───────────────────────────────────────┬───────────────────┤
│          │                                       │                   │
│  RECENT  │  OVERALL FORECAST SCORE               │  AGENT            │
│          │  ★ 75%  Partially Correct              │                   │
│  ○ Acme  │                                       │  No active run    │
│  ○ GTM   │  ┌─PREDICTED────────┐┌─ACTUAL────────┐│                   │
│          │  │ Invest at $34M   ││ Series A at   ││  SCORING          │
│  ──────  │  │ Raise-now with   ││ $48M pre.     ││                   │
│          │  │ 3x NRR trajectory││ $6.2M ARR.    ││  Variable: 67%   │
│  ENTITIES│  │ as justification ││ NRR dropped   ││  Scenario: 82%   │
│          │  └──────────────────┘│ to 128%.      ││  Intervention: 75%│
│  Acme AI │                      └───────────────┘│  Recommend.: 88% │
│  Tests A.│                                       │  Outcome: 71%    │
│          │  SCORING DIMENSIONS                   │  Calibration: 65%│
│          │  ┌──────┐┌──────┐┌──────┐             │                   │
│          │  │Var.  ││Scen. ││Intv. │             │                   │
│          │  │ 67%  ││ 82%  ││ 75%  │             │                   │
│          │  └──────┘└──────┘└──────┘             │                   │
│          │  ┌──────┐┌──────┐┌──────┐             │                   │
│          │  │Rec.  ││Outc. ││Cal.  │             │                   │
│          │  │ 88%  ││ 71%  ││ 65%  │             │                   │
│          │  └──────┘└──────┘└──────┘             │                   │
│          │                                       │                   │
│          │  WHAT WE LEARNED                      │                   │
│          │  ✗ VP Eng departure not modeled       │                   │
│          │  ✗ Integration friction underweighted │                   │
│          │  ✓ Pro-rata rights provided signal    │                   │
│          │  ✓ Enterprise prospect intros worked  │                   │
├──────────┴───────────────────────────────────────┴───────────────────┤
│  Frozen: Feb 28, 2026  │  Forecast check: Sep 18, 2026             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Screen 6: System / Telemetry

User switches to system ops via ⌘K or left rail.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [N] NodeBench  ▸ System                ⌘K     ⚡ Idle         [⚙] │
├──────────┬───────────────────────────────────────┬───────────────────┤
│          │                                       │                   │
│  RECENT  │  [Overview] [Agents] [Benchmarks]     │  AGENT            │
│          │  [Health] [Spend] [Quality]            │                   │
│  ○ Acme  │                                       │  No active run    │
│  ○ GTM   │  ─── Overview ───                     │                   │
│          │                                       │  TRAJECTORY       │
│  ──────  │  Trajectory Intelligence              │  Trust-adj: 35%   │
│          │  Agent is drifting. 16 spans,          │  Compounding: 31% │
│  SYSTEM  │  0 evidence bundles.                   │  Drift: 10%      │
│          │                                       │                   │
│  Overview│  ┌────────┐┌────────┐┌────────┐       │  SUCCESS LOOPS    │
│  Agents  │  │Trust-  ││Raw     ││Drift   │       │  Strengthening: 0 │
│  Benchm. │  │adj 35% ││comp 31%││press   │       │  Mixed: 1         │
│  Health  │  │drifting││drifting││10% ✓   │       │  Weakening: 7     │
│  Spend   │  └────────┘└────────┘└────────┘       │                   │
│  Quality │                                       │                   │
│          │  Score Drivers                         │                   │
│          │  Span Quality      65%  improving     │                   │
│          │  Evidence          13%  drifting       │                   │
│          │  Adapt. Velocity   10%  drifting       │                   │
│          │  Trust Leverage     0%  drifting       │                   │
│          │  Intervention       0%  drifting       │                   │
│          │  Drift             10%  compounding    │                   │
│          │                                       │                   │
├──────────┴───────────────────────────────────────┴───────────────────┤
│  16 spans │ 12 verdicts │ 0 interventions │ $5.54 total cost        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Interaction Patterns

### Surface Switching
- User types in ⌘K → surfaces switch
- Agent auto-switches based on task (e.g., "researching" → Research surface)
- Left rail click → switches surface
- Bottom trace expandable to full timeline

### Drawers (not pages)
- Agent Actions / Permissions → slide-in drawer from right
- Entity profile → drawer or center canvas swap
- Evidence drawer → slides up from bottom or opens in right rail

### Progressive Disclosure
- Ask surface: minimal, 3 cards
- After prompt: full artifact fills center
- Right rail: collapsed by default on mobile, expanded on desktop
- Bottom trace: 48px strip, click to expand to 200px

---

## Color Palette (from existing theme)

- Background: `--surface` (dark: near-black)
- Cards: `--surface-secondary`
- Borders: `--edge`
- Text primary: `--content`
- Text secondary: `--content-secondary`
- Accent: indigo-600 (primary actions)
- Success: emerald (compounding, pass)
- Warning: amber (flat, needs attention)
- Danger: rose (drifting, denied)
- Info: cyan (improving)

No neon. No gradients. Bloomberg calm with Perplexity clarity.
