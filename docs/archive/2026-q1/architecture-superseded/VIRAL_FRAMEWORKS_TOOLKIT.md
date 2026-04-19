# The Analytical Toolkit for Viral Product Design

A rigorous methodology layer synthesizing 10 canonical frameworks for measuring, predicting, and engineering product virality. Applied to NodeBench's specific context: B2B founder tool, agent-native, decision intelligence.

**Sources**: Nir Eyal (Hook Model), BJ Fogg (Behavior Model), Robert Cialdini (7 Principles of Influence), Reforge (Growth Loops), Lenny Rachitsky (First 1,000 Users + PMF Indicators), Y Combinator (Demo Day Structure), Clayton Christensen (Jobs to Be Done), Sean Ellis (PMF Survey), Andrew Chen (Viral Coefficient + Law of Shitty Clickthroughs), Rahul Vohra/Superhuman (PMF Engine).

---

## Part 1: The 10 Frameworks

---

### 1. Nir Eyal's Hook Model

**Core principle**: Habit-forming products cycle users through a 4-step loop until internal triggers replace external ones.

**The 4 Steps**:

| Step | Definition | Sub-types | Product Example |
|------|-----------|-----------|----------------|
| **Trigger** | The actuator that initiates behavior | **External**: emails, notifications, CTAs, app icons. **Internal**: emotions (boredom, anxiety, uncertainty, FOMO) attached to the product through repeated cycling | Internal trigger for NodeBench: "I need to make a high-stakes decision" or "What's happening in my market?" |
| **Action** | The simplest behavior done in anticipation of reward | Must be easier than thinking. Fogg's B=MAP applies: high motivation + high ability + prompt present | NodeBench: type a question in the agent panel, click "Run Investigation" |
| **Variable Reward** | Unpredictable positive outcome that creates dopamine surge | **Tribe**: social validation, status. **Hunt**: search for resources/information. **Self**: mastery, competence, completion | NodeBench: variable = different insights every time, novel evidence combinations, unexpected competing explanations |
| **Investment** | User puts something back that makes the product better next time | Time, data, effort, social capital, money. Must load the next trigger and improve future loops | NodeBench: saved preferences, investigation history, trained signal weights, shared memos |

**How to measure each step**:
- **Trigger**: % of sessions initiated by internal trigger (no marketing attribution) vs. external. Target: >50% internal after 30 days.
- **Action**: Task completion rate for the core action. If <80% of users who see the CTA complete the action, ability is too low.
- **Variable Reward**: Session depth variance (std dev of pages/actions per session). Zero variance = predictable = no hook. High variance = hunt/exploration behavior.
- **Investment**: % of users who contribute data back (save, customize, share, invite). Target: >30% of active users invest per session.

**NodeBench application**:
- Current internal trigger candidate: "I need to de-risk this decision before committing capital"
- Action: must be 1-click or 1-sentence. Current "Ask NodeBench" bar is correct.
- Variable reward gap: demo conversations are PREDICTABLE (canned). Must deliver genuinely novel, real-time analysis to create hunt reward.
- Investment gap: no user data persists between sessions. No investigation history. No preference learning.

**Failure mode**: Product without variable reward becomes a utility (used but not craved). Product without investment never compounds value and loses to any competitor.

---

### 2. BJ Fogg's Behavior Model (B=MAP)

**Core formula**: Behavior = Motivation x Ability x Prompt. All three must converge at the same moment. If behavior doesn't occur, at least one element is missing.

**Components**:

| Element | Sub-dimensions | Design Lever |
|---------|---------------|-------------|
| **Motivation** | Sensation (pleasure/pain), Anticipation (hope/fear), Belonging (acceptance/rejection) | Increase by showing what user gains or loses. Social proof. Testimonials. |
| **Ability** | Time, Money, Physical effort, Brain cycles, Social deviance, Non-routine | Reduce friction: fewer clicks, fewer decisions, familiar patterns, no new vocabulary |
| **Prompt** | **Spark** (high ability, low motivation: needs inspiration). **Facilitator** (high motivation, low ability: needs simplification). **Signal** (high both: just needs reminder) | Match prompt type to user's current state |

**How to measure**:
- **Motivation**: Pre-session survey: "How important is this decision to you?" (1-10). NPS as proxy for post-session motivation.
- **Ability**: Time-to-first-action (seconds from landing to first meaningful input). Each second above 10 = ability failure.
- **Prompt effectiveness**: Click-through rate on each prompt type. Track which prompt type converts by user segment.

**NodeBench application**:
- Founders have HIGH motivation (decisions = capital at risk) but MODERATE ability (agent-native UX is unfamiliar, "decision intelligence" is jargon).
- Current gap: ability bottleneck. Too many surfaces, too many concepts, unclear where to start.
- Correct prompt type: **Facilitator** -- the user already wants to make better decisions, they just need it to be dead simple.
- Action: reduce the landing page to ONE input. The Perplexity pattern: search bar + 3 suggestion chips. Nothing else above the fold.

**Failure mode**: High motivation + low ability = frustration, then abandonment. The user WANTS to use the product but CAN'T figure out how. This is the most common failure mode for B2B tools.

---

### 3. Cialdini's 7 Principles of Influence

**Core principle**: People use cognitive shortcuts to make decisions. Products that align with these shortcuts convert better.

| Principle | Definition | Product Application | Measurement |
|-----------|-----------|-------------------|-------------|
| **Reciprocity** | People feel obligated to return favors. Give value first. | Give a free investigation result BEFORE asking for signup. Show real analysis, not a paywall. | Signup conversion rate after receiving free value vs. before |
| **Scarcity** | People want more of what they can have less of. Limited = valuable. | "50 investigations/month on free tier." Early access for founders. Limited beta slots. | Conversion lift from scarcity messaging vs. control |
| **Authority** | People follow credible experts. Credentials matter. | Show founder's banking/finance background. Display evidence methodology. Cite data sources. | Trust survey score. Time-on-site after seeing authority signals. |
| **Consistency** | People want to be consistent with past commitments. Small yes leads to big yes. | Get user to answer one question ("What decision are you facing?") before asking for account. | Funnel completion rate after micro-commitment vs. cold signup |
| **Liking** | People say yes to those they like. Similarity, compliments, cooperation. | Match the user's vocabulary ("founder" not "user"). Share the builder journey. Personality in copy. | Survey: "Does this product feel like it was built for someone like me?" |
| **Social Proof** | When uncertain, people look to others' behavior. | "3,200 founders use NodeBench." Show real user testimonials. Display live investigation count. | CTR on social proof elements. Conversion lift from testimonial placement. |
| **Unity** | Shared identity creates deep compliance. "We" not "they." | "Built by founders, for founders." Community membership framing. | Self-identification rate: "I am a NodeBench user" vs. "I use NodeBench" |

**NodeBench application priority** (ranked by impact for B2B founder tools):
1. **Authority** -- founders making high-stakes decisions need to trust the source. Evidence methodology, data provenance, and founder credibility are table stakes.
2. **Reciprocity** -- give a genuinely useful free investigation. The output must be valuable enough that the user feels compelled to reciprocate (with signup, payment, or sharing).
3. **Social Proof** -- founders follow other founders. "Used by X founders at Y-stage companies" is the highest-leverage social proof.
4. **Scarcity** -- limited beta access, usage caps, early-adopter pricing.
5. **Consistency** -- micro-commitments (answer one question before full signup).
6. **Liking** -- practitioner voice, not corporate voice.
7. **Unity** -- "the founder intelligence community" framing.

**Failure mode**: Product with no social proof in a B2B context is invisible. Founders won't risk their decision-making process on an unvalidated tool.

---

### 4. Reforge Growth Loops

**Core principle**: The fastest-growing products are systems of loops, not funnels. Loops are closed systems where output is reinvested as input.

**Loop types**:

| Loop Type | Mechanism | Example | Compounding Asset |
|-----------|----------|---------|-------------------|
| **Viral Loop** | New user invites others who invite others | Dropbox referral (give storage, get storage) | User base |
| **Content Loop** | User creates content -> indexed by search -> brings new users | Pinterest (pin -> Google indexes -> new user finds -> pins more) | SEO-indexed content |
| **Paid Loop** | Revenue -> reinvested in ads -> brings new users -> more revenue | Many SaaS products | Revenue/margin |
| **Data Loop** | More users -> better data -> better product -> more users | TikTok algorithm. Waze maps. | Proprietary data |
| **UGC Loop** | Users create content that IS the product for other users | Reddit, Stack Overflow | Content library |

**Why loops > funnels**: Funnels are linear (AARRR: Acquisition -> Activation -> Retention -> Revenue -> Referral). Each stage is optimized in isolation, creating silos. Loops are circular -- each output creates the input for the next cycle.

**How to measure**:
- **Loop velocity**: Time for one complete cycle (user joins -> produces output -> output creates new user). Shorter = faster growth.
- **Loop efficiency**: % of output that converts back to input. If 100 users produce content that brings 20 new users, efficiency = 20%.
- **Compounding rate**: Is efficiency stable, increasing, or decreasing over time? Stable = linear growth. Increasing = exponential.

**NodeBench application -- the Content Loop**:
1. Founder runs investigation on NodeBench
2. NodeBench produces Decision Memo (shareable artifact)
3. Founder shares memo with co-founders, investors, board (distribution)
4. Recipients see the memo, want one for their own decision (acquisition)
5. New user runs their own investigation (back to step 1)

This is NodeBench's most natural loop. The Decision Memo IS the distribution mechanism. The output IS the marketing.

**Current gap**: No share mechanism for memos. No public URL for investigations. The loop is broken at step 3.

**Failure mode**: Product without a loop relies entirely on paid acquisition or founder hustle. Growth is linear, not compounding. CAC never decreases.

---

### 5. Lenny Rachitsky's First-1,000-Users Playbook

**Core insight**: Every major consumer app acquired their first 1,000 users through one of 7 strategies. The choice depends on your product type.

**The 7 Strategies**:

| Strategy | When to Use | Real Examples |
|----------|------------|--------------|
| **Go where users are, offline** | Product has a physical-world component or benefits from in-person demo | Tinder (college campuses), DoorDash (Stanford campus), Etsy (craft fairs) |
| **Go where users are, online** | Target users congregate in specific online communities | Dropbox (Hacker News video), Loom (Product Hunt), Slack (Twitter) |
| **Invite your friends** | Your network IS the target user | Yelp (PayPal alumni), Venmo (college friend group) |
| **Create FOMO** | Strong value prop, innately social or aspirational | Robinhood (waitlist with position #), Mailbox (queue visualization), Superhuman (landing page email capture), Pinterest (invite-only), Clubhouse (exclusive TestFlight) |
| **Leverage influencers** | Product's output is demonstrable/shareable | Instagram (high-follower Twitter users as first photographers), Superhuman (founder personally onboarded influencers) |
| **Get press** | Unique, compelling, fresh story | Mint (blog-first strategy before product launch) |
| **Build community pre-launch** | Product serves an existing interest group | Product Hunt (started as an email list), Figma (designer community) |

**Diagnostic questions** (from Lenny):
1. Who are your early target users, and where are they congregating offline?
2. Where are they congregating online?
3. Do your friends fit the target user group?
4. Is your value-prop strong enough for a waitlist?
5. Is your product innately social (users invite users)?
6. Who are influencers of your target users?
7. What's a unique story you could pitch to press?
8. Could you build a community now to leverage later?

**NodeBench application**:
- **Primary strategy: Go where users are, online.** Founders congregate in: YC Slack, Indie Hackers, Twitter/X founder circles, LinkedIn founder communities, AI tool directories (There's An AI For That, Product Hunt).
- **Secondary: Leverage influencers.** Find 10 founders with >10K Twitter followers who face decision-making pain. Give them free NodeBench access. Their investigation outputs become shareable social proof.
- **Tertiary: Create FOMO.** Limited "Founding 100" program with exclusive access + direct line to builder.

**Failure mode**: Trying all 7 strategies at once instead of nailing one. Lenny's data shows that nearly every successful app dominated through 1-2 channels, not broad distribution.

---

### 6. Y Combinator Demo Day Structure

**Core principle**: YC teaches startups to pitch with a specific structure that maximizes investor attention in 2 minutes. This structure applies to product landing pages and demos.

**The YC Pitch Structure** (Kevin Hale, YC Partner):

| Section | Duration | Purpose | Landing Page Equivalent |
|---------|----------|---------|----------------------|
| **Problem** | 15 sec | What pain exists? Make it visceral. | Hero headline: state the pain |
| **Solution** | 15 sec | What do you do about it? One sentence. | Sub-headline: one sentence value prop |
| **Demo** | 30 sec | Show, don't tell. The product working. | Embedded live demo or video |
| **Traction** | 15 sec | Proof it works. Numbers. | Social proof section: users, investigations, accuracy |
| **Market** | 15 sec | How big is this? | "X million founders make Y decisions/year" |
| **Team** | 15 sec | Why you? | Founder credibility bar |
| **Ask** | 15 sec | What do you need? | CTA: "Start your first investigation" |

**Key YC principles for product design**:
- **Legibility**: Can someone understand what you do in 5 seconds? If not, you lose.
- **One-line pitch**: "We help [specific person] do [specific thing] by [specific mechanism]."
- **Demo > Deck**: A working product beats any slide deck. Show the thing.
- **Traction = credibility**: Even small numbers beat zero. "12 founders ran investigations last week" > "We're building the future of decision intelligence."

**NodeBench application**:
- Current one-liner candidate: "NodeBench helps founders de-risk high-stakes decisions with AI-powered evidence analysis."
- Landing page should follow YC pitch order: Pain -> Solution -> Live Demo -> Proof -> Market -> Team -> CTA
- Current gap: Landing page leads with features/architecture, not pain. The first thing a founder should see is their pain reflected back to them.

**Failure mode**: Pitching features instead of outcomes. "304 MCP tools" means nothing to a founder. "Cut your decision research time from 2 weeks to 2 minutes" does.

---

### 7. Jobs to Be Done (JTBD)

**Core principle** (Clayton Christensen, HBR 2016): People don't buy products. They "hire" products to do a job. Understanding the job -- not the customer demographic -- unlocks innovation.

**The JTBD Framework**:

| Dimension | Definition | Discovery Question |
|-----------|-----------|-------------------|
| **Functional job** | The practical task to accomplish | "What are you trying to get done?" |
| **Emotional job** | How the person wants to feel | "How do you want to feel during/after?" |
| **Social job** | How the person wants to be perceived | "How do you want others to see you?" |
| **Context** | The circumstances (when, where, with whom) | "When does this job arise?" |
| **Constraints** | What's preventing the current solution | "What's frustrating about how you do it now?" |

**The "Milkshake" test** (Christensen's canonical example):
A fast-food chain wanted to sell more milkshakes. Demographics (age, income) didn't predict purchase. But watching WHEN people bought revealed two distinct jobs:
1. **Morning commute**: "I need something to occupy my boring 30-min drive that's filling enough to last till lunch." (Functional: sustenance. Emotional: not bored.)
2. **Afternoon with kids**: "I want to be the indulgent parent." (Social: good parent. Emotional: shared joy.)

Same product, different jobs, different competitors (banana, bagel, donut for Job 1; toys, promises for Job 2).

**How to measure**:
- **Job frequency**: How often does this job arise? Daily = habit territory. Monthly = utility territory.
- **Job importance**: What happens if the job goes undone? High consequence = high willingness to pay.
- **Current solution satisfaction**: On 1-10, how satisfied are they with their current approach? <5 = greenfield opportunity.
- **Switching cost tolerance**: Would they switch from current solution for a 2x improvement? 5x? 10x?

**NodeBench's Jobs to Be Done**:

| Job | Frequency | Importance | Current Solution | Satisfaction |
|-----|-----------|-----------|-----------------|-------------|
| "Help me figure out if this market/company/thesis is worth pursuing" | Weekly-Monthly | Critical (capital at risk) | Analyst reports, Google searches, gut feel | 3/10 -- slow, incomplete, expensive |
| "Give me confidence to present my analysis to co-founders/board" | Monthly | High (reputation at risk) | PowerPoint decks, informal conversations | 4/10 -- low rigor, no evidence trail |
| "Show me what I'm missing in my thinking" | Weekly | High (blind spots = bad decisions) | Advisors, mentors, second opinions | 5/10 -- slow, biased, unavailable |

**Primary job to target**: Job 1. It's the highest frequency + highest importance + lowest satisfaction. This is the wedge.

**Failure mode**: Building for a job that doesn't exist ("help me manage my AI agent fleet") or a job that's already well-served ("help me search the internet").

---

### 8. Sean Ellis's "Very Disappointed" Test

**Core principle**: Product-market fit can be measured with a single survey question. The threshold is 40%.

**The Survey** (4 questions):
1. "How would you feel if you could no longer use [product]?" -- Very disappointed / Somewhat disappointed / Not disappointed / N/A
2. "What type of people do you think would most benefit from [product]?"
3. "What is the main benefit you receive from [product]?"
4. "How can we improve [product] for you?"

**The 40% Threshold**:
- <25%: No PMF. Major pivot needed.
- 25-40%: Approaching PMF. Iterate on what "somewhat disappointed" users need.
- 40%+: PMF achieved. Double down.

**Critical nuance** (from Superhuman's implementation):
- Survey only users who have experienced the core value (not drive-by signups).
- Survey after meaningful usage (Superhuman: used product at least twice in last 2 weeks).
- Don't survey the same user twice (corrupts the benchmark).
- Segment responses by persona -- PMF may exist for a subset but not the whole.

**How to measure**:
- Run the survey continuously with new qualifying users.
- Track the "very disappointed" % weekly, monthly, quarterly.
- Segment by user type, acquisition channel, and use case.

**NodeBench application**:
- Survey trigger: after a user has completed at least 2 investigations.
- Current expected score: <25% (product delivers demo data, not real value).
- Target: 40%+ among "founders making strategic decisions" segment.
- The 4 survey questions will directly inform the roadmap (Superhuman's Step 2-3 process).

**Failure mode**: Never asking. Most products never measure PMF systematically. They rely on growth metrics (which can be bought) instead of satisfaction metrics (which can't).

---

### 9. Andrew Chen's Viral Math & Law of Shitty Clickthroughs

**Two frameworks from Chen**:

#### 9A. Viral Coefficient (K-Factor)

**Formula**: K = i x c
- **i** = number of invitations sent per user
- **c** = conversion rate of each invitation

**Interpretation**:
- K < 1: Viral decay. Each cohort is smaller than the last. Paid acquisition required.
- K = 1: Steady state. Growth is linear.
- K > 1: True virality. Exponential growth. Each user brings more than one new user.

**The nuance**: K > 1 is nearly impossible to sustain. Even the most viral products (Hotmail, Facebook in early days) only briefly exceeded K=1. The real game is getting K as close to 1 as possible to subsidize paid acquisition costs.

**Viral cycle time** matters as much as K:
- If K = 0.9 and cycle = 1 day, growth is fast.
- If K = 0.9 and cycle = 30 days, growth is slow.

**How to measure for NodeBench**:
- **i**: Track how many people each user shares an investigation/memo with. Target: 2+ shares per investigation.
- **c**: Track what % of share recipients sign up. Target: 10%+.
- **Cycle time**: Days from first investigation to first share. Target: same session (minutes, not days).

#### 9B. Law of Shitty Clickthroughs

**The law**: Over time, ALL marketing strategies result in declining clickthrough rates.

**Three drivers**:
1. **Novelty fades**: Users respond to new stimuli, then ignore them. Banner ads went from 78% CTR (1994) to 0.05% (2011).
2. **First-to-market never lasts**: Competitors copy any working channel strategy within weeks.
3. **Scale means less qualified users**: As you expand reach, you include people who are worse fits.

**Countermeasures**:
- **Nomad strategy**: Continuously develop new creative, test new publishers. Buys years, not decades.
- **Product IS marketing**: When your marketing channel is the product itself (Dropbox referral, Slack team invite), CTRs stay high because the invitation IS the value.
- **Discover untapped channels**: The 10x solution is finding the next uncontested channel before competitors arrive.

**NodeBench application**:
- The untapped channel for NodeBench: **MCP protocol native distribution**. NodeBench lives inside Claude Code, Cursor, Windsurf, VS Code. The product IS the channel. There's no "clickthrough" to decay because the tool is already in the user's environment.
- The Decision Memo as marketing: every shared memo is an invitation that demonstrates the product's value. This is "product IS marketing."
- Risk: if NodeBench relies on content marketing alone (blog posts, LinkedIn), the Law applies. Content marketing CTRs will decay. Product-native distribution won't.

**Failure mode**: Building growth on rented channels (ads, social media, SEO) without a product-native distribution mechanism. You're always one algorithm change away from zero.

---

### 10. Superhuman's Product-Market Fit Engine

**Core insight** (Rahul Vohra, First Round Review): PMF is not binary. It can be measured and systematically improved using a 4-step process.

**Superhuman's 4-Step Process**:

#### Step 1: Segment to find your High-Expectation Customer (HXC)
- Run Sean Ellis's 4-question survey on existing users.
- Group responses by "very disappointed" vs. "somewhat disappointed" vs. "not disappointed."
- Assign personas to each respondent.
- Find which persona has the highest "very disappointed" rate. That's your HXC.
- Build a rich profile of the HXC (demographics, behaviors, attitudes, needs).

Superhuman's HXC: "Nicole -- hard-working professional (exec, founder, manager, BD) who works long hours, considers herself very busy, deals with many people via email, generally has a growth mindset but may be skeptical about email clients."

#### Step 2: Analyze feedback to convert on-the-fence users into fanatics
- From "very disappointed" users: extract the main benefit they love (Question 3). This is your core value prop. DO NOT CHANGE THIS.
- From "somewhat disappointed" users where the main benefit resonates: extract what holds them back (Question 4). These are your quick wins.
- From "somewhat disappointed" users where the main benefit does NOT resonate: politely disregard. They're not your users.

Superhuman's finding: "Very disappointed" users loved SPEED. "Somewhat disappointed" users who also valued speed were held back by lack of mobile app.

#### Step 3: Build roadmap -- half love, half holdback
- 50% of roadmap: double down on what "very disappointed" users love. Make the core magic even more magical.
- 50% of roadmap: address what holds back "somewhat disappointed" users who value the core benefit.
- DO NOT build for users who don't resonate with your core benefit.

Superhuman's roadmap: 50% more speed (sub-50ms response, pipelined keystrokes, Superhuman AI). 50% removing blockers (mobile app, integrations, search, calendar).

#### Step 4: Track the PMF score as your North Star metric
- Survey new qualifying users continuously.
- Never survey the same user twice.
- Track "very disappointed" % weekly, monthly, quarterly.
- Make it the most visible metric in the company.

Superhuman's trajectory: 22% (start, 2017) -> 33% (after segmenting) -> 58% (after 3 quarters of roadmap work).

**How to measure**:
- PMF score (% very disappointed): the primary metric.
- HXC identification: persona with highest "very disappointed" rate.
- Core benefit clarity: can you state the main benefit in <10 words?
- Holdback resolution rate: % of identified holdbacks addressed per quarter.

**NodeBench application**:
1. Implement the 4-question survey in-product after 2+ investigations.
2. Identify the HXC persona (hypothesis: seed-stage founder making market-entry or investment decisions).
3. Extract core benefit language from "very disappointed" users (hypothesis: speed of evidence gathering).
4. Build 50/50 roadmap: half deepening core magic, half removing blockers.
5. Track PMF score weekly. Current expected baseline: <25%.

**Failure mode**: Building features that "somewhat disappointed" users want without checking if they value your core benefit. You end up building a different product for the wrong audience.

---

## Part 2: Framework Prioritization for NodeBench

### Which frameworks matter most?

Ranked by impact for NodeBench's specific context (B2B founder tool, agent-native, decision intelligence):

| Rank | Framework | Why It Matters Most | Current Gap |
|------|-----------|-------------------|-------------|
| **1** | Superhuman PMF Engine | Provides the exact measurement + optimization system. Without PMF, nothing else matters. | No survey, no HXC profile, no PMF score |
| **2** | JTBD | Defines WHAT to build. Wrong job = wrong product. | Job hypothesis exists but not validated with user interviews |
| **3** | Reforge Growth Loops | Defines HOW growth compounds. Without a loop, growth is linear. | Content loop broken (no share mechanism for memos) |
| **4** | Hook Model | Defines WHY users return. Without hooks, retention is zero. | Variable reward missing (demo data, not real analysis), investment missing (no data persistence) |
| **5** | BJ Fogg B=MAP | Diagnoses WHERE users drop off. Ability is the bottleneck for B2B tools. | Too many surfaces, unclear entry point, jargon-heavy |
| **6** | Cialdini (Authority + Reciprocity) | Founder tools require TRUST. No trust = no adoption. | Authority signals weak (no testimonials, no case studies, methodology not visible) |
| **7** | Lenny's First-1000 | Provides the CHANNEL strategy. | No channel strategy executed yet |
| **8** | YC Demo Day Structure | Provides the COMMUNICATION structure for landing page + demos. | Landing page leads with features not pain |
| **9** | Sean Ellis Test | Provides the BENCHMARK. 40% = PMF. | Not implemented |
| **10** | Andrew Chen Viral Math | Provides the ECONOMICS. K-factor determines growth trajectory. | No share mechanism, so K=0 |

---

## Part 3: The 10 Boolean Pass/Fail Criteria

Derived from the intersection of all 10 frameworks. Each is measurable, binary, and actionable.

### The NodeBench Viral Readiness Checklist

| # | Criterion | Pass Condition | Framework Source | Current Status |
|---|-----------|---------------|-----------------|---------------|
| **V1** | **"Very Disappointed" Score >= 40%** | >= 40% of qualifying users (2+ investigations) answer "very disappointed" to Sean Ellis question | Ellis/Superhuman | FAIL -- not measured |
| **V2** | **Time-to-Value < 30 seconds** | New user receives genuinely useful output within 30 seconds of first interaction, with zero configuration | Fogg B=MAP, YC Demo Day, Hook Model | FAIL -- demo data only, not real analysis |
| **V3** | **Core Loop Completes** | At least 10% of users who receive value share an artifact that brings back a new user | Reforge Growth Loops, Chen K-factor | FAIL -- no share mechanism exists |
| **V4** | **One-Sentence Job Clarity** | >80% of users can state what NodeBench does in one sentence, and it matches the intended JTBD | JTBD, YC Demo Day | FAIL -- not tested |
| **V5** | **Internal Trigger Formed** | >30% of 30-day retained users initiate sessions without external prompt (no email, no ad, no notification) | Hook Model, Fogg B=MAP | FAIL -- no retention data |
| **V6** | **Variable Reward Present** | Session depth variance (std dev of actions per session) is >2x the mean, indicating exploration/hunt behavior | Hook Model | FAIL -- canned demo conversations |
| **V7** | **Authority Established** | Landing page contains 3+ authority signals: methodology description, data source attribution, founder credibility, user testimonials, live accuracy metrics | Cialdini Authority | PARTIAL -- founder bio exists, methodology not visible |
| **V8** | **Reciprocity Activated** | Free tier delivers enough value that >20% of free users convert to paid within 30 days | Cialdini Reciprocity, Superhuman PMF Engine | FAIL -- no paid tier, no real free value |
| **V9** | **Investment Compounds** | Users who have used the product 5+ times get measurably better results (faster, more relevant, more accurate) than first-time users | Hook Model Investment, Reforge Data Loop | FAIL -- no personalization or history |
| **V10** | **Channel Independence** | >50% of new user acquisition comes from product-native channels (shared artifacts, MCP install, word-of-mouth) not rented channels (ads, content marketing) | Chen Law of Shitty CTRs, Reforge Loops | FAIL -- no acquisition channels active |

**Current score: 0/10 pass, 1/10 partial.**

---

## Part 4: Specific Measurements NodeBench Should Track

### Tier 1: North Star Metrics (check weekly)

| Metric | Definition | Target | Framework |
|--------|-----------|--------|-----------|
| **PMF Score** | % "very disappointed" from Ellis survey | >= 40% | Ellis/Superhuman |
| **Time-to-Value** | Seconds from first visit to first useful output | < 30 sec | Fogg/YC |
| **Weekly Active Investigators** | Users who completed >= 1 investigation in last 7 days | Growing 10% WoW | Reforge |

### Tier 2: Growth Loop Metrics (check weekly)

| Metric | Definition | Target | Framework |
|--------|-----------|--------|-----------|
| **Share Rate** | % of investigations that get shared externally | >= 20% | Reforge/Chen |
| **K-Factor** | (avg shares per user) x (% of share recipients who sign up) | >= 0.5 | Chen |
| **Viral Cycle Time** | Days from first investigation to first share | < 1 day | Chen |
| **Content Loop Efficiency** | % of shared memos that bring back a new user | >= 10% | Reforge |

### Tier 3: Hook Health Metrics (check monthly)

| Metric | Definition | Target | Framework |
|--------|-----------|--------|-----------|
| **Internal Trigger %** | % of sessions with no marketing attribution | >= 50% at day 30 | Hook Model |
| **Session Depth Variance** | Std dev of actions per session / mean actions | >= 2.0 | Hook Model |
| **Investment Rate** | % of sessions where user saves, customizes, or contributes data | >= 30% | Hook Model |
| **D7 Retention** | % of new users active 7 days later | >= 25% | Reforge/Lenny |
| **D30 Retention** | % of new users active 30 days later | >= 15% | Reforge/Lenny |
| **Retention Curve Shape** | Does the cohort retention curve flatten? | Flattens by D30 | Reforge/Lenny |

### Tier 4: Influence & Trust Metrics (check monthly)

| Metric | Definition | Target | Framework |
|--------|-----------|--------|-----------|
| **Authority Score** | Count of visible authority signals on landing page (methodology, sources, testimonials, credentials, live metrics) | >= 5 | Cialdini |
| **Reciprocity Conversion** | % of free-value recipients who sign up | >= 30% | Cialdini |
| **Social Proof Density** | Number of real user testimonials/case studies visible | >= 5 | Cialdini |
| **NPS** | Net Promoter Score from qualifying users | >= 50 | Lenny/Ellis |
| **Job Clarity Score** | % of users who can correctly state what NodeBench does | >= 80% | JTBD/YC |

---

## Part 5: The Execution Sequence

Based on framework prioritization, here is the ordered execution plan:

### Phase 1: Measure (Week 1-2)
- [ ] Implement Sean Ellis 4-question survey in-product
- [ ] Set up Time-to-Value tracking (seconds from landing to first output)
- [ ] Set up basic retention cohort tracking (D1, D7, D30)
- [ ] Run 10 user interviews using JTBD questions (functional/emotional/social job)

### Phase 2: Core Value (Week 3-6)
- [ ] Replace demo data with real investigation output on first visit (V2: time-to-value)
- [ ] Reduce landing page to Pain -> Solution -> Live Demo -> Proof -> CTA (YC structure)
- [ ] Build share mechanism for Decision Memos (V3: core loop)
- [ ] Add visible methodology/evidence attribution (V7: authority)

### Phase 3: Growth Loop (Week 7-10)
- [ ] Build shareable public URLs for investigation outputs
- [ ] Implement tracking for K-factor (shares x conversion)
- [ ] Add social proof section with real user data (V7: authority + social proof)
- [ ] Launch "Founding 100" program with FOMO mechanics (Cialdini scarcity)

### Phase 4: Habit Formation (Week 11-14)
- [ ] Add investigation history and preference learning (Hook: investment)
- [ ] Implement personalized daily brief with real data (Hook: variable reward)
- [ ] Build notification system for triggers (new signals, updated evidence)
- [ ] Track and optimize for retention curve flattening

### Phase 5: Scale (Week 15+)
- [ ] Optimize based on PMF score trajectory
- [ ] Double down on what "very disappointed" users love (Superhuman Step 3)
- [ ] Address holdbacks from "somewhat disappointed" users who value core benefit
- [ ] Expand channel strategy based on what's working (Lenny's playbook)

---

## Part 6: Framework Interaction Map

The 10 frameworks are not independent. They form a dependency graph:

```
JTBD (defines the job)
  |
  v
Fogg B=MAP (ensures the action is possible)
  |
  v
Hook Model (creates the habit loop)
  |       \
  v        v
Cialdini   Reforge Growth Loops
(builds    (compounds growth)
 trust)        |
  |            v
  v       Chen Viral Math
YC Demo   (measures loop efficiency)
(communicates    |
 the value)      v
  |         Chen Law of Shitty CTRs
  v         (predicts channel decay)
Lenny First-1000
(selects channels)
  |
  v
Ellis/Superhuman PMF Engine
(measures everything, optimizes continuously)
```

**Reading the map**:
- Start with JTBD: if you're solving the wrong job, nothing else matters.
- Then Fogg: if users can't do the action, hooks don't form.
- Then Hook Model: if users don't return, no loop can compound.
- Then Cialdini + Reforge: trust enables sharing, sharing creates loops.
- Then YC + Lenny: communication + channels drive initial acquisition.
- Then Chen: viral math tells you if it's working.
- Then Ellis/Superhuman: the PMF engine measures all of the above and creates the optimization flywheel.

---

## Appendix A: Anti-Pattern Catalog

| Anti-Pattern | Which Framework It Violates | NodeBench Risk |
|-------------|---------------------------|---------------|
| Building features before validating the job | JTBD | HIGH -- 304 tools built, job not validated |
| Optimizing growth before retention | Reforge, Hook Model | MEDIUM -- no retention data yet |
| Pitching features instead of outcomes | YC Demo Day | HIGH -- "304 MCP tools" vs. "2-minute decision research" |
| No variable reward (predictable outputs) | Hook Model | HIGH -- demo conversations are scripted |
| No investment mechanism (user data doesn't compound) | Hook Model | HIGH -- sessions are stateless |
| No share mechanism (output stays locked in product) | Reforge, Chen K-factor | HIGH -- memos not shareable |
| Authority signals absent | Cialdini | MEDIUM -- founder bio exists but methodology hidden |
| Multiple entry points (paradox of choice) | Fogg B=MAP | HIGH -- 5 surfaces compete for attention |
| Measuring vanity metrics (pageviews) not PMF metrics | Ellis/Superhuman | HIGH -- no PMF measurement in place |
| Growth on rented channels only | Chen Law | LOW -- MCP native distribution is product-native |

## Appendix B: Source Bibliography

1. **Nir Eyal**, "Hooked: How to Build Habit-Forming Products" (2014). Framework: Hook Model. Source: nirandfar.com
2. **BJ Fogg**, "Tiny Habits" (2019) + Fogg Behavior Model. Framework: B=MAP. Source: behaviormodel.org
3. **Robert Cialdini**, "Influence" (1984, updated 2021 with 7th principle Unity). Framework: 7 Principles of Persuasion. Source: influenceatwork.com
4. **Brian Balfour, Casey Winters, Kevin Kwok, Andrew Chen**, "Growth Loops are the New Funnels" (2018). Framework: Growth Loops. Source: reforge.com/blog/growth-loops
5. **Lenny Rachitsky**, "How the biggest consumer apps got their first 1,000 users" (2020) + "How to know if you've got product-market fit" (2020). Source: lennysnewsletter.com
6. **Kevin Hale**, "How to Pitch Your Startup" (YC Startup Library). Framework: Demo Day Structure. Source: ycombinator.com/library
7. **Clayton Christensen, Taddy Hall, Karen Dillon, David Duncan**, "Know Your Customers' Jobs to Be Done" (HBR, September 2016). Framework: JTBD. Source: hbr.org
8. **Sean Ellis**, PMF Survey + "very disappointed" test. The 40% threshold. Source: startup-marketing.com, pmfsurvey.com
9. **Andrew Chen**, "The Law of Shitty Clickthroughs" (2012) + viral coefficient work. Source: andrewchen.com
10. **Rahul Vohra**, "How Superhuman Built an Engine to Find Product-Market Fit" (First Round Review, 2019). Source: review.firstround.com
