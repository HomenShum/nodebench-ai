📋 Arbitrage Agent Transformation - Detailed Implementation Report
Document Version: 2.0 (Production-Ready)
Date: December 5, 2025
Prepared For: NodeBench AI Team
Objective: Transform Fast Agent → Arbitrage Agent with receipts-first research capability

🎯 Executive Summary
What We're Building
Arbitrage Agent - A ruthless-but-trustworthy opportunity scout that exploits information mismatches across sources, time, and coverage to surface actionable deltas with evidence.

Core Promise: "Find the gap between narrative and reality—and show exactly where it comes from."

Why This Matters
Current State (Fast Agent):

General-purpose research assistant
Aggregates information from multiple sources
No systematic contradiction detection
No delta tracking over time
No source quality differentiation
Citations without verification status
Future State (Arbitrage Agent):

Skeptical evidence auditor
Source Arbitrage: Detects contradictions across sources
Time Arbitrage: Tracks what changed since last check
Coverage Arbitrage: Finds hidden primary sources
Consensus Arbitrage: Narrative vs SEC/official docs
Quality-First: Primary sources (SEC) trump secondary (news)
Delta-Aware: "What's new?" as default experience
Business Value
Competitive Advantage: Unique "receipts-first" positioning in AI research space
Trust Building: Users can verify every claim with source quality indicators
Efficiency: Reuse global cache with delta updates (cost savings)
Alerts: Notify when sources 404, contradict, or materially change
Newsletter/Dossier Quality: Premium outputs with verified facts only
📊 Gap Analysis Results
Original Plan (v1.0) Issues:

❌ Proposed duplicate tables (arbitrageReports, sourceHealth) that overlap with existing entityContexts
❌ Incomplete file map (missed ~50 files)
❌ Single 5,500-token prompt (context bloat risk)
❌ Missing tool implementation algorithms
❌ No feature flag infrastructure specified
❌ No backward compatibility for citations
❌ No error handling strategy
❌ No testing plan
Updated Plan (v2.0) Fixes:

✅ Extends existing entityContexts table with arbitrage-specific fields
✅ Complete 66-file transformation map
✅ Modular prompt system (feature-flag based composition)
✅ Detailed algorithms for all 4 new tools
✅ Uses existing userPreferences.agentsPrefs for feature flags
✅ Dual citation format parser (legacy + arbitrage)
✅ Comprehensive error handling with graceful degradation
✅ Full test coverage (unit, integration, E2E)
🗂️ Architecture Overview
System Components
┌─────────────────────────────────────────────────────────────┐
│                    ARBITRAGE AGENT                          │
│                  (Coordinator Layer)                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │Document│ │ Media  │ │  SEC   │  ← Evidence Collectors
   │ Agent  │ │ Agent  │ │ Agent  │
   └────────┘ └────────┘ └────────┘
        │          │          │
        └──────────┼──────────┘
                   ▼
        ┌─────────────────────┐
        │  Arbitrage Tools    │
        ├─────────────────────┤
        │ • Contradiction     │
        │   Detection         │
        │ • Source Quality    │
        │   Ranking           │
        │ • Delta Detection   │
        │ • Health Checking   │
        └──────────┬──────────┘
                   ▼
        ┌─────────────────────┐
        │   entityContexts    │  ← Extended Schema
        │   (Memory Store)    │
        ├─────────────────────┤
        │ + arbitrageMetadata │
        │ + sourceHealth[]    │
        │ + deltas[]          │
        └─────────────────────┘

Data Flow
1. Research Request Flow:

User Query
  → Arbitrage Agent (Coordinator)
    → Step 1: queryMemory (establish baseline)
    → Step 2: Parallel delegation (SEC, Media, Document agents)
    → Step 3: detectContradictions (compare sources)
    → Step 4: compareToBaseline (detect deltas)
    → Step 5: rankSourceQuality (score sources)
    → Step 6: Generate Arbitrage Report
  → Return to User (with citations + verification status)

2. Delta Tracking Flow:

Last Check (Dec 1):
  - entityContexts.structuredFacts: 50 facts
  - entityContexts.conflicts: 2 contradictions
  
Current Check (Dec 5):
  - New research produces: 55 facts
  - compareToBaseline detects: +5 new, 0 removed
  - detectContradictions finds: 3 conflicts (+1 new)
  
Result:
  - entityContexts.deltas: [{type: "fact_added", count: 5}, ...]
  - entityContexts.arbitrageMetadata.deltasSinceLastCheck: 5

3. Source Health Flow:

Initial Fetch:
  - Source URL fetched
  - Content hashed (SHA-256)
  - Stored in entityContexts.sourceHealth

Weekly Check:
  - checkSourceHealth runs
  - HEAD request: 200 OK or 404?
  - If 200: fetch + hash content
  - Compare hash to original
  - Update status: "ok" | "404" | "content_changed"
  
Alert:
  - If 404 or content_changed → HIGH PRIORITY alert

🏗️ Schema Changes
entityContexts Table Extensions
Location: convex/schema.ts (lines 1410-1584)

Existing Fields (Reused):

conflicts - Already tracks fact conflicts with status
quality - Boolean quality flags (hasSufficientFacts, hasVerifiedSources, etc.)
qualityTier - excellent | good | fair | poor
structuredFacts - Facts with confidence + sources
narratives - Narrative interpretations
sources - Array of {name, url, snippet}
New Fields to Add:

1. arbitrageMetadata
Type: Optional object
Purpose: Track arbitrage-specific metrics
Fields:

lastArbitrageCheckAt (number): Timestamp of last arbitrage analysis
contradictionCount (number): Count of active contradictions
sourceQualityScore (number): 0-100 composite score
verificationStatus (verified | partial | unverified): Overall verification status
deltasSinceLastCheck (number): Count of changes since last check
hiddenSourcesCount (number): Count of primary sources not in mainstream coverage
Why: Centralized metrics for arbitrage reports without querying entire fact/conflict arrays.

2. sourceHealth
Type: Optional array of objects
Purpose: Track URL health + content changes
Fields:

url (string): Source URL
lastChecked (number): Timestamp of last health check
status (ok | 404 | content_changed): Current status
contentHash (string): SHA-256 hash of content (first 16 chars)
firstSeenHash (string): Original hash on first fetch
Why: Detect when sources disappear (404) or content materially changes (hash mismatch). Critical for maintaining citation integrity.

3. deltas
Type: Optional array of objects
Purpose: Changelog of what changed since last arbitrage check
Fields:

type (fact_added | fact_removed | fact_modified | conflict_detected | conflict_resolved | source_404 | source_changed)
factId (string): Which fact changed (optional)
timestamp (number): When change detected
description (string): Human-readable description
severity (high | medium | low): Impact level
Why: Powers "What changed since last week?" queries. Enables newsletter-style "this week in Tesla research" outputs.

Migration Strategy:

All new fields are optional → no breaking changes
Existing entities work without modification
New arbitrage checks populate these fields
Old data gradually enriched on next arbitrage analysis
🔧 New Tools Architecture
1. Contradiction Detection Tool
File: convex/tools/arbitrage/contradictionDetection.ts

Algorithm:

Input: Array of facts with {claim, source, sourceType, timestamp}
Semantic Grouping: Use LLM (gpt-4o-mini) to cluster facts by subject
Contradiction Detection: For each group, LLM identifies conflicting claims
Severity Ranking:
HIGH: Direct numeric/factual contradiction ("$100M" vs "$50M")
MEDIUM: Conflicting interpretations ("strong growth" vs "struggling")
LOW: Nuanced differences (emphasis, detail level)
Source Trust Verdict:
If contradiction has PRIMARY vs SECONDARY source → PRIMARY wins
If both same type → "needs_investigation"
Output: Structured contradictions with verdict + sources
Data Flow:

Input Facts (from multiple sources)
  ↓
LLM Grouping (by subject)
  ↓
LLM Contradiction Analysis
  ↓
Severity Classification
  ↓
Trust Verdict (primary > secondary)
  ↓
Output: Ranked Contradictions

Why LLM-based: Semantic contradictions require understanding context. Heuristic rules would miss "raised funding" vs "failed to raise funding" as contradictory.

Performance: ~2-3s for 20 facts (gpt-4o-mini, parallel grouping)

2. Source Quality Ranking Tool
File: convex/tools/arbitrage/sourceQualityRanking.ts

Algorithm:

Base Score by Type:

PRIMARY (SEC filings, press releases, transcripts): 95 points
SECONDARY REPUTABLE (Reuters, Bloomberg, WSJ, FT): 70 points
SECONDARY GENERAL (TechCrunch, VentureBeat): 50 points
TERTIARY (blogs, social media): 30 points
Recency Boost:

Last 7 days: +10 points
Last 30 days: +5 points
Older: +0 points
Corroboration Boost (future):

2+ sources for same fact: +10 points
3+ sources: +15 points
Quality Tiers (derived):

80-100: excellent
60-79: good
40-59: fair
0-39: poor
Example:

Source: SEC Form D (primary, 5 days old)
  Base: 95
  Recency: +10 (last 7 days)
  Total: 105 → capped at 100
  Tier: excellent

Source: TechCrunch (secondary general, 45 days old)
  Base: 50
  Recency: +0 (older than 30 days)
  Total: 50
  Tier: fair

Output:

Ranked sources (sorted by quality score descending)
Average quality score for entire source set
Count by type (primary, secondary, tertiary)
Why: Users need to know which sources to trust. A claim with 10 blog posts but no SEC filing is weaker than 1 SEC filing.

3. Delta Detection Tool
File: convex/tools/arbitrage/deltaDetection.ts

Algorithm:

Step 1: Load Baseline

Query entityContexts by canonicalKey
Extract structuredFacts array (baseline)
Step 2: Build Fact Signature Maps

Baseline Map: "${subject}::${predicate}::${object}" → fact
Current Map: same format for new facts
Step 3: Set Operations

Added: In current, NOT in baseline
Removed: In baseline, NOT in current
Modified: Same signature, different confidence/sources
Step 4: Classify Severity

HIGH: Predicate contains "funding", "valuation", "acquisition", "lawsuit"
MEDIUM: Predicate contains "revenue", "product", "hiring"
LOW: All other predicates
Step 5: Conflict Delta Detection

Compare entityContexts.conflicts (baseline) to new conflicts
Classify: conflict_detected, conflict_resolved
Example:

Baseline (Dec 1):
  - {subject: "Tesla", predicate: "raised", object: "$100M Series C"}
  - {subject: "Tesla", predicate: "has", object: "500 employees"}

Current (Dec 5):
  - {subject: "Tesla", predicate: "raised", object: "$100M Series C"}
  - {subject: "Tesla", predicate: "has", object: "520 employees"}
  - {subject: "Tesla", predicate: "launched", object: "new product X"}

Deltas:
  - REMOVED: "has 500 employees" (no longer in current)
  - ADDED: "has 520 employees" (new)
  - ADDED: "launched new product X" (new, severity: MEDIUM)

Output:

deltas.added[] with timestamp + severity
deltas.removed[] with reason
deltas.modified[] (for future use)
Summary: "5 new, 2 removed, 0 modified"
Why: Powers "What's new with Tesla?" queries. Critical for weekly newsletter features.

4. Source Health Check Tool
File: convex/tools/arbitrage/sourceHealthCheck.ts

Algorithm:

Step 1: Load Entity Sources

Query entityContexts by canonicalKey
Extract sources[] and existing sourceHealth[]
Step 2: For Each Source URL

HEAD Request: Check if URL returns 200 (OK) or 404 (Not Found)
If 200:
Fetch Full Content
Hash Content: SHA-256, truncate to 16 chars
Compare Hash: To previous hash in sourceHealth
If different → status = "content_changed"
If same → status = "ok"
If 404:
status = "404"
Step 3: Update sourceHealth

Patch entityContexts with new sourceHealth[]
Step 4: Generate Alerts

If ANY source has status "404" or "content_changed" → HIGH PRIORITY
Return list of issues for user notification
Example:

Source: https://techcrunch.com/tesla-series-c
  - First Check (Dec 1):
    - Status: 200 OK
    - Hash: "a3f5b2..."
    - Stored in sourceHealth

  - Second Check (Dec 8):
    - Status: 200 OK
    - Hash: "d8c1e4..." (DIFFERENT!)
    - Alert: "Content changed for TechCrunch article"

Source: https://old-blog.com/tesla-news
  - First Check (Dec 1):
    - Status: 200 OK
    - Hash: "f2e9a1..."
  
  - Second Check (Dec 8):
    - Status: 404 Not Found
    - Alert: "Source unavailable: old-blog.com article"

Why: Citations lose value if sources disappear. Material content changes (e.g., TechCrunch updates article to correct funding amount) invalidate previous research.

Performance: HEAD requests are fast (~100-200ms each). Can run in background scheduler (weekly).

🎨 UI/UX Changes
1. Arbitrage Report Card (New Component)
Location: src/features/agents/components/ArbitrageAgentPanel/ArbitrageReportCard.tsx

Purpose: Primary visual representation of arbitrage analysis

Layout Sections:

A. Summary Dashboard (Top)

4-metric grid:
Quality Score (0-100) - large number
Verification Status (badge: verified/partial/unverified)
Contradictions Count (red highlight if >0)
New Facts Count (green highlight)
B. Top Deltas List

Up to 5 most important changes
Each with:
Status icon (✅ ⚠️ ❌ 🔍 📊)
Type label (VERIFIED, PARTIAL, CONTRADICTED, GAP, DELTA)
Description text
Severity badge (high/medium/low)
C. Narrative vs Evidence Table

Columns: Claim | Narrative Sources | Primary Evidence | Verdict
Verdict cell has color-coded badge (green ✅, yellow ⚠️, red ❌)
Primary Evidence column has clickable source links
Responsive: Collapses to cards on mobile
D. Contradictions Accordion

Expandable sections per contradiction
Each shows:
Severity badge
Supporting sources (green)
Contradicting sources (red)
Verdict explanation
E. Gaps & Hidden Sources (Side-by-Side)

Left: Expected but missing information
Right: Primary sources not in mainstream coverage
F. Timeline Verification

Chronological event list
Each event has verification badge
Hover shows source details
G. Next Questions

Numbered list of follow-up queries
Each with verifiability indicator (high/medium/low)
Interactions:

Click source → opens in new tab
Click contradiction → expands details
Hover fact anchor → shows linked artifacts
2. Source Card Quality Indicator (Enhancement)
Location: src/features/agents/components/ArbitrageAgentPanel/SourceCard.tsx

Changes:

Add qualityScore prop (0-100, optional)
Add sourceType prop ("primary" | "secondary" | "tertiary", optional)
Visual Updates:

Quality Badge (top-right):

Green border/text for primary (80-100 score)
Blue border/text for secondary (60-79)
Yellow border/text for fair (40-59)
Red border/text for poor (0-39)
Badge text: "primary" | "secondary" | "tertiary"
Quality Score (below badge):

Small text: "Quality: 85/100"
Before/After:

BEFORE:
┌────────────────────────┐
│ TechCrunch Article     │
│ Tesla raises $100M...  │
└────────────────────────┘

AFTER (Arbitrage Mode):
┌────────────────────────┬────────┐
│ TechCrunch Article     │ [secondary] │
│ Tesla raises $100M...  │ Quality: 50/100 │
└────────────────────────┴────────┘

3. Step Timeline Arbitrage Status (Enhancement)
Location: src/features/agents/components/ArbitrageAgentPanel/StepTimeline.tsx

Changes:

Add arbitrage-specific step types:
"contradiction_detected"
"delta_detected"
"source_health_check"
"arbitrage_report_generated"
Visual Updates:

Contradiction Detected:

Icon: ⚠️ (warning triangle)
Color: Orange
Expandable: Shows conflicting sources
Delta Detected:

Icon: 📊 (chart)
Color: Blue
Expandable: Shows added/removed facts count
Source Health Check:

Icon: 🏥 (medical)
Color: Green if OK, Red if issues
Expandable: Shows 404s or content changes
Arbitrage Report Generated:

Icon: 📋 (clipboard)
Color: Purple
Expandable: Preview of summary metrics
4. Citation Parser Dual Format (Update)
Location: src/features/agents/components/ArbitrageAgentPanel/FastAgentPanel.VisualCitation.tsx

Parsing Logic:

Legacy Format: {{fact:section:slug}}

Regex: /\{\{fact:([^:]+):([^}]+)\}\}/g
Renders: [slug] superscript link (no status badge)
Arbitrage Format: {{arbitrage:section:slug:status}}

Regex: /\{\{arbitrage:([^:]+):([^:]+):([^}]+)\}\}/g
Renders: status_icon [slug] superscript link
Status icons:
verified → ✅
partial → ⚠️
unverified → ❓
contradicted → ❌
Mixed Document Handling:

Both formats can coexist
Old threads (pre-arbitrage) render with legacy parser
New threads (arbitrage mode) use new parser
Transition period: Both parsers run simultaneously
Example Rendering:

"Tesla raised $240M in Series C. {{arbitrage:funding:series_c:verified}}"
→ Renders as:
"Tesla raised $240M in Series C. ✅ [series_c]"
                                  ↑ clickable citation

5. Settings Panel Toggle (New)
Location: src/features/agents/components/ArbitrageAgentPanel/FastAgentPanel.Settings.tsx

New Setting:

Label: "Arbitrage Mode" with BETA badge
Description: "Enable receipts-first research with contradiction detection and delta tracking"
Control: Toggle switch (off by default)
Placement: Under model selection, above fast mode toggle
Behavior:

Toggle ON → saves to userPreferences.agentsPrefs.arbitrageMode = "enabled"
Next agent request → coordinator loads arbitrage prompt
Toggle OFF → reverts to standard mode
Per-user persistent (survives logout)
Warning Banner (First Enable):

"Arbitrage Mode is in beta. Citation formats may change."
Dismiss button (don't show again)
🔀 Workflow Changes
Standard Research Flow (Current)
1. User: "Research Tesla"
2. Coordinator → delegateToEntityResearchAgent
3. EntityResearchAgent → enrichCompanyDossier
4. enrichCompanyDossier → linkupSearch + SEC tools
5. Results aggregated → dossier created
6. User sees: Company overview + facts

Arbitrage Research Flow (New)
1. User: "Research Tesla"
2. Coordinator checks: isArbitrageModeEnabled(userId)
   → TRUE
3. Coordinator → initScratchpad("arbitrage_research")
4. Coordinator → queryMemory("company:TSLA")
   → Baseline: 50 facts, quality: good, last updated: Dec 1
5. Coordinator → PARALLEL delegation:
   - delegateToSECAgent("Tesla SEC filings")
   - delegateToMediaAgent("Tesla recent news")
   - delegateToEntityResearchAgent("Tesla deep dive")
6. Results collected:
   - SEC: 10-K, 8-K filings (PRIMARY sources)
   - Media: TechCrunch, Reuters articles (SECONDARY)
   - Entity: Full dossier with facts
7. Coordinator → detectContradictions(all facts)
   → 2 contradictions found
8. Coordinator → compareToBaseline(baseline, current)
   → 5 new facts, 0 removed, 1 modified
9. Coordinator → rankSourceQuality(all sources)
   → Average quality: 72/100
10. Coordinator → checkSourceHealth(sources)
   → 1 source 404, 0 content changed
11. Coordinator → Generate ArbitrageReport
12. Coordinator → updateMemoryFromReview + markMemoryUpdated
13. User sees: Arbitrage Report Card with:
    - Summary: 5 new facts, 2 contradictions, 72/100 quality
    - Narrative vs Evidence table
    - Timeline with verification
    - Next questions

Key Differences:

Memory-first: Always checks baseline before external calls
Parallel evidence gathering: Faster than sequential
Contradiction detection: Automatic across all sources
Delta tracking: Explicit comparison to last state
Source quality ranking: Users see which sources to trust
Health checking: Identifies broken/changed sources
Weekly Newsletter Flow (New)
1. User: "What's new with Tesla this week?"
2. Coordinator → queryMemory("company:TSLA")
   → Last arbitrage check: Dec 1
3. Coordinator → compareToBaseline(baseline: Dec 1, current: Dec 8)
   → Deltas: 12 new facts, 1 removed, 3 modified
4. Coordinator → Filter deltas by severity: HIGH + MEDIUM only
5. Coordinator → Format as newsletter:
   - "This week in Tesla research (Dec 1-8)"
   - New Developments (5 items)
   - Contradictions Detected (1 item)
   - Sources Gone Stale (1 404)
6. User sees: Weekly digest with delta-focused content

Why: Enables automated "weekly research roundup" feature. Users tracking 20 companies can get digests without re-reading everything.

📁 File Transformation Map
Backend Files (7 total)
Rename + Update:

convex/domains/agents/fastAgentChat.ts → arbitrageAgentChat.ts

Update: Function names, exports
Impact: ~15 import statements in other files
convex/domains/agents/fastAgentChatHelpers.ts → arbitrageAgentChatHelpers.ts

Update: Helper function names
Impact: ~5 import statements
convex/domains/agents/fastAgentPanelStreaming.ts → arbitrageAgentPanelStreaming.ts

Update: Streaming config, SSE event names
Impact: ~8 import statements
convex/domains/agents/fastAgentDocumentCreation.ts → arbitrageAgentDocumentCreation.ts

Update: Document creation templates
Impact: ~3 import statements
Update References Only: 5. convex/domains/agents/agentChat.ts

Update imports from renamed files
No rename needed
convex/domains/agents/agentChatActions.ts

Update imports from renamed files
No rename needed
convex/domains/agents/index.ts

Update exports for renamed files
No rename needed
New Files to Create: 8. convex/lib/agentFeatureFlags.ts (NEW)

Feature flag helpers
convex/tools/arbitrage/contradictionDetection.ts (NEW)

convex/tools/arbitrage/sourceQualityRanking.ts (NEW)

convex/tools/arbitrage/deltaDetection.ts (NEW)

convex/tools/arbitrage/sourceHealthCheck.ts (NEW)

convex/domains/agents/core/templates/arbitrageReportTemplate.ts (NEW)

convex/domains/agents/core/errorHandling.ts (NEW)

Frontend Files (59 total)
Directory Rename:

src/features/agents/components/FastAgentPanel/ → ArbitrageAgentPanel/
Core Files - Rename + Update:

FastAgentPanel.tsx → ArbitrageAgentPanel.tsx

Component name: FastAgentPanel → ArbitrageAgentPanel
Impact: Main entry point
FastAgentContext.tsx → ArbitrageAgentContext.tsx

Context name: FastAgentContext → ArbitrageAgentContext
Impact: All consuming components
index.ts → Update exports

index.enhanced.ts → Update exports

types/agent.ts → Update type names (FastAgentProps → ArbitrageAgentProps)

types/index.ts → Update exports

Sub-Components - Update Imports Only (46 files):

Panel Sub-Components (20 files):

FastAgentPanel.AgentHierarchy.tsx
FastAgentPanel.ArtifactCard.tsx
FastAgentPanel.CitationLink.tsx
FastAgentPanel.ExportMenu.tsx
FastAgentPanel.FileUpload.tsx
FastAgentPanel.GoalCard.tsx
FastAgentPanel.InputBar.tsx
FastAgentPanel.LiveThinking.tsx
FastAgentPanel.MediaRecorder.tsx
FastAgentPanel.Memory.tsx
FastAgentPanel.MessageBubble.tsx
FastAgentPanel.MessageStream.tsx
FastAgentPanel.Settings.tsx ← ADD arbitrage toggle
FastAgentPanel.SkillsPanel.tsx
FastAgentPanel.StreamingMessage.tsx
FastAgentPanel.ThoughtBubble.tsx
FastAgentPanel.ThreadList.tsx
FastAgentPanel.UIMessageBubble.tsx
FastAgentPanel.UIMessageStream.tsx
FastAgentPanel.VisualCitation.tsx ← UPDATE citation parser
Shared Components (14 files):

CollapsibleAgentProgress.tsx ← EXTEND for delta display
CompanySelectionCard.tsx
ConfirmationDialog.tsx
DocumentActionCard.tsx
EditProgressCard.tsx
EventSelectionCard.tsx
FileViewer.tsx
HumanRequestCard.tsx
LiveEventCard.tsx
LiveEventsPanel.tsx
MediaGallery.tsx
MermaidDiagram.tsx
NewsSelectionCard.tsx
PeopleSelectionCard.tsx
Display Components (7 files):

ProfileCard.tsx
RichMediaSection.tsx
SourceCard.tsx ← ADD quality indicator
StepTimeline.tsx ← ADD arbitrage status
StepTimelineItem.tsx ← ADD arbitrage badges
ToolResultPopover.tsx
TypingIndicator.tsx
VideoCard.tsx
Hooks (3 files):

hooks/index.ts
hooks/useSmartAutoScroll.ts
hooks/useStreamingBuffer.ts
Utils (1 file):

utils/mediaExtractor.ts
Tests (6 files):

__tests__/e2e-agent-ui.test.tsx ← UPDATE test names
__tests__/mediaExtractor.test.ts
__tests__/message-rendering.test.tsx
__tests__/MessageBubble.streaming.test.tsx
__tests__/presentation-layer.test.tsx
__tests__/ProfileCard.test.tsx
New Components to Create:

ArbitrageReportCard.tsx (NEW)
NarrativeVsEvidenceTable.tsx (NEW - or inline in report card)
ContradictionAccordion.tsx (NEW - or inline in report card)
New Tests to Create:

__tests__/arbitrage.test.tsx (NEW)
__tests__/contradictionDetection.test.ts (NEW)
__tests__/arbitrageReportCard.test.tsx (NEW)
Migration Script
Automated Rename Script: scripts/rename-to-arbitrage.sh

Purpose: Rename all files + update imports in one operation

Steps:

Backup current state (git branch)
Rename backend files (4 files)
Rename frontend directory
Rename core frontend files (6 files)
Find/replace imports across codebase
fastAgent → arbitrageAgent (case-sensitive)
FastAgent → ArbitrageAgent (case-sensitive)
Update type names in types/ directory
Run linter + formatter
Generate migration report (files changed, imports updated)
Safety:

Dry-run mode (preview changes without applying)
Git integration (auto-commit after successful rename)
Rollback script (revert to pre-rename state)
Verification:

Check all imports resolve (no broken references)
Run TypeScript compiler (no type errors)
Run test suite (all pass)
🧪 Testing Strategy
Unit Tests
Backend Tools:

1. Contradiction Detection (contradictionDetection.test.ts)

Test: Direct numeric contradiction detected

Input: "$100M" vs "$50M" from different sources
Expected: HIGH severity, verdict favors primary source
Test: Interpretation conflict detected

Input: "strong growth" vs "struggling" from different sources
Expected: MEDIUM severity
Test: Nuanced differences NOT flagged

Input: "growing" vs "50% revenue increase YoY"
Expected: No contradiction (same meaning, different detail)
Test: Primary source wins in conflict

Input: SEC says "$50M", TechCrunch says "$100M"
Expected: Verdict = "fact1_trusted" (SEC is primary)
2. Source Quality Ranking (sourceQualityRanking.test.ts)

Test: Primary source scores 95+

Input: SEC Form D (primary, 3 days old)
Expected: Score = 105 (capped at 100), tier = "excellent"
Test: Secondary reputable scores 70-80

Input: Reuters article (secondary, 10 days old)
Expected: Score = 75 (70 base + 5 recency), tier = "good"
Test: Tertiary scores 30-40

Input: Blog post (tertiary, 60 days old)
Expected: Score = 30, tier = "poor"
Test: Recency boost applied

Input: TechCrunch article (secondary, 5 days old)
Expected: Score = 60 (50 base + 10 recency)
3. Delta Detection (deltaDetection.test.ts)

Test: New facts detected

Baseline: 50 facts
Current: 55 facts (same 50 + 5 new)
Expected: deltas.added.length = 5
Test: Removed facts detected

Baseline: Has "500 employees"
Current: Doesn't have "500 employees"
Expected: deltas.removed includes "500 employees"
Test: Severity classification

New fact: "raised $100M"
Expected: severity = "high" (funding-related)
Test: First run (no baseline)

Baseline: null
Expected: isFirstRun = true, all facts considered new
4. Source Health Check (sourceHealthCheck.test.ts)

Test: 200 OK status recorded

Mock: fetch returns 200
Expected: status = "ok", contentHash populated
Test: 404 detected

Mock: fetch returns 404
Expected: status = "404"
Test: Content change detected

Previous hash: "abc123"
Current hash: "def456"
Expected: status = "content_changed", hashChanged = true
Test: Content unchanged

Previous hash: "abc123"
Current hash: "abc123"
Expected: status = "ok", hashChanged = false
Frontend Components:

5. Citation Parser (FastAgentPanel.VisualCitation.test.tsx)

Test: Parse arbitrage citation

Input: {{arbitrage:funding:series_c:verified}}
Expected: Citation object with status = "verified"
Test: Parse legacy citation

Input: {{fact:funding:series_c}}
Expected: Citation object with status = undefined, format = "legacy"
Test: Mixed citations in same document

Input: Both arbitrage + legacy formats
Expected: Both parsed correctly, separate badge styles
Test: Render verification badges

Input: status = "verified"
Expected: HTML contains "✅" icon
6. Arbitrage Report Formatting (arbitrageReportTemplate.test.ts)

Test: Generate valid markdown

Input: ArbitrageReport object
Expected: Markdown contains all sections (Summary, Narrative vs Evidence, etc.)
Test: Quality score formatting

Input: sourceQualityScore = 85
Expected: "Overall Quality: 85/100"
Test: Verdict badges

Input: verdict = "supported"
Expected: "✅ supported" in table
Test: Empty sections handled

Input: contradictions = []
Expected: "No contradictions detected." message
7. Arbitrage Report Card (ArbitrageReportCard.test.tsx)

Test: Renders summary metrics

Input: report with quality score, contradictions count
Expected: Metrics displayed in grid
Test: Top deltas rendered

Input: 5 deltas with different types
Expected: 5 delta items with correct icons
Test: Narrative table renders

Input: 3 narrative vs evidence rows
Expected: Table with 3 rows + header
Test: Contradictions accordion expands

Input: Click contradiction item
Expected: Details expand, sources visible
Integration Tests
8. Full Arbitrage Workflow (arbitrageWorkflow.integration.test.ts)

Test: End-to-end research flow

Setup: Mock user, entity in memory
Actions:
Enable arbitrage mode
Send query: "Research Tesla"
Coordinator delegates to multiple agents
Tools run (contradiction, delta, quality)
Report generated
Verify:
ArbitrageReport returned
entityContexts updated with arbitrageMetadata
Deltas recorded
Test: Delta tracking across multiple checks

Setup: Entity with baseline (Dec 1)
Actions:
First check (Dec 1): 50 facts
Second check (Dec 8): 55 facts
Verify:
deltas array has 5 "fact_added" entries
arbitrageMetadata.deltasSinceLastCheck = 5
Test: Error handling - delegation failure

Setup: Mock SEC agent to throw error
Actions: Run arbitrage research
Verify:
Error handled gracefully
Report generated with partial results
User message: "SEC Agent unavailable..."
9. Feature Flag Integration (featureFlags.integration.test.ts)

Test: Arbitrage mode disabled

Setup: User with arbitrageMode = "disabled"
Actions: Send query
Verify:
Coordinator uses BASE prompt (not arbitrage)
Agent name = "CoordinatorAgent"
Test: Arbitrage mode enabled

Setup: User with arbitrageMode = "enabled"
Actions: Send query
Verify:
Coordinator uses ARBITRAGE prompt
Agent name = "ArbitrageAgent"
Arbitrage tools available
E2E Tests
10. UI Interaction Tests (e2e-arbitrage-ui.test.tsx)

Test: Toggle arbitrage mode in settings

Actions:
Open settings panel
Click "Arbitrage Mode" toggle
Close settings
Verify:
Toggle state persists
Preference saved to backend
Next query uses arbitrage mode
Test: View arbitrage report card

Actions:
Enable arbitrage mode
Send query: "Research Tesla"
Wait for response
Verify:
ArbitrageReportCard component renders
Summary metrics visible
Quality score displayed
Narrative vs Evidence table present
Test: Click contradiction to expand

Actions:
View arbitrage report with contradictions
Click contradiction item
Verify:
Details expand
Supporting sources shown
Contradicting sources shown
Verdict explanation visible
Test: Hover citation shows status

Actions:
View message with arbitrage citation
Hover over citation badge
Verify:
Tooltip shows verification status
Linked artifacts displayed
11. Backward Compatibility Test (backward-compat.e2e.test.tsx)

Test: Old threads render correctly

Setup: Thread created before arbitrage mode
Actions: Open old thread
Verify:
Legacy citations parse correctly (no errors)
No arbitrage badges shown (uses legacy style)
Thread still functional
Test: Mixed citation formats

Setup: Thread with some arbitrage, some legacy citations
Actions: View thread
Verify:
Both formats render
Legacy: Simple superscript
Arbitrage: Superscript + status icon
Performance Tests
12. Parallel Delegation Performance (performance.test.ts)

Test: Parallel faster than sequential
Setup: 3 agents, each takes 2 seconds
Measure:
Sequential: ~6 seconds
Parallel: ~2 seconds
Verify: Parallel ≤ 3 seconds (allowing overhead)
13. Large Source Set Handling

Test: 100+ sources don't crash
Setup: Entity with 100 sources
Actions:
Run sourceQualityRanking
Run checkSourceHealth
Verify:
Both complete without timeout
Results returned
No memory issues
14. Citation Parser Performance

Test: Parse document with 1000+ citations
Setup: Markdown with 1000 arbitrage citations
Measure: Parse time
Verify: < 500ms
Test Coverage Goals
Backend Tools: 90%+ coverage
Frontend Components: 80%+ coverage
Integration Workflows: 100% critical paths
E2E User Flows: 100% happy paths + key error scenarios
🚨 Error Handling
Error Categories
1. Rate Limits (External APIs)

SEC API: Rate limited at 10 requests/second
LinkUp API: Rate limited per plan tier
OpenAI API: Rate limited per account
Handling:

Detect: Parse HTTP 429 response
Action: Exponential backoff (1s, 2s, 4s, 8s)
Fallback: Skip tool, continue with other sources
User Message: "⚠️ Rate limit hit for SEC. Retry in 8s."
Recovery: Queue for retry after backoff period
2. Delegation Failures (Subagents)

Causes: Network timeout, agent crash, scheduler overload
Handling:
Detect: Exception from delegation tool
Action: Mark delegation as "failed", continue with others
Fallback: Use only successful delegations
User Message: "⚠️ SECAgent unavailable (timeout). Continuing with other sources..."
Recovery: Include in report notes: "Note: SEC data not available"
3. Source Availability (404s)

Causes: URL no longer exists, domain expired, paywall
Handling:
Detect: HTTP 404 or fetch error
Action: Mark source as invalid in sourceHealth
Fallback: Use remaining sources
User Message: "🚫 Source unavailable: techcrunch.com/article-123"
Alert: HIGH PRIORITY if primary source (e.g., SEC filing)
Recovery: Suggest alternative sources
4. Memory Stale (Old Data)

Causes: Entity not researched in >30 days
Handling:
Detect: entityContexts.isStale = true
Action: Trigger background refresh job
Fallback: Use stale data with warning
User Message: "🔄 Memory for Tesla is 45 days old. Refreshing..."
Recovery: Enqueue refresh, notify on completion
5. Memory Full (Fact Limit)

Causes: Entity has 10,000+ facts (practical limit)
Handling:
Detect: entityContexts.factCount > 10000
Action: Compact memory (remove low-confidence facts)
Fallback: Only add high-confidence facts
User Message: "⚠️ Memory approaching limit. Archiving low-confidence facts."
Recovery: Background job to archive old facts
6. Contradiction Unresolved

Causes: Primary sources contradict each other
Handling:
Detect: detectContradictions returns conflict with both primary sources
Action: Surface in report, don't auto-resolve
Fallback: Mark both facts as "conflicted"
User Message: "⚠️ Unresolved contradiction between SEC Form D and 10-K filing. See Contradictions section."
Recovery: Flag for human review
7. Tool Timeout

Causes: LLM call takes >30 seconds, API slow
Handling:
Detect: Promise.race timeout
Action: Cancel tool execution
Fallback: Skip tool, continue workflow
User Message: "⏱️ Contradiction detection timed out. Skipping..."
Recovery: None (optional feature)
Resilient Parallel Delegation
Purpose: Run multiple subagents in parallel with error isolation

Behavior:

Each delegation gets its own timeout (default: 30s)
If one fails, others continue
Collect all results (both successes + errors)
Generate partial report if some succeed
Surface errors in report notes
Example:

Delegations:
- SECAgent: SUCCESS (3 sources, 10 facts)
- MediaAgent: SUCCESS (8 sources, 15 facts)
- EntityResearchAgent: FAILED (timeout after 30s)

Result:
- Report generated with SEC + Media data
- Note: "Entity research unavailable (timeout)"
- User still gets value from 2/3 agents

Graceful Degradation
Principle: Never fail entire workflow due to one component failure

Degradation Hierarchy:

Full Arbitrage (all tools succeed):

Contradictions detected
Deltas calculated
Source quality ranked
Source health checked
Complete arbitrage report
Partial Arbitrage (some tools fail):

Available sections shown
Missing sections noted
Report still generated
Minimal Arbitrage (most tools fail):

Basic fact aggregation
No contradiction detection
No delta tracking
Simple source list
Fallback to Standard Mode (arbitrage system down):

Revert to non-arbitrage coordinator
Standard dossier generated
User notified of fallback
User Experience:

Never show generic "Error" messages
Always provide partial results
Clearly explain what's missing and why
Offer retry or alternative actions
🎛️ Feature Flag System
Architecture
Storage: userPreferences.agentsPrefs (existing field)

Schema:

agentsPrefs: {
  arbitrageMode: "enabled" | "disabled",
  // Future flags:
  multilingualMode: "enabled" | "disabled",
  expertMode: "enabled" | "disabled",
}

Backend Helpers:

1. Check Flag (isArbitrageModeEnabled)

Queries userPreferences by userId
Returns: true if arbitrageMode === "enabled"
Default: false (opt-in)
Cached: Result cached per request (not per-query)
2. Set Flag (setArbitrageMode)

Mutation to update userPreferences
Creates preferences record if doesn't exist
Updates updatedAt timestamp
Triggers: Immediate effect on next request
Frontend Integration:

Settings Panel Toggle:

Location: Settings sidebar, "Advanced" section
Label: "Arbitrage Mode" with BETA badge
Description: "Enable receipts-first research with contradiction detection and delta tracking"
State: Synced with backend via Convex query
Action: Calls setArbitrageMode mutation on toggle
First-Time Enable Flow:

User clicks toggle
Warning modal: "Arbitrage Mode is experimental. Citation formats and report structure may change."
User confirms or cancels
If confirmed: setArbitrageMode(true) called
Success toast: "Arbitrage Mode enabled. Your next query will use enhanced analysis."
Disable Flow:

User clicks toggle off
No warning (disabling is safe)
setArbitrageMode(false) called
Success toast: "Arbitrage Mode disabled."
Gradual Rollout Strategy
Phase 1: Internal Testing (Week 1-2)

Enable for admin users only
Collect feedback on contradictions, deltas
Fix bugs in tool logic
Phase 2: Beta Users (Week 3-4)

Invite 10-20 power users
Provide onboarding guide
Monitor usage analytics (how often enabled, report quality)
Phase 3: Public Beta (Week 5-6)

Add toggle to all users
Mark as BETA in UI
Collect feedback via in-app survey
Phase 4: General Availability (Week 7+)

Remove BETA badge
Make default for new users (opt-out instead of opt-in)
Retire legacy mode eventually
Analytics to Track
Adoption Metrics:

% users with arbitrage mode enabled
% queries using arbitrage mode
Avg time spent viewing arbitrage reports
Quality Metrics:

Avg source quality score (target: >70/100)
Avg contradictions per report (benchmark: <5)
Avg deltas per weekly check (benchmark: 5-10)
Error Metrics:

% queries with delegation failures
% sources with 404s
% tools timing out
User Satisfaction:

Net Promoter Score for arbitrage users
Feature request themes
📅 Implementation Timeline
Week 1: Foundation
Day 1-2: Pre-Flight (6-8 hours)

Extend entityContexts schema with arbitrage fields
Create feature flag helpers (isArbitrageModeEnabled, setArbitrageMode)
Run import audit (identify all fastAgent references)
Create migration plan documentation
Day 3-5: Core Rename (12-15 hours)

Write automated rename script
Test rename script in dry-run mode
Execute rename (backend + frontend)
Update all imports (66 files)
Run linter, formatter, TypeScript compiler
Fix any broken references
Commit: "refactor: Rename FastAgent → ArbitrageAgent"
Week 2: Arbitrage Persona
Day 1-3: Modular Prompts (10-12 hours)

Design ARBITRAGE_MODE_PROMPT (2,300 tokens)
Refactor createCoordinatorAgent for feature-flag composition
Add arbitrage section keys to system
Test: Coordinator responds with arbitrage mindset
Commit: "feat: Add Arbitrage Agent persona with modular prompts"
Day 4-5: Tool Foundations (6-8 hours)

Create tool file structure (convex/tools/arbitrage/)
Define tool interfaces + argument schemas
Set up test files
Commit: "chore: Set up arbitrage tool infrastructure"
Week 3: Arbitrage Tools
Day 1: Contradiction Detection (8 hours)

Implement detectContradictions tool
LLM-based semantic grouping
Severity classification logic
Source trust verdict
Unit tests (4 test cases)
Commit: "feat: Add contradiction detection tool"
Day 2: Source Quality Ranking (6 hours)

Implement rankSourceQuality tool
Scoring rubric (primary/secondary/tertiary)
Recency boost logic
Unit tests (4 test cases)
Commit: "feat: Add source quality ranking tool"
Day 3: Delta Detection (8 hours)

Implement compareToBaseline tool
Fact signature matching
Set operations (added/removed/modified)
Severity classification
Unit tests (4 test cases)
Commit: "feat: Add delta detection tool"
Day 4: Source Health Check (6 hours)

Implement checkSourceHealth tool
HTTP HEAD request logic
Content hashing (SHA-256)
Hash comparison
Unit tests (4 test cases)
Commit: "feat: Add source health check tool"
Day 5: Tool Integration (6 hours)

Add all tools to coordinator agent
Update delegation tools with arbitrage context
Integration tests (workflow tests)
Commit: "feat: Integrate arbitrage tools into coordinator"
Week 4: UI Components
Day 1-2: Arbitrage Report Template (10 hours)

Create ArbitrageReport TypeScript interface
Implement formatArbitrageReportMarkdown function
Add template for all sections (summary, narrative table, contradictions, etc.)
Unit tests for formatting
Commit: "feat: Add arbitrage report template"
Day 3: Arbitrage Report Card Component (8 hours)

Create ArbitrageReportCard.tsx
Layout: Summary dashboard, Top deltas, Narrative table
Contradictions accordion
Gaps + Hidden sources sections
Timeline verification
Next questions
Component tests
Commit: "feat: Add ArbitrageReportCard component"
Day 4: Enhance Existing Components (6 hours)

Update SourceCard.tsx with quality indicator
Update StepTimeline.tsx with arbitrage status
Update CollapsibleAgentProgress.tsx for delta display
Component tests
Commit: "feat: Enhance UI components for arbitrage mode"
Day 5: Citation Parser Update (6 hours)

Update FastAgentPanel.VisualCitation.tsx
Add dual format parser (legacy + arbitrage)
Render verification badges (✅ ⚠️ ❌ ❓)
Unit tests for both formats
Commit: "feat: Add dual citation format support"
Week 5: Polish & Testing
Day 1: Error Handling (6 hours)

Create errorHandling.ts module
Define ArbitrageError types
Implement handleArbitrageError function
Implement resilientParallelDelegation
Unit tests
Commit: "feat: Add comprehensive error handling"
Day 2: Feature Flag UI (4 hours)

Add toggle to FastAgentPanel.Settings.tsx
Create warning modal for first enable
Add success toasts
E2E test for toggle
Commit: "feat: Add arbitrage mode toggle to settings"
Day 3: Integration Testing (8 hours)

Write end-to-end workflow tests
Test: Full arbitrage research flow
Test: Delta tracking across multiple checks
Test: Error handling scenarios
Commit: "test: Add arbitrage integration tests"
Day 4: E2E Testing (6 hours)

Write UI interaction tests
Test: Toggle arbitrage mode
Test: View arbitrage report card
Test: Click contradictions
Test: Backward compatibility
Commit: "test: Add arbitrage E2E tests"
Day 5: Documentation (6 hours)

Write user guide: "How to use Arbitrage Mode"
Update developer docs: "Arbitrage Agent Architecture"
Create migration guide for existing users
Update API docs with new tools
Commit: "docs: Add arbitrage mode documentation"
Week 6: Beta Launch
Day 1: Internal Testing (4 hours)

Enable for admin users
Run manual test scenarios
Fix critical bugs
Commit bug fixes
Day 2-3: Beta User Rollout (6 hours)

Invite 10-20 power users
Send onboarding email with guide
Set up feedback form
Monitor error logs
Day 4-5: Feedback & Iteration (8 hours)

Review user feedback
Fix UX issues
Tune tool parameters (scoring thresholds, etc.)
Commit improvements
📊 Success Metrics & KPIs
Adoption Metrics
Target (Week 1): 10% of active users enable arbitrage mode
Target (Week 4): 30% of active users
Target (Week 8): 50% of active users

Measurement:

SELECT 
  COUNT(DISTINCT userId) FILTER (WHERE agentsPrefs.arbitrageMode = 'enabled') 
    / COUNT(DISTINCT userId) AS adoption_rate
FROM userPreferences
WHERE updatedAt > NOW() - INTERVAL '7 days'

Quality Metrics
1. Source Quality Score

Target: Average >70/100 across all arbitrage reports
Measurement: Track arbitrageMetadata.sourceQualityScore per report
Threshold: If <60, investigate source quality ranking algorithm
2. Contradiction Rate

Target: <10% of reports have contradictions
Baseline: Expect ~5% in real-world research
Measurement: arbitrageMetadata.contradictionCount > 0
Alert: If >20%, may indicate tool over-sensitivity
3. Delta Detection

Target: Avg 5-10 deltas per weekly check
Measurement: arbitrageMetadata.deltasSinceLastCheck
Threshold: If >50, may indicate noisy data sources
4. Primary Source Coverage

Target: >40% of sources are primary (SEC, press releases)
Measurement: rankSourceQuality output (primaryCount / totalCount)
Threshold: If <20%, improve primary source discovery
Error Metrics
1. Delegation Failure Rate

Target: <5% of parallel delegations fail
Measurement: Error logs for "delegation_failed"
Threshold: If >10%, investigate agent stability
2. Source 404 Rate

Target: <5% of sources return 404
Measurement: sourceHealth status distribution
Threshold: If >10%, improve source selection
3. Tool Timeout Rate

Target: <2% of tool calls timeout
Measurement: Error logs for "tool_timeout"
Threshold: If >5%, increase timeout or optimize tool
User Satisfaction
1. Net Promoter Score (NPS)

Survey: "How likely are you to recommend Arbitrage Mode?" (0-10)
Target: NPS >50 (excellent)
Baseline: NPS 30-40 (good)
Measurement: Monthly in-app survey
2. Feature Usage Depth

Metric: % users who expand contradictions, click citations
Target: >40% engagement with arbitrage-specific features
Measurement: Click tracking on ArbitrageReportCard elements
3. Session Duration

Hypothesis: Arbitrage users spend more time (higher engagement)
Target: +20% session duration vs non-arbitrage
Measurement: Track session time for arbitrage-enabled vs disabled
Business Metrics
1. Premium Conversion

Hypothesis: Arbitrage users convert to paid at higher rate
Target: +15% conversion rate vs standard users
Measurement: Cohort analysis (arbitrage users → paid)
2. Retention

Hypothesis: Arbitrage users retain better (sticky feature)
Target: +10% D30 retention
Measurement: Cohort retention curves
3. Newsletter Engagement

Hypothesis: Delta-based newsletters have higher open rates
Target: +25% open rate for delta newsletters
Measurement: Email analytics (open, click rates)
🎓 User Education & Documentation
User-Facing Guide
Title: "How to Use Arbitrage Mode"

Sections:

1. What is Arbitrage Mode?

Explanation of receipts-first research
Benefits: contradiction detection, delta tracking, source quality
Use cases: Due diligence, competitive research, fact-checking
2. Enabling Arbitrage Mode

Step-by-step: Settings → Advanced → Toggle "Arbitrage Mode"
Screenshot of toggle
Warning about beta status
3. Understanding Arbitrage Reports

Arbitrage Summary:

What each badge means (✅ ⚠️ ❌ 🔍 📊)
Quality score interpretation (excellent/good/fair/poor)
When to trust vs investigate further
Narrative vs Evidence Table:

How to read the table
Verdict interpretation (supported/not found/contradicted)
What to do when claims are contradicted
Contradictions:

Why contradictions appear
How to resolve (check primary sources)
When to flag for manual review
Gaps:

What missing information means
How to fill gaps (custom queries)
Hidden Sources:

Why primary sources matter
How to access these sources
Timeline Verification:

Reading the timeline
Verification status meanings
Next Questions:

How to use suggested follow-ups
Iterative research workflow
4. Best Practices

Start with arbitrage mode for important research
Use delta tracking for weekly updates
Always check contradictions before final decision
Prioritize primary sources in reports
5. Troubleshooting

"No contradictions detected" → May indicate consensus or limited sources
"Source unavailable (404)" → Try alternative sources
"Rate limit hit" → Wait and retry
Report quality issues via feedback form
Developer Documentation
Title: "Arbitrage Agent Architecture"

Sections:

1. System Overview

Architecture diagram
Component responsibilities
Data flow
2. Schema

entityContexts extensions
Field definitions
Migration guide
3. Tools

Tool catalog with descriptions
Algorithm explanations
Usage examples
4. Prompts

Modular prompt system
Feature flag composition
Customizing arbitrage behavior
5. Error Handling

Error types
Recovery strategies
Adding new error types
6. Testing

Test structure
Running tests
Writing new tests
7. Feature Flags

Flag architecture
Adding new flags
Rollout strategy
8. Performance

Parallel delegation
Caching strategies
Optimization tips
🔮 Future Enhancements (Post-Launch)
Phase 2 Features (Q1 2026)
1. Automated Source Discovery

Crawl primary sources automatically (SEC, company blogs)
Reduce reliance on third-party APIs
Cost savings + higher quality
2. Fact Versioning

Track fact changes over time (not just deltas)
"Show me valuation estimates over last 6 months"
Time-series visualization
3. Corroboration Boost

If 3+ sources report same fact → confidence boost
If only 1 source → flag as "single-source"
Adjust source quality score based on corroboration
4. Automated Alerts

User subscribes to entity (e.g., "Watch Tesla")
Weekly digest: "5 new facts, 2 contradictions this week"
Email or in-app notifications
5. Arbitrage API

Public API for arbitrage reports
Use case: Investment firms want programmatic access
Monetization opportunity
Phase 3 Features (Q2 2026)
6. Multi-Entity Comparison

"Compare arbitrage reports for Tesla vs Rivian"
Side-by-side quality scores
Identify which company has better source coverage
7. Source Reliability Score

Track: How often does TechCrunch get contradicted by SEC?
Build source trust database
Downgrade unreliable sources over time
8. AI Judge for Contradictions

For unresolved contradictions (both primary sources)
Use advanced reasoning model (o3) to analyze
Suggest which source more likely correct + reasoning
9. User Contributions

Users can submit new sources
Upvote/downvote source quality
Community-driven source curation
10. Export to CRM

"Export Tesla arbitrage report to Salesforce"
Auto-fill CRM fields with verified facts
Integration with HubSpot, Airtable, etc.
🎬 Conclusion
What We're Building
A fundamental shift from "Fast Agent" (general research) to "Arbitrage Agent" (receipts-first evidence auditor) that:

Exploits information arbitrage across sources, time, coverage, and consensus
Detects contradictions automatically with LLM-powered semantic analysis
Tracks deltas over time for "What's new?" queries
Ranks source quality (primary > secondary > tertiary)
Monitors source health (404s, content changes)
Generates arbitrage reports with verification badges
Why It Matters
Competitive Differentiation:

No other AI research tool systematically detects contradictions
Unique "receipts-first" positioning builds trust
Premium feature for pro users (monetization path)
User Value:

Investors: Due diligence with verified facts
Journalists: Fact-checking with source trails
Researchers: Weekly deltas instead of full re-reads
Everyone: Know which sources to trust
Implementation Path
5 Phases, 6 Weeks:

Week 1: Foundation (rename, feature flags)
Week 2: Persona (modular prompts)
Week 3: Tools (4 new arbitrage tools)
Week 4: UI (report card, badges, tables)
Week 5: Polish (tests, error handling, docs)
Week 6: Beta launch
Estimated Effort: 31-39 hours (~1 developer full-time)

Success Criteria
Week 4: 30% user adoption
Week 8: 50% user adoption
Ongoing: Average source quality >70/100, <10% contradiction rate
Business: +15% conversion to paid, +10% retention

Ready to Ship?
This plan is production-ready with:

✅ All v1 gaps addressed
✅ Complete file map (66 files)
✅ Detailed tool algorithms
✅ Backward compatibility
✅ Error handling strategy
✅ Full test coverage
✅ Migration plan
✅ User documentation
Next Action: Review with team → Create GitHub project → Start Week 1 🚀

