# Changelog: LinkedIn Organization Page Routing

**Date**: February 2, 2026
**Status**: Implemented (pending env var setup + deploy)

---

## Summary

Migrated all automated LinkedIn posts from the personal profile to a dedicated LinkedIn Organization/Company Page. Personal profile is now reserved for manual, agent-initiated, or personal-voice posts.

**Motivation**: 8+ daily automated cron posts on the personal profile made the account appear bot-like, negatively impacting personal reputation. A dedicated company page handles the daily newsfeed-style content (daily digests, funding briefs, FDA updates, research highlights, clinical trials, M&A activity), while the personal profile is reserved for personal insights and commentary.

---

## Changes

### Schema

- `linkedinPostArchive` table: added `target` field (`"personal" | "organization"`, optional for backward compat)
- Added `by_target_postedAt` index for filtering archive by posting target

**File**: `convex/schema.ts`

### Core Posting Actions

Added two new internal actions to `convex/domains/social/linkedinPosting.ts`:

1. **`createOrgTextPost`** — Posts to the LinkedIn Organization Page using `LINKEDIN_ORG_ACCESS_TOKEN` and `urn:li:organization:{LINKEDIN_ORG_ID}`
2. **`createTargetedTextPost`** — Router action that accepts `target: "personal" | "organization"`, reads `LINKEDIN_DEFAULT_TARGET` env var as fallback, and delegates to the appropriate posting path

Existing `createTextPost` public action is **unchanged** (continues serving agent tools for personal posts).

### Workflow Rerouting

All automated posting workflows now call `createTargetedTextPost` with `target: "organization"`:

| File | Call sites updated |
|------|-------------------|
| `convex/workflows/dailyLinkedInPost.ts` | 5 posting + 5 archive logging |
| `convex/workflows/specializedLinkedInPosts.ts` | 4 posting + 4 archive logging |
| `convex/workflows/linkedinTrigger.ts` | 3 (now accept optional `target` arg) |
| `convex/workflows/scheduledPDFReports.ts` | 1 |
| `convex/domains/social/linkedinUnknownCompanyFixes.ts` | 1 |
| `convex/domains/social/linkedinArchiveMaintenance.ts` | 1 |

### Bug Fixes (Bonus)

Fixed 3 broken references in `specializedLinkedInPosts.ts` that called nonexistent `api.domains.social.linkedinApi.postToLinkedIn`. These were dead code paths for academic research, clinical trial, and M&A posting. Now correctly route through `createTargetedTextPost`.

### Archive Logging

`logLinkedInPost` mutation in `dailyLinkedInPostMutations.ts` now accepts and persists `target` field. All callers pass `target: "organization"`.

### Agent Tools

`postToLinkedIn` tool in `convex/tools/social/linkedinTools.ts` now accepts optional `target` parameter:
- Default: `"personal"` (agent-initiated posts go to user's profile)
- Option: `"organization"` (for brand/automated content)

---

## New Environment Variables (Convex Dashboard)

| Variable | Purpose |
|----------|---------|
| `LINKEDIN_ORG_ACCESS_TOKEN` | OAuth token with `w_organization_social` scope |
| `LINKEDIN_ORG_ID` | Numeric LinkedIn Company Page ID |
| `LINKEDIN_DEFAULT_TARGET` | Set to `organization` for crons to default to org page |

---

## Rollback

Set `LINKEDIN_DEFAULT_TARGET=personal` in Convex dashboard. No code changes needed.

---

## Files Modified

| File | Change |
|------|--------|
| `convex/schema.ts` | Added `target` field + `by_target_postedAt` index to `linkedinPostArchive` |
| `convex/domains/social/linkedinPosting.ts` | Added `createOrgTextPost` + `createTargetedTextPost` internal actions |
| `convex/workflows/dailyLinkedInPost.ts` | Rerouted 5 posting + 5 archive calls |
| `convex/workflows/specializedLinkedInPosts.ts` | Rerouted 4 posting + 4 archive calls, fixed 3 broken refs |
| `convex/workflows/linkedinTrigger.ts` | Added `target` arg to 3 actions |
| `convex/workflows/scheduledPDFReports.ts` | Rerouted 1 posting call |
| `convex/workflows/dailyLinkedInPostMutations.ts` | Added `target` arg to `logLinkedInPost` mutation |
| `convex/tools/social/linkedinTools.ts` | Added `target` param to agent tool |
| `convex/domains/social/linkedinUnknownCompanyFixes.ts` | Rerouted 1 maintenance call |
| `convex/domains/social/linkedinArchiveMaintenance.ts` | Rerouted 1 maintenance call |
| `AGENTS.md` | Added "LinkedIn Posting Targets" section + comment fetching limitation docs |

---

## Comment Fetching (Added Later)

### API Limitation: `r_member_social` is CLOSED

LinkedIn's `r_member_social` permission is not available for new applications (closed by LinkedIn). This means:
- Personal post comments/reactions **cannot** be fetched via API
- Only organization posts can be read via `r_organization_social` scope

### Changes

- `fetchPostComments` internalAction defaults to org token (`LINKEDIN_ORG_ACCESS_TOKEN`)
- `fetchCommentsFromLinkedIn` helper uses `/rest/socialActions/{urn}/comments` endpoint
- Org token now requires both `w_organization_social` and `r_organization_social` scopes

### New Required Scope

| Variable | Scopes Needed |
|----------|--------------|
| `LINKEDIN_ORG_ACCESS_TOKEN` | `w_organization_social` + `r_organization_social` |
