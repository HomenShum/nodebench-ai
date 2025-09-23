import React, { useMemo } from "react";
import { TopDividerBar } from "@/components/shared/TopDividerBar";
import { UnifiedHubPills } from "@/components/shared/UnifiedHubPills";

export type RoadmapSlice = {
  period: "week" | "month" | "quarter" | "year";
  label: string; // e.g. "This Week", "September 2025"
  totalTasks: number;
  completed: number;
  inProgress: number;
  blocked: number;
  domains: Array<{ name: string; count: number }>;
};

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function useMockRoadmap(): Array<RoadmapSlice> {
  return useMemo(
    () => [
      {
        period: "week",
        label: "This Week",
        totalTasks: 18,
        completed: 9,
        inProgress: 6,
        blocked: 3,
        domains: [
          { name: "Health", count: 5 },
          { name: "Work:Docs", count: 4 },
          { name: "Home", count: 3 },
          { name: "Finance", count: 2 },
          { name: "Learning", count: 4 },
        ],
      },
      {
        period: "month",
        label: "September 2025",
        totalTasks: 73,
        completed: 40,
        inProgress: 26,
        blocked: 7,
        domains: [
          { name: "Work:Docs", count: 22 },
          { name: "Health", count: 15 },
          { name: "Home", count: 12 },
          { name: "Relationships", count: 9 },
          { name: "Learning", count: 15 },
        ],
      },
      {
        period: "quarter",
        label: "Q3 2025",
        totalTasks: 210,
        completed: 129,
        inProgress: 58,
        blocked: 23,
        domains: [
          { name: "Work:Projects", count: 86 },
          { name: "Health", count: 41 },
          { name: "Learning", count: 36 },
          { name: "Home", count: 27 },
          { name: "Finance", count: 20 },
        ],
      },
      {
        period: "year",
        label: "2025",
        totalTasks: 820,
        completed: 530,
        inProgress: 210,
        blocked: 80,
        domains: [
          { name: "Work:Projects", count: 300 },
          { name: "Health", count: 150 },
          { name: "Learning", count: 140 },
          { name: "Home", count: 120 },
          { name: "Finance", count: 110 },
        ],
      },
    ],
    [],
  );
}

export function TimelineRoadmapView({ slices }: { slices?: Array<RoadmapSlice> }) {
  const data = slices ?? useMockRoadmap();

  return (
    <div className="space-y-6">
      <TopDividerBar
        left={
          <UnifiedHubPills active="roadmap" showRoadmap roadmapDisabled={false} />
        }
      />
      {data.map((s, i) => (
        <section
          key={`${s.period}:${i}`}
          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
        >
          <header className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {s.label}
            </h3>
            <span className="text-xs text-[var(--text-secondary)]">
              {s.totalTasks} tasks
            </span>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <SliceStat label="Completed" value={s.completed} total={s.totalTasks} color="emerald" />
            <SliceStat label="In progress" value={s.inProgress} total={s.totalTasks} color="indigo" />
            <SliceStat label="Blocked" value={s.blocked} total={s.totalTasks} color="rose" />
            <div className="rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
              <div className="text-xs font-medium mb-2 text-[var(--text-primary)]">Top domains</div>
              <div className="flex flex-wrap gap-1">
                {s.domains.map((d) => (
                  <span
                    key={d.name}
                    className="text-[10px] px-1.5 py-0.5 rounded-md border bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]"
                  >
                    {d.name} · {d.count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function SliceStat({ label, value, total, color }: { label: string; value: number; total: number; color: "emerald" | "indigo" | "rose" }) {
  const percent = pct(value, total);
  const bar = color === "emerald" ? "bg-emerald-500" : color === "indigo" ? "bg-indigo-500" : "bg-rose-500";
  const tint = color === "emerald" ? "bg-emerald-500/10" : color === "indigo" ? "bg-indigo-500/10" : "bg-rose-500/10";
  const text = color === "emerald" ? "text-emerald-600" : color === "indigo" ? "text-indigo-600" : "text-rose-600";

  return (
    <div className="rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
      <div className="text-xs font-medium mb-1 text-[var(--text-primary)]">{label}</div>
      <div className={`h-1.5 w-full rounded ${tint} overflow-hidden mb-1`}>
        <div className={`h-full ${bar}`} style={{ width: `${percent}%` }} />
      </div>
      <div className={`text-[10px] ${text}`}>{value} · {percent}%</div>
    </div>
  );
}





