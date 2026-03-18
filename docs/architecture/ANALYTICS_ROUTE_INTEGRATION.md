# Analytics Route Integration Guide

This guide provides the exact changes needed to integrate all analytics dashboards into the MainLayout routing system.

---

## Changes to `src/components/MainLayout.tsx`

### 1. Add Lazy Imports (After line 89)

```typescript
const HITLAnalyticsDashboard = lazy(() =>
  import("@/features/analytics/views/HITLAnalyticsDashboard").then((mod) => ({
    default: mod.default,
  })),
);
const ComponentMetricsDashboard = lazy(() =>
  import("@/features/analytics/views/ComponentMetricsDashboard").then((mod) => ({
    default: mod.default,
  })),
);
const RecommendationAnalyticsDashboard = lazy(() =>
  import("@/features/analytics/views/RecommendationAnalyticsDashboard").then((mod) => ({
    default: mod.default,
  })),
);
```

### 2. Update MainView Type (Line 109-123)

**Add these new view types:**

```typescript
type MainView =
  | 'documents'
  | 'calendar'
  | 'roadmap'
  | 'timeline'
  | 'public'
  | 'agents'
  | 'research'
  | 'showcase'
  | 'footnotes'
  | 'signals'
  | 'benchmarks'
  | 'entity'
  | 'funding'
  | 'activity'
  | 'analytics-hitl'          // NEW
  | 'analytics-components'    // NEW
  | 'analytics-recommendations'; // NEW
```

### 3. Add Route Parsing (After line 143)

**Add these routes in `parseHashRoute` function:**

```typescript
// Add after line 143 (after the activity route)
if (hash.startsWith('#analytics/hitl') || hash.startsWith('#hitl-analytics')) {
  return { view: 'analytics-hitl', entityName: null, showResearchDossier: false, researchTab: "overview" };
}
if (hash.startsWith('#analytics/components') || hash.startsWith('#component-analytics')) {
  return { view: 'analytics-components', entityName: null, showResearchDossier: false, researchTab: "overview" };
}
if (hash.startsWith('#analytics/recommendations') || hash.startsWith('#recommendation-analytics')) {
  return { view: 'analytics-recommendations', entityName: null, showResearchDossier: false, researchTab: "overview" };
}
```

### 4. Add View Rendering (After line 949)

**Add these view conditions in the rendering chain (after the 'activity' view):**

```typescript
) : currentView === 'analytics-hitl' ? (
  <div className="h-full overflow-auto bg-slate-50">
    <HITLAnalyticsDashboard />
  </div>
) : currentView === 'analytics-components' ? (
  <div className="h-full overflow-auto bg-slate-50">
    <ComponentMetricsDashboard />
  </div>
) : currentView === 'analytics-recommendations' ? (
  <div className="h-full overflow-auto bg-slate-50">
    <RecommendationAnalyticsDashboard />
  </div>
```

---

## Routes Summary

Once integrated, these URLs will be available:

| Dashboard | Route | Alt Route |
|-----------|-------|-----------|
| **HITL Analytics** | `#analytics/hitl` | `#hitl-analytics` |
| **Component Analytics** | `#analytics/components` | `#component-analytics` |
| **Recommendation Analytics** | `#analytics/recommendations` | `#recommendation-analytics` |

---

## Navigation Integration

### Option A: Add to Sidebar (Recommended)

Add an "Analytics" section to [CleanSidebar.tsx](src/components/CleanSidebar.tsx):

```typescript
{/* Analytics Section */}
<div className="space-y-1">
  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
    Analytics
  </div>
  <button
    onClick={() => window.location.hash = '#analytics/hitl'}
    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
  >
    <Activity className="h-4 w-4" />
    <span>HITL Decisions</span>
  </button>
  <button
    onClick={() => window.location.hash = '#analytics/components'}
    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
  >
    <BarChart3 className="h-4 w-4" />
    <span>Component Metrics</span>
  </button>
  <button
    onClick={() => window.location.hash = '#analytics/recommendations'}
    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
  >
    <ThumbsUp className="h-4 w-4" />
    <span>Recommendations</span>
  </button>
</div>
```

### Option B: Add to Command Palette

Add to [CommandPalette.tsx](src/components/CommandPalette.tsx):

```typescript
{
  id: 'analytics-hitl',
  title: 'HITL Analytics Dashboard',
  description: 'View human-in-the-loop decision metrics',
  icon: Activity,
  action: () => window.location.hash = '#analytics/hitl',
  category: 'Analytics',
},
{
  id: 'analytics-components',
  title: 'Component Metrics Dashboard',
  description: 'View component performance metrics',
  icon: BarChart3,
  action: () => window.location.hash = '#analytics/components',
  category: 'Analytics',
},
{
  id: 'analytics-recommendations',
  title: 'Recommendation Analytics Dashboard',
  description: 'View recommendation feedback metrics',
  icon: ThumbsUp,
  action: () => window.location.hash = '#analytics/recommendations',
  category: 'Analytics',
},
```

---

## Testing

After integration, test each route:

```bash
# In browser console:
window.location.hash = '#analytics/hitl'
window.location.hash = '#analytics/components'
window.location.hash = '#analytics/recommendations'
```

Or click links directly:
- [HITL Analytics](#analytics/hitl)
- [Component Analytics](#analytics/components)
- [Recommendation Analytics](#analytics/recommendations)

---

## Verification Checklist

- [ ] Analytics dashboards load without errors
- [ ] Navigation between analytics views works
- [ ] Back button maintains hash state
- [ ] Dashboards display data (or empty states if no data)
- [ ] Date filters work correctly
- [ ] Charts render properly
- [ ] Mobile responsive layout works

---

## Alternative: Standalone Analytics Hub

If you prefer a unified analytics hub instead of separate routes, create:

**`src/features/analytics/views/AnalyticsHub.tsx`**

```typescript
import { useState } from 'react';
import { BarChart3, Activity, ThumbsUp } from 'lucide-react';
import HITLAnalyticsDashboard from './HITLAnalyticsDashboard';
import ComponentMetricsDashboard from './ComponentMetricsDashboard';
import RecommendationAnalyticsDashboard from './RecommendationAnalyticsDashboard';

export default function AnalyticsHub() {
  const [activeTab, setActiveTab] = useState<'hitl' | 'components' | 'recommendations'>('hitl');

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Tab Navigation */}
      <div className="flex gap-2 p-4 bg-white border-b border-slate-200">
        <button
          onClick={() => setActiveTab('hitl')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'hitl'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Activity size={16} />
          HITL Decisions
        </button>
        <button
          onClick={() => setActiveTab('components')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'components'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <BarChart3 size={16} />
          Component Metrics
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'recommendations'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ThumbsUp size={16} />
          Recommendations
        </button>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'hitl' && <HITLAnalyticsDashboard />}
        {activeTab === 'components' && <ComponentMetricsDashboard />}
        {activeTab === 'recommendations' && <RecommendationAnalyticsDashboard />}
      </div>
    </div>
  );
}
```

Then only add one route:

```typescript
if (hash.startsWith('#analytics')) {
  return { view: 'analytics', entityName: null, showResearchDossier: false, researchTab: "overview" };
}
```

And one render condition:

```typescript
) : currentView === 'analytics' ? (
  <AnalyticsHub />
```

---

**Implementation Status:** Ready for integration
**Estimated Time:** 10-15 minutes
**Breaking Changes:** None
