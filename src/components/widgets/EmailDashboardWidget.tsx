import React from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Inbox,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface EmailDashboardWidgetProps {
  onNavigate?: (path: string) => void;
}

export function EmailDashboardWidget({ onNavigate }: EmailDashboardWidgetProps) {
  // Get email stats
  const stats = useQuery(api.domains.integrations.email.emailQueries.getEmailStats);

  // Get urgent emails
  const urgentEmails = useQuery(api.domains.integrations.email.emailQueries.getUrgentEmails);

  // Get latest daily report
  const latestReport = useQuery(api.domains.integrations.email.emailQueries.getLatestDailyReport);

  const isLoading = stats === undefined;

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-700 rounded" />
          ))}
        </div>
        <div className="h-32 bg-slate-700 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Mail className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Email Intelligence</h2>
            <p className="text-sm text-slate-400">
              {stats?.lastSyncedAt
                ? `Last synced ${formatRelativeTime(stats.lastSyncedAt)}`
                : 'Not synced yet'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate?.('/email')}
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          View inbox <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<Inbox className="h-5 w-5" />}
          label="Unread"
          value={stats?.unreadCount || 0}
          color="blue"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Action Required"
          value={stats?.actionRequiredCount || 0}
          color="amber"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Total"
          value={stats?.totalThreads || 0}
          color="emerald"
        />
      </div>

      {/* Category Breakdown */}
      {stats?.categories && stats.categories.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3">By Category</h3>
          <div className="flex flex-wrap gap-2">
            {stats.categories.slice(0, 6).map((cat) => (
              <span
                key={cat.name}
                className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300 border border-slate-600"
              >
                {cat.name}
                <span className="ml-2 text-slate-500">{cat.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Urgent Emails */}
      {urgentEmails && urgentEmails.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Needs Attention
            </h3>
          </div>
          <div className="space-y-2">
            {urgentEmails.slice(0, 3).map((email) => (
              <div
                key={email._id}
                className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {email.subject}
                    </p>
                    <p className="text-xs text-slate-400">{email.from}</p>
                  </div>
                  {email.priority === 'urgent' && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded">
                      URGENT
                    </span>
                  )}
                </div>
                {email.actionSuggestion && (
                  <p className="text-xs text-amber-300 mt-2">
                    → {email.actionSuggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest Daily Report */}
      {latestReport && (
        <div className="pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Daily Report
            </h3>
            <span className="text-xs text-slate-500">
              {latestReport.date}
            </span>
          </div>
          {latestReport.executiveSummary && (
            <p className="text-sm text-slate-300 line-clamp-2 mb-3">
              {latestReport.executiveSummary}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {latestReport.totalReceived} received • {latestReport.totalUnread} unread
            </span>
            {latestReport.deliveredVia && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-indigo-400" />
                Delivered via {latestReport.deliveredVia.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!stats?.totalThreads && (
        <div className="text-center py-8 text-slate-400">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Connect your Gmail to start tracking emails</p>
          <button
            onClick={() => onNavigate?.('/settings/integrations')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
          >
            Connect Gmail
          </button>
        </div>
      )}
    </motion.div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'amber' | 'emerald';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    emerald: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wide opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// Format relative time helper
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
