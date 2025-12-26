import React from 'react';
import { motion } from 'framer-motion';
import { Coffee, ListTodo, Sparkles, ArrowRight, Calendar } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface WeekendPlannerWidgetProps {
  onNavigate?: (path: string) => void;
}

export function WeekendPlannerWidget({ onNavigate }: WeekendPlannerWidgetProps) {
  // Get all tasks for next week planning
  const allTasks = useQuery(api.domains.tasks.tasks.listTasks, { limit: 50 });
  const pendingTasks = allTasks?.filter((t) => t.status === 'pending').slice(0, 5) ?? [];

  // Get recent documents for review
  const recentDocs = useQuery(api.domains.documents.documents.listDocuments, {
    limit: 3,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border border-green-200 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <Coffee className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Weekend Mode</h2>
          <p className="text-sm text-gray-600">Relax and plan for the week ahead</p>
        </div>
      </div>

      {/* Week Ahead Planning */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-green-600" />
            Plan Your Week
          </h3>
          <button
            onClick={() => onNavigate?.('/tasks')}
            className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
          >
            Open planner <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {pendingTasks.length > 0 ? (
          <ul className="space-y-2">
            {pendingTasks.map((task) => (
              <li
                key={task._id}
                className="flex items-center gap-2 text-sm text-gray-700 bg-white/50 p-2 rounded-lg"
              >
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span>{task.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No tasks to review</p>
        )}
      </section>

      {/* Review Documents */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-green-600" />
            Documents to Review
          </h3>
          <button
            onClick={() => onNavigate?.('/documents')}
            className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {recentDocs && recentDocs.length > 0 ? (
          <div className="space-y-2">
            {recentDocs.map((doc) => (
              <div
                key={doc._id}
                className="text-sm border-l-2 border-green-500 pl-3 py-1 text-gray-700 bg-white/50 rounded-r-lg"
              >
                {doc.title || 'Untitled Document'}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No documents to review</p>
        )}
      </section>

      {/* Weekend Ideas */}
      <section>
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-green-600" />
          Weekend Ideas
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onNavigate?.('/research')}
            className="p-3 bg-white/70 rounded-lg text-sm text-gray-700 hover:bg-white transition-colors text-left"
          >
            🔍 Explore new topics
          </button>
          <button
            onClick={() => onNavigate?.('/documents/new')}
            className="p-3 bg-white/70 rounded-lg text-sm text-gray-700 hover:bg-white transition-colors text-left"
          >
            ✍️ Start a new project
          </button>
          <button
            onClick={() => onNavigate?.('/calendar')}
            className="p-3 bg-white/70 rounded-lg text-sm text-gray-700 hover:bg-white transition-colors text-left"
          >
            📅 Review calendar
          </button>
          <button
            onClick={() => onNavigate?.('/settings')}
            className="p-3 bg-white/70 rounded-lg text-sm text-gray-700 hover:bg-white transition-colors text-left"
          >
            ⚙️ Organize workspace
          </button>
        </div>
      </section>
    </motion.div>
  );
}

export default WeekendPlannerWidget;

