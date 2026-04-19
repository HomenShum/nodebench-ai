# Next.js SSR Migration Plan

**Goal**: Reach 70+ Lighthouse performance score through server-side rendering
**Current**: 59/100 (64-69/100 with BrowserRouter)
**Target**: 74-84/100 with SSR
**Timeline**: 3-4 weeks
**Risk**: High (hydration, Convex SSR, auth)

---

## Phase 1: Setup & Compatibility Testing (Week 1)

### Step 1.1: Verify Convex SSR Support ⚠️ CRITICAL

**Before migrating**, we must confirm Convex works with SSR.

**Test Plan**:
```bash
# Create test Next.js app
npx create-next-app@latest test-convex-ssr --typescript --app --no-src-dir
cd test-convex-ssr

# Install Convex
npm install convex @convex-dev/auth

# Test SSR compatibility
# - Can ConvexReactClient be used in Server Components?
# - Does Convex hydration work correctly?
# - Can we use useQuery in Client Components only?
```

**Expected Issues**:
1. **Convex React hooks are client-only** → Must wrap in 'use client'
2. **ConvexReactClient initialization** → Must happen in client component
3. **Data fetching strategy** → Need SSR-compatible approach

**Decision Point**: If Convex doesn't support SSR well, we may need to:
- Use Convex HTTP API for SSR data fetching
- Keep client-side rendering for Convex-dependent pages
- Consider alternative backend (major change)

---

### Step 1.2: Choose Migration Strategy

**Option A: Gradual Migration (Recommended)**
- Keep Vite app running
- Set up Next.js in `/next` subdirectory
- Migrate pages one-by-one
- Use reverse proxy to route between old/new
- Lower risk, allows rollback

**Option B: Full Rewrite**
- Stop Vite, start Next.js
- Migrate everything at once
- Higher risk, all-or-nothing
- Faster if successful

**Recommendation**: Option A (Gradual Migration)

---

### Step 1.3: Set Up Next.js 15 with App Router

```bash
# In project root
npx create-next-app@latest next-app --typescript --app --no-src-dir --tailwind --eslint

# Install dependencies
cd next-app
npm install convex @convex-dev/auth react-router-dom
npm install -D @types/node @types/react @types/react-dom

# Copy shared dependencies from main package.json
# - lucide-react
# - framer-motion
# - sonner
# - clsx
# - date-fns
# etc.
```

**Project Structure**:
```
nodebench-ai/
├── next-app/                 # New Next.js app
│   ├── app/
│   │   ├── layout.tsx        # Root layout (SSR)
│   │   ├── page.tsx          # Home page (SSR)
│   │   ├── analytics/
│   │   │   └── hitl/
│   │   │       └── page.tsx  # Analytics HITL page
│   │   ├── documents/
│   │   │   └── page.tsx
│   │   └── agents/
│   │       └── page.tsx
│   ├── components/           # Shared components
│   ├── lib/                  # Utilities
│   └── public/               # Static assets
│
├── src/                      # Current Vite app (keep running)
├── convex/                   # Shared Convex backend
└── package.json              # Root package.json
```

---

### Step 1.4: Configure Convex for SSR

**Challenge**: Convex React hooks are client-only.

**Solution**: Create SSR-compatible data fetching layer.

**File**: `next-app/lib/convex-ssr.ts`
```typescript
// Server-side Convex data fetching using HTTP API
import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function fetchConvexSSR<T>(
  functionName: string,
  args?: any
): Promise<T> {
  const client = new ConvexHttpClient(convexUrl);
  return await client.query(functionName as any, args);
}
```

**File**: `next-app/lib/convex-client.tsx`
```typescript
// Client-side Convex provider
'use client';

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ConvexAuthProvider client={convex}>
        {children}
      </ConvexAuthProvider>
    </ConvexProvider>
  );
}
```

**File**: `next-app/app/layout.tsx`
```typescript
import { ConvexClientProvider } from "@/lib/convex-client";

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

---

## Phase 2: Routing Migration (Week 1-2)

### Step 2.1: Map React Router Routes to Next.js

**Current Routes** (React Router):
```typescript
/                          → Home/Research Hub
/analytics/hitl            → HITL Analytics Dashboard
/analytics/components      → Component Metrics Dashboard
/analytics/recommendations → Recommendation Feedback Dashboard
/documents                 → Documents Home Hub
/documents/:id             → Document View
/agents                    → Agents Hub
/calendar                  → Calendar Home Hub
/research                  → Research Hub
/research/entity/:name     → Entity Profile Page
/spreadsheets              → Spreadsheets Hub
/spreadsheets/:id          → Spreadsheet View
/roadmap                   → Timeline Roadmap View
```

**Next.js App Router Structure**:
```
app/
├── page.tsx                            # / (Home)
├── analytics/
│   ├── hitl/
│   │   └── page.tsx                    # /analytics/hitl
│   ├── components/
│   │   └── page.tsx                    # /analytics/components
│   └── recommendations/
│       └── page.tsx                    # /analytics/recommendations
├── documents/
│   ├── page.tsx                        # /documents
│   └── [id]/
│       └── page.tsx                    # /documents/:id
├── agents/
│   └── page.tsx                        # /agents
├── calendar/
│   └── page.tsx                        # /calendar
├── research/
│   ├── page.tsx                        # /research
│   └── entity/
│       └── [name]/
│           └── page.tsx                # /research/entity/:name
├── spreadsheets/
│   ├── page.tsx                        # /spreadsheets
│   └── [id]/
│       └── page.tsx                    # /spreadsheets/:id
└── roadmap/
    └── page.tsx                        # /roadmap
```

### Step 2.2: Create Hybrid Data Fetching Pattern

**For each page, use hybrid approach**:

**Server Component** (SSR data fetching):
```typescript
// app/analytics/hitl/page.tsx
import { fetchConvexSSR } from "@/lib/convex-ssr";
import { HITLDashboardClient } from "./HITLDashboardClient";

export default async function HITLAnalyticsPage() {
  // Fetch initial data on server
  const initialData = await fetchConvexSSR("domains.analytics.getHITLMetrics", {});

  return (
    <HITLDashboardClient initialData={initialData} />
  );
}
```

**Client Component** (interactive features):
```typescript
// app/analytics/hitl/HITLDashboardClient.tsx
'use client';

import { useQuery } from "convex/react";

export function HITLDashboardClient({ initialData }) {
  // Client-side reactivity
  const liveData = useQuery("domains.analytics.getHITLMetrics", {});
  const data = liveData ?? initialData;

  return <div>{/* Render dashboard */}</div>;
}
```

---

## Phase 3: Component Migration (Week 2-3)

### Step 3.1: Identify Component Types

**Server Components** (can stay server-side):
- Static layouts
- Data fetching wrappers
- SEO components

**Client Components** (need 'use client'):
- Interactive forms
- Event handlers
- useState/useEffect hooks
- Convex useQuery/useMutation
- Context providers

### Step 3.2: Migration Priority

**High Priority** (most impact on performance):
1. ✅ MainLayout → Next.js Layout
2. ✅ Analytics pages (measure impact)
3. ✅ Research Hub (landing page)

**Medium Priority**:
4. Documents Hub
5. Agents Hub
6. Calendar Hub

**Low Priority** (complex, less traffic):
7. Entity Profile Page
8. Spreadsheets
9. Roadmap

### Step 3.3: Handle Shared Components

**Strategy**: Copy components to Next.js, mark as needed

**Example**: UnifiedHubPills
```typescript
// next-app/components/UnifiedHubPills.tsx
'use client';  // ← Add this

import { useRouter } from 'next/navigation';  // ← Change import

export function UnifiedHubPills({ active }) {
  const router = useRouter();  // ← Use Next.js router

  const goDocs = () => {
    router.push("/documents");  // ← Use router.push
  };

  // ... rest of component
}
```

---

## Phase 4: Testing & Optimization (Week 3-4)

### Step 4.1: Fix Hydration Errors

**Common Issues**:
1. **Date/time mismatch**: Server renders different time than client
2. **Random IDs**: useId() in Server Component
3. **Browser-only APIs**: window, localStorage in SSR
4. **CSS differences**: className mismatch between server/client

**Solutions**:
```typescript
// Suppress hydration warnings (temporary)
<div suppressHydrationWarning>
  {new Date().toLocaleString()}
</div>

// Use client component for browser APIs
'use client';
function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return children;
}
```

### Step 4.2: Run Lighthouse Tests

**Test each migrated page**:
```bash
# Analytics HITL (high priority)
npx lighthouse http://localhost:3000/analytics/hitl --preset=desktop --output=json --output-path=./lighthouse-nextjs-analytics.json

# Home page
npx lighthouse http://localhost:3000/ --preset=desktop --output=json --output-path=./lighthouse-nextjs-home.json
```

**Target Metrics**:
- Performance: 70+ ✅
- FCP: <1.2s ✅
- LCP: <2.5s ✅

### Step 4.3: Optimize SSR Performance

**Techniques**:
1. **Streaming SSR**: Use `<Suspense>` for progressive rendering
2. **Static Generation**: Pre-render static pages at build time
3. **Partial Prerendering**: Combine static + dynamic content
4. **Edge Runtime**: Deploy to edge for lower latency

**Example**: Streaming SSR
```typescript
// app/analytics/hitl/page.tsx
import { Suspense } from "react";

export default function HITLPage() {
  return (
    <div>
      <Suspense fallback={<LoadingSkeleton />}>
        <HITLDashboard />
      </Suspense>
    </div>
  );
}
```

---

## Phase 5: Deployment & Cutover (Week 4)

### Step 5.1: Deploy Next.js App

**Recommended Platform**: Vercel (built by Next.js team)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd next-app
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_CONVEX_URL production
```

**Alternative**: Self-hosted with Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY next-app/package*.json ./
RUN npm ci --production
COPY next-app .
RUN npm run build
CMD ["npm", "start"]
```

### Step 5.2: Configure Routing Strategy

**Option A**: DNS-based routing
- `app.nodebench.ai` → Next.js SSR
- `legacy.nodebench.ai` → Vite app

**Option B**: Path-based routing (nginx)
```nginx
server {
  listen 80;
  server_name nodebench.ai;

  # SSR pages (Next.js)
  location /analytics {
    proxy_pass http://localhost:3000;
  }

  location /documents {
    proxy_pass http://localhost:3000;
  }

  # Legacy pages (Vite)
  location / {
    proxy_pass http://localhost:4173;
  }
}
```

### Step 5.3: Gradual Cutover Plan

**Week 4 Timeline**:
- **Monday**: Deploy Next.js to staging
- **Tuesday**: Test all migrated routes
- **Wednesday**: Deploy to production (10% traffic)
- **Thursday**: Increase to 50% traffic
- **Friday**: Full cutover or rollback

---

## Risk Mitigation

### Critical Risks

**1. Convex SSR Compatibility**
- **Risk**: Convex may not support SSR properly
- **Mitigation**: Test early (Step 1.1), have fallback plan
- **Fallback**: Use Convex HTTP API for SSR, client hooks for interactivity

**2. Hydration Errors**
- **Risk**: Mismatch between server/client rendering
- **Mitigation**: Test extensively, use suppressHydrationWarning sparingly
- **Fallback**: Mark problematic components as client-only

**3. Auth Flow Breaks**
- **Risk**: @convex-dev/auth may not work with Next.js
- **Mitigation**: Test auth early, consult Convex docs
- **Fallback**: Implement custom auth with cookies/sessions

**4. Performance Worse Than Expected**
- **Risk**: SSR overhead makes app slower
- **Mitigation**: Benchmark early, optimize aggressively
- **Fallback**: Use static generation where possible

### Rollback Plan

**If migration fails**:
1. Keep Vite app running at old domain
2. Redirect traffic back to Vite
3. Fix issues in Next.js staging environment
4. Retry cutover when stable

**Rollback Triggers**:
- Performance worse than 59/100
- Critical features broken
- Auth completely non-functional
- Hydration errors on >50% of pages

---

## Success Criteria

### Must Have ✅
- [ ] Performance score: 70+
- [ ] FCP: <1.2s
- [ ] LCP: <2.5s
- [ ] All critical routes working
- [ ] Auth functional
- [ ] Zero TypeScript errors
- [ ] Zero hydration errors

### Nice to Have
- [ ] Performance score: 80+
- [ ] FCP: <0.8s
- [ ] All routes migrated
- [ ] Streaming SSR implemented
- [ ] Edge deployment

---

## Timeline Estimate

### Week 1: Foundation
- Day 1-2: Test Convex SSR compatibility ⚠️
- Day 3-4: Set up Next.js, configure routing
- Day 5: Migrate first page (analytics HITL)

### Week 2: Core Migration
- Day 1-3: Migrate high-priority pages (analytics, research)
- Day 4-5: Migrate MainLayout, shared components

### Week 3: Polish
- Day 1-3: Fix hydration errors, optimize SSR
- Day 4-5: Test all pages, Lighthouse benchmarking

### Week 4: Deploy
- Day 1-2: Deploy to staging, final testing
- Day 3-5: Gradual production cutover

---

## Next Steps

**Immediate Actions**:
1. ✅ Test Convex SSR compatibility (CRITICAL)
2. Set up Next.js project structure
3. Migrate one simple page (analytics HITL)
4. Run Lighthouse, measure improvement
5. Decide: proceed or pivot?

**Decision Points**:
- **After Day 2**: If Convex SSR doesn't work → pivot to different approach
- **After Week 1**: If performance not improving → reassess strategy
- **After Week 3**: If too many hydration errors → consider hybrid approach

---

**Status**: 📋 **Plan Created - Ready to Execute**

**First Task**: Test Convex SSR Compatibility ⚠️
