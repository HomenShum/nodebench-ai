import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Calendar,
  ChevronDown,
  ChevronRight,
  Mail,
  CheckCircle,
  Circle,
  AlertTriangle,
  Clock,
  Star,
  Archive,
  Bell,
  Send,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface EmailReportViewerProps {
  selectedReportId?: Id<"emailDailyReports"> | null;
}

export function EmailReportViewer({ selectedReportId }: EmailReportViewerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Get list of reports
  const reports = useQuery(api.domains.integrations.email.emailQueries.getDailyReports, {
    limit: 30,
  });

  // Get selected report detail
  const selectedReport = useQuery(
    api.domains.integrations.email.emailQueries.getDailyReportDetail,
    selectedReportId ? { reportId: selectedReportId } : "skip"
  );

  // Get latest report if none selected
  const latestReport = useQuery(api.domains.integrations.email.emailQueries.getLatestDailyReport);

  const activeReport = selectedReport || latestReport;
  const isLoading = reports === undefined;

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gray-900 animate-pulse">
        <div className="p-4 border-b border-gray-700">
          <div className="h-8 bg-gray-700 rounded w-1/3" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <FileText className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Daily Email Reports</h1>
            <p className="text-sm text-gray-400">
              AI-powered email summaries and insights
            </p>
          </div>
        </div>

        {/* Report Selector */}
        {reports && reports.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {reports.slice(0, 7).map((report) => (
              <button
                key={report._id}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeReport?._id === report._id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <Calendar className="h-4 w-4" />
                {report.date}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeReport ? (
          <div className="space-y-6">
            {/* Executive Summary */}
            {activeReport.executiveSummary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-br from-purple-900/30 to-slate-800/50 rounded-xl border border-purple-500/30"
              >
                <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Star className="h-5 w-5 text-purple-400" />
                  Executive Summary
                </h2>
                <p className="text-gray-300">{activeReport.executiveSummary}</p>
              </motion.div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Received"
                value={activeReport.totalReceived || 0}
                icon={<Mail className="h-5 w-5" />}
                color="blue"
              />
              <StatCard
                label="Unread"
                value={activeReport.totalUnread || 0}
                icon={<Circle className="h-5 w-5" />}
                color="amber"
              />
              <StatCard
                label="Action Items"
                value={activeReport.actionItemsCount || 0}
                icon={<AlertTriangle className="h-5 w-5" />}
                color="red"
              />
              <StatCard
                label="Sent"
                value={activeReport.totalSent || 0}
                icon={<Send className="h-5 w-5" />}
                color="emerald"
              />
            </div>

            {/* Grouped Emails by Category */}
            {activeReport.groupedEmails && activeReport.groupedEmails.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Archive className="h-5 w-5 text-gray-400" />
                  Email Groups
                </h2>
                <div className="space-y-3">
                  {activeReport.groupedEmails.map((group: CategoryGroup, index: number) => (
                    <CategorySection
                      key={group.category}
                      group={group}
                      isExpanded={expandedCategories.has(group.category)}
                      onToggle={() => toggleCategory(group.category)}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {activeReport.actionItems && activeReport.actionItems.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Action Items
                </h2>
                <div className="space-y-2">
                  {activeReport.actionItems.map((item: ActionItem, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {item.completed ? (
                            <CheckCircle className="h-4 w-4 text-indigo-400" />
                          ) : (
                            <Circle className="h-4 w-4 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white">{item.action}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            From: {item.from} • {item.subject}
                          </p>
                        </div>
                        {item.priority && (
                          <span className={`px-2 py-0.5 text-xs rounded ${getPriorityStyle(item.priority)}`}>
                            {item.priority}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Status */}
            {activeReport.deliveredVia && activeReport.deliveredVia.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500 pt-4 border-t border-gray-700">
                <Bell className="h-4 w-4" />
                <span>Delivered via: {activeReport.deliveredVia.join(', ')}</span>
                {activeReport.generatedAt && (
                  <span className="ml-auto">
                    Generated {formatDateTime(activeReport.generatedAt)}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p>No reports available yet</p>
            <p className="text-sm mt-2">Daily reports are generated automatically at 10 PM UTC</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Types
interface CategoryGroup {
  category: string;
  count: number;
  emails: EmailSummary[];
}

interface EmailSummary {
  subject: string;
  from: string;
  status: 'read' | 'unread';
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  actionRequired?: boolean;
  summary?: string;
}

interface ActionItem {
  action: string;
  from: string;
  subject: string;
  priority?: string;
  completed?: boolean;
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'amber' | 'red' | 'emerald';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
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

// Category Section Component
function CategorySection({
  group,
  isExpanded,
  onToggle,
  index,
}: {
  group: CategoryGroup;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden"
    >
      {/* Category Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-800/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
          <span className="font-medium text-white">{group.category}</span>
          <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-sm rounded">
            {group.count} email{group.count !== 1 ? 's' : ''}
          </span>
        </div>
      </button>

      {/* Expanded Email List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {group.emails.map((email, i) => (
                <div
                  key={i}
                  className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {email.status === 'unread' ? (
                          <Circle className="h-3 w-3 text-blue-400 fill-blue-400" />
                        ) : (
                          <CheckCircle className="h-3 w-3 text-gray-500" />
                        )}
                        <p className="text-sm font-medium text-white truncate">
                          {email.subject}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{email.from}</p>
                      {email.summary && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {email.summary}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {email.priority && email.priority !== 'normal' && (
                        <span className={`px-2 py-0.5 text-xs rounded ${getPriorityStyle(email.priority)}`}>
                          {email.priority}
                        </span>
                      )}
                      {email.actionRequired && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Action
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Helper functions
function getPriorityStyle(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500/20 text-red-400';
    case 'high':
      return 'bg-orange-500/20 text-orange-400';
    case 'low':
      return 'bg-gray-500/20 text-gray-400';
    default:
      return 'bg-blue-500/20 text-blue-400';
  }
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
