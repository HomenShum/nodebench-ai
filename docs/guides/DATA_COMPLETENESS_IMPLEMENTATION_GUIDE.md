# Data Completeness Implementation Guide 🚀

**Date**: 2026-01-21
**Phase**: P0 - Critical Feedback Loops
**Status**: ✅ Schema & Functions Complete

---

## Overview

This guide explains how to integrate the new data completeness features into your application. These features close critical feedback loops and enable measurement of system effectiveness.

### What Was Implemented

#### **P0 Tables (Critical - Implemented)**
1. ✅ `dailyReportComponentMetrics` - Analytics component breakdown
2. ✅ `recommendationOutcomes` - Recommendation feedback loop
3. ✅ `humanDecisions` - HITL decision tracking

#### **P1 Tables (Compliance - Implemented)**
4. ✅ `adminAuditLog` - Admin action audit trail
5. ✅ `personaChangeLog` - Persona configuration versioning
6. ✅ `verificationSloMetrics` - Verification accuracy metrics

#### **Schema Enhancements (Implemented)**
7. ✅ Enhanced `useOfProceeds` to support structured allocation breakdown

---

## Schema Changes

### New Tables Added to `convex/schema.ts`

All tables are automatically included in the schema export. No manual export updates needed.

```typescript
// Line 9883+ in schema.ts
dailyReportComponentMetrics: defineTable({ ... })
recommendationOutcomes: defineTable({ ... })
humanDecisions: defineTable({ ... })
adminAuditLog: defineTable({ ... })
personaChangeLog: defineTable({ ... })
verificationSloMetrics: defineTable({ ... })
```

### Enhanced Field

```typescript
// Line 5329+ in schema.ts - fundingEvents table
useOfProceeds: v.optional(
  v.union(
    v.string(),  // Legacy format
    v.object({   // NEW: Structured format
      categories: v.array(v.object({
        category: v.string(),
        percentage: v.optional(v.number()),
        amount: v.optional(v.number()),
        description: v.optional(v.string()),
      })),
      milestones: v.optional(v.array(v.object({
        milestone: v.string(),
        fundingTranche: v.optional(v.number()),
        targetDate: v.optional(v.string()),
        description: v.optional(v.string()),
      }))),
      source: v.union(
        v.literal("SEC filing"),
        v.literal("press release"),
        v.literal("company statement"),
        v.literal("inferred"),
        v.literal("unknown")
      ),
      confidence: v.number(),
      summary: v.optional(v.string()),
    })
  )
),
```

---

## Integration Guide

### 1. Analytics Component Metrics

**Location**: `convex/domains/analytics/componentMetrics.ts`

#### When to Use
Call this when generating any report (daily brief, weekly digest, etc.) to track per-component performance.

#### Example Integration

```typescript
// In your report generation workflow
import { api } from "../convex/_generated/api";

async function generateDailyBrief(date: string) {
  // ... generate report components

  // Track funding events component
  await ctx.runMutation(api.domains.analytics.componentMetrics.recordComponentMetrics, {
    date: "2026-01-21",
    reportType: "daily_brief",
    componentType: "funding_events",
    sourceName: "SiliconAngle",
    category: "AI/ML",
    itemCount: 12,
    engagementScore: 0.87,  // Optional: calculated from user interactions
    freshnessHours: 24,
  });

  // Track research highlights component
  await ctx.runMutation(api.domains.analytics.componentMetrics.recordComponentMetrics, {
    date: "2026-01-21",
    reportType: "daily_brief",
    componentType: "research_highlights",
    sourceName: "ArXiv",
    category: "AI/ML",
    itemCount: 5,
    engagementScore: 0.92,
    avgReadTimeSeconds: 180,
  });
}
```

#### Batch Recording (Recommended)

```typescript
import { internal } from "../convex/_generated/api";

await ctx.runMutation(internal.domains.analytics.componentMetrics.batchRecordComponentMetrics, {
  metrics: [
    {
      date: "2026-01-21",
      reportType: "daily_brief",
      componentType: "funding_events",
      sourceName: "SiliconAngle",
      category: "AI/ML",
      itemCount: 12,
    },
    {
      date: "2026-01-21",
      reportType: "daily_brief",
      componentType: "research_highlights",
      sourceName: "ArXiv",
      category: "AI/ML",
      itemCount: 5,
    },
    // ... more metrics
  ],
});
```

#### Querying Metrics

```typescript
// Get all metrics for a date
const metrics = await ctx.runQuery(
  api.domains.analytics.componentMetrics.getComponentMetricsByDate,
  { date: "2026-01-21", reportType: "daily_brief" }
);

// Get top-performing sources
const topSources = await ctx.runQuery(
  api.domains.analytics.componentMetrics.getTopPerformingSources,
  { startDate: "2026-01-01", endDate: "2026-01-21", limit: 10 }
);
```

---

### 2. Recommendation Feedback

**Location**: `convex/domains/recomm/feedback.ts`

#### When to Use
Call this whenever a user interacts with a recommendation (accepts, rejects, ignores, etc.).

#### UI Integration Example

```typescript
import { api } from "../convex/_generated/api";

// When user clicks "Accept" on a recommendation
async function handleAcceptRecommendation(recommendationId: Id<"recommendations">) {
  const startTime = Date.now();

  // ... execute recommendation action

  await ctx.runMutation(api.domains.recomm.feedback.recordRecommendationOutcome, {
    recommendationId,
    action: "accepted",
    timeTakenMs: Date.now() - startTime,
    displayContext: "homepage_sidebar",
    actualValue: 0.9,  // Optional: user rating 0-1
  });
}

// When user clicks "Not Interested"
async function handleRejectRecommendation(
  recommendationId: Id<"recommendations">,
  reason: string
) {
  await ctx.runMutation(api.domains.recomm.feedback.recordRecommendationOutcome, {
    recommendationId,
    action: "rejected",
    reason,  // e.g., "Already researched", "Not relevant"
    displayContext: "homepage_sidebar",
  });
}

// When user ignores (shown but no action after timeout)
async function handleIgnoredRecommendation(recommendationId: Id<"recommendations">) {
  await ctx.runMutation(api.domains.recomm.feedback.recordRecommendationOutcome, {
    recommendationId,
    action: "ignored",
    timeTakenMs: 30000,  // Time before we considered it "ignored"
    displayContext: "homepage_sidebar",
  });
}
```

#### Analytics Dashboard Example

```typescript
// Get acceptance rate for your recommendation system
const stats = await ctx.runQuery(
  api.domains.recomm.feedback.getRecommendationAcceptanceRate,
  { userId: currentUserId }
);

console.log(`Acceptance rate: ${(stats.acceptanceRate * 100).toFixed(1)}%`);
console.log(`Average value: ${stats.avgValue?.toFixed(2)}`);

// Get common rejection reasons to improve recommendations
const topReasons = await ctx.runQuery(
  api.domains.recomm.feedback.getTopRejectionReasons,
  { limit: 5 }
);
```

---

### 3. HITL Decision Tracking

**Location**: `convex/domains/hitl/decisions.ts`

#### When to Use
Call this when a human reviews and makes a decision on an agent request.

#### Integration Example

```typescript
import { api } from "../convex/_generated/api";

// When human reviews a funding verification request
async function handleHumanReview(
  requestId: Id<"humanRequests">,
  decision: "approved" | "rejected" | "modified",
  feedback: string,
  modifiedFields?: string[],
  modifiedValues?: any
) {
  const reviewStartTime = getReviewStartTime(requestId);  // Track from when request was shown
  const reviewTimeMs = Date.now() - reviewStartTime;

  await ctx.runMutation(api.domains.hitl.decisions.recordHumanDecision, {
    requestId,
    requestType: "funding_verification",
    decision,
    reviewTimeMs,
    feedback,
    modifiedFields,
    modifiedValues,
    confidence: 0.95,  // Optional: human's confidence in their decision
    reasoning: "Verified via company press release",
  });
}

// Example: Approve funding amount
await handleHumanReview(
  requestId,
  "approved",
  "Amount confirmed via TechCrunch article"
);

// Example: Modify funding amount
await handleHumanReview(
  requestId,
  "modified",
  "SEC filing shows $105M, not $100M",
  ["amountUsd"],
  { amountUsd: 105000000 }
);

// Example: Escalate complex case
await ctx.runMutation(api.domains.hitl.decisions.recordHumanDecision, {
  requestId,
  requestType: "complex_verification",
  decision: "escalated",
  reviewTimeMs: 120000,
  feedback: "Requires senior analyst review - conflicting sources",
  escalatedTo: seniorAnalystUserId,
});
```

#### Analytics Example

```typescript
// Get HITL approval rate by request type
const approvalRate = await ctx.runQuery(
  api.domains.hitl.decisions.getHitlApprovalRate,
  { requestType: "funding_verification" }
);

console.log(`Approval rate: ${(approvalRate.approvalRate * 100).toFixed(1)}%`);
console.log(`Avg review time: ${approvalRate.avgReviewTimeSeconds.toFixed(1)}s`);

// Find which fields agents get wrong most often
const commonModifications = await ctx.runQuery(
  api.domains.hitl.decisions.getMostModifiedFields,
  { requestType: "funding_verification", limit: 5 }
);
```

---

### 4. Admin Audit Log

**Future Implementation**: Create `convex/domains/admin/auditLog.ts`

#### When to Use
- User management actions (create, delete, suspend, promote)
- Config changes (settings, feature flags)
- Data corrections (manual fixes to records)
- Permission changes (role assignments)
- Security events (unusual access patterns)

#### Example Template

```typescript
// To be implemented
export const logAdminAction = mutation({
  args: {
    action: v.string(),
    actionCategory: v.union(
      v.literal("user_management"),
      v.literal("config_change"),
      v.literal("data_correction"),
      // ...
    ),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    before: v.optional(v.any()),
    after: v.any(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // ... log action
  },
});
```

---

### 5. Persona Change Log

**Future Implementation**: Create `convex/domains/personas/changeLog.ts`

#### When to Use
- Persona budget changes
- Lens configuration updates
- Hook modifications
- Preference changes

#### Example Template

```typescript
// To be implemented
export const logPersonaChange = mutation({
  args: {
    personaId: v.string(),
    personaType: v.union(v.literal("budget"), v.literal("lens"), ...),
    fieldChanged: v.string(),
    previousValue: v.any(),
    newValue: v.any(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ... log change
  },
});
```

---

### 6. Verification SLO Metrics

**Future Implementation**: Create `convex/domains/verification/sloMetrics.ts`

#### When to Use
- Daily rollup of verification accuracy
- Batch calculation of precision/recall
- SLO compliance reporting

#### Example Template

```typescript
// To be implemented
export const calculateDailySloMetrics = internalMutation({
  args: {
    date: v.string(),
    verificationType: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch all verifications for the day
    // 2. Calculate confusion matrix (TP, FP, TN, FN)
    // 3. Calculate precision, recall, F1
    // 4. Check if SLO target met
    // 5. Insert into verificationSloMetrics
  },
});
```

---

## Migration Strategy

### Phase 1: Immediate (Week 1)

1. **Deploy schema changes** ✅ DONE
   ```bash
   npx convex dev
   # Schema will auto-deploy
   ```

2. **Integrate analytics tracking**
   - Update daily brief generation
   - Update weekly digest generation
   - Add component tracking calls

3. **Integrate recommendation feedback**
   - Add UI buttons for accept/reject
   - Track user actions
   - Set up implicit ignore tracking (timeout-based)

4. **Integrate HITL decision tracking**
   - Update human review UI
   - Capture decision outcomes
   - Track review times

### Phase 2: Dashboards (Week 2)

1. **Create analytics dashboard**
   - Component performance trends
   - Source value analysis
   - Category engagement metrics

2. **Create recommendation analytics**
   - Acceptance rate trends
   - Rejection reason analysis
   - Value rating distribution

3. **Create HITL effectiveness dashboard**
   - Approval rate by type
   - Review time trends
   - Most modified fields

### Phase 3: Automation (Week 3)

1. **Implement admin audit logging**
   - Wrap all admin mutations
   - Add before/after state capture
   - Create compliance report

2. **Implement persona change tracking**
   - Wrap persona update mutations
   - Track all configuration changes
   - Build persona version history

3. **Implement daily SLO calculations**
   - Create cron job for daily rollup
   - Calculate verification metrics
   - Alert on SLO misses

---

## Testing

### 1. Test Analytics Tracking

```typescript
// Test recording metrics
await ctx.runMutation(api.domains.analytics.componentMetrics.recordComponentMetrics, {
  date: "2026-01-21",
  reportType: "daily_brief",
  componentType: "test_component",
  sourceName: "TestSource",
  itemCount: 10,
});

// Verify it was recorded
const metrics = await ctx.runQuery(
  api.domains.analytics.componentMetrics.getComponentMetricsByDate,
  { date: "2026-01-21" }
);
console.assert(metrics.length > 0, "Metrics should be recorded");
```

### 2. Test Recommendation Feedback

```typescript
// Create test recommendation
const recId = await ctx.runMutation(api.recommendations.create, {
  type: "company_to_research",
  score: 0.89,
});

// Record feedback
await ctx.runMutation(api.domains.recomm.feedback.recordRecommendationOutcome, {
  recommendationId: recId,
  action: "accepted",
  actualValue: 0.9,
});

// Verify feedback was recorded
const outcomes = await ctx.runQuery(
  api.domains.recomm.feedback.getRecommendationOutcomes,
  { recommendationId: recId }
);
console.assert(outcomes.length === 1, "Feedback should be recorded");
```

### 3. Test HITL Decision Tracking

```typescript
// Create test HITL request
const requestId = await ctx.runMutation(api.hitl.createRequest, {
  requestType: "test_verification",
  data: { test: true },
});

// Record decision
await ctx.runMutation(api.domains.hitl.decisions.recordHumanDecision, {
  requestId,
  requestType: "test_verification",
  decision: "approved",
  reviewTimeMs: 5000,
  feedback: "Test approval",
});

// Verify decision was recorded
const decision = await ctx.runQuery(
  api.domains.hitl.decisions.getDecisionByRequest,
  { requestId }
);
console.assert(decision !== undefined, "Decision should be recorded");
```

---

## Backwards Compatibility

### Use of Proceeds
The `useOfProceeds` field supports both legacy string format and new structured format:

```typescript
// Legacy format (still supported)
useOfProceeds: "Scaling operations"

// New structured format
useOfProceeds: {
  categories: [
    { category: "R&D", percentage: 40, description: "AI model development" },
    { category: "Sales & Marketing", percentage: 30 },
    { category: "Hiring", percentage: 20 },
    { category: "Working Capital", percentage: 10 },
  ],
  source: "SEC filing",
  confidence: 0.95,
  summary: "Focus on R&D and go-to-market expansion",
}
```

**Migration Path**: Existing records with string format will continue to work. New records should use structured format when detailed allocation is available.

---

## Monitoring

### Key Metrics to Track

1. **Analytics Coverage**
   - % of reports with component metrics
   - Avg components per report
   - Metric freshness

2. **Recommendation Effectiveness**
   - Acceptance rate trend
   - Value rating distribution
   - Time to action

3. **HITL Efficiency**
   - Approval rate by type
   - Avg review time
   - Modification frequency

### Alerts to Set Up

1. **Low coverage**: < 80% of reports have component metrics
2. **Low acceptance**: Recommendation acceptance < 30%
3. **Slow reviews**: HITL review time > 5 minutes avg
4. **High rejection**: Approval rate < 50% for any request type

---

## Next Steps

### Immediate (This Week)
1. ✅ Deploy schema changes
2. ⏸️ Integrate analytics tracking into report generation
3. ⏸️ Add recommendation feedback UI
4. ⏸️ Update HITL review workflows

### Short Term (Next 2 Weeks)
1. ⏸️ Build analytics dashboards
2. ⏸️ Implement admin audit logging
3. ⏸️ Add persona change tracking
4. ⏸️ Create verification SLO calculations

### Long Term (Next Month)
1. ⏸️ A/B test recommendation improvements
2. ⏸️ Automate HITL threshold adjustments
3. ⏸️ Build compliance reports
4. ⏸️ Implement predictive analytics

---

## Support

**Questions?** Check:
- [System-Wide Data Completeness Audit](./SYSTEM_WIDE_DATA_COMPLETENESS_AUDIT.md)
- [100% Achievement Report](./100_PERCENT_ACHIEVEMENT.md)
- Schema: `convex/schema.ts` (lines 9883+)

**Issues?** Create a ticket with:
- Table name
- Error message
- Integration context
- Expected vs actual behavior
