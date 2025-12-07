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
    "inline-flex items-center gap-0.5 p-1 rounded-xl bg-gray-100/80 backdrop-blur-sm border border-gray-200/50 shadow-sm",
    className ?? "",
  ]
    .join(" ")
    .trim();

  const btnCls = (name: Hub, disabled?: boolean) => {
    const isActive = active === name;
    return [
      "px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
      isActive
        ? "bg-white text-gray-900 shadow-sm"
        : "text-gray-500 hover:text-gray-700 hover:bg-white/60",
      disabled ? "opacity-40 cursor-not-allowed" : "",
    ].join(" ");
  };

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
      window.location.hash = "#agents";
      window.dispatchEvent(new CustomEvent("navigate:agents"));
    } catch {}
  };
  const goRoadmap = () => {
    try {
      window.location.hash = "#roadmap";
      window.dispatchEvent(new CustomEvent("navigate:roadmap"));
    } catch {}
  };

  return (
    <nav className={container} role="tablist" aria-label="Primary hubs">
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
    </nav>
  );
}


