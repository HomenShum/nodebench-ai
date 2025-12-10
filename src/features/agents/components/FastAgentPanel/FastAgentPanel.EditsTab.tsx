// src/features/agents/components/FastAgentPanel/FastAgentPanel.EditsTab.tsx
// Edits tab for FastAgentPanel - shows pending document edits from deep agent

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { 
  FileEdit,
  Check,
  X,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type EditStatus = 'pending' | 'applied' | 'failed' | 'cancelled' | 'stale';
type FilterType = 'all' | 'pending' | 'applied' | 'failed';

interface PendingEdit {
  _id: string;
  documentId: string;
  agentThreadId: string;
  status: EditStatus;
  operation: {
    type: string;
    anchor: string;
    search: string;
    replace: string;
    sectionHint?: string;
  };
  errorMessage?: string;
  retryCount: number;
  createdAt: number;
  appliedAt?: number;
}

const statusConfig: Record<EditStatus, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  pending: { 
    icon: <Clock className="w-3.5 h-3.5" />, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50',
    label: 'Pending' 
  },
  applied: { 
    icon: <CheckCircle2 className="w-3.5 h-3.5" />, 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-50',
    label: 'Applied' 
  },
  failed: { 
    icon: <XCircle className="w-3.5 h-3.5" />, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    label: 'Failed' 
  },
  cancelled: { 
    icon: <X className="w-3.5 h-3.5" />, 
    color: 'text-gray-500', 
    bgColor: 'bg-gray-50',
    label: 'Cancelled' 
  },
  stale: { 
    icon: <AlertTriangle className="w-3.5 h-3.5" />, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50',
    label: 'Stale' 
  },
};

interface EditsTabProps {
  activeThreadId?: string | null;
}

export function EditsTab({ activeThreadId }: EditsTabProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedEdit, setExpandedEdit] = useState<string | null>(null);

  // Fetch edits for current thread
  const edits = useQuery(
    api.domains.documents.pendingEdits.getEditsForThread,
    activeThreadId ? { agentThreadId: activeThreadId } : 'skip'
  );

  const reportEditResult = useMutation(api.domains.documents.pendingEdits.reportEditResult);
  const retryEdit = useMutation(api.domains.documents.pendingEdits.retryEdit);

  // Filter edits
  const filteredEdits = edits?.filter((edit: PendingEdit) => {
    if (filter === 'all') return true;
    return edit.status === filter;
  });

  // Stats
  const stats = {
    pending: edits?.filter((e: PendingEdit) => e.status === 'pending').length || 0,
    applied: edits?.filter((e: PendingEdit) => e.status === 'applied').length || 0,
    failed: edits?.filter((e: PendingEdit) => e.status === 'failed').length || 0,
  };

  const handleApprove = async (edit: PendingEdit) => {
    try {
      await reportEditResult({ editId: edit._id as any, success: true });
      toast.success('Edit approved');
    } catch (error) {
      toast.error('Failed to approve edit');
    }
  };

  const handleReject = async (edit: PendingEdit) => {
    try {
      await reportEditResult({ editId: edit._id as any, success: false, errorMessage: 'Rejected by user' });
      toast.success('Edit rejected');
    } catch (error) {
      toast.error('Failed to reject edit');
    }
  };

  const handleRetry = async (edit: PendingEdit) => {
    try {
      await retryEdit({ editId: edit._id as any });
      toast.success('Retrying edit...');
    } catch (error) {
      toast.error('Failed to retry edit');
    }
  };

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: edits?.length || 0 },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'applied', label: 'Applied', count: stats.applied },
    { key: 'failed', label: 'Failed', count: stats.failed },
  ];

  if (!activeThreadId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-primary)]">
        <FileEdit className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No active thread</p>
        <p className="text-xs text-gray-400 mt-1">Start a conversation to see document edits</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-primary)]">
      {/* Header with stats */}
      <div className="flex-shrink-0 p-3 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs font-medium text-[var(--text-primary)]">Document Edits</span>
          </div>
          {stats.pending > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
              {stats.pending} pending
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-2 py-1 text-[10px] font-medium rounded transition-colors flex items-center gap-1",
                filter === f.key
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:bg-gray-100"
              )}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className="px-1 bg-white/50 rounded text-[9px]">{f.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Edits list */}
      <div className="flex-1 overflow-y-auto p-3">
        {!edits ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : filteredEdits?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No edits found</p>
            <p className="text-xs text-gray-400 mt-1">
              {filter === 'all' 
                ? 'Document edits will appear here when the agent makes changes'
                : `No ${filter} edits`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEdits?.map((edit: PendingEdit) => {
              const config = statusConfig[edit.status];
              const isExpanded = expandedEdit === edit._id;

              return (
                <div
                  key={edit._id}
                  className={cn(
                    "rounded-lg border transition-all",
                    config.bgColor,
                    "border-gray-200"
                  )}
                >
                  {/* Edit header */}
                  <button
                    onClick={() => setExpandedEdit(isExpanded ? null : edit._id)}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className={cn("mt-0.5", config.color)}>
                          {config.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-800 truncate">
                            {edit.operation.sectionHint || 'Document Edit'}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(edit.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <span className={cn(
                        "px-1.5 py-0.5 text-[9px] font-medium rounded",
                        config.color,
                        "bg-white/50"
                      )}>
                        {config.label}
                      </span>
                    </div>

                    {edit.errorMessage && (
                      <div className="mt-2 p-2 bg-red-100 rounded text-[10px] text-red-700">
                        {edit.errorMessage}
                      </div>
                    )}
                  </button>

                  {/* Expanded diff view */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-gray-200/50">
                      <div className="mt-2 space-y-2">
                        <div>
                          <div className="text-[10px] font-medium text-gray-500 mb-1">Search:</div>
                          <pre className="p-2 bg-red-50 border border-red-200 rounded text-[10px] text-red-800 overflow-x-auto whitespace-pre-wrap">
                            {edit.operation.search}
                          </pre>
                        </div>
                        <div>
                          <div className="text-[10px] font-medium text-gray-500 mb-1">Replace:</div>
                          <pre className="p-2 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-800 overflow-x-auto whitespace-pre-wrap">
                            {edit.operation.replace}
                          </pre>
                        </div>
                      </div>

                      {/* Actions */}
                      {edit.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleApprove(edit)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Apply
                          </button>
                          <button
                            onClick={() => handleReject(edit)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-xs font-medium rounded transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Reject
                          </button>
                        </div>
                      )}

                      {edit.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(edit)}
                          className="w-full flex items-center justify-center gap-1 mt-3 px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default EditsTab;
