import React from "react";
import { useNavigate } from "react-router-dom";

type Hub = "documents" | "calendar" | "agents" | "roadmap" | "workspace";

export function UnifiedHubPills({
  active,
  showRoadmap = false,
  roadmapDisabled = true,
  className,
}: {
  active: Hub;
  showRoadmap?: boolean;
  roadmapDisabled?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();

  const container = [
    "inline-flex items-center gap-0.5 p-1 rounded-lg bg-surface-secondary/80 backdrop-blur-sm border border-edge/60 shadow-sm",
    className ?? "",
  ]
    .join(" ")
    .trim();

  const btnCls = (name: Hub, disabled?: boolean) => {
    const isActive = active === name;
    return [
      "relative inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border transition-all duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
      isActive
        ? "border-primary/30 bg-primary/[0.08] text-content font-semibold shadow-sm ring-1 ring-primary/30 dark:ring-primary/40"
        : "border-transparent text-content-secondary hover:text-content hover:border-edge hover:bg-surface/70",
      disabled ? "opacity-40 cursor-not-allowed" : "",
    ].join(" ");
  };

  // All pills stay within the editor surface using search params.
  // Previously used bare paths (/calendar, /agents, /roadmap) which resolved
  // to the ask surface because they weren't registered in viewRegistry.
  // All pills navigate via ?surface=editor&view=X params.
  // DO NOT dispatch custom events (navigate:calendar etc.) — useGlobalEventListeners
  // has handlers that call navigateToView which resolves the surface via getSurfaceForView,
  // overriding the explicit surface=editor param back to surface=ask.
  const goDocs = () => { try { navigate("/?surface=editor"); } catch {} };
  const goCalendar = () => { try { navigate("/?surface=editor&view=calendar"); } catch {} };
  const goAgents = () => { try { navigate("/?surface=editor&view=agents"); } catch {} };
  const goRoadmap = () => { try { navigate("/?surface=editor&view=roadmap"); } catch {} };
  const goWorkspace = () => { try { navigate("/?surface=editor&view=workspace"); } catch {} };

  return (
    <nav className={container} role="tablist" aria-label="Primary hubs">
      <button className={btnCls("agents")} onClick={goAgents} role="tab" aria-selected={active === "agents"} aria-current={active === "agents" ? "page" : undefined}>
        {active === "agents" ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
        Agents
      </button>
      <button className={btnCls("workspace")} onClick={goWorkspace} role="tab" aria-selected={active === "workspace"} aria-current={active === "workspace" ? "page" : undefined}>
        {active === "workspace" ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
        Workspace
      </button>
      <button className={btnCls("documents")} onClick={goDocs} role="tab" aria-selected={active === "documents"} aria-current={active === "documents" ? "page" : undefined}>
        {active === "documents" ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
        Documents
      </button>
      <button className={btnCls("calendar")} onClick={goCalendar} role="tab" aria-selected={active === "calendar"} aria-current={active === "calendar" ? "page" : undefined}>
        {active === "calendar" ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
        Schedule
      </button>
      {showRoadmap && (
        <button
          className={btnCls("roadmap", roadmapDisabled)}
          onClick={roadmapDisabled ? undefined : goRoadmap}
          role="tab"
          aria-selected={active === "roadmap"}
          aria-current={active === "roadmap" ? "page" : undefined}
          aria-disabled={roadmapDisabled}
          title={roadmapDisabled ? "Roadmap not available" : "Open roadmap hub"}
          disabled={roadmapDisabled}
        >
          {active === "roadmap" ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
          Roadmap
        </button>
      )}
    </nav>
  );
}
