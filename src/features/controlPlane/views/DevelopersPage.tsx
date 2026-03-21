/**
 * DevelopersPage — Architecture, tools, and integrations under the hood.
 * Houses CAPABILITIES stats, SYSTEM_LAYERS, and TECH_TAGS moved from ControlPlaneLanding.
 */

import { memo } from "react";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { ArrowLeft } from "lucide-react";
import { VIEW_PATH_MAP, type MainView } from "@/lib/registry/viewRegistry";

const CAPABILITIES = [
  { value: "304", label: "MCP tools" },
  { value: "63", label: "Backend domains" },
  { value: "8", label: "Score dimensions" },
  { value: "1,466", label: "Tests passing" },
] as const;

const SYSTEM_LAYERS = [
  {
    name: "Judgment Layer",
    description:
      "Boolean gates, 6 agent roles, self-evolution, institutional memory, passport enforcement",
    color: "#d97757",
  },
  {
    name: "Trajectory Intelligence",
    description:
      "Compounding scores, drift detection, intervention tracking, trust graph, 11 schema tables",
    color: "#7aac8c",
  },
  {
    name: "Decision Workbench",
    description:
      "Claim graphs, variable extraction, counter-models, scenario simulation, ranked interventions",
    color: "#6b9fc4",
  },
  {
    name: "Autoresearch Optimizer",
    description:
      "Offline mutation testing, runtime research cells, throughput scoring, hard quality guards",
    color: "#c4a06b",
  },
] as const;

const TECH_TAGS = [
  "React",
  "TypeScript",
  "Convex",
  "MCP Protocol",
  "Agent-as-a-Graph",
  "Boolean Rubric",
  "Progressive Discovery",
  "TOON Encoding",
  "Replay Engine",
  "Forecast Scorekeeping",
  "OpenClaw Bridge",
] as const;

interface DevelopersPageProps {
  onNavigate: (view: MainView, path?: string) => void;
}

export const DevelopersPage = memo(function DevelopersPage({
  onNavigate,
}: DevelopersPageProps) {
  const { ref: revealRef, isVisible, instant } = useRevealOnMount();

  const stagger = (delay: string): React.CSSProperties => ({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "none" : "translateY(8px)",
    transition: instant ? "none" : "opacity 0.2s ease-out, transform 0.2s ease-out",
    transitionDelay: instant ? "0s" : delay,
  });

  return (
    <div className="h-full overflow-y-auto">
      <div
        ref={revealRef}
        className="mx-auto flex min-h-full max-w-3xl flex-col px-6 py-12"
      >
        {/* Back link */}
        <button
          type="button"
          onClick={() => onNavigate("control-plane", VIEW_PATH_MAP["control-plane"] ?? "/")}
          className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm text-content-muted transition-colors hover:text-content"
          style={stagger("0s")}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to home
        </button>

        {/* Hero */}
        <h1
          style={stagger("0.05s")}
          className="text-3xl font-bold tracking-tight text-content"
        >
          Built for builders
        </h1>
        <p
          style={stagger("0.1s")}
          className="mt-3 max-w-xl text-base leading-relaxed text-content-secondary"
        >
          Architecture, tools, and integrations under the hood.
        </p>

        {/* Capabilities stats */}
        <div style={stagger("0.2s")} className="mt-10">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            What&apos;s inside
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 pb-4 pt-3"
              >
                <div className="text-2xl font-bold text-content">{cap.value}</div>
                <div className="mt-1.5 text-[11px] leading-normal text-content-muted">
                  {cap.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Layers */}
        <div style={stagger("0.3s")} className="mt-8">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            System layers
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SYSTEM_LAYERS.map((layer) => (
              <div
                key={layer.name}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div
                  className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: layer.color }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-content">{layer.name}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-content-muted">
                    {layer.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Tags */}
        <div style={stagger("0.4s")} className="mt-8">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            Built with
          </div>
          <div className="flex flex-wrap gap-2">
            {TECH_TAGS.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium text-content-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default DevelopersPage;
