import React from "react";
import { useNavigate } from "react-router-dom";

type Hub = "documents" | "calendar" | "agents" | "roadmap";

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

  const goDocs = () => {
    try {
      navigate("/documents");
      window.dispatchEvent(new CustomEvent("navigate:documents"));
    } catch {
      // Navigation failed
    }
  };
  const goCalendar = () => {
    try {
      navigate("/calendar");
      window.dispatchEvent(new CustomEvent("navigate:calendar"));
    } catch {
      // Navigation failed
    }
  };
  const goAgents = () => {
    try {
      navigate("/agents");
      window.dispatchEvent(new CustomEvent("navigate:agents"));
    } catch {}
  };
  const goRoadmap = () => {
    try {
      navigate("/roadmap");
      window.dispatchEvent(new CustomEvent("navigate:roadmap"));
    } catch {}
  };

  return (
    <nav className={container} role="tablist" aria-label="Primary hubs">
      <button className={btnCls("documents")} onClick={goDocs} role="tab" aria-selected={active === "documents"} aria-current={active === "documents" ? "page" : undefined}>
        {active === "documents" ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
        Documents
      </button>
      <button className={btnCls("calendar")} onClick={goCalendar} role="tab" aria-selected={active === "calendar"} aria-current={active === "calendar" ? "page" : undefined}>
        {active === "calendar" ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
        Calendar
      </button>
      <button className={btnCls("agents")} onClick={goAgents} role="tab" aria-selected={active === "agents"} aria-current={active === "agents" ? "page" : undefined}>
        {active === "agents" ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
        Agents
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
