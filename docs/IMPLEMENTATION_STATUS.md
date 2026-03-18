# NodeBench Proactive System - Implementation Status

**Last Updated:** 2026-01-21
**Status:** Ready to Build

---

## ✅ Completed (Ready for Development)

### 📄 Documentation (100%)

1. **[PROACTIVE_SYSTEM_TECHNICAL_DESIGN.md](PROACTIVE_SYSTEM_TECHNICAL_DESIGN.md)** ✅
   - Complete system architecture
   - Data flow diagrams
   - 6 core database tables
   - Detector framework design
   - Policy gateway design
   - Delivery channels
   - SLO monitoring
   - Week 1-2 implementation checklist

2. **[PROACTIVE_SYSTEM_PRD.md](PROACTIVE_SYSTEM_PRD.md)** ✅
   - 3 detailed user personas
   - 5 product principles
   - 9 features across 3 phases
   - Complete UX flows
   - Settings & controls
   - Success metrics dashboard
   - 4-phase rollout plan

3. **[PROACTIVE_SYSTEM_ADDENDUM.md](PROACTIVE_SYSTEM_ADDENDUM.md)** ✅
   - Custom detector builder (premium)
   - Admin feedback dashboard (invite-only)
   - Free vs Paid tier matrix
   - Blanket consent flow (5 steps)
   - Compliance retention policy (90 days)
   - Proactive feed (in-app + Slack)

4. **[IMPLEMENTATION_TICKETS.md](IMPLEMENTATION_TICKETS.md)** ✅
   - 30 detailed implementation tickets
   - Week 1-3 sprint breakdown
   - Dependencies graph
   - Acceptance criteria for each ticket
   - Testing requirements
   - 166 story points estimated

---

### 🗄️ Database Schema (100%)

**File Created:** `convex/domains/proactive/schema.ts` ✅

**11 Tables Defined:**

1. **events** - Unified event bus (all activity signals)
   - 7 indexes: by_timestamp, by_eventType, by_source, by_contentHash, by_status, by_actor, by_expires

2. **opportunities** - Detector output with evidence
   - 8 indexes: by_type, by_status, by_risk, by_entity, by_detector, by_user, by_expires, by_status_expires

3. **proactiveActions** - Execution tracking (suggest/draft/execute)
   - 4 indexes: by_opportunity, by_status, by_type, by_mode

4. **detectorRuns** - Observability for detector performance
   - 2 indexes: by_detector, by_status

5. **userProactiveSettings** - Per-user configuration
   - 1 index: by_user

6. **proactiveFeedbackLabels** - User feedback for learning
   - 5 indexes: by_opportunity, by_user, by_type, by_detector, by_reviewed

7. **customDetectors** - User-created detectors (premium)
   - 3 indexes: by_user, by_user_status, by_triggerType

8. **adminUsers** - Admin access control (invite-only)
   - 2 indexes: by_email, by_userId

9. **subscriptions** - Stripe billing (free vs paid)
   - 3 indexes: by_user, by_stripe_customer, by_status

10. **usageTracking** - Monthly quota tracking
    - 1 index: by_user_month

11. **userConsents** - Blanket consent tracking
    - 2 indexes: by_user, by_user_type

**Next Step:** Import these tables into `convex/schema.ts` and deploy

---

### 🎨 Frontend Components (50%)

**Files Created:**

1. **`src/features/proactive/views/CustomDetectorBuilder.tsx`** ✅
   - 6-step wizard for creating custom detectors
   - Visual trigger builder (event/schedule/threshold)
   - Condition builder with AND logic
   - Action configuration with templates
   - Rate limiting and schedule settings
   - Test on historical events
   - Save as draft or enable immediately

2. **`src/features/admin/views/FeedbackDashboard.tsx`** ✅
   - Admin-only access check (hshum2018@gmail.com)
   - Overview stats (30-day)
   - Feedback by detector table
   - Recent feedback list with search
   - Top complaints section
   - Export to CSV
   - Real-time updates

**Files Needed (from tickets):**

3. Onboarding flow (5 steps):
   - `src/features/proactive/views/ProactiveOnboarding.tsx`
   - `src/features/proactive/components/onboarding/WelcomeStep.tsx`
   - `src/features/proactive/components/onboarding/ConsentStep.tsx`
   - `src/features/proactive/components/onboarding/FeaturesStep.tsx`
   - `src/features/proactive/components/onboarding/PreferencesStep.tsx`
   - `src/features/proactive/components/onboarding/SuccessStep.tsx`

4. Detector builder steps:
   - `src/features/proactive/components/detector-builder/NameStep.tsx`
   - `src/features/proactive/components/detector-builder/TriggerStep.tsx`
   - `src/features/proactive/components/detector-builder/ConditionsStep.tsx`
   - `src/features/proactive/components/detector-builder/ActionsStep.tsx`
   - `src/features/proactive/components/detector-builder/ScheduleStep.tsx`
   - `src/features/proactive/components/detector-builder/TestStep.tsx`

5. Billing components:
   - `src/features/billing/components/QuotaLimitModal.tsx`
   - `src/features/billing/components/CustomDetectorPaywall.tsx`
   - `src/features/billing/components/UpgradeBanner.tsx`
   - `src/features/billing/views/BillingDashboard.tsx`

6. Proactive feed:
   - `src/features/proactive/views/ProactiveFeed.tsx`
   - `src/features/proactive/components/OpportunityCard.tsx`
   - `src/features/proactive/components/FeedbackModal.tsx`

---

### ⚙️ Backend Implementation (0%)

**All backend files need to be created from tickets:**

**Core Framework:**
- `convex/domains/proactive/detectors/types.ts`
- `convex/domains/proactive/detectors/StreamingDetector.ts`
- `convex/domains/proactive/detectors/BatchDetector.ts`
- `convex/domains/proactive/detectors/registry.ts`
- `convex/domains/proactive/detectors/executor.ts`

**Event Adapters:**
- `convex/domains/proactive/adapters/emailEventAdapter.ts`
- `convex/domains/proactive/adapters/calendarEventAdapter.ts`
- `convex/crons/proactiveEmailIngestion.ts`
- `convex/crons/proactiveCalendarIngestion.ts`

**Pre-configured Detectors:**
- `convex/domains/proactive/detectors/meetingPrepDetector.ts`
- `convex/domains/proactive/detectors/followUpDetector.ts`

**Custom Detector Execution:**
- `convex/domains/proactive/customDetectorExecutor.ts`
- `convex/domains/proactive/triggerEvaluator.ts`
- `convex/domains/proactive/conditionEvaluator.ts`
- `convex/domains/proactive/variableSubstitution.ts`

**Policy & Delivery:**
- `convex/domains/proactive/policyGateway.ts`
- `convex/domains/proactive/tierEnforcement.ts`
- `convex/domains/proactive/delivery/slackDelivery.ts`
- `convex/domains/proactive/delivery/emailDraftDelivery.ts`

**Billing:**
- `convex/domains/billing/stripeActions.ts`
- `convex/domains/billing/stripeWebhooks.ts`
- `convex/domains/billing/subscriptionMutations.ts`

**Admin:**
- `convex/domains/proactive/seedAdmins.ts`
- `convex/domains/proactive/adminMutations.ts`
- `convex/domains/proactive/adminAuth.ts`
- `convex/domains/proactive/adminQueries.ts`
- `convex/domains/proactive/feedbackAnalytics.ts`

**Mutations & Queries:**
- `convex/domains/proactive/mutations.ts`
- `convex/domains/proactive/queries.ts`
- `convex/domains/proactive/consentMutations.ts`
- `convex/domains/proactive/feedbackMutations.ts`

**Crons:**
- `convex/crons/anonymizeFeedback.ts`
- `convex/crons/proactiveCleanup.ts`

---

## 📋 Implementation Checklist (Use Tickets)

### Week 1: Foundation (Days 1-7)

- [ ] **TICKET-001**: Add core proactive tables to schema (6 hours)
- [ ] **TICKET-002**: Add premium feature tables (5 hours)
- [ ] **TICKET-003**: Build blanket consent onboarding flow (12 hours)
- [ ] **TICKET-004**: Build consent mutation & tracking (4 hours)
- [ ] **TICKET-005**: Build email event adapter (8 hours)
- [ ] **TICKET-006**: Build calendar event adapter (8 hours)
- [ ] **TICKET-007**: Build detector base classes & registry (12 hours)
- [ ] **TICKET-008**: Implement meeting prep detector (12 hours)
- [ ] **TICKET-009**: Build policy gateway with tier enforcement (8 hours)
- [ ] **TICKET-010**: Build Slack delivery channel (8 hours)
- [ ] **TICKET-011**: End-to-end meeting prep integration test (6 hours)

**Total Week 1:** 89 hours (11 days at 8h/day, or 2 engineers for 1 week)

### Week 2: Follow-Ups + Feedback + Admin (Days 8-14)

- [ ] **TICKET-012**: Implement follow-up nudge detector (12 hours)
- [ ] **TICKET-013**: Build email draft generator (8 hours)
- [ ] **TICKET-014**: Build Gmail draft creation (6 hours)
- [ ] **TICKET-015**: Build feedback collection (Slack buttons) (6 hours)
- [ ] **TICKET-016**: Build feedback analytics queries (6 hours)
- [ ] **TICKET-017**: Build admin permission system (6 hours)
- [ ] **TICKET-018**: Build admin dashboard UI (20 hours)
- [ ] **TICKET-019**: Build feedback anonymization cron (4 hours)
- [ ] **TICKET-020**: End-to-end feedback flow test (4 hours)

**Total Week 2:** 72 hours (9 days at 8h/day, or 2 engineers for 1 week)

### Week 3: Custom Detectors + Billing (Days 15-21)

- [ ] **TICKET-021**: Build custom detector builder form (20 hours)
- [ ] **TICKET-022**: Build custom detector execution engine (12 hours)
- [ ] **TICKET-023**: Build detector template library (8 hours)
- [ ] **TICKET-024**: Set up Stripe integration (12 hours)
- [ ] **TICKET-025**: Build upgrade prompts (8 hours)
- [ ] **TICKET-026**: Build billing dashboard (6 hours)
- [ ] **TICKET-027**: Custom detector end-to-end test (6 hours)
- [ ] **TICKET-028**: Performance & load testing (8 hours)
- [ ] **TICKET-029**: Documentation & user guide (6 hours)
- [ ] **TICKET-030**: Launch preparation & rollout (8 hours)

**Total Week 3:** 94 hours (12 days at 8h/day, or 2 engineers for 1.5 weeks)

---

## 🚀 Next Steps (In Priority Order)

### Immediate (This Week)

1. **Import schema to main schema.ts**
   ```typescript
   // convex/schema.ts
   import * as proactiveSchema from "./domains/proactive/schema";

   export default defineSchema({
     ...authTables,
     ...emailLabels,
     // ... existing tables

     // Proactive tables
     events: proactiveSchema.events,
     opportunities: proactiveSchema.opportunities,
     proactiveActions: proactiveSchema.proactiveActions,
     detectorRuns: proactiveSchema.detectorRuns,
     userProactiveSettings: proactiveSchema.userProactiveSettings,
     proactiveFeedbackLabels: proactiveSchema.proactiveFeedbackLabels,
     customDetectors: proactiveSchema.customDetectors,
     adminUsers: proactiveSchema.adminUsers,
     subscriptions: proactiveSchema.subscriptions,
     usageTracking: proactiveSchema.usageTracking,
     userConsents: proactiveSchema.userConsents,
   });
   ```

2. **Deploy schema**
   ```bash
   npx convex deploy
   ```

3. **Seed initial admin user**
   ```bash
   npx convex run domains/proactive/seedAdmins:seedInitialAdmins --prod
   ```

4. **Follow tickets in order** (TICKET-001 through TICKET-030)

### Short Term (Next 2 Weeks)

5. **Complete Week 1 tickets** (Foundation)
   - Focus on: Schema, Consent, Event Adapters, Detector Framework, Meeting Prep
   - Deliverable: End-to-end meeting prep working

6. **Complete Week 2 tickets** (Follow-Ups + Feedback)
   - Focus on: Follow-up detector, Email drafts, Feedback system, Admin dashboard
   - Deliverable: Feedback loop functional

### Medium Term (Weeks 3-4)

7. **Complete Week 3 tickets** (Custom Detectors + Billing)
   - Focus on: Detector builder, Stripe integration, Templates
   - Deliverable: Full premium feature set

8. **Internal Alpha Launch**
   - 10 internal users
   - Daily feedback sessions
   - Bug fixes and iteration

### Long Term (Month 2+)

9. **Closed Beta** (50 power users)
10. **Open Beta** (all users opt-in)
11. **General Availability** (default on for new users)

---

## 📊 Success Metrics Tracking

### 30-Day Targets (After GA)

| Metric | Free Tier | Paid Tier |
|--------|-----------|-----------|
| Adoption rate | 60% enable proactive | 80% create custom detector |
| Useful rate | >50% | >65% |
| False positive | <15% | <10% |
| Retention | 70% active after 30d | 85% active after 30d |
| Upgrade rate | 15% → paid | - |

---

## 🎯 Feature Completeness

| Feature | Design | Schema | Backend | Frontend | Testing | Status |
|---------|--------|--------|---------|----------|---------|--------|
| **Core System** | ✅ | ✅ | ❌ | ❌ | ❌ | 40% |
| Events Table | ✅ | ✅ | ❌ | N/A | ❌ | 50% |
| Opportunities | ✅ | ✅ | ❌ | ❌ | ❌ | 40% |
| Policy Gateway | ✅ | ✅ | ❌ | ❌ | ❌ | 40% |
| **Meeting Prep** | ✅ | ✅ | ❌ | ❌ | ❌ | 40% |
| **Follow-Up Nudges** | ✅ | ✅ | ❌ | ❌ | ❌ | 40% |
| **Daily Brief** | ✅ | ✅ | ❌ | ❌ | ❌ | 40% |
| **Custom Detectors** | ✅ | ✅ | ❌ | ✅ | ❌ | 60% |
| Detector Builder | ✅ | ✅ | ❌ | ✅ | ❌ | 60% |
| Template Library | ✅ | ✅ | ❌ | ❌ | ❌ | 40% |
| **Admin Dashboard** | ✅ | ✅ | ❌ | ✅ | ❌ | 60% |
| Feedback Analytics | ✅ | ✅ | ❌ | ✅ | ❌ | 60% |
| **Billing** | ✅ | ✅ | ❌ | ❌ | ❌ | 40% |
| Stripe Integration | ✅ | ✅ | ❌ | ❌ | ❌ | 40% |
| Upgrade Prompts | ✅ | ✅ | ❌ | ❌ | ❌ | 40% |
| **Consent & Onboarding** | ✅ | ✅ | ❌ | ❌ | ❌ | 40% |

**Overall Completion:** 45% (Design + Schema done, Implementation pending)

---

## 💡 Tips for Implementation

1. **Follow tickets sequentially** - Dependencies matter
2. **Test after each ticket** - Don't accumulate bugs
3. **Use design docs as reference** - All UX flows documented
4. **Ask questions early** - Design decisions already made, but implementation details flexible
5. **Track time** - Estimates are aggressive, pad 20-30%
6. **Parallel work possible** - Frontend + Backend can work simultaneously on different tickets
7. **Start simple** - Get meeting prep working end-to-end before adding more detectors

---

## 🔥 Quick Start Commands

```bash
# 1. Deploy schema
npx convex deploy

# 2. Seed admin user
npx convex run domains/proactive/seedAdmins:seedInitialAdmins --prod

# 3. Start dev server
npm run dev

# 4. Run tests (after implementation)
npm test

# 5. Check admin dashboard
# Navigate to http://localhost:3000/admin/feedback
# Login as hshum2018@gmail.com
```

---

**Status:** Ready to start implementation following TICKET-001 through TICKET-030

**Estimated Total Time:** 3-4 weeks with 2 engineers working full-time

**Next Action:** Begin TICKET-001 (Add core proactive tables to schema)
