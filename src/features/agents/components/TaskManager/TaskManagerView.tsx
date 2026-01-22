/**
 * TaskManagerView - Main view for browsing and viewing task sessions
 * 
 * Features:
 * - Session list with filters
 * - Date navigation
 * - Status and type filtering
 * - Detail panel for selected session
 * - Support for public (unauthenticated) and private (authenticated) views
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { 
  Calendar,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bot,
  Timer,
  Users,
  ListTodo,
  X,
  RefreshCw,
  Globe,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskSessionCard } from './TaskSessionCard';
import { TaskSessionDetail } from './TaskSessionDetail';
import type { TaskSession, TaskSessionStatus, TaskSessionType, TaskFilters } from './types';
import type { Id } from '../../../../../convex/_generated/dataModel';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FILTER OPTIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const statusOptions: { value: TaskSessionStatus | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Status', icon: <ListTodo className="w-3.5 h-3.5" /> },
  { value: 'running', label: 'Running', icon: <Loader2 className="w-3.5 h-3.5" /> },
  { value: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { value: 'failed', label: 'Failed', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  { value: 'pending', label: 'Pending', icon: <Clock className="w-3.5 h-3.5" /> },
];

const typeOptions: { value: TaskSessionType | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Types', icon: <ListTodo className="w-3.5 h-3.5" /> },
  { value: 'agent', label: 'Agent', icon: <Bot className="w-3.5 h-3.5" /> },
  { value: 'cron', label: 'Cron', icon: <Timer className="w-3.5 h-3.5" /> },
  { value: 'swarm', label: 'Swarm', icon: <Users className="w-3.5 h-3.5" /> },
  { value: 'scheduled', label: 'Scheduled', icon: <Calendar className="w-3.5 h-3.5" /> },
];

const dateRangeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HELPER FUNCTIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function getDateRange(range: string): { from: number | undefined; to: number | undefined } {
  const now = new Date();
  switch (range) {
    case 'today':
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: startOfDay.getTime(), to: undefined };
    case 'week':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return { from: startOfWeek.getTime(), to: undefined };
    case 'month':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfMonth.getTime(), to: undefined };
    default:
      return { from: undefined, to: undefined };
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

interface TaskManagerViewProps {
  /** Show public sessions (for unauthenticated users) */
  isPublic?: boolean;
  className?: string;
}

export function TaskManagerView({ isPublic = false, className }: TaskManagerViewProps) {
  // State
  const [selectedSessionId, setSelectedSessionId] = useState<Id<"agentTaskSessions"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskSessionStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TaskSessionType | 'all'>('all');
  const [dateRange, setDateRange] = useState<string>('week');
  const [showFilters, setShowFilters] = useState(false);

  // Calculate date range
  const { from: dateFrom, to: dateTo } = useMemo(() => getDateRange(dateRange), [dateRange]);

  // Build query args
  const queryArgs = useMemo(() => ({
    limit: 100,
    status: statusFilter === 'all' ? undefined : statusFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
    dateFrom,
    dateTo,
  }), [statusFilter, typeFilter, dateFrom, dateTo]);

  // Fetch sessions - use public or authenticated query
  const publicSessions = useQuery(
    api.domains.taskManager.queries.getPublicTaskSessions,
    isPublic ? queryArgs : 'skip'
  );

  const userSessions = useQuery(
    api.domains.taskManager.queries.getUserTaskSessions,
    !isPublic ? queryArgs : 'skip'
  );

  const sessionsData = isPublic ? publicSessions : userSessions;
  const sessions = (sessionsData?.sessions || []) as TaskSession[];
  const isLoading = sessionsData === undefined;

  // Stats
  const stats = useMemo(() => {
    const running = sessions.filter(s => s.status === 'running').length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const failed = sessions.filter(s => s.status === 'failed').length;
    return { running, completed, failed, total: sessions.length };
  }, [sessions]);

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || dateRange !== 'all';

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setDateRange('all');
  };

  // If a session is selected, show detail view
  if (selectedSessionId) {
    return (
      <div className={cn("h-full", className)}>
        <TaskSessionDetail
          sessionId={selectedSessionId}
          onBack={() => setSelectedSessionId(null)}
          className="h-full"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-[var(--bg-primary)]", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isPublic ? (
              <Globe className="w-5 h-5 text-[var(--accent-primary)]" />
            ) : (
              <Lock className="w-5 h-5 text-[var(--accent-primary)]" />
            )}
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              {isPublic ? 'Public Activity' : 'Task Manager'}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
              showFilters || hasActiveFilters
                ? "bg-[var(--accent-primary)] text-white"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-[var(--text-muted)]">
            {stats.total} sessions
          </span>
          {stats.running > 0 && (
            <span className="flex items-center gap-1 text-blue-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              {stats.running} running
            </span>
          )}
          {stats.completed > 0 && (
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="w-3 h-3" />
              {stats.completed} completed
            </span>
          )}
          {stats.failed > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertCircle className="w-3 h-3" />
              {stats.failed} failed
            </span>
          )}
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="flex-shrink-0 p-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status filter */}
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskSessionStatus | 'all')}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Type filter */}
            <select
              aria-label="Filter by type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TaskSessionType | 'all')}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
            >
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Date range */}
            <select
              aria-label="Filter by date range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
            >
              {dateRangeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[var(--text-muted)] animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="w-12 h-12 text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">
              {hasActiveFilters ? 'No sessions match your filters' : 'No task sessions yet'}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more results'
                : isPublic
                  ? 'Public agent activities will appear here'
                  : 'Start an agent task to see it here'
              }
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 mt-3 px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] rounded-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <TaskSessionCard
                key={session._id}
                session={session}
                isSelected={selectedSessionId === session._id}
                onClick={() => setSelectedSessionId(session._id)}
              />
            ))}

            {sessionsData?.hasMore && (
              <div className="text-center py-4">
                <span className="text-xs text-[var(--text-muted)]">
                  Showing {sessions.length} sessions. More available.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskManagerView;

