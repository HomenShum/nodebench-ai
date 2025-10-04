import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Activity, FileText, CheckSquare, Calendar as CalendarIcon, Zap, Database } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TopDividerBar } from "@/components/shared/TopDividerBar";
import { UnifiedHubPills } from "@/components/shared/UnifiedHubPills";
import { PageHeroHeader } from "@/components/shared/PageHeroHeader";
import { PresetChip } from "@/components/shared/PresetChip";
import { SidebarMiniCalendar } from "@/components/shared/SidebarMiniCalendar";
import { SidebarUpcoming } from "@/components/shared/SidebarUpcoming";
import { usePlannerState } from "@/hooks/usePlannerState";

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

  // Fetch analytics data
  const analytics = useQuery(api.analytics.getRoadmapAnalytics, {});

  // Shared planner state for sidebar
  const { handleViewDay, handleViewWeek, upcoming } = usePlannerState();

  // Unified sidebar open/collapsed state (shared key with CalendarHomeHub and DocumentsHomeHub)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem("unifiedSidebar.open") || "true");
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("unifiedSidebar.open", JSON.stringify(sidebarOpen));
    } catch {
      // noop
    }
  }, [sidebarOpen]);

  return (
    <div className="h-full w-full bg-[var(--bg-primary)] overflow-y-auto relative">
      <div className="flex-1 p-8 relative z-10">
        <div className="dashboard-container max-w-7xl mx-auto flex gap-8">
          <div className="flex-1 min-w-0 space-y-6">
            {/* Top Divider Bar and Header */}
            <div id="floating-main-dock" className="">
              <TopDividerBar
                left={
                  <UnifiedHubPills active="roadmap" showRoadmap roadmapDisabled={false} />
                }
              />

              <PageHeroHeader
                icon={"🗺️"}
                title={"Roadmap Hub"}
                date={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                presets={
                  <>
                    <span className="text-xs text-gray-500 mr-2">
                      Presets:
                    </span>

                    <PresetChip>Q4 Goals</PresetChip>

                    <PresetChip>Product Launch</PresetChip>

                    <PresetChip>Team OKRs</PresetChip>
                  </>
                }
              />
            </div>

            {/* Analytics Overview */}
            {analytics === undefined && (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-[var(--text-secondary)]">Loading analytics...</div>
              </div>
            )}
            {analytics && (
              <div className="space-y-6">
                {/* Total Counts Grid */}
                <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    icon={<FileText className="w-4 h-4" />}
                    label="Documents"
                    value={analytics.totals.documents}
                    color="blue"
                  />
                  <StatCard
                    icon={<CheckSquare className="w-4 h-4" />}
                    label="Tasks"
                    value={analytics.totals.tasks}
                    color="purple"
                  />
                  <StatCard
                    icon={<CalendarIcon className="w-4 h-4" />}
                    label="Events"
                    value={analytics.totals.events}
                    color="green"
                  />
                  <StatCard
                    icon={<Zap className="w-4 h-4" />}
                    label="Agent Runs"
                    value={analytics.totals.chatThreads}
                    color="orange"
                  />
                  <StatCard
                    icon={<Activity className="w-4 h-4" />}
                    label="Agent Tasks"
                    value={analytics.totals.agentTasks}
                    color="indigo"
                  />
                  <StatCard
                    icon={<Database className="w-4 h-4" />}
                    label="Files"
                    value={analytics.totals.files}
                    color="teal"
                  />
                  <StatCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Nodes"
                    value={analytics.totals.nodes}
                    color="rose"
                  />
                  <StatCard
                    icon={<Activity className="w-4 h-4" />}
                    label="Timelines"
                    value={analytics.totals.agentTimelines}
                    color="amber"
                  />
                </section>

                {/* Activity Heatmap */}
                <section className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Activity Heatmap (Last 90 Days)</h3>
                  <div className="flex flex-wrap gap-1">
                    {analytics.heatmap.map((day) => {
                      const intensity = Math.min(day.totalActivity / 10, 1); // normalize to 0-1
                      const bgOpacity = Math.max(0.1, intensity);
                      return (
                        <div
                          key={day.date}
                          className="w-3 h-3 rounded-sm border border-[var(--border-color)]"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${bgOpacity})`,
                          }}
                          title={`${day.date}: ${day.totalActivity} activities`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span>Less</span>
                    <div className="flex gap-1">
                      {[0.1, 0.3, 0.5, 0.7, 1].map((opacity) => (
                        <div
                          key={opacity}
                          className="w-3 h-3 rounded-sm border border-[var(--border-color)]"
                          style={{ backgroundColor: `rgba(99, 102, 241, ${opacity})` }}
                        />
                      ))}
                    </div>
                    <span>More</span>
                  </div>
                </section>

                {/* Status Breakdowns */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatusBreakdown
                    title="Tasks by Status"
                    data={[
                      { label: "To Do", value: analytics.byStatus.tasks.todo, color: "bg-gray-500" },
                      { label: "In Progress", value: analytics.byStatus.tasks.in_progress, color: "bg-blue-500" },
                      { label: "Done", value: analytics.byStatus.tasks.done, color: "bg-green-500" },
                      { label: "Blocked", value: analytics.byStatus.tasks.blocked, color: "bg-red-500" },
                    ]}
                  />
                  <StatusBreakdown
                    title="Events by Status"
                    data={[
                      { label: "Confirmed", value: analytics.byStatus.events.confirmed, color: "bg-green-500" },
                      { label: "Tentative", value: analytics.byStatus.events.tentative, color: "bg-yellow-500" },
                      { label: "Cancelled", value: analytics.byStatus.events.cancelled, color: "bg-red-500" },
                    ]}
                  />
                  <StatusBreakdown
                    title="Agent Tasks by Status"
                    data={[
                      { label: "Pending", value: analytics.byStatus.agentTasks.pending, color: "bg-gray-500" },
                      { label: "Running", value: analytics.byStatus.agentTasks.running, color: "bg-blue-500" },
                      { label: "Complete", value: analytics.byStatus.agentTasks.complete, color: "bg-green-500" },
                      { label: "Paused", value: analytics.byStatus.agentTasks.paused, color: "bg-yellow-500" },
                      { label: "Error", value: analytics.byStatus.agentTasks.error, color: "bg-red-500" },
                    ]}
                  />
                </section>

                {/* Top Tags */}
                {analytics.topTags.length > 0 && (
                  <section className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Top Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {analytics.topTags.map((tag) => (
                        <span
                          key={tag.name}
                          className="px-2 py-1 text-xs rounded-md border bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]"
                        >
                          {tag.name} · {tag.count}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Roadmap Content */}
            <div className="space-y-6">
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
          </div>

          {/* Sidebar column */}
          <aside className={`${sidebarOpen ? "w-[320px] md:w-[360px] p-3" : "w-[18px] p-0"} shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-primary)] relative z-20`}>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="absolute -left-2 top-3 w-4 h-6 rounded-sm border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] flex items-center justify-center shadow-sm"
            >
              {sidebarOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
            {sidebarOpen && (
              <div className="space-y-4">
                <SidebarMiniCalendar
                  onSelectDate={(ms) => handleViewWeek(ms)}
                  onViewDay={(ms) => handleViewDay(ms)}
                  onViewWeek={(ms) => handleViewWeek(ms)}
                  showViewFullCalendarLink
                />
                <SidebarUpcoming upcoming={upcoming} />
              </div>
            )}
          </aside>
        </div>
      </div>
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

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-500/10",
    purple: "text-purple-600 bg-purple-500/10",
    green: "text-green-600 bg-green-500/10",
    orange: "text-orange-600 bg-orange-500/10",
    indigo: "text-indigo-600 bg-indigo-500/10",
    teal: "text-teal-600 bg-teal-500/10",
    rose: "text-rose-600 bg-rose-500/10",
    amber: "text-amber-600 bg-amber-500/10",
  };

  const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-md ${colorClass}`}>
          {icon}
        </div>
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)]">{value.toLocaleString()}</div>
    </div>
  );
}

function StatusBreakdown({ title, data }: { title: string; data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{title}</h3>
      <div className="space-y-2">
        {data.map((item) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[var(--text-secondary)]">{item.label}</span>
                <span className="text-[var(--text-primary)] font-medium">{item.value} ({percent}%)</span>
              </div>
              <div className="h-1.5 w-full rounded bg-[var(--bg-primary)] overflow-hidden">
                <div className={`h-full ${item.color}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}





