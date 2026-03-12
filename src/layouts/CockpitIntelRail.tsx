import { memo, type ReactNode, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { Activity, GitBranch, Shield, Sparkles, TrendingUp } from "lucide-react";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { api } from "../../convex/_generated/api";
import { VIEW_PATH_MAP, VIEW_TITLES } from "./cockpitModes";
import type { MainView } from "../hooks/useMainLayoutRouting";

interface CockpitIntelRailProps {
  currentView: MainView;
  agentOpen?: boolean;
  compact?: boolean;
}

type IntelRow = {
  label: string;
  detail: string;
  targetView?: MainView;
};

type LatestMemorySummary = {
  generatedAt?: number;
  dateString?: string;
} | null | undefined;

type SystemHealthSummary = {
  overall?: string;
  activeAlerts?: number;
} | null | undefined;

export const CockpitIntelRail = memo(function CockpitIntelRail({
  currentView,
  agentOpen = false,
  compact = false,
}: CockpitIntelRailProps) {
  const navigate = useNavigate();
  const dashboardSnapshot = useQuery(api.domains.research.dashboardQueries.getLatestDashboardSnapshot);
  const dealFlow = useQuery(api.domains.research.dealFlowQueries.getDealFlow);
  const trendingRepos = useQuery(api.domains.research.githubExplorer.getTrendingRepos, { limit: 3 });
  const latestMemory = useQuery(api.domains.research.dailyBriefMemoryQueries.getLatestMemory);
  const systemHealth = useQuery(api.domains.observability.healthMonitor.getSystemHealth);

  const isDashboardLoading = dashboardSnapshot === undefined;
  const isDealLoading = dealFlow === undefined;
  const isRepoLoading = trendingRepos === undefined;
  const isBriefLoading = latestMemory === undefined;
  const isHealthLoading = systemHealth === undefined;

  const deals = Array.isArray(dealFlow) ? dealFlow : [];
  const repos = Array.isArray(trendingRepos) ? trendingRepos : [];
  const sourceCount = useMemo(
    () => summarizeSourceCount(dashboardSnapshot?.sourceSummary),
    [dashboardSnapshot?.sourceSummary],
  );
  const topStat = dashboardSnapshot?.dashboardMetrics?.keyStats?.[0];
  const title = VIEW_TITLES[currentView] ?? currentView;

  const capitalRows = useMemo<IntelRow[]>(
    () => deals.slice(0, 3).map((deal) => toDealRow(deal, "funding")),
    [deals],
  );
  const repoRows = useMemo<IntelRow[]>(
    () => repos.slice(0, 3).map((repo) => toRepoRow(repo, "github-explorer")),
    [repos],
  );

  const openView = (view: MainView) => {
    navigate(VIEW_PATH_MAP[view] ?? `/${view}`);
  };

  if (compact) {
    return (
      <div className="lg:hidden border-b border-[var(--hud-border)] bg-[rgba(8,12,22,0.74)] px-2 py-2 backdrop-blur-xl">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" data-agent-id="cockpit:intel-shelf">
          <ShelfCard
            label="Capital"
            value={isDealLoading ? "Syncing" : deals.length ? `${deals.length} live` : "Quiet"}
            detail={capitalRows[0]?.detail ?? "Funding lane"}
            icon={<TrendingUp className="h-4 w-4" />}
            onClick={() => openView("funding")}
          />
          <ShelfCard
            label="GitHub"
            value={isRepoLoading ? "Syncing" : repos.length ? `${repos.length} tracked` : "Quiet"}
            detail={repoRows[0]?.label ?? "Repo lane"}
            icon={<GitBranch className="h-4 w-4" />}
            onClick={() => openView("github-explorer")}
          />
          <ShelfCard
            label="Briefing"
            value={isBriefLoading ? "Syncing" : latestMemory?.dateString ?? "Pending"}
            detail={latestMemory?.generatedAt ? formatRelativeTime(latestMemory.generatedAt) : "Memory lane"}
            icon={<Sparkles className="h-4 w-4" />}
            onClick={() => openView("research")}
          />
          <ShelfCard
            label="Health"
            value={isHealthLoading ? "Syncing" : capitalize(systemHealth?.overall ?? "monitoring")}
            detail={systemHealth ? `${systemHealth.activeAlerts} alerts` : "System lane"}
            icon={<Shield className="h-4 w-4" />}
            onClick={() => openView("observability")}
          />
        </div>
      </div>
    );
  }

  const desktopClassName = agentOpen
    ? "hidden 2xl:flex 2xl:w-[292px]"
    : "hidden lg:flex lg:w-[280px] xl:w-[320px]";

  return (
    <aside
      className={`${desktopClassName} shrink-0 border-l border-[var(--hud-border)] bg-[rgba(8,12,22,0.82)] backdrop-blur-xl`}
      aria-label="Live intelligence rail"
      data-agent-id="cockpit:intel-rail"
    >
      <div className="flex h-full w-full flex-col gap-3 overflow-y-auto px-3 py-3">
        <section className="rounded-2xl border border-[var(--hud-border)] bg-[rgba(15,23,42,0.52)] px-3 py-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--hud-text-dim)]">Operating picture</div>
          <div className="mt-2 text-sm font-semibold text-[var(--hud-text)]">{title}</div>
          <div className="mt-1 text-xs leading-5 text-[var(--hud-text-dim)]">
            The cockpit should keep finance, engineering, briefings, and uptime visible while you work inside any mode.
          </div>
          <div className="mt-3 space-y-2">
            <RailMetric
              label="Sources watched"
              value={isDashboardLoading ? "Syncing" : formatCompactCount(sourceCount)}
              targetView="research"
              onOpen={openView}
            />
            <RailMetric
              label="Top stat"
              value={isDashboardLoading ? "Syncing" : topStat?.value ?? "No data"}
              detail={isDashboardLoading ? "Loading dashboard snapshot..." : topStat?.label ?? "No dashboard stat loaded"}
              targetView="research"
              onOpen={openView}
            />
            <RailMetric
              label="System health"
              value={isHealthLoading ? "Syncing" : capitalize(systemHealth?.overall ?? "monitoring")}
              detail={isHealthLoading ? "Loading health checks..." : systemHealth ? `${systemHealth.activeAlerts} active alerts` : "Health checks not loaded yet"}
              targetView="observability"
              onOpen={openView}
            />
          </div>
        </section>

        <RailCard
          title="Capital pulse"
          subtitle={isDashboardLoading ? "Loading market snapshot..." : dashboardSnapshot?.dateString ? `Snapshot ${dashboardSnapshot.dateString}` : "No market snapshot yet"}
          icon={<TrendingUp className="h-4 w-4" />}
          footer={isDealLoading ? "Syncing funding feed..." : deals.length ? `${deals.length} funding items in feed` : "No funding events surfaced yet"}
          rows={capitalRows}
          targetView="funding"
          onOpen={openView}
          loading={isDealLoading}
          loadingMessage="Loading capital motion..."
          emptyMessage="No capital motion is available right now."
        />

        <RailCard
          title="GitHub radar"
          subtitle="Code momentum and repo lift"
          icon={<GitBranch className="h-4 w-4" />}
          footer={isRepoLoading ? "Syncing repo signals..." : repos.length ? `${repos.length} repositories tracked in this slice` : "Repo signals are quiet right now"}
          rows={repoRows}
          targetView="github-explorer"
          onOpen={openView}
          loading={isRepoLoading}
          loadingMessage="Loading repository momentum..."
          emptyMessage="No repository momentum is available yet."
        />

        <ErrorBoundary
          section="Cockpit repair loop"
          fallback={(
            <AutonomyLoopFallbackCard
              latestMemory={latestMemory}
              isBriefLoading={isBriefLoading}
              systemHealth={systemHealth}
              isHealthLoading={isHealthLoading}
              onOpen={openView}
            />
          )}
        >
          <AutonomyLoopCard
            latestMemory={latestMemory}
            isBriefLoading={isBriefLoading}
            systemHealth={systemHealth}
            isHealthLoading={isHealthLoading}
            onOpen={openView}
          />
        </ErrorBoundary>

        <section className="rounded-2xl border border-[var(--hud-border)] bg-[rgba(15,23,42,0.52)] px-3 py-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--hud-text-dim)]">
            <Activity className="h-3.5 w-3.5" />
            Ambient state
          </div>
          <div className="mt-3 space-y-2">
            <AmbientChip label="OpenAI Realtime" active />
            <AmbientChip label="Voice routing" active />
            <AmbientChip label="Market and code awareness" active={Boolean(deals.length || repos.length)} />
            <ErrorBoundary
              section="Cockpit self maintenance"
              fallback={<AmbientChip label="Self maintenance" active={false} />}
            >
              <SelfMaintenanceChip />
            </ErrorBoundary>
          </div>
        </section>
      </div>
    </aside>
  );
});

function ShelfCard({
  label,
  value,
  detail,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-[158px] rounded-2xl border border-[var(--hud-border)] bg-[rgba(15,23,42,0.58)] px-3 py-3 text-left"
    >
      <div className="flex items-center gap-2 text-[var(--hud-text-dim)]">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--hud-border)] bg-[rgba(255,255,255,0.03)]">
          {icon}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-[0.16em]">{label}</span>
      </div>
      <div className="mt-3 text-sm font-semibold text-[var(--hud-text)]">{value}</div>
      <div className="mt-1 text-xs leading-5 text-[var(--hud-text-dim)]">{detail}</div>
    </button>
  );
}

function RailCard({
  title,
  subtitle,
  icon,
  footer,
  rows,
  targetView,
  onOpen,
  loading,
  loadingMessage,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  footer: string;
  rows: IntelRow[];
  targetView: MainView;
  onOpen: (view: MainView) => void;
  loading: boolean;
  loadingMessage?: string;
  emptyMessage: string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--hud-border)] bg-[rgba(15,23,42,0.52)] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--hud-text)]">{title}</div>
          <div className="mt-1 text-xs text-[var(--hud-text-dim)]">{subtitle}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--hud-border)] bg-[rgba(255,255,255,0.03)] text-[var(--hud-text-dim)]">
          {icon}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {loading ? (
          <LoadingRailState message={loadingMessage ?? "Syncing live data..."} />
        ) : rows.length ? rows.map((row) => (
          <RailRow
            key={`${row.label}-${row.detail}`}
            row={row}
            fallbackTarget={targetView}
            onOpen={onOpen}
          />
        )) : (
          <EmptyRailState message={emptyMessage} />
        )}
      </div>
      <button
        type="button"
        onClick={() => onOpen(targetView)}
        className="mt-3 w-full border-t border-[var(--hud-border)] pt-3 text-left text-xs text-[var(--hud-text-dim)] hover:text-[var(--hud-text)]"
      >
        {footer}
      </button>
    </section>
  );
}

function RailMetric({
  label,
  value,
  detail,
  targetView,
  onOpen,
}: {
  label: string;
  value: string;
  detail?: string;
  targetView: MainView;
  onOpen: (view: MainView) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(targetView)}
      className="w-full rounded-xl border border-[var(--hud-border)] bg-[rgba(255,255,255,0.025)] px-3 py-2.5 text-left hover:bg-[rgba(255,255,255,0.05)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--hud-text-dim)]">{label}</span>
        <span className="text-sm font-semibold text-[var(--hud-text)]">{value}</span>
      </div>
      {detail ? <div className="mt-1 text-xs leading-5 text-[var(--hud-text-dim)]">{detail}</div> : null}
    </button>
  );
}

function AutonomyLoopCard({
  latestMemory,
  isBriefLoading,
  systemHealth,
  isHealthLoading,
  onOpen,
}: {
  latestMemory: LatestMemorySummary;
  isBriefLoading: boolean;
  systemHealth: SystemHealthSummary;
  isHealthLoading: boolean;
  onOpen: (view: MainView) => void;
}) {
  const healingSummary = useQuery(api.domains.observability.selfHealer.getHealingStatsSummary, { hours: 24 });
  const isHealingLoading = healingSummary === undefined;

  return (
    <RailCard
      title="Autonomy loop"
      subtitle="Briefing memory and self-healing state"
      icon={<Sparkles className="h-4 w-4" />}
      footer={isBriefLoading ? "Syncing latest briefing..." : latestMemory?.dateString ? `Latest brief ${latestMemory.dateString}` : "No briefing memory stored yet"}
      rows={buildAutonomyRows({
        latestMemory,
        isBriefLoading,
        systemHealth,
        isHealthLoading,
        repairDetail: isHealingLoading
          ? "Checking repair activity..."
          : healingSummary
            ? `${healingSummary.succeeded}/${healingSummary.attempted} fixes completed`
            : "No repair activity recorded yet",
      })}
      targetView="observability"
      onOpen={onOpen}
      loading={false}
      emptyMessage="Autonomy signals are not available yet."
    />
  );
}

function AutonomyLoopFallbackCard({
  latestMemory,
  isBriefLoading,
  systemHealth,
  isHealthLoading,
  onOpen,
}: {
  latestMemory: LatestMemorySummary;
  isBriefLoading: boolean;
  systemHealth: SystemHealthSummary;
  isHealthLoading: boolean;
  onOpen: (view: MainView) => void;
}) {
  return (
    <RailCard
      title="Autonomy loop"
      subtitle="Briefing memory and self-healing state"
      icon={<Sparkles className="h-4 w-4" />}
      footer={isBriefLoading ? "Syncing latest briefing..." : latestMemory?.dateString ? `Latest brief ${latestMemory.dateString}` : "No briefing memory stored yet"}
      rows={buildAutonomyRows({
        latestMemory,
        isBriefLoading,
        systemHealth,
        isHealthLoading,
        repairDetail: "Repair activity is temporarily unavailable. Open Observability to inspect maintenance status.",
      })}
      targetView="observability"
      onOpen={onOpen}
      loading={false}
      emptyMessage="Autonomy signals are not available yet."
    />
  );
}

function RailRow({
  row,
  fallbackTarget,
  onOpen,
}: {
  row: IntelRow;
  fallbackTarget: MainView;
  onOpen: (view: MainView) => void;
}) {
  const target = row.targetView ?? fallbackTarget;
  return (
    <button
      type="button"
      onClick={() => onOpen(target)}
      className="w-full rounded-xl border border-[var(--hud-border)] bg-[rgba(255,255,255,0.025)] px-3 py-2.5 text-left hover:bg-[rgba(255,255,255,0.05)]"
    >
      <div className="text-xs font-medium text-[var(--hud-text)]">{row.label}</div>
      <div className="mt-1 text-xs leading-5 text-[var(--hud-text-dim)]">{row.detail}</div>
    </button>
  );
}

function AmbientChip({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--hud-border)] px-3 py-1.5 text-xs text-[var(--hud-text-dim)]">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-amber-400"}`} />
      {label}
    </div>
  );
}

function SelfMaintenanceChip() {
  const healingSummary = useQuery(api.domains.observability.selfHealer.getHealingStatsSummary, { hours: 24 });

  return <AmbientChip label="Self maintenance" active={Boolean(healingSummary?.attempted)} />;
}

function LoadingRailState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--hud-border)] px-3 py-3 text-xs text-[var(--hud-text-dim)]">
      {message}
    </div>
  );
}

function EmptyRailState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--hud-border)] px-3 py-3 text-xs text-[var(--hud-text-dim)]">
      {message}
    </div>
  );
}

function toDealRow(deal: any, targetView: MainView): IntelRow {
  const label = firstString(deal, ["companyName", "company", "title", "name"]) ?? "Funding event";
  const amount = firstValue(deal, ["amountDisplay", "amountUsdDisplay", "amount", "fundingAmount", "investmentAmount"]);
  const round = firstString(deal, ["round", "roundType", "stage"]);
  const detail = [amount, round].filter(Boolean).map(String).join(" | ");
  return { label, detail: detail || "Capital event tracked", targetView };
}

function toRepoRow(repo: any, targetView: MainView): IntelRow {
  const label = firstString(repo, ["fullName", "name"]) ?? "Repository";
  const stars = typeof repo?.stars === "number" ? `${formatCompactCount(repo.stars)} stars` : null;
  const growth = typeof repo?.starGrowth7d === "number" ? `+${formatCompactCount(repo.starGrowth7d)} this week` : null;
  const language = firstString(repo, ["language"]);
  const detail = [stars, growth, language].filter(Boolean).join(" | ");
  return { label, detail: detail || "GitHub activity tracked", targetView };
}

function buildAutonomyRows({
  latestMemory,
  isBriefLoading,
  systemHealth,
  isHealthLoading,
  repairDetail,
}: {
  latestMemory: LatestMemorySummary;
  isBriefLoading: boolean;
  systemHealth: SystemHealthSummary;
  isHealthLoading: boolean;
  repairDetail: string;
}): IntelRow[] {
  return [
    {
      label: "Brief memory",
      detail: isBriefLoading ? "Syncing latest brief..." : latestMemory?.generatedAt ? formatRelativeTime(latestMemory.generatedAt) : "No briefing memory yet",
      targetView: "research",
    },
    {
      label: "Repair loop",
      detail: repairDetail,
      targetView: "observability",
    },
    {
      label: "Protection state",
      detail: isHealthLoading
        ? "Loading health status..."
        : systemHealth?.overall === "healthy"
          ? "All tracked components healthy"
          : `${systemHealth?.activeAlerts ?? 0} active system alerts`,
      targetView: "observability",
    },
  ];
}

function summarizeSourceCount(sourceSummary: unknown): number {
  if (!sourceSummary) return 0;
  if (Array.isArray(sourceSummary)) return sourceSummary.length;
  if (typeof sourceSummary !== "object") return 0;
  return Object.values(sourceSummary as Record<string, unknown>).reduce((total, value) => {
    if (typeof value === "number" && Number.isFinite(value)) return total + value;
    if (Array.isArray(value)) return total + value.length;
    return total;
  }, 0);
}

function formatCompactCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (!Number.isFinite(diffMs) || diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function firstString(record: any, keys: string[]): string | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstValue(record: any, keys: string[]): string | number | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}
