import React from "react";

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
  const container = [
    "inline-flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]",
    className ?? "",
  ]
    .join(" ")
    .trim();

  const activeCls = "bg-white text-[var(--text-primary)] border-[var(--border-color)] shadow-sm";
  const inactiveCls = "text-[var(--text-secondary)] border-transparent hover:bg-white/50";
  const disabledCls = "opacity-50 cursor-not-allowed";

  const btnCls = (name: Hub, disabled?: boolean) =>
    [
      "px-8 py-1.5 text-xs rounded-md border transition-colors",
      active === name ? activeCls : inactiveCls,
      disabled ? disabledCls : "",
    ].join(" ");

  const goDocs = () => {
    try {
      window.location.hash = "#documents";
      window.dispatchEvent(new CustomEvent("navigate:documents"));
    } catch {}
  };
  const goCalendar = () => {
    try {
      window.location.hash = "#calendar";
      window.dispatchEvent(new CustomEvent("navigate:calendar"));
    } catch {}
  };
  const goAgents = () => {
    try {
      window.location.hash = "#calendar/agents";
      window.dispatchEvent(new CustomEvent("navigate:calendar"));
    } catch {}
  };
  const goRoadmap = () => {
    try {
      window.location.hash = "#roadmap";
      window.dispatchEvent(new CustomEvent("navigate:roadmap"));
    } catch {}
  };

  return (
    <div className={container} role="tablist" aria-label="Primary hubs">
      <button className={btnCls("documents")} onClick={goDocs} role="tab" aria-selected={active === "documents"}>
        Documents
      </button>
      <button className={btnCls("calendar")} onClick={goCalendar} role="tab" aria-selected={active === "calendar"}>
        Calendar
      </button>
      <button className={btnCls("agents")} onClick={goAgents} role="tab" aria-selected={active === "agents"}>
        Agents
      </button>
      {showRoadmap && (
        <button
          className={btnCls("roadmap", roadmapDisabled)}
          onClick={roadmapDisabled ? undefined : goRoadmap}
          role="tab"
          aria-selected={active === "roadmap"}
          aria-disabled={roadmapDisabled}
          title={roadmapDisabled ? "Coming soon" : "Open roadmap hub"}
          disabled={roadmapDisabled}
        >
          Roadmap
        </button>
      )}
    </div>
  );
}


