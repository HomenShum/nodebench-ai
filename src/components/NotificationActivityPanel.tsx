import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

type NotificationActivityPanelProps = {
  mode?: "user" | "topic";
  variant?: "settings" | "hub";
  title?: string;
  subtitle?: string;
  limit?: number;
  className?: string;
};

type NotificationStats = {
  totalSent: number;
  totalCost: number;
  last24Hours: number;
  last7Days: number;
};

type NotificationLogEntry = {
  body?: string;
  status?: string;
  eventType?: string;
  createdAt?: number;
};

function normalizeText(value?: string): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function clipText(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, Math.max(0, maxLen - 3))}...`;
}

function extractBodyContent(body?: string): string {
  const trimmed = (body ?? "").trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed?.message === "string") return parsed.message;
      if (typeof parsed?.body === "string") return parsed.body;
    } catch {
      return body ?? "";
    }
  }
  return body ?? "";
}

function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return "Unknown";
  const diffMs = Date.now() - timestamp;
  if (diffMs < 60 * 1000) return "Just now";
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatEventLabel(eventType?: string): string {
  if (!eventType) return "Notification";
  return eventType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractHeadline(body?: string): string {
  const lines = extractBodyContent(body)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0] ?? "Notification";
}

function extractPreview(body?: string): string {
  const lines = extractBodyContent(body)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return "";
  return lines.slice(1).join(" ");
}

export function NotificationActivityPanel({
  mode = "user",
  variant = "settings",
  title,
  subtitle,
  limit = 6,
  className,
}: NotificationActivityPanelProps) {
  const user = useQuery(api.domains.auth.auth.loggedInUser);
  const stats = useQuery(
    mode === "topic"
      ? api.domains.integrations.ntfy.getTopicNotificationStats
      : api.domains.integrations.ntfy.getNotificationStats,
    {},
  ) as NotificationStats | undefined;
  const logs = useQuery(
    mode === "topic"
      ? api.domains.integrations.ntfy.getTopicNotificationLogs
      : api.domains.integrations.ntfy.getNotificationLogs,
    { limit },
  ) as NotificationLogEntry[] | undefined;

  const isLoading = stats === undefined || logs === undefined || user === undefined;
  const isSignedIn = user !== null && user !== undefined;
  const showSignInHint = mode === "user" && !isSignedIn;
  const displayStats = stats ?? { totalSent: 0, totalCost: 0, last24Hours: 0, last7Days: 0 };
  const costDollars = (displayStats.totalCost / 100).toFixed(2);

  const logEntries = useMemo(() => (logs ?? []).slice(0, limit), [logs, limit]);

  const styles =
    variant === "hub"
      ? {
          container: "border border-stone-200/70 bg-[#f2f1ed]/60 p-6 space-y-4",
          title: "text-[11px] font-black text-emerald-900 uppercase tracking-[0.3em]",
          subtitle: "text-[10px] text-stone-500 font-mono uppercase tracking-wider",
          statsGrid: "grid grid-cols-2 gap-2",
          statCard: "bg-white/80 border border-stone-200/60 px-3 py-2 text-center",
          statValue: "text-lg font-bold text-stone-900",
          statLabel: "text-[9px] text-stone-500 uppercase tracking-wider",
          logList: "space-y-2",
          logItem: "border border-stone-200/60 bg-white/90 px-3 py-2",
          logTitle: "text-[11px] font-semibold text-stone-900 line-clamp-2",
          logMeta: "text-[9px] text-stone-500 uppercase tracking-wider",
          logBody: "text-[10px] text-stone-500 line-clamp-2",
          emptyText: "text-[10px] text-stone-400",
        }
      : {
          container: "pt-4 border-t border-gray-100 space-y-3",
          title: "text-xs font-semibold text-gray-700",
          subtitle: "text-[10px] text-gray-500",
          statsGrid: "grid grid-cols-2 md:grid-cols-4 gap-2",
          statCard: "bg-gray-50 rounded p-2 text-center",
          statValue: "text-sm font-bold text-gray-900",
          statLabel: "text-[10px] text-gray-500",
          logList: "space-y-2",
          logItem: "border border-gray-200 rounded p-2 bg-white",
          logTitle: "text-xs font-semibold text-gray-800 line-clamp-1",
          logMeta: "text-[10px] text-gray-400 uppercase tracking-wide",
          logBody: "text-[10px] text-gray-500 line-clamp-2",
          emptyText: "text-[10px] text-gray-500",
        };

  return (
    <div className={`${styles.container} ${className ?? ""}`}>
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && <div className={styles.title}>{title}</div>}
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      )}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{displayStats.totalSent}</div>
          <div className={styles.statLabel}>Total</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{displayStats.last24Hours}</div>
          <div className={styles.statLabel}>24h</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{displayStats.last7Days}</div>
          <div className={styles.statLabel}>7d</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>${costDollars}</div>
          <div className={styles.statLabel}>Cost</div>
        </div>
      </div>

      <div className={styles.logList}>
        {showSignInHint && !isLoading && (
          <div className={styles.emptyText}>Sign in to view your notification log.</div>
        )}
        {!showSignInHint && !isLoading && logEntries.length === 0 && (
          <div className={styles.emptyText}>No notifications yet.</div>
        )}
        {!showSignInHint &&
          logEntries.map((entry, idx) => {
            const headline = clipText(normalizeText(extractHeadline(entry.body)), 80);
            const preview = clipText(normalizeText(extractPreview(entry.body)), 140);
            const eventLabel = formatEventLabel(entry.eventType);
            const statusLabel = entry.status ? entry.status.toUpperCase() : "SENT";
            return (
              <div key={idx} className={styles.logItem}>
                <div className="flex items-center justify-between gap-2">
                  <span className={styles.logMeta}>{eventLabel}</span>
                  <span className={styles.logMeta}>{formatTimeAgo(entry.createdAt)}</span>
                </div>
                <div className={styles.logTitle}>{headline}</div>
                {preview && <div className={styles.logBody}>{preview}</div>}
                <div className={styles.logMeta}>{statusLabel}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default NotificationActivityPanel;
