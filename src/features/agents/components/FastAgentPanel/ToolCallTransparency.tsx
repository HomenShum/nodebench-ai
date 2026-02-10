/**
 * ToolCallTransparency — Phase 3 Unified Interface Component
 *
 * Renders a visual timeline of MCP tool calls within agent messages,
 * showing tool name, timing, status, and quickRef suggestions.
 * Integrates with the existing ToolStep rendering in UIMessageBubble.
 */

import React, { useState, useMemo } from 'react';
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Zap,
  ArrowRight,
  Search,
  Shield,
  Database,
  FileCode,
  Settings,
  BookOpen,
} from 'lucide-react';

interface ToolCallData {
  toolName: string;
  status: 'running' | 'success' | 'error';
  durationMs?: number;
  inputSummary?: string;
  outputSummary?: string;
  quickRef?: {
    nextAction: string;
    nextTools: string[];
    methodology: string;
    relatedGotchas: string[];
    confidence: 'high' | 'medium' | 'low';
  };
}

interface ToolCallTransparencyProps {
  toolCalls: ToolCallData[];
  isStreaming?: boolean;
  compact?: boolean;
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  convex_audit_schema: <Database className="w-3.5 h-3.5" />,
  convex_suggest_indexes: <Search className="w-3.5 h-3.5" />,
  convex_check_validator_coverage: <Shield className="w-3.5 h-3.5" />,
  convex_audit_functions: <FileCode className="w-3.5 h-3.5" />,
  convex_check_function_refs: <FileCode className="w-3.5 h-3.5" />,
  convex_pre_deploy_gate: <Shield className="w-3.5 h-3.5" />,
  convex_check_env_vars: <Settings className="w-3.5 h-3.5" />,
  convex_record_gotcha: <BookOpen className="w-3.5 h-3.5" />,
  convex_search_gotchas: <Search className="w-3.5 h-3.5" />,
  convex_get_methodology: <BookOpen className="w-3.5 h-3.5" />,
  convex_discover_tools: <Search className="w-3.5 h-3.5" />,
  convex_generate_rules_md: <FileCode className="w-3.5 h-3.5" />,
  convex_snapshot_schema: <Database className="w-3.5 h-3.5" />,
  convex_bootstrap_project: <Zap className="w-3.5 h-3.5" />,
};

function getToolIcon(toolName: string): React.ReactNode {
  return TOOL_ICONS[toolName] || <Wrench className="w-3.5 h-3.5" />;
}

function getToolCategory(toolName: string): string {
  if (toolName.includes('schema') || toolName.includes('index') || toolName.includes('validator') || toolName.includes('snapshot')) return 'Schema';
  if (toolName.includes('function') || toolName.includes('ref')) return 'Function';
  if (toolName.includes('deploy') || toolName.includes('env') || toolName.includes('gate')) return 'Deploy';
  if (toolName.includes('gotcha') || toolName.includes('record') || toolName.includes('rules')) return 'Learning';
  if (toolName.includes('methodology') || toolName.includes('discover') || toolName.includes('bootstrap')) return 'Meta';
  return 'Tool';
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[confidence]}`}>
      {confidence}
    </span>
  );
}

function SingleToolCall({ call, compact }: { call: ToolCallData; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const category = getToolCategory(call.toolName);
  const icon = getToolIcon(call.toolName);

  const statusIcon = call.status === 'success'
    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
    : call.status === 'error'
    ? <XCircle className="w-3.5 h-3.5 text-red-500" />
    : <Clock className="w-3.5 h-3.5 text-violet-500 animate-spin" />;

  const displayName = call.toolName.replace(/^convex_/, '').replace(/_/g, ' ');

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs">
        {statusIcon}
        <span className="font-medium text-[var(--text-primary)]">{displayName}</span>
        {call.durationMs !== undefined && (
          <span className="text-[var(--text-muted)]">{formatDuration(call.durationMs)}</span>
        )}
      </div>
    );
  }

  return (
    <div className="border border-[var(--border-color)] rounded-lg overflow-hidden bg-[var(--bg-primary)] shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors text-left"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          {icon}
        </span>
        <span className="text-xs font-medium text-[var(--text-primary)] flex-1">{displayName}</span>
        <span className="text-[10px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)]">{category}</span>
        {call.durationMs !== undefined && (
          <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {formatDuration(call.durationMs)}
          </span>
        )}
        {statusIcon}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[var(--border-color)] space-y-2">
          {call.inputSummary && (
            <div className="text-xs">
              <span className="text-[var(--text-muted)] font-medium">Input: </span>
              <span className="text-[var(--text-secondary)]">{call.inputSummary}</span>
            </div>
          )}
          {call.outputSummary && (
            <div className="text-xs">
              <span className="text-[var(--text-muted)] font-medium">Output: </span>
              <span className="text-[var(--text-secondary)]">{call.outputSummary}</span>
            </div>
          )}

          {call.quickRef && (
            <div className="mt-2 p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3 h-3 text-violet-500" />
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">QuickRef</span>
                <ConfidenceBadge confidence={call.quickRef.confidence} />
              </div>
              <p className="text-xs text-blue-800 dark:text-blue-200 mb-1">
                {call.quickRef.nextAction}
              </p>
              {call.quickRef.nextTools.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <ArrowRight className="w-3 h-3 text-blue-400" />
                  {call.quickRef.nextTools.map((tool) => (
                    <span key={tool} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 font-mono">
                      {tool}
                    </span>
                  ))}
                </div>
              )}
              {call.quickRef.relatedGotchas.length > 0 && (
                <div className="mt-1 flex items-center gap-1 flex-wrap">
                  <BookOpen className="w-3 h-3 text-amber-500" />
                  {call.quickRef.relatedGotchas.slice(0, 3).map((g) => (
                    <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 font-mono">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ToolCallTransparency({ toolCalls, isStreaming, compact }: ToolCallTransparencyProps) {
  const stats = useMemo(() => {
    const total = toolCalls.length;
    const success = toolCalls.filter((t) => t.status === 'success').length;
    const errors = toolCalls.filter((t) => t.status === 'error').length;
    const running = toolCalls.filter((t) => t.status === 'running').length;
    const totalDuration = toolCalls.reduce((sum, t) => sum + (t.durationMs || 0), 0);
    return { total, success, errors, running, totalDuration };
  }, [toolCalls]);

  if (toolCalls.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {toolCalls.map((call, idx) => (
          <SingleToolCall key={`${call.toolName}-${idx}`} call={call} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Wrench className="w-3.5 h-3.5" />
        <span className="font-medium">
          {stats.total} tool call{stats.total !== 1 ? 's' : ''}
        </span>
        {stats.totalDuration > 0 && (
          <span>({formatDuration(stats.totalDuration)})</span>
        )}
        {stats.running > 0 && (
          <span className="text-violet-500 flex items-center gap-0.5">
            <Clock className="w-3 h-3 animate-spin" />
            {stats.running} running
          </span>
        )}
        {stats.errors > 0 && (
          <span className="text-red-500">{stats.errors} failed</span>
        )}
      </div>

      <div className="space-y-1.5">
        {toolCalls.map((call, idx) => (
          <SingleToolCall key={`${call.toolName}-${idx}`} call={call} />
        ))}
      </div>
    </div>
  );
}

export default ToolCallTransparency;
