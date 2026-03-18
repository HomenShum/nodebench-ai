# Day 1 User Journeys — How Each Persona Actually Uses the Platform

Every feature must answer: **"What does this person do in the first 5 minutes, and why do they come back tomorrow?"**

---

## Persona 1: The Contractor (B2C — Oracle UI)

**Who**: Senior developer/consultant stuck in execution mode. Gets paid well per hour but has no leverage, no equity path, no institutional memory. Feels imposter syndrome when talking to architects.

**Day 1 Journey**:

1. **Sign up** → Immediately sees their "Player Card" — Class: `Contract Executioner`, Level 1, 0 EXP.
   - No empty state. The system pre-populates 3 Daily Quests based on their connected accounts.

2. **Connect GitHub** (OAuth, 30 seconds) → System ingests last 90 days of commits, PRs, reviews.
   - LangExtract pipeline runs → entities extracted → temporal signals detected.
   - Player card updates: "47 commits detected. +2,350 Base EXP awarded retroactively."

3. **First Quest appears**: "Review your EXP breakdown — which activities earned the most?"
   - They see: code reviews (75 EXP each) earned 3x more per-hour than raw commits (25 EXP).
   - **Insight delivered**: "You spent 80% of time coding but only 30% of EXP came from code. Reviews and architecture decisions have higher EXP multipliers."
   - Thompson Protocol translation: "This means the activities that get you promoted are different from the activities that feel productive."

4. **Debuff detected**: `Imposter Syndrome` (active debuff) — triggered because they have 0 architecture decisions in 90 days.
   - Recommended cure: "Complete 1 Architecture Decision Record (ADR) this week to begin removing this debuff."
   - Zero-Draft button: System pre-drafts an ADR template from their most recent large PR. `[APPROVE & COMMIT]`.

5. **Why they come back**: Tomorrow, a new Daily Quest drops. Their streak counter starts. The Temporal Engine detects a `budget_drop` signal from their client's Jira → auto-drafts an architecture proposal. They see the opportunity window closing in 12 days.

**Value delivered Day 1**: Retroactive career audit + first actionable insight + pre-drafted artifact. Zero cognitive load.

---

## Persona 2: VP of Engineering (B2B — Enterprise SpecDoc API)

**Who**: Oversees 15 teams deploying to production weekly. Spends 40% of time in "firefighting" mode. Needs SOC 2 compliance evidence for every major release. Currently uses Jira + Confluence + manual QA sign-off.

**Day 1 Journey**:

1. **API key generated** → SpecDoc created for their next deployment:
   ```json
   POST /api/spec-docs
   {
     "title": "Payment Module v3.2 Release",
     "target": { "environment": "staging", "branch": "release/3.2" },
     "checks": [
       { "category": "functional", "title": "Payment flow end-to-end", "verificationMethod": "playwright_assertion", "priority": "P0" },
       { "category": "security", "title": "No exposed PII in logs", "verificationMethod": "automated_test", "priority": "P0" },
       { "category": "performance", "title": "p95 latency < 200ms", "verificationMethod": "metric_threshold", "threshold": { "metric": "p95_latency_ms", "operator": "lt", "value": 200 }, "priority": "P1" },
       { "category": "accessibility", "title": "WCAG 2.1 AA compliant", "verificationMethod": "visual_qa", "priority": "P1" }
     ],
     "complianceFrameworks": ["SOC2"]
   }
   ```

2. **Execution begins** → Headless harness traverses staging URL via WebMCP/Playwright.
   - Each check runs autonomously, emitting OTel traces.
   - Video QA (Gemini) evaluates UI interactions, captures evidence screenshots.
   - Results stream to SpecDoc in real-time: `4/4 checks passed`.

3. **Proof Pack generated** → Immutable audit trail with:
   - Every tool call + token cost + duration
   - Screenshot evidence for visual checks
   - Video clip evidence for interaction flows
   - Compliance checklist mapped to SOC 2 controls
   - `[APPROVE RELEASE]` button for VP to sign off.

4. **Dashboard shows**: All active SpecDocs across 15 teams. Pass rate trends. Cost per verification run.

5. **Why they come back**: Next deployment auto-triggers a new SpecDoc from the CI/CD webhook. The VP sees a single dashboard instead of chasing 15 Slack threads.

**Value delivered Day 1**: First automated deployment verification with auditable proof. Replaces 4 hours of manual QA coordination.

---

## Persona 3: The Analyst / Researcher (B2C — Research Hub)

**Who**: Follows biotech, AI, or fintech industry signals. Currently drowns in RSS feeds, newsletters, and Twitter. Needs to synthesize 50+ sources into a weekly brief for their team.

**Day 1 Journey**:

1. **Sign up** → Connect RSS feeds (pre-loaded: TechCrunch, Fierce Biotech, HN, arXiv).
   - Signal Ingester starts pulling feeds immediately.
   - LangExtract runs on each article → entities + claims + temporal markers extracted.

2. **Morning Brief auto-generated** (within 60 seconds):
   - "3 regime shifts detected overnight": [entity] funding round, [entity] leadership change, [entity] product pivot.
   - Each signal has `plainEnglish` translation + evidence source refs.
   - Forecast Cockpit shows: 2 active forecasts updated with new evidence.

3. **Click a signal** → Causal Chain view:
   - Timeline of events: "Week 1: CEO departure announced → Week 3: Series C delayed → Week 5: Competitor acquired their talent lead."
   - Each node links to exact source line in the original article.
   - "Build on this" button → creates a zero-draft LinkedIn post or internal brief.

4. **Create first forecast**:
   - "Will [Company X] complete their Series C by Q2 2026?"
   - System auto-populates: base rate (65% of delayed Series C close within 2 quarters), top drivers, top counterarguments.
   - Signal Matcher will auto-update probability as new evidence arrives.

5. **Why they come back**: Tomorrow's Morning Brief references yesterday's signals, showing momentum. Calibration scoring starts tracking their prediction accuracy over time.

**Value delivered Day 1**: 50+ sources synthesized into 3 actionable signals with causal chains. First forecast created with auto-populated evidence.

---

## Persona 4: The Content Creator (B2C — Thompson Protocol Flywheel)

**Who**: Builds their professional brand on LinkedIn/Twitter. Wants to post about industry trends but spends 3 hours per post researching and writing. Needs to sound authoritative without being a pundit.

**Day 1 Journey**:

1. **Sign up** → Temporal Engine already has today's signals from the Research Hub pipeline.
   - "3 post-worthy signals detected. Draft?"

2. **Click "Draft"** → Feynman Editor agent activates:
   - Pulls the causal chain for the top signal.
   - Strips jargon using Thompson Protocol (replaces "regime shift in TSFM architectures" with "the way AI predicts time series just fundamentally changed").
   - Generates 3-post thread structure: Signal → Analysis → Agency.
   - Evidence scores visible: `[5/6]` verified, `[3/6]` speculative.

3. **Review draft** → All sources are clickable. Evidence breakdown shows exactly which claims are verified vs. speculative.
   - Edit inline or `[APPROVE & SCHEDULE]`.
   - System runs `cleanLinkedInText()` (no parentheses, no Unicode, no pipes).

4. **Post published** → Proof Pack created: what was posted, evidence trail, engagement tracking starts.

5. **Why they come back**: Tomorrow the system detects engagement patterns on today's post and suggests follow-up content. The Temporal Engine identifies the next anomaly worth posting about.

**Value delivered Day 1**: 3-hour research+writing process compressed to 15-minute review+approve. First post with full evidence trail.

---

## Persona 5: The Team Lead / Guild Master (B2C — Oracle + Control Tower)

**Who**: Manages 5-8 contractors/developers. Wants to help them grow but has no visibility into their actual skill progression. Performance reviews are subjective and annual.

**Day 1 Journey**:

1. **Sign up** → Invite team members. Each gets their own Oracle Player Card.

2. **Guild Dashboard** (team view):
   - See all team members' classes, levels, streaks, active quests.
   - Aggregated temporal signals: "3 team members have the `Context Rot` debuff — they haven't documented an architecture decision in 30+ days."
   - Opportunity window: "Budget review in 18 days. 2 team members are positioned for class advancement if they complete their architecture quest."

3. **Create Guild Quest**: "Complete security audit of Module X" → assigned to team, tracked with proof pack.

4. **Class Advancement notification**: "Alice advanced from `Integration Specialist` to `System Architect` — evidence: 3 ADRs, 2 architecture reviews, 1 POC deployed."

5. **Why they come back**: Weekly Guild Report shows team velocity, skill gaps, and upcoming temporal windows. Replaces subjective performance reviews with evidence-backed progression.

**Value delivered Day 1**: Team skill visibility + first guild quest + temporal opportunity detection.

---

## The Unifying Principle

Every persona enters through a different door, but they all use the same engine:

```
Ingest → Extract → Signal → Forecast → Zero-Draft → Approve → Proof Pack
```

| Persona | Ingests | Signals | Zero-Drafts | Proof Pack |
|---------|---------|---------|-------------|------------|
| Contractor | GitHub/Jira activity | Career opportunity windows | ADRs, proposals, architecture docs | Career advancement evidence |
| VP Engineering | CI/CD deploys, staging URLs | Regression risks, compliance gaps | SpecDoc checks, test plans | SOC 2 compliance bundle |
| Analyst | RSS feeds, news, filings | Regime shifts, anomalies, momentum | Research briefs, causal chains | Forecast calibration log |
| Content Creator | Analyst signals + engagement data | Post-worthy anomalies | LinkedIn posts, one-pagers | Content + evidence trail |
| Team Lead | Team member Oracle data | Skill gaps, advancement windows | Performance reviews, guild quests | Team progression report |

Every output is a **Zero-Draft with an APPROVE button**. The system never asks users to start from scratch — it pre-computes the work and waits for human judgment.
