# NodeBench Delta — Attention Engineering Spec

> "Like a leash to a dog" — engineer the product so users cannot think twice but to come back.

**Date:** 2026-03-29
**Goal:** Cover every angle in distribution, fundamentals, accessibility, and friction reduction so that NodeBench becomes a daily habit, not a one-time demo.

---

## The Attention Stack

Attention engineering is not about tricks. It is about removing every reason NOT to come back while adding one clear reason TO come back.

```
Layer 1: ZERO-FRICTION ENTRY     — 1 command, 1 result, no signup
Layer 2: IMMEDIATE VALUE          — first useful packet in < 30 seconds
Layer 3: VARIABLE REWARD          — what changed? what matters? (daily brief)
Layer 4: STORED VALUE              — packets, watchlist, memory compound over time
Layer 5: SOCIAL TRIGGER            — shareable outputs bring new users
Layer 6: ACCESSIBILITY             — works for everyone, everywhere, every device
Layer 7: DISTRIBUTION COVERAGE     — every channel where users discover tools
```

---

## Layer 1: Zero-Friction Entry

**Current state:** 1 command install, hackathon preset, CLI verbs.
**Goal:** The first useful result arrives BEFORE the user has to make any decision.

### Setup Friction Audit

| Step | Current | Target | Fix |
|------|---------|--------|-----|
| Install MCP | `claude mcp add nodebench -- npx -y nodebench-mcp --preset=hackathon` | Same (already 1 command) | Done |
| First result | User must know which tool to call | Auto-run `delta_brief` on first start | Add `--auto-brief` flag |
| Auth required? | No — works offline, no account | Same | Done |
| Config required? | No — preset handles everything | Same | Done |
| Time to first packet | ~10 seconds (tool loads + handler) | < 5 seconds | Optimize toolset loading |

### Implementations

#### 1.1 Auto-Brief on First Start
When `--preset=hackathon` or `--preset=delta` is used and no prior packets exist, automatically run `delta_brief` and display the result. User gets value before they even ask.

```typescript
// In index.ts, after MCP server starts, if using delta/hackathon preset:
if ((preset === "hackathon" || preset === "delta") && !hasExistingPackets()) {
  const briefResult = await deltaTools.find(t => t.name === "delta_brief")?.handler({});
  console.error("[delta] Your first daily brief is ready. Use delta_scan for self-diligence.");
}
```

#### 1.2 Progressive Onboarding via Tool Suggestions
Every tool response includes `nextTools` — the agent always knows what to do next. No dead ends.

```
delta_brief → suggests delta_diligence, delta_memo, delta_watch
delta_diligence → suggests delta_watch, delta_compare, delta_memo
delta_memo → suggests delta_handoff, delta_watch
delta_watch → suggests delta_brief, delta_diligence
```

This creates a **closed loop** — users never land in a state where they don't know what's next.

#### 1.3 One-Command Everything
```bash
# Hackathon team (intelligence + QA):
claude mcp add nodebench -- npx -y nodebench-mcp --preset=hackathon

# Quick entity research:
npx nodebench-mcp diligence "Stripe"

# Daily founder reset:
npx nodebench-mcp brief

# Decision-ready memo:
npx nodebench-mcp memo "Should we raise at this valuation?"
```

---

## Layer 2: Immediate Value

**Current state:** Demo packets available, live search works.
**Goal:** Every entry point produces a useful result within 30 seconds.

### Entry Point → Value Map

| Entry Point | What User Gets | Time to Value | Status |
|------------|---------------|---------------|--------|
| `npx nodebench-mcp brief` | Daily what-changed digest | ~5s | LIVE |
| `npx nodebench-mcp diligence Anthropic` | Entity intelligence packet | ~5s | LIVE |
| `npx nodebench-mcp scan` | Self-diligence market scan | ~5s | LIVE |
| `nodebenchai.com` (search bar) | Entity result with 6 role lenses | ~10s | LIVE |
| `nodebenchai.com/company/demo` | Public company profile | < 1s | LIVE |
| `nodebenchai.com/memo/demo` | Shareable decision memo | < 1s | LIVE |
| `/embed/memo/demo` | Embeddable memo widget | < 1s | LIVE |
| Hackathon install | Full toolkit ready | ~30s | LIVE |

### Value Quality Checklist

Every result must pass:
- [ ] **Actionable** — tells user what to do next (nextTools, recommendations)
- [ ] **Evidence-backed** — cites sources or data, not just opinions
- [ ] **Shareable** — can be copied, linked, or embedded
- [ ] **Time-stamped** — user knows how fresh this is
- [ ] **Confidence-scored** — user knows how reliable this is

---

## Layer 3: Variable Reward (The Return Hook)

**Current state:** Session delta view exists, daily brief tool works.
**Goal:** Every session shows something different. The product is never the same twice.

### Reward Mechanisms

#### 3.1 Daily Brief (delta_brief)
The anchor habit. Run every morning, get:
- What changed in your entities since last session
- New watchlist alerts
- Packet readiness (which memos need regeneration)
- Recommended actions

**Variable element:** The content is ALWAYS different because:
- New packets were created
- Watched entities may have changed
- Time-based freshness shifts (warming → stale)
- Market signals evolve

#### 3.2 Watchlist Alerts
When a watched entity has a material change:
- "Anthropic shipped Claude 4.6" → appears in your brief
- "Stripe changed pricing" → flagged as material change
- "Your competitor raised $5M" → high-importance signal

**Variable element:** You never know what will show up. This is the TikTok For You Page equivalent — personalized, time-sensitive, and different every time.

#### 3.3 Packet Compounding
Each session builds on the last:
- Session 1: Run `delta_diligence Stripe` → creates packet
- Session 2: `delta_brief` shows the Stripe packet + any changes
- Session 3: `delta_compare Stripe Square` → uses stored Stripe data
- Session 4: `delta_memo "Switch to Stripe?"` → references comparison
- Session 5: `delta_review` → checks if the decision was right

**Variable element:** The packets interact and compound. The more you use it, the more context it has, the better the results.

#### 3.4 Contradiction Detection
When stored packets contain conflicting claims:
- "You said Stripe is too expensive in memo #3, but your diligence shows they reduced prices in packet #7"
- This forces engagement — you have to resolve the contradiction

---

## Layer 4: Stored Value (Investment Mechanism)

**Current state:** SQLite-backed packets, watchlist, session memory.
**Goal:** The cost of leaving increases over time.

### What Accumulates

| Asset | How It Grows | Switching Cost |
|-------|-------------|---------------|
| **Packets** | Every brief, diligence, memo creates a packet | History of decisions and analysis |
| **Watchlist** | Entities added over time | Monitoring setup is manual to recreate |
| **Session memory** | Each conversation builds context | Rebuilt from scratch elsewhere |
| **Company truth** | Founder profile, wedge, mission, confidence | Identity representation |
| **Decision trail** | Memos, forecasts, reviews | Institutional memory |
| **Agent relationships** | Connected agents, capabilities, history | Re-onboarding agents |
| **Shared context** | Team coordination, peer packets | Team context is non-portable |

### Compounding Metrics (Show Users Their Investment)

Add to `delta_brief` output:
```
Your NodeBench Investment:
  12 packets created (4 memos, 3 diligence, 3 briefs, 2 watchlist alerts)
  5 entities monitored
  3 agents connected
  47 decisions tracked
  Since: Jan 15, 2026 (74 days)
```

---

## Layer 5: Social Trigger (Output IS Distribution)

**Current state:** /company/:slug, /memo/:id, /embed/:type/:id live.
**Goal:** Every output is designed to spread.

### Share Mechanics

| Surface | Share Method | What Recipient Sees | CTA |
|---------|-------------|-------------------|-----|
| `/company/demo` | Twitter, LinkedIn, copy link | Full company profile with signals, risks, comparables | "Try NodeBench" button |
| `/memo/demo` | Twitter, LinkedIn, copy link, print | Decision memo with confidence score, scenarios, actions | "Create your own" link |
| `/embed/memo/demo` | iframe embed code | Mini memo widget with confidence gauge | "View full memo" link |
| CLI output | Copy JSON, pipe to file | Structured packet with nextTools suggestions | MCP install command |

### Virality Loops

```
User creates delta.diligence on Competitor X
  → Shares /company/competitor-x on LinkedIn
  → Colleague clicks link
  → Sees full company profile with "Try NodeBench" CTA
  → Installs with one command
  → Creates their own diligence packet
  → Shares...
```

### Screenshot-Worthy Moments
The product should create moments users want to screenshot:
- 88% confidence score on a decision memo
- "5 material changes detected" alert in daily brief
- Side-by-side comparison showing your company vs competitors
- "Your entity intelligence is 94% more complete than last week"

---

## Layer 6: Accessibility (Compounding Distribution Advantage)

**Current state:** Dark theme, keyboard nav, glass card DNA.
**Goal:** Works for everyone, everywhere, every device.

### Accessibility Checklist

#### Visual
- [x] Dark theme with sufficient contrast (terracotta on dark bg)
- [x] Glass card DNA with border/background separation
- [ ] **Light mode** — not yet implemented for public pages
- [x] Print stylesheet on company profiles and memos
- [x] Confidence badges use color + number (not color alone)

#### Input
- [x] Keyboard-navigable (Tab through share buttons, Enter to activate)
- [x] CLI verbs for terminal-native users
- [x] Voice input hook exists (useVoiceInput)
- [ ] **Screen reader labels** — add aria-labels to share buttons, confidence badges
- [ ] **Skip links** — add to public company profile page

#### Cognitive
- [x] Banking-convention naming (brief, diligence, memo, watch)
- [x] nextTools on every result (no dead ends)
- [x] Confidence scores (user calibrates trust)
- [x] Demo data always available (no blank states)
- [ ] **Progressive complexity** — show simple view first, expand on click

#### Device
- [x] Desktop: full dashboard + CLI
- [x] Web: all public pages responsive
- [ ] **Mobile optimization** — public company profiles need mobile viewport testing
- [ ] **Offline** — CLI works offline (SQLite), web needs service worker for public pages

#### Language
- [x] Clear copy: "What changed", "Key Signals", "Risks", "Competitive Landscape"
- [x] No jargon in public-facing pages
- [x] Time-relative formatting ("Updated 3/29/2026", not "1711749234000")

### Quick Fixes for Accessibility

```tsx
// Add to PublicCompanyProfileView share buttons:
<button aria-label="Copy link to clipboard" ...>
<a aria-label="Share on Twitter" ...>
<a aria-label="Share on LinkedIn" ...>
<button aria-label="Print company profile" ...>

// Add skip link to public pages:
<a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>
```

---

## Layer 7: Distribution Coverage

**Current state:** npm, Claude Code, Cursor, Windsurf, GitHub, Vercel.
**Goal:** Present everywhere users discover tools.

### Distribution Channel Matrix

| Channel | Status | Priority | Action |
|---------|--------|----------|--------|
| **npm** | Published | Done | Keep version current |
| **Claude Code** | `claude mcp add` | Done | Maintain preset |
| **Cursor** | `.cursor/mcp.json` | Done | Cursor directory submission |
| **Windsurf** | `.windsurf/mcp.json` | Done | Maintain docs |
| **GitHub** | Open source | Done | Star, fork, issue engagement |
| **Vercel** | Production deployed | Done | Monitor uptime |
| **MCP Registry** | Not yet | P0 | Submit to official MCP registry |
| **mcpservers.org** | Not yet | P0 | Submit listing |
| **cursor.directory** | Not yet | P1 | Submit for Cursor users |
| **Smithery** | Metadata ready | P1 | Verify listing |
| **Product Hunt** | Not yet | P1 | Launch when daily brief is live-data |
| **Hacker News** | Not yet | P2 | Show, don't tell (post company profile) |
| **Twitter/X** | Manual posts | P1 | Screenshot delta.brief results |
| **LinkedIn** | Pipeline exists | P1 | Share company profiles |
| **Hackathon sponsors** | retention.sh partnership | P0 | Co-promote at hackathons |
| **YouTube** | Demo videos exist | P2 | Record "First 60 seconds" video |
| **Discord** | Not yet | P2 | Create community for founders |
| **SEO** | robots.txt + sitemap | Done | Add /company/ pages to sitemap |

### Distribution Sequence (Priority Order)

1. **MCP Registry + mcpservers.org** (P0) — where MCP users discover tools
2. **Hackathon co-promotion with retention.sh** (P0) — immediate users
3. **cursor.directory + Smithery** (P1) — IDE-native discovery
4. **Product Hunt launch** (P1) — broad awareness spike
5. **Twitter screenshots of delta.brief** (P1) — organic spread
6. **YouTube "60 seconds to first packet"** (P2) — evergreen content

---

## Attention Engineering Metrics

### Leading Indicators (Track Weekly)

| Metric | Target | How to Measure |
|--------|--------|---------------|
| **Time to first packet** | < 30 seconds | Timer from install to first delta_brief output |
| **Daily active CLI sessions** | Growing week-over-week | Count unique delta_* tool calls per day |
| **Packets per session** | > 2 | Average delta packets created per CLI session |
| **Return rate** | > 40% within 7 days | Users who run delta_brief on day 2+ |
| **Share rate** | > 10% of packets | Packets that get shared via /company/ or /memo/ |
| **Watchlist growth** | Monotonic increase | Total entities across all users |

### Lagging Indicators (Track Monthly)

| Metric | Target | How to Measure |
|--------|--------|---------------|
| **Installed base** | Growing month-over-month | npm downloads + MCP registry installs |
| **Public profiles viewed** | Growing | /company/ page views |
| **Hackathon team adoptions** | > 5 teams per hackathon | retention.sh co-install counts |
| **Organic mentions** | Growing | Twitter, HN, GitHub stars |

### Anti-Metrics (Things That Should NOT Happen)

| Anti-Metric | Threshold | Action |
|-------------|-----------|--------|
| Setup failures | > 5% | Debug install flow, add retry logic |
| Blank results | > 1% | Ensure demo fallback always works |
| Dead-end responses | 0% | Every tool output must have nextTools |
| Stale watchlist | > 30 days no check | Prompt user to refresh or remove |
| Broken share links | 0% | Monitor /company/ and /memo/ routes |

---

## The Complete Attention Loop

```
TRIGGER:  "What changed?" (daily brief, watchlist alert)
     ↓
ACTION:   Run delta_brief or delta_diligence
     ↓
VARIABLE REWARD: New signals, contradictions, entity changes
     ↓
INVESTMENT: Packet stored, watchlist updated, memory compounded
     ↓
SOCIAL: Share /company/:slug or /memo/:id
     ↓
NEW USER: Recipient installs with 1 command
     ↓
TRIGGER: Their first delta_brief shows something useful
     ↓
(loop)
```

**The leash is not a single feature. It is the closed loop where every action creates the trigger for the next action, and every output creates the entry point for a new user.**

---

## Implementation Priority (What to Build Next)

### This Week (Distribution)

1. Submit to MCP Registry + mcpservers.org
2. Submit to cursor.directory
3. Add aria-labels to all public page share buttons
4. Add skip links to public pages
5. Record "60 seconds to first packet" screen recording

### Next Week (Retention)

1. Auto-brief on first start (`--auto-brief`)
2. Compounding metrics in delta_brief output ("Your NodeBench Investment: 12 packets, 5 entities, 74 days")
3. Contradiction detection across stored packets
4. Watchlist background refresh (daily cron)

### Week 3 (Growth)

1. Product Hunt launch
2. Twitter screenshot campaign (delta.brief results)
3. YouTube demo video
4. Hackathon co-promotion landing page

---

*This spec is itself a delta.market packet — it should be re-run monthly to track attention engineering progress.*
