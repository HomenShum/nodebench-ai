# Product Language - Locked Terms

**Effective Date:** April 22, 2026  
**Status:** LOCKED - No drift permitted without explicit approval

---

## Core Concepts

| Term | Definition | Usage |
|------|------------|-------|
| **ChatThread** | A conversational session between user and agent | "Start a new ChatThread" |
| **RunEnvelope** | Container for a single execution run with its context and outputs | "The RunEnvelope includes the artifact and claims" |
| **Artifact** | The durable output of a conversation: notebook (edit) or report (read) | "The artifact keeps getting better" |
| **Pulse** | Background system that monitors artifacts and surfaces updates | "Pulse brought this back when it changed" |
| **FileAsset** | Uploaded or generated file attached to an artifact | "Attach a FileAsset to your notebook" |
| **InboxItem** | Notification of changes or updates requiring attention | "New InboxItem about your tracked entity" |

---

## Trust & Control States

| Term | Definition | States |
|------|------------|--------|
| **ResolutionState** | How well the system understood the user's intent | `exact`, `probable`, `ambiguous`, `unresolved` |
| **ArtifactState** | Persistence state of the artifact | `none`, `draft`, `saved`, `published` |
| **SaveEligibility** | Whether the artifact can be persisted | `blocked`, `draft_only`, `save_ready`, `publish_ready` |

---

## Answer Control Pipeline

```
classify -> resolve -> retrieve -> claim -> gate -> compile -> persist
```

| Stage | Purpose |
|-------|---------|
| **classify** | Identify request kind (entity lookup, compound research, etc.) |
| **resolve** | Determine the specific entity/subject of the query |
| **retrieve** | Fetch sources and evidence |
| **claim** | Extract and validate claims from sources |
| **gate** | Apply trust controls before persistence |
| **compile** | Build final answer from validated claims |
| **persist** | Save to durable storage if eligible |

---

## Request Kinds

- `conversational_follow_up` - Continuation of previous chat
- `entity_lookup` - Single entity query (company, person, product)
- `compound_research` - Multi-step research requiring synthesis
- `artifact_resume` - Return to existing artifact

---

## Claim System

| Term | Definition |
|------|------------|
| **Claim** | An assertion about reality extracted from sources |
| **ClaimType** | Category: `entity_name`, `funding_round`, `founder_identity`, etc. |
| **SupportType** | How claim connects to source: `direct`, `inferred`, `weak` |
| **SupportStrength** | Confidence level: `verified`, `corroborated`, `single_source`, `weak` |
| **Freshness** | How current the claim is: `fresh`, `stale`, `unknown` |

---

## Surfaces

| Surface | Purpose | IA Location |
|---------|---------|-------------|
| **Home** | Re-entry, recent artifacts, recommendations | Primary navigation |
| **Reports** | Browse saved artifacts | Primary navigation |
| **Chat** | Create new artifacts (creation surface) | Primary navigation |
| **Inbox** | Notifications, updates, pulse items | Primary navigation |
| **Me** | Settings, profile, preferences | Primary navigation |

---

## Rules

1. **No synonym drift** - Use these exact terms in user-facing copy
2. **No new concepts** without updating this document
3. **Default to artifact** when describing outputs
4. **Never say "AI" or "LLM"** to users - say "agent" or "system"
5. **Chat is the door, artifact is the thing** - always reinforce this

---

## Examples

✅ **Good:**
> "Your artifact has been saved. You can find it in Reports or reopen it from Chat."

> "The system needs more clarity. Which of these did you mean?"

> "Pulse will notify you when this changes."

❌ **Bad:**
> "Your AI generated a report using LLM technology."

> "The machine learning model is processing your query."

> "ChatGPT-style conversation with language model."
