import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowUpRight, Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { buildCockpitPath, type CockpitSurfaceId } from "@/lib/registry/viewRegistry";
import { cn } from "@/lib/utils";

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
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-6 py-2.5 xl:py-4 xl:px-8">
        <button
          type="button"
          onClick={() => onSurfaceChange("ask")}
          className="inline-flex min-w-0 items-center gap-3 text-left"
          aria-label="Open NodeBench home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/70 text-sm font-semibold text-content dark:border-white/8 dark:bg-white/[0.035]">
            N
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold tracking-tight text-content">NodeBench</span>
            <span className="hidden text-[11px] uppercase tracking-[0.18em] text-content-muted md:block">
              Anything in. Clear report out.
            </span>
          </span>
        </button>

        <nav
          className="nb-topnav-nav hidden items-center gap-1 rounded-full p-1 xl:flex"
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
                  "nb-topnav-button rounded-full px-4 py-2 text-sm transition",
                  isActive
                    ? "nb-topnav-button-active"
                    : "hover:bg-white/[0.04] dark:hover:bg-white/[0.06]",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode(resolvedMode === "dark" ? "light" : "dark")}
            className="nb-icon-button"
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
              <ArrowUpRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signIn("anonymous")}
              className="nb-topnav-action"
            >
              Sign in
              <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
});

export default ProductTopNav;
