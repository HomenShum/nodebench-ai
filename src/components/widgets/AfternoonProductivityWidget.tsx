import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Target, Clock, ArrowRight } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface AfternoonProductivityWidgetProps {
  onNavigate?: (path: string) => void;
  onStartFocus?: () => void;
}

export function AfternoonProductivityWidget({ onNavigate, onStartFocus }: AfternoonProductivityWidgetProps) {
  // Get task progress
  const allTasks = useQuery(api.domains.tasks.tasks.listTasks, { limit: 50 });
  const completedTasks = allTasks?.filter((t) => t.status === 'completed') ?? [];
  const pendingTasks = allTasks?.filter((t) => t.status === 'pending') ?? [];

  const totalTasks = allTasks?.length ?? 0;
  const completedCount = completedTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Zap className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Stay Focused</h2>
          <p className="text-sm text-gray-600">Keep the momentum going</p>
        </div>
      </div>

      {/* Progress Ring */}
      <section className="mb-6">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-blue-600" />
          Today's Progress
        </h3>
        <div className="flex items-center gap-4">
          {/* Simple progress circle */}
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${progressPercent * 1.76} 176`}
                className="text-blue-600"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
              {progressPercent}%
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {completedCount}/{totalTasks}
            </div>
            <div className="text-sm text-gray-600">tasks completed</div>
          </div>
        </div>
      </section>

      {/* Focus Session */}
      <section className="mb-6">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-blue-600" />
          Deep Work Session
        </h3>
        <button
          onClick={onStartFocus}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Start 25-min Focus Session
        </button>
      </section>

      {/* Pending Tasks */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800">Up Next</h3>
          <button
            onClick={() => onNavigate?.('/tasks')}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {pendingTasks.slice(0, 2).map((task) => (
          <div key={task._id} className="text-sm text-gray-700 py-1">
            • {task.title}
          </div>
        ))}
      </section>
    </motion.div>
  );
}

export default AfternoonProductivityWidget;

