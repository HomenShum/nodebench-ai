/**
 * OraclePanel — Main container for the Solo Leveling style career Oracle
 *
 * Integrates:
 * - PlayerStatus (class, level, debuffs)
 * - QuestLog (main/daily/side quests)
 * - Inventory (drop requirements)
 * - SignalTracker (game theory timing)
 * - TrajectoryStats (EXP telemetry)
 */

import { memo, useState } from "react";
import { PlayerStatus } from "./PlayerStatus";
import { QuestLog } from "./QuestLog";
import type {
  PlayerStatus as PlayerStatusType,
  Quest,
  Inventory,
  SignalTracker,
  TrajectoryStats,
  DropRequirement,
  TemporalSignal,
} from "../types";
import { getSignalTypeEmoji } from "../types";

// ─── Inventory Component ──────────────────────────────────────────────────────

interface InventoryPanelProps {
  inventory: Inventory;
}

const InventoryPanel = memo(function InventoryPanel({ inventory }: InventoryPanelProps) {
  const statusIcons = {
    not_acquired: "[ ]",
    in_progress: "[~]",
    acquired: "[✓]",
  };

  const statusColors = {
    not_acquired: "text-slate-500",
    in_progress: "text-amber-400",
    acquired: "text-green-400",
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎒</span>
          <h3 className="text-sm font-medium text-white">
            REQUIRED ITEMS FOR CLASS EVOLUTION
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          {inventory.completedItems}/{inventory.totalItems}
        </span>
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        {inventory.dropRequirements.map((item, index) => (
          <DropRequirementItem key={item.id} item={item} index={index + 1} />
        ))}

        {/* Evolution Ready Message */}
        {inventory.readyForClassEvolution && (
          <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/50">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <div>
                <div className="text-sm font-medium text-purple-300">
                  CLASS EVOLUTION AVAILABLE
                </div>
                <div className="text-xs text-slate-400">
                  All required items acquired. Ready to advance.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

interface DropRequirementItemProps {
  item: DropRequirement;
  index: number;
}

const DropRequirementItem = memo(function DropRequirementItem({
  item,
  index,
}: DropRequirementItemProps) {
  const statusIcon = {
    not_acquired: "[ ]",
    in_progress: "[~]",
    acquired: "[✓]",
  }[item.status];

  const statusColor = {
    not_acquired: "text-slate-500",
    in_progress: "text-amber-400",
    acquired: "text-green-400",
  }[item.status];

  return (
    <div
      className={`
        p-3 rounded-lg border transition-all
        ${
          item.status === "acquired"
            ? "bg-green-900/10 border-green-800/30"
            : item.status === "in_progress"
              ? "bg-amber-900/10 border-amber-800/30"
              : "bg-slate-800/30 border-slate-700/50"
        }
      `}
    >
      <div className="flex items-start gap-3">
        <span className={`font-mono text-sm ${statusColor}`}>{statusIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              Item {index}: {item.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{item.description}</p>
          {item.options && item.options.length > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              └─ Options: {item.options.join(", ")}
            </div>
          )}
          {item.evidence && item.evidence.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
              <span>✓</span>
              <span>{item.evidence.length} evidence item(s)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Signal Tracker Component ─────────────────────────────────────────────────

interface SignalTrackerPanelProps {
  tracker: SignalTracker;
}

const SignalTrackerPanel = memo(function SignalTrackerPanel({
  tracker,
}: SignalTrackerPanelProps) {
  const activeCount = tracker.activeSignals.filter(
    (s) => !s.expiresAt || new Date(s.expiresAt) > new Date()
  ).length;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📡</span>
            <h3 className="text-sm font-medium text-white">
              TEMPORAL SIGNAL TRACKER
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {activeCount}/{tracker.signalThreshold} signals
            </span>
            {tracker.windowOpen && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-900/30 text-green-400 animate-pulse">
                WINDOW OPEN
              </span>
            )}
          </div>
        </div>

        {/* Signal threshold bar */}
        <div className="mt-2">
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                tracker.windowOpen
                  ? "bg-gradient-to-r from-green-500 to-emerald-400"
                  : "bg-gradient-to-r from-amber-500 to-orange-400"
              }`}
              style={{
                width: `${Math.min((activeCount / tracker.signalThreshold) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Signals */}
      <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
        {tracker.activeSignals.length > 0 ? (
          tracker.activeSignals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))
        ) : (
          <div className="text-center py-6">
            <span className="text-3xl mb-2 block">🔭</span>
            <p className="text-sm text-slate-400">No signals detected</p>
            <p className="text-xs text-slate-500 mt-1">
              Monitoring for trigger events...
            </p>
          </div>
        )}

        {/* Window Message */}
        {tracker.windowOpen && tracker.windowMessage && (
          <div className="mt-3 p-3 rounded-lg bg-green-900/20 border border-green-700/50">
            <div className="text-xs text-green-400">{tracker.windowMessage}</div>
          </div>
        )}
      </div>
    </div>
  );
});

interface SignalCardProps {
  signal: TemporalSignal;
}

const SignalCard = memo(function SignalCard({ signal }: SignalCardProps) {
  const emoji = getSignalTypeEmoji(signal.type);
  const isExpired = signal.expiresAt && new Date(signal.expiresAt) < new Date();

  return (
    <div
      className={`
        p-3 rounded-lg border transition-all
        ${
          isExpired
            ? "bg-slate-800/20 border-slate-700/30 opacity-50"
            : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
        }
      `}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">{signal.title}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                signal.confidence >= 80
                  ? "bg-green-900/30 text-green-400"
                  : signal.confidence >= 50
                    ? "bg-amber-900/30 text-amber-400"
                    : "bg-slate-700 text-slate-400"
              }`}
            >
              {signal.confidence}% conf
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            {signal.description}
          </p>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
            <span>⏱️ {signal.actionWindow}</span>
            <span>📅 {new Date(signal.detectedAt).toLocaleDateString()}</span>
          </div>
          {signal.suggestedAction && (
            <div className="mt-2 text-xs text-blue-400/80">
              💡 {signal.suggestedAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Trajectory Stats Component ───────────────────────────────────────────────

interface TrajectoryStatsPanelProps {
  stats: TrajectoryStats;
}

const TrajectoryStatsPanel = memo(function TrajectoryStatsPanel({
  stats,
}: TrajectoryStatsPanelProps) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="text-sm font-medium text-white">TRAJECTORY TELEMETRY</h3>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <StatCard
          label="Total EXP"
          value={stats.totalExp.toLocaleString()}
          icon="⚡"
        />
        <StatCard
          label="Current Streak"
          value={`${stats.currentStreak} days`}
          icon="🔥"
          highlight={stats.currentStreak >= 5}
        />
        <StatCard
          label="Today's Events"
          value={stats.eventsToday.toString()}
          icon="📝"
        />
        <StatCard
          label="Longest Streak"
          value={`${stats.longestStreak} days`}
          icon="🏆"
        />
      </div>

      {/* Weekly Trend */}
      <div className="px-4 pb-4">
        <div className="text-xs text-slate-500 mb-2">Last 7 Days</div>
        <div className="flex items-end gap-1 h-12">
          {stats.weeklyTrend.map((exp, i) => {
            const maxExp = Math.max(...stats.weeklyTrend, 1);
            const height = (exp / maxExp) * 100;
            return (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-blue-600 to-purple-500 rounded-t transition-all"
                style={{ height: `${Math.max(height, 5)}%` }}
                title={`${exp} EXP`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-600">
          <span>7d ago</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
});

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}

const StatCard = memo(function StatCard({
  label,
  value,
  icon,
  highlight = false,
}: StatCardProps) {
  return (
    <div
      className={`
        p-3 rounded-lg border
        ${
          highlight
            ? "bg-gradient-to-r from-orange-900/20 to-amber-900/20 border-orange-700/30"
            : "bg-slate-800/30 border-slate-700/50"
        }
      `}
    >
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <div>
          <div className="text-[10px] text-slate-500 uppercase">{label}</div>
          <div
            className={`text-sm font-semibold ${
              highlight ? "text-orange-300" : "text-white"
            }`}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── Main Oracle Panel ────────────────────────────────────────────────────────

export interface OraclePanelProps {
  playerStatus: PlayerStatusType;
  quests: Quest[];
  inventory: Inventory;
  signalTracker: SignalTracker;
  trajectoryStats: TrajectoryStats;
  className?: string;
}

type TabId = "quests" | "inventory" | "signals" | "stats";

export const OraclePanel = memo(function OraclePanel({
  playerStatus,
  quests,
  inventory,
  signalTracker,
  trajectoryStats,
  className = "",
}: OraclePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("quests");

  const tabs: Array<{ id: TabId; label: string; icon: string }> = [
    { id: "quests", label: "Quests", icon: "📜" },
    { id: "inventory", label: "Inventory", icon: "🎒" },
    { id: "signals", label: "Signals", icon: "📡" },
    { id: "stats", label: "Stats", icon: "📊" },
  ];

  return (
    <div className={`flex flex-col lg:flex-row gap-4 ${className}`}>
      {/* Left Column: Player Status (always visible) */}
      <div className="lg:w-80 shrink-0">
        <PlayerStatus status={playerStatus} />
      </div>

      {/* Right Column: Tabbed Content */}
      <div className="flex-1 min-w-0">
        {/* Tab Bar */}
        <div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-slate-800/50 border border-slate-700/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all
                ${
                  activeTab === tab.id
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }
              `}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fadeIn">
          {activeTab === "quests" && <QuestLog quests={quests} />}
          {activeTab === "inventory" && <InventoryPanel inventory={inventory} />}
          {activeTab === "signals" && <SignalTrackerPanel tracker={signalTracker} />}
          {activeTab === "stats" && <TrajectoryStatsPanel stats={trajectoryStats} />}
        </div>
      </div>
    </div>
  );
});

export default OraclePanel;
