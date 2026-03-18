# NodeBench Proactive Intelligence - Product Requirements Document

**Version:** 1.0
**Date:** 2026-01-21
**Status:** Design Phase
**Product Owner:** [Name]
**Engineering Lead:** [Name]

---

## 1. Executive Summary

### Problem Statement

NodeBench currently operates as a **reactive chatbot** - users must remember to ask it questions and manually trigger research. This creates three problems:

1. **Cognitive burden**: Users must remember to use NodeBench for every task
2. **Missed opportunities**: Important follow-ups, prep work, and insights slip through the cracks
3. **Limited value**: System sits idle between explicit user requests

### Solution

Transform NodeBench into a **proactive AI colleague** that:
- Surfaces relevant insights **before** you need them
- Drafts **follow-ups and prep work** automatically
- **Escalates risks** and flags important changes
- **Learns** from your feedback to improve over time

### Success Criteria

**30-day targets:**
- 60% of eligible meetings get automated prep packs
- 40% of suggested follow-ups get sent
- < 10% false positive rate (rejected suggestions)
- > 50% "useful" rating from users
- 2 hours/week saved per active user

---

## 2. User Personas

### Primary: Alex (Investment Banker)

**Background:**
- 25-40 meetings/week with founders, VCs, corporates
- 200+ emails/day across 15-30 active deals
- Uses NodeBench for company research and market analysis

**Pain Points:**
- Forgets to prep for meetings until 5 minutes before
- Misses follow-up emails in inbox flood
- Manually updates CRM after every meeting (15 min/meeting)
- Researches attendees right before calls (no time for depth)

**Desired Outcomes:**
- Walk into meetings with context automatically prepared
- Never miss a critical follow-up
- CRM updates drafted automatically
- More time for strategic work, less for administrative busywork

### Secondary: Jordan (VC Associate)

**Background:**
- Tracks 50+ portfolio companies + 200+ pipeline companies
- Weekly partner meetings requiring portfolio updates
- Monitors news, funding announcements, competitor moves

**Pain Points:**
- Manually scans news for portfolio updates (1 hour/day)
- Misses important signals buried in noise
- Forgets to follow up with founders after milestones
- No systematic way to track relationship "staleness"

**Desired Outcomes:**
- Important portfolio news surfaces automatically
- Reminded to reach out when haven't talked in 30+ days
- Weekly update drafts generated automatically
- More time talking to founders, less time gathering updates

### Tertiary: Sam (Founder)

**Background:**
- Attends conferences, meets investors, talks to customers
- Quick voice notes and photos after meetings
- Needs to maintain relationships with 50+ investors/advisors

**Pain Points:**
- Takes notes but never organizes them
- Meets someone important, forgets to follow up
- Can't remember context when reconnecting months later
- No system for relationship management

**Desired Outcomes:**
- Voice notes auto-transcribed and organized
- Reminded to follow up after conferences
- Context automatically resurfaced when reconnecting
- Simple, low-friction capture → proactive follow-up

---

## 3. Product Principles

### 1. **Evidence-Based Only**
Every proactive suggestion must have:
- Clear trigger ("Why now?")
- Concrete evidence (sources, timestamps, excerpts)
- Estimated impact ("This could save you 15 minutes")

**Anti-pattern:** Vague suggestions like "You might want to check on Project X"

### 2. **Progressive Autonomy**
Start with suggestions → move to drafts → only then auto-execute

**Progression:**
1. Phase 1: "Here's what I'd do" (suggest)
2. Phase 2: "I drafted this for you" (draft)
3. Phase 3: "I did this for you" (execute, with audit trail)

### 3. **User Controllability**
Every proactive feature must have:
- Per-feature on/off toggle
- Granular permissions (suggest/draft/execute)
- Quiet hours and rate limits
- One-click opt-out

**Anti-pattern:** Notifications user can't control or disable

### 4. **Feedback-Driven Learning**
Every proactive message must have:
- Useful / Not Useful buttons
- Optional reason ("Wrong timing", "Missing context", etc.)
- Feedback visible to ML team for calibration

**Anti-pattern:** Fire-and-forget notifications with no feedback loop

### 5. **Transparency & Auditability**
Users must be able to see:
- What proactive actions were taken
- Why each action was taken (trigger + evidence)
- How to undo/rollback if needed

**Anti-pattern:** "Black box" automation without explanation

---

## 4. Core Features (Phased Rollout)

---

## Phase 1: Proactive Insights (No Writes)

**Timeline:** Weeks 1-2
**Goal:** Deliver value without risk

### Feature 1.1: Meeting Prep Packs

**User Story:**
> As a user with an upcoming meeting,
> I want NodeBench to automatically prepare background on attendees,
> so that I don't have to scramble to research right before the call.

**Triggers:**
- Meeting scheduled with 2+ external attendees
- Meeting starts in 2-24 hours
- No prep doc exists for this meeting

**What NodeBench Does:**

1. **Detects** calendar event 24 hours before meeting
2. **Identifies** attendees from calendar
3. **Checks** if we have dossiers for each attendee
4. **Researches** missing attendees (company, role, recent news, LinkedIn)
5. **Creates** prep doc with:
   - Attendee dossiers (background, recent activity, talking points)
   - Company overview (if applicable)
   - Suggested questions
   - Recent email threads with these people
   - Meeting agenda (if available)
6. **Notifies** user via Slack DM:
   ```
   💡 Meeting Prep Ready

   Your meeting with Sarah Chen (Acme Corp) and 2 others starts in 4 hours.

   I prepared background on all attendees:
   • Sarah Chen - VP Product, Acme Corp (Series B, $30M raised)
   • Tom Liu - CTO, Acme Corp (ex-Google, AI/ML background)

   Impact: ~15 min saved

   [View Prep Doc] [Dismiss]
   ```

**Evidence Displayed:**
- Calendar event link
- Source of attendee info (LinkedIn, company website, past emails)
- When each dossier was last updated

**Acceptance Criteria:**

- [ ] Detects calendar events 2-24 hours before meeting
- [ ] Only triggers for meetings with 2+ external attendees
- [ ] Creates dossiers for unknown attendees within 5 minutes
- [ ] Slack message includes link to prep doc
- [ ] Prep doc shows sources and freshness for all facts
- [ ] User can dismiss and won't be reminded again
- [ ] User can mark as "Useful" or "Not Useful" with reason
- [ ] Works for both Google Calendar and .ics imports

**Success Metrics:**
- 60% of eligible meetings get prep packs
- 70% of prep packs marked "Useful"
- < 5% marked "Wrong timing" or "Not relevant"

---

### Feature 1.2: Follow-Up Nudges

**User Story:**
> As a user who receives 200+ emails/day,
> I want NodeBench to remind me about important threads that need replies,
> so that I don't accidentally ghost critical conversations.

**Triggers:**
- Email thread marked "important" or from key contact
- No reply in 3+ days (configurable)
- Thread not archived/dismissed

**What NodeBench Does:**

1. **Monitors** inbox for important threads
2. **Detects** threads needing replies (using heuristics):
   - Ends with question
   - From VIP contact (investor, key customer, etc.)
   - Marked "important" by Gmail AI
   - Contains keywords ("waiting for you", "let me know", "thoughts?")
3. **Waits** 3 days (default, configurable)
4. **Notifies** user via Slack:
   ```
   🔔 Follow-Up Needed

   You haven't replied to Sarah Chen's email from 3 days ago:
   "Thoughts on the partnership proposal?"

   Suggested reply:
   > Hi Sarah, thanks for sending over the proposal. I'll review
   > and get back to you by end of week with our thoughts.

   Impact: Don't ghost a key relationship

   [Draft Reply] [Already Handled] [Snooze 2 Days]
   ```

**Evidence Displayed:**
- Email subject line and sender
- Days since received
- Excerpt of last message
- Thread importance score

**Acceptance Criteria:**

- [ ] Detects threads with no reply in 3+ days
- [ ] Only flags threads from VIP contacts or marked important
- [ ] Provides 3 reply options: short/medium/detailed
- [ ] "Draft Reply" creates Gmail draft, notifies via Slack
- [ ] "Already Handled" dismisses permanently
- [ ] "Snooze" delays reminder by specified days
- [ ] Doesn't nag if thread was archived or deleted
- [ ] Respects quiet hours (no notifications 10pm-7am)

**Success Metrics:**
- 40% of flagged threads get replies within 2 days
- 30% of users mark as "Useful"
- < 15% marked "Not relevant" (means detection is too aggressive)

---

### Feature 1.3: Daily "Undo Slop" Brief

**User Story:**
> As a user who skims headlines and news,
> I want NodeBench to cut through the noise and tell me what actually matters,
> so that I don't waste time reading low-signal content.

**Triggers:**
- Daily at 6am UTC (or user-configured time)
- News ingestion from RSS/web has new articles

**What NodeBench Does:**

1. **Ingests** news from configured sources (HN, TechCrunch, etc.)
2. **Deduplicates** similar stories (same topic, different outlet)
3. **Filters** for relevance to user's interests (based on entities they track)
4. **Generates** ultra-brief summaries (5-20 words each)
5. **Verifies** claims where possible (cross-reference multiple sources)
6. **Sends** daily digest via Slack:
   ```
   ☀️ Morning Brief - Jan 21, 2026

   3 stories verified, 12 duplicates filtered

   1. Anthropic releases Claude 4 Opus ($$$, 200K context)
      ✓ Verified via 3 sources
      🔗 Announcement | Benchmarks

   2. Startup X raises $50M Series B (rumor, unconfirmed)
      ⚠️ Single source, no press release
      🔗 TechCrunch

   3. New CVE-2026-1234 affects OpenSSL (patch available)
      ✓ Verified via NIST, OpenSSL blog
      🔗 Details | Patch

   [Mark Useful] [Too Noisy] [Customize Topics]
   ```

**Evidence Displayed:**
- Source count (1 source = unverified, 3+ = verified)
- Publication names and links
- Verification status (checkmark or warning)

**Acceptance Criteria:**

- [ ] Sends daily brief at configured time
- [ ] Deduplicates stories with same topic
- [ ] Shows verification status (single source vs. multi-source)
- [ ] Links to original sources
- [ ] Summaries are 5-20 words (not full paragraphs)
- [ ] User can customize topics and sources
- [ ] User can disable or change frequency
- [ ] Tracks open rate and useful rate

**Success Metrics:**
- 60% daily open rate
- 50% marked "Useful"
- < 20% marked "Too noisy" or "Not relevant"
- 10 min/day time saved (vs. manually scanning feeds)

---

## Phase 2: Proactive Drafting (Writes to Staging)

**Timeline:** Weeks 3-4
**Goal:** Time savings and workflow acceleration

### Feature 2.1: CRM Update Drafts

**User Story:**
> As a user who finishes a meeting,
> I want NodeBench to draft my CRM update automatically,
> so that I don't spend 15 minutes manually typing notes.

**Triggers:**
- Calendar event ends
- Meeting had external attendees
- CRM integration enabled

**What NodeBench Does:**

1. **Detects** meeting end from calendar
2. **Checks** if meeting notes exist (Google Doc, Notion, etc.)
3. **Extracts** key points:
   - Attendees and their roles
   - Topics discussed
   - Next steps / action items
   - Sentiment (positive, neutral, concerns)
4. **Drafts** CRM update:
   ```markdown
   ## Meeting: Acme Corp Partnership Discussion
   Date: Jan 21, 2026
   Attendees: Sarah Chen (VP Product), Tom Liu (CTO)

   ### Summary
   Discussed potential partnership on AI-powered analytics.
   Acme interested in piloting with 3 customers in Q2.

   ### Next Steps
   - [ ] Send over case studies by Jan 25
   - [ ] Schedule technical deep-dive with their eng team (week of Feb 3)
   - [ ] Tom to review API docs and share feedback

   ### Sentiment
   🟢 Positive - strong interest, clear next steps

   ### Follow-Up Reminder
   Check in on Feb 1 if haven't heard back
   ```
5. **Notifies** via Slack:
   ```
   📝 CRM Draft Ready

   I drafted your CRM update for the Acme Corp meeting.

   [Review Draft] [Post to CRM] [Ignore]
   ```

**Evidence Displayed:**
- Meeting notes link (if available)
- Calendar event link
- Attendee list from calendar

**Acceptance Criteria:**

- [ ] Drafts created within 5 minutes of meeting end
- [ ] Extracts attendees, topics, next steps accurately (80%+ accuracy)
- [ ] Includes sentiment indicator (positive/neutral/concerns)
- [ ] Creates tasks in CRM for action items
- [ ] "Review Draft" opens staging view with edit capability
- [ ] "Post to CRM" publishes after user confirms
- [ ] Works with Salesforce, HubSpot, Notion, Google Sheets
- [ ] Falls back gracefully if no meeting notes found

**Success Metrics:**
- 50% of drafts posted to CRM with minimal edits
- 30% edited before posting (acceptable)
- < 10% completely ignored (means detection is wrong)
- 10-15 min/meeting saved

---

### Feature 2.2: Follow-Up Email Drafts

**User Story:**
> As a user who wants to follow up after a meeting or intro,
> I want NodeBench to draft the email for me,
> so that I don't have to context-switch and write from scratch.

**Triggers:**
- Meeting ended (calendar event)
- Inbound lead/intro email received
- Deal milestone detected (funding announced, product launched, etc.)

**What NodeBench Does:**

1. **Detects** trigger event
2. **Determines** follow-up type:
   - Post-meeting thank you + next steps
   - Response to intro ("Thanks for the intro, let's chat")
   - Congratulations on milestone ("Saw you raised Series B!")
3. **Drafts** email with 3 variants (short/normal/assertive):

   **Variant 1 (Short):**
   ```
   Subject: Great chatting - next steps

   Sarah,

   Great meeting today! I'll send over those case studies by
   Friday. Let's sync again week of Feb 3 for the technical
   deep-dive.

   Best,
   Alex
   ```

   **Variant 2 (Normal):**
   ```
   Subject: Following up - Acme partnership discussion

   Hi Sarah,

   Thanks for taking the time to meet today. I'm excited about
   the potential partnership and the pilot program you mentioned.

   Next steps on our end:
   • Sending case studies by Jan 25
   • Scheduling technical deep-dive (week of Feb 3)

   Looking forward to moving this forward!

   Best,
   Alex
   ```

   **Variant 3 (Assertive):**
   ```
   Subject: Action items from today's meeting

   Sarah, Tom,

   Great discussion today on the partnership opportunity. Based
   on our conversation, here's what we agreed on:

   Our commitments:
   • Case studies sent by Jan 25
   • Technical deep-dive scheduled for week of Feb 3

   Your commitments:
   • Tom to review API docs and share feedback
   • Confirm 3 pilot customers by Feb 1

   I'll follow up on Feb 1 if I haven't heard back. Let me know
   if you have any questions in the meantime.

   Best,
   Alex
   ```

4. **Notifies** via Slack:
   ```
   ✉️ Follow-Up Draft Ready

   I drafted 3 versions of your follow-up to Sarah Chen (Acme Corp).

   [Review Drafts] [Send Short Version] [Dismiss]
   ```

**Evidence Displayed:**
- Meeting notes or calendar event
- Last email thread with this person (if applicable)
- Relationship history ("You last emailed Sarah 14 days ago")

**Acceptance Criteria:**

- [ ] Drafts created within 10 minutes of trigger
- [ ] Generates 3 variants (short/normal/assertive)
- [ ] Includes specific next steps from meeting notes
- [ ] Pre-fills "To:" field with correct recipients
- [ ] Creates Gmail draft (user can edit before sending)
- [ ] Tracks which variant users prefer (for learning)
- [ ] Includes option to schedule send (e.g., "Send tomorrow at 9am")
- [ ] Respects email signature and formatting preferences

**Success Metrics:**
- 50% of drafts sent with minor/no edits
- 30% sent after editing
- < 10% completely rewritten (means quality is too low)
- 5-10 min/email saved

---

### Feature 2.3: Entity Diligence Escalations

**User Story:**
> As a user tracking companies and people,
> I want NodeBench to alert me when risk signals appear,
> so that I can act before it becomes a crisis.

**Triggers:**
- Risk keyword detected in news ("SEC investigation", "layoffs", "lawsuit", "bankruptcy")
- Negative sentiment spike in media coverage
- Key executive departure
- Financial metric deterioration (if tracking public company)

**What NodeBench Does:**

1. **Monitors** entities in user's watchlist
2. **Detects** risk signals:
   - News with negative keywords
   - SEC filings (8-K immediate disclosures)
   - Sudden increase in negative media coverage
   - C-level departures (CEO, CFO, CTO)
3. **Assesses** severity:
   - **High**: SEC investigation, bankruptcy, CEO departure
   - **Medium**: Layoffs, lawsuit, exec departure
   - **Low**: Negative press, funding delay rumors
4. **Escalates** via Slack:
   ```
   🚨 Risk Alert - Acme Corp

   Severity: HIGH
   Why now: CEO departure announced 2 hours ago

   Summary:
   Sarah Chen (CEO) stepping down "to pursue other opportunities"
   effective immediately. Interim CEO is board member with no ops
   experience. Stock down 12% in after-hours trading.

   Sources:
   ✓ Press release (Acme Corp)
   ✓ TechCrunch
   ✓ Wall Street Journal

   Recommended actions:
   1. Check in with Tom Liu (your contact at Acme)
   2. Review exposure - pause partnership until clarity
   3. Monitor for additional executive departures

   [Create Task] [Update Watchlist] [Dismiss]
   ```

**Evidence Displayed:**
- All sources (press releases, news articles, SEC filings)
- Timeline of events
- Historical context (e.g., "3rd exec departure in 6 months")

**Acceptance Criteria:**

- [ ] Detects risk signals within 1 hour of publication
- [ ] Classifies severity correctly (80%+ accuracy)
- [ ] Provides 3-5 recommended next actions
- [ ] Links to all source material
- [ ] Creates tasks in user's task manager if requested
- [ ] Tracks false positive rate (< 5% for HIGH severity)
- [ ] Allows user to adjust sensitivity per entity
- [ ] Respects quiet hours (no alerts 10pm-7am unless CRITICAL)

**Success Metrics:**
- 90% of HIGH severity alerts acted upon
- 70% marked "Useful"
- < 5% false positives for HIGH severity
- < 15% false positives for MEDIUM severity

---

## Phase 3: Proactive Execution (Autonomy with Guardrails)

**Timeline:** Weeks 5-6
**Goal:** Real automation, but safe

### Feature 3.1: Auto-File Emails

**User Story:**
> As a user drowning in email,
> I want NodeBench to auto-label and file emails for me,
> so that my inbox stays organized without manual triage.

**Triggers:**
- New email received
- Email matches learned pattern (e.g., all emails from "noreply@github.com" → "Updates")

**What NodeBench Does:**

1. **Classifies** email:
   - Work vs. Personal
   - Category (Finance, Legal, Updates, Sales, etc.)
   - Urgency (Needs Reply, FYI, Automated)
2. **Applies** labels automatically
3. **Archives** if FYI-only (configurable)
4. **Notifies** in daily digest (not per-email):
   ```
   📬 Auto-Filed Today

   I organized 47 emails for you:
   • 23 → Updates (GitHub, CI/CD, monitoring)
   • 12 → Finance (receipts, invoices)
   • 8 → Newsletters (archived)
   • 4 → Needs Reply (left in inbox)

   [Review Decisions] [Undo All] [Adjust Settings]
   ```

**Evidence Displayed:**
- Sample emails from each category
- Confidence scores
- Option to review all decisions

**Acceptance Criteria:**

- [ ] Classifies with 90%+ accuracy (based on user feedback)
- [ ] Never auto-archives emails marked "important"
- [ ] Provides undo within 24 hours
- [ ] Learns from manual re-labeling
- [ ] Daily digest shows all auto-filing decisions
- [ ] User can disable per-category or globally
- [ ] Fallback: when confidence < 70%, ask user

**Success Metrics:**
- 80% of users enable auto-filing
- 90% classification accuracy
- 15-30 min/day saved on email triage
- < 2% undo rate

---

### Feature 3.2: Auto-Create Tasks

**User Story:**
> As a user who gets action items from emails and meetings,
> I want NodeBench to create tasks automatically,
> so that I don't forget or have to manually copy-paste.

**Triggers:**
- Email contains action item for user
- Meeting notes contain TODO or action item

**What NodeBench Does:**

1. **Detects** action items:
   - "Can you send over..."
   - "Please review by..."
   - "TODO: ..."
   - Meeting notes: "Action: Alex to..."
2. **Extracts**:
   - Task description
   - Due date (if mentioned)
   - Context (from email or meeting)
3. **Creates** task in user's system (Notion, Todoist, Google Tasks):
   ```
   Task: Send case studies to Sarah Chen
   Due: Jan 25, 2026
   Source: Email from sarah@acme.com, Jan 21
   Context: Acme partnership discussion

   [Created automatically by NodeBench]
   ```
4. **Notifies** via Slack:
   ```
   ✅ Task Created

   I added "Send case studies to Sarah Chen" to your Notion.
   Due Jan 25.

   [View Task] [Mark Done] [Undo]
   ```

**Evidence Displayed:**
- Source email or meeting notes
- Excerpt showing the request
- Who assigned the task

**Acceptance Criteria:**

- [ ] Detects action items with 85%+ accuracy
- [ ] Extracts due date correctly when mentioned
- [ ] Links task back to source (email, meeting notes)
- [ ] Integrates with Notion, Todoist, Google Tasks, Asana
- [ ] Provides undo within 24 hours
- [ ] Doesn't create duplicates for same action item
- [ ] User can disable per-source (e.g., "Don't auto-create from newsletters")

**Success Metrics:**
- 70% of auto-created tasks marked "Useful"
- < 10% undo rate
- 30% reduction in forgotten action items

---

### Feature 3.3: Auto-Schedule Prep Blocks

**User Story:**
> As a user with back-to-back meetings,
> I want NodeBench to block time for meeting prep,
> so that I'm not scrambling right before calls.

**Triggers:**
- Important meeting scheduled
- No prep block exists in calendar
- Sufficient free time available before meeting

**What NodeBench Does:**

1. **Identifies** important meetings (2+ external attendees, key contacts)
2. **Finds** 15-30 min of free time before meeting
3. **Creates** calendar block:
   ```
   Event: Prep for Acme Corp Meeting
   Time: 1:30 PM - 2:00 PM (30 min before meeting)
   Description:
   • Review attendee dossiers
   • Read Sarah's recent email thread
   • Check Acme news from last 7 days

   [Link to prep doc]
   ```
4. **Notifies** via Slack:
   ```
   📅 Prep Block Scheduled

   I added 30 min before your Acme meeting for prep.
   Jan 21, 1:30 PM - 2:00 PM

   [View Event] [Shorten to 15 min] [Remove]
   ```

**Evidence Displayed:**
- Meeting details (attendees, topic)
- When prep doc was created
- Link to prep doc

**Acceptance Criteria:**

- [ ] Schedules prep blocks for meetings with 2+ external attendees
- [ ] Finds free time 15-60 min before meeting
- [ ] Doesn't create conflicts (respects existing events)
- [ ] Default duration: 30 min (configurable)
- [ ] User can remove or shorten with one click
- [ ] Learns preferred prep duration from user behavior
- [ ] Doesn't schedule for routine 1:1s (unless user configures)

**Success Metrics:**
- 60% of prep blocks kept (not deleted)
- 40% of users report feeling "more prepared"
- < 20% deletion rate (means timing/selection is good)

---

## 5. User Experience Flows

### Flow 1: First-Time Setup

**Step 1: Onboarding**
```
Welcome to Proactive NodeBench!

I can now help you proactively by:
• Preparing for meetings ahead of time
• Reminding you about follow-ups
• Alerting you to important news and risks

Let's set your preferences.
```

**Step 2: Choose Features**
```
Which proactive features do you want?

☑ Meeting prep packs (recommended)
☑ Follow-up reminders
☑ Daily news brief
☐ Auto-file emails (requires Gmail access)
☐ Auto-create tasks (requires Notion/Todoist)

You can always change these later.
```

**Step 3: Set Boundaries**
```
When should I NOT notify you?

Quiet hours: 10:00 PM - 7:00 AM
Max notifications per day: 10

How proactive should I be?

◉ Suggest only (safest)
○ Draft for you (saves time)
○ Auto-execute safe actions (most automated)

You're all set! I'll start learning your preferences.
```

---

### Flow 2: Meeting Prep Experience

**T-24 hours before meeting:**

**Slack DM:**
```
💡 Meeting Prep Available

Your meeting with Sarah Chen (Acme Corp) is tomorrow at 2pm.

I'm researching the attendees now. I'll send you a prep doc
in about 10 minutes.
```

**10 minutes later:**

**Slack DM:**
```
✅ Prep Doc Ready

I prepared background on all 3 attendees for your Acme meeting.

📄 Meeting Prep: Acme Corp Partnership
• Sarah Chen - VP Product (ex-Facebook, 8 years at Acme)
• Tom Liu - CTO (ex-Google, joined 2024, AI/ML focus)
• Mike Johnson - Head of Partnerships (your main contact)

Recent context:
• Acme raised Series B ($30M) in Dec 2025
• Launched new AI product 2 weeks ago (TechCrunch)
• Sarah quoted in Forbes about AI strategy

Suggested questions:
• What success metrics would make this pilot a win?
• How does this fit with your AI roadmap?
• What's your ideal timeline for rollout?

[Open Prep Doc] [Add to Calendar] [Not Useful? Tell me why]
```

**User clicks "Open Prep Doc":**

**Notion page created:**
```markdown
# Meeting Prep: Acme Corp Partnership
**Date:** Jan 22, 2026 at 2:00 PM
**Attendees:** Sarah Chen, Tom Liu, Mike Johnson

---

## Attendee Dossiers

### Sarah Chen - VP Product, Acme Corp
**Background:**
• VP Product at Acme (5 years)
• Previously at Facebook (Product Manager, 3 years)
• Stanford CS + MBA

**Recent Activity:**
• Quoted in Forbes (Jan 15): "AI is core to our 2026 strategy"
• Speaker at AI Summit (Dec 2025)
• Active on Twitter/X (@sarahchen) - posts about product strategy

**Talking Points:**
• Ask about AI roadmap mentioned in Forbes
• Reference her AI Summit talk on "AI for Enterprise Analytics"

*Sources: LinkedIn, Forbes, AI Summit speaker page*
*Last updated: Jan 21, 2026*

---

### Tom Liu - CTO, Acme Corp
**Background:**
• CTO at Acme (joined Apr 2024)
• Previously at Google (Staff Engineer, AI/ML, 6 years)
• MIT PhD in Computer Science

**Recent Activity:**
• Hiring for "AI Infrastructure" team (5 open roles on LinkedIn)
• Technical blog post (Jan 10): "Scaling LLM workloads in production"

**Talking Points:**
• Discuss technical architecture for pilot
• Ask about AI infra challenges (tie to his blog post)

*Sources: LinkedIn, Acme blog, Google Scholar*
*Last updated: Jan 21, 2026*

---

## Company Context: Acme Corp

**Quick Facts:**
• Series B stage ($30M, Dec 2025, led by Sequoia)
• 150 employees, growing fast (50 open roles)
• Product: B2B analytics platform for enterprise
• Recent news: AI-powered insights feature launched Jan 2026

**Your Relationship:**
• Last email with Mike: Dec 15, 2025 (5 weeks ago)
• Topic: Exploring partnership opportunities
• Sentiment: Positive, interested in learning more

---

## Suggested Agenda

1. Intros (5 min)
2. Our solution overview (10 min)
3. Acme's use case and goals (15 min)
4. Pilot scope discussion (15 min)
5. Next steps (5 min)

---

## Questions to Ask

**Discovery:**
• What metrics would define success for this pilot?
• What's your timeline for evaluating and rolling out?
• Who else needs to be involved in the decision?

**Technical:**
• What's your current AI/ML stack? (Tom)
• Any integration requirements or constraints?

**Business:**
• How does this fit with your 2026 AI roadmap? (Sarah)
• What budget/resources are allocated for this?

---

## Next Steps to Propose

1. Technical deep-dive with engineering team (week of Feb 3)
2. Send case studies and customer references (by Jan 25)
3. Pilot proposal and SOW (by Feb 10)
4. Decision timeline: end of Feb?

---

*This prep doc was created by NodeBench on Jan 21, 2026*
*🔗 [Calendar Event] [Email Thread] [Acme in CRM]*
```

**User feedback after meeting:**

**Slack DM:**
```
How was the prep doc for your Acme meeting?

[👍 Useful] [👎 Not Useful]

Optional: What would make it better?
[ ] More detail on company
[ ] Less detail (too long)
[ ] Different sources
[ ] Other (tell me)
```

---

### Flow 3: Follow-Up Draft Experience

**Trigger: Meeting ended**

**5 minutes after meeting ends:**

**Slack DM:**
```
✉️ Follow-Up Draft Ready

I noticed your Acme meeting just ended. I drafted a follow-up
email based on your meeting notes.

I created 3 versions:
• Short (3 sentences)
• Normal (1 paragraph + next steps)
• Assertive (formal with clear commitments)

[Review Drafts] [Send Short Version] [Not Needed]
```

**User clicks "Review Drafts":**

**Gmail opens with 3 draft tabs:**

**Draft 1 (Short):**
```
To: sarah@acme.com, tom@acme.com
Subject: Great meeting - next steps

Sarah, Tom,

Great meeting! I'll send case studies by Friday and we'll
schedule the technical deep-dive for week of Feb 3.

Best,
Alex
```

**Draft 2 (Normal):**
```
To: sarah@acme.com, tom@acme.com
Subject: Following up - Acme partnership

Hi Sarah and Tom,

Thanks for the great conversation today. I'm excited about the
pilot opportunity and the potential to help Acme scale AI insights.

Next steps on our end:
• Case studies sent by Jan 25
• Technical deep-dive scheduled (week of Feb 3)
• Pilot proposal by Feb 10

Looking forward to moving this forward!

Best,
Alex
```

**Draft 3 (Assertive):**
```
To: sarah@acme.com, tom@acme.com
Subject: Action items - Acme partnership pilot

Sarah, Tom,

Great discussion today. Based on our conversation, here are
the agreed action items:

Our commitments:
• Send case studies by Jan 25
• Schedule technical deep-dive with engineering (week of Feb 3)
• Deliver pilot proposal by Feb 10

Your commitments:
• Tom to review API documentation and share feedback
• Confirm 3 pilot customers for Q2 by Feb 1
• Intro to procurement for contracting

I'll check in on Feb 1 if I haven't heard back. Please let me
know if anything needs adjustment.

Best,
Alex
```

**User edits Draft 2, clicks Send:**

**Slack DM:**
```
✅ Email Sent

Your follow-up to Sarah and Tom was sent at 2:47 PM.

Did this save you time?
[👍 Yes - about 5 min] [👍 Yes - about 10 min] [👎 No]
```

---

## 6. Settings & Controls

### 6.1 Proactive Settings Page

**Location:** Settings → Proactive Features

```
╔══════════════════════════════════════════════════════════════╗
║                    Proactive Features                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Master Toggle                                                ║
║  [ON] Enable proactive suggestions and automation            ║
║                                                               ║
║  When disabled, NodeBench will only respond to direct        ║
║  questions and commands.                                      ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Feature Toggles                                              ║
║                                                               ║
║  [ON] Meeting Prep Packs                                     ║
║       Automatically prepare for upcoming meetings            ║
║       Last used: 2 hours ago                                  ║
║                                                               ║
║  [ON] Follow-Up Reminders                                    ║
║       Remind me about emails that need replies               ║
║       Last used: Yesterday                                    ║
║                                                               ║
║  [ON] Daily News Brief                                       ║
║       Cut through the noise in news and articles             ║
║       Last sent: Today at 6:00 AM                            ║
║                                                               ║
║  [OFF] CRM Update Drafts                                     ║
║        Draft CRM updates after meetings                      ║
║        Requires: CRM integration (Salesforce/HubSpot)        ║
║                                                               ║
║  [OFF] Auto-File Emails                                      ║
║        Automatically label and organize inbox                ║
║        Requires: Gmail access                                 ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Automation Level                                             ║
║                                                               ║
║  How proactive should NodeBench be?                          ║
║                                                               ║
║  ◉ Suggest Only (safest)                                     ║
║     Show suggestions, I'll take action                       ║
║                                                               ║
║  ○ Draft for Me (recommended)                                ║
║     Create drafts in Gmail, Notion, etc. for my review      ║
║                                                               ║
║  ○ Auto-Execute (most automated)                             ║
║     Execute safe actions automatically (with audit trail)    ║
║     Requires: Explicit approval for each action type         ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Quiet Hours                                                  ║
║                                                               ║
║  [ON] Don't notify me during:                                ║
║  From: [10:00 PM ▼]  To: [7:00 AM ▼]                        ║
║  Timezone: [America/New_York ▼]                             ║
║                                                               ║
║  Exception: Still notify for CRITICAL alerts                 ║
║  (security risks, major incidents)                           ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Rate Limits                                                  ║
║                                                               ║
║  Maximum notifications per day: [10 ▼]                       ║
║                                                               ║
║  Current usage today: 3 / 10                                  ║
║  Most recent: Meeting prep for Acme Corp (2 hours ago)      ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Delivery Channels                                            ║
║                                                               ║
║  Where should I send proactive notifications?                ║
║                                                               ║
║  [ON] Slack DM (primary)                                     ║
║  [ON] In-app notifications                                   ║
║  [OFF] Email (only for daily digest)                         ║
║  [OFF] SMS (high-priority only)                              ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Advanced                                                     ║
║                                                               ║
║  [View Activity Log]  See all proactive actions taken        ║
║  [Export Settings]    Download your configuration            ║
║  [Reset to Defaults]  Restore default settings               ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 6.2 Per-Action Permissions

**Location:** Settings → Proactive Features → Advanced → Action Permissions

```
╔══════════════════════════════════════════════════════════════╗
║                    Action Permissions                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Configure what NodeBench can do automatically.              ║
║                                                               ║
║  Legend:                                                      ║
║  Suggest = Show me the suggestion, I'll decide               ║
║  Draft = Create draft, I'll review before sending            ║
║  Execute = Do it automatically (with audit trail)            ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Send Email                                                   ║
║  ○ Suggest  ◉ Draft  ○ Execute                              ║
║                                                               ║
║  Create Task                                                  ║
║  ○ Suggest  ○ Draft  ◉ Execute                              ║
║                                                               ║
║  Update CRM                                                   ║
║  ○ Suggest  ◉ Draft  ○ Execute                              ║
║                                                               ║
║  Schedule Meeting                                             ║
║  ◉ Suggest  ○ Draft  ○ Execute                              ║
║                                                               ║
║  Create Calendar Block                                        ║
║  ○ Suggest  ○ Draft  ◉ Execute                              ║
║                                                               ║
║  Label Email                                                  ║
║  ○ Suggest  ○ Draft  ◉ Execute                              ║
║                                                               ║
║  Send Slack Message                                           ║
║  ◉ Suggest  ○ Draft  ○ Execute                              ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Risk-Based Approval                                          ║
║                                                               ║
║  Require my approval for:                                     ║
║  [ON] High-risk actions (always recommended)                 ║
║  [ON] Medium-risk actions                                    ║
║  [OFF] Low-risk actions                                      ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 7. Success Metrics & Analytics

### 7.1 User-Facing Dashboard

**Location:** Home → Proactive Stats

```
╔══════════════════════════════════════════════════════════════╗
║              Your Proactive Intelligence Stats                ║
║                      Last 30 Days                             ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Time Saved                                                   ║
║  ████████████████████░░░░  8.5 hours                         ║
║                                                               ║
║  Breakdown:                                                   ║
║  • Meeting prep: 4.2 hours (12 meetings)                     ║
║  • Email drafts: 2.8 hours (23 emails)                       ║
║  • News filtering: 1.5 hours (30 briefs)                     ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Opportunities Surfaced                                       ║
║                                                               ║
║  42 total  |  34 acted upon  |  6 dismissed  |  2 ignored   ║
║                                                               ║
║  Top types:                                                   ║
║  📅 Meeting prep: 12                                          ║
║  ✉️  Follow-ups: 18                                           ║
║  🚨 Risk alerts: 2                                            ║
║  📝 CRM updates: 10                                           ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Your Feedback                                                ║
║                                                               ║
║  👍 Useful: 28 (82%)                                          ║
║  👎 Not Useful: 4 (12%)                                       ║
║  🤷 No Feedback: 2 (6%)                                       ║
║                                                               ║
║  You're helping NodeBench learn! Keep providing feedback.    ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Recent Activity                                              ║
║                                                               ║
║  Today, 2:30 PM                                               ║
║  ✉️  Drafted follow-up to Acme Corp meeting                  ║
║      Status: Sent (edited before sending)                    ║
║                                                               ║
║  Today, 6:00 AM                                               ║
║  📰 Daily news brief delivered                                ║
║      Status: Opened, marked "Useful"                         ║
║                                                               ║
║  Yesterday, 4:15 PM                                           ║
║  📅 Prep pack for Investor Meeting created                   ║
║      Status: Viewed, meeting went well                       ║
║                                                               ║
║  [View Full Activity Log]                                     ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 7.2 Product Team Metrics

**Monitored via internal dashboard:**

```yaml
Product Metrics (Weekly Review):

  Adoption:
    - % users with proactive enabled: Target 70%, Warning 50%
    - % users who've tried ≥ 1 feature: Target 80%, Warning 60%
    - Average features enabled per user: Target 3.5, Warning 2.0

  Engagement:
    - Daily active users (using proactive): Target 40%, Warning 25%
    - Opportunities surfaced per user/week: Target 10, Warning 5
    - Action rate (user acts on opportunity): Target 60%, Warning 40%

  Quality:
    - Useful rate (thumbs up): Target 70%, Critical < 50%
    - Dismissal rate: Target < 15%, Critical > 30%
    - False positive rate: Target < 10%, Critical > 20%

  Impact:
    - Time saved per user/week (self-reported): Target 2 hours
    - Meeting prep adoption: Target 60%, Warning 40%
    - Follow-up completion: Target 40%, Warning 20%

  Reliability:
    - Detector success rate: Target 95%, Critical < 90%
    - Time to surface (event → notification): Target < 5 min, Critical > 15 min
    - Delivery success rate: Target 99%, Critical < 95%
```

---

## 8. Privacy & Security

### 8.1 Data Handling

**Principles:**

1. **Least Privilege**: Only access data needed for proactive features
2. **Explicit Consent**: User must opt-in to each feature
3. **Transparency**: Show what data is used for each suggestion
4. **Deletion**: User can delete all proactive data at any time

**Data Storage:**

| Data Type | Storage Location | Retention | Encryption |
|-----------|-----------------|-----------|------------|
| Calendar events | `events` table | 90 days | At rest + in transit |
| Email content | `sourceArtifacts` | Per retention class | At rest + in transit |
| Opportunities | `opportunities` | 30 days after close | At rest |
| Actions | `proactiveActions` | 90 days | At rest |
| User feedback | `proactiveFeedbackLabels` | Indefinite (anonymized) | At rest |

**PII Classification:**

- Email addresses, names → flagged as PII, encrypted
- Meeting notes, CRM data → flagged as confidential
- All PII automatically deleted per retention class

### 8.2 Compliance

**GDPR:**
- Right to access: User can export all proactive data
- Right to deletion: One-click delete all proactive data
- Right to opt-out: Granular opt-out per feature

**SOC 2:**
- Audit logs for all proactive actions
- Access controls (only user can see their opportunities)
- Incident response for failed actions

---

## 9. Non-Goals (Out of Scope)

**Phase 1-3:**

1. **Social media monitoring**: Not tracking Twitter, LinkedIn posts proactively
2. **Voice/photo capture**: Deferred to Phase 4+
3. **Multi-user collaboration**: Proactive is currently single-user
4. **Mobile app**: Web + Slack only for now
5. **Third-party app integrations**: Limited to Gmail, Calendar, CRM initially

**Why:**
- Scope control for MVP
- Focus on highest-value features first
- Learn and iterate before expanding

---

## 10. Open Questions

**For Product:**
1. Should we allow users to create custom detectors? (e.g., "Alert me when X company raises funding")
2. What's the right balance between notifications and noise?
3. Should we have a "trial period" where everything is suggest-only?

**For Design:**
1. How do we make evidence/sources visible without cluttering the UI?
2. What's the best way to collect feedback (thumbs up/down, 5-star, written)?
3. Should we have a "Proactive Feed" in the app, or only push notifications?

**For Engineering:**
1. How do we handle detector versioning and A/B testing?
2. What's the latency budget for event → opportunity → delivery?
3. How do we prevent "thundering herd" of notifications after downtime?

**For Legal/Compliance:**
1. Do we need explicit consent for each proactive feature, or one blanket consent?
2. What's the minimum retention period for audit/compliance?
3. Are there jurisdictional differences we need to handle (EU vs. US)?

---

## 11. Rollout Plan

### Phase 1: Internal Alpha (Weeks 1-2)

**Audience:** 5-10 internal users
**Features:** Meeting prep, follow-up reminders
**Goal:** Validate core experience, find bugs

**Success Criteria:**
- Zero critical bugs
- 70%+ useful rate
- < 5% false positive rate

---

### Phase 2: Closed Beta (Weeks 3-4)

**Audience:** 50 power users (invite-only)
**Features:** + Daily brief, CRM drafts, email drafts
**Goal:** Validate at scale, tune detectors

**Success Criteria:**
- 60% weekly active
- 65%+ useful rate
- < 10% false positive rate
- Collect 200+ feedback labels

---

### Phase 3: Open Beta (Weeks 5-6)

**Audience:** All users (opt-in)
**Features:** + Auto-file, auto-tasks, auto-calendar
**Goal:** Broad adoption, detector calibration

**Success Criteria:**
- 40% of users enable proactive
- 60%+ useful rate
- < 15% false positive rate
- 500+ feedback labels collected

---

### Phase 4: General Availability (Week 7+)

**Audience:** All users (default on, easy opt-out)
**Features:** All Phase 1-3 features
**Goal:** Full production rollout

**Success Criteria:**
- 70% of users keep proactive enabled
- 2 hours/week saved per user
- < 10% false positive rate (sustained)

---

## 12. Appendix

### A. Competitive Landscape

**Proactive AI Tools:**

| Tool | Proactive Features | Strengths | Weaknesses |
|------|-------------------|-----------|------------|
| **Superhuman** | Email triage, reminders | Fast, keyboard-first | Email-only, expensive |
| **Reclaim.ai** | Auto-scheduling, time blocking | Calendar focus | No email/CRM integration |
| **Notion AI** | Document suggestions | Deep Notion integration | Not truly proactive (requires prompt) |
| **Clay** | Relationship tracking, reminders | Great for sales | Requires manual input |
| **Motion** | Task prioritization, scheduling | Smart scheduling | No email integration |

**NodeBench Differentiation:**
- **Cross-tool integration**: Email + Calendar + CRM + Research all in one
- **Evidence-based**: Every suggestion has sources and rationale
- **Controllable**: Granular permissions and opt-outs
- **Learning**: Feedback loop improves over time

---

### B. Technical Dependencies

**Required Integrations:**

1. **Google Calendar API**: Read events, create blocks
2. **Gmail API**: Read threads, create drafts, send emails
3. **Slack API**: Send DMs, interactive buttons
4. **CRM APIs**: Salesforce, HubSpot (read/write)
5. **Task Management APIs**: Notion, Todoist, Asana

**Infrastructure:**

1. **Event processing**: Kafka or Convex streaming
2. **LLM**: Claude 3.5 Sonnet for detection, synthesis
3. **Embeddings**: Voyage AI for entity matching
4. **Storage**: Convex for all tables + artifacts
5. **Monitoring**: Datadog for SLOs and alerting

---

### C. Glossary

**Detector**: Code that analyzes events and creates opportunities
**Opportunity**: A detected situation where NodeBench can help
**Action**: A specific thing NodeBench can do (send email, create task, etc.)
**Policy Gateway**: System that checks if an action is allowed
**Evidence Pointer**: Reference to source data (artifact + excerpt)
**Retention Class**: How long data is kept (transient/standard/extended/permanent)

---

**Document Status:** Draft v1.0
**Last Updated:** 2026-01-21
**Next Review:** After stakeholder feedback
