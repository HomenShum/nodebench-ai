# NodeBench Proactive System - Technical Design

**Version:** 1.0
**Date:** 2026-01-21
**Status:** Design Phase

---

## Executive Summary

This document specifies the technical architecture for evolving NodeBench from **reactive** (chatbot) to **proactive** (value-creating). The system will deliver unprompted, high-signal actions that improve outcomes for users while maintaining safety, controllability, and auditability.

**Core Equation:** `Proactive = Trigger + Hypothesis + Evidence + Action + Audit + Feedback`

---

## 1. System Architecture Overview

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EVENT INGESTION LAYER                         │
│  Slack  │  Gmail  │  Calendar  │  Web/News  │  Voice/Text Capture  │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   UNIFIED EVENT BUS (events table)                   │
│  • Normalized schema   • Entity extraction   • PII classification   │
│  • Content pointers    • Confidence scoring  • Retention policies   │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PROACTIVE REASONING LAYER                         │
│                         (Detectors)                                  │
│  Meeting Prep  │  Follow-ups  │  Risk Alerts  │  Research Gaps      │
│  CRM Updates   │  Duplicates  │  Escalations  │  ...                │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              OPPORTUNITIES TABLE (detector output)                   │
│  • Type + whyNow   • Evidence pointers   • Impact estimate          │
│  • Recommended actions   • Risk level    • Status tracking          │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      POLICY GATEWAY                                  │
│  • Action risk assessment   • User settings check                   │
│  • Approval requirements    • Rate limiting                         │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ACTION LAYER                                  │
│  Suggest (read-only)  │  Draft (staging)  │  Execute (write)        │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DELIVERY CHANNELS                                 │
│  Slack DMs  │  Email Drafts  │  Ntfy  │  UI Notifications          │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   FEEDBACK + LEARNING LOOPS                          │
│  • User feedback (accept/reject/ignore + reason)                    │
│  • Labeling queues   • Detector calibration   • SLO monitoring      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema Design

### 2.1 Events Table (Unified Event Bus)

**Purpose:** Single source of truth for all activity signals entering the system.

```typescript
// convex/schema.ts
const events = defineTable({
  // Event metadata
  eventId: v.string(),                    // UUID for idempotency
  timestamp: v.number(),                  // When event occurred (ms)
  eventType: v.union(
    v.literal("slack_message"),
    v.literal("slack_mention"),
    v.literal("slack_reaction"),
    v.literal("email_received"),
    v.literal("email_sent"),
    v.literal("calendar_event_created"),
    v.literal("calendar_event_updated"),
    v.literal("meeting_started"),
    v.literal("meeting_ended"),
    v.literal("web_article_discovered"),
    v.literal("voice_capture"),
    v.literal("text_capture"),
    v.literal("photo_capture"),
  ),

  // Source information
  source: v.string(),                     // "slack" | "gmail" | "calendar" | "web" | "capture"
  sourceId: v.string(),                   // External ID (Slack msg ID, Gmail thread ID, etc.)
  sourceUrl: v.optional(v.string()),      // Deep link if available

  // Actor
  actor: v.optional(v.object({
    userId: v.optional(v.id("users")),    // Internal user ID if known
    email: v.optional(v.string()),        // Email address
    name: v.optional(v.string()),         // Display name
    externalId: v.optional(v.string()),   // External ID (Slack user ID, etc.)
  })),

  // Content (stored as pointer to artifact)
  contentPointer: v.optional(v.id("sourceArtifacts")),  // Points to full content
  contentHash: v.string(),                // SHA-256 for deduplication
  summary: v.optional(v.string()),        // Brief preview (max 500 chars)

  // Extracted entities
  entities: v.optional(v.array(v.object({
    entityId: v.string(),                 // Canonical entity ID
    entityType: v.string(),               // "person" | "company" | "topic" | "product"
    entityName: v.string(),               // Display name
    confidence: v.number(),               // 0-1 extraction confidence
    mentionContext: v.optional(v.string()), // Surrounding text snippet
  }))),

  // Sensitivity & compliance
  sensitivity: v.object({
    hasPII: v.boolean(),                  // Contains personal identifiable info
    hasFinancial: v.boolean(),            // Contains financial data
    hasConfidential: v.boolean(),         // Marked confidential
    retentionClass: v.union(
      v.literal("transient"),             // 7 days
      v.literal("standard"),              // 90 days
      v.literal("extended"),              // 365 days
      v.literal("permanent"),             // No expiry
    ),
  }),

  // Processing status
  processingStatus: v.union(
    v.literal("pending"),                 // Not yet processed
    v.literal("processing"),              // Being processed by detectors
    v.literal("processed"),               // All detectors ran
    v.literal("failed"),                  // Processing error
    v.literal("skipped"),                 // Filtered/deduplicated
  ),
  processedAt: v.optional(v.number()),

  // Confidence & quality
  extractionConfidence: v.optional(v.number()), // 0-1 overall confidence
  sourceQuality: v.optional(v.union(
    v.literal("high"),                    // Verified source
    v.literal("medium"),                  // Known source
    v.literal("low"),                     // Unverified source
  )),

  // Metadata
  metadata: v.optional(v.any()),          // Source-specific metadata
  expiresAt: v.optional(v.number()),      // Deletion timestamp

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_timestamp", ["timestamp"])
  .index("by_eventType", ["eventType", "timestamp"])
  .index("by_source", ["source", "timestamp"])
  .index("by_contentHash", ["contentHash"])
  .index("by_status", ["processingStatus", "createdAt"])
  .index("by_actor", ["actor.email", "timestamp"])
  .index("by_expires", ["expiresAt"]);
```

**Key Design Decisions:**

1. **Content as pointer**: Large blobs (email bodies, Slack threads) stored in `sourceArtifacts`, events store only pointers
2. **Entity extraction at ingestion**: NER runs once at event creation
3. **PII classification**: Required for compliance, determines retention
4. **Idempotency**: `eventId` + `contentHash` prevent duplicates
5. **TTL via expiresAt**: Automatic cleanup based on retention class

---

### 2.2 Opportunities Table (Detector Output)

**Purpose:** Store detected opportunities before they become actions.

```typescript
// convex/schema.ts
const opportunities = defineTable({
  // Opportunity identity
  opportunityId: v.string(),              // UUID
  type: v.union(
    v.literal("meeting_prep"),            // Prepare for upcoming meeting
    v.literal("follow_up"),               // Send follow-up message
    v.literal("risk_alert"),              // Risk detected, needs escalation
    v.literal("duplicate_update"),        // Duplicate entities found
    v.literal("research_gap"),            // Missing information detected
    v.literal("crm_update"),              // Update CRM record
    v.literal("relationship_nudge"),      // Haven't talked in X days
    v.literal("task_reminder"),           // Overdue task detected
  ),

  // Trigger explanation
  trigger: v.object({
    eventIds: v.array(v.id("events")),    // Events that triggered this
    triggerType: v.string(),              // "calendar_proximity" | "time_based" | "threshold_breach"
    whyNow: v.string(),                   // Human-readable explanation (max 200 chars)
    detectorName: v.string(),             // Which detector created this
    detectorVersion: v.string(),          // Detector version for A/B testing
  }),

  // Evidence
  evidencePointers: v.array(v.object({
    artifactId: v.id("sourceArtifacts"),  // Source artifact
    excerpt: v.optional(v.string()),      // Relevant excerpt (max 500 chars)
    excerptHash: v.optional(v.string()),  // Hash for dedup
    relevanceScore: v.optional(v.number()), // 0-1 how relevant this evidence is
  })),

  // Impact assessment
  impactEstimate: v.object({
    timeSavedMinutes: v.optional(v.number()),  // Est. time saved
    riskReduced: v.optional(v.union(           // Risk mitigation
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
    )),
    revenueUpside: v.optional(v.number()),     // Est. revenue impact (USD)
    confidenceLevel: v.number(),               // 0-1 how confident we are
  }),

  // Recommended actions
  recommendedActions: v.array(v.object({
    actionType: v.string(),               // "send_email" | "create_task" | "update_crm"
    description: v.string(),              // What to do
    priority: v.number(),                 // 1-5 (1=highest)
    estimatedEffort: v.optional(v.string()), // "2 min" | "5 min" | "10 min"
  })),

  // Risk assessment
  riskLevel: v.union(
    v.literal("low"),                     // Safe to auto-execute
    v.literal("medium"),                  // Draft only
    v.literal("high"),                    // Suggest only
  ),
  riskRationale: v.string(),              // Why this risk level (max 300 chars)

  // Entities involved
  primaryEntity: v.optional(v.object({
    entityId: v.string(),
    entityType: v.string(),
    entityName: v.string(),
  })),
  relatedEntities: v.optional(v.array(v.object({
    entityId: v.string(),
    entityType: v.string(),
    entityName: v.string(),
  }))),

  // Status tracking
  status: v.union(
    v.literal("detected"),                // Just created
    v.literal("evaluating"),              // Policy gateway checking
    v.literal("approved"),                // Ready for action
    v.literal("rejected"),                // Policy/user rejected
    v.literal("actioned"),                // Action created
    v.literal("completed"),               // User completed action
    v.literal("dismissed"),               // User dismissed
    v.literal("expired"),                 // Window passed
  ),

  // Policy evaluation
  policyResult: v.optional(v.object({
    allowed: v.boolean(),
    requiresApproval: v.boolean(),
    blockedReasons: v.optional(v.array(v.string())),
    evaluatedAt: v.number(),
  })),

  // User interaction
  userFeedback: v.optional(v.object({
    reaction: v.union(
      v.literal("accepted"),              // User took action
      v.literal("rejected"),              // User dismissed with reason
      v.literal("ignored"),               // User didn't respond
      v.literal("useful"),                // Marked as helpful
      v.literal("not_useful"),            // Marked as not helpful
    ),
    reason: v.optional(v.string()),       // Why rejected/not useful
    feedbackAt: v.number(),
  })),

  // Delivery tracking
  deliveredVia: v.optional(v.array(v.object({
    channel: v.string(),                  // "slack" | "email" | "ntfy" | "ui"
    messageId: v.optional(v.string()),    // External message ID
    deliveredAt: v.number(),
  }))),

  // Expiration
  expiresAt: v.optional(v.number()),      // When opportunity is no longer valid

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  actionedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
})
  .index("by_type", ["type", "createdAt"])
  .index("by_status", ["status", "createdAt"])
  .index("by_risk", ["riskLevel", "status"])
  .index("by_entity", ["primaryEntity.entityId"])
  .index("by_detector", ["trigger.detectorName", "createdAt"])
  .index("by_expires", ["expiresAt"])
  .index("by_status_expires", ["status", "expiresAt"]);
```

---

### 2.3 Actions Table (Execution Tracking)

**Purpose:** Track all proactive actions from suggestion to execution.

```typescript
// convex/schema.ts
const proactiveActions = defineTable({
  // Action identity
  actionId: v.string(),                   // UUID
  opportunityId: v.id("opportunities"),   // Source opportunity

  // Action type
  actionType: v.union(
    v.literal("send_email"),
    v.literal("draft_email"),
    v.literal("create_task"),
    v.literal("update_crm"),
    v.literal("schedule_meeting"),
    v.literal("send_slack_message"),
    v.literal("create_document"),
    v.literal("add_calendar_block"),
  ),

  // Action mode
  mode: v.union(
    v.literal("suggest"),                 // Read-only suggestion
    v.literal("draft"),                   // Write to staging
    v.literal("execute"),                 // Actually do it
  ),

  // Action payload
  payload: v.any(),                       // Action-specific data

  // Target
  target: v.optional(v.object({
    userId: v.optional(v.id("users")),    // Internal user
    email: v.optional(v.string()),        // Email address
    slackUserId: v.optional(v.string()),  // Slack user
    crmRecordId: v.optional(v.string()),  // CRM record
  })),

  // Status
  status: v.union(
    v.literal("pending"),                 // Waiting for approval
    v.literal("approved"),                // User approved
    v.literal("executing"),               // In progress
    v.literal("completed"),               // Done
    v.literal("failed"),                  // Error
    v.literal("rejected"),                // User rejected
    v.literal("cancelled"),               // System cancelled
  ),

  // Execution result
  result: v.optional(v.object({
    success: v.boolean(),
    externalId: v.optional(v.string()),   // ID from external system
    error: v.optional(v.string()),
    executedAt: v.number(),
  })),

  // Approval tracking
  approval: v.optional(v.object({
    required: v.boolean(),
    approver: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    method: v.optional(v.string()),       // "slack_button" | "email_link" | "ui_click"
  })),

  // Audit trail
  auditLog: v.array(v.object({
    timestamp: v.number(),
    event: v.string(),                    // "created" | "approved" | "executed" | "failed"
    actor: v.optional(v.string()),        // Who/what caused this
    details: v.optional(v.string()),
  })),

  // Rollback capability
  rollbackData: v.optional(v.any()),      // Data needed to undo this action
  rolledBack: v.optional(v.boolean()),
  rolledBackAt: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_opportunity", ["opportunityId"])
  .index("by_status", ["status", "createdAt"])
  .index("by_type", ["actionType", "status"])
  .index("by_mode", ["mode", "createdAt"]);
```

---

### 2.4 Detector Runs Table (Observability)

**Purpose:** Track detector executions for debugging and optimization.

```typescript
// convex/schema.ts
const detectorRuns = defineTable({
  // Run identity
  runId: v.string(),                      // UUID
  detectorName: v.string(),               // "meeting_prep_detector"
  detectorVersion: v.string(),            // For A/B testing

  // Input
  triggerType: v.union(
    v.literal("event"),                   // Triggered by single event
    v.literal("batch"),                   // Batch processing (cron)
    v.literal("manual"),                  // Manual trigger
  ),
  eventIds: v.optional(v.array(v.id("events"))), // Events processed
  batchSize: v.optional(v.number()),      // For batch runs

  // Output
  opportunitiesCreated: v.number(),       // Count of opportunities created
  opportunityIds: v.array(v.id("opportunities")),

  // Performance
  durationMs: v.number(),
  tokensUsed: v.optional(v.number()),     // If LLM was used
  costUsd: v.optional(v.number()),

  // Status
  status: v.union(
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  error: v.optional(v.string()),

  // Timestamps
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_detector", ["detectorName", "startedAt"])
  .index("by_status", ["status", "startedAt"]);
```

---

### 2.5 User Proactive Settings Table

**Purpose:** Per-user configuration for proactive features.

```typescript
// convex/schema.ts
const userProactiveSettings = defineTable({
  userId: v.id("users"),

  // Global toggle
  proactiveEnabled: v.boolean(),          // Master on/off switch

  // Feature-level toggles
  features: v.object({
    meetingPrep: v.boolean(),
    followUpNudges: v.boolean(),
    riskAlerts: v.boolean(),
    crmUpdates: v.boolean(),
    emailDrafts: v.boolean(),
    taskReminders: v.boolean(),
  }),

  // Execution policies
  policies: v.object({
    // What modes are allowed per action type
    allowedModes: v.object({
      send_email: v.array(v.string()),    // e.g., ["suggest", "draft"]
      create_task: v.array(v.string()),   // e.g., ["execute"]
      update_crm: v.array(v.string()),
      // ... more action types
    }),

    // Auto-approve thresholds
    autoApproveRiskLevel: v.union(
      v.literal("low"),                   // Auto-approve low risk only
      v.literal("medium"),                // Auto-approve low + medium
      v.literal("never"),                 // Never auto-approve
    ),
  }),

  // Delivery preferences
  delivery: v.object({
    preferredChannels: v.array(v.string()), // ["slack", "ntfy"]
    quietHours: v.optional(v.object({
      enabled: v.boolean(),
      start: v.string(),                  // "22:00"
      end: v.string(),                    // "07:00"
      timezone: v.string(),               // "America/New_York"
    })),
    maxDailyNotifications: v.number(),    // Rate limit
  }),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"]);
```

---

### 2.6 Feedback Labels Table

**Purpose:** Collect labeled feedback for detector calibration.

```typescript
// convex/schema.ts
const proactiveFeedbackLabels = defineTable({
  // Label identity
  labelId: v.string(),                    // UUID
  opportunityId: v.id("opportunities"),
  userId: v.id("users"),

  // Feedback type
  feedbackType: v.union(
    v.literal("useful"),
    v.literal("not_useful"),
    v.literal("wrong"),
    v.literal("timing_bad"),              // Right idea, wrong time
    v.literal("too_frequent"),            // Too many similar
    v.literal("missing_context"),         // Needed more info
  ),

  // Detailed feedback
  reason: v.optional(v.string()),         // Free text explanation
  specificIssues: v.optional(v.array(v.string())), // Checkboxes

  // Context at time of feedback
  contextSnapshot: v.optional(v.object({
    opportunityType: v.string(),
    riskLevel: v.string(),
    detectorName: v.string(),
    detectorVersion: v.string(),
  })),

  // Labeling status
  reviewed: v.boolean(),                  // Has ML team reviewed?
  reviewedAt: v.optional(v.number()),
  reviewNotes: v.optional(v.string()),

  // Timestamps
  createdAt: v.number(),
})
  .index("by_opportunity", ["opportunityId"])
  .index("by_user", ["userId", "createdAt"])
  .index("by_type", ["feedbackType", "createdAt"])
  .index("by_detector", ["contextSnapshot.detectorName", "feedbackType"])
  .index("by_reviewed", ["reviewed", "createdAt"]);
```

---

## 3. Detector Framework

### 3.1 Detector Interface

All detectors implement this interface:

```typescript
// convex/domains/proactive/detectors/types.ts

export interface DetectorInput {
  // For event-triggered detectors
  event?: EventDoc;

  // For batch detectors
  events?: EventDoc[];

  // Shared context
  userId: Id<"users">;
  timestamp: number;
}

export interface DetectorOutput {
  opportunities: OpportunityCandidate[];
  metrics: {
    eventsProcessed: number;
    opportunitiesFound: number;
    durationMs: number;
    tokensUsed?: number;
  };
}

export interface OpportunityCandidate {
  type: OpportunityType;
  trigger: {
    eventIds: Id<"events">[];
    whyNow: string;
  };
  evidencePointers: EvidencePointer[];
  impactEstimate: ImpactEstimate;
  recommendedActions: RecommendedAction[];
  riskLevel: "low" | "medium" | "high";
  riskRationale: string;
  expiresAt?: number;
}
```

### 3.2 Detector Types

**1. Streaming Detectors** (per-event)

```typescript
// convex/domains/proactive/detectors/streamingDetector.ts

export abstract class StreamingDetector {
  abstract name: string;
  abstract version: string;

  // Process a single event
  abstract detect(input: DetectorInput): Promise<DetectorOutput>;

  // Should this detector run for this event?
  shouldProcess(event: EventDoc): boolean {
    return true; // Override in subclass
  }
}
```

**2. Batch Detectors** (scheduled)

```typescript
// convex/domains/proactive/detectors/batchDetector.ts

export abstract class BatchDetector {
  abstract name: string;
  abstract version: string;
  abstract schedule: string; // Cron expression

  // Process a batch of events or time window
  abstract detect(input: DetectorInput): Promise<DetectorOutput>;

  // Fetch events to process
  abstract fetchEvents(ctx: QueryCtx): Promise<EventDoc[]>;
}
```

### 3.3 Example Detector: Meeting Prep

```typescript
// convex/domains/proactive/detectors/meetingPrepDetector.ts

export class MeetingPrepDetector extends BatchDetector {
  name = "meeting_prep_detector";
  version = "1.0.0";
  schedule = "*/15 * * * *"; // Every 15 minutes

  async fetchEvents(ctx: QueryCtx): Promise<EventDoc[]> {
    // Find calendar events in next 2-24 hours
    const now = Date.now();
    const windowStart = now + 2 * 60 * 60 * 1000;  // 2 hours from now
    const windowEnd = now + 24 * 60 * 60 * 1000;    // 24 hours from now

    return await ctx.db
      .query("events")
      .withIndex("by_eventType", (q) =>
        q.eq("eventType", "calendar_event_created")
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("metadata.startTime"), windowStart),
          q.lte(q.field("metadata.startTime"), windowEnd),
          q.eq(q.field("processingStatus"), "pending")
        )
      )
      .collect();
  }

  async detect(input: DetectorInput): Promise<DetectorOutput> {
    const opportunities: OpportunityCandidate[] = [];

    for (const event of input.events || []) {
      // Extract meeting details
      const { attendees, subject, startTime } = event.metadata;

      // Skip 1:1s with known people (low value)
      if (attendees.length <= 2) {
        continue;
      }

      // Check if we have dossiers for attendees
      const missingDossiers = await this.findMissingDossiers(
        ctx,
        attendees
      );

      if (missingDossiers.length === 0) {
        continue; // Already prepared
      }

      // Create opportunity
      opportunities.push({
        type: "meeting_prep",
        trigger: {
          eventIds: [event._id],
          whyNow: `Meeting in ${this.formatTimeUntil(startTime)}`,
        },
        evidencePointers: [
          {
            artifactId: event.contentPointer,
            excerpt: `${subject} with ${attendees.join(", ")}`,
          },
        ],
        impactEstimate: {
          timeSavedMinutes: 15,
          confidenceLevel: 0.8,
        },
        recommendedActions: [
          {
            actionType: "create_document",
            description: `Create meeting prep doc with dossiers for ${missingDossiers.join(", ")}`,
            priority: 1,
          },
        ],
        riskLevel: "low",
        riskRationale: "Read-only research, no external communication",
        expiresAt: startTime,
      });
    }

    return {
      opportunities,
      metrics: {
        eventsProcessed: input.events?.length || 0,
        opportunitiesFound: opportunities.length,
        durationMs: 0, // Calculate actual
      },
    };
  }
}
```

---

## 4. Policy Gateway

### 4.1 Policy Evaluation

```typescript
// convex/domains/proactive/policyGateway.ts

export interface PolicyEvaluationResult {
  allowed: boolean;
  requiresApproval: boolean;
  blockedReasons: string[];
  suggestedMode: "suggest" | "draft" | "execute";
}

export async function evaluatePolicy(
  ctx: QueryCtx,
  opportunity: OpportunityDoc,
  requestedMode: "suggest" | "draft" | "execute"
): Promise<PolicyEvaluationResult> {
  const userId = opportunity.trigger.userId;
  const settings = await ctx.db
    .query("userProactiveSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  const blockedReasons: string[] = [];

  // Check global toggle
  if (!settings?.proactiveEnabled) {
    return {
      allowed: false,
      requiresApproval: false,
      blockedReasons: ["Proactive features disabled"],
      suggestedMode: "suggest",
    };
  }

  // Check feature toggle
  const featureKey = this.getFeatureKey(opportunity.type);
  if (!settings.features[featureKey]) {
    blockedReasons.push(`Feature ${featureKey} disabled`);
  }

  // Check quiet hours
  if (this.isQuietHours(settings.delivery.quietHours)) {
    blockedReasons.push("Currently in quiet hours");
  }

  // Check rate limits
  const todayCount = await this.getTodayNotificationCount(ctx, userId);
  if (todayCount >= settings.delivery.maxDailyNotifications) {
    blockedReasons.push("Daily notification limit reached");
  }

  // Check mode permission
  const allowedModes = settings.policies.allowedModes[opportunity.type] || [];
  if (!allowedModes.includes(requestedMode)) {
    blockedReasons.push(`Mode ${requestedMode} not allowed for ${opportunity.type}`);
  }

  // Risk-based approval
  const requiresApproval = this.requiresApproval(
    opportunity.riskLevel,
    settings.policies.autoApproveRiskLevel,
    requestedMode
  );

  return {
    allowed: blockedReasons.length === 0,
    requiresApproval,
    blockedReasons,
    suggestedMode: this.suggestMode(opportunity, settings),
  };
}

function requiresApproval(
  riskLevel: "low" | "medium" | "high",
  autoApproveLevel: "low" | "medium" | "never",
  mode: string
): boolean {
  // Always require approval for execute mode on high risk
  if (riskLevel === "high" && mode === "execute") {
    return true;
  }

  // Check auto-approve settings
  if (autoApproveLevel === "never") {
    return true;
  }

  if (autoApproveLevel === "low" && riskLevel !== "low") {
    return true;
  }

  return false;
}
```

---

## 5. Delivery Channels

### 5.1 Slack Integration

```typescript
// convex/domains/proactive/delivery/slackDelivery.ts

export async function deliverToSlack(
  ctx: ActionCtx,
  opportunity: OpportunityDoc,
  actions: ProactiveActionDoc[]
): Promise<DeliveryResult> {
  const userId = opportunity.trigger.userId;
  const user = await ctx.runQuery(api.users.getUser, { userId });

  // Build interactive message
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `💡 ${this.getOpportunityTitle(opportunity)}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: opportunity.trigger.whyNow,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Impact:* ${this.formatImpact(opportunity.impactEstimate)}`,
        },
        {
          type: "mrkdwn",
          text: `*Risk:* ${opportunity.riskLevel}`,
        },
      ],
    },
  ];

  // Add action buttons
  const actionButtons = actions.map((action) => ({
    type: "button",
    text: {
      type: "plain_text",
      text: this.getActionLabel(action),
    },
    value: action.actionId,
    action_id: `approve_action_${action.actionId}`,
    style: action.mode === "execute" ? "primary" : undefined,
  }));

  blocks.push({
    type: "actions",
    elements: [
      ...actionButtons,
      {
        type: "button",
        text: { type: "plain_text", text: "Dismiss" },
        value: opportunity.opportunityId,
        action_id: `dismiss_opportunity_${opportunity.opportunityId}`,
        style: "danger",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "View Details" },
        value: opportunity.opportunityId,
        action_id: `view_details_${opportunity.opportunityId}`,
      },
    ],
  });

  // Send to Slack
  const result = await sendSlackDM(user.slackUserId, {
    blocks,
    text: opportunity.trigger.whyNow, // Fallback
  });

  return {
    success: result.ok,
    messageId: result.ts,
    error: result.error,
  };
}
```

### 5.2 Email Draft Creation

```typescript
// convex/domains/proactive/delivery/emailDraftDelivery.ts

export async function createEmailDraft(
  ctx: ActionCtx,
  opportunity: OpportunityDoc,
  action: ProactiveActionDoc
): Promise<DeliveryResult> {
  const payload = action.payload as EmailDraftPayload;

  // Create draft in Gmail via API
  const draft = await createGmailDraft({
    to: payload.to,
    subject: payload.subject,
    body: payload.body,
    threadId: payload.threadId, // Reply to existing thread if applicable
  });

  // Store reference
  await ctx.runMutation(api.proactive.mutations.updateActionResult, {
    actionId: action.actionId,
    result: {
      success: true,
      externalId: draft.id,
      executedAt: Date.now(),
    },
  });

  // Notify user via Slack
  await notifySlack(opportunity.trigger.userId, {
    text: `📧 I drafted an email for you: "${payload.subject}"`,
    actions: [
      { label: "Open Draft", url: draft.webLink },
      { label: "Send Now", actionId: `send_draft_${draft.id}` },
    ],
  });

  return {
    success: true,
    externalId: draft.id,
  };
}
```

---

## 6. Data Retention & Cleanup

### 6.1 Retention Policies

```typescript
// convex/crons/proactiveCleanup.ts

export const cleanupProactiveData = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Delete expired events
    const expiredEvents = await ctx.db
      .query("events")
      .withIndex("by_expires", (q) => q.lte("expiresAt", now))
      .collect();

    for (const event of expiredEvents) {
      // Also delete content artifact if not referenced elsewhere
      if (event.contentPointer) {
        await maybeDeleteArtifact(ctx, event.contentPointer);
      }
      await ctx.db.delete(event._id);
    }

    // 2. Delete old opportunities (30 days)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const oldOpportunities = await ctx.db
      .query("opportunities")
      .filter((q) => q.lt(q.field("createdAt"), thirtyDaysAgo))
      .collect();

    for (const opp of oldOpportunities) {
      await ctx.db.delete(opp._id);
    }

    // 3. Archive completed actions (90 days)
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
    const oldActions = await ctx.db
      .query("proactiveActions")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.lt(q.field("completedAt"), ninetyDaysAgo)
        )
      )
      .collect();

    for (const action of oldActions) {
      // Move to cold storage or delete
      await ctx.db.delete(action._id);
    }
  },
});
```

---

## 7. Observability & SLOs

### 7.1 Key Metrics

```typescript
// convex/domains/proactive/analytics/metrics.ts

export async function calculateProactiveSLOs(
  ctx: QueryCtx,
  timeWindow: number // ms
): Promise<ProactiveSLOs> {
  const windowStart = Date.now() - timeWindow;

  // Fetch all opportunities in window
  const opportunities = await ctx.db
    .query("opportunities")
    .filter((q) => q.gte(q.field("createdAt"), windowStart))
    .collect();

  // Calculate metrics
  const total = opportunities.length;
  const withFeedback = opportunities.filter((o) => o.userFeedback).length;
  const useful = opportunities.filter(
    (o) => o.userFeedback?.reaction === "useful"
  ).length;
  const ignored = opportunities.filter(
    (o) => o.userFeedback?.reaction === "ignored"
  ).length;
  const rejected = opportunities.filter(
    (o) => o.userFeedback?.reaction === "rejected"
  ).length;

  return {
    totalOpportunities: total,
    feedbackRate: withFeedback / total,
    usefulRate: useful / withFeedback,
    ignoreRate: ignored / total,
    rejectRate: rejected / total,
    falsePositiveRate: rejected / total, // Simplified
    avgTimeToSurface: this.calculateAvgLatency(opportunities),
    evidenceCoverageRate: this.calculateEvidenceCoverage(opportunities),
  };
}
```

### 7.2 Alerting Thresholds

```yaml
# SLO Targets
slos:
  false_positive_rate:
    target: < 0.10  # Less than 10% rejection rate
    warning: 0.05
    critical: 0.15

  useful_rate:
    target: > 0.50  # More than 50% marked useful
    warning: 0.40
    critical: 0.30

  time_to_surface:
    target: < 300000  # Less than 5 minutes
    warning: 600000   # 10 minutes
    critical: 1800000 # 30 minutes

  evidence_coverage:
    target: > 0.95  # 95% have evidence
    warning: 0.90
    critical: 0.80
```

---

## 8. Integration Points

### 8.1 Existing Systems

**1. Email System** (`emailThreads`, `emailMessages`)
- **Integration**: Create events from new threads, replies, unanswered threads
- **File**: `convex/domains/email/eventAdapter.ts`

**2. Calendar System** (`calendarArtifacts`)
- **Integration**: Create events from upcoming meetings, meeting completions
- **File**: `convex/domains/calendar/eventAdapter.ts`

**3. Research System** (`researchTasks`, `entityStates`)
- **Integration**: Create events from completed research, research gaps detected
- **File**: `convex/domains/research/eventAdapter.ts`

**4. Task Manager** (`agentTaskSessions`)
- **Integration**: Log proactive actions as task sessions for observability
- **File**: `convex/domains/proactive/taskManagerIntegration.ts`

### 8.2 Event Adapters Pattern

```typescript
// convex/domains/email/eventAdapter.ts

export async function emailToEvent(
  ctx: MutationCtx,
  thread: EmailThreadDoc
): Promise<Id<"events">> {
  // Extract entities from email
  const entities = await extractEntitiesFromEmail(ctx, thread);

  // Store content as artifact
  const artifactId = await ctx.db.insert("sourceArtifacts", {
    sourceType: "email_thread",
    sourceUrl: thread.gmailThreadId,
    contentHash: hashEmailThread(thread),
    rawContent: JSON.stringify(thread),
    mimeType: "application/json",
    fetchedAt: Date.now(),
  });

  // Create event
  return await ctx.db.insert("events", {
    eventId: `email:${thread.gmailThreadId}`,
    timestamp: thread.lastMessageAt,
    eventType: "email_received",
    source: "gmail",
    sourceId: thread.gmailThreadId,
    contentPointer: artifactId,
    contentHash: hashEmailThread(thread),
    summary: `${thread.subject} (${thread.messageCount} messages)`,
    entities,
    sensitivity: {
      hasPII: true, // Emails likely have PII
      hasFinancial: detectFinancialContent(thread),
      hasConfidential: thread.aiCategory === "confidential",
      retentionClass: "standard",
    },
    processingStatus: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}
```

---

## 9. Week 1-2 Implementation Checklist

### Week 1: Foundation + Meeting Prep

**Day 1-2: Schema & Event Bus**
- [ ] Add `events` table to schema
- [ ] Add `opportunities` table to schema
- [ ] Add `proactiveActions` table to schema
- [ ] Add `userProactiveSettings` table to schema
- [ ] Deploy schema changes

**Day 3-4: Email & Calendar Event Adapters**
- [ ] Implement `emailToEvent` adapter
- [ ] Implement `calendarToEvent` adapter
- [ ] Create cron to poll new emails → events
- [ ] Create cron to poll calendar changes → events

**Day 5-7: Meeting Prep Detector**
- [ ] Implement detector framework base classes
- [ ] Implement `MeetingPrepDetector`
- [ ] Implement policy gateway
- [ ] Implement Slack delivery channel
- [ ] Test end-to-end: calendar event → detector → opportunity → Slack DM

### Week 2: Follow-up Drafts + Feedback Loop

**Day 8-9: Follow-up Detector**
- [ ] Implement `FollowUpDetector` (email-based)
- [ ] Detect "needs reply" threads using heuristics
- [ ] Generate recommended email drafts

**Day 10-11: Email Draft Delivery**
- [ ] Implement Gmail draft creation via API
- [ ] Implement email draft delivery channel
- [ ] Add Slack notification for new drafts

**Day 12-13: Feedback Loop**
- [ ] Add `proactiveFeedbackLabels` table
- [ ] Implement Slack interactive buttons (Useful / Not Useful / Dismiss)
- [ ] Create feedback collection mutations
- [ ] Build feedback dashboard query

**Day 14: Testing & Polish**
- [ ] End-to-end test: email thread → detector → draft → Slack notification → user approves → draft created
- [ ] Set up SLO monitoring dashboard
- [ ] Document user settings and opt-out controls

---

## 10. File Structure

```
convex/
├── domains/
│   └── proactive/
│       ├── schema.ts                    # New tables
│       ├── types.ts                     # TypeScript types
│       ├── queries.ts                   # Event/opportunity queries
│       ├── mutations.ts                 # CRUD operations
│       │
│       ├── detectors/
│       │   ├── types.ts                 # Detector interfaces
│       │   ├── baseDetector.ts          # Base classes
│       │   ├── meetingPrepDetector.ts   # Meeting prep
│       │   ├── followUpDetector.ts      # Email follow-ups
│       │   ├── riskAlertDetector.ts     # Risk detection
│       │   └── index.ts                 # Detector registry
│       │
│       ├── policyGateway.ts             # Policy evaluation
│       │
│       ├── delivery/
│       │   ├── slackDelivery.ts         # Slack DM delivery
│       │   ├── emailDraftDelivery.ts    # Email draft creation
│       │   ├── ntfyDelivery.ts          # Ntfy notifications
│       │   └── index.ts                 # Delivery router
│       │
│       ├── adapters/
│       │   ├── emailEventAdapter.ts     # Email → Event
│       │   ├── calendarEventAdapter.ts  # Calendar → Event
│       │   ├── slackEventAdapter.ts     # Slack → Event
│       │   └── webEventAdapter.ts       # Web/news → Event
│       │
│       ├── analytics/
│       │   ├── metrics.ts               # SLO calculations
│       │   └── dashboards.ts            # Analytics queries
│       │
│       └── taskManagerIntegration.ts    # Log to Task Manager
│
├── crons/
│   ├── proactiveEventIngestion.ts       # Poll external sources
│   ├── proactiveDetectorRunner.ts       # Run batch detectors
│   └── proactiveCleanup.ts              # Data retention
│
└── actions/
    └── proactiveActions.ts              # Action execution

src/
└── features/
    └── proactive/
        ├── views/
        │   ├── ProactiveFeed.tsx        # Feed of opportunities
        │   └── ProactiveSettings.tsx    # User settings UI
        │
        └── components/
            ├── OpportunityCard.tsx      # Single opportunity
            ├── ActionButton.tsx         # Approve/reject buttons
            └── FeedbackModal.tsx        # Feedback collection
```

---

## 11. Security & Compliance

### 11.1 PII Handling

- **Email content**: Store only in `sourceArtifacts`, never in `events.summary`
- **Entity names**: Encrypted at rest, access-controlled
- **Retention**: Automatic deletion based on `sensitivity.retentionClass`

### 11.2 Approval Gates

- **High-risk actions**: Always require explicit approval
- **Write operations**: Default to draft mode
- **External communication**: Require approval unless user explicitly allows

### 11.3 Audit Trail

- Every action logs to `proactiveActions.auditLog`
- User can view all proactive activity in UI
- Export audit logs for compliance

---

## 12. Success Metrics (30-day targets)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Meeting Prep Adoption** | 60% of eligible meetings get prep packs | Track `opportunities` type=meeting_prep with status=completed |
| **Follow-up Completion** | 40% of suggested follow-ups get sent | Track `opportunities` type=follow_up with action executed |
| **False Positive Rate** | < 10% rejection rate | Track `userFeedback.reaction === "rejected"` / total |
| **Useful Rate** | > 50% marked useful | Track `userFeedback.reaction === "useful"` / total with feedback |
| **Time Saved** | 2 hours/week per user | Sum `impactEstimate.timeSavedMinutes` for completed opportunities |

---

## Next Steps

1. **Review & Approve** this technical design
2. **Create PRD** with user stories and acceptance criteria
3. **Week 1-2 Sprint Planning** with detailed task breakdown
4. **Prototype** meeting prep detector as proof of concept
5. **User Testing** with 5-10 internal users before broader rollout

---

**Document Status:** Draft v1.0
**Last Updated:** 2026-01-21
**Owner:** Engineering Team
**Reviewers:** Product, Design, Security, Compliance
