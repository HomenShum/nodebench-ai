import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowUpRight, Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { AskNodeBenchPill } from "@/features/agents/components/AskNodeBenchPill";
import { buildCockpitPath, type CockpitSurfaceId } from "@/lib/registry/viewRegistry";
import { cn } from "@/lib/utils";
import { BackgroundRunsChip } from "@/features/chat/components/BackgroundRunsChip";

const PRODUCT_NAV: Array<{ surfaceId: CockpitSurfaceId; label: string }> = [
  { surfaceId: "ask", label: "Home" },
  { surfaceId: "workspace", label: "Chat" },
  { surfaceId: "packets", label: "Reports" },
  { surfaceId: "history", label: "Nudges" },
  { surfaceId: "connect", label: "Me" },
];

interface ProductTopNavProps {
  activeSurface: CockpitSurfaceId;
  onSurfaceChange: (surface: CockpitSurfaceId) => void;
}

export const ProductTopNav = memo(function ProductTopNav({
  activeSurface,
  onSurfaceChange,
}: ProductTopNavProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const { resolvedMode, setMode } = useTheme();

  return (
    <header className="nb-topnav-surface sticky top-0 z-20">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-6 py-2 xl:px-8">
        {/* Logo */}
        <button
          type="button"
          onClick={() => onSurfaceChange("ask")}
          className="inline-flex items-center gap-2.5 text-left"
          aria-label="Open NodeBench home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-900 dark:bg-white/[0.06] dark:text-gray-100">
            N
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-content">
            NodeBench
          </span>
        </button>

        <nav
          className="hidden items-center gap-0.5 xl:flex"
          aria-label="Primary product navigation"
        >
          {PRODUCT_NAV.map((item) => {
            const isActive = item.surfaceId === activeSurface;
            return (
              <button
                key={item.surfaceId}
                type="button"
                onClick={() => onSurfaceChange(item.surfaceId)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition",
                  isActive
                    ? "font-medium text-gray-900 dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/*
            BackgroundRunsChip — visible across every surface so users always
            know async-mode runs are cooking even after they navigate away.
            Hidden component (renders null) until the session artifacts
            pipeline is wired in Phase 1 Week 3 (Convex query feeds counts).
            See: .claude/rules/async_reliability.md
          */}
          <BackgroundRunsChip
            runningCount={0}
            attentionCount={0}
            onClick={() => navigate(buildCockpitPath({ surfaceId: "history" }))}
          />
          <AskNodeBenchPill />
          <button
            type="button"
            onClick={() => setMode(resolvedMode === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
              Start chat
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
