# Feature & Route Map

## Control Plane Addendum

Recently shipped receipts-first trust surfaces:

```
/            -> control-plane  src/features/controlPlane/views/ControlPlaneLanding.tsx
/receipts    -> receipts       src/features/controlPlane/views/ActionReceiptFeed.tsx
/delegation  -> delegation     src/features/controlPlane/views/DelegationShowcase.tsx
```

## Route Registry (37 views, 3 active groups)

**Route groups:** `core` (4) | `nested` (23) | `internal` (10)

```
/                           → control-plane (NodeBench Control Plane landing) [/home, /landing]
/receipts                   → receipts         [/action-receipts]  src/features/controlPlane/views/ActionReceiptFeed

── Research & Intelligence ─────────────────────────────────────────────
/research                   → research        [/hub]              src/features/research/
  /research/overview
  /research/signals
  /research/briefing
  /research/deals
  /research/changes
  /research/changelog
/signals                    → signals                             src/features/research/views/PublicSignalsLog
/for-you                    → for-you-feed    [/feed]             src/features/research/components/ForYouFeed
/industry                   → industry-updates [/dashboard/industry] src/components/IndustryUpdatesPanel
/funding                    → funding         [/funding-brief]    src/features/research/views/FundingBriefView
/showcase                   → showcase        [/demo]             src/features/research/views/PhaseAllShowcase
/footnotes                  → footnotes       [/sources]          src/features/research/views/FootnotesPage
/entity/:name               → entity          (dynamic)           src/features/research/views/EntityProfilePage
/benchmarks                 → benchmarks      [/eval]             src/features/benchmarks/views/WorkbenchView
/investigation              → investigation   [/investigate, /enterprise-demo]
                                                                  src/features/investigation/views/EnterpriseInvestigationView
/product-direction          â†’ product-direction [/strategy, /research/product-direction]
                                                                  src/features/strategy/views/ProductDirectionMemoView

── Workspace & Build ───────────────────────────────────────────────────
/documents                  → documents       [/docs, /workspace] src/features/documents/components/DocumentsHomeHub
/spreadsheets               → spreadsheets                        src/features/spreadsheets/components/SpreadsheetsHub
  /spreadsheets/:id                                               src/features/documents/views/SpreadsheetView
/calendar                   → calendar                            src/features/calendar/views/CalendarView
/roadmap                    → roadmap                             src/components/timelineRoadmap/TimelineRoadmapView
/timeline                   → timeline                            src/components/timelineRoadmap/TimelineRoadmapView
/public                     → public          [/shared]           src/features/documents/views/PublicDocuments
/recommendations            → document-recommendations [/discover]
                                                                  src/components/RecommendationPanel

── Agents & Automation ─────────────────────────────────────────────────
/agents                     → agents                              src/features/agents/views/AgentsHub
/marketplace                → agent-marketplace [/agent-marketplace]
                                                                  src/features/agents/components/AgentMarketplace
/activity                   → activity        [/public-activity]  src/features/agents/views/PublicActivityView
/mcp-ledger                 → mcp-ledger      [/mcp/ledger, /activity-log]
                                                                  src/features/mcp/views/McpToolLedgerView

── Code & Social ───────────────────────────────────────────────────────
/github                     → github-explorer [/github-explorer]  src/features/research/components/GitHubExplorer
/pr-suggestions             → pr-suggestions  [/prs]              src/features/monitoring/components/PRSuggestions
/linkedin                   → linkedin-posts                      src/features/social/components/LinkedInPostCard

── Analytics & System ──────────────────────────────────────────────────
/analytics/hitl             → analytics-hitl  [/analytics/review-queue, /review-queue]
                                                                  src/features/analytics/views/HITLAnalyticsDashboard
/analytics/components       → analytics-components                src/features/analytics/views/ComponentMetricsDashboard
/analytics/recommendations  → analytics-recommendations           src/features/analytics/views/RecommendationAnalyticsDashboard
/cost                       → cost-dashboard  [/dashboard/cost]   src/components/CostDashboard

── Platform ────────────────────────────────────────────────────────────
/dogfood                    → dogfood         [/quality-review]   src/features/dogfood/views/DogfoodReviewView
/observability              → observability   [/health, /system-health]
                                                                  src/features/observability/views/ObservabilityView
/engine                     → engine-demo     [/engine-demo]      src/features/engine/views/EngineDemoView
/oracle                     → oracle          [/career, /trajectory]
                                                                  src/features/oracle/views/OracleView
/dev-dashboard              → dev-dashboard   [/dev, /evolution]  src/features/devDashboard/views/DevDashboard
```

## Feature Module Tree (24 features)

```
src/features/
├── agents/                      # 98 components, 6 views — LARGEST
│   ├── components/
│   │   ├── FastAgentPanel/      #   29 files (agent chat, skills, swarm lanes, etc.)
│   │   ├── TaskManager/         #   task planning, types
│   │   ├── AgentCommandBar.tsx
│   │   ├── AgentMarketplace.tsx
│   │   ├── AgentSidebar.tsx
│   │   ├── AgentStatusCard.tsx
│   │   ├── AutonomousOperationsPanel.tsx
│   │   ├── FloatingAgentButton.tsx
│   │   └── HumanApprovalQueue.tsx
│   └── views/
│       ├── AgentsHub.tsx          ← /agents
│       ├── PublicActivityView.tsx ← /activity
│       ├── DeepAgentProgress.tsx  (embedded, not routed)
│       ├── LiveAgentLanes.tsx     (embedded, not routed)
│       ├── TaskPlanPanel.tsx      (embedded, not routed)
│       └── WorkflowMetricsBar.tsx (embedded, not routed)
│
├── research/                    # 94 components, 9 views
│   ├── components/
│   │   ├── dossier/             #   media gallery
│   │   ├── newsletter/          #   evidence drawer
│   │   ├── ActAwareDashboard, ActionCard, ChangeCard, CrossLinkedText,
│   │   │   DashboardPanel, DayStarterCard, DealListPanel, DealRadar,
│   │   │   DealTable, EmailDigestPreview, EnhancedLineChart,
│   │   │   EntityContextDrawer, EntityHoverPreview, EntityLink,
│   │   │   EntityRadar, EvidenceGrid, EvidencePanel, EvidenceTimeline,
│   │   │   ExecutiveBriefHeader, ExportBriefButton, FeedCard,
│   │   │   FeedReaderModal, FootnoteMarker, FootnotesSection,
│   │   │   ForYouFeed, ForecastCard, ForecastCockpit, GitHubExplorer,
│   │   │   HeroSection, InstantSearchBar, IntelPulseMonitor,
│   │   │   LiveDashboard, MagicInputContainer, ModelComparisonTable,
│   │   │   ModelEvalDashboard, MorningDigest, OvernightMovesCard,
│   │   │   PaperDetailsCard, ProductChangelogPanel, PulseGrid,
│   │   │   RelatedFeedsGrid, RepoSignalPanel, RepoStatsPanel,
│   │   │   SignalCard, SignalTimeseriesPanel, SmartLink, SourceFeed,
│   │   │   StackImpactPanel, StickyDashboard, StrategyMetricsPanel,
│   │   │   TimelineStrip, TraceBreadcrumb, TrendRail, WhatChangedPanel
│   │   └── (total: ~55 components)
│   ├── content/
│   │   └── researchStream.json
│   ├── hooks/
│   │   ├── useBriefData.ts
│   │   └── usePersonalBrief.ts
│   ├── sections/
│   │   ├── BriefingSection.tsx
│   │   ├── DashboardSection.tsx
│   │   └── FeedSection.tsx
│   └── views/
│       ├── CinematicHome.tsx         (research hub renderer)
│       ├── DossierViewer.tsx         (embedded/modal)
│       ├── EntityProfilePage.tsx     ← /entity/:name
│       ├── FootnotesPage.tsx         ← /footnotes
│       ├── FundingBriefView.tsx      ← /funding
│       ├── LiveDossierDocument.tsx   (embedded/modal)
│       ├── PhaseAllShowcase.tsx      ← /showcase
│       └── PublicSignalsLog.tsx      ← /signals
│
├── documents/                   # 31 components, 4 views
│   ├── components/
│   │   ├── documentsHub/        #   sidebar, cards, kanban, planner, rows
│   │   ├── DocumentGrid.tsx
│   │   ├── DocumentHeader.tsx
│   │   ├── DocumentsHomeHub.tsx ← /documents
│   │   ├── MediaCinemaViewer.tsx
│   │   └── RichPreviews.tsx
│   ├── editors/
│   │   ├── DocumentMiniEditor.tsx
│   │   ├── DualCreateMiniPanel.tsx
│   │   ├── DualEditMiniPanel.tsx
│   │   └── SpreadsheetMiniEditor.tsx
│   └── views/
│       ├── FileViewer.tsx        (embedded)
│       ├── PublicDocuments.tsx    ← /public
│       └── SpreadsheetView.tsx   ← /spreadsheets/:id
│
├── calendar/                    # 13 components, 1 view
│   ├── components/
│   │   ├── agenda/              #   AgendaMiniRow, InlineEventEditor
│   │   ├── CalendarHomeHub.tsx
│   │   ├── EventEditorPanel.tsx
│   │   ├── MiniMonthCalendar.tsx
│   │   └── TaskEditorPanel.tsx
│   └── views/
│       └── CalendarView.tsx      ← /calendar
│
├── narrative/                   # 12 components, 0 views (EMBEDDED ONLY)
│   └── components/
│       ├── HypothesisScorecard/
│       ├── NarrativeCard/
│       ├── NarrativeRoadmap/
│       │   ├── CorrelationLine.tsx
│       │   ├── EventMarker.tsx
│       │   ├── NarrativeRoadmap.tsx
│       │   └── ThreadLane.tsx
│       └── NarrativeFeed.tsx
│
├── editor/                      # 9 components, 0 views (EMBEDDED ONLY)
│   └── components/
│       └── UnifiedEditor/
│           ├── InspectorPanel.tsx
│           └── (8 other sub-components)
│
├── analytics/                   # 0 components, 3 views
│   └── views/
│       ├── HITLAnalyticsDashboard.tsx           ← /analytics/hitl
│       ├── ComponentMetricsDashboard.tsx         ← /analytics/components
│       └── RecommendationAnalyticsDashboard.tsx  ← /analytics/recommendations
│
├── investigation/               # 1 component, 1 view ← NEW
│   ├── data/
│   │   └── ftxGoldenDataset.ts
│   ├── logic/
│   │   └── adversarialReview.ts
│   ├── components/
│   │   └── ProvenanceBadge.tsx
│   └── views/
│       └── EnterpriseInvestigationView.tsx ← /investigation
│
├── benchmarks/                  # 5 components, 1 view
│   └── views/
│       └── WorkbenchView.tsx     ← /benchmarks
│
├── strategy/                    # 0 components, 1 view
│   ├── data/
│   │   └── testsAssuredProductDirection.ts
│   ├── types/
│   │   └── inHouseProductDirection.ts
│   └── views/
│       └── ProductDirectionMemoView.tsx ← /product-direction
│
├── oracle/                      # 3 components, 1 view
│   └── views/
│       └── OracleView.tsx        ← /oracle
│
├── admin/                       # 3 components, 1 view
│   └── FundingDataReview.tsx
│
├── onboarding/                  # 2 components, 1 view
│   └── components/
│       └── AgentGuidedOnboarding.tsx
│
├── social/                      # 1 component, 1 view
│   └── components/
│       └── LinkedInPostCard.tsx  ← /linkedin
│
├── spreadsheets/                # 1 component, 1 view
│   └── components/
│       └── SpreadsheetsHub.tsx   ← /spreadsheets
│
├── dogfood/                     # 0 components, 1 view
│   └── views/
│       └── DogfoodReviewView.tsx ← /dogfood
│
├── engine/                      # 0 components, 1 view
│   └── views/
│       └── EngineDemoView.tsx    ← /engine
│
├── mcp/                         # 0 components, 1 view
│   └── views/
│       └── McpToolLedgerView.tsx ← /mcp-ledger
│
├── monitoring/                  # 1 component, 0 views (routed via registry)
│   └── components/
│       └── PRSuggestions.tsx      ← /pr-suggestions
│
├── observability/               # 0 components, 1 view
│   └── views/
│       └── ObservabilityView.tsx ← /observability
│
├── settings/                    # 3 components, 0 views (modal, not routed)
│   └── components/
│
├── devDashboard/                # 0 components, 0 views (empty/placeholder)
├── chat/                        # 0 components (empty placeholder)
└── verification/                # 0 components (empty placeholder)
```

## Shared Components (not in features/)

```
src/components/                  # 35+ shared components
├── ui/                          #   Button, Card, EmptyState, SidebarButton (re-exports from shared/ui)
├── sidebar/                     #   footer/UserProfile
├── skeletons/                   #   CostDashboard, IndustryUpdates, ViewSkeleton
├── widgets/                     #   WeekendPlannerWidget
├── artifacts/                   #   MediaRail, SourcesLibrary
├── email/                       #   EmailInboxView, EmailReportViewer, EmailThreadDetail
├── timelineRoadmap/             #   TimelineRoadmapView ← /roadmap, /timeline
├── QuickCapture/                #   QuickCaptureWidget
├── AnimatedComponents, ApiUsageDisplay, CostDashboard,
│   EmptyStates, EnhancedPersonalPulse, EnhancedTimelineStrip,
│   ErrorBoundary, FiltersToolsBar, IndustryUpdatesPanel,
│   ModelSelector, NotificationActivityPanel, OnboardingFlow,
│   PersonalAnalytics, PersonalDashboard, RecommendationCard,
│   RecommendationPanel, SettingsModal, SkipLinks, TabManager,
│   ThemeCustomizer, UsageDashboard, WebMcpSettingsPanel,
│   WorkspaceGrid
└── grid-constants.ts

src/shared/                      # Canonical shared layer
├── ui/                          #   Button, SignatureOrb, UnifiedHubPills (canonical)
├── components/                  #   ErrorBoundary (re-export), LazyView
├── editors/                     #   PopoverMiniDocEditor
└── hooks/                       #   FeedbackListener, useFeedback
```

## Collocation Issues

| Issue | Location | Recommendation |
|-------|----------|----------------|
| **Misplaced components** | `src/components/CostDashboard.tsx` routed as `/cost` | Move to `src/features/analytics/views/` |
| **Misplaced components** | `src/components/IndustryUpdatesPanel.tsx` routed as `/industry` | Move to `src/features/research/components/` |
| **Misplaced components** | `src/components/RecommendationPanel.tsx` routed as `/recommendations` | Move to `src/features/documents/components/` |
| **Misplaced components** | `src/components/timelineRoadmap/` routed as `/roadmap`, `/timeline` | Move to `src/features/research/views/` or own feature |
| **Empty features** | `chat/`, `verification/`, `devDashboard/` | Delete or populate |
| **Naming mismatch** | Feature dir `devDashboard/` vs view id `dev-dashboard` | Rename dir to `dev-dashboard/` |
| **Cross-feature routing** | `GitHubExplorer` lives in `research/` but is `/github` | Move to own `github/` feature or `monitoring/` |
| **Cross-feature routing** | `PRSuggestions` lives in `monitoring/` but is `/pr-suggestions` | Consistent with pattern, but `monitoring/` has only 1 file |
| **Cross-feature routing** | `LinkedInPostCard` lives in `social/` but is `/linkedin` | Feature has only 1 file — merge into `research/` or keep |

## Stats

- **37 registered views** (lazy and custom-rendered surfaces tracked in one registry)
- **24 feature directories** (3 empty placeholders)
- **~290 components** across all features
- **15 view files** not exposed as top-level routes (embedded/modal/sub-panel)
- **4 routed components** living in `src/components/` instead of `src/features/`
