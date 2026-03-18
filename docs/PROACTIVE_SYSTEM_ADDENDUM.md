# NodeBench Proactive System - Design Addendum

**Version:** 1.1
**Date:** 2026-01-21
**Status:** Updated with Product Decisions

---

## Decision Summary

Based on product team feedback, the following decisions have been made:

1. ✅ **Custom Detectors**: Allowed as **premium feature**, pre-configured detectors as default
2. ✅ **Free vs Paid Tier**: Default detectors free, custom detectors + advanced features paid
3. ✅ **Trial Period**: Standard free tier features (no special trial mode)
4. ✅ **Proactive Feed**: Both in-app AND other platforms (Slack, email, etc.)
5. ✅ **Feedback Admin Panel**: Invite-only admin dashboard for viewing all user feedback
6. ✅ **Consent Model**: Blanket consent on onboarding (not per-feature)
7. ✅ **Retention Policy**: Minimum 90 days for compliance, configurable beyond

---

## 1. Custom Detector Builder (Premium Feature)

### 1.1 Product Positioning

**Free Tier:**
- Pre-configured detectors (meeting prep, follow-ups, daily brief, etc.)
- Up to 50 proactive notifications/month
- Basic settings (quiet hours, rate limits)

**Paid Tier ($29/month):**
- All free tier features
- **Custom detector builder** (unlimited custom detectors)
- Unlimited proactive notifications
- Advanced settings (per-action permissions, custom schedules)
- Priority support
- API access for custom integrations

### 1.2 Custom Detector Builder UI

**Location:** Settings → Proactive Features → Custom Detectors (Premium)

```
╔══════════════════════════════════════════════════════════════╗
║                 Custom Detector Builder                       ║
║                      [Premium Feature]                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Create custom detectors to monitor specific events and      ║
║  trigger proactive actions tailored to your workflow.        ║
║                                                               ║
║  [+ New Custom Detector]                                     ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Your Custom Detectors (3)                                    ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ 🚀 Series B Funding Alert                              │  ║
║  │                                                         │  ║
║  │ When: Company I'm tracking raises Series B             │  ║
║  │ Then: Send Slack DM with company details               │  ║
║  │                                                         │  ║
║  │ Status: ● Active  |  Triggered: 3 times this month    │  ║
║  │ [Edit] [Pause] [Delete] [View Log]                    │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ 💼 VC Intro Follow-Up                                  │  ║
║  │                                                         │  ║
║  │ When: Email from @sequoia.com or @a16z.com            │  ║
║  │ Then: Draft follow-up within 2 hours                   │  ║
║  │                                                         │  ║
║  │ Status: ● Active  |  Triggered: 8 times this month    │  ║
║  │ [Edit] [Pause] [Delete] [View Log]                    │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ ⏰ Quarterly Review Prep                               │  ║
║  │                                                         │  ║
║  │ When: 1 week before quarter end                        │  ║
║  │ Then: Create portfolio review doc with all updates     │  ║
║  │                                                         │  ║
║  │ Status: ○ Paused  |  Next trigger: Mar 24, 2026       │  ║
║  │ [Edit] [Resume] [Delete] [View Log]                   │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 1.3 Detector Builder Form

**Click [+ New Custom Detector]:**

```
╔══════════════════════════════════════════════════════════════╗
║                  Create Custom Detector                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Step 1: Name Your Detector                                  ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ Detector Name: [____________________________]        │    ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                               ║
║  Example: "Series B Funding Alert", "Key Customer Email"     ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Step 2: Choose Trigger                                       ║
║                                                               ║
║  When should this detector run?                              ║
║                                                               ║
║  Trigger Type:                                                ║
║  ◉ Event-based (runs when specific event happens)            ║
║  ○ Time-based (runs on schedule)                             ║
║  ○ Threshold-based (runs when metric crosses threshold)      ║
║                                                               ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ Event Type: [News Article ▼]                         │    ║
║  │                                                       │    ║
║  │ Additional Filters:                                  │    ║
║  │ ☑ Only if contains keywords                          │    ║
║  │   Keywords: [Series B, funding, raised, investment]  │    ║
║  │                                                       │    ║
║  │ ☑ Only if mentions entity                            │    ║
║  │   Entity Type: [Company ▼]                           │    ║
║  │   Entity Filter: [From my watchlist ▼]              │    ║
║  │                                                       │    ║
║  │ ☐ Only if from specific sources                      │    ║
║  │   Sources: [________________________]                │    ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Step 3: Define Conditions (Optional)                         ║
║                                                               ║
║  Additional conditions that must be true:                    ║
║                                                               ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ [+] Add Condition                                     │    ║
║  │                                                       │    ║
║  │ If [Entity is in watchlist ▼]                       │    ║
║  │ And [Funding amount ▼] [greater than ▼] [$10M___]   │    ║
║  │ And [Article published ▼] [within ▼] [24 hours__]   │    ║
║  │                                                       │    ║
║  │ [+ Add Another Condition] [Remove]                   │    ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Step 4: Configure Actions                                    ║
║                                                               ║
║  What should happen when this detector triggers?             ║
║                                                               ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ Action 1: [Send Notification ▼]                      │    ║
║  │                                                       │    ║
║  │ Channel: [Slack DM ▼]                                │    ║
║  │                                                       │    ║
║  │ Message Template:                                     │    ║
║  │ ┌────────────────────────────────────────────────┐   │    ║
║  │ │ 🚀 Series B Alert: {company_name}              │   │    ║
║  │ │                                                 │   │    ║
║  │ │ {company_name} raised {funding_amount} in      │   │    ║
║  │ │ Series B led by {lead_investor}.               │   │    ║
║  │ │                                                 │   │    ║
║  │ │ Source: {article_url}                           │   │    ║
║  │ │ Published: {published_date}                     │   │    ║
║  │ │                                                 │   │    ║
║  │ │ [View Full Article] [Add to Research Queue]    │   │    ║
║  │ └────────────────────────────────────────────────┘   │    ║
║  │                                                       │    ║
║  │ [+ Add Another Action]                                │    ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                               ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ Action 2: [Create Research Task ▼]                   │    ║
║  │                                                       │    ║
║  │ Task Priority: [High ▼]                              │    ║
║  │ Research Depth: [Standard ▼]                         │    ║
║  │ Personas: [EARLY_STAGE_VC ▼]                        │    ║
║  │                                                       │    ║
║  │ [Remove Action]                                      │    ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Step 5: Set Schedule & Limits                                ║
║                                                               ║
║  ☑ Respect quiet hours                                       ║
║  ☑ Deduplicate (don't trigger twice for same event)         ║
║                                                               ║
║  Rate Limit: [5 ▼] notifications per [day ▼]                ║
║                                                               ║
║  Priority: [Medium ▼]                                        ║
║  (Higher priority detectors trigger first if rate limited)   ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Step 6: Test Detector                                        ║
║                                                               ║
║  Test your detector before enabling it.                      ║
║                                                               ║
║  [Run Test on Recent Events]                                 ║
║                                                               ║
║  Test Results:                                                ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ ✅ Would have triggered 3 times in the last 7 days: │    ║
║  │                                                       │    ║
║  │ • Jan 18: Acme Corp raises $30M Series B             │    ║
║  │ • Jan 15: BetaCo raises $50M Series B                │    ║
║  │ • Jan 12: Gamma raises $20M Series B                 │    ║
║  │                                                       │    ║
║  │ All matches look correct ✓                           │    ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  [Save as Draft] [Save & Enable] [Cancel]                    ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 1.4 Custom Detector Schema

**Database addition:**

```typescript
// convex/schema.ts
const customDetectors = defineTable({
  // Identity
  detectorId: v.string(),                 // UUID
  userId: v.id("users"),                  // Owner
  name: v.string(),                       // User-defined name
  description: v.optional(v.string()),    // Optional description

  // Trigger configuration
  triggerType: v.union(
    v.literal("event"),                   // Event-based trigger
    v.literal("schedule"),                // Time-based (cron)
    v.literal("threshold"),               // Metric threshold
  ),

  // Event trigger config
  eventTrigger: v.optional(v.object({
    eventType: v.string(),                // Which event type to monitor
    keywords: v.optional(v.array(v.string())),
    entityFilter: v.optional(v.object({
      entityType: v.string(),
      scope: v.union(
        v.literal("watchlist"),
        v.literal("all"),
        v.literal("specific_ids"),
      ),
      entityIds: v.optional(v.array(v.string())),
    })),
    sourcesFilter: v.optional(v.array(v.string())),
  })),

  // Schedule trigger config
  scheduleTrigger: v.optional(v.object({
    cronExpression: v.string(),           // e.g., "0 9 * * 1" (every Monday 9am)
    timezone: v.string(),                 // e.g., "America/New_York"
  })),

  // Threshold trigger config
  thresholdTrigger: v.optional(v.object({
    metric: v.string(),                   // e.g., "entity_freshness"
    operator: v.union(
      v.literal("gt"),                    // Greater than
      v.literal("lt"),                    // Less than
      v.literal("eq"),                    // Equals
    ),
    value: v.number(),
    checkInterval: v.string(),            // Cron expression for checking
  })),

  // Additional conditions (AND logic)
  conditions: v.optional(v.array(v.object({
    field: v.string(),                    // e.g., "funding_amount"
    operator: v.string(),                 // "gt", "lt", "eq", "contains"
    value: v.any(),                       // Comparison value
  }))),

  // Actions to take when triggered
  actions: v.array(v.object({
    actionType: v.string(),               // "send_notification", "create_task", etc.
    config: v.any(),                      // Action-specific configuration
    template: v.optional(v.string()),     // Message template with variables
  })),

  // Rate limiting
  rateLimit: v.optional(v.object({
    maxPerDay: v.optional(v.number()),
    maxPerWeek: v.optional(v.number()),
    deduplicateWindow: v.optional(v.number()), // ms
  })),

  // Settings
  priority: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
  ),
  respectQuietHours: v.boolean(),
  deduplicate: v.boolean(),

  // Status
  status: v.union(
    v.literal("draft"),                   // Not yet enabled
    v.literal("active"),                  // Running
    v.literal("paused"),                  // Temporarily disabled
    v.literal("error"),                   // Configuration error
  ),
  errorMessage: v.optional(v.string()),

  // Stats
  triggerCount: v.number(),               // Total times triggered
  lastTriggeredAt: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_status", ["userId", "status"])
  .index("by_triggerType", ["triggerType"]);
```

---

### 1.5 Template Library (Pre-built Custom Detectors)

**Common templates users can clone:**

```typescript
// convex/domains/proactive/detectorTemplates.ts

export const DETECTOR_TEMPLATES = [
  {
    id: "funding_alert",
    name: "Funding Alert",
    description: "Get notified when companies you track raise funding",
    category: "Finance",
    icon: "🚀",
    triggerType: "event",
    eventTrigger: {
      eventType: "web_article_discovered",
      keywords: ["raised", "funding", "Series A", "Series B", "Series C"],
      entityFilter: {
        entityType: "company",
        scope: "watchlist",
      },
    },
    actions: [
      {
        actionType: "send_notification",
        config: { channel: "slack" },
        template: "🚀 {company_name} raised {amount} in {round}. {article_url}",
      },
      {
        actionType: "create_research_task",
        config: { priority: "high", personas: ["EARLY_STAGE_VC"] },
      },
    ],
  },
  {
    id: "executive_departure",
    name: "Executive Departure Alert",
    description: "Monitor C-level departures at portfolio companies",
    category: "People",
    icon: "👔",
    triggerType: "event",
    eventTrigger: {
      eventType: "web_article_discovered",
      keywords: ["CEO", "CFO", "CTO", "stepping down", "departure", "resignation"],
      entityFilter: {
        entityType: "company",
        scope: "watchlist",
      },
    },
    actions: [
      {
        actionType: "send_notification",
        config: { channel: "slack", urgency: "high" },
        template: "🚨 Leadership change at {company_name}: {executive_name} stepping down as {role}.",
      },
    ],
  },
  {
    id: "customer_milestone",
    name: "Customer Milestone",
    description: "Track when customers hit milestones (product launch, IPO, etc.)",
    category: "Relationships",
    icon: "🎯",
    triggerType: "event",
    eventTrigger: {
      eventType: "web_article_discovered",
      keywords: ["launches", "IPO", "acquisition", "Series"],
      entityFilter: {
        entityType: "company",
        scope: "specific_ids",
        entityIds: [], // User fills in their customer list
      },
    },
    actions: [
      {
        actionType: "draft_email",
        config: { template: "congratulations" },
        template: "Congrats on {milestone}! Would love to catch up on how things are going.",
      },
    ],
  },
  {
    id: "weekly_portfolio_digest",
    name: "Weekly Portfolio Digest",
    description: "Summary of all portfolio activity every Monday",
    category: "Reporting",
    icon: "📊",
    triggerType: "schedule",
    scheduleTrigger: {
      cronExpression: "0 9 * * 1", // Every Monday at 9am
      timezone: "America/New_York",
    },
    actions: [
      {
        actionType: "create_document",
        config: { template: "portfolio_digest" },
      },
      {
        actionType: "send_notification",
        config: { channel: "slack" },
        template: "📊 Your weekly portfolio digest is ready.",
      },
    ],
  },
  {
    id: "relationship_staleness",
    name: "Relationship Check-In",
    description: "Remind me to reach out if I haven't talked to someone in 30+ days",
    category: "Relationships",
    icon: "💬",
    triggerType: "threshold",
    thresholdTrigger: {
      metric: "days_since_last_contact",
      operator: "gt",
      value: 30,
      checkInterval: "0 9 * * *", // Check daily at 9am
    },
    conditions: [
      {
        field: "relationship_tier",
        operator: "eq",
        value: "key_contact",
      },
    ],
    actions: [
      {
        actionType: "send_notification",
        config: { channel: "slack" },
        template: "💬 You haven't talked to {person_name} in {days} days. Time to catch up?",
      },
    ],
  },
];
```

**UI for template library:**

```
╔══════════════════════════════════════════════════════════════╗
║              Custom Detector Templates                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Get started quickly with pre-built detector templates.      ║
║  Clone and customize to fit your workflow.                   ║
║                                                               ║
║  [View All Templates (12)] [Search: ____________]            ║
║                                                               ║
║  ┌─ Finance (3) ─────────────────────────────────────────┐   ║
║  │                                                         │   ║
║  │ 🚀 Funding Alert                                       │   ║
║  │ Get notified when companies you track raise funding    │   ║
║  │ [Clone Template]                                       │   ║
║  │                                                         │   ║
║  │ 💰 IPO Alert                                           │   ║
║  │ Monitor for IPO filings and announcements              │   ║
║  │ [Clone Template]                                       │   ║
║  │                                                         │   ║
║  └─────────────────────────────────────────────────────────┘   ║
║                                                               ║
║  ┌─ People (2) ────────────────────────────────────────────┐  ║
║  │                                                         │   ║
║  │ 👔 Executive Departure Alert                           │   ║
║  │ Monitor C-level departures at portfolio companies      │   ║
║  │ [Clone Template]                                       │   ║
║  │                                                         │   ║
║  └─────────────────────────────────────────────────────────┘   ║
║                                                               ║
║  ┌─ Relationships (3) ─────────────────────────────────────┐  ║
║  │                                                         │   ║
║  │ 💬 Relationship Check-In                               │   ║
║  │ Remind me to reach out if haven't talked in 30+ days   │   ║
║  │ [Clone Template]                                       │   ║
║  │                                                         │   ║
║  └─────────────────────────────────────────────────────────┘   ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 2. Admin Feedback Dashboard (Invite-Only)

### 2.1 Admin Access Control

**Admins:**
- `hshum2018@gmail.com` (owner)
- Test accounts (configurable)
- Invite-only via admin panel

**Schema addition:**

```typescript
// convex/schema.ts
const adminUsers = defineTable({
  userId: v.id("users"),
  email: v.string(),
  role: v.union(
    v.literal("owner"),                   // hshum2018@gmail.com
    v.literal("admin"),                   // Full access
    v.literal("viewer"),                  // Read-only
  ),
  permissions: v.array(v.string()),       // ["view_feedback", "view_analytics", "manage_users"]
  invitedBy: v.optional(v.id("users")),
  createdAt: v.number(),
})
  .index("by_email", ["email"])
  .index("by_userId", ["userId"]);
```

---

### 2.2 Admin Feedback Dashboard UI

**Location:** `/admin/feedback` (only accessible to admin users)

```
╔══════════════════════════════════════════════════════════════╗
║                  Admin Feedback Dashboard                     ║
║                    [hshum2018@gmail.com]                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Overview - Last 30 Days                                      ║
║                                                               ║
║  Total Feedback: 1,247                                        ║
║  👍 Useful: 892 (71.5%)                                       ║
║  👎 Not Useful: 248 (19.9%)                                   ║
║  🤷 No Feedback: 107 (8.6%)                                   ║
║                                                               ║
║  Trending Issues:                                             ║
║  ⚠️ "Wrong timing" feedback increased 15% this week          ║
║  ⚠️ "Too frequent" feedback for daily brief up 8%            ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Filters                                                      ║
║                                                               ║
║  Date Range: [Last 30 Days ▼]                                ║
║  Feedback Type: [All ▼]                                      ║
║  Detector: [All Detectors ▼]                                 ║
║  User: [All Users ▼]                                          ║
║                                                               ║
║  [Apply Filters] [Reset] [Export CSV]                        ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Feedback by Detector                                         ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ Detector               | Total | Useful | Not Useful  │  ║
║  ├────────────────────────────────────────────────────────┤  ║
║  │ Meeting Prep           |  342  | 87.4%  | 9.1%        │  ║
║  │ Follow-Up Nudges       |  487  | 68.2%  | 24.8%  ⚠️   │  ║
║  │ Daily Brief            |  289  | 71.3%  | 18.7%       │  ║
║  │ CRM Update Drafts      |  129  | 79.1%  | 14.0%       │  ║
║  │ Custom: Funding Alert  |   45  | 95.6%  | 2.2%   ✓   │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Recent Feedback (Showing 10 of 1,247)                        ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ 2 hours ago | user123@company.com                      │  ║
║  │ Opportunity: Meeting Prep - Acme Corp                  │  ║
║  │ Feedback: 👍 Useful                                     │  ║
║  │ Comment: "Saved me 20 min of prep time!"               │  ║
║  │ [View Details] [Flag for Review]                       │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ 3 hours ago | sarah@startup.com                        │  ║
║  │ Opportunity: Follow-Up Nudge - Investment email        │  ║
║  │ Feedback: 👎 Not Useful                                 │  ║
║  │ Reason: Wrong timing                                    │  ║
║  │ Comment: "I already replied yesterday"                 │  ║
║  │ [View Details] [Flag for Review]                       │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ 5 hours ago | tom@vc-firm.com                          │  ║
║  │ Opportunity: Custom Detector - Series B Alert          │  ║
║  │ Feedback: 👍 Useful                                     │  ║
║  │ Comment: "Perfect! Exactly what I needed."             │  ║
║  │ [View Details] [Promote to Template]                   │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  [Load More] [View All]                                       ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Top Complaints (Last 7 Days)                                 ║
║                                                               ║
║  1. "Too frequent" - 34 instances                            ║
║     Most common for: Follow-Up Nudges (23), Daily Brief (11) ║
║     [View Details] [Adjust Rate Limits]                      ║
║                                                               ║
║  2. "Wrong timing" - 28 instances                            ║
║     Most common for: Meeting Prep (18), Follow-Up (10)       ║
║     [View Details] [Review Timing Logic]                     ║
║                                                               ║
║  3. "Missing context" - 19 instances                         ║
║     Most common for: CRM Drafts (12), Email Drafts (7)       ║
║     [View Details] [Improve Evidence]                        ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Actions                                                      ║
║                                                               ║
║  [Pause Detector] [Adjust Thresholds] [Export for Analysis]  ║
║  [Send Update to Users] [Create Bug Report]                  ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 2.3 Admin Analytics Queries

**Backend queries for admin dashboard:**

```typescript
// convex/domains/proactive/adminQueries.ts

export const getAllFeedback = query({
  args: {
    filters: v.optional(v.object({
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      feedbackType: v.optional(v.string()),
      detectorName: v.optional(v.string()),
      userId: v.optional(v.id("users")),
    })),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check admin permissions
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const admin = await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!admin || !admin.permissions.includes("view_feedback")) {
      throw new Error("Unauthorized - Admin access required");
    }

    // Fetch feedback with filters
    let query = ctx.db.query("proactiveFeedbackLabels");

    if (args.filters?.startDate) {
      query = query.filter((q) =>
        q.gte(q.field("createdAt"), args.filters!.startDate!)
      );
    }

    if (args.filters?.detectorName) {
      query = query.filter((q) =>
        q.eq(
          q.field("contextSnapshot.detectorName"),
          args.filters!.detectorName!
        )
      );
    }

    const feedback = await query
      .order("desc")
      .take(args.limit || 100);

    // Aggregate stats
    const stats = {
      total: feedback.length,
      useful: feedback.filter((f) => f.feedbackType === "useful").length,
      notUseful: feedback.filter((f) => f.feedbackType === "not_useful")
        .length,
      byDetector: this.aggregateByDetector(feedback),
      topComplaints: this.getTopComplaints(feedback),
    };

    return {
      feedback,
      stats,
      pagination: {
        offset: args.offset || 0,
        limit: args.limit || 100,
        total: feedback.length,
      },
    };
  },
});

export const getDetectorPerformance = query({
  args: {
    detectorName: v.optional(v.string()),
    timeRange: v.optional(v.number()), // ms
  },
  handler: async (ctx, args) => {
    // Check admin permissions
    await this.checkAdminPermission(ctx, "view_analytics");

    const runs = await ctx.db
      .query("detectorRuns")
      .filter((q) =>
        args.detectorName
          ? q.eq(q.field("detectorName"), args.detectorName)
          : true
      )
      .collect();

    return {
      totalRuns: runs.length,
      successRate: runs.filter((r) => r.status === "completed").length / runs.length,
      avgDurationMs: runs.reduce((sum, r) => sum + r.durationMs, 0) / runs.length,
      avgOpportunitiesPerRun: runs.reduce((sum, r) => sum + r.opportunitiesCreated, 0) / runs.length,
      totalCost: runs.reduce((sum, r) => sum + (r.costUsd || 0), 0),
    };
  },
});
```

---

## 3. Free vs Paid Tier Differentiation

### 3.1 Feature Matrix

| Feature | Free Tier | Paid Tier ($29/mo) |
|---------|-----------|-------------------|
| **Pre-configured Detectors** | ✅ All 9 detectors | ✅ All detectors |
| **Custom Detectors** | ❌ | ✅ Unlimited |
| **Proactive Notifications** | 50/month | ✅ Unlimited |
| **Detector Templates** | ❌ | ✅ 20+ templates |
| **Priority Support** | ❌ | ✅ Email + Slack |
| **API Access** | ❌ | ✅ Full API |
| **Advanced Settings** | ❌ | ✅ Per-action permissions |
| **Feedback Analytics** | Personal only | ✅ Cross-user insights |
| **Export Data** | ❌ | ✅ CSV/JSON export |
| **Retention** | 30 days | 90 days |

### 3.2 Upgrade Prompts

**When user hits free tier limit:**

```
╔══════════════════════════════════════════════════════════════╗
║                  Proactive Limit Reached                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  You've used 50 of 50 proactive notifications this month.    ║
║                                                               ║
║  Upgrade to Paid to get:                                      ║
║  ✓ Unlimited proactive notifications                          ║
║  ✓ Custom detector builder                                    ║
║  ✓ 20+ detector templates                                     ║
║  ✓ Priority support                                           ║
║                                                               ║
║  $29/month • Cancel anytime                                   ║
║                                                               ║
║  [Upgrade Now] [Learn More] [Not Now]                        ║
║                                                               ║
║  Your notifications will resume on Feb 1 when your quota      ║
║  resets, or immediately if you upgrade.                       ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

**When user tries to create custom detector on free tier:**

```
╔══════════════════════════════════════════════════════════════╗
║              Custom Detectors - Premium Feature               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Create unlimited custom detectors with Paid tier.           ║
║                                                               ║
║  Examples of what you can build:                             ║
║  🚀 Alert when Series B funding announced                    ║
║  💬 Remind me to reach out every 30 days                     ║
║  📊 Weekly portfolio digest every Monday                     ║
║  👔 C-level departure alerts for watchlist                   ║
║                                                               ║
║  Plus 20+ pre-built templates to clone and customize.        ║
║                                                               ║
║  $29/month • Cancel anytime                                   ║
║                                                               ║
║  [Upgrade to Paid] [View Template Library] [Maybe Later]     ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### 3.3 Billing Implementation

**Schema addition:**

```typescript
// convex/schema.ts
const subscriptions = defineTable({
  userId: v.id("users"),
  tier: v.union(
    v.literal("free"),
    v.literal("paid"),
    v.literal("enterprise"),
  ),
  status: v.union(
    v.literal("active"),
    v.literal("cancelled"),
    v.literal("past_due"),
    v.literal("trialing"),
  ),
  stripeSubscriptionId: v.optional(v.string()),
  stripeCustomerId: v.optional(v.string()),
  currentPeriodStart: v.number(),
  currentPeriodEnd: v.number(),
  cancelAtPeriodEnd: v.boolean(),
  trialEndsAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_stripe_customer", ["stripeCustomerId"])
  .index("by_status", ["status"]);

const usageTracking = defineTable({
  userId: v.id("users"),
  month: v.string(),                      // "2026-01" format
  proactiveNotifications: v.number(),     // Count for the month
  customDetectorsUsed: v.number(),
  apiCallsMade: v.number(),
  lastResetAt: v.number(),
})
  .index("by_user_month", ["userId", "month"]);
```

---

## 4. Blanket Consent Flow

### 4.1 Onboarding with Blanket Consent

**Step 1: Welcome to Proactive NodeBench**

```
╔══════════════════════════════════════════════════════════════╗
║          Welcome to Proactive NodeBench! 🎉                   ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  NodeBench can now help you proactively by:                  ║
║                                                               ║
║  📅 Preparing for meetings ahead of time                     ║
║  ✉️  Reminding you about important follow-ups                ║
║  📰 Filtering news and surfacing what matters                ║
║  📝 Drafting emails and CRM updates                          ║
║  🚨 Alerting you to risks and opportunities                  ║
║                                                               ║
║  To do this, NodeBench needs access to:                      ║
║  • Your calendar (to detect upcoming meetings)               ║
║  • Your email (to suggest follow-ups)                        ║
║  • Your watchlist (to monitor entities you care about)       ║
║                                                               ║
║  [Continue] [Learn More]                                     ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

**Step 2: Terms & Privacy**

```
╔══════════════════════════════════════════════════════════════╗
║                  Terms & Privacy                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  By enabling Proactive NodeBench, you agree to:              ║
║                                                               ║
║  ✓ Allow NodeBench to access your calendar, email, and       ║
║    other connected data sources to provide proactive         ║
║    suggestions and automation.                               ║
║                                                               ║
║  ✓ Allow NodeBench to create drafts, documents, and tasks    ║
║    on your behalf (you can review before they're sent).      ║
║                                                               ║
║  ✓ Allow NodeBench to analyze your activity to improve       ║
║    suggestions over time.                                    ║
║                                                               ║
║  Your data privacy:                                           ║
║  • Your data is encrypted at rest and in transit             ║
║  • We never share your data with third parties               ║
║  • You can disable proactive features anytime                ║
║  • You can delete all proactive data with one click          ║
║                                                               ║
║  ☑ I agree to NodeBench's Terms of Service and Privacy      ║
║    Policy for proactive features                             ║
║                                                               ║
║  [Terms of Service] [Privacy Policy]                         ║
║                                                               ║
║  [Accept & Enable Proactive] [Decline]                       ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

**Step 3: Choose Your Experience**

```
╔══════════════════════════════════════════════════════════════╗
║              Choose Your Proactive Experience                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Select which proactive features you'd like to enable.       ║
║  You can always change these later in Settings.              ║
║                                                               ║
║  Recommended for you:                                         ║
║                                                               ║
║  ☑ Meeting Prep Packs                                        ║
║     Get briefed before every important meeting               ║
║                                                               ║
║  ☑ Follow-Up Reminders                                       ║
║     Never miss an important email again                      ║
║                                                               ║
║  ☑ Daily News Brief                                          ║
║     Cut through the noise, get what matters                  ║
║                                                               ║
║  Optional:                                                    ║
║                                                               ║
║  ☐ CRM Update Drafts                                         ║
║     Auto-draft meeting notes for your CRM                    ║
║     Requires: CRM integration                                ║
║                                                               ║
║  ☐ Email Auto-Filing                                         ║
║     Automatically organize your inbox                        ║
║     Requires: Gmail access                                    ║
║                                                               ║
║  [Select All] [Deselect All]                                 ║
║                                                               ║
║  [Continue] [Skip for Now]                                   ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

**Step 4: Set Your Preferences**

```
╔══════════════════════════════════════════════════════════════╗
║                  Set Your Preferences                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Quiet Hours                                                  ║
║  Don't notify me between:                                    ║
║  [10:00 PM ▼] and [7:00 AM ▼]                               ║
║  Timezone: [America/New_York ▼]                             ║
║                                                               ║
║  Rate Limit                                                   ║
║  Maximum notifications per day: [10 ▼]                       ║
║                                                               ║
║  Delivery Channel                                             ║
║  ◉ Slack DM (recommended)                                    ║
║  ○ Email digest                                              ║
║  ○ Both                                                      ║
║                                                               ║
║  [Save & Start] [Back]                                       ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

**Step 5: You're All Set!**

```
╔══════════════════════════════════════════════════════════════╗
║                    You're All Set! 🎉                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Proactive NodeBench is now enabled.                         ║
║                                                               ║
║  What happens next:                                           ║
║                                                               ║
║  1. I'll start monitoring your calendar and email            ║
║  2. If I find something helpful, I'll send you a Slack DM    ║
║  3. You can review, accept, or dismiss each suggestion       ║
║  4. Your feedback helps me learn and improve                 ║
║                                                               ║
║  You can adjust settings anytime in Settings → Proactive     ║
║                                                               ║
║  [Go to Dashboard] [View Settings]                           ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 4.2 Consent Schema

```typescript
// convex/schema.ts
const userConsents = defineTable({
  userId: v.id("users"),
  consentType: v.literal("proactive_features"),
  granted: v.boolean(),
  grantedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
  ipAddress: v.optional(v.string()),      // For audit
  userAgent: v.optional(v.string()),      // For audit
  version: v.string(),                    // Terms version accepted
})
  .index("by_user", ["userId"])
  .index("by_user_type", ["userId", "consentType"]);
```

---

## 5. Compliance Retention Policy

### 5.1 Data Retention Classes

**Minimum retention for compliance: 90 days**

```typescript
// convex/config/retentionPolicy.ts

export const RETENTION_POLICY = {
  // Events
  events: {
    transient: 7 * 24 * 60 * 60 * 1000,     // 7 days (web scraping, RSS)
    standard: 90 * 24 * 60 * 60 * 1000,     // 90 days (emails, calendar)
    extended: 365 * 24 * 60 * 60 * 1000,    // 365 days (important meetings)
    permanent: null,                         // Never delete (compliance)
  },

  // Opportunities
  opportunities: {
    completed: 90 * 24 * 60 * 60 * 1000,    // 90 days after completion
    dismissed: 30 * 24 * 60 * 60 * 1000,    // 30 days after dismissal
    expired: 7 * 24 * 60 * 60 * 1000,       // 7 days after expiration
  },

  // Actions
  proactiveActions: {
    completed: 90 * 24 * 60 * 60 * 1000,    // 90 days (compliance)
    failed: 30 * 24 * 60 * 60 * 1000,       // 30 days
    cancelled: 30 * 24 * 60 * 60 * 1000,    // 30 days
  },

  // Feedback (keep indefinitely for learning, anonymize after 90 days)
  feedback: {
    identified: 90 * 24 * 60 * 60 * 1000,   // 90 days with user ID
    anonymized: null,                        // Keep forever (anonymized)
  },

  // Detector runs (performance monitoring)
  detectorRuns: {
    default: 30 * 24 * 60 * 60 * 1000,      // 30 days
  },
};
```

### 5.2 Anonymization After Retention

```typescript
// convex/crons/anonymizeFeedback.ts

export const anonymizeOldFeedback = internalMutation({
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    const oldFeedback = await ctx.db
      .query("proactiveFeedbackLabels")
      .filter((q) =>
        q.and(
          q.lt(q.field("createdAt"), ninetyDaysAgo),
          q.eq(q.field("reviewed"), false),    // Not yet anonymized
        )
      )
      .collect();

    for (const feedback of oldFeedback) {
      // Anonymize: Remove user ID, keep aggregated data
      await ctx.db.patch(feedback._id, {
        userId: "anonymized" as any,          // Remove PII
        reviewed: true,                        // Mark as anonymized
        reviewedAt: Date.now(),
      });
    }

    console.log(`Anonymized ${oldFeedback.length} feedback entries`);
  },
});
```

### 5.3 User Data Deletion

**One-click delete all proactive data:**

```typescript
// convex/domains/proactive/mutations.ts

export const deleteAllProactiveData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getSafeUserId(ctx);

    // Delete all events
    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("actor.userId"), userId))
      .collect();
    for (const event of events) {
      // Also delete linked artifacts
      if (event.contentPointer) {
        await ctx.db.delete(event.contentPointer);
      }
      await ctx.db.delete(event._id);
    }

    // Delete all opportunities
    const opportunities = await ctx.db
      .query("opportunities")
      .filter((q) => q.eq(q.field("trigger.userId"), userId))
      .collect();
    for (const opp of opportunities) {
      await ctx.db.delete(opp._id);
    }

    // Delete all actions
    const actions = await ctx.db
      .query("proactiveActions")
      .filter((q) => q.eq(q.field("target.userId"), userId))
      .collect();
    for (const action of actions) {
      await ctx.db.delete(action._id);
    }

    // Anonymize feedback (keep for learning)
    const feedback = await ctx.db
      .query("proactiveFeedbackLabels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const fb of feedback) {
      await ctx.db.patch(fb._id, {
        userId: "anonymized" as any,
        reviewed: true,
      });
    }

    // Delete custom detectors
    const detectors = await ctx.db
      .query("customDetectors")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const detector of detectors) {
      await ctx.db.delete(detector._id);
    }

    console.log(`Deleted all proactive data for user ${userId}`);
  },
});
```

**UI in settings:**

```
╔══════════════════════════════════════════════════════════════╗
║                  Delete Proactive Data                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ⚠️  Warning: This will permanently delete:                  ║
║                                                               ║
║  • All proactive events and opportunities                    ║
║  • All proactive actions and drafts                          ║
║  • All custom detectors you created                          ║
║  • Your proactive settings and preferences                   ║
║                                                               ║
║  Feedback data will be anonymized (not deleted) to help      ║
║  improve NodeBench for others.                               ║
║                                                               ║
║  This action cannot be undone.                               ║
║                                                               ║
║  [Delete All Proactive Data] [Cancel]                        ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 6. Implementation Checklist (Updated)

### Week 1: Foundation + Meeting Prep + Custom Detector Schema

**Day 1-2:**
- [x] Add 6 base tables (events, opportunities, actions, settings, feedback, detectorRuns)
- [ ] Add customDetectors table
- [ ] Add adminUsers table
- [ ] Add subscriptions table
- [ ] Add usageTracking table
- [ ] Add userConsents table
- [ ] Deploy schema changes

**Day 3-4:**
- [ ] Implement blanket consent flow (5-step onboarding)
- [ ] Email → Event adapter
- [ ] Calendar → Event adapter
- [ ] Cron jobs for polling
- [ ] Usage tracking middleware

**Day 5-7:**
- [ ] Meeting Prep Detector implementation
- [ ] Policy gateway with tier checks
- [ ] Slack delivery channel
- [ ] Free tier quota enforcement
- [ ] **Deliverable**: End-to-end meeting prep working with tier checks

### Week 2: Follow-Up Drafts + Feedback + Admin Dashboard

**Day 8-9:**
- [ ] Follow-Up Detector
- [ ] Email draft generation
- [ ] Gmail draft creation API

**Day 10-11:**
- [ ] Feedback collection (Slack buttons)
- [ ] Feedback mutations (create, update)
- [ ] Admin permission checks
- [ ] Admin feedback dashboard UI

**Day 12-13:**
- [ ] Admin analytics queries
- [ ] Admin user management UI
- [ ] Export feedback to CSV
- [ ] Feedback anonymization cron

**Day 14:**
- [ ] End-to-end testing (free + paid tier)
- [ ] Admin dashboard testing
- [ ] SLO monitoring dashboard
- [ ] **Deliverable**: Production-ready MVP with admin tools

### Week 3: Custom Detector Builder (Premium)

**Day 15-17:**
- [ ] Custom detector builder UI
- [ ] Detector template library
- [ ] Custom detector execution engine
- [ ] Test detector functionality

**Day 18-19:**
- [ ] Upgrade prompts and paywalls
- [ ] Stripe integration for paid tier
- [ ] Billing dashboard

**Day 20-21:**
- [ ] Custom detector analytics
- [ ] Template gallery UI
- [ ] Clone template functionality
- [ ] **Deliverable**: Full custom detector builder launched

---

## 7. Updated Success Metrics

### Free Tier Success (30 days)

| Metric | Target |
|--------|--------|
| Free tier adoption | 60% of new users enable proactive |
| Upgrade rate | 15% of free users upgrade to paid |
| Free tier retention | 70% still active after 30 days |
| Useful rate (free) | > 50% thumbs up |
| False positive (free) | < 15% rejection |

### Paid Tier Success (30 days)

| Metric | Target |
|--------|--------|
| Custom detector usage | 80% of paid users create ≥1 custom detector |
| Template adoption | 60% of paid users clone ≥1 template |
| Paid tier retention | 85% still active after 30 days |
| Useful rate (paid) | > 65% thumbs up |
| False positive (paid) | < 10% rejection |

### Admin Dashboard Success

| Metric | Target |
|--------|--------|
| Admin usage | Check dashboard 3x/week |
| Issue resolution | Respond to complaints within 24 hours |
| Detector tuning | Adjust thresholds based on feedback weekly |

---

## Summary of Changes

✅ **Custom Detectors**: Premium feature with builder UI, template library, and execution engine
✅ **Free vs Paid**: Clear differentiation with 50/month notification limit on free tier
✅ **Admin Dashboard**: Invite-only feedback viewer for hshum2018@gmail.com and test accounts
✅ **Blanket Consent**: Single consent flow on onboarding (not per-feature)
✅ **Retention Policy**: 90-day minimum for compliance, anonymization after retention period
✅ **Proactive Feed**: Both in-app and Slack/email delivery
✅ **Trial Period**: Default free tier features (no special trial mode)

---

**Document Status:** Updated v1.1
**Last Updated:** 2026-01-21
**Approved By:** Product Owner
**Next Steps:** Review with stakeholders, begin Week 1 implementation
