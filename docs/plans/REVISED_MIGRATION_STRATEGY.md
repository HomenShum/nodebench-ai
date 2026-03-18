# Revised Migration Strategy - Based on Latest Next.js 15/16 Documentation

**Date**: January 23, 2026
**Status**: Research Complete - Recommending Different Approach

---

## What I Got Wrong

My original "hybrid approach" recommendation (separate Vite app + Next.js app with reverse proxy) is **not** the recommended Next.js pattern.

After researching [official Next.js documentation](https://nextjs.org/docs/app/guides/migrating/from-vite) and [latest 2026 best practices](https://medium.com/@react2next/why-your-vite-react-website-should-migrate-to-next-js-for-better-seo-fa89caecbd45), there are better options:

---

## Better Option 1: Incremental Adoption (Single Next.js App) ✅ **RECOMMENDED**

### What It Is

Migrate **everything** to Next.js, but keep complex pages as **client-only** initially (SPA mode). Then gradually convert pages to SSR.

### How It Works

1. **Phase 1: Move to Next.js as SPA** (1-2 days)
   - Use the [official Vite → Next.js migration guide](https://nextjs.org/docs/app/guides/migrating/from-vite)
   - Configure `output: 'export'` in next.config.js (SPA mode)
   - Create catch-all route: `app/[[...slug]]/page.tsx`
   - Wrap entire app in client component with `ssr: false`
   - **Result**: Same functionality, same 59/100 performance, but now on Next.js

2. **Phase 2: Migrate Simple Pages to SSR** (3-5 days)
   - Convert landing page, HITL analytics (already done ✅)
   - Add public-facing pages (docs, about, pricing)
   - **Result**: High-traffic pages at 100/100, complex pages still at 59/100

3. **Phase 3: Gradually Convert Complex Pages** (2-4 weeks, ongoing)
   - Refactor Research Hub section by section
   - Use hybrid rendering: SSR initial HTML + client-side interactivity
   - Keep real-time subscriptions client-side with TanStack Query
   - **Result**: Incremental performance gains without big-bang refactor

### Key Benefits

✅ **Official Next.js pattern** - [Documented and supported](https://nextjs.org/docs/app/guides/migrating/incremental-adoption)
✅ **No reverse proxy needed** - Single deployment
✅ **Pages/App router can coexist** - Migrate route by route
✅ **Low risk** - Start with 100% client-side rendering
✅ **Gradual improvement** - Add SSR benefits incrementally

### Technical Pattern

**For Complex Pages (Initially)**:
```tsx
// app/research/page.tsx
import dynamic from 'next/dynamic';

const ResearchHub = dynamic(() => import('@/features/research/views/ResearchHub'), {
  ssr: false  // Disable SSR initially
});

export default function ResearchPage() {
  return <ResearchHub />;
}
```

**For Simple Pages (Converted to SSR)**:
```tsx
// app/analytics/hitl/page.tsx (already done)
import { preloadQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import { HITLDashboard } from './HITLDashboard';

export default async function HITLPage() {
  const data = await preloadQuery(api.domains.hitl.decisions.getHitlApprovalRate, {});
  return <HITLDashboard preloadedData={data} />;
}
```

### Migration Sequence

**Week 1: Foundation**
- Move entire Vite app to Next.js as SPA (client-only)
- Verify all functionality works
- No performance change yet (still 59/100)

**Week 2: Quick Wins**
- Convert 5-10 simple pages to SSR
- Public pages, dashboards, analytics
- **Expected**: 100/100 on converted pages

**Week 3-4: Complex Pages**
- Refactor Research Hub for hybrid rendering
- Server render initial HTML
- Client-side handles interactivity
- **Expected**: 80-90/100 on these pages

**Ongoing: Optimization**
- Continue converting sections
- Add streaming for slower queries
- Implement ISR for semi-static content

---

## Alternative Option 2: Multi-Zones (If Needed)

### What It Is

[Multi-Zones](https://nextjs.org/docs/pages/building-your-application/deploying/multi-zones) is an official Next.js pattern for splitting a large app into **multiple independent Next.js apps** serving different path segments.

### When to Use

Only if you truly need:
- Different teams owning different sections
- Independent deployment cycles
- Mixed frameworks (keep some parts in Vite)

### How It Works

```
/                → Next.js App 1 (landing, public pages)
/analytics/*     → Next.js App 1 (SSR dashboards)
/research/*      → Next.js App 2 (complex, mostly client-side)
/documents/*     → Next.js App 2 (complex, mostly client-side)
/agents/*        → Next.js App 2 (complex, mostly client-side)
```

**Configuration** (in main Next.js app):
```js
// next.config.js
async rewrites() {
  return [
    {
      source: '/research',
      destination: `${process.env.RESEARCH_DOMAIN}/research`,
    },
    {
      source: '/research/:path+',
      destination: `${process.env.RESEARCH_DOMAIN}/research/:path+`,
    },
  ];
}
```

### Why NOT Recommended Here

❌ **Added complexity** - Two separate deployments
❌ **Hard navigation between zones** - Full page reload when switching
❌ **Duplicate dependencies** - Each zone bundles separately
❌ **More maintenance** - Multiple configs, multiple builds

**Verdict**: Only use if organizational needs require separate ownership. For a single team, incremental adoption is cleaner.

---

## Option 3: Keep Vite (Abandoned)

After research, keeping Vite makes no sense when:
- Next.js supports SPA mode (`output: 'export'`)
- Can migrate with zero functionality change
- Unlock incremental SSR adoption later

---

## Key Research Findings

### 1. Incremental Adoption is Official Strategy

> "Next.js lets the legacy pages/ router and the new app/ router coexist in the same codebase, so you can migrate route by route."
>
> — [Next.js in 2026: The Full Stack React Framework](https://www.nucamp.co/blog/next.js-in-2026-the-full-stack-react-framework-that-dominates-the-industry)

**Pages and App router can coexist.** You don't need to migrate everything at once.

### 2. Start as SPA, Then Add SSR

The [official Vite migration guide](https://nextjs.org/docs/app/guides/migrating/from-vite) recommends:

1. Configure `output: 'export'` (SPA mode)
2. Use catch-all route with client-only rendering
3. Gradually adopt SSR features

**This is exactly what we should do.**

### 3. Real-Time Apps Use Hybrid Rendering

For apps with real-time subscriptions:

> "Modern guides recommend keeping Client Components small and "leaf-level" so that most of your tree stays server-rendered while interactive edges handle the client-side JavaScript."
>
> — [Next.js Advanced Patterns for 2026](https://medium.com/@beenakumawat002/next-js-app-router-advanced-patterns-for-2026-server-actions-ppr-streaming-edge-first-b76b1b3dcac7)

**Pattern**: SSR for initial HTML + TanStack Query for real-time updates.

### 4. Complex Apps Don't Need Full Rewrite

> "A recent migration showed significant improvements: I cut my JavaScript bundle by 54%, improved Core Web Vitals, and achieved perfect SEO scores."
>
> — [Why Your Vite + React Website Should Migrate to Next.js](https://medium.com/@react2next/why-your-vite-react-website-should-migrate-to-next-js-for-better-seo-fa89caecbd45)

Real-world migrations show you can get benefits without full refactoring.

---

## Recommended Plan: Incremental Adoption

### Week 1: Migrate to Next.js SPA Mode (3-5 days)

**Goal**: Everything in Next.js, zero functionality change

1. Create Next.js project structure:
   ```bash
   cd next-app
   # Already exists, but reconfigure for catch-all
   ```

2. Create catch-all route for Vite app:
   ```tsx
   // app/[[...slug]]/page.tsx
   import dynamic from 'next/dynamic';

   const ViteApp = dynamic(() => import('@/App'), { ssr: false });

   export default function CatchAll() {
     return <ViteApp />;
   }
   ```

3. Copy all Vite src/ code to Next.js:
   ```bash
   cp -r src/* next-app/src/
   cp src/index.css next-app/app/globals.css
   cp tailwind.config.js next-app/
   ```

4. Update imports:
   - Change `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*`
   - Update environment variables in Vercel

5. Test everything works:
   ```bash
   npm run dev
   # Verify all pages, routing, auth, etc.
   ```

**Expected Result**: Identical functionality, same 59/100 performance

### Week 2: Convert Simple Pages (5-7 days)

**Goal**: Get 100/100 performance on high-traffic pages

Pages to convert:
- ✅ Landing page (already done)
- ✅ HITL Analytics (already done)
- `/about` (if exists)
- `/pricing` (if exists)
- `/docs/*` (if exists)
- Simple dashboard views (read-only)

**Pattern for each page**:
1. Move from catch-all to dedicated route: `app/page-name/page.tsx`
2. Add preloadQuery for data fetching
3. Create client component for interactivity
4. Test and verify

**Expected Result**: 5-10 pages at 100/100 performance

### Week 3-4: Hybrid Rendering for Complex Pages (10-15 days)

**Goal**: Improve performance on Research/Documents hubs

**Strategy**: Don't fully refactor, just add SSR shell

**Research Hub Example**:
```tsx
// app/research/page.tsx
import { preloadQuery } from 'convex/nextjs';
import { api } from '../../convex/_generated/api';
import dynamic from 'next/dynamic';

const ResearchHubClient = dynamic(
  () => import('@/features/research/views/ResearchHub'),
  { ssr: false }  // Keep client-side initially
);

export default async function ResearchPage() {
  // Preload key data for fast initial render
  const signals = await preloadQuery(api.research.getTopSignals, { limit: 10 });
  const briefing = await preloadQuery(api.research.getDailyBrief, {});

  return (
    <ResearchHubClient
      preloadedSignals={signals}
      preloadedBriefing={briefing}
    />
  );
}
```

**Gradual Improvement**:
- Week 3: Server-render page shell, data preloaded
- Week 4: Convert static sections to Server Components
- Ongoing: Move more logic server-side

**Expected Result**: 75-85/100 on complex pages (improvement from 59/100)

---

## Technical Considerations

### 1. Real-Time Subscriptions

**Challenge**: Convex `useQuery` for live updates

**Solution**: Hybrid pattern
```tsx
'use client';

export function LiveFeed({ preloadedData }) {
  // Start with preloaded SSR data
  const data = usePreloadedQuery(preloadedData);

  // Seamlessly transition to live subscription
  // (Convex handles this automatically)

  return <FeedList items={data} />;
}
```

**No changes needed** - Convex's usePreloadedQuery handles this.

### 2. Client-Side State

**Challenge**: Tabs, filters, selections not known server-side

**Solution**: Progressive enhancement
- Server renders with default state
- Client hydrates and restores from URL params
- Use Next.js searchParams for state

```tsx
// Server Component
export default function ResearchPage({ searchParams }) {
  const tab = searchParams.tab || 'overview';
  const preloadedData = await preloadDataForTab(tab);

  return <ResearchClient initialTab={tab} preloadedData={preloadedData} />;
}
```

### 3. Lazy Loading

**Challenge**: `React.lazy()` doesn't work with SSR

**Solution**: Use `next/dynamic`
```tsx
// Before (Vite)
const WhatChangedPanel = React.lazy(() => import('./WhatChangedPanel'));

// After (Next.js)
const WhatChangedPanel = dynamic(() => import('./WhatChangedPanel'), {
  loading: () => <Skeleton />,
  ssr: true  // or false if needed
});
```

### 4. Router Migration

**Challenge**: Components use `useNavigate()` from react-router

**Solution**: Incremental refactor
```tsx
// Create adapter hook
export function useNavigation() {
  const router = useRouter();  // Next.js

  return {
    navigate: (path: string) => router.push(path),
    // ... other methods
  };
}

// Replace usage gradually
const { navigate } = useNavigation();
navigate('/documents/123');
```

---

## Comparison: My Original vs. Research-Based

| Aspect | My Original "Hybrid" | Research-Based Incremental |
|--------|----------------------|---------------------------|
| **Architecture** | 2 separate apps + proxy | 1 Next.js app |
| **Deployment** | 2 deployments | 1 deployment |
| **Complexity** | High (routing, auth sharing) | Medium (gradual refactor) |
| **Official Support** | Not documented | Official pattern |
| **Navigation** | Hard reload between apps | Soft navigation within app |
| **Effort** | 2-3 weeks | 4-6 weeks (but gradual) |
| **Risk** | Medium (integration issues) | Low (incremental) |
| **Result** | 80% benefit, 20% effort | 100% benefit, gradual effort |

**Verdict**: Research-based incremental adoption is superior.

---

## Decision Time

### Option A: Incremental Adoption (Recommended)

**Effort**: 4-6 weeks, but gradual
**Benefit**: Full Next.js migration, 100/100 on all pages eventually
**Risk**: Low (can stop at any phase)

**Phases**:
1. Week 1: Move to Next.js SPA (same performance)
2. Week 2: Convert 10 simple pages (100/100 on these)
3. Week 3-4: Add SSR to complex pages (75-90/100)
4. Ongoing: Continue optimizing

**Commit**: Full migration, but low-risk incremental path

### Option B: Multi-Zones (If Organizational Need)

**Only if**: Multiple teams, independent deployments required

### Option C: Current State (3 Pages Only)

**Keep**: Current setup with 3 SSR pages
**Accept**: 147 pages still on Vite at 59/100

---

## Sources

- [Migrating from Vite | Next.js Official Docs](https://nextjs.org/docs/app/guides/migrating/from-vite)
- [Multi-Zones | Next.js Official Docs](https://nextjs.org/docs/pages/building-your-application/deploying/multi-zones)
- [Incremental Adoption | Next.js Blog](https://nextjs.org/blog/incremental-adoption)
- [Next.js in 2026: The Full Stack React Framework](https://www.nucamp.co/blog/next.js-in-2026-the-full-stack-react-framework-that-dominates-the-industry)
- [Why Your Vite Website Should Migrate to Next.js](https://medium.com/@react2next/why-your-vite-react-website-should-migrate-to-next-js-for-better-seo-fa89caecbd45)
- [Next.js App Router: Advanced Patterns for 2026](https://medium.com/@beenakumawat002/next-js-app-router-advanced-patterns-for-2026-server-actions-ppr-streaming-edge-first-b76b1b3dcac7)
- [Building Real-time Magic: Supabase Subscriptions in Next.js 15](https://dev.to/lra8dev/building-real-time-magic-supabase-subscriptions-in-nextjs-15-2kmp)
- [Migrating a Large Open-Source React App to Next.js](https://vercel.com/blog/migrating-a-large-open-source-react-application-to-next-js-and-vercel)

---

## Recommendation

**Go with Option A: Incremental Adoption**

1. It's the official Next.js pattern
2. Lower risk than my original hybrid approach
3. Gets you to 100% migration eventually
4. Can stop at any phase if effort exceeds value
5. Single deployment, no reverse proxy complexity

**Next Action**: User decides whether to proceed with incremental adoption or stay at current 3-page state.
