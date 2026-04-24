import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowUpRight, Moon, Search, Sun, Terminal } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { AskNodeBenchPill } from "@/features/agents/components/AskNodeBenchPill";
import { buildCockpitPath, type CockpitSurfaceId } from "@/lib/registry/viewRegistry";
import { cn } from "@/lib/utils";
import { BackgroundRunsChip } from "@/features/chat/components/BackgroundRunsChip";

const PRODUCT_NAV: Array<{ surfaceId: CockpitSurfaceId; label: string }> = [
  { surfaceId: "ask", label: "Home" },
  { surfaceId: "packets", label: "Reports" },
  { surfaceId: "workspace", label: "Chat" },
  { surfaceId: "history", label: "Inbox" },
  { surfaceId: "connect", label: "Me" },
];

interface ProductTopNavProps {
  activeSurface: CockpitSurfaceId;
  onSurfaceChange: (surface: CockpitSurfaceId) => void;
  onOpenPalette?: () => void;
}

export const ProductTopNav = memo(function ProductTopNav({
  activeSurface,
  onSurfaceChange,
  onOpenPalette,
}: ProductTopNavProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const { resolvedMode, setMode } = useTheme();
  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);

  return (
    <header className="nb-topnav-surface sticky top-0 z-20 px-3 pt-3 sm:px-5 sm:pt-4 xl:px-8">
      <div className="nb-topnav-shell mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-5 xl:px-6">
        <button
          type="button"
          onClick={() => onSurfaceChange("ask")}
          className="group inline-flex min-w-0 items-center gap-3 text-left"
          aria-label="Open NodeBench home"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-black/[0.06] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.98),rgba(244,247,251,0.86)_56%,rgba(226,231,239,0.82))] text-sm font-semibold text-gray-950 shadow-[0_14px_30px_-22px_rgba(15,23,42,0.24)] transition group-hover:scale-[1.01] dark:border-white/[0.08] dark:bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.14),rgba(255,255,255,0.06)_48%,rgba(14,18,24,0.92))] dark:text-gray-100 dark:shadow-[0_18px_42px_-28px_rgba(0,0,0,0.92)]">
            N
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold tracking-[-0.03em] text-content">
              NodeBench <span className="text-[var(--accent-primary)]">AI</span>
            </span>
            <span className="hidden truncate text-[11px] text-gray-500 dark:text-gray-400 sm:block">
              Operator-grade research threads
            </span>
          </span>
        </button>

        <nav
          className="nb-topnav-nav hidden items-center gap-1 rounded-full p-1.5 lg:flex"
          aria-label="Primary product navigation"
        >
          {PRODUCT_NAV.map((item) => {
            const isActive = item.surfaceId === activeSurface;
            return (
              <button
                key={item.surfaceId}
                type="button"
                onClick={() => onSurfaceChange(item.surfaceId)}
                data-active={isActive ? "true" : "false"}
                data-state={isActive ? "active" : "inactive"}
                className={cn(
                  "nb-topnav-button rounded-full border px-3.5 py-1.5 text-[13px] transition-all duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30 xl:text-[13.5px]",
                  isActive
                    ? "nb-topnav-button-active border-transparent font-semibold shadow-sm"
                    : "border-transparent",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <BackgroundRunsChip
            runningCount={0}
            attentionCount={0}
            onClick={() => navigate(buildCockpitPath({ surfaceId: "history" }))}
          />
          {onOpenPalette ? (
            <button
              type="button"
              onClick={onOpenPalette}
              className="hidden items-center gap-2 rounded-full border border-black/[0.06] bg-white/75 px-3.5 py-2 text-[13px] text-gray-700 shadow-[0_16px_34px_-26px_rgba(15,23,42,0.22)] transition hover:border-black/[0.1] hover:bg-white hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.88)] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.06] dark:hover:text-white xl:inline-flex"
              aria-label="Search across threads, reports, and files"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
              <kbd className="rounded-full border border-black/[0.08] bg-black/[0.03] px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
                {isMac ? "Cmd+K" : "Ctrl+K"}
              </kbd>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate("/cli")}
            className="hidden h-10 items-center gap-2 rounded-full border border-black/[0.06] bg-white/70 px-3 text-[13px] font-medium text-gray-600 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.2)] transition hover:border-black/[0.1] hover:bg-white hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:shadow-[0_18px_42px_-30px_rgba(0,0,0,0.88)] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.06] dark:hover:text-gray-100 lg:inline-flex"
            aria-label="Open CLI and MCP install instructions"
            title="CLI and MCP install"
          >
            <Terminal className="h-4 w-4" />
            <span>CLI</span>
          </button>
          <AskNodeBenchPill />
          <button
            type="button"
            onClick={() => setMode(resolvedMode === "dark" ? "light" : "dark")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white/70 text-gray-500 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.2)] transition hover:border-black/[0.1] hover:bg-white hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-400 dark:shadow-[0_18px_42px_-30px_rgba(0,0,0,0.88)] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
            aria-label={resolvedMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={resolvedMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolvedMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate(buildCockpitPath({ surfaceId: "workspace" }))}
              className="nb-topnav-action"
            >
              Open chat
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signIn("anonymous")}
              className="nb-topnav-action"
            >
              Sign in
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
});

export default ProductTopNav;
