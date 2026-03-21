# Gmail → Mini Calendar Agent Wiring Implementation Plan

## Overview

Wire the coordinator agent to Gmail for email intelligence, enabling structured output and subagent orchestration to update the mini calendar with important **documents** and **events** associated with date/time extracted from emails.

---

## Architecture Decision

### Approach: Hybrid Structured Output + Tool Orchestration

Based on the existing Deep Agents 2.0 architecture, we'll implement a **two-phase extraction pipeline**:

1. **Phase 1 - Structured Output**: LLM extracts `EmailIntelligence` schema from email content
2. **Phase 2 - Tool Orchestration**: Agent decides whether to create events, documents, or both

This mirrors the existing `briefGenerator.ts` pattern (structured output with validation) combined with the subagent delegation pattern from `coordinatorAgent.ts`.

---

## Data Models

### 1. EmailIntelligence Schema (New)

```typescript
// convex/domains/integrations/gmail/types.ts

export const EmailIntelligenceSchema = z.object({
  messageId: z.string(),
  threadId: z.string(),
  classification: z.enum([
    "meeting_invite",      // Calendar event with attendees
    "deadline_reminder",   // Task with due date
    "document_share",      // Attachment or link to review
    "event_notification",  // External event (conference, webinar)
    "action_required",     // Needs response/action
    "fyi_informational",   // No action needed
    "newsletter",          // Periodic digest
    "receipt_confirmation" // Transaction confirmation
  ]),

  // Extracted temporal data
  temporal: z.object({
    hasDateTime: z.boolean(),
    startTime: z.number().optional(),      // epoch ms
    endTime: z.number().optional(),
    isAllDay: z.boolean().default(false),
    timezone: z.string().optional(),       // IANA timezone
    recurrence: z.string().optional(),     // RRULE
    deadlineType: z.enum(["hard", "soft", "none"]).default("none")
  }),

  // Event-specific extraction
  event: z.object({
    title: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    attendees: z.array(z.object({
      email: z.string(),
      name: z.string().optional(),
      role: z.enum(["organizer", "required", "optional"]).default("required")
    })).optional(),
    conferenceLink: z.string().optional(),  // Zoom, Meet, Teams
    status: z.enum(["confirmed", "tentative", "cancelled"]).default("tentative")
  }).optional(),

  // Document-specific extraction
  document: z.object({
    hasAttachment: z.boolean(),
    attachmentType: z.enum(["pdf", "doc", "spreadsheet", "image", "ics", "other"]).optional(),
    linkedUrls: z.array(z.string()).optional(),
    requiresReview: z.boolean().default(false),
    suggestedDocTitle: z.string().optional()
  }).optional(),

  // Action intelligence
  actions: z.array(z.object({
    type: z.enum(["create_event", "create_task", "create_document", "link_to_existing", "ignore"]),
    priority: z.enum(["urgent", "high", "medium", "low"]).default("medium"),
    confidence: z.number().min(0).max(1),
    reasoning: z.string()
  })),

  // Source metadata
  meta: z.object({
    from: z.string(),
    subject: z.string(),
    receivedAt: z.number(),
    importance: z.enum(["high", "normal", "low"]).default("normal"),
    isReply: z.boolean().default(false),
    extractedAt: z.number()
  })
});

export type EmailIntelligence = z.infer<typeof EmailIntelligenceSchema>;
```

### 2. Extended Events Table Fields

Leverage existing `events` table with `sourceType: "gmail"`. No schema changes needed—current fields support:
- `sourceId` → Gmail messageId
- `ingestionConfidence` → extraction confidence
- `proposed` → requires user confirmation
- `rawSummary` → original email snippet
- `meta` → store full `EmailIntelligence` payload

### 3. Document-Event Linking

Use existing `documentId` field on events table to link extracted documents to calendar entries.

---

## Implementation Components

### Phase 1: Email Intelligence Extractor

#### File: `convex/tools/email/emailIntelligenceExtractor.ts`

```typescript
/**
 * LLM-powered email intelligence extraction with structured output
 *
 * Pattern: Similar to briefGenerator.ts
 * - Uses OpenAI Structured Outputs for schema validation
 * - Includes lint rules for extraction quality
 * - Retry loop with feedback on validation failures
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { EmailIntelligenceSchema, type EmailIntelligence } from "../../domains/integrations/gmail/types";

// Extraction lint rules (reject low-quality extractions)
const EXTRACTION_LINT_RULES = [
  { id: "no_empty_title", test: (e: EmailIntelligence) =>
    !e.event?.title || e.event.title.length >= 3,
    feedback: "Event title must be at least 3 characters" },
  { id: "temporal_consistency", test: (e: EmailIntelligence) =>
    !e.temporal.hasDateTime || (e.temporal.startTime !== undefined),
    feedback: "If hasDateTime is true, startTime must be provided" },
  { id: "end_after_start", test: (e: EmailIntelligence) =>
    !e.temporal.endTime || !e.temporal.startTime || e.temporal.endTime > e.temporal.startTime,
    feedback: "endTime must be after startTime" },
  { id: "action_required", test: (e: EmailIntelligence) =>
    e.actions.length > 0,
    feedback: "At least one action must be suggested" },
  { id: "confidence_bounds", test: (e: EmailIntelligence) =>
    e.actions.every(a => a.confidence >= 0 && a.confidence <= 1),
    feedback: "Action confidence must be between 0 and 1" }
];

export const extractEmailIntelligence = action({
  args: {
    messageId: v.string(),
    threadId: v.string(),
    from: v.string(),
    subject: v.string(),
    snippet: v.string(),
    body: v.optional(v.string()),
    receivedAt: v.number(),
    attachments: v.optional(v.array(v.object({
      filename: v.string(),
      mimeType: v.string(),
      size: v.number()
    })))
  },
  handler: async (ctx, args) => {
    const openai = new OpenAI();
    const MAX_ATTEMPTS = 3;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const systemPrompt = buildExtractionPrompt(args, lastError);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildEmailContent(args) }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "email_intelligence",
            schema: EmailIntelligenceSchema,
            strict: true
          }
        }
      });

      const parsed = JSON.parse(response.choices[0].message.content!);
      const validated = EmailIntelligenceSchema.safeParse(parsed);

      if (!validated.success) {
        lastError = validated.error.message;
        continue;
      }

      // Run lint rules
      const violations = EXTRACTION_LINT_RULES
        .filter(rule => !rule.test(validated.data))
        .map(rule => rule.feedback);

      if (violations.length > 0) {
        lastError = `Lint violations: ${violations.join("; ")}`;
        continue;
      }

      // Enrich with metadata
      validated.data.meta = {
        ...validated.data.meta,
        extractedAt: Date.now()
      };

      return { success: true, intelligence: validated.data };
    }

    return { success: false, error: lastError };
  }
});

function buildExtractionPrompt(args: any, lastError: string | null): string {
  let prompt = `You are an email intelligence extractor. Analyze the email and extract structured data.

## Classification Guidelines
- meeting_invite: Contains calendar invite, Zoom/Meet link, or explicit meeting request
- deadline_reminder: Mentions due date, deadline, or time-sensitive action
- document_share: Shares files, links to documents, or requests review
- event_notification: External events (conferences, webinars, product launches)
- action_required: Requires response or action but not a meeting
- fyi_informational: No action needed, just information
- newsletter: Periodic digest or marketing email
- receipt_confirmation: Order confirmation, payment receipt, booking confirmation

## Temporal Extraction Rules
- Parse dates relative to received time: ${new Date(args.receivedAt).toISOString()}
- Convert all times to epoch milliseconds (UTC)
- Detect timezone from context (meeting location, sender timezone)
- Set isAllDay=true for date-only references (no specific time)

## Action Recommendation Rules
- create_event: Clear meeting/event with time → confidence ≥ 0.8
- create_task: Action item with deadline → confidence ≥ 0.7
- create_document: Attachment or link to save → confidence ≥ 0.6
- link_to_existing: References existing calendar item → confidence ≥ 0.7
- ignore: Newsletters, receipts, no action needed → confidence ≥ 0.9`;

  if (lastError) {
    prompt += `\n\n## Previous Extraction Failed\nError: ${lastError}\nPlease correct these issues in your extraction.`;
  }

  return prompt;
}

function buildEmailContent(args: any): string {
  let content = `From: ${args.from}\nSubject: ${args.subject}\nReceived: ${new Date(args.receivedAt).toISOString()}\n\n`;

  if (args.body) {
    content += `Body:\n${args.body.slice(0, 4000)}`; // Truncate long bodies
  } else {
    content += `Snippet:\n${args.snippet}`;
  }

  if (args.attachments?.length) {
    content += `\n\nAttachments:\n${args.attachments.map(a => `- ${a.filename} (${a.mimeType})`).join("\n")}`;
  }

  return content;
}
```

---

### Phase 2: Email Calendar Agent (Subagent)

#### File: `convex/domains/agents/core/subagents/emailCalendarAgent.ts`

```typescript
/**
 * EmailCalendarAgent - Orchestrates email→calendar intelligence
 *
 * Responsibilities:
 * 1. Process EmailIntelligence payloads
 * 2. Decide: create event, document, or both
 * 3. Handle user confirmation for low-confidence extractions
 * 4. Update mini calendar with proposed/confirmed items
 */

import { Agent } from "@convex-dev/agent";
import { components, internal } from "../../../../_generated/api";
import { createEventTool, createDocumentTool, proposeEventTool, linkDocumentToEventTool } from "./emailCalendarTools";

export const emailCalendarAgentPrompt = `You are the EmailCalendarAgent, responsible for transforming email intelligence into calendar events and documents.

## Your Tools
1. **createEvent** - Create confirmed calendar event (use when confidence ≥ 0.8)
2. **proposeEvent** - Create proposed event requiring user confirmation (confidence < 0.8)
3. **createDocument** - Create document from email attachment/content
4. **linkDocumentToEvent** - Link document to existing or new event

## Decision Framework

### When to CREATE EVENT (confirmed)
- ICS attachment present → always create
- Meeting invite with time, location, attendees → create if confidence ≥ 0.8
- Clear deadline with specific datetime → create as all-day event

### When to PROPOSE EVENT (tentative)
- Vague time references ("next week", "sometime in January")
- Inferred meetings from context (no explicit invite)
- Deadline mentioned but date unclear

### When to CREATE DOCUMENT
- PDF, Doc, Spreadsheet attachment → always create
- Link to external document requiring review → create with URL
- Long email with important reference content → create as note

### When to LINK DOCUMENT TO EVENT
- Document is agenda, presentation, or meeting materials
- Document is contract/agreement with signature deadline
- Receipt/confirmation for booked event

## Output Format
After processing, return a summary:
{
  "processed": true,
  "actions": [
    { "type": "event_created" | "event_proposed" | "document_created" | "linked", "id": "...", "title": "..." }
  ],
  "requiresUserAction": boolean,
  "summary": "Brief description of what was created/proposed"
}

## Important Rules
- NEVER create duplicate events (check existing events for same day/time)
- Prefer linking to existing events over creating new ones
- Set ingestionConfidence based on extraction confidence
- Include original email messageId in sourceId for traceability
`;

export const emailCalendarAgent = new Agent(components.agent, {
  name: "EmailCalendarAgent",
  instructions: emailCalendarAgentPrompt,
  model: "gpt-4o-mini", // Fast model for orchestration decisions
  tools: {
    createEvent: createEventTool,
    proposeEvent: proposeEventTool,
    createDocument: createDocumentTool,
    linkDocumentToEvent: linkDocumentToEventTool
  }
});
```

#### File: `convex/domains/agents/core/subagents/emailCalendarTools.ts`

```typescript
/**
 * Tools for EmailCalendarAgent
 */

import { tool } from "@convex-dev/agent";
import { v } from "convex/values";
import { api, internal } from "../../../../_generated/api";

export const createEventTool = tool({
  name: "createEvent",
  description: "Create a confirmed calendar event from email intelligence",
  args: {
    title: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    allDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    sourceMessageId: v.string(),
    ingestionConfidence: v.union(v.literal("low"), v.literal("med"), v.literal("high")),
    attendees: v.optional(v.array(v.object({
      email: v.string(),
      name: v.optional(v.string())
    }))),
    conferenceLink: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.runMutation(api.domains.calendar.events.createEvent, {
      title: args.title,
      startTime: args.startTime,
      endTime: args.endTime,
      allDay: args.allDay ?? false,
      location: args.location,
      description: args.description,
      status: "confirmed",
      sourceType: "gmail",
      sourceId: args.sourceMessageId,
      ingestionConfidence: args.ingestionConfidence,
      proposed: false,
      meta: {
        attendees: args.attendees,
        conferenceLink: args.conferenceLink
      }
    });

    return { success: true, eventId, type: "confirmed" };
  }
});

export const proposeEventTool = tool({
  name: "proposeEvent",
  description: "Create a proposed calendar event requiring user confirmation",
  args: {
    title: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    allDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    sourceMessageId: v.string(),
    rawSummary: v.string(),
    reasoning: v.string() // Why this needs confirmation
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.runMutation(api.domains.calendar.events.createEvent, {
      title: args.title,
      startTime: args.startTime,
      endTime: args.endTime,
      allDay: args.allDay ?? false,
      location: args.location,
      description: args.description,
      status: "tentative",
      sourceType: "gmail",
      sourceId: args.sourceMessageId,
      ingestionConfidence: "low",
      proposed: true,
      rawSummary: args.rawSummary,
      meta: { reasoning: args.reasoning }
    });

    return { success: true, eventId, type: "proposed", needsConfirmation: true };
  }
});

export const createDocumentTool = tool({
  name: "createDocument",
  description: "Create a document from email content or attachment reference",
  args: {
    title: v.string(),
    content: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
    sourceMessageId: v.string(),
    tags: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const docId = await ctx.runMutation(api.documents.createDocument, {
      title: args.title,
      content: args.content,
      documentType: "text",
      tags: [...(args.tags ?? []), "email-extracted"],
      assetMetadata: args.sourceUrl ? {
        assetType: mapAttachmentType(args.attachmentType),
        sourceUrl: args.sourceUrl,
        extractedAt: Date.now(),
        toolName: "emailCalendarAgent",
        metadata: { sourceMessageId: args.sourceMessageId }
      } : undefined
    });

    return { success: true, documentId: docId };
  }
});

export const linkDocumentToEventTool = tool({
  name: "linkDocumentToEvent",
  description: "Link an existing document to a calendar event",
  args: {
    documentId: v.id("documents"),
    eventId: v.id("events")
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.domains.calendar.events.linkDocument, {
      eventId: args.eventId,
      documentId: args.documentId
    });

    return { success: true, linked: true };
  }
});

function mapAttachmentType(type?: string): "pdf" | "doc" | "image" | "other" {
  if (!type) return "other";
  if (type.includes("pdf")) return "pdf";
  if (type.includes("doc") || type.includes("spreadsheet")) return "doc";
  if (type.includes("image")) return "image";
  return "other";
}
```

---

### Phase 3: Coordinator Integration

#### File: `convex/domains/agents/coordinator/delegations.ts` (Add)

```typescript
/**
 * Delegation tool for EmailCalendarAgent
 */

export const delegateToEmailCalendarSchema = z.object({
  emailIntelligence: EmailIntelligenceSchema,
  userPreferences: z.object({
    autoConfirmHighConfidence: z.boolean().default(true),
    createDocumentsForAttachments: z.boolean().default(true),
    defaultCalendar: z.string().optional()
  }).optional()
});

export async function delegateToEmailCalendar(
  ctx: ActionCtx,
  args: z.infer<typeof delegateToEmailCalendarSchema>
): Promise<string> {
  const { emailIntelligence, userPreferences } = args;

  // High-confidence fast path (no agent needed)
  if (userPreferences?.autoConfirmHighConfidence) {
    const highConfidenceActions = emailIntelligence.actions
      .filter(a => a.confidence >= 0.8 && a.type === "create_event");

    if (highConfidenceActions.length > 0 && emailIntelligence.event) {
      // Direct creation without agent
      const eventId = await ctx.runMutation(api.domains.calendar.events.createEvent, {
        title: emailIntelligence.event.title,
        startTime: emailIntelligence.temporal.startTime!,
        endTime: emailIntelligence.temporal.endTime,
        allDay: emailIntelligence.temporal.isAllDay,
        location: emailIntelligence.event.location,
        status: "confirmed",
        sourceType: "gmail",
        sourceId: emailIntelligence.messageId,
        ingestionConfidence: "high",
        proposed: false
      });

      return JSON.stringify({
        processed: true,
        actions: [{ type: "event_created", id: eventId, title: emailIntelligence.event.title }],
        requiresUserAction: false,
        summary: `Created event: ${emailIntelligence.event.title}`
      });
    }
  }

  // Complex cases → delegate to EmailCalendarAgent
  const thread = await emailCalendarAgent.createThread(ctx, {
    metadata: { sourceMessageId: emailIntelligence.messageId }
  });

  const result = await emailCalendarAgent.run(ctx, {
    threadId: thread.threadId,
    prompt: `Process this email intelligence and create appropriate calendar entries:\n\n${JSON.stringify(emailIntelligence, null, 2)}`
  });

  return result.content;
}
```

#### Add to Coordinator Tools (in `coordinatorAgent.ts`)

```typescript
// Add to tools object
delegateToEmailCalendar: {
  description: `Delegate email intelligence processing to EmailCalendarAgent.
Use when:
- Processing extracted email intelligence
- Creating calendar events from email content
- Linking documents to calendar entries

Input: EmailIntelligence payload from extractEmailIntelligence tool
Output: Summary of created/proposed events and documents`,
  inputSchema: delegateToEmailCalendarSchema,
  execute: async (input) => delegateToEmailCalendar(ctx, input)
}
```

---

### Phase 4: Gmail Ingestion Pipeline Update

#### File: `convex/domains/integrations/gmail.ts` (Modify)

```typescript
/**
 * Updated ingestMessages to use intelligence extraction
 */

export const ingestMessagesWithIntelligence = action({
  args: {
    historyId: v.optional(v.string()),
    maxResults: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const messages = await fetchInbox(ctx, args.maxResults ?? 50);
    const results: IngestResult[] = [];

    for (const message of messages) {
      // Skip already processed
      const existing = await ctx.runQuery(api.domains.calendar.events.findBySourceId, {
        sourceType: "gmail",
        sourceId: message.id
      });
      if (existing) continue;

      // Phase 1: Extract intelligence
      const intelligence = await ctx.runAction(internal.tools.email.emailIntelligenceExtractor.extractEmailIntelligence, {
        messageId: message.id,
        threadId: message.threadId,
        from: message.from,
        subject: message.subject,
        snippet: message.snippet,
        body: message.body,
        receivedAt: message.internalDate,
        attachments: message.attachments
      });

      if (!intelligence.success) {
        results.push({ messageId: message.id, status: "extraction_failed", error: intelligence.error });
        continue;
      }

      // Phase 2: Delegate to agent for calendar operations
      const agentResult = await delegateToEmailCalendar(ctx, {
        emailIntelligence: intelligence.intelligence!,
        userPreferences: await getUserEmailPreferences(ctx)
      });

      results.push({ messageId: message.id, status: "processed", result: JSON.parse(agentResult) });
    }

    return { processed: results.length, results };
  }
});
```

---

### Phase 5: Mini Calendar UI Integration

#### File: `src/features/calendar/components/MiniCalendarEmailBadge.tsx` (New)

```tsx
/**
 * Badge component showing email-extracted events on mini calendar
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface MiniCalendarEmailBadgeProps {
  date: Date;
}

export function MiniCalendarEmailBadge({ date }: MiniCalendarEmailBadgeProps) {
  const emailEvents = useQuery(api.domains.calendar.events.listByDateAndSource, {
    date: date.getTime(),
    sourceType: "gmail"
  });

  if (!emailEvents?.length) return null;

  const proposed = emailEvents.filter(e => e.proposed);
  const confirmed = emailEvents.filter(e => !e.proposed);

  return (
    <div className="absolute bottom-0 right-0 flex gap-0.5">
      {confirmed.length > 0 && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`${confirmed.length} email event(s)`} />
      )}
      {proposed.length > 0 && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title={`${proposed.length} proposed event(s)`} />
      )}
    </div>
  );
}
```

#### File: `src/features/calendar/components/ProposedEventCard.tsx` (New)

```tsx
/**
 * Card for proposed events requiring user confirmation
 */

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface ProposedEventCardProps {
  event: {
    _id: Id<"events">;
    title: string;
    startTime: number;
    rawSummary?: string;
    meta?: { reasoning?: string };
  };
}

export function ProposedEventCard({ event }: ProposedEventCardProps) {
  const confirmEvent = useMutation(api.domains.calendar.events.confirmProposed);
  const dismissEvent = useMutation(api.domains.calendar.events.dismissProposed);

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-amber-900">{event.title}</h4>
          <p className="text-sm text-amber-700">
            {new Date(event.startTime).toLocaleString()}
          </p>
          {event.meta?.reasoning && (
            <p className="text-xs text-amber-600 mt-1">
              {event.meta.reasoning}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => confirmEvent({ eventId: event._id })}
            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
          >
            Confirm
          </button>
          <button
            onClick={() => dismissEvent({ eventId: event._id })}
            className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Dismiss
          </button>
        </div>
      </div>
      {event.rawSummary && (
        <p className="text-xs text-gray-500 mt-2 line-clamp-2">
          {event.rawSummary}
        </p>
      )}
    </div>
  );
}
```

---

## Convex Mutations & Queries (New)

### File: `convex/domains/calendar/events.ts` (Add)

```typescript
// Find event by source
export const findBySourceId = query({
  args: { sourceType: v.string(), sourceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_user_source", q =>
        q.eq("sourceType", args.sourceType).eq("sourceId", args.sourceId)
      )
      .first();
  }
});

// List by date and source type
export const listByDateAndSource = query({
  args: { date: v.number(), sourceType: v.string() },
  handler: async (ctx, args) => {
    const dayStart = startOfDay(args.date);
    const dayEnd = endOfDay(args.date);

    return await ctx.db
      .query("events")
      .withIndex("by_user_start")
      .filter(q =>
        q.and(
          q.gte(q.field("startTime"), dayStart),
          q.lt(q.field("startTime"), dayEnd),
          q.eq(q.field("sourceType"), args.sourceType)
        )
      )
      .collect();
  }
});

// Confirm proposed event
export const confirmProposed = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      proposed: false,
      status: "confirmed",
      ingestionConfidence: "high"
    });
  }
});

// Dismiss proposed event
export const dismissProposed = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.eventId);
  }
});

// Link document to event
export const linkDocument = mutation({
  args: { eventId: v.id("events"), documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, { documentId: args.documentId });
  }
});
```

### Schema Update (if needed)

```typescript
// Add index for source lookup in schema.ts (events table)
.index("by_user_source", ["userId", "sourceType", "sourceId"])
```

---

## Cron Job for Continuous Ingestion

### File: `convex/crons.ts` (Add)

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run email intelligence extraction every 15 minutes
crons.interval(
  "gmail-intelligence-sync",
  { minutes: 15 },
  internal.domains.integrations.gmail.ingestMessagesWithIntelligence,
  { maxResults: 20 }
);

export default crons;
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Gmail → Calendar Pipeline                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌─────────────────────┐     ┌─────────────────────────┐
│   Gmail API  │────▶│ ingestMessages      │────▶│ extractEmailIntelligence│
│   (OAuth)    │     │ WithIntelligence    │     │ (Structured Output)     │
└──────────────┘     └─────────────────────┘     └───────────┬─────────────┘
                                                             │
                                                             ▼
                                                 ┌───────────────────────┐
                                                 │  EmailIntelligence    │
                                                 │  {                    │
                                                 │    classification,    │
                                                 │    temporal,          │
                                                 │    event,             │
                                                 │    document,          │
                                                 │    actions[]          │
                                                 │  }                    │
                                                 └───────────┬───────────┘
                                                             │
                              ┌───────────────────────────────┼──────────────────────────┐
                              │                               │                          │
                              ▼                               ▼                          ▼
               ┌──────────────────────┐     ┌──────────────────────────┐  ┌─────────────────────┐
               │ confidence ≥ 0.8     │     │ confidence < 0.8         │  │ hasAttachment       │
               │ + autoConfirm=true   │     │ OR complex logic         │  │ OR linkedUrls       │
               └──────────┬───────────┘     └──────────┬───────────────┘  └──────────┬──────────┘
                          │                            │                             │
                          ▼                            ▼                             ▼
               ┌──────────────────────┐     ┌──────────────────────────┐  ┌─────────────────────┐
               │ Direct Event         │     │ EmailCalendarAgent       │  │ createDocument()    │
               │ Creation             │     │ (Subagent)               │  │                     │
               │ (Fast Path)          │     │ - createEvent            │  │ ┌─────────────────┐ │
               │                      │     │ - proposeEvent           │  │ │  documents      │ │
               │ ┌──────────────────┐ │     │ - createDocument         │  │ │  table          │ │
               │ │ events table     │ │     │ - linkDocumentToEvent    │  │ └─────────────────┘ │
               │ │ (confirmed)      │ │     └──────────┬───────────────┘  └─────────────────────┘
               │ └──────────────────┘ │                │
               └──────────────────────┘                ▼
                                            ┌──────────────────────────┐
                                            │ events table             │
                                            │ (confirmed OR proposed)  │
                                            │ + documentId link        │
                                            └──────────┬───────────────┘
                                                       │
                                                       ▼
                                            ┌──────────────────────────┐
                                            │     Mini Calendar UI     │
                                            │ ┌──────────────────────┐ │
                                            │ │ MiniCalendarEmailBadge│ │
                                            │ │ • Blue dot (confirmed)│ │
                                            │ │ • Amber dot (proposed)│ │
                                            │ └──────────────────────┘ │
                                            │ ┌──────────────────────┐ │
                                            │ │ ProposedEventCard    │ │
                                            │ │ • Confirm / Dismiss  │ │
                                            │ └──────────────────────┘ │
                                            └──────────────────────────┘
```

---

## Implementation Order

### Phase 1: Foundation (Backend)
1. [ ] Create `EmailIntelligenceSchema` types
2. [ ] Implement `extractEmailIntelligence` action with lint rules
3. [ ] Add new events table index (`by_user_source`)
4. [ ] Implement new mutations (`confirmProposed`, `dismissProposed`, `linkDocument`)
5. [ ] Implement new queries (`findBySourceId`, `listByDateAndSource`)

### Phase 2: Agent Wiring
6. [ ] Create `EmailCalendarAgent` subagent
7. [ ] Implement agent tools (`createEvent`, `proposeEvent`, `createDocument`, `linkDocumentToEvent`)
8. [ ] Add `delegateToEmailCalendar` delegation function
9. [ ] Wire delegation tool into Coordinator Agent

### Phase 3: Pipeline Integration
10. [ ] Modify `ingestMessagesWithIntelligence` to use new extraction + delegation
11. [ ] Add cron job for continuous sync
12. [ ] Add telemetry/logging for pipeline monitoring

### Phase 4: Frontend
13. [ ] Create `MiniCalendarEmailBadge` component
14. [ ] Create `ProposedEventCard` component
15. [ ] Integrate badge into existing `MiniMonthCalendar`
16. [ ] Add proposed events panel to calendar view

### Phase 5: Testing & Polish
17. [ ] Write unit tests for extraction lint rules
18. [ ] Integration tests for agent delegation
19. [ ] E2E test for full Gmail → Calendar flow
20. [ ] Handle edge cases (timezone parsing, recurring events, cancellations)

---

## Configuration & User Preferences

```typescript
// User preferences for email intelligence (stored in user settings)
interface EmailIntelligencePreferences {
  enabled: boolean;
  autoConfirmHighConfidence: boolean;  // Skip confirmation for ≥0.8 confidence
  createDocumentsForAttachments: boolean;
  ignoredSenders: string[];  // Email addresses to skip
  ignoredSubjectPatterns: string[];  // Regex patterns to skip
  defaultReminderMinutes: number;  // Default reminder for created events
}
```

---

## Fast Agent Panel Integration

The Fast Agent Panel is the primary conversational interface for agent interactions. Email intelligence needs deep integration here for interactive workflows.

### Overview

Three integration points:
1. **Email Context Pills** - Drag emails into input bar as context
2. **Email Intelligence Tools** - Agent can fetch/analyze emails on demand
3. **Email Tab** - New tab showing email intelligence dashboard
4. **Artifact Rendering** - Email intelligence cards in message stream

---

### 1. Email Context Pills (Input Bar)

#### File: `src/features/agents/components/FastAgentPanel/FastAgentPanel.InputBar.tsx` (Modify)

```tsx
// Add email context state alongside existing document/calendar context
interface EmailContextItem {
  id: string;
  messageId: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: number;
  hasAttachments: boolean;
}

// In InputBar component props
interface InputBarProps {
  // ... existing props
  contextEmails: EmailContextItem[];
  onAddContextEmail: (email: EmailContextItem) => void;
  onRemoveContextEmail: (id: string) => void;
}

// Drag-and-drop handler for emails
const handleDrop = (e: DragEvent) => {
  // ... existing document/calendar handling ...

  // NEW: Handle email drops
  const emailData = e.dataTransfer?.getData('application/x-nodebench-email');
  if (emailData) {
    try {
      const email = JSON.parse(emailData) as EmailContextItem;
      onAddContextEmail(email);
    } catch (err) {
      console.error('Failed to parse email context:', err);
    }
  }
};

// Email context pill rendering
{contextEmails.map((email) => (
  <div
    key={email.id}
    className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-full text-xs"
  >
    <Mail className="w-3 h-3 text-red-500" />
    <span className="max-w-[150px] truncate" title={email.subject}>
      {email.subject}
    </span>
    <span className="text-red-400">from {email.from.split('@')[0]}</span>
    <button
      onClick={() => onRemoveContextEmail(email.id)}
      className="hover:bg-red-100 rounded-full p-0.5"
    >
      <X className="w-3 h-3 text-red-400" />
    </button>
  </div>
))}
```

#### Message Composition with Email Context

```tsx
// In handleSend function
const handleSend = () => {
  let messageContent = text;

  // Add email context (similar to calendar events)
  if (contextEmails.length > 0) {
    const emailContext = contextEmails.map(email =>
      `**Email from ${email.from}**\nSubject: ${email.subject}\nReceived: ${new Date(email.receivedAt).toLocaleString()}\n\n${email.snippet}`
    ).join('\n\n---\n\n');

    messageContent = `**Email Context:**\n\n${emailContext}\n\n---\n\n${text}`;
  }

  // ... existing calendar/document context handling ...

  onSend(messageContent);
};
```

---

### 2. Email Intelligence Tools for Agent

#### File: `convex/domains/agents/fastAgentPanelStreaming.ts` (Add tools)

```typescript
// Add to tools object in createChatAgent

// Tool: Fetch recent emails
fetchGmailMessages: {
  description: `Fetch recent emails from user's Gmail inbox.
Use when:
- User asks "check my emails" or "what's in my inbox"
- User wants to find specific emails
- User asks about messages from specific senders

Returns list of emails with metadata and snippets.`,
  inputSchema: z.object({
    maxResults: z.number().min(1).max(50).default(10)
      .describe("Maximum number of emails to fetch"),
    filterSender: z.string().optional()
      .describe("Filter by sender email address"),
    filterSubject: z.string().optional()
      .describe("Filter by subject keyword"),
    unreadOnly: z.boolean().default(false)
      .describe("Only fetch unread emails")
  }),
  execute: async (input) => {
    const result = await ctx.runAction(
      api.domains.integrations.gmail.fetchInbox,
      {
        maxResults: input.maxResults,
        filterSender: input.filterSender,
        filterSubject: input.filterSubject,
        unreadOnly: input.unreadOnly
      }
    );
    return JSON.stringify(result);
  }
},

// Tool: Analyze email for intelligence
analyzeEmailIntelligence: {
  description: `Extract intelligence from an email - dates, events, actions, entities.
Use when:
- User wants to understand an email's actionable items
- User asks "what should I do with this email"
- User wants to extract meeting/deadline info from email
- Processing email context provided by user

Returns structured EmailIntelligence with classification, temporal data, and recommended actions.`,
  inputSchema: z.object({
    messageId: z.string().describe("Gmail message ID"),
    threadId: z.string().describe("Gmail thread ID"),
    from: z.string().describe("Sender email address"),
    subject: z.string().describe("Email subject line"),
    snippet: z.string().describe("Email snippet or preview"),
    body: z.string().optional().describe("Full email body if available"),
    receivedAt: z.number().describe("Timestamp when email was received")
  }),
  execute: async (input) => {
    const result = await ctx.runAction(
      internal.tools.email.emailIntelligenceExtractor.extractEmailIntelligence,
      input
    );

    if (result.success) {
      // Embed as artifact for UI rendering
      const artifactMarker = `<!-- EMAIL_INTELLIGENCE_DATA\n${JSON.stringify(result.intelligence, null, 2)}\n-->`;
      return `${artifactMarker}\n\n${JSON.stringify(result.intelligence)}`;
    }
    return JSON.stringify({ error: result.error });
  }
},

// Tool: Process email to calendar
processEmailToCalendar: {
  description: `Process an email and create/propose calendar events and documents.
Use when:
- User says "add this to my calendar"
- User asks to "schedule this meeting"
- User wants to save email content as document
- Automatically processing high-priority emails

Delegates to EmailCalendarAgent for complex decisions.`,
  inputSchema: z.object({
    emailIntelligence: EmailIntelligenceSchema
      .describe("Pre-extracted email intelligence payload"),
    autoConfirm: z.boolean().default(false)
      .describe("Auto-confirm high-confidence events without user approval")
  }),
  execute: async (input) => {
    const result = await delegateToEmailCalendar(ctx, {
      emailIntelligence: input.emailIntelligence,
      userPreferences: {
        autoConfirmHighConfidence: input.autoConfirm,
        createDocumentsForAttachments: true
      }
    });
    return result;
  }
},

// Tool: Get email intelligence summary
getEmailIntelligenceBrief: {
  description: `Get a daily brief of email intelligence - important emails, pending actions, upcoming deadlines.
Use when:
- User asks "what's important in my inbox"
- User wants an email summary/brief
- Morning briefing includes email intelligence
- User asks about pending email actions`,
  inputSchema: z.object({
    lookbackHours: z.number().min(1).max(168).default(24)
      .describe("How many hours back to analyze"),
    priorityFilter: z.enum(["all", "high", "urgent"]).default("all")
      .describe("Filter by priority level")
  }),
  execute: async (input) => {
    const result = await ctx.runAction(
      internal.tools.email.emailIntelligenceBrief.generateBrief,
      input
    );

    // Embed as artifact
    const artifactMarker = `<!-- EMAIL_BRIEF_DATA\n${JSON.stringify(result, null, 2)}\n-->`;
    return `${artifactMarker}\n\n${JSON.stringify(result)}`;
  }
}
```

---

### 3. Email Tab in Fast Agent Panel

#### File: `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx` (Modify)

```tsx
// Add 'email' to tab options
type TabType = 'thread' | 'artifacts' | 'tasks' | 'brief' | 'edits' | 'email';

// Tab navigation
<div className="flex border-b">
  {/* ... existing tabs ... */}
  <button
    onClick={() => setActiveTab('email')}
    className={cn(
      "px-3 py-2 text-sm flex items-center gap-1.5",
      activeTab === 'email' ? "border-b-2 border-red-500 text-red-600" : "text-gray-500"
    )}
  >
    <Mail className="w-4 h-4" />
    Email
    {unprocessedEmailCount > 0 && (
      <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
        {unprocessedEmailCount}
      </span>
    )}
  </button>
</div>

// Tab content
{activeTab === 'email' && (
  <EmailIntelligenceTab
    onSelectEmail={(email) => {
      // Add to context and switch to thread
      handleAddContextEmail(email);
      setActiveTab('thread');
    }}
    onProcessEmail={async (messageId) => {
      // Trigger agent to process email
      await sendStreamingMessage({
        threadId: activeThreadId,
        message: `Process this email to my calendar: ${messageId}`
      });
    }}
  />
)}
```

#### File: `src/features/agents/components/FastAgentPanel/EmailIntelligenceTab.tsx` (New)

```tsx
/**
 * Email Intelligence Tab - Shows inbox with intelligence overlay
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Mail, Calendar, FileText, AlertCircle, Clock, ChevronRight } from "lucide-react";

interface EmailIntelligenceTabProps {
  onSelectEmail: (email: EmailContextItem) => void;
  onProcessEmail: (messageId: string) => Promise<void>;
}

export function EmailIntelligenceTab({ onSelectEmail, onProcessEmail }: EmailIntelligenceTabProps) {
  const [filter, setFilter] = useState<'all' | 'actionable' | 'meetings' | 'deadlines'>('all');

  // Fetch emails with intelligence
  const emailsWithIntelligence = useQuery(
    api.domains.integrations.gmail.listWithIntelligence,
    { limit: 50 }
  );

  // Pending proposed events from emails
  const proposedEvents = useQuery(
    api.domains.calendar.events.listProposedFromEmail,
    {}
  );

  const filteredEmails = emailsWithIntelligence?.filter(email => {
    if (filter === 'all') return true;
    if (filter === 'actionable') return email.intelligence?.actions?.some(a => a.type !== 'ignore');
    if (filter === 'meetings') return email.intelligence?.classification === 'meeting_invite';
    if (filter === 'deadlines') return email.intelligence?.classification === 'deadline_reminder';
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <div className="flex gap-2 p-3 border-b bg-gray-50">
        {(['all', 'actionable', 'meetings', 'deadlines'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 text-xs rounded-full capitalize",
              filter === f
                ? "bg-red-500 text-white"
                : "bg-white border hover:bg-gray-100"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Proposed Events Banner */}
      {proposedEvents && proposedEvents.length > 0 && (
        <div className="p-3 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {proposedEvents.length} proposed event(s) need confirmation
            </span>
          </div>
          <div className="mt-2 space-y-2">
            {proposedEvents.slice(0, 3).map(event => (
              <ProposedEventMiniCard key={event._id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEmails?.map((email) => (
          <EmailIntelligenceRow
            key={email.messageId}
            email={email}
            onSelect={() => onSelectEmail({
              id: email.messageId,
              messageId: email.messageId,
              threadId: email.threadId,
              from: email.from,
              subject: email.subject,
              snippet: email.snippet,
              receivedAt: email.receivedAt,
              hasAttachments: email.hasAttachments
            })}
            onProcess={() => onProcessEmail(email.messageId)}
          />
        ))}
      </div>
    </div>
  );
}

// Individual email row with intelligence indicators
function EmailIntelligenceRow({
  email,
  onSelect,
  onProcess
}: {
  email: EmailWithIntelligence;
  onSelect: () => void;
  onProcess: () => void;
}) {
  const intel = email.intelligence;

  return (
    <div
      className="flex items-start gap-3 p-3 border-b hover:bg-gray-50 cursor-pointer group"
      onClick={onSelect}
    >
      {/* Classification Icon */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        intel?.classification === 'meeting_invite' && "bg-blue-100 text-blue-600",
        intel?.classification === 'deadline_reminder' && "bg-red-100 text-red-600",
        intel?.classification === 'document_share' && "bg-purple-100 text-purple-600",
        intel?.classification === 'action_required' && "bg-amber-100 text-amber-600",
        !intel && "bg-gray-100 text-gray-400"
      )}>
        {intel?.classification === 'meeting_invite' && <Calendar className="w-4 h-4" />}
        {intel?.classification === 'deadline_reminder' && <Clock className="w-4 h-4" />}
        {intel?.classification === 'document_share' && <FileText className="w-4 h-4" />}
        {intel?.classification === 'action_required' && <AlertCircle className="w-4 h-4" />}
        {!intel && <Mail className="w-4 h-4" />}
      </div>

      {/* Email Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{email.from.split('<')[0].trim()}</span>
          <span className="text-xs text-gray-400">
            {formatRelativeTime(email.receivedAt)}
          </span>
        </div>
        <p className="text-sm font-medium truncate">{email.subject}</p>
        <p className="text-xs text-gray-500 line-clamp-1">{email.snippet}</p>

        {/* Intelligence Badges */}
        {intel && (
          <div className="flex gap-1.5 mt-1.5">
            {intel.temporal?.hasDateTime && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                <Calendar className="w-3 h-3" />
                {new Date(intel.temporal.startTime!).toLocaleDateString()}
              </span>
            )}
            {intel.actions?.find(a => a.priority === 'urgent') && (
              <span className="px-1.5 py-0.5 text-xs bg-red-50 text-red-700 rounded">
                Urgent
              </span>
            )}
            {email.hasAttachments && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                Attachments
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {intel?.actions?.some(a => a.type === 'create_event') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onProcess();
            }}
            className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
            title="Add to calendar"
          >
            <Calendar className="w-4 h-4" />
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}
```

---

### 4. Email Intelligence Artifact Rendering

#### File: `src/features/agents/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx` (Modify)

```tsx
// Add to ToolOutputRenderer or message content parser

// Extract EMAIL_INTELLIGENCE_DATA artifact
const extractEmailIntelligence = (content: string): EmailIntelligence | null => {
  const match = content.match(/<!-- EMAIL_INTELLIGENCE_DATA\n([\s\S]*?)\n-->/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  return null;
};

// Extract EMAIL_BRIEF_DATA artifact
const extractEmailBrief = (content: string): EmailBrief | null => {
  const match = content.match(/<!-- EMAIL_BRIEF_DATA\n([\s\S]*?)\n-->/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  return null;
};

// In message rendering
const emailIntelligence = extractEmailIntelligence(messageContent);
const emailBrief = extractEmailBrief(messageContent);

{emailIntelligence && (
  <EmailIntelligenceCard
    intelligence={emailIntelligence}
    onAddToCalendar={async () => {
      // Trigger calendar creation via agent
      await sendMessage(`Add this email to my calendar: ${emailIntelligence.messageId}`);
    }}
    onCreateDocument={async () => {
      await sendMessage(`Create a document from this email: ${emailIntelligence.messageId}`);
    }}
  />
)}

{emailBrief && (
  <EmailBriefCard brief={emailBrief} />
)}
```

#### File: `src/features/agents/components/FastAgentPanel/EmailIntelligenceCard.tsx` (New)

```tsx
/**
 * Card component for displaying email intelligence in message stream
 */

import { Calendar, FileText, Clock, Users, Link, AlertTriangle } from "lucide-react";
import type { EmailIntelligence } from "@/convex/domains/integrations/gmail/types";

interface EmailIntelligenceCardProps {
  intelligence: EmailIntelligence;
  onAddToCalendar?: () => void;
  onCreateDocument?: () => void;
}

export function EmailIntelligenceCard({
  intelligence,
  onAddToCalendar,
  onCreateDocument
}: EmailIntelligenceCardProps) {
  const { classification, temporal, event, document, actions, meta } = intelligence;

  // Classification color mapping
  const classificationStyles = {
    meeting_invite: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Calendar, color: 'text-blue-600' },
    deadline_reminder: { bg: 'bg-red-50', border: 'border-red-200', icon: Clock, color: 'text-red-600' },
    document_share: { bg: 'bg-purple-50', border: 'border-purple-200', icon: FileText, color: 'text-purple-600' },
    event_notification: { bg: 'bg-green-50', border: 'border-green-200', icon: Calendar, color: 'text-green-600' },
    action_required: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, color: 'text-amber-600' },
    fyi_informational: { bg: 'bg-gray-50', border: 'border-gray-200', icon: FileText, color: 'text-gray-600' },
    newsletter: { bg: 'bg-gray-50', border: 'border-gray-200', icon: FileText, color: 'text-gray-400' },
    receipt_confirmation: { bg: 'bg-green-50', border: 'border-green-200', icon: FileText, color: 'text-green-600' },
  };

  const style = classificationStyles[classification];
  const Icon = style.icon;

  return (
    <div className={cn("rounded-lg border p-4 my-2", style.bg, style.border)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-full", style.bg)}>
            <Icon className={cn("w-5 h-5", style.color)} />
          </div>
          <div>
            <p className="font-medium text-sm">{meta.subject}</p>
            <p className="text-xs text-gray-500">from {meta.from}</p>
          </div>
        </div>
        <span className={cn(
          "px-2 py-1 text-xs rounded-full capitalize",
          style.bg, style.color
        )}>
          {classification.replace('_', ' ')}
        </span>
      </div>

      {/* Temporal Info */}
      {temporal.hasDateTime && (
        <div className="mt-3 p-2 bg-white/50 rounded">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>
              {new Date(temporal.startTime!).toLocaleString()}
              {temporal.endTime && ` - ${new Date(temporal.endTime).toLocaleTimeString()}`}
            </span>
            {temporal.isAllDay && (
              <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">All Day</span>
            )}
          </div>
          {temporal.deadlineType !== 'none' && (
            <div className="mt-1 text-xs text-amber-600">
              {temporal.deadlineType === 'hard' ? '⚠️ Hard deadline' : '📅 Soft deadline'}
            </div>
          )}
        </div>
      )}

      {/* Event Details */}
      {event && (
        <div className="mt-3 space-y-2">
          <p className="font-medium text-sm">{event.title}</p>
          {event.location && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>📍</span> {event.location}
            </div>
          )}
          {event.conferenceLink && (
            <a
              href={event.conferenceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Link className="w-3 h-3" />
              Join meeting
            </a>
          )}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="w-3 h-3" />
              {event.attendees.length} attendee(s)
            </div>
          )}
        </div>
      )}

      {/* Document Info */}
      {document && document.hasAttachment && (
        <div className="mt-3 p-2 bg-white/50 rounded">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-purple-500" />
            <span>{document.attachmentType} attachment</span>
          </div>
          {document.suggestedDocTitle && (
            <p className="mt-1 text-xs text-gray-500">
              Suggested: "{document.suggestedDocTitle}"
            </p>
          )}
        </div>
      )}

      {/* Recommended Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action, i) => (
          <ActionButton
            key={i}
            action={action}
            onAddToCalendar={onAddToCalendar}
            onCreateDocument={onCreateDocument}
          />
        ))}
      </div>

      {/* Confidence Indicator */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <span>Confidence:</span>
        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full",
              actions[0]?.confidence >= 0.8 ? "bg-green-500" :
              actions[0]?.confidence >= 0.6 ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${(actions[0]?.confidence ?? 0) * 100}%` }}
          />
        </div>
        <span>{Math.round((actions[0]?.confidence ?? 0) * 100)}%</span>
      </div>
    </div>
  );
}

function ActionButton({
  action,
  onAddToCalendar,
  onCreateDocument
}: {
  action: EmailIntelligence['actions'][0];
  onAddToCalendar?: () => void;
  onCreateDocument?: () => void;
}) {
  if (action.type === 'ignore') return null;

  const configs = {
    create_event: {
      icon: Calendar,
      label: 'Add to Calendar',
      onClick: onAddToCalendar,
      className: 'bg-blue-500 hover:bg-blue-600 text-white'
    },
    create_task: {
      icon: Clock,
      label: 'Create Task',
      onClick: undefined,
      className: 'bg-amber-500 hover:bg-amber-600 text-white'
    },
    create_document: {
      icon: FileText,
      label: 'Save as Document',
      onClick: onCreateDocument,
      className: 'bg-purple-500 hover:bg-purple-600 text-white'
    },
    link_to_existing: {
      icon: Link,
      label: 'Link to Event',
      onClick: undefined,
      className: 'bg-gray-500 hover:bg-gray-600 text-white'
    },
  };

  const config = configs[action.type];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <button
      onClick={config.onClick}
      disabled={!config.onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
        config.className,
        !config.onClick && "opacity-50 cursor-not-allowed"
      )}
      title={action.reasoning}
    >
      <Icon className="w-3 h-3" />
      {config.label}
      {action.priority === 'urgent' && <span>🔥</span>}
    </button>
  );
}
```

---

### 5. Context Handler Integration

#### File: `convex/domains/agents/fastAgentPanelStreaming.ts` (Modify contextHandler)

```typescript
// In contextHandler function
contextHandler: async (ctx, args) => {
  const { userId, inputPrompt, threadId } = args;
  const memoryContext: Message[] = [];

  // ... existing memory retrieval ...

  // NEW: Auto-inject email context for email-related queries
  const emailKeywords = ['email', 'inbox', 'mail', 'message from', 'sent by'];
  const isEmailQuery = emailKeywords.some(kw =>
    inputPrompt?.toLowerCase().includes(kw)
  );

  if (isEmailQuery && userId) {
    try {
      // Fetch recent high-priority emails
      const recentEmails = await ctx.runQuery(
        api.domains.integrations.gmail.listRecentWithIntelligence,
        { userId, limit: 5, priorityOnly: true }
      );

      if (recentEmails.length > 0) {
        const emailSummary = recentEmails.map(e =>
          `- ${e.from}: "${e.subject}" (${e.intelligence?.classification ?? 'unclassified'})`
        ).join('\n');

        memoryContext.push({
          role: "system",
          content: `[EMAIL_CONTEXT]\nRecent important emails:\n${emailSummary}\n\nUse fetchGmailMessages or analyzeEmailIntelligence tools for detailed analysis.`
        });
      }
    } catch (err) {
      // Gmail not connected - silent fail
    }
  }

  // ... rest of context handler ...
  return [...skillContext, ...memoryContext, ...recentMessages];
}
```

---

### 6. FastAgentContext Provider Extension

#### File: `src/features/agents/context/FastAgentContext.tsx` (Modify)

```tsx
// Add email-specific context methods

interface FastAgentContextValue {
  // ... existing methods ...

  // NEW: Email-specific
  openWithEmailContext: (params: {
    emailId: string;
    action?: 'analyze' | 'add_to_calendar' | 'create_document';
  }) => void;

  triggerEmailBrief: () => void;
}

// Implementation
const openWithEmailContext = useCallback(({ emailId, action }: {
  emailId: string;
  action?: 'analyze' | 'add_to_calendar' | 'create_document';
}) => {
  setIsOpen(true);
  setActiveTab('thread');

  const actionPrompts = {
    analyze: `Analyze this email and tell me what actions I should take: ${emailId}`,
    add_to_calendar: `Add this email to my calendar: ${emailId}`,
    create_document: `Create a document from this email: ${emailId}`
  };

  const prompt = action ? actionPrompts[action] : `Analyze email: ${emailId}`;

  // Auto-send the message
  setTimeout(() => {
    sendMessage(prompt);
  }, 100);
}, [sendMessage]);

const triggerEmailBrief = useCallback(() => {
  setIsOpen(true);
  setActiveTab('thread');
  sendMessage("Give me a brief of my important emails from the last 24 hours");
}, [sendMessage]);
```

---

### 7. Email Quick Actions from Mini Calendar

#### File: `src/features/calendar/components/MiniMonthCalendar.tsx` (Modify)

```tsx
// Add email event indicators and quick actions

import { useFastAgent } from "@/features/agents/context/FastAgentContext";

export function MiniMonthCalendar() {
  const { openWithEmailContext } = useFastAgent();

  // ... existing calendar logic ...

  return (
    <div className="...">
      {days.map(day => (
        <DayCell
          key={day.toISOString()}
          day={day}
          emailEvents={emailEventsByDay[day.toDateString()]}
          onEmailEventClick={(event) => {
            if (event.proposed) {
              // Open fast agent to confirm
              openWithEmailContext({
                emailId: event.sourceId!,
                action: 'add_to_calendar'
              });
            }
          }}
        />
      ))}
    </div>
  );
}

// Day cell with email badge
function DayCell({ day, emailEvents, onEmailEventClick }) {
  const proposed = emailEvents?.filter(e => e.proposed) ?? [];
  const confirmed = emailEvents?.filter(e => !e.proposed) ?? [];

  return (
    <div className="relative ...">
      <span>{day.getDate()}</span>

      {/* Email event indicators */}
      <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
        {confirmed.length > 0 && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-blue-500"
            title={`${confirmed.length} email event(s)`}
          />
        )}
        {proposed.length > 0 && (
          <button
            onClick={() => proposed[0] && onEmailEventClick(proposed[0])}
            className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse cursor-pointer"
            title={`${proposed.length} proposed event(s) - click to review`}
          />
        )}
      </div>
    </div>
  );
}
```

---

### Data Flow: Fast Agent Panel Email Integration

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                      Fast Agent Panel Email Integration                         │
└────────────────────────────────────────────────────────────────────────────────┘

                                    USER INTERACTIONS
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         │                                 │                                 │
         ▼                                 ▼                                 ▼
┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
│  Drag Email to  │             │  Chat Query     │             │  Email Tab      │
│  Input Bar      │             │  "check emails" │             │  Quick Actions  │
│                 │             │                 │             │                 │
│ EmailContextPill│             │ fetchGmailMsgs  │             │ Filter/Browse   │
└────────┬────────┘             └────────┬────────┘             └────────┬────────┘
         │                               │                               │
         ▼                               ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AGENT TOOL LAYER                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │fetchGmailMessages│  │analyzeEmailIntel │  │processEmailToCal │              │
│  │                  │  │                  │  │                  │              │
│  │ • maxResults     │  │ • Structured     │  │ • Delegates to   │              │
│  │ • filterSender   │  │   extraction     │  │   EmailCalendar  │              │
│  │ • unreadOnly     │  │ • Lint rules     │  │   Agent          │              │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘              │
└───────────┼─────────────────────┼─────────────────────┼─────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ARTIFACT EMBEDDING                                  │
│                                                                                  │
│  <!-- EMAIL_INTELLIGENCE_DATA -->     <!-- EMAIL_BRIEF_DATA -->                 │
│                                                                                  │
└───────────────────────────────────────────┬─────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              UI RENDERING                                        │
│  ┌──────────────────────────┐  ┌──────────────────────────┐                     │
│  │  EmailIntelligenceCard   │  │    EmailBriefCard        │                     │
│  │  • Classification badge  │  │    • Priority summary    │                     │
│  │  • Temporal info         │  │    • Action items        │                     │
│  │  • Action buttons        │  │    • Deadline alerts     │                     │
│  │  • Confidence meter      │  │                          │                     │
│  └──────────────────────────┘  └──────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                            │
                              ┌─────────────┴─────────────┐
                              ▼                           ▼
                   ┌─────────────────┐         ┌─────────────────┐
                   │ Add to Calendar │         │ Create Document │
                   │ (confirmed/     │         │ (from email     │
                   │  proposed)      │         │  content)       │
                   └────────┬────────┘         └────────┬────────┘
                            │                           │
                            ▼                           ▼
                   ┌─────────────────┐         ┌─────────────────┐
                   │  events table   │         │ documents table │
                   │  (sourceType:   │         │ (tag: email-    │
                   │   gmail)        │         │  extracted)     │
                   └─────────────────┘         └─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Mini Calendar   │
                   │ • Blue dot      │
                   │ • Amber dot     │
                   │   (proposed)    │
                   └─────────────────┘
```

---

### Updated Implementation Order

### Phase 1: Foundation (Backend)
1. [ ] Create `EmailIntelligenceSchema` types
2. [ ] Implement `extractEmailIntelligence` action with lint rules
3. [ ] Add new events table index (`by_user_source`)
4. [ ] Implement new mutations (`confirmProposed`, `dismissProposed`, `linkDocument`)
5. [ ] Implement new queries (`findBySourceId`, `listByDateAndSource`, `listWithIntelligence`)

### Phase 2: Agent Wiring
6. [ ] Create `EmailCalendarAgent` subagent
7. [ ] Implement agent tools (`createEvent`, `proposeEvent`, `createDocument`, `linkDocumentToEvent`)
8. [ ] Add `delegateToEmailCalendar` delegation function
9. [ ] Wire delegation tool into Coordinator Agent

### Phase 3: Fast Agent Panel Tools
10. [ ] Add `fetchGmailMessages` tool to fast agent
11. [ ] Add `analyzeEmailIntelligence` tool to fast agent
12. [ ] Add `processEmailToCalendar` tool to fast agent
13. [ ] Add `getEmailIntelligenceBrief` tool to fast agent
14. [ ] Update context handler for email-related queries

### Phase 4: Fast Agent Panel UI
15. [ ] Add email context pill support to InputBar
16. [ ] Create `EmailIntelligenceTab` component
17. [ ] Add 'email' tab to Fast Agent Panel tabs
18. [ ] Create `EmailIntelligenceCard` artifact component
19. [ ] Create `EmailBriefCard` artifact component
20. [ ] Wire artifact extraction in UIMessageBubble

### Phase 5: Pipeline Integration
21. [ ] Modify `ingestMessagesWithIntelligence` to use new extraction + delegation
22. [ ] Add cron job for continuous sync
23. [ ] Add telemetry/logging for pipeline monitoring

### Phase 6: Mini Calendar UI
24. [ ] Create `MiniCalendarEmailBadge` component
25. [ ] Create `ProposedEventCard` component
26. [ ] Integrate badge into existing `MiniMonthCalendar`
27. [ ] Add proposed events panel to calendar view
28. [ ] Wire mini calendar clicks to Fast Agent Panel

### Phase 7: Context & Provider
29. [ ] Extend `FastAgentContext` with email methods
30. [ ] Add `openWithEmailContext` method
31. [ ] Add `triggerEmailBrief` method

### Phase 8: Testing & Polish
32. [ ] Write unit tests for extraction lint rules
33. [ ] Integration tests for agent delegation
34. [ ] Integration tests for Fast Agent Panel tools
35. [ ] E2E test for full Gmail → Calendar flow
36. [ ] E2E test for email context pill workflow
37. [ ] Handle edge cases (timezone parsing, recurring events, cancellations)

---

## MVP Scope: Critical Event Display & Agent Chat

### Goal
Ensure user's **critical events from email** are:
1. **Extracted** - Meetings, deadlines, important dates parsed from Gmail
2. **Displayed** - Shown on mini calendar with visual indicators
3. **Actionable** - User can click to invoke agent and discuss/confirm

### What's In Scope (MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Meeting invite extraction** | ICS attachments + heuristic parsing | P0 |
| **Deadline extraction** | Due dates, submission deadlines | P0 |
| **Mini calendar dots** | Blue (confirmed) / Amber (proposed) indicators | P0 |
| **Click-to-chat** | Click event → opens Fast Agent Panel with context | P0 |
| **Today's events query** | "What's on my calendar today?" via agent | P0 |
| **Confirm/dismiss proposed** | Simple accept/reject for proposed events | P0 |
| **High-confidence auto-create** | ICS events auto-added (no confirmation needed) | P1 |
| **Email tab in panel** | Browse emails with intelligence overlay | P1 |

### What's Deferred (Post-MVP)

| Feature | Reason for Deferral |
|---------|---------------------|
| Recurring event series | Complex RRULE handling - MVP creates single instance |
| Cancellation detection | Requires email thread tracking - MVP shows as-is |
| Event update detection | Requires deduplication logic - MVP creates new entry |
| Multi-calendar support | MVP uses single default calendar |
| Attendee sync | MVP extracts attendees but doesn't track RSVPs |
| Attachment download | MVP stores reference URL only |
| Email reply drafting | Out of scope for calendar integration |
| Thread grouping | MVP treats each email independently |
| Offline sync | MVP requires active Gmail connection |
| Privacy controls | MVP processes all inbox emails (user can disconnect Gmail) |

### MVP Success Criteria

1. **User opens app in morning** → sees today's events from email on mini calendar
2. **Blue dot on date** → confirmed meeting extracted from ICS invite
3. **Amber pulsing dot** → proposed event needs user confirmation
4. **Click amber dot** → Fast Agent Panel opens with event context
5. **User asks "what meetings do I have today?"** → agent lists email-extracted events
6. **User says "confirm this meeting"** → event status changes to confirmed

### Minimal Data Flow

```
Gmail Inbox
    │
    ▼
┌─────────────────────────────┐
│ extractEmailIntelligence()  │  ← Runs on inbox sync (cron or manual)
│ • ICS parsing (high conf)   │
│ • Heuristic parsing (med)   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ events table                │
│ • sourceType: "gmail"       │
│ • proposed: true/false      │
│ • ingestionConfidence       │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Mini Calendar               │
│ • Query events for month    │
│ • Render dots per day       │
│ • onClick → Fast Agent      │
└─────────────────────────────┘
```

### MVP Implementation Checklist

#### Backend (Required)
- [ ] `EmailIntelligenceSchema` with minimal fields (classification, temporal, event)
- [ ] `extractEmailIntelligence` focusing on meeting_invite + deadline_reminder
- [ ] `events.createFromEmail` mutation
- [ ] `events.listByDateRange` query with sourceType filter
- [ ] `events.confirmProposed` / `events.dismissProposed` mutations
- [ ] Cron job for periodic Gmail sync (every 15 min)

#### Mini Calendar (Required)
- [ ] Query email-sourced events for displayed month
- [ ] Render blue/amber dots on dates with events
- [ ] onClick handler → `openWithEmailContext()`

#### Fast Agent Panel (Required)
- [ ] `listTodaysEmailEvents` tool for "what's today" queries
- [ ] Context injection when opened from calendar click
- [ ] Basic response with event details

#### Fast Agent Panel (Nice-to-Have for MVP)
- [ ] Email tab with intelligence list
- [ ] Email context pills in input bar
- [ ] `EmailIntelligenceCard` artifact rendering

### Deferred Enhancements (Post-MVP Backlog)

1. **Recurring Event Handling**: Create series from RRULE, handle exceptions
2. **Cancellation Detection**: Parse "Meeting Cancelled" emails, update status
3. **Update Detection**: Hash-based deduplication, update existing events
4. **Multi-Calendar Support**: Calendar picker, sync to Google Calendar
5. **Attendee RSVP Tracking**: Parse response emails, update attendee status
6. **Attachment Storage**: Download and store in documents table
7. **Email Reply Drafting**: Generate contextual reply from event
8. **Thread Conversation View**: Group related emails in intelligence view
9. **Offline Queue**: Store pending syncs, retry on reconnection
10. **Privacy Controls**: Per-sender rules, keyword blocklist, opt-out tags
