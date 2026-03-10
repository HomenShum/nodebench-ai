/**
 * QuestLog — Solo Leveling style quest tracking panel
 *
 * Displays:
 * - Main Scenario quests (time-sensitive, high reward)
 * - Daily quests (streak tracking)
 * - Side quests (optional, skill unlocks)
 * - Quest dependencies and unlock chains
 */

import { memo, useMemo, useState } from "react";
import type { Quest, QuestType, QuestStatus, QuestReward, QuestEvidence } from "../types";
import { getQuestTypeEmoji } from "../types";

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface RewardBadgesProps {
  reward: QuestReward;
  streakBonus?: QuestReward;
}

const RewardBadges = memo(function RewardBadges({ reward, streakBonus }: RewardBadgesProps) {
  const badges: Array<{ label: string; value: string; color: string }> = [];

  if (reward.exp > 0) {
    badges.push({ label: "EXP", value: `+${reward.exp.toLocaleString()}`, color: "text-blue-400" });
  }
  if (reward.visibility) {
    badges.push({ label: "VIS", value: `+${reward.visibility}`, color: "text-purple-400" });
  }
  if (reward.skillUnlock) {
    badges.push({ label: "SKILL", value: reward.skillUnlock, color: "text-green-400" });
  }
  if (reward.debuffDispel) {
    badges.push({ label: "DISPEL", value: reward.debuffDispel, color: "text-yellow-400" });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge, i) => (
        <span
          key={i}
          className={`
            inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
            bg-slate-800 border border-slate-700
          `}
        >
          <span className="text-slate-500">{badge.label}:</span>
          <span className={badge.color}>{badge.value}</span>
        </span>
      ))}
      {streakBonus && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-900/30 border border-orange-700/50 text-orange-400">
          <span>🔥</span>
          Streak: +{streakBonus.exp} EXP
        </span>
      )}
    </div>
  );
});

interface QuestStatusBadgeProps {
  status: QuestStatus;
}

const QuestStatusBadge = memo(function QuestStatusBadge({ status }: QuestStatusBadgeProps) {
  const config: Record<QuestStatus, { bg: string; text: string; label: string }> = {
    locked: { bg: "bg-slate-800", text: "text-slate-500", label: "LOCKED" },
    available: { bg: "bg-green-900/30", text: "text-green-400", label: "AVAILABLE" },
    in_progress: { bg: "bg-blue-900/30", text: "text-blue-400", label: "IN PROGRESS" },
    completed: { bg: "bg-purple-900/30", text: "text-purple-400", label: "COMPLETED" },
    failed: { bg: "bg-red-900/30", text: "text-red-400", label: "FAILED" },
    expired: { bg: "bg-amber-900/30", text: "text-amber-400", label: "EXPIRED" },
  };

  const { bg, text, label } = config[status];

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
});

interface QuestCardProps {
  quest: Quest;
  isExpanded: boolean;
  onToggle: () => void;
}

const QuestCard = memo(function QuestCard({ quest, isExpanded, onToggle }: QuestCardProps) {
  const emoji = getQuestTypeEmoji(quest.type);
  const isActive = quest.status === "available" || quest.status === "in_progress";
  const isCompleted = quest.status === "completed";

  const typeLabel: Record<QuestType, string> = {
    main_scenario: "MAIN SCENARIO",
    daily: "DAILY QUEST",
    side: "SIDE QUEST",
    weekly: "WEEKLY QUEST",
    achievement: "ACHIEVEMENT",
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border transition-all duration-200
        ${
          isCompleted
            ? "bg-slate-800/30 border-slate-700/30 opacity-75"
            : isActive
              ? "bg-gradient-to-r from-slate-800/50 to-slate-800/30 border-slate-600 hover:border-slate-500"
              : "bg-slate-800/20 border-slate-700/50"
        }
      `}
    >
      {/* Quest Type Banner */}
      <div
        className={`
          px-3 py-1.5 border-b flex items-center justify-between
          ${quest.type === "main_scenario" ? "bg-gradient-to-r from-orange-900/30 to-transparent border-orange-800/30" : "border-slate-700/50"}
        `}
      >
        <span
          className={`text-[10px] font-medium tracking-wider ${
            quest.type === "main_scenario" ? "text-orange-400" : "text-slate-400"
          }`}
        >
          {emoji} {typeLabel[quest.type]}
          {quest.timeWindow && (
            <span className="ml-2 text-slate-500">(Time-Sensitive)</span>
          )}
        </span>
        <QuestStatusBadge status={quest.status} />
      </div>

      {/* Quest Content */}
      <button
        onClick={onToggle}
        className="w-full text-left p-3 focus:outline-none focus:ring-1 focus:ring-blue-500/50 rounded-b-lg"
      >
        <h4 className="text-sm font-medium text-white flex items-center gap-2">
          {quest.title}
          {quest.streakDay && quest.streakDay > 1 && (
            <span className="text-orange-400 text-xs">
              🔥 Day {quest.streakDay}
            </span>
          )}
        </h4>

        {isExpanded && (
          <div className="mt-3 space-y-3 animate-fadeIn">
            {/* Objective */}
            <div className="text-xs text-slate-300 flex items-start gap-2">
              <span className="text-slate-500 shrink-0">├─</span>
              <div>
                <span className="text-slate-500">Objective:</span>{" "}
                {quest.objective}
              </div>
            </div>

            {/* Trigger Condition */}
            {quest.triggerCondition && (
              <div className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-slate-500 shrink-0">├─</span>
                <div>
                  <span className="text-slate-500">Trigger:</span>{" "}
                  {quest.triggerCondition}
                </div>
              </div>
            )}

            {/* Time Window */}
            {quest.timeWindow && (
              <div className="text-xs text-amber-400/80 flex items-start gap-2">
                <span className="text-slate-500 shrink-0">├─</span>
                <div>
                  <span className="text-slate-500">Time Window:</span>{" "}
                  {quest.timeWindow}
                </div>
              </div>
            )}

            {/* Rewards */}
            <div className="text-xs flex items-start gap-2">
              <span className="text-slate-500 shrink-0">└─</span>
              <div>
                <span className="text-slate-500 block mb-1">Reward:</span>
                <RewardBadges reward={quest.reward} streakBonus={quest.streakBonus} />
              </div>
            </div>

            {/* Evidence (if completed) */}
            {quest.evidence && quest.evidence.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-700/50">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Evidence ({quest.evidence.length})
                </span>
                <div className="mt-1 space-y-1">
                  {quest.evidence.map((ev, i) => (
                    <EvidenceItem key={i} evidence={ev} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isExpanded && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-1">
            {quest.description}
          </p>
        )}
      </button>
    </div>
  );
});

interface EvidenceItemProps {
  evidence: QuestEvidence;
}

const EvidenceItem = memo(function EvidenceItem({ evidence }: EvidenceItemProps) {
  const typeIcons: Record<QuestEvidence["type"], string> = {
    commit: "💾",
    document: "📄",
    conversation: "💬",
    standup: "🎤",
    artifact: "🔧",
    external_link: "🔗",
  };

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span>{typeIcons[evidence.type]}</span>
      {evidence.url ? (
        <a
          href={evidence.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline truncate"
        >
          {evidence.title}
        </a>
      ) : (
        <span className="truncate">{evidence.title}</span>
      )}
      <span className="text-slate-600 text-[10px] shrink-0">
        {new Date(evidence.timestamp).toLocaleDateString()}
      </span>
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

interface QuestLogProps {
  quests: Quest[];
  className?: string;
}

export const QuestLog = memo(function QuestLog({
  quests,
  className = "",
}: QuestLogProps) {
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set());

  const toggleQuest = (questId: string) => {
    setExpandedQuests((prev) => {
      const next = new Set(prev);
      if (next.has(questId)) {
        next.delete(questId);
      } else {
        next.add(questId);
      }
      return next;
    });
  };

  // Group quests by type
  const groupedQuests = useMemo(() => {
    const groups: Record<QuestType, Quest[]> = {
      main_scenario: [],
      daily: [],
      weekly: [],
      side: [],
      achievement: [],
    };

    for (const quest of quests) {
      groups[quest.type].push(quest);
    }

    // Sort each group: in_progress first, then available, then others
    const statusOrder: Record<QuestStatus, number> = {
      in_progress: 0,
      available: 1,
      locked: 2,
      completed: 3,
      failed: 4,
      expired: 5,
    };

    for (const type of Object.keys(groups) as QuestType[]) {
      groups[type].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }

    return groups;
  }, [quests]);

  const activeQuestCount = quests.filter(
    (q) => q.status === "in_progress" || q.status === "available"
  ).length;

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border border-slate-700/50
        bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800
        ${className}
      `}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📜</span>
          <h3 className="text-sm font-medium text-white">
            ACTIVE QUESTS: THE ARCHITECT&apos;S PATH
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          {activeQuestCount} active
        </span>
      </div>

      {/* Quest Sections */}
      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {/* Main Scenarios */}
        {groupedQuests.main_scenario.length > 0 && (
          <QuestSection
            title="Main Scenarios"
            quests={groupedQuests.main_scenario}
            expandedQuests={expandedQuests}
            onToggle={toggleQuest}
          />
        )}

        {/* Daily Quests */}
        {groupedQuests.daily.length > 0 && (
          <QuestSection
            title="Daily Quests"
            quests={groupedQuests.daily}
            expandedQuests={expandedQuests}
            onToggle={toggleQuest}
          />
        )}

        {/* Weekly Quests */}
        {groupedQuests.weekly.length > 0 && (
          <QuestSection
            title="Weekly Quests"
            quests={groupedQuests.weekly}
            expandedQuests={expandedQuests}
            onToggle={toggleQuest}
          />
        )}

        {/* Side Quests */}
        {groupedQuests.side.length > 0 && (
          <QuestSection
            title="Side Quests"
            quests={groupedQuests.side}
            expandedQuests={expandedQuests}
            onToggle={toggleQuest}
          />
        )}

        {/* Achievements */}
        {groupedQuests.achievement.length > 0 && (
          <QuestSection
            title="Achievements"
            quests={groupedQuests.achievement}
            expandedQuests={expandedQuests}
            onToggle={toggleQuest}
          />
        )}

        {/* Empty State */}
        {quests.length === 0 && (
          <div className="text-center py-8">
            <span className="text-4xl mb-2 block">📭</span>
            <p className="text-sm text-slate-400">No quests available</p>
            <p className="text-xs text-slate-500 mt-1">
              Complete onboarding to unlock your first quest
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

interface QuestSectionProps {
  title: string;
  quests: Quest[];
  expandedQuests: Set<string>;
  onToggle: (questId: string) => void;
}

const QuestSection = memo(function QuestSection({
  title,
  quests,
  expandedQuests,
  onToggle,
}: QuestSectionProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {title}
      </h4>
      <div className="space-y-2">
        {quests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            isExpanded={expandedQuests.has(quest.id)}
            onToggle={() => onToggle(quest.id)}
          />
        ))}
      </div>
    </div>
  );
});

export default QuestLog;
