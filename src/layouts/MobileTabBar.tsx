/**
 * MobileTabBar — fixed bottom navigation for < 1024px.
 *
 * Replaces the hidden WorkspaceRail sidebar on mobile.
 * Mirrors SitFlow's tab bar: 56px height + safe-area padding,
 * haptic feedback, smart badge (hides when focused), terracotta active indicator.
 */

import { memo, useState } from "react";
import { MessageSquare, Orbit, Radar, FileText, MoreHorizontal, Building2, Radio, Network, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { CockpitSurfaceId } from "@/lib/registry/viewRegistry";
import { cn } from "@/lib/utils";

interface MobileTabBarProps {
  activeSurface: CockpitSurfaceId;
  onSurfaceChange: (surface: CockpitSurfaceId) => void;
  agentActive?: boolean;
  unreadBriefCount?: number;
}

const TABS: readonly {
  id: CockpitSurfaceId;
  label: string;
  icon: typeof MessageSquare;
}[] = [
  { id: "ask",       label: "Ask",       icon: MessageSquare },
  { id: "memo",      label: "Memo",      icon: Orbit },
  { id: "research",  label: "Research",  icon: Radar },
  { id: "editor",    label: "Workspace", icon: FileText },
];

const FOUNDER_ITEMS = [
  { path: "/founder", label: "Dashboard", icon: Building2 },
  { path: "/founder/coordination", label: "Coordination", icon: Radio },
  { path: "/founder/entities", label: "Entities", icon: Network },
] as const;

export const MobileTabBar = memo(function MobileTabBar({
  activeSurface,
  onSurfaceChange,
  agentActive = false,
  unreadBriefCount = 0,
}: MobileTabBarProps) {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-[49] lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-16 left-4 right-4 rounded-xl border border-white/[0.08] bg-[#1a1918] p-2 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Founder</span>
              <button type="button" onClick={() => setMoreOpen(false)} className="text-white/30" aria-label="Close menu"><X className="h-3.5 w-3.5" /></button>
            </div>
            {FOUNDER_ITEMS.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => { navigate(item.path); setMoreOpen(false); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white/80"
              >
                <item.icon className="h-4 w-4 text-[#d97757]" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden"
      role="navigation"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        className="flex w-full items-start justify-around border-t border-white/[0.06] bg-[#151413]/95 px-2 pt-2 backdrop-blur-xl"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSurface === tab.id;
          // SitFlow pattern: badge hides when tab IS focused
          const showBadge =
            tab.id === "ask" && unreadBriefCount > 0 && !isActive;
          // Green dot: only visible when System tab IS focused & agent alive
          const showDot =
            tab.id === "telemetry" && agentActive && isActive;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onSurfaceChange(tab.id);
                if ("vibrate" in navigator) navigator.vibrate(10);
              }}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5",
                "transition-colors duration-150",
                isActive ? "text-[#d97757]" : "text-white/40",
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              data-agent-id={`cockpit:mobile-surface:${tab.id}`}
              data-agent-action="navigate"
              data-agent-label={tab.label}
            >
              <span className="relative">
                <Icon className="h-6 w-6" />
                {showBadge && (
                  <span
                    className="absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                  >
                    {unreadBriefCount > 9 ? "9+" : unreadBriefCount}
                  </span>
                )}
                {showDot && (
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-emerald-400" />
                )}
              </span>
              <span className="text-[10px] font-semibold">{tab.label}</span>
              {isActive && (
                <span className="h-0.5 w-4 rounded-full bg-[#d97757]" />
              )}
            </button>
          );
        })}
        {/* More button for founder views */}
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-1.5",
            "transition-colors duration-150",
            moreOpen ? "text-[#d97757]" : "text-white/40",
          )}
          aria-label="More options"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal className="h-6 w-6" />
          <span className="text-[10px] font-semibold">More</span>
          {moreOpen && <span className="h-0.5 w-4 rounded-full bg-[#d97757]" />}
        </button>
      </div>
    </nav>
    </>
  );
});

export default MobileTabBar;
