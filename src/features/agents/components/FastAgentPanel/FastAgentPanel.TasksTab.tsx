// src/features/agents/components/FastAgentPanel/FastAgentPanel.TasksTab.tsx
// Tasks tab for FastAgentPanel - shows tasks with quick actions and deep agent integration

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  Loader2,
  Calendar,
  ListTodo,
  MessageSquare,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
type FilterType = 'all' | 'today' | 'todo' | 'in_progress' | 'done';
type ScopeType = 'thread' | 'global';

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: number;
  agentThreadId?: string;
  _creationTime: number;
}

interface TasksTabProps {
  agentThreadId?: string | null;
}

const statusConfig: Record<TaskStatus, { icon: React.ReactNode; color: string; label: string }> = {
  todo: {
    icon: <Circle className="w-3.5 h-3.5" />,
    color: 'text-[var(--text-muted)]',
    label: 'To Do'
  },
  in_progress: { 
    icon: <Clock className="w-3.5 h-3.5" />, 
    color: 'text-blue-500', 
    label: 'In Progress' 
  },
  done: { 
    icon: <CheckCircle2 className="w-3.5 h-3.5" />, 
    color: 'text-emerald-500', 
    label: 'Done' 
  },
  blocked: { 
    icon: <AlertCircle className="w-3.5 h-3.5" />, 
    color: 'text-red-500', 
    label: 'Blocked' 
  },
};

const priorityColors: Record<string, string> = {
  low: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

export function TasksTab({ agentThreadId }: TasksTabProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [scope, setScope] = useState<ScopeType>(agentThreadId ? 'thread' : 'global');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch thread-specific tasks
  const threadTasks = useQuery(
    api.domains.tasks.userEvents.listTasksByThread,
    agentThreadId && scope === 'thread' ? { agentThreadId } : 'skip'
  );

  // Fetch all tasks based on filter
  const globalTasks = useQuery(
    scope === 'global' 
      ? (filter === 'today' 
          ? api.domains.tasks.userEvents.listTasksDueToday
          : api.domains.tasks.userEvents.listTasksByUpdatedDesc)
      : api.domains.tasks.userEvents.listTasksByUpdatedDesc, // dummy query when not used
    scope === 'global'
      ? (filter === 'today' ? { tzOffsetMinutes: new Date().getTimezoneOffset() } : { limit: 50 })
      : 'skip'
  );

  const tasks = scope === 'thread' ? threadTasks : globalTasks;

  const createTask = useMutation(api.domains.tasks.userEvents.createTask);
  const updateTask = useMutation(api.domains.tasks.userEvents.updateTask);

  // Filter tasks by status if needed
  const filteredTasks = tasks?.filter((task: Task) => {
    if (filter === 'all' || filter === 'today') return true;
    return task.status === filter;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsCreating(true);
    try {
      await createTask({ 
        title: newTaskTitle.trim(), 
        status: 'todo',
        agentThreadId: scope === 'thread' && agentThreadId ? agentThreadId : undefined,
      });
      setNewTaskTitle('');
      toast.success('Task created');
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
      blocked: 'todo',
    };

    try {
      await updateTask({ 
        taskId: task._id as any, 
        status: nextStatus[task.status] 
      });
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'todo', label: 'To Do' },
    { key: 'in_progress', label: 'Active' },
    { key: 'done', label: 'Done' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-primary)]">
      {/* Header with quick add */}
      <div className="flex-shrink-0 p-3 border-b border-[var(--border-color)]">
        {/* Scope toggle - Thread vs Global */}
        {agentThreadId && (
          <div className="flex gap-1 mb-2 p-0.5 bg-[var(--bg-secondary)] rounded-lg">
            <button
              onClick={() => setScope('thread')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors",
                scope === 'thread'
                  ? "bg-[var(--bg-primary)] shadow-sm text-blue-600"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <MessageSquare className="w-3 h-3" />
              This Thread
            </button>
            <button
              onClick={() => setScope('global')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors",
                scope === 'global'
                  ? "bg-[var(--bg-primary)] shadow-sm text-blue-600"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Globe className="w-3 h-3" />
              All Tasks
            </button>
          </div>
        )}

        <form onSubmit={handleCreateTask} className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder={scope === 'thread' ? "Add task to this thread..." : "Add a task..."}
            className="flex-1 px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isCreating || !newTaskTitle.trim()}
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-[var(--text-muted)] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
          >
            {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Add
          </button>
        </form>

        {/* Filter tabs - only show for global scope */}
        {scope === 'global' && (
        <div className="flex gap-1 mt-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-2 py-1 text-[10px] font-medium rounded transition-colors",
                filter === f.key
                  ? "bg-blue-100 text-blue-700"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3">
        {!tasks ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
          </div>
        ) : filteredTasks?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ListTodo className="w-8 h-8 text-[var(--text-muted)] mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">No tasks found</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Create a task above to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTasks?.map((task: Task) => {
              const config = statusConfig[task.status];
              return (
                <div
                  key={task._id}
                  className="group flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className={cn("mt-0.5 transition-colors", config.color)}
                    title={`Status: ${config.label}`}
                  >
                    {config.icon}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "text-xs font-medium text-[var(--text-primary)]",
                      task.status === 'done' && "line-through text-[var(--text-muted)]"
                    )}>
                      {task.title}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      {task.priority && (
                        <span className={cn(
                          "px-1.5 py-0.5 text-[9px] font-medium rounded",
                          priorityColors[task.priority]
                        )}>
                          {task.priority}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TasksTab;
