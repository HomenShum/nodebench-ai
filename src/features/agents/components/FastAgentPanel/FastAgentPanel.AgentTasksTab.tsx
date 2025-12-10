// src/features/agents/components/FastAgentPanel/FastAgentPanel.AgentTasksTab.tsx
// Agent Tasks tab - shows orchestration workflow tasks from deep agent runs

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  Loader2,
  Bot,
  GitBranch,
  Cpu,
  Zap,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AgentTaskStatus = 'pending' | 'running' | 'complete' | 'paused' | 'error';
type AgentType = 'orchestrator' | 'main' | 'leaf';

interface AgentTask {
  _id: string;
  name: string;
  status: AgentTaskStatus;
  agentType: AgentType;
  progress: number;
  description?: string;
  parentId?: string;
  startedAtMs?: number;
  completedAtMs?: number;
  elapsedMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  createdAt: number;
  updatedAt: number;
}

interface AgentTasksTabProps {
  agentThreadId?: string | null;
}

const statusConfig: Record<AgentTaskStatus, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  pending: { 
    icon: <Circle className="w-3.5 h-3.5" />, 
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
    label: 'Pending' 
  },
  running: { 
    icon: <Clock className="w-3.5 h-3.5 animate-pulse" />, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    label: 'Running' 
  },
  complete: { 
    icon: <CheckCircle2 className="w-3.5 h-3.5" />, 
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-100',
    label: 'Complete' 
  },
  paused: { 
    icon: <Clock className="w-3.5 h-3.5" />, 
    color: 'text-amber-500',
    bgColor: 'bg-amber-100',
    label: 'Paused' 
  },
  error: { 
    icon: <AlertCircle className="w-3.5 h-3.5" />, 
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    label: 'Error' 
  },
};

const agentTypeConfig: Record<AgentType, { icon: React.ReactNode; color: string; label: string }> = {
  orchestrator: {
    icon: <GitBranch className="w-3 h-3" />,
    color: 'text-purple-600 bg-purple-100',
    label: 'Orchestrator'
  },
  main: {
    icon: <Cpu className="w-3 h-3" />,
    color: 'text-blue-600 bg-blue-100',
    label: 'Main'
  },
  leaf: {
    icon: <Zap className="w-3 h-3" />,
    color: 'text-emerald-600 bg-emerald-100',
    label: 'Worker'
  },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function AgentTaskItem({ task, depth = 0 }: { task: AgentTask; depth?: number }) {
  const statusCfg = statusConfig[task.status];
  const typeCfg = agentTypeConfig[task.agentType];
  
  return (
    <div 
      className={cn(
        "group flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors",
        depth > 0 && "ml-4 border-l-2 border-gray-200 pl-3"
      )}
    >
      {/* Status indicator */}
      <div className={cn("mt-0.5", statusCfg.color)}>
        {statusCfg.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        {/* Task name and type */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-medium",
            task.status === 'complete' ? "text-gray-500" : "text-gray-800"
          )}>
            {task.name}
          </span>
          <span className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium rounded",
            typeCfg.color
          )}>
            {typeCfg.icon}
            {typeCfg.label}
          </span>
        </div>
        
        {/* Description if present */}
        {task.description && (
          <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
            {task.description}
          </p>
        )}
        
        {/* Progress and metrics */}
        <div className="flex items-center gap-3 mt-1.5">
          {/* Progress bar for running tasks */}
          {task.status === 'running' && task.progress > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${task.progress * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-500">
                {Math.round(task.progress * 100)}%
              </span>
            </div>
          )}
          
          {/* Duration */}
          {task.elapsedMs && (
            <span className="text-[9px] text-gray-400">
              {formatDuration(task.elapsedMs)}
            </span>
          )}
          
          {/* Token usage */}
          {(task.inputTokens || task.outputTokens) && (
            <span className="text-[9px] text-gray-400">
              {task.inputTokens || 0}→{task.outputTokens || 0} tokens
            </span>
          )}
        </div>
      </div>
      
      {/* Expand indicator for tasks with children */}
      <ChevronRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export function AgentTasksTab({ agentThreadId }: AgentTasksTabProps) {
  // Fetch agent tasks for this thread
  const agentTasks = useQuery(
    api.domains.agents.agentTimelines.listAgentTasksByThread,
    agentThreadId ? { agentThreadId } : 'skip'
  );

  // Group tasks by status for summary
  const tasksByStatus: Record<AgentTaskStatus, number> = agentTasks?.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, { pending: 0, running: 0, complete: 0, paused: 0, error: 0 } as Record<AgentTaskStatus, number>) 
    || { pending: 0, running: 0, complete: 0, paused: 0, error: 0 };

  const totalTasks = agentTasks?.length || 0;
  const completedTasks = tasksByStatus.complete;
  const runningTasks = tasksByStatus.running;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-primary)]">
      {/* Header with summary */}
      <div className="flex-shrink-0 p-3 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-800">Agent Workflow</span>
          </div>
          {totalTasks > 0 && (
            <span className="text-xs text-gray-500">
              {completedTasks}/{totalTasks} complete
            </span>
          )}
        </div>
        
        {/* Status summary pills */}
        {totalTasks > 0 && (
          <div className="flex gap-2">
            {runningTasks > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">
                <Clock className="w-3 h-3 animate-pulse" />
                {runningTasks} running
              </span>
            )}
            {tasksByStatus.pending > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full">
                {tasksByStatus.pending} pending
              </span>
            )}
            {tasksByStatus.error > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded-full">
                <AlertCircle className="w-3 h-3" />
                {tasksByStatus.error} failed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3">
        {!agentThreadId ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No active thread</p>
            <p className="text-xs text-gray-400 mt-1">
              Start a Deep Agent conversation to see orchestration tasks
            </p>
          </div>
        ) : !agentTasks ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : agentTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <GitBranch className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No agent tasks yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Tasks will appear here as the agent works
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {agentTasks.map((task: AgentTask) => (
              <AgentTaskItem key={task._id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentTasksTab;
