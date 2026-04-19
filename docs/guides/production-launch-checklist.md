# Production Launch Checklist

> "Drop anything you find into NodeBench and it turns it into a report you can save, revisit, and act on."

One workflow. Five screens. Real data only.

```
Messy input -> live chat run -> clean report -> save/share -> nudge later
```

---

## The 5 Screens

### Screen 1: Home
**Job:** Start instantly

| Must be real | Status | File targets |
|-------------|--------|-------------|
| Slim ask bar (first pixel = input) | Partially done (pill/H1 removed but example cards still compete) | `src/features/home/views/HomeLanding.tsx` |
| Upload from Photos/Files/Camera/Paste/Voice | Exists (Upload/Paste/Voice/Camera buttons) | `HomeLanding.tsx` |
| Recent public report cards (from saved reports, not fixtures) | NOT REAL — currently fixture data | `HomeLanding.tsx`, `convex/domains/product/reports.ts` |
| Click-through into Chat | Works (`startChat()` navigates to chat with `?q=&lens=`) | `HomeLanding.tsx` |
| ?q= URL auto-submit | Done (this session) | `HomeLanding.tsx` |
| Recent searches from localStorage | Done (this session) | `productSession.ts`, `HomeLanding.tsx` |

**Cut now:** Example cards section ("START WITH ONE EXAMPLE" + "MORE STARTING POINTS"). Replace with real recent/public report cards from Convex.

### Screen 2: Chat
**Job:** Work happens

| Must be real | Status | File targets |
|-------------|--------|-------------|
| Real SSE streaming | Works (useStreamingSearch) | `src/hooks/useStreamingSearch.ts`, `server/vercel/searchApp.ts` |
| Partial answer rendering (progressive) | Done (this session — skeleton sections reveal per stage) | `src/features/chat/views/ChatHome.tsx` |
| Sources inline with answer | Partially done (Sources sidebar exists, not inline with answer blocks) | `ChatHome.tsx` |
| Save to report | Button exists, wired to `convex/domains/product/reports.ts` | `ChatHome.tsx` |
| Use of uploads + saved Me context | Partially done (context pills exist, dynamic counts added this session) | `ChatHome.tsx` |
| Share link (copy URL with ?q=&lens=) | Done (this session) | `ChatHome.tsx` |
| Sticky bottom composer | Done (this session) | `ChatHome.tsx` |
| Follow-up chips (Go deeper, Show risks, Draft reply, What changed?) | Exists | `ChatHome.tsx` |

**Cut now:** Left sidebar (CONTEXT, EVIDENCE CARDS, STAGE PILLS, RUN SNAPSHOT) — move essential info (lens, stage indicator) into the answer area. Remove sidebar entirely on first launch.

### Screen 3: Reports
**Job:** Saved useful output

| Must be real | Status | File targets |
|-------------|--------|-------------|
| Real persisted report pages | Convex model exists (`productReports` table) | `convex/domains/product/reports.ts` |
| Real timestamps | `updatedAt` field exists | `reports.ts` |
| Real sources in report | Report sections exist but source attachment is partial | `ReportsHome.tsx` |
| Shareable URL | Done (this session — copy link on cards) | `src/features/reports/views/ReportsHome.tsx` |
| Reopen in Chat | Exists (`openCardInChat` navigates with `?q=&lens=`) | `ReportsHome.tsx` |
| Report detail view (What it is / Why it matters / What is missing / What could break / What to do next) | Exists in opened-report sidebar | `ReportsHome.tsx` |

**Cut now:** Filter sidebar complexity. Keep search input + simple category list. Remove "MEMORY LOOP" educational section.

### Screen 4: Nudges
**Job:** What needs attention now

| Must be real | Status | File targets |
|-------------|--------|-------------|
| One real nudge loop (report changed OR follow-up due OR reply draft ready) | NOT REAL — currently example/fixture nudges only | `convex/domains/product/nudges.ts`, `src/features/nudges/views/NudgesHome.tsx` |
| One real action button back into Report or Chat | Exists (example "Open in Chat" buttons) | `NudgesHome.tsx` |
| Nudge generation job (cron) | NOT BUILT — needs a Convex cron that checks for report changes | `convex/crons.ts`, `nudges.ts` |

**Build:** One cron job that detects when a saved report's entity has new data. Creates a nudge. Nudge links back to Chat with the report's query.

### Screen 5: Me
**Job:** Private context that improves future runs

| Must be real | Status | File targets |
|-------------|--------|-------------|
| Real file library | Convex model exists (`productFiles` table) | `convex/domains/product/me.ts` |
| Real saved context (companies/people/reports) | Context counters exist but show 0 | `src/features/me/views/MeHome.tsx` |
| Profile summary the agent uses | Profile fields exist (Background, Roles, Preferred Lens) | `MeHome.tsx` |
| Visible "using your context" chip in Chat | Done (this session — dynamic counts) | `ChatHome.tsx` |
| Preferences the agent can read | Privacy/Permissions/Export settings exist | `MeHome.tsx` |

**Cut now:** "HOW ME IMPROVES CHAT" educational section. Users will understand once it works.

---

## Cut Now / Ship Now / Later

### Cut now (remove from primary nav and public surfaces)

- Compare page
- Live/Improvements surfaces
- Oracle/telemetry pages
- Internal/debug naming (any surface with "internal" in viewRegistry)
- MCP web control panel
- Admin dashboards
- Retention/Attrition UI
- Workflow asset language in user-facing text
- Replay/delegation badges
- Raw activity/quality/runs/cost/memory tabs
- Example cards with fixture data on Home (replace with real saved reports)
- Educational sections (MEMORY LOOP on Reports, HOW ME IMPROVES CHAT on Me, NEXT ACTION LOOP steps on Nudges)
- Chat left sidebar (CONTEXT/EVIDENCE CARDS/STAGE PILLS/RUN SNAPSHOT) — move essential into answer area

### Ship now (must work on day 1)

- Ask bar → Chat → streaming answer → save report → share link
- Upload → Chat → answer uses upload → save report
- Reports list from Convex (real persisted data)
- Report detail page with 5 sections + sources + timestamp
- Report reopen in Chat
- Report share URL (copy link)
- One nudge type (report changed → link back to Chat)
- Me file upload + saved context
- Recent searches on Home + in Cmd+K
- ?q= URL support on Home

### Later (after users actually use it at events)

- Full compare page
- Full connector automation (Slack/Gmail/Notion/Linear integrations)
- Full MCP web control panel
- Wide personalization system
- Multiple power-user modes
- Retention/Attrition visible to users
- Hyperagent quality review (stays internal)
- ARE stress-testing (stays internal)

---

## Exact APIs

| API | Endpoint | Status |
|-----|----------|--------|
| Search/Chat SSE | `POST /api/search` (Vercel serverless) | Working |
| File upload | `POST /api/upload` | Needs verification |
| Save report | `mutation reports:saveReport` (Convex) | Exists |
| List reports | `query reports:listReports` (Convex) | Exists |
| Get report | `query reports:getReport` (Convex) | Exists |
| Create nudge | `mutation nudges:createNudge` (Convex) | Exists |
| List nudges | `query nudges:listNudges` (Convex) | Exists |
| Nudge cron | `crons.ts` interval job | NOT BUILT |
| Save file (Me) | `mutation me:saveFile` (Convex) | Exists |
| Get profile (Me) | `query me:getProfile` (Convex) | Exists |
| Chat events | `mutation chat:recordEvent` (Convex) | Exists |
| Shell snapshot | `query shell:getWorkspaceRailSnapshot` (Convex) | Exists |

---

## Exact Metrics

### Core (instrument on day 1)

```
landing_to_first_run_start    — time from page load to first Chat SSE start
first_partial_answer_ms       — time from SSE start to first answer section visible
first_source_ms               — time from SSE start to first source chip visible
report_saved_rate             — % of chat runs that result in a saved report
share_link_rate               — % of reports where copy-link is clicked
return_to_report_rate         — % of reports reopened after initial save
nudge_open_rate               — % of nudges that are clicked/opened
```

### Social event metrics

```
reports_created_per_event     — how many reports created in a 2-hour window
uploads_per_session           — files/photos uploaded per session
share_after_report_rate       — % of saved reports where share link is used within 5 min
follow_up_action_rate         — % of follow-up chips clicked in Chat
```

### Signal that users care

- They upload without instruction
- They save reports
- They reopen reports later
- They share links/screenshots
- They trigger follow-up questions in Chat

---

## Production Architecture

```
Frontend:  React + TypeScript + Tailwind + Framer Motion
Backend:   Typed pipeline + SSE streaming + file upload
Storage:   Convex (reports, files, chat events, nudges, user context)
Deploy:    Vercel frontend + Convex backend
Domain:    https://www.nodebenchai.com
```

Streamlit stays internal for interview walkthroughs, eval demos, trace viewers.

---

## Week 1 Targets

### App shell
- [x] Final nav: Home / Chat / Reports / Nudges / Me
- [x] Route cleanup (18 legacy routes marked, 14 orphaned components deleted)
- [ ] Remove remaining internal surfaces from any reachable path

### Home
- [x] Slim ask bar (pill/H1 removed)
- [x] ?q= auto-submit
- [x] Recent searches
- [ ] Replace fixture example cards with real saved report cards from Convex
- [ ] Reduce above-fold content to: ask bar + upload + lens + one row of cards

### Deploy
- [ ] `npm run build` clean
- [ ] Vercel deploy
- [ ] Convex deploy (if schema changed)
- [ ] Production smoke test on all 5 surfaces

## Week 2 Targets

### Chat
- [x] SSE streaming wired
- [x] Progressive skeleton sections
- [x] Share link button
- [x] Sticky bottom composer
- [ ] Remove left sidebar (CONTEXT/EVIDENCE/STAGE/SNAPSHOT) — move lens indicator into answer header
- [ ] Inline source chips in answer blocks (not just sidebar)

### Reports
- [x] Share/copy on cards
- [x] Filter toggle on mobile
- [ ] Wire report cards to Convex (real data, not fixtures)
- [ ] Report detail page renders from Convex data

## Week 3 Targets

### Nudges
- [ ] One cron job: check saved reports for entity changes
- [ ] One real nudge type: "Report changed — new sources found"
- [ ] Nudge → Chat reentry with report context

### Me
- [ ] File upload wired to Convex
- [ ] Saved context counters read from real data
- [ ] "Using your context" chip in Chat reads real Me data

---

## The Event Demo Flow

```
See something interesting
-> screenshot / photo / note / link
-> open Home
-> upload or ask
-> go into Chat
-> save report
-> later receive nudge
-> reopen report
-> use for outreach / CRM / follow-up
```

If the product cannot do that smoothly, it is not ready.

---

## Hidden Architecture (Not Visible to First Users)

```
successful report
 -> Retention stores useful pattern
 -> Attrition trims future rerun cost
 -> Hyperagent reviews quality
 -> ARE stress-tests workflow
```

Public story: NodeBench AI web product
Hidden/later story: nodebench-mcp as embedded execution lane for power users and agents
