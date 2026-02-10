/**
 * ActionConfirmation — Phase 3 High-Risk Action Gating Component
 *
 * Renders an inline confirmation card when the agent proposes a
 * high-risk action (deploy, delete, migrate). The user must approve
 * or reject before the action proceeds.
 */

import React, { useState, useCallback } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Rocket,
  Trash2,
  Database,
  Clock,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface ActionConfirmationData {
  actionId: string;
  title: string;
  description: string;
  riskTier: RiskTier;
  reversible: boolean;
  affectedResources: string[];
  toolName: string;
  estimatedImpact?: string;
}

interface ActionConfirmationProps {
  action: ActionConfirmationData;
  onApprove: (actionId: string) => void;
  onReject: (actionId: string, reason?: string) => void;
  isProcessing?: boolean;
}

const RISK_CONFIG: Record<RiskTier, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  low: {
    icon: <Shield className="w-4 h-4" />,
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    label: 'Low Risk',
  },
  medium: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    label: 'Medium Risk',
  },
  high: {
    icon: <ShieldAlert className="w-4 h-4" />,
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    label: 'High Risk',
  },
  critical: {
    icon: <ShieldAlert className="w-4 h-4" />,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'Critical Risk',
  },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  deploy: <Rocket className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
  migrate: <Database className="w-4 h-4" />,
};

function getActionIcon(toolName: string): React.ReactNode {
  if (toolName.includes('deploy')) return ACTION_ICONS.deploy;
  if (toolName.includes('delete') || toolName.includes('cleanup') || toolName.includes('purge')) return ACTION_ICONS.delete;
  if (toolName.includes('migrate') || toolName.includes('migration')) return ACTION_ICONS.migrate;
  return <ShieldAlert className="w-4 h-4" />;
}

export function ActionConfirmation({
  action,
  onApprove,
  onReject,
  isProcessing = false,
}: ActionConfirmationProps) {
  const [decision, setDecision] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const config = RISK_CONFIG[action.riskTier];
  const actionIcon = getActionIcon(action.toolName);

  const handleApprove = useCallback(() => {
    setDecision('approved');
    onApprove(action.actionId);
  }, [action.actionId, onApprove]);

  const handleReject = useCallback(() => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    setDecision('rejected');
    onReject(action.actionId, rejectReason || undefined);
  }, [action.actionId, onReject, rejectReason, showRejectInput]);

  if (decision === 'approved') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <span className="text-green-700 dark:text-green-300 font-medium">Approved: {action.title}</span>
        {isProcessing && <Clock className="w-3.5 h-3.5 text-green-500 animate-spin ml-auto" />}
      </div>
    );
  }

  if (decision === 'rejected') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm">
        <XCircle className="w-4 h-4 text-red-600" />
        <span className="text-red-700 dark:text-red-300 font-medium">Rejected: {action.title}</span>
        {rejectReason && <span className="text-red-500 text-xs ml-1">— {rejectReason}</span>}
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border-2 overflow-hidden shadow-md",
      config.borderColor,
      config.bgColor,
    )}>
      {/* Header */}
      <div className={cn("px-4 py-3 flex items-center gap-3", config.bgColor)}>
        <div className={cn("p-1.5 rounded-lg", config.color)}>
          {actionIcon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className={cn("text-sm font-semibold", config.color)}>
              {action.title}
            </h4>
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
              config.color,
              action.riskTier === 'critical' ? 'bg-red-100 dark:bg-red-800/40' :
              action.riskTier === 'high' ? 'bg-orange-100 dark:bg-orange-800/40' :
              action.riskTier === 'medium' ? 'bg-yellow-100 dark:bg-yellow-800/40' :
              'bg-green-100 dark:bg-green-800/40'
            )}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{action.description}</p>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 py-2 border-t border-[var(--border-color)] space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)] font-medium w-24">Tool:</span>
          <code className="text-[var(--text-primary)] font-mono text-[11px] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded">
            {action.toolName}
          </code>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)] font-medium w-24">Reversible:</span>
          <span className={action.reversible ? 'text-green-600' : 'text-red-600'}>
            {action.reversible ? 'Yes' : 'No — cannot be undone'}
          </span>
        </div>

        {action.affectedResources.length > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium w-24 shrink-0">Affects:</span>
            <div className="flex flex-wrap gap-1">
              {action.affectedResources.map((r) => (
                <span key={r} className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[10px]">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {action.estimatedImpact && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium w-24">Impact:</span>
            <span className="text-[var(--text-secondary)]">{action.estimatedImpact}</span>
          </div>
        )}
      </div>

      {/* Reject reason input */}
      {showRejectInput && (
        <div className="px-4 py-2 border-t border-[var(--border-color)]">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (optional)..."
            className="w-full text-xs px-2 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleReject();
              if (e.key === 'Escape') setShowRejectInput(false);
            }}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={handleReject}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          {showRejectInput ? 'Confirm Reject' : 'Reject'}
        </button>
        <button
          type="button"
          onClick={handleApprove}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors",
            action.riskTier === 'critical' ? 'bg-red-600 hover:bg-red-700' :
            action.riskTier === 'high' ? 'bg-orange-600 hover:bg-orange-700' :
            'bg-blue-600 hover:bg-blue-700'
          )}
        >
          {action.riskTier === 'critical' ? 'I understand the risk — Approve' : 'Approve'}
        </button>
      </div>
    </div>
  );
}

export default ActionConfirmation;
