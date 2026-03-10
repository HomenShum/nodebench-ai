/**
 * PlayerStatus — Solo Leveling style player status panel
 *
 * Displays:
 * - Current class and target awakened class
 * - EXP progress bar with level
 * - Active debuffs with dispel conditions
 * - Historical clear time for class advancement
 */

import { memo, useMemo } from "react";
import type {
  PlayerStatus as PlayerStatusType,
  Debuff,
  PlayerClass,
} from "../types";
import { getClassDisplayName, EXP_RULES } from "../types";

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface ExpBarProps {
  current: number;
  max: number;
  level: number;
}

const ExpBar = memo(function ExpBar({ current, max, level }: ExpBarProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  return (
    <div className="relative">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
        <span>LVL {level}</span>
        <span>
          {current.toLocaleString()} / {max.toLocaleString()} EXP
        </span>
      </div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[10px] font-bold text-white drop-shadow-lg mt-4">
          {percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
});

interface DebuffBadgeProps {
  debuff: Debuff;
}

const DebuffBadge = memo(function DebuffBadge({ debuff }: DebuffBadgeProps) {
  return (
    <div
      className={`
        relative p-3 rounded-lg border transition-all duration-200
        ${
          debuff.isPsychological
            ? "bg-red-950/30 border-red-800/50 hover:border-red-600"
            : "bg-amber-950/30 border-amber-800/50 hover:border-amber-600"
        }
      `}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">
          {debuff.isPsychological ? "🧠" : "⚡"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${
                debuff.isPsychological ? "text-red-400" : "text-amber-400"
              }`}
            >
              {debuff.name}
            </span>
            {debuff.canBeDispelled && (
              <span className="text-[10px] px-1.5 py-0.5 bg-green-900/50 text-green-400 rounded">
                DISPELLABLE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">{debuff.description}</p>
          <ul className="mt-2 space-y-1">
            {debuff.effects.map((effect, i) => (
              <li key={i} className="text-xs text-slate-500 flex items-start gap-1">
                <span className="text-red-500">↓</span>
                {effect}
              </li>
            ))}
          </ul>
          {debuff.dispelCondition && (
            <div className="mt-2 text-xs text-green-500/80 flex items-start gap-1">
              <span>🔓</span>
              <span>Dispel: {debuff.dispelCondition}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

interface ClassBadgeProps {
  playerClass: PlayerClass;
  variant: "current" | "target";
}

const ClassBadge = memo(function ClassBadge({ playerClass, variant }: ClassBadgeProps) {
  const displayName = getClassDisplayName(playerClass);
  const isCurrent = variant === "current";

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border
        ${
          isCurrent
            ? "bg-slate-800/50 border-slate-700"
            : "bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-700/50"
        }
      `}
    >
      <span className="text-lg">{isCurrent ? "👤" : "⭐"}</span>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500">
          {isCurrent ? "Current Class" : "Target Awakened Class"}
        </div>
        <div
          className={`text-sm font-semibold ${
            isCurrent ? "text-slate-300" : "text-purple-300"
          }`}
        >
          [{displayName}]
        </div>
      </div>
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

interface PlayerStatusProps {
  status: PlayerStatusType;
  className?: string;
}

export const PlayerStatus = memo(function PlayerStatus({
  status,
  className = "",
}: PlayerStatusProps) {
  const hasDebuffs = status.activeDebuffs.length > 0;

  // Calculate EXP needed for target class
  const targetClassExp = EXP_RULES.classEvolutionExp[status.targetClass];
  const currentClassExp = EXP_RULES.classEvolutionExp[status.currentClass];
  const totalExpNeeded = targetClassExp - currentClassExp;
  const progressToTarget = status.currentExp - currentClassExp;
  const progressPercentage = totalExpNeeded > 0
    ? Math.min((progressToTarget / totalExpNeeded) * 100, 100)
    : 0;

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border border-slate-700/50
        bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800
        ${className}
      `}
    >
      {/* Header glow effect */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

      {/* System Alert Header */}
      <div className="relative px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-mono text-blue-400 tracking-wider">
            SYSTEM ALERT: CLASS ADVANCEMENT AVAILABLE
          </span>
        </div>
      </div>

      {/* Player Status Content */}
      <div className="relative p-4 space-y-4">
        {/* Player Name & Avatar */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl">
            {status.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{status.displayName}</h2>
            <div className="text-xs text-slate-400">
              Player ID: {status.playerId.slice(0, 8)}...
            </div>
          </div>
        </div>

        {/* Class Badges */}
        <div className="grid grid-cols-2 gap-2">
          <ClassBadge playerClass={status.currentClass} variant="current" />
          <ClassBadge playerClass={status.targetClass} variant="target" />
        </div>

        {/* EXP Progress */}
        <div>
          <ExpBar
            current={status.currentExp}
            max={status.expToNextLevel}
            level={status.level}
          />
        </div>

        {/* Class Evolution Progress */}
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400">Class Evolution Progress</span>
            <span className="text-purple-400 font-medium">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {status.historicalClearTime && (
            <div className="mt-2 text-[10px] text-slate-500">
              Historical Clear Time: {status.historicalClearTime}
            </div>
          )}
        </div>

        {/* Active Debuffs */}
        {hasDebuffs && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-red-400 uppercase tracking-wider flex items-center gap-2">
              <span>⚠️</span>
              Active Debuffs ({status.activeDebuffs.length})
            </h3>
            <div className="space-y-2">
              {status.activeDebuffs.map((debuff) => (
                <DebuffBadge key={debuff.id} debuff={debuff} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>Last updated: {new Date(status.updatedAt).toLocaleString()}</span>
          <span className="text-blue-400">ORACLE v0.1.0</span>
        </div>
      </div>
    </div>
  );
});

export default PlayerStatus;
