/**
 * MobileTabBar — fixed bottom navigation for compact layouts below xl.
 *
 * Replaces the hidden WorkspaceRail sidebar on mobile.
 * Mirrors SitFlow's tab bar: 56px height + safe-area padding,
 * haptic feedback, smart badge (hides when focused), terracotta active indicator.
 */

import { memo } from "react";
import { useLocation } from "react-router-dom";
import { FileText, Home, Inbox, MessageSquare, User } from "lucide-react";
import type { CockpitSurfaceId } from "@/lib/registry/viewRegistry";
import { cn } from "@/lib/utils";

interface MobileTabBarProps {
  activeSurface: CockpitSurfaceId;
  onSurfaceChange: (surface: CockpitSurfaceId) => void;
  agentActive?: boolean;
  unreadBriefCount?: number;
  hidden?: boolean;
}

const TABS: readonly {
  id: CockpitSurfaceId;
  label: string;
  icon: typeof MessageSquare;
}[] = [
  { id: "ask", label: "Home", icon: Home },
  { id: "packets", label: "Reports", icon: FileText },
  { id: "workspace", label: "Chat", icon: MessageSquare },
  { id: "history", label: "Inbox", icon: Inbox },
  { id: "connect", label: "Me", icon: User },
];

export const MobileTabBar = memo(function MobileTabBar({
  activeSurface,
  onSurfaceChange,
  agentActive: _agentActive = false,
  unreadBriefCount = 0,
  hidden = false,
}: MobileTabBarProps) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const hasFocusedChatRun = Boolean(
    searchParams.get("session")?.trim() ||
      searchParams.get("q")?.trim() ||
      searchParams.get("draft")?.trim(),
  );
  const hideForActiveChatThread = hasFocusedChatRun;

  if (hidden || hideForActiveChatThread) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex xl:hidden"
      role="navigation"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        className="flex w-full items-start justify-around border-t border-white/[0.05] bg-[#0f141a]/92 px-1 pt-0.5 shadow-[0_-6px_18px_rgba(0,0,0,0.2)] backdrop-blur-xl"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSurface === tab.id;
          const showBadge =
            tab.id === "history" && unreadBriefCount > 0 && !isActive;
          const isCenterCta = tab.id === "workspace";

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onSurfaceChange(tab.id);
                if (typeof navigator?.vibrate === "function") navigator.vibrate(10);
              }}
              className={cn(
                "nb-pressable flex min-w-[54px] flex-col items-center gap-0.5 px-2 py-1.25",
                "transition-colors duration-150",
                isCenterCta
                  ? "relative -mt-0.5 rounded-[12px] border border-white/[0.04] bg-white/[0.015] px-3 py-1.25"
                  : "",
                isActive ? "text-accent-primary" : "text-white/70 hover:text-white/90",
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              data-agent-id={`cockpit:mobile-surface:${tab.id}`}
              data-agent-action="navigate"
              data-agent-label={tab.label}
            >
              <span className="relative">
                <Icon className={`${isCenterCta ? "h-5 w-5" : "h-[18px] w-[18px]"}`} />
                {showBadge && (
                  <span
                    className="absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                  >
                    {unreadBriefCount > 9 ? "9+" : unreadBriefCount}
                  </span>
                )}
              </span>
              <span className={`${isCenterCta ? "text-[11px] font-semibold" : "text-[11px] font-semibold tracking-[-0.01em]"}`}>{tab.label}</span>
              {isActive && (
                <span className={cn("h-0.5 rounded-full bg-accent-primary", isCenterCta ? "w-5" : "w-4")} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

export default MobileTabBar;
