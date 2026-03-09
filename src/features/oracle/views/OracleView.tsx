/**
 * OracleView — Builder-facing Control Tower for long-running AI coding work
 *
 * Primary surface: OracleControlTowerPanel (sessions, traces, token/cost burn,
 * drift detection, dogfood verdicts, pending confirmations, attention queue).
 *
 * Secondary: Game-framed translation layer (quests = aligned work, debuffs = drift,
 * boss fights = violations). Only shown as a collapsible panel below operational data.
 *
 * Per ORACLE_VISION.md: the underlying data remains operational, timestamped,
 * and auditable. Game labels clarify action but never hide evidence.
 */

import React, { memo, useState, Suspense, lazy } from "react";
import { Loader2, Waypoints, ChevronDown, ChevronRight, Gamepad2 } from "lucide-react";
import { useOracleData } from "../hooks/useOracleData";

// Primary: the existing control tower that queries Convex for real session data
const OracleControlTowerPanel = lazy(() =>
  import("@/features/agents/components/OracleControlTowerPanel").then((mod) => ({
    default: mod.OracleControlTowerPanel,
  })),
);

// Secondary: game-framed translation layer (existing Oracle components)
const OraclePanel = lazy(() =>
  import("../components/OraclePanel").then((mod) => ({
    default: mod.OraclePanel,
  })),
);

// ─── Demo data for the game translation layer ────────────────────────────────
// This seeds the game-framed view. In production, this would be derived from
// the same Convex session data that powers the control tower.

import type {
  PlayerStatus,
  Quest,
  Inventory,
  SignalTracker,
  TrajectoryStats,
} from "../types";

const DEMO_PLAYER: PlayerStatus = {
  playerId: "builder-001",
  displayName: "Builder",
  currentClass: "contract_executioner",
  targetClass: "ai_implementation_lead",
  level: 7,
  currentExp: 4250,
  expToNextLevel: 5000,
  activeDebuffs: [
    {
      id: "debuff-context-rot",
      name: "Context Rot",
      description:
        "Long-running sessions lose track of the original intent. The agent drifts from the vision without the builder noticing.",
      effects: [
        "Original goal degrades across context window compactions",
        "Tool sequences diverge from the planned workflow",
        "Dogfood evidence becomes stale or missing",
      ],
      isPsychological: false,
      canBeDispelled: true,
      dispelCondition:
        "Cross-check status returns to 'aligned' for 3 consecutive loops",
      appliedAt: new Date().toISOString(),
    },
  ],
  historicalClearTime: "8-12 weeks",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: new Date().toISOString(),
};

const DEMO_QUESTS: Quest[] = [
  {
    id: "quest-close-loop",
    type: "main_scenario",
    title: "Close the Current Loop",
    description:
      "Every non-trivial slice must end with evidence: typecheck/build/test, dogfood status, and updated state.",
    objective:
      "Complete the current implementation slice with passing build, dogfood screenshot, and updated ORACLE_STATE.md.",
    status: "in_progress",
    reward: { exp: 500 },
    timeWindow: "This session",
    createdAt: new Date().toISOString(),
  },
  {
    id: "quest-daily-cross-check",
    type: "daily",
    title: "Cross-Check Against Vision",
    description:
      "Read ORACLE_VISION.md and ORACLE_STATE.md. Confirm current work aligns with the original intent.",
    objective:
      "Output a brief execution plan for the current step. Ensure it aligns with the vision.",
    status: "available",
    reward: { exp: 50 },
    streakDay: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: "quest-dogfood-evidence",
    type: "side",
    title: "Attach Dogfood Evidence",
    description:
      "Run the dogfood verification loop and attach the latest QA verdict to the active session.",
    objective:
      "Dogfood verdict changes from 'missing' to 'pass' or 'watch' on the control tower.",
    status: "available",
    reward: { exp: 200, skillUnlock: "Dogfood Clear" },
    createdAt: new Date().toISOString(),
  },
];

const DEMO_INVENTORY: Inventory = {
  playerId: "builder-001",
  dropRequirements: [
    {
      id: "item-vision-snapshot",
      name: "Vision Snapshot",
      description:
        "Every long-running task stores a visionSnapshot that captures the original intent.",
      category: "paper_trail",
      status: "in_progress",
    },
    {
      id: "item-trace-timeline",
      name: "Trace Timeline",
      description:
        "Tool sequence, latency, token burn, and cost are recorded for every trace in the session.",
      category: "working_prototype",
      status: "not_acquired",
    },
    {
      id: "item-dogfood-run",
      name: "Dogfood Run Linked",
      description:
        "A passing dogfood QA run is attached to the session before it can be marked complete.",
      category: "institutional_memory",
      status: "not_acquired",
    },
  ],
  completedItems: 0,
  totalItems: 3,
  readyForClassEvolution: false,
};

const DEMO_SIGNALS: SignalTracker = {
  playerId: "builder-001",
  activeSignals: [],
  signalThreshold: 2,
  windowOpen: false,
};

const DEMO_STATS: TrajectoryStats = {
  playerId: "builder-001",
  totalExp: 4250,
  eventsToday: 2,
  currentStreak: 3,
  longestStreak: 5,
  lastEventAt: new Date().toISOString(),
  expByEventType: {
    daily_standup: 150,
    commit: 875,
    pull_request: 1200,
    code_review: 525,
    document_created: 300,
    conversation: 0,
    presentation: 0,
    architecture_decision: 600,
    poc_deployed: 0,
    budget_discussion: 0,
    custom: 600,
  },
  expBySignal: {
    mentionedMetrics: 680,
    mentionedBusinessImpact: 920,
    mentionedOwnership: 540,
    demonstratedInitiative: 1100,
    crossFunctionalCollaboration: 410,
  },
  weeklyTrend: [180, 250, 320, 0, 450, 380, 420],
};

const DEMO_ORACLE_DATA = {
  playerStatus: DEMO_PLAYER,
  quests: DEMO_QUESTS,
  inventory: DEMO_INVENTORY,
  signalTracker: DEMO_SIGNALS,
  trajectoryStats: DEMO_STATS,
  isLoading: false,
  isDemo: true,
} as const;

// ─── Thompson Protocol Banner ────────────────────────────────────────────────

const ThompsonBanner = memo(function ThompsonBanner() {
  return (
    <div className="nb-surface-card overflow-hidden">
      <div className="px-5 py-3 border-b border-edge bg-gradient-to-r from-[var(--accent-primary-bg)] via-surface to-surface">
        <div className="flex items-center gap-2">
          <Waypoints className="h-4 w-4 text-accent" />
          <span className="text-xs font-medium tracking-widest text-content-muted uppercase">
            Plain-English guidance
          </span>
        </div>
      </div>
      <div className="px-5 py-3 text-sm text-content-secondary leading-relaxed">
        This view translates internal agent telemetry into plain English. It explains what changed,
        why it matters, where the evidence lives, and what to do next without hiding the underlying proof.
      </div>
    </div>
  );
});

// ─── Main View ───────────────────────────────────────────────────────────────

function OracleViewContent() {
  const [showGameLayer, setShowGameLayer] = useState(false);
  const oracleData = useOracleData();
  return <OracleViewScaffold oracleData={oracleData} showGameLayer={showGameLayer} setShowGameLayer={setShowGameLayer} />;
}

function OracleViewScaffold({
  oracleData,
  showGameLayer,
  setShowGameLayer,
}: {
  oracleData: typeof DEMO_ORACLE_DATA;
  showGameLayer: boolean;
  setShowGameLayer: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div className="nb-page-shell">
      <div className="nb-page-inner">
        <div className="nb-page-frame space-y-6 pb-12">
          {/* Page Header */}
          <div className="pt-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary-bg)]">
                <Waypoints className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-content-muted">
                  NodeBench AI
                </div>
                <h1 className="text-xl font-bold text-content">Operational memory for long-running AI work</h1>
                <p className="text-sm text-content-secondary">
                  Use the Oracle to see where agents are drifting, what evidence they collected, and what a human should approve next.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1.6fr,1fr]">
              <div className="rounded-xl border border-edge bg-surface p-4">
                <div className="text-sm font-semibold text-content">What this is</div>
                <p className="mt-2 text-sm leading-6 text-content-secondary">
                  A control tower for builders, platform teams, and buyers who need agents to keep their intent, show their work,
                  and stay auditable across long-running sessions.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-content-secondary">
                  <a href="/benchmarks" className="inline-flex items-center rounded-full border border-edge bg-background/50 px-3 py-1.5 hover:text-content">
                    Open benchmarks
                  </a>
                  <a href="/research" className="inline-flex items-center rounded-full border border-edge bg-background/50 px-3 py-1.5 hover:text-content">
                    Explore research
                  </a>
                  <span className="inline-flex items-center rounded-full border border-edge bg-background/50 px-3 py-1.5">
                    {oracleData.isDemo ? "Preview data active" : "Live data active"}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-edge bg-surface p-4">
                <div className="text-sm font-semibold text-content">How to start</div>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-content-secondary">
                  <li>1. Check active loops and drift status below.</li>
                  <li>2. Open benchmarks to inspect proof, judges, and replay.</li>
                  <li>3. Use research to trace sources, timelines, and signals.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Thompson Protocol Banner */}
          <ThompsonBanner />

          {/* Primary Surface: Control Tower (real operational data) */}
          <Suspense
            fallback={
              <div className="nb-surface-card p-8 flex items-center justify-center gap-2 text-sm text-content-secondary">
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                Loading control tower...
              </div>
            }
          >
            <OracleControlTowerPanel />
          </Suspense>

          {/* Secondary: Game-Framed Translation Layer (collapsible) */}
          <div className="nb-surface-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGameLayer(!showGameLayer)}
              className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-content-muted" />
                <span className="text-sm font-medium text-content">
                  Game-Framed View
                </span>
                <span className="text-xs text-content-muted">
                  Translation layer for quests, debuffs, and trajectory momentum
                </span>
              </div>
              {showGameLayer ? (
                <ChevronDown className="h-4 w-4 text-content-muted" />
              ) : (
                <ChevronRight className="h-4 w-4 text-content-muted" />
              )}
            </button>

            {showGameLayer && (
              <div className="border-t border-edge p-5">
                <Suspense
                  fallback={
                    <div className="flex items-center gap-2 text-sm text-content-secondary p-4">
                      <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                      Loading game view...
                    </div>
                  }
                >
                  <OraclePanel
                    playerStatus={oracleData.playerStatus}
                    quests={oracleData.quests}
                    inventory={oracleData.inventory}
                    signalTracker={oracleData.signalTracker}
                    trajectoryStats={oracleData.trajectoryStats}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

class OracleDataBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    // Most common cause: Oracle Convex functions are not deployed on the current backend yet.
    // eslint-disable-next-line no-console
    console.warn("[Oracle] Data unavailable; rendering demo-mode Oracle UI.", err);
  }

  render() {
    if (this.state.hasError) {
      return <OracleViewFallback />;
    }
    return this.props.children;
  }
}

function OracleViewFallback() {
  const [showGameLayer, setShowGameLayer] = useState(false);
  return (
    <OracleViewScaffold
      oracleData={DEMO_ORACLE_DATA}
      showGameLayer={showGameLayer}
      setShowGameLayer={setShowGameLayer}
    />
  );
}

export function OracleView() {
  return (
    <OracleDataBoundary>
      <OracleViewContent />
    </OracleDataBoundary>
  );
}

export default OracleView;
