# Coding Agent Prompt: Add Mobile Bottom Tab Bar to NodeBench

## The Problem

NodeBench has a `WorkspaceRail` (left sidebar) for navigating between 5 surfaces: Ask, Memo, Research, Workspace, System. It uses `hidden lg:flex` — which means **below 1024px, ALL navigation disappears entirely.** There is zero way to switch surfaces on mobile. Users are trapped on whatever surface they landed on.

SitFlow (Expo/React Native) solves this with a bottom tab bar that uses:
- Dynamic safe-area padding via `useSafeAreaInsets()`
- `HapticTab` wrapper for tactile feedback on every press
- Smart badge logic (red count badge hides when tab is focused — you're already looking at it)
- Green active dot for the Agent tab (signals "session alive")
- Platform-aware height: `56 + max(safeAreaInsets.bottom, 8)`

NodeBench needs the same pattern, adapted for web.

## What to Build

A `MobileTabBar` component that renders at `< 1024px` (replacing the hidden WorkspaceRail). It must feel native, use NodeBench's glass card DNA, and support the context graph interaction model.

## Architecture

### File: `src/layouts/MobileTabBar.tsx`

```
VISUAL SPEC:
┌──────────────────────────────────────────────────┐
│                                                  │
│          Active Surface Content                  │
│          (full viewport above bar)               │
│                                                  │
├══════════════════════════════════════════════════╡
│  ┌──────────────────────────────────────────┐    │
│  │  Brief   Search  Entities  Agent  System │    │
│  │   📋       🔍       🏢      🐾      ⚙️   │    │
│  │          (active = terracotta underline)  │    │
│  │   (3)                        (·)         │    │
│  └──────────────────────────────────────────┘    │
│  ▓▓▓▓▓▓▓ safe-area-inset-bottom padding ▓▓▓▓▓▓ │
└──────────────────────────────────────────────────┘

Height: 56px content + env(safe-area-inset-bottom)
Background: rgba(21, 20, 19, 0.95) with backdrop-blur-xl
Border-top: 1px solid rgba(255, 255, 255, 0.06)
```

### Tab Items

Map directly from the existing `SURFACE_SHORTCUTS` in `WorkspaceRail.tsx`:

| Surface ID | Label | Icon (Lucide) | Badge Logic |
|-----------|-------|---------------|-------------|
| `ask` | Brief | `Newspaper` (was MessageSquare) | Count of unread daily brief items |
| `memo` | Memo | `Orbit` | None |
| `research` | Research | `Radar` | None |
| `editor` | Workspace | `FileText` | None |
| `telemetry` | System | `Bot` | Active dot when agent session running |

### Implementation

```tsx
// src/layouts/MobileTabBar.tsx

import { memo } from "react";
import { MessageSquare, Orbit, Radar, FileText, Bot, Newspaper } from "lucide-react";
import type { CockpitSurfaceId } from "@/lib/registry/viewRegistry";
import { cn } from "@/lib/utils";

interface MobileTabBarProps {
  activeSurface: CockpitSurfaceId;
  onSurfaceChange: (surface: CockpitSurfaceId) => void;
  agentActive?: boolean;         // show green dot on System tab
  unreadBriefCount?: number;     // badge on Brief tab
}

const TABS: {
  id: CockpitSurfaceId;
  label: string;
  icon: typeof MessageSquare;
}[] = [
  { id: "ask",       label: "Brief",     icon: Newspaper },
  { id: "memo",      label: "Memo",      icon: Orbit },
  { id: "research",  label: "Research",  icon: Radar },
  { id: "editor",    label: "Workspace", icon: FileText },
  { id: "telemetry", label: "System",    icon: Bot },
];

export const MobileTabBar = memo(function MobileTabBar({
  activeSurface,
  onSurfaceChange,
  agentActive = false,
  unreadBriefCount = 0,
}: MobileTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden"
      role="navigation"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Glass background */}
      <div className="flex w-full items-start justify-around border-t border-white/[0.06] bg-[#151413]/95 px-2 pt-2 backdrop-blur-xl">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSurface === tab.id;
          const showBadge = tab.id === "ask" && unreadBriefCount > 0 && !isActive;
          const showDot = tab.id === "telemetry" && agentActive && isActive;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onSurfaceChange(tab.id);
                // Web Vibration API — 10ms pulse, same as SitFlow's HapticTab
                if ("vibrate" in navigator) navigator.vibrate(10);
              }}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 transition-colors",
                isActive ? "text-[#d97757]" : "text-white/40",
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
            >
              <span className="relative">
                <Icon className="h-6 w-6" />

                {/* Badge: unread count (SitFlow pattern — hide when focused) */}
                {showBadge && (
                  <span className="absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadBriefCount > 9 ? "9+" : unreadBriefCount}
                  </span>
                )}

                {/* Active dot: agent session alive (SitFlow pattern) */}
                {showDot && (
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-emerald-400" />
                )}
              </span>

              <span className="text-[10px] font-semibold">{tab.label}</span>

              {/* Active indicator: terracotta underline */}
              {isActive && (
                <span className="h-0.5 w-4 rounded-full bg-[#d97757]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
});
```

### Integration Points

**1. Mount in the main layout (App.tsx or layout wrapper):**

```tsx
// Wherever WorkspaceRail is rendered, add MobileTabBar as sibling:

<WorkspaceRail
  activeSurface={activeSurface}
  onSurfaceChange={setActiveSurface}
  isCollapsed={isCollapsed}
  onToggleCollapse={toggleCollapse}
/>

{/* Mobile: shows below 1024px, WorkspaceRail hides below 1024px */}
<MobileTabBar
  activeSurface={activeSurface}
  onSurfaceChange={setActiveSurface}
  agentActive={agentSessionActive}
  unreadBriefCount={unreadCount}
/>
```

**2. Add bottom padding to main content area on mobile:**

```css
/* Prevent content from being hidden behind the fixed tab bar */
@media (max-width: 1023px) {
  .main-content {
    padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
  }
}
```

**3. Hide the "Ask NodeBench" floating CTA on mobile** (the tab bar replaces it):

```css
@media (max-width: 1023px) {
  [data-agent-id="cockpit:agent-cta"] {
    display: none;
  }
}
```

### CSS Details (Matching NodeBench DNA)

```css
/* The tab bar should feel like part of the glass card system */

/* Background: same as glass cards but with higher opacity for readability */
background: rgba(21, 20, 19, 0.95);  /* #151413 at 95% */
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px);
border-top: 1px solid rgba(255, 255, 255, 0.06);

/* Active tab: terracotta accent, not purple */
color: #d97757;  /* NodeBench terracotta, NOT SitFlow's #7C3AED */

/* Inactive tab: muted white */
color: rgba(255, 255, 255, 0.4);

/* Badge: red for attention */
background: #EF4444;

/* Active dot: emerald for "alive" */
background: #34D399;

/* Icon size: 24px (6 in Tailwind) — thumb-friendly */
/* Label size: 10px — compact but readable */
/* Active underline: 16px wide, 2px tall, terracotta, rounded */

/* Transition: color 150ms — snappy, no lag */
```

### What NOT to Do

1. **Don't use a hamburger menu.** Mobile users need to see all 5 surfaces at all times. A hamburger hides navigation behind a tap, increasing friction. SitFlow proves 4 bottom tabs work. 5 is the iOS limit and still fits at 375px.

2. **Don't collapse to 3 tabs + "More."** All 5 surfaces are equally important. A "More" menu creates a second-class surface. If you must reduce, merge Memo into Research (both are read surfaces).

3. **Don't animate the tab bar in/out.** It should be permanently fixed. Scrolling should not hide it. The user needs to be able to switch surfaces at ANY time without scrolling back to top.

4. **Don't use the left sidebar on mobile.** Even collapsed (48px), the sidebar wastes horizontal space that mobile needs for content. Bottom tab bar = 0px horizontal footprint.

5. **Don't use SitFlow's purple (#7C3AED).** NodeBench's accent is terracotta (#d97757). The active tab indicator must match the brand, not SitFlow's brand.

6. **Don't forget safe-area-inset-bottom.** On iPhone with home indicator, the bottom 34px is reserved. Without the env() padding, the tab bar sits under the swipe indicator and becomes untappable.

### Testing Checklist

- [ ] At 1024px+ → WorkspaceRail visible, MobileTabBar hidden
- [ ] At 1023px and below → WorkspaceRail hidden, MobileTabBar visible
- [ ] At 375px (iPhone SE) → All 5 tabs fit without truncation
- [ ] At 430px (iPhone 15 Pro Max) → Comfortable spacing
- [ ] Tab tap triggers surface change + vibration (if supported)
- [ ] Badge shows on Brief tab when unread > 0 AND tab is not focused
- [ ] Badge hides when Brief tab IS focused
- [ ] Green dot shows on System tab when agent session is active
- [ ] Active tab has terracotta underline (#d97757)
- [ ] Inactive tabs are rgba(255,255,255,0.4)
- [ ] Content doesn't hide behind the tab bar (bottom padding applied)
- [ ] Tab bar stays fixed during scroll (position: fixed, not sticky)
- [ ] No horizontal overflow at any viewport width
- [ ] Dark mode contrast: labels readable against #151413 background
- [ ] Keyboard users: tabs are focusable and have visible focus ring

### Key Files to Modify

| File | Change |
|------|--------|
| `src/layouts/MobileTabBar.tsx` | **NEW** — the component above |
| `src/layouts/WorkspaceRail.tsx` | Already has `hidden lg:flex` — no change needed |
| `src/App.tsx` (or layout wrapper) | Mount `<MobileTabBar />` next to `<WorkspaceRail />` |
| `src/index.css` or Tailwind config | Add `pb-[calc(56px+env(safe-area-inset-bottom))]` utility if needed |
| `index.html` | Add `<meta name="viewport" content="..., viewport-fit=cover">` for safe-area-inset to work |

### SitFlow Reference (What We Learned From)

```
SitFlow _layout.tsx:
  height: 56 + Math.max(safeAreaInsets.bottom, 8)
  bg: #0F0F1A
  borderTop: 0.5px solid #2A2A40
  activeColor: colors.tint (#7C3AED)
  inactiveColor: #8E8EA0
  HapticTab wrapper: Haptics.impactAsync(Light) on iOS

NodeBench translation:
  height: 56px + env(safe-area-inset-bottom)
  bg: rgba(21,20,19,0.95) + backdrop-blur-xl
  borderTop: 1px solid rgba(255,255,255,0.06)
  activeColor: #d97757 (terracotta)
  inactiveColor: rgba(255,255,255,0.4)
  Vibration API: navigator.vibrate(10)
```

The tab bar is the single highest-impact mobile UX fix for NodeBench. Without it, mobile users literally cannot navigate. With it, every surface is one tap away — same as SitFlow, same as every native app users have trained on for 15 years.
