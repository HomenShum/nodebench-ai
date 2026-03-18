# NodeBench Proactive System - Implementation Tickets

**Epic:** Proactive Intelligence System
**Timeline:** Weeks 1-3
**Version:** 1.0

---

## Week 1: Foundation + Core Infrastructure

### Sprint 1.1: Database Schema (Days 1-2)

---

#### **TICKET-001: Add Core Proactive Tables to Schema**
**Type:** Backend - Database
**Priority:** P0 (Blocker)
**Points:** 5
**Assignee:** Backend Team

**Description:**
Add 6 core database tables for proactive system: events, opportunities, proactiveActions, detectorRuns, userProactiveSettings, proactiveFeedbackLabels.

**Acceptance Criteria:**
- [ ] `events` table added with all fields and indexes
  - Indexes: by_timestamp, by_eventType, by_source, by_contentHash, by_status, by_actor, by_expires
- [ ] `opportunities` table added with all fields and indexes
  - Indexes: by_type, by_status, by_risk, by_entity, by_detector, by_expires, by_status_expires
- [ ] `proactiveActions` table added with all fields and indexes
  - Indexes: by_opportunity, by_status, by_type, by_mode
- [ ] `detectorRuns` table added with all fields and indexes
  - Indexes: by_detector, by_status
- [ ] `userProactiveSettings` table added
  - Index: by_user
- [ ] `proactiveFeedbackLabels` table added
  - Indexes: by_opportunity, by_user, by_type, by_detector, by_reviewed
- [ ] All validation rules configured (v.string(), v.number(), v.union(), etc.)
- [ ] Schema deploys successfully with `npx convex deploy`
- [ ] No breaking changes to existing tables

**Files to Create:**
- `convex/domains/proactive/schema.ts` (export tables)
- Update `convex/schema.ts` (import and add to schema)

**Dependencies:** None

**Testing:**
```bash
# Deploy schema
npx convex deploy

# Verify tables exist
npx convex functions list | grep proactive
```

**Estimated Time:** 6 hours

---

#### **TICKET-002: Add Premium Feature Tables (Custom Detectors, Billing)**
**Type:** Backend - Database
**Priority:** P0 (Blocker)
**Points:** 5
**Assignee:** Backend Team

**Description:**
Add 4 additional tables for premium features: customDetectors, adminUsers, subscriptions, usageTracking, userConsents.

**Acceptance Criteria:**
- [ ] `customDetectors` table added
  - Fields: detectorId, userId, name, triggerType, eventTrigger, scheduleTrigger, thresholdTrigger, conditions, actions, rateLimit, priority, status, errorMessage, triggerCount, lastTriggeredAt
  - Indexes: by_user, by_user_status, by_triggerType
- [ ] `adminUsers` table added
  - Fields: userId, email, role, permissions, invitedBy
  - Indexes: by_email, by_userId
- [ ] `subscriptions` table added
  - Fields: userId, tier, status, stripeSubscriptionId, stripeCustomerId, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, trialEndsAt
  - Indexes: by_user, by_stripe_customer, by_status
- [ ] `usageTracking` table added
  - Fields: userId, month, proactiveNotifications, customDetectorsUsed, apiCallsMade, lastResetAt
  - Index: by_user_month
- [ ] `userConsents` table added
  - Fields: userId, consentType, granted, grantedAt, revokedAt, ipAddress, userAgent, version
  - Indexes: by_user, by_user_type
- [ ] Schema deploys successfully
- [ ] Seed initial admin user (hshum2018@gmail.com)

**Files to Create:**
- Update `convex/domains/proactive/schema.ts`
- `convex/domains/proactive/seedAdmins.ts` (seed admin users)

**Dependencies:** TICKET-001

**Testing:**
```bash
# Deploy schema
npx convex deploy

# Seed admin users
npx convex run domains/proactive/seedAdmins:seedInitialAdmins --prod
```

**Estimated Time:** 5 hours

---

### Sprint 1.2: Consent & Onboarding (Days 3-4)

---

#### **TICKET-003: Build Blanket Consent Onboarding Flow (Frontend)**
**Type:** Frontend - React
**Priority:** P0 (Blocker)
**Points:** 8
**Assignee:** Frontend Team

**Description:**
Create 5-step onboarding flow for proactive features with blanket consent collection.

**Acceptance Criteria:**
- [ ] Step 1: Welcome screen explaining proactive features
- [ ] Step 2: Terms & Privacy with consent checkbox
  - Links to Terms of Service and Privacy Policy
  - Cannot proceed without checking box
- [ ] Step 3: Feature selection (optional toggles for each detector)
  - Default: Meeting Prep, Follow-Ups, Daily Brief enabled
  - CRM, Email Auto-Filing disabled (require integrations)
- [ ] Step 4: Preferences configuration
  - Quiet hours (default 10pm-7am)
  - Rate limit (default 10/day)
  - Delivery channel (Slack/Email/Both)
- [ ] Step 5: Success confirmation
  - "You're all set!" message
  - Link to dashboard and settings
- [ ] All steps have proper validation
- [ ] User can go back and forth between steps
- [ ] Progress indicator shows current step (1/5, 2/5, etc.)
- [ ] Mobile responsive
- [ ] Animations/transitions between steps

**Files to Create:**
- `src/features/proactive/views/ProactiveOnboarding.tsx` (main component)
- `src/features/proactive/components/onboarding/WelcomeStep.tsx`
- `src/features/proactive/components/onboarding/ConsentStep.tsx`
- `src/features/proactive/components/onboarding/FeaturesStep.tsx`
- `src/features/proactive/components/onboarding/PreferencesStep.tsx`
- `src/features/proactive/components/onboarding/SuccessStep.tsx`
- `src/features/proactive/hooks/useOnboardingState.ts` (state management)

**Dependencies:** TICKET-002 (userConsents table)

**Design Reference:** See `docs/PROACTIVE_SYSTEM_ADDENDUM.md` Section 4.1

**Testing:**
- [ ] New user sees onboarding on first login
- [ ] Cannot skip consent step
- [ ] All preferences saved correctly
- [ ] Redirect to dashboard after completion

**Estimated Time:** 12 hours

---

#### **TICKET-004: Build Consent Mutation & Tracking (Backend)**
**Type:** Backend - Convex
**Priority:** P0 (Blocker)
**Points:** 3
**Assignee:** Backend Team

**Description:**
Create mutations for recording user consent and tracking onboarding completion.

**Acceptance Criteria:**
- [ ] `grantConsent` mutation created
  - Records consent in `userConsents` table
  - Captures IP address, user agent, timestamp
  - Records terms version accepted
- [ ] `revokeConsent` mutation created
  - Marks consent as revoked
  - Disables all proactive features
  - Triggers data cleanup
- [ ] `checkConsent` query created
  - Returns whether user has granted consent
  - Returns consent details (when, which version)
- [ ] `completeOnboarding` mutation created
  - Creates initial `userProactiveSettings` record
  - Sets default preferences
  - Marks onboarding as complete
- [ ] All mutations validate user authentication
- [ ] Proper error handling for edge cases

**Files to Create:**
- `convex/domains/proactive/consentMutations.ts`
- `convex/domains/proactive/consentQueries.ts`

**Dependencies:** TICKET-002

**Testing:**
```typescript
// Test consent flow
const consentId = await ctx.runMutation(api.proactive.grantConsent, {
  ipAddress: "127.0.0.1",
  userAgent: "Mozilla/5.0...",
  version: "1.0",
});

const hasConsent = await ctx.runQuery(api.proactive.checkConsent);
expect(hasConsent).toBe(true);
```

**Estimated Time:** 4 hours

---

### Sprint 1.3: Event Ingestion (Days 3-4)

---

#### **TICKET-005: Build Email Event Adapter**
**Type:** Backend - Integration
**Priority:** P1 (High)
**Points:** 5
**Assignee:** Backend Team

**Description:**
Create adapter to convert email threads/messages into proactive events.

**Acceptance Criteria:**
- [ ] `emailToEvent` function created
  - Extracts entities from email (sender, recipients, mentioned companies/people)
  - Stores full email content in `sourceArtifacts`
  - Creates `event` record with pointer to artifact
  - Classifies PII correctly (emails always have PII)
  - Generates content hash for deduplication
  - Sets retention class based on importance
- [ ] `processNewEmails` cron created
  - Runs every 5 minutes
  - Queries `emailThreads` for new threads since last sync
  - Converts each to event
  - Updates `lastSyncedAt` timestamp
- [ ] Entity extraction implemented
  - Email addresses → person entities
  - Company names from signatures → company entities
  - Uses existing NER or simple regex
- [ ] Handles errors gracefully (malformed emails, missing fields)
- [ ] Deduplication works (same email not processed twice)

**Files to Create:**
- `convex/domains/proactive/adapters/emailEventAdapter.ts`
- `convex/crons/proactiveEmailIngestion.ts`

**Dependencies:** TICKET-001, existing email system

**Testing:**
```typescript
// Test email to event conversion
const thread = await ctx.db.query("emailThreads").first();
const eventId = await emailToEvent(ctx, thread);
const event = await ctx.db.get(eventId);

expect(event.eventType).toBe("email_received");
expect(event.entities).toHaveLength(2); // sender + recipient
expect(event.contentPointer).toBeDefined();
```

**Estimated Time:** 8 hours

---

#### **TICKET-006: Build Calendar Event Adapter**
**Type:** Backend - Integration
**Priority:** P1 (High)
**Points:** 5
**Assignee:** Backend Team

**Description:**
Create adapter to convert calendar events into proactive events.

**Acceptance Criteria:**
- [ ] `calendarToEvent` function created
  - Extracts meeting details (title, attendees, start time, duration)
  - Stores full calendar artifact in `sourceArtifacts`
  - Creates `event` record with pointer
  - Classifies based on meeting type (external vs internal)
  - Sets retention class (important meetings = extended, 1:1s = standard)
- [ ] `processCalendarEvents` cron created
  - Runs every 15 minutes
  - Queries `calendarArtifacts` for events in next 24 hours
  - Converts each to event
  - Marks as processed to avoid duplicates
- [ ] Attendee entity extraction
  - Email addresses → person entities
  - Company domains → company entities
  - Confidence scoring based on known contacts
- [ ] Meeting importance classification
  - 2+ external attendees = important
  - 1:1 with VIP = important
  - Internal meetings = standard
- [ ] Event type detection
  - Meeting created, updated, cancelled
  - Meeting started, ended (for follow-ups)

**Files to Create:**
- `convex/domains/proactive/adapters/calendarEventAdapter.ts`
- `convex/crons/proactiveCalendarIngestion.ts`

**Dependencies:** TICKET-001, existing calendar system

**Testing:**
```typescript
// Test calendar to event conversion
const calArtifact = await ctx.db.query("calendarArtifacts").first();
const eventId = await calendarToEvent(ctx, calArtifact);
const event = await ctx.db.get(eventId);

expect(event.eventType).toBe("calendar_event_created");
expect(event.entities.length).toBeGreaterThan(0);
expect(event.metadata.startTime).toBeDefined();
```

**Estimated Time:** 8 hours

---

### Sprint 1.4: Detector Framework (Days 5-7)

---

#### **TICKET-007: Build Detector Base Classes & Registry**
**Type:** Backend - Framework
**Priority:** P0 (Blocker)
**Points:** 8
**Assignee:** Backend Team

**Description:**
Create base classes and registry system for detectors (both pre-configured and custom).

**Acceptance Criteria:**
- [ ] `StreamingDetector` abstract class created
  - `detect(input: DetectorInput): Promise<DetectorOutput>` method
  - `shouldProcess(event: EventDoc): boolean` filter method
  - Properties: name, version, description
- [ ] `BatchDetector` abstract class created
  - `detect(input: DetectorInput): Promise<DetectorOutput>` method
  - `fetchEvents(ctx: QueryCtx): Promise<EventDoc[]>` method
  - `schedule` property (cron expression)
- [ ] Detector registry implemented
  - `registerDetector(detector: Detector)` function
  - `getDetector(name: string): Detector` function
  - `listDetectors(): Detector[]` function
  - Separate registries for pre-configured vs custom
- [ ] Detector execution wrapper
  - Creates `detectorRun` record
  - Tracks performance (duration, tokens, cost)
  - Handles errors and retries
  - Updates run status on completion
- [ ] Input/output type definitions
  - `DetectorInput` interface
  - `DetectorOutput` interface
  - `OpportunityCandidate` interface
- [ ] Validation for detector configuration
  - Name uniqueness
  - Valid cron expressions
  - Required methods implemented

**Files to Create:**
- `convex/domains/proactive/detectors/types.ts`
- `convex/domains/proactive/detectors/StreamingDetector.ts`
- `convex/domains/proactive/detectors/BatchDetector.ts`
- `convex/domains/proactive/detectors/registry.ts`
- `convex/domains/proactive/detectors/executor.ts`

**Dependencies:** TICKET-001

**Testing:**
```typescript
// Test detector registration
class TestDetector extends StreamingDetector {
  name = "test_detector";
  version = "1.0.0";

  async detect(input) {
    return { opportunities: [], metrics: {...} };
  }
}

registerDetector(new TestDetector());
const detector = getDetector("test_detector");
expect(detector).toBeDefined();
```

**Estimated Time:** 12 hours

---

#### **TICKET-008: Implement Meeting Prep Detector**
**Type:** Backend - Feature
**Priority:** P1 (High)
**Points:** 8
**Assignee:** Backend Team

**Description:**
Implement first pre-configured detector for meeting prep packs.

**Acceptance Criteria:**
- [ ] `MeetingPrepDetector` class created (extends BatchDetector)
  - Schedule: Every 15 minutes
  - Fetches calendar events 2-24 hours in the future
  - Filters for meetings with 2+ external attendees
- [ ] Attendee dossier check implemented
  - Queries existing documents for each attendee
  - Identifies attendees without dossiers
  - Skips if all attendees have recent dossiers (<7 days old)
- [ ] Opportunity creation
  - Type: "meeting_prep"
  - Trigger: "Meeting in X hours"
  - Evidence: Calendar event pointer + attendee list
  - Impact: 15 min time saved, 80% confidence
  - Actions: Create prep doc with dossiers
  - Risk level: Low (read-only research)
  - Expires at: Meeting start time
- [ ] Deduplication logic
  - Don't create duplicate opportunities for same meeting
  - Check if prep doc already exists
- [ ] Performance optimized
  - Runs in < 5 seconds for 20 upcoming meetings
  - Uses indexes efficiently

**Files to Create:**
- `convex/domains/proactive/detectors/meetingPrepDetector.ts`
- `convex/domains/proactive/detectors/index.ts` (export all detectors)

**Dependencies:** TICKET-006, TICKET-007

**Testing:**
```typescript
// Test meeting prep detection
const detector = new MeetingPrepDetector();
const events = await detector.fetchEvents(ctx);
const result = await detector.detect({ events, userId, timestamp: Date.now() });

expect(result.opportunities.length).toBeGreaterThan(0);
expect(result.opportunities[0].type).toBe("meeting_prep");
expect(result.opportunities[0].expiresAt).toBeDefined();
```

**Estimated Time:** 12 hours

---

#### **TICKET-009: Build Policy Gateway with Tier Enforcement**
**Type:** Backend - Authorization
**Priority:** P0 (Blocker)
**Points:** 5
**Assignee:** Backend Team

**Description:**
Implement policy gateway that checks user settings, tier limits, and permissions before allowing proactive actions.

**Acceptance Criteria:**
- [ ] `evaluatePolicy` function created
  - Checks if user has proactive enabled (master toggle)
  - Checks if specific feature is enabled
  - Checks if in quiet hours
  - Checks rate limits (daily/weekly)
  - Checks action mode permissions (suggest/draft/execute)
  - Checks tier limits (free = 50/month, paid = unlimited)
  - Returns PolicyEvaluationResult
- [ ] Tier limit enforcement
  - Queries `usageTracking` for current month
  - Queries `subscriptions` for user tier
  - Free tier: Block if >= 50 notifications this month
  - Paid tier: Allow unlimited
  - Returns upgrade prompt if blocked
- [ ] Risk-based approval requirements
  - High risk + execute mode → always requires approval
  - Medium risk + user setting "auto-approve medium" → no approval
  - Low risk → no approval (unless user configured)
- [ ] Quiet hours check
  - Parses user timezone
  - Checks if current time is between quiet hours
  - Exception: CRITICAL alerts bypass quiet hours
- [ ] Mode suggestions
  - Suggests safest mode based on risk + settings
  - e.g., High risk → suggest, Medium risk + draft enabled → draft

**Files to Create:**
- `convex/domains/proactive/policyGateway.ts`
- `convex/domains/proactive/tierEnforcement.ts`

**Dependencies:** TICKET-002, TICKET-001

**Testing:**
```typescript
// Test policy evaluation
const result = await evaluatePolicy(ctx, opportunity, "execute");

expect(result.allowed).toBe(true);
expect(result.requiresApproval).toBe(false);
expect(result.blockedReasons).toHaveLength(0);

// Test tier limit
const freeUserResult = await evaluatePolicy(ctx, opportunity, "suggest");
if (freeUserUsage >= 50) {
  expect(freeUserResult.allowed).toBe(false);
  expect(freeUserResult.blockedReasons).toContain("Free tier limit reached");
}
```

**Estimated Time:** 8 hours

---

#### **TICKET-010: Build Slack Delivery Channel**
**Type:** Backend - Integration
**Priority:** P1 (High)
**Points:** 5
**Assignee:** Backend Team

**Description:**
Implement Slack DM delivery for proactive opportunities with interactive buttons.

**Acceptance Criteria:**
- [ ] `deliverToSlack` function created
  - Formats opportunity as Slack blocks
  - Includes header, why now, impact, risk level
  - Adds action buttons (approve, dismiss, view details)
  - Sends DM to user's Slack account
  - Returns delivery result (success/failure + message ID)
- [ ] Interactive button handlers
  - `approve_action_{actionId}` → executes action
  - `dismiss_opportunity_{opportunityId}` → marks dismissed
  - `view_details_{opportunityId}` → opens modal with full details
  - Updates opportunity status in database
  - Collects implicit feedback (button clicks)
- [ ] Message formatting
  - Professional, concise copy
  - Emojis for visual clarity (💡, ✉️, 📅, etc.)
  - Clear call-to-action
  - Evidence links formatted nicely
- [ ] Error handling
  - Retry logic for failed sends (3 retries)
  - Fallback to in-app notification if Slack fails
  - Logs errors for debugging
- [ ] Rate limiting
  - Respects Slack API rate limits
  - Batches messages if needed
  - Queues for retry if rate limited

**Files to Create:**
- `convex/domains/proactive/delivery/slackDelivery.ts`
- `convex/domains/proactive/delivery/slackInteractions.ts` (button handlers)

**Dependencies:** TICKET-001, existing Slack integration

**Testing:**
```typescript
// Test Slack delivery
const result = await deliverToSlack(ctx, opportunity, actions);

expect(result.success).toBe(true);
expect(result.messageId).toBeDefined();

// Verify message was sent
const slackMessage = await fetchSlackMessage(result.messageId);
expect(slackMessage.blocks).toBeDefined();
expect(slackMessage.blocks[0].type).toBe("header");
```

**Estimated Time:** 8 hours

---

#### **TICKET-011: End-to-End Meeting Prep Integration Test**
**Type:** Testing - Integration
**Priority:** P1 (High)
**Points:** 3
**Assignee:** QA/Backend Team

**Description:**
Create end-to-end test that verifies complete meeting prep flow from calendar event to Slack notification.

**Acceptance Criteria:**
- [ ] Test creates sample calendar event (meeting tomorrow with 3 attendees)
- [ ] Event adapter converts to proactive event
- [ ] Meeting prep detector runs and creates opportunity
- [ ] Policy gateway evaluates and approves
- [ ] Slack delivery sends notification
- [ ] Verify all database records created correctly
  - Event record
  - Opportunity record
  - Action record
  - Detector run record
  - Usage tracking incremented
- [ ] Verify Slack message format
- [ ] Test button interactions (approve, dismiss)
- [ ] Test tier enforcement (free user at 50/month limit)
- [ ] Test quiet hours (notification blocked between 10pm-7am)
- [ ] Performance: Complete flow < 10 seconds

**Files to Create:**
- `convex/__tests__/e2e/meetingPrepFlow.test.ts`

**Dependencies:** TICKET-005 through TICKET-010

**Testing:**
```typescript
// Full E2E test
test("Meeting prep flow - calendar to Slack", async () => {
  // 1. Create calendar event
  const eventId = await createTestCalendarEvent({
    summary: "Investor Meeting",
    attendees: ["sarah@acme.com", "tom@acme.com"],
    startTime: Date.now() + 4 * 60 * 60 * 1000, // 4 hours from now
  });

  // 2. Run calendar ingestion
  await runCalendarIngestion();

  // 3. Run meeting prep detector
  await runDetector("meeting_prep_detector");

  // 4. Verify opportunity created
  const opportunity = await ctx.db.query("opportunities")
    .filter(q => q.eq(q.field("type"), "meeting_prep"))
    .first();
  expect(opportunity).toBeDefined();

  // 5. Run delivery
  await deliverOpportunity(opportunity._id);

  // 6. Verify Slack message sent
  const delivery = opportunity.deliveredVia.find(d => d.channel === "slack");
  expect(delivery.messageId).toBeDefined();
});
```

**Estimated Time:** 6 hours

---

## Week 2: Follow-Ups + Feedback + Admin Dashboard

### Sprint 2.1: Follow-Up Detector (Days 8-9)

---

#### **TICKET-012: Implement Follow-Up Nudge Detector**
**Type:** Backend - Feature
**Priority:** P1 (High)
**Points:** 8
**Assignee:** Backend Team

**Description:**
Implement detector that identifies email threads needing replies and creates follow-up nudges.

**Acceptance Criteria:**
- [ ] `FollowUpDetector` class created (extends BatchDetector)
  - Schedule: Every hour
  - Fetches email threads with last message > 3 days ago
  - Filters for important threads (VIP sender, marked important)
- [ ] "Needs reply" heuristics implemented
  - Thread ends with question mark
  - Last message not from user
  - Keywords: "waiting for you", "let me know", "thoughts?", "when can"
  - Not archived or dismissed by user
  - From VIP contact or marked important
- [ ] VIP contact detection
  - Checks if sender is in user's watchlist
  - Checks if sender is investor, key customer, etc. (entity type)
  - Checks email frequency (regular correspondent = VIP)
- [ ] Opportunity creation
  - Type: "follow_up"
  - Trigger: "No reply in X days"
  - Evidence: Email thread pointer + excerpt of last message
  - Impact: "Don't ghost key relationship"
  - Actions: Draft reply (3 variants)
  - Risk level: Low (draft only, no sending)
  - Expires: 7 days (if still no reply after 7 days, assume handled)
- [ ] Deduplication
  - Don't create multiple nudges for same thread
  - Skip if user already replied (check email sync)
  - Skip if thread archived/deleted
- [ ] Configurable delay
  - Default: 3 days
  - User can adjust in settings (1-7 days)

**Files to Create:**
- `convex/domains/proactive/detectors/followUpDetector.ts`

**Dependencies:** TICKET-005, TICKET-007

**Testing:**
```typescript
// Test follow-up detection
const detector = new FollowUpDetector();
const events = await detector.fetchEvents(ctx);
const result = await detector.detect({ events, userId, timestamp: Date.now() });

const followUpOpp = result.opportunities.find(o => o.type === "follow_up");
expect(followUpOpp).toBeDefined();
expect(followUpOpp.trigger.whyNow).toContain("No reply in 3 days");
```

**Estimated Time:** 12 hours

---

#### **TICKET-013: Build Email Draft Generator**
**Type:** Backend - AI
**Priority:** P1 (High)
**Points:** 5
**Assignee:** Backend/AI Team

**Description:**
Implement LLM-powered email draft generation with 3 variants (short/normal/assertive).

**Acceptance Criteria:**
- [ ] `generateEmailDraft` function created
  - Takes email thread context
  - Takes meeting notes if applicable
  - Generates 3 variants using Claude 3.5 Sonnet
  - Each variant has: subject, body, tone label
- [ ] Short variant (3-5 sentences)
  - Professional but brief
  - Gets to the point quickly
  - Example: "Hi Sarah, I'll send those case studies by Friday. Talk soon!"
- [ ] Normal variant (2 paragraphs)
  - Balanced professional tone
  - Includes context and next steps
  - Example: "Hi Sarah, Thanks for meeting yesterday. Next steps: [list]. Looking forward to moving this forward."
- [ ] Assertive variant (formal, structured)
  - Clear commitments section
  - Action items for both parties
  - Follow-up plan
  - Example: "Our commitments: [list]. Your commitments: [list]. I'll check in on [date]."
- [ ] Prompt engineering
  - Extracts key context from thread
  - Identifies next steps from meeting notes
  - Maintains user's writing style (learns from past emails)
  - Avoids generic fluff
- [ ] Quality validation
  - Checks for hallucinations (only mention things in context)
  - Checks for appropriate length
  - Checks for clear call-to-action
  - Re-generates if quality too low
- [ ] Token tracking
  - Records tokens used
  - Estimates cost
  - Stays within budget

**Files to Create:**
- `convex/domains/proactive/generators/emailDraftGenerator.ts`
- `convex/domains/proactive/generators/promptTemplates.ts` (LLM prompts)

**Dependencies:** TICKET-012, existing LLM integration

**Testing:**
```typescript
// Test email draft generation
const drafts = await generateEmailDraft(ctx, {
  threadId: emailThread._id,
  context: "Meeting about partnership",
  tone: "professional",
});

expect(drafts).toHaveLength(3);
expect(drafts[0].variant).toBe("short");
expect(drafts[1].variant).toBe("normal");
expect(drafts[2].variant).toBe("assertive");
expect(drafts[0].body.length).toBeLessThan(drafts[1].body.length);
```

**Estimated Time:** 8 hours

---

#### **TICKET-014: Build Gmail Draft Creation**
**Type:** Backend - Integration
**Priority:** P1 (High)
**Points:** 3
**Assignee:** Backend Team

**Description:**
Implement Gmail API integration to create email drafts in user's Gmail account.

**Acceptance Criteria:**
- [ ] `createGmailDraft` function created
  - Authenticates with Gmail API using user's OAuth token
  - Creates draft with subject, body, recipients
  - If reply: threads draft to existing conversation
  - Returns draft ID and web link
- [ ] OAuth token refresh
  - Handles expired tokens
  - Refreshes automatically if needed
  - Errors gracefully if refresh fails
- [ ] Draft formatting
  - Preserves user's email signature
  - Proper HTML formatting
  - Inline images if applicable
- [ ] Thread handling
  - If follow-up to existing thread: uses threadId
  - Preserves conversation history
  - Correct reply-to headers
- [ ] Error handling
  - Rate limit errors (retry with backoff)
  - Auth errors (prompt user to reconnect)
  - Network errors (retry 3 times)
- [ ] Notification
  - Sends Slack notification when draft created
  - Includes link to open draft in Gmail
  - Includes "Send Now" button for immediate send

**Files to Create:**
- `convex/domains/proactive/integrations/gmailDrafts.ts`

**Dependencies:** TICKET-013, existing Gmail OAuth

**Testing:**
```typescript
// Test Gmail draft creation
const draft = await createGmailDraft(ctx, {
  userId,
  to: ["sarah@acme.com"],
  subject: "Following up",
  body: draftContent,
  threadId: emailThread.gmailThreadId,
});

expect(draft.id).toBeDefined();
expect(draft.webLink).toContain("mail.google.com");

// Verify draft in Gmail
const gmailDraft = await fetchGmailDraft(draft.id);
expect(gmailDraft.message.subject).toBe("Following up");
```

**Estimated Time:** 6 hours

---

### Sprint 2.2: Feedback System (Days 10-11)

---

#### **TICKET-015: Build Feedback Collection (Slack Buttons)**
**Type:** Backend - Integration
**Priority:** P1 (High)
**Points:** 3
**Assignee:** Backend Team

**Description:**
Implement interactive Slack buttons for collecting user feedback on proactive opportunities.

**Acceptance Criteria:**
- [ ] All Slack messages include feedback buttons
  - 👍 Useful
  - 👎 Not Useful
  - ✉️ Provide Details (opens modal)
- [ ] "Useful" button handler
  - Records feedback: type="useful"
  - Updates message to show "Thanks for your feedback!"
  - Increments useful count in analytics
- [ ] "Not Useful" button handler
  - Opens modal with reason checkboxes:
    - [ ] Too frequent
    - [ ] Wrong timing
    - [ ] Missing context
    - [ ] Not relevant
    - [ ] Other (text field)
  - Records feedback with reason
  - Updates message to show "Thanks, we'll improve!"
- [ ] Feedback modal
  - 4-5 reason checkboxes
  - Optional free-text field
  - Submit button
  - Cancel button
- [ ] Feedback mutation
  - Creates `proactiveFeedbackLabel` record
  - Includes: opportunityId, userId, feedbackType, reason, specificIssues
  - Captures context snapshot (detector name/version, risk level, opportunity type)
  - Timestamps properly
- [ ] Prevents duplicate feedback
  - User can only provide feedback once per opportunity
  - Button disabled after submission
  - Shows "Feedback already provided" if clicked again

**Files to Create:**
- `convex/domains/proactive/feedbackMutations.ts`
- Update `convex/domains/proactive/delivery/slackInteractions.ts` (add feedback handlers)

**Dependencies:** TICKET-010

**Testing:**
```typescript
// Test feedback collection
await handleSlackInteraction(ctx, {
  actionId: "feedback_useful_opp123",
  userId,
  messageTs: "1234567890.123456",
});

const feedback = await ctx.db.query("proactiveFeedbackLabels")
  .filter(q => q.eq(q.field("opportunityId"), "opp123"))
  .first();

expect(feedback.feedbackType).toBe("useful");
expect(feedback.reviewed).toBe(false);
```

**Estimated Time:** 6 hours

---

#### **TICKET-016: Build Feedback Analytics Queries**
**Type:** Backend - Analytics
**Priority:** P2 (Medium)
**Points:** 3
**Assignee:** Backend Team

**Description:**
Create queries for aggregating and analyzing feedback data (for admin dashboard).

**Acceptance Criteria:**
- [ ] `getFeedbackStats` query created
  - Aggregates feedback by type (useful/not useful/no feedback)
  - Groups by time period (day/week/month)
  - Calculates useful rate, false positive rate
  - Returns trending data (change over time)
- [ ] `getFeedbackByDetector` query created
  - Groups feedback by detector name
  - Shows useful rate per detector
  - Identifies best and worst performing detectors
  - Shows sample feedback entries
- [ ] `getTopComplaints` query created
  - Aggregates "not useful" feedback by reason
  - Groups by detector
  - Shows count and examples for each complaint
  - Sorted by frequency
- [ ] `getRecentFeedback` query created
  - Returns paginated list of recent feedback
  - Includes user, opportunity details, timestamp
  - Allows filtering by detector, date range, feedback type
  - Includes offset/limit for pagination
- [ ] All queries validate admin permissions
  - Check if user is in `adminUsers` table
  - Check if user has "view_feedback" permission
  - Return error if unauthorized

**Files to Create:**
- `convex/domains/proactive/feedbackAnalytics.ts`
- `convex/domains/proactive/adminQueries.ts` (admin permission checks)

**Dependencies:** TICKET-015, TICKET-002

**Testing:**
```typescript
// Test feedback analytics
const stats = await ctx.runQuery(api.proactive.getFeedbackStats, {
  startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
  endDate: Date.now(),
});

expect(stats.total).toBeGreaterThan(0);
expect(stats.usefulRate).toBeGreaterThan(0);
expect(stats.usefulRate).toBeLessThanOrEqual(1);

// Test permission check
await expect(
  ctx.runQuery(api.proactive.getFeedbackStats, {})
).rejects.toThrow("Unauthorized");
```

**Estimated Time:** 6 hours

---

### Sprint 2.3: Admin Dashboard (Days 12-13)

---

#### **TICKET-017: Build Admin Permission System**
**Type:** Backend - Authorization
**Priority:** P1 (High)
**Points:** 3
**Assignee:** Backend Team

**Description:**
Implement admin user management and permission system for invite-only access.

**Acceptance Criteria:**
- [ ] `seedInitialAdmins` mutation created
  - Seeds hshum2018@gmail.com as owner
  - Adds test accounts as admins
  - Cannot be run twice (idempotent)
- [ ] `inviteAdmin` mutation created (owner only)
  - Adds new email to `adminUsers` table
  - Sets role (admin/viewer)
  - Sets permissions array
  - Sends invite email
- [ ] `revokeAdminAccess` mutation created (owner only)
  - Removes user from `adminUsers`
  - Cannot revoke owner
- [ ] `checkAdminPermission` utility created
  - Checks if user email is in `adminUsers`
  - Checks if user has specific permission
  - Returns true/false
  - Throws error if unauthorized
- [ ] Permission types defined
  - "view_feedback" - View all user feedback
  - "view_analytics" - View aggregated analytics
  - "manage_users" - Invite/revoke admins
  - "manage_detectors" - Pause/adjust detectors
  - "export_data" - Export data to CSV
- [ ] Audit log
  - Records all admin actions
  - Includes: who, what, when, IP address
  - Cannot be deleted (compliance)

**Files to Create:**
- `convex/domains/proactive/seedAdmins.ts`
- `convex/domains/proactive/adminMutations.ts`
- `convex/domains/proactive/adminAuth.ts` (permission checks)

**Dependencies:** TICKET-002

**Testing:**
```typescript
// Seed admins
await ctx.runMutation(api.proactive.seedInitialAdmins);

const admin = await ctx.db.query("adminUsers")
  .withIndex("by_email", q => q.eq("email", "hshum2018@gmail.com"))
  .first();

expect(admin.role).toBe("owner");
expect(admin.permissions).toContain("view_feedback");

// Test permission check
const hasPermission = await checkAdminPermission(ctx, "view_feedback");
expect(hasPermission).toBe(true);
```

**Estimated Time:** 6 hours

---

#### **TICKET-018: Build Admin Dashboard UI (Frontend)**
**Type:** Frontend - React
**Priority:** P1 (High)
**Points:** 13
**Assignee:** Frontend Team

**Description:**
Create admin-only dashboard for viewing all user feedback and analytics.

**Acceptance Criteria:**
- [ ] Admin route protected at `/admin/feedback`
  - Checks if user email is admin
  - Redirects non-admins to 404
  - Shows loading state while checking
- [ ] Overview section
  - Total feedback count (30 days)
  - Useful rate (percentage + chart)
  - Not useful rate (percentage + chart)
  - Trending issues (arrows showing increase/decrease)
- [ ] Filters
  - Date range picker (default: last 30 days)
  - Feedback type dropdown (all/useful/not useful)
  - Detector dropdown (all detectors + custom)
  - User search (email)
  - Apply/Reset buttons
- [ ] Feedback by Detector table
  - Detector name column
  - Total count column
  - Useful % column (color-coded: green >70%, yellow 50-70%, red <50%)
  - Not useful % column
  - Sortable by any column
- [ ] Recent Feedback list
  - Paginated (10 per page)
  - Shows: timestamp, user email, opportunity type, feedback type, comment
  - "View Details" button (opens modal)
  - "Flag for Review" button
  - Infinite scroll or pagination controls
- [ ] Top Complaints section
  - Grouped by complaint reason
  - Count for each reason
  - Most common detector for each reason
  - "View Details" link
- [ ] Actions toolbar
  - "Pause Detector" button
  - "Adjust Thresholds" button
  - "Export CSV" button
  - "Send Update to Users" button
- [ ] Real-time updates
  - New feedback appears without refresh
  - Uses Convex subscriptions
- [ ] Mobile responsive
  - Tables scroll horizontally on mobile
  - Filters collapse into menu
- [ ] Empty states
  - "No feedback yet" when empty
  - Helpful message encouraging users to provide feedback

**Files to Create:**
- `src/features/admin/views/FeedbackDashboard.tsx`
- `src/features/admin/components/OverviewStats.tsx`
- `src/features/admin/components/FeedbackFilters.tsx`
- `src/features/admin/components/DetectorTable.tsx`
- `src/features/admin/components/RecentFeedbackList.tsx`
- `src/features/admin/components/TopComplaints.tsx`
- `src/features/admin/components/ActionsToolbar.tsx`
- `src/features/admin/hooks/useFeedbackData.ts`
- `src/features/admin/hooks/useAdminAuth.ts`

**Design Reference:** See `docs/PROACTIVE_SYSTEM_ADDENDUM.md` Section 2.2

**Dependencies:** TICKET-016, TICKET-017

**Testing:**
- [ ] Admin user can access dashboard
- [ ] Non-admin redirected to 404
- [ ] All filters work correctly
- [ ] Pagination works
- [ ] Export CSV downloads file
- [ ] Real-time updates appear

**Estimated Time:** 20 hours

---

#### **TICKET-019: Build Feedback Anonymization Cron**
**Type:** Backend - Compliance
**Priority:** P2 (Medium)
**Points:** 2
**Assignee:** Backend Team

**Description:**
Create cron job that anonymizes feedback older than 90 days for compliance.

**Acceptance Criteria:**
- [ ] `anonymizeOldFeedback` cron created
  - Runs daily at 3am UTC
  - Queries feedback older than 90 days
  - Removes userId, replaces with "anonymized"
  - Marks as reviewed
  - Sets reviewedAt timestamp
  - Logs count anonymized
- [ ] Preserves aggregated data
  - Keep: feedbackType, reason, detectorName, timestamp
  - Remove: userId, specific user details
  - Purpose: ML learning without PII
- [ ] Idempotent
  - Doesn't re-anonymize already anonymized records
  - Uses `reviewed` flag to track
- [ ] Performance optimized
  - Processes in batches of 100
  - Uses cursor pagination if large volume
  - Completes in < 30 seconds
- [ ] Error handling
  - Logs errors to monitoring
  - Continues processing even if some records fail
  - Retries failed records on next run

**Files to Create:**
- `convex/crons/anonymizeFeedback.ts`

**Dependencies:** TICKET-001

**Testing:**
```typescript
// Test anonymization
const oldFeedback = await ctx.db.insert("proactiveFeedbackLabels", {
  userId,
  feedbackType: "useful",
  createdAt: Date.now() - 100 * 24 * 60 * 60 * 1000, // 100 days ago
  reviewed: false,
});

await anonymizeOldFeedback(ctx);

const anonymized = await ctx.db.get(oldFeedback);
expect(anonymized.userId).toBe("anonymized");
expect(anonymized.reviewed).toBe(true);
expect(anonymized.feedbackType).toBe("useful"); // Preserved
```

**Estimated Time:** 4 hours

---

#### **TICKET-020: End-to-End Feedback Flow Test**
**Type:** Testing - Integration
**Priority:** P2 (Medium)
**Points:** 2
**Assignee:** QA Team

**Description:**
Test complete feedback flow from Slack button click to admin dashboard display.

**Acceptance Criteria:**
- [ ] User receives Slack notification with opportunity
- [ ] User clicks "👎 Not Useful" button
- [ ] Modal opens with reason checkboxes
- [ ] User selects "Wrong timing" and submits
- [ ] Feedback recorded in database
- [ ] Admin dashboard shows new feedback entry
- [ ] Top complaints section updated
- [ ] Detector stats updated
- [ ] After 90 days: feedback anonymized by cron

**Files to Create:**
- `convex/__tests__/e2e/feedbackFlow.test.ts`

**Dependencies:** TICKET-015, TICKET-018, TICKET-019

**Testing:**
```typescript
test("Feedback flow - Slack to admin dashboard", async () => {
  // 1. Create opportunity and deliver to Slack
  const opportunityId = await createTestOpportunity();
  await deliverToSlack(ctx, opportunityId);

  // 2. Simulate Slack button click
  await handleSlackInteraction(ctx, {
    actionId: `feedback_not_useful_${opportunityId}`,
    userId,
  });

  // 3. Submit feedback modal
  await submitFeedbackModal(ctx, {
    opportunityId,
    reason: "wrong_timing",
    comment: "I already replied yesterday",
  });

  // 4. Verify feedback in database
  const feedback = await ctx.db.query("proactiveFeedbackLabels")
    .filter(q => q.eq(q.field("opportunityId"), opportunityId))
    .first();
  expect(feedback.feedbackType).toBe("not_useful");
  expect(feedback.reason).toBe("wrong_timing");

  // 5. Verify admin dashboard shows it
  const adminStats = await ctx.runQuery(api.proactive.getFeedbackStats);
  expect(adminStats.notUseful).toBeGreaterThan(0);
});
```

**Estimated Time:** 4 hours

---

## Week 3: Custom Detector Builder + Billing

### Sprint 3.1: Detector Builder UI (Days 15-17)

---

#### **TICKET-021: Build Custom Detector Builder Form (Frontend)**
**Type:** Frontend - React
**Priority:** P1 (High)
**Points:** 13
**Assignee:** Frontend Team

**Description:**
Create visual detector builder with 6-step form for creating custom detectors.

**Acceptance Criteria:**
- [ ] Step 1: Name detector
  - Text input with validation (1-50 chars, unique)
  - Icon picker (emoji selector)
  - Description field (optional)
- [ ] Step 2: Choose trigger type
  - Radio buttons: Event-based / Time-based / Threshold-based
  - Conditional fields based on selection
- [ ] Step 2a: Event-based trigger
  - Event type dropdown (email, news, calendar, etc.)
  - Keywords input (comma-separated)
  - Entity filter (watchlist/all/specific)
  - Source filter (optional)
- [ ] Step 2b: Time-based trigger
  - Cron expression builder (visual)
  - Or: Simple scheduler (daily/weekly/monthly at time)
  - Timezone selector
- [ ] Step 2c: Threshold-based trigger
  - Metric dropdown (days since contact, entity freshness, etc.)
  - Operator (>, <, =)
  - Value input
  - Check interval (cron)
- [ ] Step 3: Define conditions (optional)
  - "Add Condition" button
  - Field dropdown
  - Operator dropdown
  - Value input
  - Multiple conditions (AND logic)
  - Remove condition button
- [ ] Step 4: Configure actions
  - "Add Action" button
  - Action type dropdown (notification, task, draft, etc.)
  - Action-specific config fields
  - Message template with variables ({{company_name}}, etc.)
  - Preview message
  - Multiple actions supported
- [ ] Step 5: Set schedule & limits
  - Respect quiet hours toggle
  - Deduplicate toggle
  - Rate limit (max per day/week)
  - Priority (low/medium/high)
- [ ] Step 6: Test detector
  - "Run Test" button
  - Shows events that would have triggered in last 7 days
  - Shows how many matches found
  - Preview of notification that would be sent
  - Edit/approve buttons
- [ ] Form validation
  - All required fields checked
  - Cron expressions validated
  - Variable syntax validated
  - Clear error messages
- [ ] Save options
  - "Save as Draft" - saves but doesn't enable
  - "Save & Enable" - saves and activates
  - "Cancel" - discards changes
- [ ] Multi-step navigation
  - Progress indicator (1/6, 2/6, etc.)
  - Back/Next buttons
  - Can jump to any step
  - Draft auto-saved on each step
- [ ] Mobile responsive
  - Form adapts to mobile screens
  - Touch-friendly controls

**Files to Create:**
- `src/features/proactive/views/CustomDetectorBuilder.tsx`
- `src/features/proactive/components/detector-builder/NameStep.tsx`
- `src/features/proactive/components/detector-builder/TriggerStep.tsx`
- `src/features/proactive/components/detector-builder/ConditionsStep.tsx`
- `src/features/proactive/components/detector-builder/ActionsStep.tsx`
- `src/features/proactive/components/detector-builder/ScheduleStep.tsx`
- `src/features/proactive/components/detector-builder/TestStep.tsx`
- `src/features/proactive/hooks/useDetectorBuilder.ts`
- `src/features/proactive/utils/cronBuilder.ts`
- `src/features/proactive/utils/validateDetector.ts`

**Design Reference:** See `docs/PROACTIVE_SYSTEM_ADDENDUM.md` Section 1.3

**Dependencies:** None (frontend only)

**Testing:**
- [ ] Create detector with event trigger
- [ ] Create detector with schedule trigger
- [ ] Add multiple conditions
- [ ] Add multiple actions
- [ ] Test detector on historical events
- [ ] Save as draft
- [ ] Save and enable
- [ ] Edit existing detector

**Estimated Time:** 20 hours

---

#### **TICKET-022: Build Custom Detector Execution Engine (Backend)**
**Type:** Backend - Framework
**Priority:** P0 (Blocker)
**Points:** 8
**Assignee:** Backend Team

**Description:**
Implement execution engine that runs custom detectors created by users.

**Acceptance Criteria:**
- [ ] `CustomDetectorExecutor` class created
  - Fetches active custom detectors from database
  - Converts detector config to executable code
  - Runs detector logic (trigger check → conditions → actions)
  - Creates opportunities if triggered
  - Handles errors gracefully
- [ ] Trigger evaluation
  - Event trigger: Checks if event matches config
  - Schedule trigger: Runs on cron schedule
  - Threshold trigger: Evaluates metric against threshold
  - Supports complex filters (keywords, entities, sources)
- [ ] Condition evaluation
  - Parses condition field paths (e.g., "metadata.funding_amount")
  - Evaluates operators (gt, lt, eq, contains, etc.)
  - AND logic across multiple conditions
  - Type coercion (string to number if needed)
- [ ] Action execution
  - Creates appropriate proactive action
  - Renders message template with variables
  - Validates action config
  - Queues for delivery
- [ ] Variable substitution
  - Replaces {{variable_name}} with actual values
  - Extracts from event metadata, entities, etc.
  - Handles missing variables gracefully (show "N/A")
  - Supports nested paths ({{metadata.company.name}})
- [ ] Rate limiting per detector
  - Tracks triggers per day/week
  - Blocks if rate limit exceeded
  - Deduplicates within window
- [ ] Performance
  - Compiles detector to efficient code
  - Caches compiled detectors
  - Runs in < 100ms per event
  - Batches execution where possible
- [ ] Error handling
  - Catches and logs detector errors
  - Marks detector as "error" status
  - Notifies user if their custom detector failing
  - Doesn't crash entire system

**Files to Create:**
- `convex/domains/proactive/customDetectorExecutor.ts`
- `convex/domains/proactive/triggerEvaluator.ts`
- `convex/domains/proactive/conditionEvaluator.ts`
- `convex/domains/proactive/variableSubstitution.ts`

**Dependencies:** TICKET-002, TICKET-007

**Testing:**
```typescript
// Test custom detector execution
const detector = {
  triggerType: "event",
  eventTrigger: {
    eventType: "web_article_discovered",
    keywords: ["Series B", "funding"],
  },
  conditions: [
    { field: "entities[0].entityType", operator: "eq", value: "company" },
  ],
  actions: [
    {
      actionType: "send_notification",
      template: "🚀 {{company_name}} raised funding!",
    },
  ],
};

const event = createTestEvent({
  eventType: "web_article_discovered",
  rawContent: "Acme Corp raises $50M Series B",
  entities: [{ entityType: "company", entityName: "Acme Corp" }],
});

const executor = new CustomDetectorExecutor(detector);
const result = await executor.execute(ctx, event);

expect(result.triggered).toBe(true);
expect(result.opportunities.length).toBe(1);
expect(result.opportunities[0].actions[0].template).toContain("Acme Corp");
```

**Estimated Time:** 12 hours

---

#### **TICKET-023: Build Detector Template Library (Frontend + Backend)**
**Type:** Full Stack
**Priority:** P2 (Medium)
**Points:** 5
**Assignee:** Full Stack Team

**Description:**
Create library of 20+ pre-built detector templates that users can clone and customize.

**Acceptance Criteria:**
- [ ] Template definitions created
  - 20+ templates across categories: Finance, People, Relationships, Reporting
  - Each template has: id, name, description, icon, category, config
  - Stored in code (not database) as constants
- [ ] Template categories
  - Finance: Funding alerts, IPOs, acquisitions
  - People: Exec departures, promotions, job changes
  - Relationships: Check-ins, congratulations, follow-ups
  - Reporting: Weekly digests, monthly summaries, quarter reviews
- [ ] Template gallery UI
  - Grid layout with cards
  - Category filter
  - Search bar
  - "Clone Template" button on each
- [ ] Clone template functionality
  - Creates new custom detector from template
  - Pre-fills all form fields
  - Opens in detector builder for customization
  - User must save to activate
- [ ] Popular templates highlighted
  - "Most Used" badge on popular templates
  - Shows clone count
  - Sorted by popularity
- [ ] Template preview
  - Click template to see full details
  - Shows example notification
  - Shows configuration
  - "Clone" or "Back" buttons

**Files to Create:**
- `convex/domains/proactive/detectorTemplates.ts` (template definitions)
- `src/features/proactive/views/TemplateLibrary.tsx`
- `src/features/proactive/components/TemplateCard.tsx`
- `src/features/proactive/components/TemplatePreview.tsx`

**Design Reference:** See `docs/PROACTIVE_SYSTEM_ADDENDUM.md` Section 1.5

**Dependencies:** TICKET-021

**Testing:**
- [ ] All templates render in gallery
- [ ] Category filter works
- [ ] Search finds templates
- [ ] Clone opens detector builder with pre-filled values
- [ ] User can customize and save cloned template

**Estimated Time:** 8 hours

---

### Sprint 3.2: Billing Integration (Days 18-19)

---

#### **TICKET-024: Set Up Stripe Integration**
**Type:** Backend - Payment
**Priority:** P0 (Blocker)
**Points:** 8
**Assignee:** Backend Team

**Description:**
Integrate Stripe for subscription billing (free vs paid tier).

**Acceptance Criteria:**
- [ ] Stripe account configured
  - Products created: "NodeBench Paid" ($29/month)
  - Price IDs stored in config
  - Webhooks configured
- [ ] `createCheckoutSession` action created
  - Creates Stripe checkout session
  - Redirects user to Stripe hosted page
  - Includes success/cancel URLs
  - Stores session ID
- [ ] `handleStripeWebhook` function created
  - Verifies webhook signature
  - Handles: checkout.session.completed
  - Handles: customer.subscription.created
  - Handles: customer.subscription.updated
  - Handles: customer.subscription.deleted
  - Handles: invoice.payment_succeeded
  - Handles: invoice.payment_failed
  - Updates `subscriptions` table
- [ ] Subscription lifecycle
  - On checkout complete: Create subscription record, set tier to "paid"
  - On payment failed: Set status to "past_due", notify user
  - On cancelled: Set cancelAtPeriodEnd = true, notify user
  - On period end: Downgrade to free if cancelled
- [ ] Customer portal
  - Generate Stripe customer portal link
  - Users can manage subscription, update payment method
- [ ] Usage tracking
  - Increment `usageTracking.proactiveNotifications` on each delivery
  - Reset monthly on subscription renewal
  - Block if free tier exceeds 50/month
- [ ] Error handling
  - Retry webhook processing on failure
  - Log all Stripe events
  - Alert on critical errors (payment failures)

**Files to Create:**
- `convex/domains/billing/stripeActions.ts`
- `convex/domains/billing/stripeWebhooks.ts`
- `convex/domains/billing/subscriptionMutations.ts`
- `convex/domains/billing/usageTracking.ts`

**Dependencies:** TICKET-002

**Testing:**
```typescript
// Test checkout session creation
const session = await createCheckoutSession(ctx, {
  userId,
  priceId: "price_xxx",
  successUrl: "https://app.com/success",
  cancelUrl: "https://app.com/cancel",
});

expect(session.id).toBeDefined();
expect(session.url).toContain("checkout.stripe.com");

// Test webhook handling
await handleStripeWebhook(ctx, {
  type: "checkout.session.completed",
  data: { object: { customer: "cus_xxx", subscription: "sub_xxx" } },
});

const subscription = await ctx.db.query("subscriptions")
  .withIndex("by_user", q => q.eq("userId", userId))
  .first();

expect(subscription.tier).toBe("paid");
expect(subscription.status).toBe("active");
```

**Estimated Time:** 12 hours

---

#### **TICKET-025: Build Upgrade Prompts (Frontend)**
**Type:** Frontend - React
**Priority:** P1 (High)
**Points:** 5
**Assignee:** Frontend Team

**Description:**
Create upgrade prompts shown to free users when they hit limits or try premium features.

**Acceptance Criteria:**
- [ ] Quota limit modal
  - Triggered when user reaches 50/month on free tier
  - Shows current usage (50/50)
  - Lists paid tier benefits
  - "Upgrade Now" button (opens Stripe checkout)
  - "Learn More" button (opens pricing page)
  - "Not Now" button (dismisses)
  - Shows when quota will reset (e.g., "Feb 1")
- [ ] Custom detector paywall
  - Triggered when free user clicks "New Custom Detector"
  - Explains custom detectors are premium
  - Shows example custom detectors
  - Lists template library access
  - "Upgrade to Paid" button
  - "View Templates" button (shows read-only templates)
  - "Maybe Later" button
- [ ] In-app upgrade prompt
  - Subtle banner in settings
  - "Upgrade for unlimited proactive notifications"
  - Shows current usage (e.g., "37/50 used this month")
  - Dismissible
- [ ] Success flow
  - After Stripe checkout: Show "Thank you!" message
  - Confirm subscription active
  - Highlight newly unlocked features
  - "Get Started" button
- [ ] Cancellation flow
  - Users can cancel in Stripe portal
  - Show "Subscription cancelled" message
  - Explain access until period end
  - "Reactivate" button

**Files to Create:**
- `src/features/billing/components/QuotaLimitModal.tsx`
- `src/features/billing/components/CustomDetectorPaywall.tsx`
- `src/features/billing/components/UpgradeBanner.tsx`
- `src/features/billing/components/CheckoutSuccess.tsx`
- `src/features/billing/hooks/useSubscription.ts`

**Design Reference:** See `docs/PROACTIVE_SYSTEM_ADDENDUM.md` Section 1.2

**Dependencies:** TICKET-024

**Testing:**
- [ ] Free user sees quota modal at 50/50
- [ ] Free user sees paywall for custom detectors
- [ ] Upgrade button opens Stripe checkout
- [ ] After payment: User has paid tier access
- [ ] Paid user doesn't see upgrade prompts

**Estimated Time:** 8 hours

---

#### **TICKET-026: Build Billing Dashboard (Frontend)**
**Type:** Frontend - React
**Priority:** P2 (Medium)
**Points:** 3
**Assignee:** Frontend Team

**Description:**
Create billing dashboard where users can view subscription status, usage, and manage billing.

**Acceptance Criteria:**
- [ ] Subscription status section
  - Shows current tier (Free/Paid)
  - Shows status (Active/Past Due/Cancelled)
  - Shows renewal date
  - Shows payment method (last 4 digits)
  - "Manage Subscription" button (opens Stripe portal)
- [ ] Usage this month
  - Progress bar showing notifications used (e.g., 37/50 for free, 127/∞ for paid)
  - Custom detectors created (paid only)
  - API calls made (paid only)
  - Cost estimate (paid only, based on usage)
- [ ] Billing history
  - Table of past invoices
  - Date, amount, status, download PDF link
  - Paginated (10 per page)
- [ ] Upgrade/downgrade
  - Free users: "Upgrade to Paid" button
  - Paid users: "Cancel Subscription" button
  - Shows pricing details
  - Confirms changes before submitting
- [ ] Empty states
  - No invoices yet: "You'll see invoices here after your first payment"
  - Free tier: "Upgrade to unlock usage analytics"

**Files to Create:**
- `src/features/billing/views/BillingDashboard.tsx`
- `src/features/billing/components/SubscriptionStatus.tsx`
- `src/features/billing/components/UsageStats.tsx`
- `src/features/billing/components/InvoiceHistory.tsx`

**Dependencies:** TICKET-024

**Testing:**
- [ ] Free user sees free tier status
- [ ] Paid user sees paid tier status
- [ ] Usage updates in real-time
- [ ] Manage button opens Stripe portal
- [ ] Invoice list shows past payments

**Estimated Time:** 6 hours

---

### Sprint 3.3: Testing & Launch (Days 20-21)

---

#### **TICKET-027: Custom Detector End-to-End Test**
**Type:** Testing - Integration
**Priority:** P1 (High)
**Points:** 3
**Assignee:** QA Team

**Description:**
Test complete custom detector flow from creation to execution to notification.

**Acceptance Criteria:**
- [ ] Paid user creates custom detector
  - Uses visual builder
  - Configures event trigger (news with "Series B")
  - Adds condition (company in watchlist)
  - Adds action (Slack notification)
  - Tests on historical events
  - Saves and enables
- [ ] Detector executes automatically
  - News article arrives with "Series B"
  - Detector triggers
  - Opportunity created
  - Notification sent to Slack
- [ ] User receives notification
  - Message includes company name (variable substitution)
  - Buttons work (approve, dismiss)
  - Evidence links present
- [ ] Feedback collected
  - User clicks "Useful"
  - Feedback recorded
  - Admin dashboard updated
- [ ] Rate limiting works
  - Detector configured for max 5/day
  - After 5 triggers, detector paused
  - User notified of rate limit

**Files to Create:**
- `convex/__tests__/e2e/customDetectorFlow.test.ts`

**Dependencies:** TICKET-021, TICKET-022, TICKET-024

**Testing:**
```typescript
test("Custom detector - create to execution", async () => {
  // 1. Upgrade to paid tier
  await upgradeToPaid(ctx, userId);

  // 2. Create custom detector
  const detectorId = await ctx.runMutation(api.proactive.createCustomDetector, {
    name: "Series B Alert",
    triggerType: "event",
    eventTrigger: { eventType: "web_article_discovered", keywords: ["Series B"] },
    actions: [{ actionType: "send_notification", template: "{{company_name}} raised Series B!" }],
  });

  // 3. Simulate news article
  const eventId = await ingestNewsArticle({
    title: "Acme Corp raises $50M Series B",
    entities: [{ entityType: "company", entityName: "Acme Corp" }],
  });

  // 4. Run custom detector executor
  await runCustomDetectors(ctx);

  // 5. Verify opportunity created
  const opportunity = await ctx.db.query("opportunities")
    .filter(q => q.eq(q.field("trigger.detectorName"), "Series B Alert"))
    .first();
  expect(opportunity).toBeDefined();

  // 6. Verify Slack notification sent
  const delivery = opportunity.deliveredVia.find(d => d.channel === "slack");
  expect(delivery.messageId).toBeDefined();

  // 7. Verify message content
  const slackMessage = await fetchSlackMessage(delivery.messageId);
  expect(slackMessage.text).toContain("Acme Corp raised Series B!");
});
```

**Estimated Time:** 6 hours

---

#### **TICKET-028: Performance & Load Testing**
**Type:** Testing - Performance
**Priority:** P2 (Medium)
**Points:** 5
**Assignee:** Backend/QA Team

**Description:**
Test system performance under load and optimize bottlenecks.

**Acceptance Criteria:**
- [ ] Load test scenarios
  - 100 concurrent users
  - 1000 events/minute ingestion
  - 50 detectors running simultaneously
  - 500 opportunities created/minute
- [ ] Performance benchmarks
  - Event ingestion: < 100ms per event
  - Detector execution: < 200ms per detector
  - Policy evaluation: < 50ms
  - Slack delivery: < 500ms
  - Database queries: < 100ms (95th percentile)
- [ ] Stress testing
  - Custom detector with 1000+ matches
  - Batch detector processing 10K events
  - Rate limit enforcement at high volume
  - Database under high write load
- [ ] Optimization
  - Add indexes where needed
  - Cache compiled custom detectors
  - Batch database operations
  - Use connection pooling
  - Optimize slow queries
- [ ] Monitoring
  - Set up Datadog dashboards
  - Alert on slow queries (> 1s)
  - Alert on high error rates (> 1%)
  - Track detector execution times
  - Track delivery success rates

**Files to Create:**
- `convex/__tests__/performance/loadTest.ts`
- `convex/__tests__/performance/stressTest.ts`
- `docs/PERFORMANCE_BENCHMARKS.md`

**Dependencies:** All previous tickets

**Testing:**
```bash
# Run load test
npm run test:load

# Run stress test
npm run test:stress

# Benchmark individual components
npm run benchmark:detectors
npm run benchmark:delivery
```

**Estimated Time:** 8 hours

---

#### **TICKET-029: Documentation & User Guide**
**Type:** Documentation
**Priority:** P2 (Medium)
**Points:** 3
**Assignee:** Product/Engineering

**Description:**
Create comprehensive user documentation for proactive features.

**Acceptance Criteria:**
- [ ] Getting started guide
  - How to enable proactive features
  - Onboarding walkthrough
  - First steps after setup
- [ ] Feature documentation
  - Meeting prep packs
  - Follow-up nudges
  - Daily brief
  - CRM drafts
  - Email drafts
  - Custom detectors
- [ ] Custom detector guide
  - How to create custom detector
  - Trigger types explained
  - Action types explained
  - Template library tour
  - Best practices
  - Example detectors
- [ ] Admin guide
  - How to access admin dashboard
  - How to interpret feedback
  - How to adjust detectors
  - How to invite admins
- [ ] Billing FAQ
  - Free vs paid comparison
  - How to upgrade/downgrade
  - Payment methods accepted
  - Refund policy
- [ ] Troubleshooting
  - Detector not triggering
  - Notifications not received
  - Feedback not working
  - Billing issues
- [ ] API reference (for paid users)
  - Authentication
  - Endpoints
  - Rate limits
  - Examples

**Files to Create:**
- `docs/user-guide/GETTING_STARTED.md`
- `docs/user-guide/FEATURES.md`
- `docs/user-guide/CUSTOM_DETECTORS.md`
- `docs/user-guide/ADMIN_GUIDE.md`
- `docs/user-guide/BILLING.md`
- `docs/user-guide/TROUBLESHOOTING.md`
- `docs/api/API_REFERENCE.md`

**Dependencies:** All features completed

**Estimated Time:** 6 hours

---

#### **TICKET-030: Launch Preparation & Rollout**
**Type:** Operations
**Priority:** P0 (Blocker)
**Points:** 5
**Assignee:** DevOps/Product

**Description:**
Prepare for production launch with internal alpha → closed beta → open beta → GA rollout.

**Acceptance Criteria:**
- [ ] Internal alpha setup
  - 10 internal users selected
  - All features enabled
  - Monitoring in place
  - Daily standup for feedback
- [ ] Internal alpha success criteria
  - Zero critical bugs
  - 70%+ useful rate
  - < 5% false positive rate
  - Performance within SLOs
- [ ] Closed beta setup
  - 50 power users invited
  - Invite-only signup flow
  - Beta access flag in database
  - Feedback channels ready (Slack, email)
- [ ] Closed beta success criteria
  - 60% weekly active
  - 65%+ useful rate
  - < 10% false positive rate
  - 200+ feedback labels collected
- [ ] Open beta setup
  - All users can opt-in
  - Prominent "Try Proactive" banner
  - Easy on/off toggle
  - Gradual rollout (10% → 25% → 50% → 100%)
- [ ] Open beta success criteria
  - 40% opt-in rate
  - 60%+ useful rate
  - < 15% false positive rate
  - 500+ feedback labels
- [ ] General availability
  - Default ON for new users
  - Existing users can opt-in
  - Announcement email/blog post
  - Marketing materials ready
  - Support team trained
- [ ] Rollback plan
  - Feature flag for instant disable
  - Database migration rollback scripts
  - Communication plan if issues arise

**Files to Create:**
- `docs/LAUNCH_PLAN.md`
- `docs/ROLLBACK_PROCEDURE.md`
- `scripts/enableProactiveForUser.ts` (manual override)
- `scripts/disableProactiveGlobally.ts` (emergency)

**Dependencies:** All features completed and tested

**Estimated Time:** 8 hours

---

## Summary

**Total Tickets:** 30
**Total Story Points:** 166
**Estimated Time:** 3 weeks (15 working days)

### Week 1 Breakdown (Days 1-7)
- **Tickets:** 001-011
- **Points:** 60
- **Focus:** Foundation, schema, consent, event adapters, detector framework, meeting prep

### Week 2 Breakdown (Days 8-14)
- **Tickets:** 012-020
- **Points:** 49
- **Focus:** Follow-ups, email drafts, feedback system, admin dashboard

### Week 3 Breakdown (Days 15-21)
- **Tickets:** 021-030
- **Points:** 57
- **Focus:** Custom detector builder, billing, templates, testing, launch

---

## Dependencies Graph

```
TICKET-001 (Core Schema)
  ├─→ TICKET-003 (Consent UI)
  ├─→ TICKET-005 (Email Adapter)
  ├─→ TICKET-006 (Calendar Adapter)
  ├─→ TICKET-007 (Detector Framework)
  └─→ TICKET-009 (Policy Gateway)

TICKET-002 (Premium Schema)
  ├─→ TICKET-004 (Consent Backend)
  ├─→ TICKET-017 (Admin Auth)
  └─→ TICKET-024 (Stripe)

TICKET-007 (Detector Framework)
  ├─→ TICKET-008 (Meeting Prep)
  ├─→ TICKET-012 (Follow-Up)
  └─→ TICKET-022 (Custom Executor)

TICKET-010 (Slack Delivery)
  └─→ TICKET-015 (Feedback Buttons)

TICKET-015 (Feedback)
  └─→ TICKET-016 (Analytics)
    └─→ TICKET-018 (Admin UI)

TICKET-021 (Builder UI)
  └─→ TICKET-023 (Templates)

TICKET-024 (Stripe)
  └─→ TICKET-025 (Upgrade Prompts)
    └─→ TICKET-026 (Billing Dashboard)
```

---

**Status:** Ready for Implementation
**Last Updated:** 2026-01-21
**Sprint Planning:** Complete
