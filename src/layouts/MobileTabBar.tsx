/**
 * MobileTabBar — fixed bottom navigation for compact layouts below xl.
 *
 * Replaces the hidden WorkspaceRail sidebar on mobile.
 * Mirrors SitFlow's tab bar: 56px height + safe-area padding,
 * haptic feedback, smart badge (hides when focused), terracotta active indicator.
 */

import { memo } from "react";
import { Bell, FileText, Home, MessageSquare, User } from "lucide-react";
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
  { id: "ask", label: "Home", icon: Home },
  { id: "workspace", label: "Chat", icon: MessageSquare },
  { id: "packets", label: "Reports", icon: FileText },
  { id: "history", label: "Nudges", icon: Bell },
  { id: "connect", label: "Me", icon: User },
];

export const MobileTabBar = memo(function MobileTabBar({
  activeSurface,
  onSurfaceChange,
  agentActive: _agentActive = false,
  unreadBriefCount = 0,
}: MobileTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex xl:hidden"
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
          const showBadge =
            tab.id === "ask" && unreadBriefCount > 0 && !isActive;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onSurfaceChange(tab.id);
                if (typeof navigator?.vibrate === "function") navigator.vibrate(10);
              }}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5",
                "transition-colors duration-150",
                isActive ? "text-accent-primary" : "text-white/40",
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
              </span>
              <span className="text-[10px] font-semibold">{tab.label}</span>
              {isActive && (
                <span className="h-0.5 w-4 rounded-full bg-accent-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

export default MobileTabBar;
