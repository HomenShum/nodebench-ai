# Roadmap to 100% Data Completeness 🎯

**Current State**: 78% overall (infrastructure for 95% now in place)
**Target**: 95% realistic, 100% aspirational
**Timeline**: 8 weeks to 95%
**Status**: Week 0 - Infrastructure Complete ✅

---

## Executive Summary

We've implemented the **infrastructure** (6 tables + 3 function modules). Now we need to **integrate** these features into existing workflows and **activate** them in production.

**Realistic Target**: 95% (some fields are disclosure-dependent)
**Stretch Target**: 100% (requires external data sources)

---

## Phase 1: Activate P0 Features (Weeks 1-3) 🚀

These are **critical** for closing feedback loops. Without these, the system cannot learn or improve.

### Week 1: Analytics Integration

#### Task 1.1: Update Daily Brief Generation
**File**: Find daily brief generation workflow
**Action**: Add component tracking after each section

```typescript
// In convex/workflows/dailyBrief.ts or similar
import { internal } from "../_generated/api";

async function generateDailyBrief(ctx, date: string) {
  // ... existing brief generation

  // NEW: Track funding events component
  const fundingEvents = await getFundingEvents(ctx, date);
  await ctx.runMutation(internal.domains.analytics.componentMetrics.batchRecordComponentMetrics, {
    metrics: [{
      date,
      reportType: "daily_brief",
      componentType: "funding_events",
      sourceName: "SiliconAngle",
      category: "AI/ML",
      itemCount: fundingEvents.filter(e => e.sector?.includes("AI/ML")).length,
      freshnessHours: 24,
    }, {
      date,
      reportType: "daily_brief",
      componentType: "funding_events",
      sourceName: "TechCrunch",
      category: "FinTech",
      itemCount: fundingEvents.filter(e => e.sector?.includes("FinTech")).length,
      freshnessHours: 24,
    }],
  });

  // Repeat for other components: research highlights, market signals, etc.
}
```

**Files to Update**:
- [ ] `convex/workflows/dailyBrief.ts` (or wherever daily brief is generated)
- [ ] `convex/workflows/weeklyDigest.ts`
- [ ] Any other report generation workflows

**Testing**:
```bash
# Generate test report and verify metrics recorded
npx convex run workflows:generateDailyBrief '{"date":"2026-01-21"}'

# Query metrics
npx convex run domains/analytics/componentMetrics:getComponentMetricsByDate '{"date":"2026-01-21"}'
```

**Success Criteria**: 100% of reports have component metrics

---

#### Task 1.2: Build Analytics Dashboard UI

**New File**: `src/features/analytics/views/ComponentDashboard.tsx`

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ComponentDashboard() {
  const topSources = useQuery(api.domains.analytics.componentMetrics.getTopPerformingSources, {
    startDate: "2026-01-01",
    endDate: "2026-01-21",
    limit: 10,
  });

  return (
    <div className="dashboard">
      <h2>Top Performing Content Sources</h2>
      {topSources?.map(source => (
        <div key={source.sourceName} className="source-card">
          <h3>{source.sourceName}</h3>
          <p>Engagement: {(source.avgEngagement * 100).toFixed(1)}%</p>
          <p>Total Items: {source.totalItems}</p>
          <p>CTR: {(source.avgCTR * 100).toFixed(1)}%</p>
        </div>
      ))}
    </div>
  );
}
```

**Files to Create**:
- [ ] `src/features/analytics/views/ComponentDashboard.tsx`
- [ ] `src/features/analytics/components/SourcePerformanceChart.tsx`
- [ ] `src/features/analytics/components/CategoryBreakdown.tsx`

**Success Criteria**: Can visualize top sources and identify low-performing components

---

### Week 2: Recommendation Feedback

#### Task 2.1: Add Feedback UI to Recommendations

**File**: `src/features/agents/components/RecommendationCard.tsx` (or similar)

```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function RecommendationCard({ recommendation }) {
  const recordOutcome = useMutation(api.domains.recomm.feedback.recordRecommendationOutcome);
  const [startTime] = useState(Date.now());
  const [showValueRating, setShowValueRating] = useState(false);

  const handleAccept = async () => {
    await recordOutcome({
      recommendationId: recommendation._id,
      action: "accepted",
      timeTakenMs: Date.now() - startTime,
      displayContext: "sidebar",
    });

    // Show value rating dialog after 30 seconds
    setTimeout(() => setShowValueRating(true), 30000);

    // Execute recommendation action
    await executeRecommendation(recommendation);
  };

  const handleReject = async (reason: string) => {
    await recordOutcome({
      recommendationId: recommendation._id,
      action: "rejected",
      reason,
      timeTakenMs: Date.now() - startTime,
      displayContext: "sidebar",
    });
  };

  const handleRateValue = async (value: number) => {
    await recordOutcome({
      recommendationId: recommendation._id,
      action: "accepted",
      actualValue: value,  // 0-1
      timeTakenMs: Date.now() - startTime,
      displayContext: "sidebar",
    });
  };

  return (
    <div className="recommendation-card">
      <h3>{recommendation.title}</h3>
      <p>{recommendation.description}</p>

      <div className="actions">
        <button onClick={handleAccept}>✓ Accept</button>
        <button onClick={() => handleReject("Not relevant")}>✗ Reject</button>
      </div>

      {showValueRating && (
        <ValueRatingDialog onRate={handleRateValue} />
      )}
    </div>
  );
}
```

**Files to Update**:
- [ ] `src/features/agents/components/RecommendationCard.tsx`
- [ ] Add feedback buttons to all recommendation displays
- [ ] Implement implicit ignore tracking (30s timeout)

**Testing**:
```typescript
// Test acceptance rate query
const stats = await ctx.runQuery(
  api.domains.recomm.feedback.getRecommendationAcceptanceRate,
  { userId: testUserId }
);
console.log(`Acceptance rate: ${(stats.acceptanceRate * 100).toFixed(1)}%`);
```

**Success Criteria**: 80%+ of recommendations have user feedback

---

#### Task 2.2: Build Recommendation Analytics Dashboard

**New File**: `src/features/analytics/views/RecommendationAnalytics.tsx`

```typescript
export function RecommendationAnalytics() {
  const acceptanceRate = useQuery(api.domains.recomm.feedback.getRecommendationAcceptanceRate);
  const topReasons = useQuery(api.domains.recomm.feedback.getTopRejectionReasons, { limit: 5 });

  return (
    <div className="analytics">
      <MetricCard
        title="Acceptance Rate"
        value={`${(acceptanceRate?.acceptanceRate * 100 || 0).toFixed(1)}%`}
        trend={calculateTrend(acceptanceRate)}
      />

      <div className="rejection-reasons">
        <h3>Top Rejection Reasons</h3>
        {topReasons?.map(reason => (
          <div key={reason.reason}>
            <span>{reason.reason}</span>
            <span>{reason.count} times</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Success Criteria**: Can identify why users reject recommendations and iterate on algorithm

---

### Week 3: HITL Decision Tracking

#### Task 3.1: Update HITL Review UI

**File**: Find HITL review component (likely in `src/features/agents/`)

```typescript
export function HitlReviewDialog({ request }) {
  const recordDecision = useMutation(api.domains.hitl.decisions.recordHumanDecision);
  const [reviewStartTime] = useState(Date.now());
  const [modifiedValues, setModifiedValues] = useState({});

  const handleApprove = async () => {
    await recordDecision({
      requestId: request._id,
      requestType: request.requestType,
      decision: "approved",
      reviewTimeMs: Date.now() - reviewStartTime,
      feedback: "Looks good",
      confidence: 0.95,
    });
    onClose();
  };

  const handleModify = async () => {
    await recordDecision({
      requestId: request._id,
      requestType: request.requestType,
      decision: "modified",
      reviewTimeMs: Date.now() - reviewStartTime,
      feedback: `Modified ${Object.keys(modifiedValues).join(", ")}`,
      modifiedFields: Object.keys(modifiedValues),
      modifiedValues,
    });
    await applyModifications(request, modifiedValues);
    onClose();
  };

  const handleReject = async (reason: string) => {
    await recordDecision({
      requestId: request._id,
      requestType: request.requestType,
      decision: "rejected",
      reviewTimeMs: Date.now() - reviewStartTime,
      feedback: reason,
    });
    onClose();
  };

  return (
    <Dialog>
      <h2>Review Request: {request.requestType}</h2>
      <RequestDetails request={request} />

      {/* Editable fields for modifications */}
      <EditableFields
        data={request.data}
        onChange={setModifiedValues}
      />

      <div className="actions">
        <button onClick={handleApprove}>✓ Approve</button>
        <button onClick={handleModify}>✏️ Modify & Approve</button>
        <button onClick={() => handleReject("Incorrect data")}>✗ Reject</button>
      </div>
    </Dialog>
  );
}
```

**Files to Update**:
- [ ] Find and update HITL review dialog component
- [ ] Add decision tracking to all HITL flows
- [ ] Track review start time on dialog open

**Success Criteria**: 100% of HITL requests have decision outcomes recorded

---

#### Task 3.2: Build HITL Effectiveness Dashboard

**New File**: `src/features/analytics/views/HitlDashboard.tsx`

```typescript
export function HitlDashboard() {
  const approvalRate = useQuery(api.domains.hitl.decisions.getHitlApprovalRate);
  const modifiedFields = useQuery(api.domains.hitl.decisions.getMostModifiedFields, { limit: 10 });
  const reviewTimeByType = useQuery(api.domains.hitl.decisions.getAverageReviewTimeByType);

  return (
    <div className="hitl-dashboard">
      <MetricCard
        title="Overall Approval Rate"
        value={`${(approvalRate?.approvalRate * 100 || 0).toFixed(1)}%`}
        subtitle={`Avg review time: ${approvalRate?.avgReviewTimeSeconds.toFixed(1)}s`}
      />

      <div className="modified-fields">
        <h3>Most Modified Fields (Agent Weaknesses)</h3>
        {modifiedFields?.map(field => (
          <div key={field.field}>
            <span>{field.field}</span>
            <span>{field.count} times</span>
            <ProgressBar value={field.count} max={modifiedFields[0].count} />
          </div>
        ))}
        <p className="insight">💡 These fields need automation improvement</p>
      </div>

      <div className="review-time-by-type">
        <h3>Review Time by Request Type</h3>
        {reviewTimeByType?.map(type => (
          <div key={type.requestType}>
            <span>{type.requestType}</span>
            <span>{type.avgReviewTimeSeconds.toFixed(1)}s</span>
            <span>Approval: {(type.approvalRate * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Success Criteria**: Can identify which fields agents get wrong most often and prioritize improvements

---

## Phase 2: Implement P1 Features (Weeks 4-5) 🔒

These are **compliance and quality** features. Required for SOC2/GDPR.

### Week 4: Admin Audit Logging

#### Task 4.1: Create Admin Audit Functions

**New File**: `convex/domains/admin/auditLog.ts`

```typescript
import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";

export const logAdminAction = mutation({
  args: {
    action: v.string(),
    actionCategory: v.union(
      v.literal("user_management"),
      v.literal("config_change"),
      v.literal("data_correction"),
      v.literal("permission_change"),
      v.literal("deletion"),
      v.literal("access_grant"),
      v.literal("security_event")
    ),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    before: v.optional(v.any()),
    after: v.any(),
    reason: v.optional(v.string()),
    ticket: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject as any;

    await ctx.db.insert("adminAuditLog", {
      action: args.action,
      actionCategory: args.actionCategory,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      before: args.before,
      after: args.after,
      reason: args.reason,
      ticket: args.ticket,
      actor: userId,
      actorRole: identity.role || "admin",
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      metadata: args.metadata,
      timestamp: Date.now(),
    });

    console.log(`[AdminAudit] ${userId} performed ${args.action} on ${args.resourceType}`);
  },
});

export const getAuditLogByResource = query({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adminAuditLog")
      .withIndex("by_resource", (q) =>
        q.eq("resourceType", args.resourceType).eq("resourceId", args.resourceId)
      )
      .order("desc")
      .collect();
  },
});

export const getAuditLogByActor = query({
  args: {
    actorId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adminAuditLog")
      .withIndex("by_actor", (q) => q.eq("actor", args.actorId))
      .order("desc")
      .take(args.limit || 100);
  },
});

export const getRecentAuditLog = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.union(
      v.literal("user_management"),
      v.literal("config_change"),
      v.literal("data_correction"),
      v.literal("permission_change"),
      v.literal("deletion"),
      v.literal("access_grant"),
      v.literal("security_event")
    )),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("adminAuditLog");

    if (args.category) {
      query = query.withIndex("by_category", (q) => q.eq("actionCategory", args.category));
    }

    return await query.order("desc").take(args.limit || 50);
  },
});
```

**Files to Create**:
- [ ] `convex/domains/admin/auditLog.ts`

---

#### Task 4.2: Wrap Admin Mutations

**Strategy**: Wrap all admin mutations with audit logging

```typescript
// Example: User management
export const updateUserRole = mutation({
  args: { userId: v.id("users"), newRole: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    // Get current state
    const user = await ctx.db.get(args.userId);
    const oldRole = user?.role;

    // Perform update
    await ctx.db.patch(args.userId, { role: args.newRole });

    // Log action
    await ctx.runMutation(api.domains.admin.auditLog.logAdminAction, {
      action: "update_user_role",
      actionCategory: "user_management",
      resourceType: "user",
      resourceId: args.userId,
      before: { role: oldRole },
      after: { role: args.newRole },
      reason: args.reason,
    });
  },
});
```

**Files to Update**:
- [ ] All admin user management mutations
- [ ] All config change mutations
- [ ] All data correction mutations

**Success Criteria**: 100% of admin actions logged, SOC2 audit ready

---

### Week 5: Persona Change Logging & Verification SLO

#### Task 5.1: Create Persona Change Functions

**New File**: `convex/domains/personas/changeLog.ts`

```typescript
export const logPersonaChange = mutation({
  args: {
    personaId: v.string(),
    personaType: v.union(
      v.literal("budget"),
      v.literal("lens"),
      v.literal("hook"),
      v.literal("preference"),
      v.literal("setting")
    ),
    fieldChanged: v.string(),
    previousValue: v.any(),
    newValue: v.any(),
    changeType: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("reset")
    ),
    reason: v.optional(v.string()),
    impactedRecommendations: v.optional(v.number()),
    impactedJobs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject as any;

    await ctx.db.insert("personaChangeLog", {
      ...args,
      actor: userId,
      actorType: userId ? "user" : "system",
      metadata: {},
      timestamp: Date.now(),
    });
  },
});

// Wrap existing persona update mutations
export const updatePersonaBudget = mutation({
  args: {
    personaId: v.string(),
    budgetField: v.string(),
    newValue: v.any(),
  },
  handler: async (ctx, args) => {
    // Get current value
    const persona = await getPersona(ctx, args.personaId);
    const oldValue = persona.budgets[args.budgetField];

    // Update
    await updatePersonaBudgetInDb(ctx, args.personaId, args.budgetField, args.newValue);

    // Log change
    await ctx.runMutation(internal.domains.personas.changeLog.logPersonaChange, {
      personaId: args.personaId,
      personaType: "budget",
      fieldChanged: args.budgetField,
      previousValue: oldValue,
      newValue: args.newValue,
      changeType: "update",
    });
  },
});
```

**Files to Create**:
- [ ] `convex/domains/personas/changeLog.ts`

**Files to Update**:
- [ ] All persona budget mutations
- [ ] All persona lens mutations
- [ ] All persona hook mutations

---

#### Task 5.2: Create Verification SLO Calculator

**New File**: `convex/crons/calculateDailySloMetrics.ts`

```typescript
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

export const calculateDailySloMetrics = internalMutation({
  args: {},
  handler: async (ctx) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];

    // Get all verifications from yesterday
    const verifications = await getVerificationsForDate(ctx, dateStr);

    // Group by type
    const byType = groupBy(verifications, v => v.verificationType);

    for (const [type, typeVerifications] of Object.entries(byType)) {
      // Calculate confusion matrix
      const tp = typeVerifications.filter(v => v.predicted && v.actual).length;
      const fp = typeVerifications.filter(v => v.predicted && !v.actual).length;
      const tn = typeVerifications.filter(v => !v.predicted && !v.actual).length;
      const fn = typeVerifications.filter(v => !v.predicted && v.actual).length;

      const precision = tp / (tp + fp);
      const recall = tp / (tp + fn);
      const f1Score = 2 * (precision * recall) / (precision + recall);
      const accuracy = (tp + tn) / (tp + tn + fp + fn);

      // SLO target (configurable)
      const sloTarget = 0.95;
      const sloMet = precision >= sloTarget;

      await ctx.db.insert("verificationSloMetrics", {
        date: dateStr,
        verificationType: type,
        truePositives: tp,
        falsePositives: fp,
        trueNegatives: tn,
        falseNegatives: fn,
        precision,
        recall,
        f1Score,
        accuracy,
        totalVerifications: typeVerifications.length,
        totalSources: countUniqueSources(typeVerifications),
        avgSourcesPerVerification: calculateAvgSources(typeVerifications),
        sloTarget,
        sloMet,
        sloMissMargin: sloMet ? 0 : sloTarget - precision,
        metadata: {},
        createdAt: Date.now(),
      });

      if (!sloMet) {
        console.warn(`[SLO Miss] ${type} missed SLO: ${(precision * 100).toFixed(1)}% < ${(sloTarget * 100)}%`);
        // TODO: Send alert
      }
    }

    console.log(`[SLO] Calculated metrics for ${dateStr}`);
  },
});
```

**Files to Create**:
- [ ] `convex/crons/calculateDailySloMetrics.ts`
- [ ] `convex/domains/verification/sloMetrics.ts` (query functions)

**Cron Setup**:
```typescript
// In convex/crons.ts
export default {
  dailySloCalculation: {
    schedule: "0 1 * * *", // 1 AM daily
    handler: internal.crons.calculateDailySloMetrics.calculateDailySloMetrics,
  },
};
```

**Success Criteria**: Daily SLO metrics calculated, alerts on misses

---

## Phase 3: Enhanced Use of Proceeds (Week 6) 💰

### Task 6.1: Create Structured Use of Proceeds Extractor

**New File**: `convex/domains/enrichment/structuredUseOfProceeds.ts`

```typescript
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

export const extractStructuredUseOfProceeds = internalAction({
  args: {
    fundingEventId: v.id("fundingEvents"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.runQuery(internal.domains.enrichment.fundingQueries.getFundingEventById, {
      id: args.fundingEventId,
    });

    if (!event) return { success: false, error: "Event not found" };

    // If already has structured format, skip
    if (typeof event.useOfProceeds === "object") {
      return { success: true, skipped: true };
    }

    // Use LLM to extract structured breakdown from article text
    const { generateObject } = await import("ai");
    const { getLanguageModelSafe } = await import("../agents/mcp_tools/models/modelResolver");
    const model = getLanguageModelSafe("sonnet-4.5");

    const prompt = `Analyze this funding announcement and extract how the company plans to use the funds.

Company: ${event.companyName}
Amount: ${event.amountRaw}
Round: ${event.roundType}
Description: ${event.description || "N/A"}
Source: ${event.sourceUrls[0]}

Extract a structured breakdown of use of proceeds. If not explicitly stated, make reasonable inferences based on typical usage for this stage.

Categories typically include:
- R&D / Product Development
- Sales & Marketing
- Hiring / Team Expansion
- Geographic Expansion
- Infrastructure
- Working Capital
- Acquisitions
- General Corporate Purposes

Also extract any mentioned milestones tied to funding tranches.`;

    const schema = {
      type: "object",
      properties: {
        categories: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              percentage: { type: "number" },
              description: { type: "string" },
            },
            required: ["category"],
          },
        },
        milestones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              milestone: { type: "string" },
              targetDate: { type: "string" },
              description: { type: "string" },
            },
            required: ["milestone"],
          },
        },
        source: {
          type: "string",
          enum: ["SEC filing", "press release", "company statement", "inferred", "unknown"],
        },
        confidence: { type: "number" },
        summary: { type: "string" },
      },
      required: ["categories", "source", "confidence", "summary"],
    };

    const result = await generateObject({ model, schema, prompt });
    const structured = result.object as any;

    // Calculate amounts from percentages
    const totalAmount = event.amountUsd || 0;
    const categoriesWithAmounts = structured.categories.map((cat: any) => ({
      ...cat,
      amount: cat.percentage ? Math.round(totalAmount * cat.percentage / 100) : undefined,
    }));

    const structuredUseOfProceeds = {
      categories: categoriesWithAmounts,
      milestones: structured.milestones,
      source: structured.source,
      confidence: structured.confidence,
      summary: structured.summary,
    };

    // Update event
    await ctx.runMutation(internal.domains.enrichment.structuredUseOfProceeds.updateStructuredUseOfProceeds, {
      fundingEventId: args.fundingEventId,
      useOfProceeds: structuredUseOfProceeds,
    });

    return { success: true, structured: structuredUseOfProceeds };
  },
});

export const updateStructuredUseOfProceeds = internalMutation({
  args: {
    fundingEventId: v.id("fundingEvents"),
    useOfProceeds: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fundingEventId, {
      useOfProceeds: args.useOfProceeds,
      updatedAt: Date.now(),
    });
  },
});

// Batch upgrade all legacy string formats
export const batchUpgradeUseOfProceeds = internalAction({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.runQuery(internal.domains.enrichment.fundingQueries.getRecentFundingEvents, {
      lookbackHours: 720,
      limit: 100,
    });

    let upgraded = 0;
    let skipped = 0;

    for (const event of events) {
      // Skip if already structured
      if (typeof event.useOfProceeds === "object") {
        skipped++;
        continue;
      }

      try {
        await ctx.runAction(internal.domains.enrichment.structuredUseOfProceeds.extractStructuredUseOfProceeds, {
          fundingEventId: event.id as any,
        });
        upgraded++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
      } catch (e: any) {
        console.error(`Failed to upgrade ${event.companyName}: ${e.message}`);
      }
    }

    return { success: true, upgraded, skipped, total: events.length };
  },
});
```

**Files to Create**:
- [ ] `convex/domains/enrichment/structuredUseOfProceeds.ts`

**Run Batch Upgrade**:
```bash
npx convex run domains/enrichment/structuredUseOfProceeds:batchUpgradeUseOfProceeds
```

**Success Criteria**: All funding events have structured use of proceeds

---

## Phase 4: Advanced Enhancements (Weeks 7-8) ⚡

### Week 7: Voice & Publishing Workflows

#### Task 7.1: Voice Transcription Enhancement
- [ ] Add transcription field to voiceSessions
- [ ] Integrate with speech-to-text service
- [ ] Extract intent from transcriptions
- [ ] Track error rates

#### Task 7.2: Publishing Workflow State Machine
- [ ] Add approval workflow to publishingTasks
- [ ] Track draft → review → approved → published states
- [ ] Add scheduled publication support
- [ ] Performance metrics per published item

---

### Week 8: Canonicalization & Final Polish

#### Task 8.1: Dedup Confidence Scoring
- [ ] Add confidence scores to duplicate detection
- [ ] Track alternative matches considered
- [ ] Log manual override decisions

#### Task 8.2: Final Integration Testing
- [ ] Test all feedback loops end-to-end
- [ ] Verify SLO calculations
- [ ] Audit compliance reports
- [ ] Performance testing

---

## Success Metrics & Tracking

### Overall Completeness Target

| Feature Category | Week 0 | Week 3 | Week 5 | Week 8 | Target |
|-----------------|--------|--------|--------|--------|--------|
| Analytics & Reporting | 60% | 85% | 90% | 95% | **95%** |
| Recommendations | 50% | 85% | 90% | 95% | **95%** |
| HITL | 60% | 85% | 90% | 95% | **95%** |
| Verification | 80% | 85% | 95% | 95% | **95%** |
| Entity Management | 85% | 85% | 90% | 95% | **95%** |
| Admin Audit | 50% | 50% | 90% | 95% | **95%** |
| Personas | 65% | 65% | 90% | 95% | **95%** |
| **OVERALL** | **78%** | **83%** | **90%** | **95%** | **95%** |

---

## Weekly Checkpoints

### Week 1 Checkpoint
- [ ] Daily brief has component metrics
- [ ] Analytics dashboard deployed
- [ ] Can query top-performing sources

### Week 2 Checkpoint
- [ ] Recommendation feedback UI live
- [ ] 80%+ recommendations have outcomes
- [ ] Acceptance rate dashboard live

### Week 3 Checkpoint
- [ ] HITL review UI captures decisions
- [ ] 100% HITL requests tracked
- [ ] Can identify agent weaknesses

### Week 4 Checkpoint
- [ ] Admin audit logging functions deployed
- [ ] All admin mutations wrapped
- [ ] Compliance report available

### Week 5 Checkpoint
- [ ] Persona changes logged
- [ ] Daily SLO cron running
- [ ] SLO dashboard deployed

### Week 6 Checkpoint
- [ ] Structured use of proceeds live
- [ ] All funding events upgraded
- [ ] Rich allocation breakdowns

### Week 7 Checkpoint
- [ ] Voice transcription working
- [ ] Publishing workflow complete

### Week 8 Checkpoint
- [ ] All features integrated
- [ ] 95% completeness achieved
- [ ] Production-ready

---

## Quick Commands Reference

```bash
# Week 1: Test analytics tracking
npx convex run workflows:generateDailyBrief '{"date":"2026-01-21"}'
npx convex run domains/analytics/componentMetrics:getComponentMetricsByDate '{"date":"2026-01-21"}'

# Week 2: Test recommendation feedback
npx convex run domains/recomm/feedback:getRecommendationAcceptanceRate '{"userId":"..."}'

# Week 3: Test HITL decisions
npx convex run domains/hitl/decisions:getHitlApprovalRate '{}'

# Week 4: Test admin audit
npx convex run domains/admin/auditLog:getRecentAuditLog '{"limit":10}'

# Week 5: Calculate SLO metrics
npx convex run crons/calculateDailySloMetrics:calculateDailySloMetrics

# Week 6: Upgrade use of proceeds
npx convex run domains/enrichment/structuredUseOfProceeds:batchUpgradeUseOfProceeds
```

---

## Monitoring Dashboard (Build This!)

Create a central "Data Completeness Dashboard" showing:

```typescript
export function DataCompletenessDashboard() {
  return (
    <div className="completeness-dashboard">
      {/* Overall Score */}
      <ScoreCard
        title="Overall Data Completeness"
        score={calculateOverallScore()}
        target={95}
        trend="+12% this month"
      />

      {/* Feature Breakdown */}
      <Grid>
        <FeatureCard feature="Analytics" score={85} target={95} />
        <FeatureCard feature="Recommendations" score={90} target={95} />
        <FeatureCard feature="HITL" score={87} target={95} />
        <FeatureCard feature="Verification" score={95} target={95} />
      </Grid>

      {/* Actionable Items */}
      <ActionItems>
        <Action priority="high">5 reports missing component metrics</Action>
        <Action priority="medium">12 recommendations without feedback</Action>
        <Action priority="low">3 HITL requests pending decisions</Action>
      </ActionItems>

      {/* Progress Chart */}
      <ProgressChart weeklyScores={weeklyScores} />
    </div>
  );
}
```

---

## Final Checklist for 100%

### Core Data (Funding Domain) ✅
- [x] Company name: 100%
- [x] Funding amount: 100%
- [x] Sector: 100% (all specific)
- [x] Location: 100%
- [x] Publisher attribution: 100%
- [ ] Use of proceeds: 100% structured ← **Week 6**

### Analytics & Observability
- [ ] Component metrics: 100% coverage ← **Week 1**
- [ ] Engagement tracking: 80%+ ← **Week 1-2**
- [ ] Source performance: measurable ← **Week 1**

### Recommendation System
- [ ] Feedback capture: 80%+ ← **Week 2**
- [ ] Acceptance rate: measured ← **Week 2**
- [ ] Value ratings: collected ← **Week 2**

### HITL System
- [ ] Decision outcomes: 100% ← **Week 3**
- [ ] Review times: tracked ← **Week 3**
- [ ] Modified fields: identified ← **Week 3**

### Compliance
- [ ] Admin actions: 100% logged ← **Week 4**
- [ ] Persona changes: 100% tracked ← **Week 5**
- [ ] SOC2 audit reports: available ← **Week 4**

### Quality Metrics
- [ ] Verification SLO: calculated daily ← **Week 5**
- [ ] SLO misses: alerted ← **Week 5**
- [ ] Precision/recall: measured ← **Week 5**

---

## Emergency Shortcuts (If Pressed for Time)

### Minimum Viable Integration (1 Week)
1. **Analytics**: Add component tracking to top 2 reports
2. **Recommendations**: Add accept/reject buttons only
3. **HITL**: Add approve/reject buttons only
4. Skip dashboards (use direct queries)

### MVP Commands
```bash
# Query analytics directly
npx convex run domains/analytics/componentMetrics:getTopPerformingSources '{"startDate":"2026-01-01","endDate":"2026-01-21"}'

# Query recommendations directly
npx convex run domains/recomm/feedback:getRecommendationAcceptanceRate

# Query HITL directly
npx convex run domains/hitl/decisions:getHitlApprovalRate
```

This gets you to **~85%** in 1 week vs 95% in 8 weeks.

---

## 🎯 Summary

**Current**: 78% (infrastructure ready)
**Week 3**: 83% (P0 features integrated)
**Week 5**: 90% (P1 features complete)
**Week 8**: 95% (all enhancements done)
**Aspirational**: 100% (requires external data sources)

**Start with**: Week 1 analytics integration (highest ROI)
**Priority 2**: Week 2 recommendation feedback (ML improvement)
**Priority 3**: Week 3 HITL tracking (automation improvement)

**Questions?** Reference:
- Implementation Guide: `DATA_COMPLETENESS_IMPLEMENTATION_GUIDE.md`
- System Audit: `SYSTEM_WIDE_DATA_COMPLETENESS_AUDIT.md`
