# Oracle Vision

## Purpose
Oracle is an internal-builder harness for long-running AI coding work. It is not a consumer career coach in v1.

The system exists to keep builders inside one observable loop:
- carry the original idea forward without context rot
- trace tool order, token burn, latency, and cost
- expose drift from the original intent in plain English
- force dogfood, refinement, and re-verification before expansion

## Non-Negotiables
1. Extend the existing NodeBench harness. Do not build a second orchestration stack.
2. Every non-trivial slice starts from this file, `ORACLE_STATE.md`, and `ORACLE_LOOP.md`.
3. Work in small loops. No one-shot feature dumps.
4. Every long-running task stores:
   - `goalId`
   - `visionSnapshot`
   - `successCriteria[]`
   - `sourceRefs[]`
   - `crossCheckStatus`
   - `deltaFromVision`
   - `dogfoodRunId`
5. Every loop ends with evidence: typecheck/build/test, dogfood status, and updated state.
6. The builder-facing control tower ships before any end-user Oracle product.

## Existing Primitives To Reuse
- Task/session telemetry in `convex/domains/taskManager/`
- Progressive disclosure and confirmation flow in `convex/tools/meta/toolGateway.ts`
- Disclosure trace UI in `src/features/agents/components/FastAgentPanel/FastAgentPanel.DisclosureTrace.tsx`
- Dogfood and Gemini QA scripts in `scripts/ui/` and the `/dogfood` view
- Agent hub and task history surfaces in `src/features/agents/views/AgentsHub.tsx`

## Builder-Facing Surface
The primary UI is the Oracle Control Tower inside the agent workspace.

It must show:
- recent tracked sessions
- trace timeline and tool sequence
- latency, token, and cost burn
- pending confirmations
- latest dogfood verdict
- open failures and drift from vision
- next recommended action

Game-like labels are allowed only as a translation layer:
- aligned work can be shown as a synced quest
- drift can be shown as a debuff
- a violation can be shown as a boss fight

The underlying data remains operational, timestamped, and auditable.

## Voice Constitution
All Oracle guidance must follow the Thompson Protocol:
- translate jargon immediately into plain English
- explain intuition before mechanics
- acknowledge friction instead of pretending certainty
- cite source references for claims and recommendations
- use game/anime framing only to clarify action, never to hide evidence

Forbidden patterns:
- "it is obvious"
- "as we all know"
- generic management jargon without translation
- advice with no source trail
- expanding scope before closing the current loop

## Scope Boundaries
In scope for v1:
- prompt pack
- task/session cross-check contract
- control tower read model and UI
- dogfood-linked builder workflow

Out of scope for v1:
- autonomous tool-writing sandboxes
- end-user career coaching workflows
- replacing existing telemetry or agent infrastructure

## Success Standard
Oracle is working when a builder can answer, from one place:
- what we were trying to build
- what the agent did in time order
- how much it cost
- where it drifted
- whether dogfood passed
- what to do next
