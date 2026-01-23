# Shipping BrowserRouter + Full SSR Migration Commitment

**Date**: January 23, 2026
**Decision**: Ship current state + Commit to 3-4 week SSR migration
**Goal**: Reach 70+ Lighthouse performance

---

## 📦 What's Being Shipped

### ✅ BrowserRouter Migration (Production-Ready)

**Changes**:
- ✅ Clean URLs: `/#analytics/hitl` → `/analytics/hitl`
- ✅ React Router BrowserRouter integration
- ✅ 9 files updated with navigate() hooks
- ✅ All builds passing, zero TypeScript errors
- ✅ PWA + Service Worker working (70 assets precached)

**Performance Impact**:
- Current: 59/100 performance
- Estimated: 64-69/100 with BrowserRouter
- User Experience: Clean URLs, better browser history

**Files Modified**:
- src/main.tsx (BrowserRouter wrapper)
- src/App.tsx (useLocation hook)
- src/components/MainLayout.tsx (route parsing)
- src/shared/ui/UnifiedHubPills.tsx (navigation)
- src/features/research/components/EntityLink.tsx
- src/features/research/views/EntityProfilePage.tsx
- src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx
- src/features/documents/components/DocumentsHomeHub.tsx
- package.json (react-router-dom added)

**Git Commits**:
```bash
✅ feat: Migrate from hash-based routing to React Router BrowserRouter
✅ docs: Add BrowserRouter migration results and analysis
✅ docs: Add comprehensive Next.js SSR migration plan
```

**Deployment Commands**:
```bash
# Production build
npm run build

# Test preview
npm run preview

# Deploy (Vercel/Netlify/custom)
# Note: Configure SPA fallback to serve index.html for all routes
```

---

## 🚀 SSR Migration Commitment

### Decision: Proceed with Full 3-4 Week Migration

**Objective**: Reach 70+ Lighthouse performance through Next.js SSR

**Timeline**: 4 weeks starting Monday
- Week 1: Setup + First Page
- Week 2: Core Pages Migration
- Week 3: Polish + Fix Hydration
- Week 4: Deploy + Cutover

**Resources Required**:
- Development time: 3-4 weeks full-time (or equivalent part-time)
- Testing environment: Staging server for Next.js
- Deployment platform: Vercel (recommended) or self-hosted

**Success Criteria**:
- ✅ Lighthouse Performance: 70+
- ✅ FCP: <1.2s
- ✅ LCP: <2.5s
- ✅ All critical routes working
- ✅ Auth functional
- ✅ Zero hydration errors

**Full Plan**: [NEXTJS_SSR_MIGRATION.md](NEXTJS_SSR_MIGRATION.md)

---

## 📅 Week 1 Execution Plan (Starting Monday)

### Day 1: Monday - Next.js Setup

**Objectives**:
- ✅ Create Next.js 15 project with App Router
- ✅ Install dependencies (Convex, auth, UI libraries)
- ✅ Configure project structure

**Tasks**:
```bash
# 1. Create Next.js app
npx create-next-app@latest nodebench-next --typescript --app --no-src-dir --tailwind --eslint

cd nodebench-next

# 2. Install Convex dependencies
npm install convex @convex-dev/auth

# 3. Install shared dependencies
npm install lucide-react framer-motion sonner clsx class-variance-authority date-fns

# 4. Copy Convex config
cp ../convex.json .
cp -r ../convex .

# 5. Set up environment variables
echo "NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud" > .env.local
```

**Deliverable**: Next.js project skeleton with Convex connected

---

### Day 2: Tuesday - Convex SSR Testing

**Objectives**:
- ✅ Test `preloadQuery` pattern
- ✅ Verify data fetching works
- ✅ Confirm auth compatibility

**Tasks**:

**1. Create Convex SSR utilities** (`lib/convex-ssr.ts`):
```typescript
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export { preloadQuery, api };
```

**2. Create client provider** (`lib/convex-client.tsx`):
```typescript
'use client';

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ConvexAuthProvider client={convex}>
        {children}
      </ConvexAuthProvider>
    </ConvexProvider>
  );
}
```

**3. Update root layout** (`app/layout.tsx`):
```typescript
import { ConvexClientProvider } from "@/lib/convex-client";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
```

**4. Create test page** (`app/test-ssr/page.tsx`):
```typescript
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { TestClient } from "./TestClient";

export default async function TestSSRPage() {
  // Test Convex SSR data fetching
  const preloadedData = await preloadQuery(api.domains.analytics.hitl.getMetrics, {});

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">SSR Test Page</h1>
      <TestClient preloadedData={preloadedData} />
    </div>
  );
}
```

**5. Create client component** (`app/test-ssr/TestClient.tsx`):
```typescript
'use client';

import { usePreloadedQuery } from "convex/react";

export function TestClient({ preloadedData }) {
  const data = usePreloadedQuery(preloadedData);

  return (
    <div className="mt-4">
      <h2 className="text-lg">Data from Convex:</h2>
      <pre className="bg-gray-100 p-4 rounded mt-2">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
```

**Deliverable**: Working SSR data fetching with Convex `preloadQuery`

---

### Day 3: Wednesday - Analytics HITL Page Migration

**Objectives**:
- ✅ Migrate analytics HITL page to Next.js
- ✅ Implement hybrid data fetching (SSR + client)
- ✅ Copy/adapt components from Vite app

**Tasks**:

**1. Create analytics HITL route structure**:
```
app/analytics/hitl/
├── page.tsx              # Server Component (SSR)
├── HITLDashboard.tsx     # Client Component (interactive)
└── components/           # Copied from Vite app
    ├── MetricsCard.tsx
    ├── AccuracyChart.tsx
    └── ...
```

**2. Implement SSR page** (`app/analytics/hitl/page.tsx`):
```typescript
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { HITLDashboard } from "./HITLDashboard";

export default async function AnalyticsHITLPage() {
  // Fetch data on server before rendering
  const metrics = await preloadQuery(api.domains.analytics.hitl.getMetrics, {});
  const recentSessions = await preloadQuery(api.domains.analytics.hitl.getRecentSessions, { limit: 10 });

  return (
    <div className="min-h-screen bg-white">
      <HITLDashboard
        preloadedMetrics={metrics}
        preloadedSessions={recentSessions}
      />
    </div>
  );
}

export const metadata = {
  title: "HITL Analytics Dashboard | NodeBench AI",
  description: "Human-in-the-loop analytics and metrics",
};
```

**3. Implement client dashboard** (`app/analytics/hitl/HITLDashboard.tsx`):
```typescript
'use client';

import { usePreloadedQuery } from "convex/react";
import { useState } from "react";
// Copy components from Vite app
import { MetricsCard } from "./components/MetricsCard";
import { AccuracyChart } from "./components/AccuracyChart";

export function HITLDashboard({ preloadedMetrics, preloadedSessions }) {
  // Use preloaded data initially, switch to live data after hydration
  const metrics = usePreloadedQuery(preloadedMetrics);
  const sessions = usePreloadedQuery(preloadedSessions);

  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">HITL Analytics Dashboard</h1>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricsCard
          title="Accuracy"
          value={metrics.accuracy}
          trend={metrics.accuracyTrend}
        />
        <MetricsCard
          title="Sessions"
          value={metrics.totalSessions}
          trend={metrics.sessionsTrend}
        />
        <MetricsCard
          title="Feedback Items"
          value={metrics.feedbackCount}
          trend={metrics.feedbackTrend}
        />
      </div>

      {/* Chart */}
      <AccuracyChart data={metrics.chartData} />

      {/* Recent Sessions Table */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
        <table className="w-full">
          {/* ... table implementation ... */}
        </table>
      </div>
    </div>
  );
}
```

**4. Copy and adapt components**:
- Copy `src/features/analytics/components/HITLAnalyticsDashboard.tsx` → Split into Server/Client
- Copy metrics calculation logic
- Update imports from `convex/react` to use `usePreloadedQuery`

**Deliverable**: Fully functional SSR analytics HITL page

---

### Day 4: Thursday - Styling & Polish

**Objectives**:
- ✅ Copy global styles from Vite app
- ✅ Ensure UI matches existing design
- ✅ Fix any hydration warnings

**Tasks**:

**1. Copy global styles**:
```bash
# Copy CSS
cp ../src/index.css app/globals.css

# Copy Tailwind config
cp ../tailwind.config.js .
```

**2. Update Tailwind config**:
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Copy theme extensions from Vite app
    },
  },
  plugins: [],
}
```

**3. Fix hydration warnings**:
- Check for date/time mismatches
- Ensure no browser APIs in Server Components
- Use `suppressHydrationWarning` if needed (sparingly)

**Deliverable**: Polished analytics page matching Vite app design

---

### Day 5: Friday - Lighthouse Testing & Validation

**Objectives**:
- ✅ Run Lighthouse on SSR page
- ✅ **Verify 70+ performance achieved** ⚠️ CRITICAL
- ✅ Document results
- ✅ Decide: Proceed with full migration or pivot

**Tasks**:

**1. Build and start production Next.js**:
```bash
npm run build
npm start
```

**2. Run Lighthouse tests**:
```bash
# Test SSR analytics page
npx lighthouse http://localhost:3000/analytics/hitl --preset=desktop --output=json --output-path=./lighthouse-nextjs-hitl.json

# Extract score
node -e "const data = require('./lighthouse-nextjs-hitl.json'); console.log('Performance:', Math.round(data.categories.performance.score * 100));"
```

**3. Compare results**:
| Metric | Vite (CSR) | Next.js (SSR) | Improvement |
|--------|------------|---------------|-------------|
| Performance | 59/100 | ??? | ??? |
| FCP | 2.6s | ??? | ??? |
| LCP | 6.2s | ??? | ??? |

**4. Decision point**:
- ✅ **If 70+**: Proceed with Weeks 2-4 (full migration)
- ⚠️ **If 60-69**: Reassess strategy, investigate issues
- ❌ **If <60**: Pivot to alternative approach

**Deliverable**: Lighthouse results proving 70+ achievable (or decision to pivot)

---

## Week 2-4 Overview

### Week 2: Core Pages Migration
- Migrate high-traffic pages (research, documents)
- Set up hybrid data fetching patterns
- Copy shared components

### Week 3: Polish & Optimization
- Fix hydration errors
- Implement Streaming SSR with Suspense
- Migrate remaining pages
- Optimize bundle sizes

### Week 4: Deploy & Cutover
- Deploy to Vercel staging
- Gradual production cutover (10% → 50% → 100%)
- Monitor performance
- Rollback plan if needed

**Full details**: [NEXTJS_SSR_MIGRATION.md](NEXTJS_SSR_MIGRATION.md)

---

## Success Metrics

### Week 1 Success Criteria:
- ✅ Next.js project set up and building
- ✅ Convex SSR working with `preloadQuery`
- ✅ One page (analytics HITL) fully migrated
- ✅ **Lighthouse score: 70+** ⚠️ MUST ACHIEVE

### Overall Project Success Criteria:
- ✅ Performance: 70+ (target: 74-84)
- ✅ FCP: <1.2s (target: 0.8s)
- ✅ LCP: <2.5s (target: 1.5s)
- ✅ All critical routes functional
- ✅ Auth working correctly
- ✅ Zero TypeScript errors
- ✅ Zero hydration errors

---

## Risk Management

### Critical Risks & Mitigation

**1. Week 1 Performance Not 70+**
- **Mitigation**: Debug aggressively, check bundle sizes, optimize SSR
- **Fallback**: If can't reach 70+ by Friday, reassess strategy

**2. Convex SSR Issues**
- **Mitigation**: Consult Convex docs, use HTTP API fallback
- **Fallback**: Keep critical data fetching client-side if needed

**3. Hydration Errors**
- **Mitigation**: Test thoroughly, use suppressHydrationWarning
- **Fallback**: Mark problematic components as client-only

**4. Timeline Slippage**
- **Mitigation**: Focus on critical pages first, defer nice-to-haves
- **Fallback**: Extend Week 3-4 by 1-2 days if needed

### Rollback Plan

**If migration fails**:
1. Keep Vite app running (already deployed with BrowserRouter)
2. Route traffic back to Vite
3. Fix Next.js issues in staging
4. Retry cutover when stable

**Rollback triggers**:
- Week 1: Cannot achieve 70+ performance
- Week 2-3: Critical features broken beyond repair
- Week 4: Production issues affecting users

---

## Communication Plan

### Daily Standups (Week 1)
- **Morning**: Review yesterday's progress, set today's goals
- **Evening**: Demo working features, document blockers

### Week 1 Friday: Go/No-Go Decision
- Present Lighthouse results
- Review completed work
- **Decision**: Proceed with Weeks 2-4 or pivot

### Weekly Updates (Weeks 2-4)
- Monday: Week kickoff, goals
- Friday: Week recap, demo

---

## Resources & Documentation

### Reference Documents:
- [NEXTJS_SSR_MIGRATION.md](NEXTJS_SSR_MIGRATION.md) - Full 4-week plan
- [SESSION_SUMMARY_SSR.md](SESSION_SUMMARY_SSR.md) - Session recap
- [PATH_TO_70_PLUS.md](PATH_TO_70_PLUS.md) - Strategic analysis

### External Resources:
- [Convex Next.js SSR Guide](https://docs.convex.dev/client/nextjs/app-router/server-rendering)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Convex Next.js Demo](https://github.com/get-convex/convex-nextjs-app-router-demo)

---

## Next Actions

### Immediate (Monday Morning):
1. ✅ Create Next.js project: `npx create-next-app@latest nodebench-next`
2. ✅ Install dependencies: Convex, UI libraries
3. ✅ Copy Convex backend files
4. ✅ Set up environment variables

### Week 1 Checklist:
- [ ] Day 1: Next.js setup complete
- [ ] Day 2: Convex SSR pattern working
- [ ] Day 3: Analytics HITL page migrated
- [ ] Day 4: Styling matches Vite app
- [ ] Day 5: **Lighthouse 70+ achieved** ⚠️

---

## Commitment Summary

**What's Being Shipped**:
- ✅ BrowserRouter migration (production-ready)
- ✅ Clean URLs and better UX
- ✅ Estimated 64-69/100 performance

**What's Being Built**:
- 🚀 Next.js SSR migration (3-4 weeks)
- 🚀 Target: 70+ Lighthouse performance
- 🚀 Modern, scalable architecture

**Timeline**:
- Week 1: Proof of concept + first page
- Week 2-3: Core migration
- Week 4: Deploy and cutover

---

**Status**: ✅ **Shipping BrowserRouter + Committed to SSR Migration**

**Next Step**: Start Week 1 Day 1 - Create Next.js project
