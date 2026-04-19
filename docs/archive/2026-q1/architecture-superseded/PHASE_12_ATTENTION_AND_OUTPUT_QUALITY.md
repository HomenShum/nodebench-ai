# Phase 12 — Attention, Suppression, and Role-Specific Output Quality

## The shift

Phase 10-11 built the engine. Phase 12 makes the outputs feel so useful that the user says:
"This saves me from doing my own daily monitoring."

## The failure mode to avoid

If everything becomes an alert, packet, score, and digest, people tune it out.
The next product discipline is not "detect more" — it is "suppress aggressively, surface only what changed in a way that matters."

## What Phase 12 requires

### 1. Attention Thresholds
Not every change deserves a card on the session delta screen.

Rules:
- Confidence changes < 5% are suppressed
- Duplicate signals from same source within 24h are deduplicated
- Build items with status "in_progress" don't surface unless blocked
- Competitor signals below importance 0.5 are batched into a weekly digest
- Contradictions that were already acknowledged don't re-surface

### 2. Suppression Engine
A `shouldSurface(change, userContext)` function that returns boolean + reason.

Inputs:
- Change object (type, impact, recency)
- User's last session time
- User's role (founder, banker, CEO, operator)
- Prior acknowledgments
- Frequency of similar changes

Outputs:
- `surface: boolean`
- `reason: string` (why surfaced or suppressed)
- `priority: number` (0-1, for ordering)

### 3. Role-Specific Relevance Filtering
Different roles care about different things:

| Signal | Founder | Banker | CEO | Operator |
|--------|---------|--------|-----|----------|
| Strategy shift | HIGH | MEDIUM | HIGH | LOW |
| Competitor signal | HIGH | HIGH | HIGH | MEDIUM |
| Build item decided | HIGH | LOW | LOW | HIGH |
| Initiative blocked | MEDIUM | LOW | LOW | HIGH |
| Contradiction | HIGH | MEDIUM | HIGH | MEDIUM |
| Agent anomaly | HIGH | LOW | LOW | HIGH |
| Packet stale | HIGH | LOW | MEDIUM | HIGH |

### 4. "Why This Matters" Explanation Layer
Every surfaced item should have a one-line explanation of why it matters to THIS user:

- "This contradicts your declared wedge — you may need to either narrow the wedge or reprioritize 3 initiatives"
- "This competitor raised $3M in the exact layer you should not fight head-on"
- "This initiative has been blocked for 48h — it's blocking 2 downstream items"

### 5. Adaptive Briefing Quality
The session delta digest should adapt based on:
- How long since last session (8h → concise; 7d → comprehensive)
- How many changes (3 → inline; 30 → grouped + summarized)
- User's role (founder → strategy-first; operator → execution-first)
- Prior engagement pattern (reads but doesn't act → reduce volume; acts on every item → increase detail)

### 6. Premium Artifact Generation
The 5 Tier 1 outputs that must feel excellent:

1. **Since Your Last Session digest** — adaptive, role-aware, suppression-filtered
2. **Founder weekly reset packet** — auto-generated, diffed against last week
3. **Delegation packet** — context-complete, agent-ready, scope-diffed
4. **Shareable decision memo** — audience-aware, no-auth URL, print-ready
5. **Important-change alert with explanation** — one-line "why this matters" + suggested action

## Practical test: 5 personas

### Persona 1: Founder Monday Morning
Opens NodeBench. Sees 3 strategy shifts, 2 competitor signals, 1 contradiction. Thinks: "Oh, it already knows what changed."
Asks: "What caused the contradiction?" → causal chain. "Turn this into a weekly reset memo." → packet export.

### Persona 2: Founder Pre-Delegation
Sees delegation packet ready. Thinks: "I don't need to rewrite context."
Asks: "Send this to Claude Code." → agent handoff. "Compare to last week's packet." → packet diff.

### Persona 3: Banker/CEO Company Search
Searches "Shopify". Sees snapshot + comparables + packet options. Thinks: "Already in presentation form."
Asks: "Export the banker memo." → role-specific export.

### Persona 4: Founder Tracking Competitors
Sees competitor brief with connected positioning impact. Thinks: "This is the monitoring I was doing manually."
Asks: "Show evidence behind that wedge conclusion." → provenance chain.

### Persona 5: Operator Preparing Leadership Update
Sees quarterly operating packet. Thinks: "This replaced manual stitching."
Asks: "Turn this into slides." → deck export. "Show unresolved contradictions only." → filtered view.

## The emotional bar

The user should feel:
"I don't need to babysit my own company context anymore."

Not:
"Cool, another memory dashboard."

## Product sentence

NodeBench watches the evolution of your product, decisions, competitors, and agent work, then turns that evolving truth into the next packet, memo, brief, or delegation context before you have to ask.

## Implementation order

### 12A: Suppression engine
- `shouldSurface()` function with threshold rules
- Deduplication logic
- Prior-acknowledgment tracking

### 12B: Role-specific filtering
- Role config per user
- Relevance matrix
- Filtered session delta

### 12C: "Why this matters" layer
- One-line explanation generator (heuristic Phase 1, LLM Phase 2)
- Connected to causal chain

### 12D: Adaptive briefing
- Session gap detection
- Change volume bucketing
- Engagement pattern tracking

### 12E: Premium artifact polish
- Weekly reset auto-generation
- Delegation packet scope-diff
- Shareable memo with OG tags
- Print stylesheet quality
