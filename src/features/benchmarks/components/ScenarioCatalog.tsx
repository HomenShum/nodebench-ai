/**
 * ScenarioCatalog — 4 task ladders as Linear issue-list rows
 *
 * Each scenario card shows: icon, name, description, subtask count, estimated
 * duration, run count badge, status dot, and a (disabled) Run button.
 *
 * NOTE for Codex: Wire `scenarioStats` prop to the Convex query result from
 *   workbenchQueries.getScenarioStats when Phase 2 execution engine lands.
 *   The "Run" button should call triggerWorkbenchRun (Phase 2 action).
 */

import { type LucideIcon, Paintbrush2, Workflow, Timer, Building2, Play } from "lucide-react";

// ─── Scenario definitions ─────────────────────────────────────────────────────

export interface WorkbenchScenario {
  id: string;
  name: string;
  description: string;
  subtasks: number;
  estimatedMin: number;
  icon: LucideIcon;
  /** Which scoring rubric axes are evaluated */
  rubricAxes: string[];
}

export const WORKBENCH_SCENARIOS: WorkbenchScenario[] = [
  {
    id: "ui-transform",
    name: "UI Transformation",
    description:
      "Transform a frozen app UI from incomplete → polished. Layout, typography, accessibility, visual regression.",
    subtasks: 4,
    estimatedMin: 30,
    icon: Paintbrush2,
    rubricAxes: ["design_compliance", "layout", "accessibility", "visual_qa"],
  },
  {
    id: "agent-integration",
    name: "Agent Integration",
    description:
      "Add a new agent workflow end-to-end: tool → orchestrator → persistence → UI render + citations.",
    subtasks: 5,
    estimatedMin: 45,
    icon: Workflow,
    rubricAxes: ["tool_correctness", "artifact_integrity", "citations", "replay_determinism"],
  },
  {
    id: "long-run-reliability",
    name: "Long-Run Reliability",
    description:
      "Sustain a research → verify → publish loop under chaos: 429s, fetch failures, partial outages.",
    subtasks: 3,
    estimatedMin: 120,
    icon: Timer,
    rubricAxes: ["completion_probability", "graceful_degradation", "slo_adherence", "cost_efficiency"],
  },
  {
    id: "architect-mode",
    name: "Architect Mode",
    description:
      "Plan review → tradeoff doc → implementation → tests. Measures systems thinking + execution.",
    subtasks: 4,
    estimatedMin: 45,
    icon: Building2,
    rubricAxes: ["plan_quality", "unforced_errors", "test_additions", "refactor_quality"],
  },
];

function formatEstimatedDuration(estimatedMin: number) {
  if (estimatedMin < 60) return `~${estimatedMin}m`;
  const hours = Math.floor(estimatedMin / 60);
  const minutes = estimatedMin % 60;
  if (minutes === 0) return `~${hours}h`;
  return `~${hours}h ${minutes}m`;
}

function formatAxisLabel(axis: string) {
  const axisLabels: Record<string, string> = {
    design_compliance: "Design",
    layout: "Layout",
    accessibility: "Accessibility",
    visual_qa: "Visual QA",
    tool_correctness: "Tool correctness",
    artifact_integrity: "Artifact integrity",
    citations: "Citations",
    replay_determinism: "Replay",
    completion_probability: "Completion",
    graceful_degradation: "Graceful degrade",
    slo_adherence: "SLOs",
    cost_efficiency: "Cost",
    plan_quality: "Plan quality",
    unforced_errors: "Unforced errors",
    test_additions: "Tests",
    refactor_quality: "Refactor",
  };
  return axisLabels[axis] ?? axis.replace(/_/g, " ");
}

// ─── Scenario stats shape ─────────────────────────────────────────────────────

export interface ScenarioStat {
  runCount: number;
  avgScore: number;
  lastRunAt: number;
  lastStatus: "passed" | "failed";
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ stat }: { stat?: ScenarioStat }) {
  if (!stat || stat.runCount === 0) {
    return <span className="w-2 h-2 rounded-full bg-content-muted/30 flex-none" title="Not yet run" />;
  }
  if (stat.lastStatus === "passed") {
    return <span className="w-2 h-2 rounded-full bg-emerald-500 flex-none" title="Last run passed" />;
  }
  return <span className="w-2 h-2 rounded-full bg-red-500 flex-none" title="Last run failed" />;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface border border-edge text-content-muted">
      {children}
    </span>
  );
}

// ─── Run count badge ──────────────────────────────────────────────────────────

function RunBadge({ stat }: { stat?: ScenarioStat }) {
  const count = stat?.runCount ?? 0;
  if (count === 0) {
    return <span className="text-[10px] text-content-muted">No runs yet</span>;
  }
  return (
    <span className="text-[10px] font-medium text-content-secondary">
      {count} {count === 1 ? "run" : "runs"}
      {stat?.avgScore !== undefined && (
        <> · avg {Math.round(stat.avgScore)}</>
      )}
    </span>
  );
}

// ─── Single scenario row ──────────────────────────────────────────────────────

function ScenarioRow({
  scenario,
  stat,
}: {
  scenario: WorkbenchScenario;
  stat?: ScenarioStat;
}) {
  const Icon = scenario.icon;
  const durationLabel = formatEstimatedDuration(scenario.estimatedMin);
  const metaLabel = `${scenario.subtasks} subtasks · ${durationLabel}`;

  return (
    <div
      className="
        nb-surface-card flex items-start gap-3 px-4 py-4
        hover:border-content-muted/30
        bg-surface hover:bg-surface-secondary
        transition-colors group cursor-default
      "
    >
      {/* Status dot */}
      <div className="mt-1.5">
        <StatusDot stat={stat} />
      </div>

      {/* Icon */}
      <div className="flex-none w-8 h-8 rounded-md bg-surface flex items-center justify-center border border-edge">
        <Icon className="w-4 h-4 text-content-secondary" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-content">{scenario.name}</span>
          <RunBadge stat={stat} />
        </div>
        <p className="text-xs text-content-muted mt-0.5 leading-relaxed">
          {scenario.description}
        </p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-content-muted">{metaLabel}</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {scenario.rubricAxes.slice(0, 3).map((axis) => (
              <Chip key={axis}>{formatAxisLabel(axis)}</Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Run button — disabled, Phase 2 */}
      <div className="flex-none self-center">
        <button
          disabled
          title="Benchmark execution coming in Phase 2 — configure a workbench app first"
          className="
            flex items-center gap-1.5 px-2.5 py-1 rounded border border-edge
            bg-surface-secondary text-[11px] font-medium text-content-muted
            opacity-60 cursor-not-allowed
          "
        >
          <Play className="w-3 h-3" />
          Run
        </button>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScenarioCatalog({
  // NOTE for Codex: pass useQuery(api.domains.evaluation.workbenchQueries.getScenarioStats) result here
  scenarioStats,
}: {
  scenarioStats?: Record<string, ScenarioStat>;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-content-muted">
          Scenarios
        </h2>
        <span className="text-xs text-content-muted">4 task ladders</span>
      </div>

      <div className="space-y-2">
        {WORKBENCH_SCENARIOS.map((scenario) => (
          <ScenarioRow
            key={scenario.id}
            scenario={scenario}
            stat={scenarioStats?.[scenario.id]}
          />
        ))}
      </div>
    </section>
  );
}
