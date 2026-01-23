# BrowserRouter Migration Plan

**Goal**: Migrate from hash-based routing to React Router's BrowserRouter
**Target**: Reach 70+ Lighthouse performance (currently 59/100)
**Effort**: 1-2 weeks
**Risk**: Medium

---

## Phase 1: Setup React Router ✅

### Install Dependencies
```bash
npm install react-router-dom
```

### Key Changes:
1. Wrap app in BrowserRouter ([src/main.tsx](src/main.tsx))
2. Remove hash routing listeners ([src/App.tsx](src/App.tsx))
3. Migrate MainLayout to use Routes/Route ([src/components/MainLayout.tsx](src/components/MainLayout.tsx))

---

## Phase 2: Route Structure

### Current Hash Routes:
```
/#analytics/hitl          → /analytics/hitl
/#analytics/component     → /analytics/component
/#analytics/feedback      → /analytics/feedback
/#documents               → /documents
/#documents/:id           → /documents/:id
/#agents                  → /agents
/#calendar                → /calendar
/#research                → /research
/#research/entity/:name   → /research/entity/:name
/#spreadsheets            → /spreadsheets
/#spreadsheets/:id        → /spreadsheets/:id
/#roadmap                 → /roadmap
```

### New Route Structure:
```typescript
<Routes>
  <Route path="/" element={<MainLayout />}>
    <Route index element={<ResearchHub />} />
    <Route path="analytics">
      <Route path="hitl" element={<HITLAnalyticsDashboard />} />
      <Route path="component" element={<ComponentMetricsDashboard />} />
      <Route path="feedback" element={<RecommendationFeedbackDashboard />} />
    </Route>
    <Route path="documents" element={<DocumentsHomeHub />} />
    <Route path="documents/:id" element={<DocumentView />} />
    <Route path="agents" element={<AgentsHub />} />
    <Route path="calendar" element={<CalendarHomeHub />} />
    <Route path="research" element={<ResearchHub />} />
    <Route path="research/entity/:name" element={<EntityProfilePage />} />
    <Route path="spreadsheets" element={<SpreadsheetsHub />} />
    <Route path="spreadsheets/:id" element={<SpreadsheetSheetView />} />
    <Route path="roadmap" element={<TimelineRoadmapView />} />
  </Route>
</Routes>
```

---

## Phase 3: Migration Steps

### Step 1: Wrap App in BrowserRouter
**File**: [src/main.tsx](src/main.tsx)

```typescript
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </BrowserRouter>
);
```

### Step 2: Remove Hash Routing from App.tsx
**File**: [src/App.tsx](src/App.tsx)

Remove:
- `window.location.hash` checks
- Hash change listeners (lines 69-90)
- `hashIndicatesWorkspace` logic

Replace with React Router:
```typescript
import { useLocation, useNavigate } from 'react-router-dom';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Check if location indicates workspace view
  const locationIndicatesWorkspace =
    location.pathname.startsWith('/agents') ||
    location.pathname.startsWith('/calendar') ||
    location.pathname.startsWith('/documents') ||
    location.pathname.startsWith('/roadmap');
}
```

### Step 3: Migrate MainLayout Routing
**File**: [src/components/MainLayout.tsx](src/components/MainLayout.tsx)

Remove:
- `parseHashRoute()` function (lines 166-211)
- `window.location.hash` listeners
- Hash-based navigation

Add:
```typescript
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';

// Use useLocation() to get current route
const location = useLocation();
const navigate = useNavigate();

// Navigation: replace window.location.hash = '#...' with navigate('/...')
navigate('/analytics/hitl');
```

### Step 4: Update Navigation Calls
Search for all instances of:
- `window.location.hash = '#...'`
- `window.location.href = '#...'`

Replace with:
- `navigate('/...')`

**Files to update** (estimated 20-30 call sites):
- [src/components/CleanSidebar.tsx](src/components/CleanSidebar.tsx)
- [src/components/CommandPalette.tsx](src/components/CommandPalette.tsx)
- [src/features/research/views/ResearchHub.tsx](src/features/research/views/ResearchHub.tsx)
- All analytics dashboards
- All feature hubs

### Step 5: Configure SPA Fallback
**File**: [vite.config.ts](vite.config.ts)

Add preview server config:
```typescript
preview: {
  port: 4173,
  strictPort: false,
  // SPA fallback - return index.html for all routes
  proxy: {
    // This is handled by historyApiFallback in production
  },
}
```

Note: Vite preview automatically handles SPA fallback. Production server needs configuration.

---

## Phase 4: Testing Strategy

### E2E Test Updates
**File**: [tests/e2e/analytics.spec.ts](tests/e2e/analytics.spec.ts)

Update URL navigation:
```typescript
// Before: await page.goto('http://localhost:4173/#analytics/hitl');
// After:  await page.goto('http://localhost:4173/analytics/hitl');
```

### Manual Testing Checklist:
- [ ] Navigation from sidebar works
- [ ] Direct URL navigation works
- [ ] Browser back/forward buttons work
- [ ] Bookmarks work (old hash URLs should redirect)
- [ ] Deep linking works
- [ ] Auth redirects work
- [ ] No console errors

---

## Phase 5: Production Deployment Config

### Deployment Platforms:

#### Vercel (recommended)
No config needed - automatic SPA support

#### Netlify
Create `_redirects` file:
```
/*  /index.html  200
```

#### Nginx
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

#### Apache
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## Expected Performance Impact

### Optimistic Scenario: +8-10 points
- Better route recognition: +3-5 points
- Improved lazy loading: +3-5 points
- Cleaner bundle loading: +2-3 points
- **Result: 67-69/100** (close to 70+)

### Realistic Scenario: +5-7 points
- Some route optimization: +2-4 points
- Marginally better loading: +2-3 points
- Bundle size unchanged: +1 point
- **Result: 64-66/100** (below 70+)

### Pessimistic Scenario: +2-4 points
- Minimal impact (still CSR): +2-4 points
- **Result: 61-63/100** (below 70+)

**Key Insight**: BrowserRouter helps with routing cleanliness, but the core issue (client-side rendering) remains. To reliably reach 70+, SSR is likely still needed.

---

## Rollback Plan

If migration causes issues:

1. **Keep changes in feature branch**: Don't merge to main until tested
2. **Git reset if needed**: `git reset --hard HEAD~1`
3. **Feature flag**: Add environment variable to toggle BrowserRouter vs. Hash routing

---

## Timeline

### Week 1:
- Day 1-2: Install React Router, wrap app, test basic navigation
- Day 3-4: Migrate MainLayout routing logic
- Day 5: Update all navigation call sites (search & replace)

### Week 2:
- Day 1-2: Update E2E tests, run full test suite
- Day 3: Manual testing, fix bugs
- Day 4: Lighthouse testing, measure impact
- Day 5: Deploy to staging, monitor

---

## Success Criteria

- ✅ All E2E tests passing (7/7 analytics tests)
- ✅ No console errors
- ✅ Clean URLs work (no #)
- ✅ Browser back/forward works
- ✅ Lighthouse performance: **64+** (if 70+, celebrate 🎉)

---

## Next Steps After BrowserRouter

**If we reach 70+**: Ship and celebrate! 🚀

**If we're at 64-69**:
- Option A: Accept near-70 performance (excellent result)
- Option B: Proceed with SSR migration for final push to 70+

**If we're below 64**:
- Analyze what didn't improve
- Decide: SSR migration or accept current state

---

**Status**: ⏩ **Ready to Begin Implementation**
