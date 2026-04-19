# Nodebench AI - User Journey Pathways Documentation

## Overview

This document provides a comprehensive mapping of all user journeys and navigation pathways in the Nodebench AI application. The application is built as a full-stack AI-powered research and workspace platform with React 19, TypeScript, Convex backend, and multiple AI integrations.

## Application Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend**: Convex (serverless backend platform)
- **Authentication**: Convex Auth with Google OAuth and Anonymous login
- **AI Integrations**: Anthropic Claude, OpenAI GPT-4, Google Gemini, OpenRouter
- **Real-time**: WebSocket via Convex, ProseMirror for collaborative editing

---

## Entry Points

### 1. Initial Load (`src/main.tsx` → `src/App.tsx`)
```
User opens app
    │
    ├── Unauthenticated User
    │   └── MainLayout (limited features)
    │       └── Research Hub (CinematicHome) - Guest preview mode
    │
    └── Authenticated User
        └── MainLayout (full features)
            ├── TutorialPage (if opted in)
            └── Research Hub / Workspace
```

### 2. URL Hash Routes
The application uses hash-based routing for view switching:

| Hash | View | Component |
|------|------|-----------|
| `#research` | Research Hub | `ResearchHub.tsx` / `CinematicHome.tsx` |
| `#documents` | Documents Workspace | `DocumentsHomeHub.tsx` |
| `#calendar` | Calendar Hub | `CalendarHomeHub.tsx` |
| `#agents` | Agents Hub | `AgentsHub.tsx` |
| `#roadmap` | Timeline Roadmap | `TimelineRoadmapView.tsx` |
| `#showcase` | Feature Showcase | `PhaseAllShowcase.tsx` |
| `#footnotes` | Sources/References | `FootnotesPage.tsx` |
| `#signals` | Real-time Signals | `PublicSignalsLog.tsx` |
| `#benchmarks` | Model Evaluation | `ModelEvalDashboard.tsx` |
| `#entity/{name}` | Entity Profile | `EntityProfilePage.tsx` |
| `#public` | Public Documents | `PublicDocuments.tsx` |

---

## Primary User Journeys

### Journey 1: Research Intelligence Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                     RESEARCH INTELLIGENCE JOURNEY                     │
└──────────────────────────────────────────────────────────────────────┘

1. Landing Page (CinematicHome)
   ├── User Stats Display (documents, tasks, streaks)
   ├── Quick Action Buttons
   │   ├── "New Document" → Documents Hub
   │   └── "Research Hub" → Research Dossier
   └── Discovery Cards
       ├── "The Research Hub" → Deep Research View
       └── "Strategic Workspace" → Documents Hub

2. Research Hub (ResearchHub)
   ├── Timeline Strip
   │   ├── Past events (evidence-based)
   │   ├── Present (today's briefing)
   │   └── Future (projections)
   │
   ├── ACT I: Executive Synthesis
   │   ├── Digest Section (morning brief)
   │   └── Entity Click → Entity Context Drawer
   │
   ├── Personal Pulse Section
   │   ├── Tasks Today
   │   ├── Recent Documents
   │   └── Personalized Context
   │
   ├── ACT II: Institutional Briefing
   │   ├── Briefing Section
   │   ├── "Ask AI" → Fast Agent Panel
   │   └── Reader Modal (source viewing)
   │
   ├── ACT III: Live Signal Stream
   │   ├── Feed Section (real-time sources)
   │   ├── Item Click → Feed Reader Modal
   │   └── "Open with Agent" → Fast Agent Panel
   │
   └── HUD Sidebar (Desktop)
       ├── ActAware Dashboard
       ├── Charts & Metrics
       └── Notification Panel

3. Entity Deep Dive
   ├── Click entity name in any section
   └── Entity Context Drawer opens
       ├── Company/Person profile
       ├── Related sources
       └── Tracked hashtags
```

### Journey 2: Document Workspace Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                     DOCUMENT WORKSPACE JOURNEY                        │
└──────────────────────────────────────────────────────────────────────┘

1. Documents Home Hub
   ├── Top Navigation Bar
   │   ├── Unified Hub Pills (Documents | Calendar | Agents)
   │   └── Page Hero Header
   │
   ├── Quick Create Bar
   │   ├── New Document
   │   ├── New Task
   │   └── Quick Capture
   │
   ├── Main Content Area
   │   ├── TODAY Section
   │   │   ├── Task List (sortable)
   │   │   ├── Task Click → Inline Editor
   │   │   └── Status Toggle (todo → in_progress → done)
   │   │
   │   ├── THIS WEEK Section
   │   │   ├── Week Navigation (<< | Week | >>)
   │   │   └── Tasks grouped by day
   │   │
   │   ├── DOCUMENTS Section
   │   │   ├── Recent Documents Grid
   │   │   ├── Document Card Click → Tab Manager
   │   │   └── Grid Mode Toggle
   │   │
   │   └── KANBAN VIEW (Alternative)
   │       ├── To Do Lane
   │       ├── In Progress Lane
   │       ├── Done Lane
   │       └── Drag-and-Drop reordering
   │
   └── Sidebar
       ├── Mini Calendar
       ├── Upcoming Tasks
       └── Collapse/Expand Toggle

2. Document Editor (TabManager)
   ├── Tab Bar
   │   ├── Multiple document tabs
   │   ├── Tab Close (X)
   │   └── Grid Mode Toggle
   │
   ├── Document View
   │   ├── TipTap/BlockNote Rich Editor
   │   ├── @mention linking (other documents)
   │   ├── #hashtag support
   │   └── Real-time sync
   │
   └── Context Actions
       ├── "Chat with Document" → Fast Agent Panel
       ├── Export Options
       └── Share/Publish
```

### Journey 3: Calendar & Task Management Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                     CALENDAR & TASK JOURNEY                           │
└──────────────────────────────────────────────────────────────────────┘

1. Calendar Home Hub
   ├── Calendar View (Full Month Grid)
   │   ├── Date Selection → View Day
   │   ├── Week View Toggle
   │   └── Quick Add Task (click date)
   │
   └── Sidebar
       ├── Mini Month Calendar
       │   ├── Date Navigation
       │   └── View Full Calendar Link
       │
       └── Upcoming Section
           ├── Tasks sorted by date
           └── Document links

2. Task Lifecycle
   ├── Create Task
   │   ├── Quick Create Bar
   │   ├── Calendar Quick Add
   │   └── Document-linked tasks
   │
   ├── Edit Task
   │   ├── Inline Editor (list mode)
   │   ├── Task Editor Panel (kanban mode)
   │   └── Status/Priority chips
   │
   ├── Status Transitions
   │   ├── todo → in_progress (start working)
   │   ├── in_progress → done (complete)
   │   └── Click status stripe to cycle
   │
   └── Task Organization
       ├── Drag-and-drop reordering
       ├── Date assignment
       └── Priority levels
```

### Journey 4: AI Agent Interaction Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                     AI AGENT INTERACTION JOURNEY                      │
└──────────────────────────────────────────────────────────────────────┘

1. Agents Hub
   ├── Quick Stats Bar
   │   ├── Total Agents
   │   ├── Active Now
   │   ├── Tasks Completed
   │   └── Success Rate
   │
   ├── Command Bar
   │   ├── Text Input (natural language)
   │   ├── /spawn syntax for specific agents
   │   └── Agent Mode Selection
   │
   ├── Active Swarms Section
   │   ├── Running swarm visualization
   │   ├── Swarm Lanes View
   │   └── Progress tracking
   │
   ├── Agent Status Grid
   │   ├── Coordinator Agent
   │   ├── Document Agent
   │   ├── Media Agent
   │   ├── SEC Agent
   │   ├── OpenBB Agent
   │   └── Arbitrage Agent
   │
   └── Human Approval Queue
       ├── Pending approvals
       └── Approve/Reject actions

2. Fast Agent Panel (Global Sidebar)
   ├── Access Methods
   │   ├── Top Bar "Fast Agent" toggle
   │   ├── "Ask AI" buttons throughout app
   │   └── "Chat with Document" action
   │   └── Context-aware opening (from Research Hub)
   │
   ├── Thread Management
   │   ├── Thread List (collapsible)
   │   ├── New Thread (+)
   │   └── Thread switching
   │
   ├── Chat Interface
   │   ├── Message Stream (streaming responses)
   │   ├── Tool Call Visualization
   │   ├── Thinking Steps
   │   └── Source Citations
   │
   ├── Input Bar
   │   ├── Text Input
   │   ├── File Upload
   │   ├── Context Documents (drag-drop)
   │   └── Model Selection
   │
   └── Specialized Tabs
       ├── Brief Tab (dossier mode)
       ├── Tasks Tab
       ├── Edits Tab
       └── Skills Panel

3. Deep Agent Workflows
   ├── Trigger
   │   ├── Command with specific agent
   │   └── Multi-agent swarm spawn
   │
   ├── Execution
   │   ├── Parallel task timeline
   │   ├── Sub-agent delegation
   │   └── Human-in-the-loop checkpoints
   │
   └── Results
       ├── Document creation
       ├── Task updates
       └── Citation attachments
```

### Journey 5: Settings & Account Management

```
┌──────────────────────────────────────────────────────────────────────┐
│                     SETTINGS & ACCOUNT JOURNEY                        │
└──────────────────────────────────────────────────────────────────────┘

1. Access Settings
   ├── User Avatar (Top Bar) → Settings Modal
   ├── Sidebar Settings Icon
   └── Command Palette (Cmd/Ctrl+K)

2. Settings Modal Tabs
   ├── Profile
   │   ├── Name, Avatar
   │   └── Account type
   │
   ├── Account
   │   ├── Email
   │   └── Sign out
   │
   ├── Usage
   │   ├── API usage stats
   │   └── Limits
   │
   ├── Integrations
   │   ├── API Keys
   │   └── Third-party services
   │
   ├── Billing
   │   └── Subscription management
   │
   └── Reminders
       └── Notification preferences
```

---

## Global Navigation Components

### Sidebar (CleanSidebar)
```
┌─────────────────────────┐
│  Logo (Nodebench AI)    │
├─────────────────────────┤
│  Global Navigation      │
│  ├── Research (Home)    │
│  ├── My Workspace       │
│  └── Saved Dossiers ▼   │
│      ├── Dossier 1      │
│      ├── Dossier 2      │
│      └── Dossier 3      │
├─────────────────────────┤
│  File Explorer          │
│  ├── Recent Documents ▼ │
│  │   ├── Doc 1         │
│  │   ├── Doc 2         │
│  │   └── ...           │
│  └── Trash             │
├─────────────────────────┤
│  User Profile           │
│  ├── Avatar + Name      │
│  ├── Settings ⚙️        │
│  └── Sign in (if guest) │
└─────────────────────────┘
```

### Top Bar
```
┌─────────────────────────────────────────────────────────────────┐
│ ☰ │ Page Title              │    │ Fast Agent │ User Avatar   │
└─────────────────────────────────────────────────────────────────┘
  │                                       │             │
  │                                       │             └── Settings
  └── Mobile menu toggle                  └── Toggle Fast Agent Panel
```

### Command Palette (Cmd/Ctrl+K)
```
┌─────────────────────────────────────┐
│  🔍 Type a command...               │
├─────────────────────────────────────┤
│  Navigation                          │
│  ├── Go to Research Hub             │
│  ├── Go to Documents                │
│  ├── Go to Calendar                 │
│  └── Go to Agents                   │
├─────────────────────────────────────┤
│  Actions                             │
│  ├── Create New Document            │
│  ├── Create New Task                │
│  └── Open Settings                  │
└─────────────────────────────────────┘
```

---

## Custom Events & Deep Linking

### Window Events for Navigation
| Event | Purpose | Payload |
|-------|---------|---------|
| `navigate:calendar` | Switch to Calendar Hub | - |
| `navigate:documents` | Switch to Documents Hub | - |
| `navigate:agents` | Switch to Agents Hub | - |
| `navigate:roadmap` | Switch to Roadmap | - |
| `navigate:fastAgentThread` | Open specific thread | `{ threadId: string }` |
| `ai:chatWithDocument` | Open agent with document | `{ documentId, documentTitle }` |
| `ai:openMultipleDocuments` | Open docs in grid | `{ documentIds: Id[] }` |
| `nodebench:openDocument` | Navigate to document | `{ documentId, openInGrid? }` |
| `nodebench:goBack` | Return to hub from editor | - |
| `document:create` | Create new document | - |

---

## Performance Considerations

### Lazy Loading
The following views are lazy-loaded for optimal initial bundle size:
- `DocumentsHomeHub`
- `CalendarHomeHub`
- `AgentsHub`
- `TimelineRoadmapView`
- `ResearchHub`
- `CinematicHome`
- `PhaseAllShowcase`
- `FootnotesPage`
- `PublicSignalsLog`
- `ModelEvalDashboard`
- `EntityProfilePage`
- `PublicDocuments`

### Prefetched Data
When viewing any page, the following queries are kept subscribed for instant navigation:
- `getSidebarWithPreviews` (documents)
- `getCalendarUiPrefs` (calendar preferences)
- `listTasksByStatus` (todo, in_progress, done tasks)

### Chunk Splitting (vite.config.ts)
Vendor bundles are split for optimal caching:
- `react-vendor`: React core
- `convex-vendor`: Convex SDK
- `ai-vendor`: AI SDK packages
- `chart-vendor`: Vega, Recharts
- `editor-core-vendor`: TipTap, BlockNote
- `prosemirror-vendor`: ProseMirror
- `markdown-vendor`: Markdown processing
- `syntax-vendor`: Code highlighting
- `data-vendor`: AG-Grid, React Window
- `spreadsheet-vendor`: XLSX, PapaParse
- `emoji-vendor`: Emoji Mart
- `collab-vendor`: Yjs collaboration
- `flow-vendor`: React Flow
- `ui-vendor`: Mantine, Lucide, Framer Motion

---

## User Journey Success Metrics

### Key Performance Indicators
1. **Time to First Meaningful Paint**: < 2s
2. **Route Change Time**: < 500ms
3. **Agent Response Start**: < 1s (streaming)
4. **Document Save**: < 200ms
5. **Task Status Update**: < 100ms

### Lighthouse Targets
- Performance: > 80
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 80

---

## Testing User Journeys

Run the performance test suite:
```bash
npx playwright test tests/performance-lighthouse.spec.ts
```

This tests:
- Initial load performance
- Bundle sizes
- Route navigation timing
- Component toggle performance
- Memory leak detection
- Animation smoothness
- Full user journey completion

---

## Related Documentation
- `docs/architecture/` - System architecture
- `convex/domains/` - Backend domain structure
- `src/features/` - Feature modules
- `tests/` - E2E test specifications
