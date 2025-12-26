import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sunset, CheckCircle, Calendar, BookOpen, ArrowRight } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface EveningReviewWidgetProps {
  onNavigate?: (path: string) => void;
}

export function EveningReviewWidget({ onNavigate }: EveningReviewWidgetProps) {
  const [reflection, setReflection] = useState('');

  // Get completed tasks
  const allTasks = useQuery(api.domains.tasks.tasks.listTasks, { limit: 50 });
  const completedTasks = allTasks?.filter((t) => t.status === 'completed').slice(0, 5) ?? [];

  // Get tomorrow's tasks (pending)
  const pendingTasks = allTasks?.filter((t) => t.status === 'pending').slice(0, 3) ?? [];

  const handleSaveReflection = () => {
    // TODO: Save reflection to quick capture or journal
    console.log('Saving reflection:', reflection);
    setReflection('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Sunset className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Daily Reflection</h2>
          <p className="text-sm text-gray-600">Review your day and plan ahead</p>
        </div>
      </div>

      {/* Today's Accomplishments */}
      <section className="mb-6">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <CheckCircle className="h-4 w-4 text-purple-600" />
          What You Accomplished
        </h3>
        {completedTasks.length > 0 ? (
          <ul className="space-y-2">
            {completedTasks.map((task) => (
              <li key={task._id} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="line-through text-gray-500">{task.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No tasks completed today</p>
        )}
      </section>

      {/* Tomorrow Preview */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            Tomorrow's Agenda
          </h3>
          <button
            onClick={() => onNavigate?.('/tasks')}
            className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            Plan more <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {pendingTasks.length > 0 ? (
          <ul className="space-y-2">
            {pendingTasks.map((task) => (
              <li
                key={task._id}
                className="text-sm border-l-2 border-purple-500 pl-3 py-1 text-gray-700"
              >
                {task.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No tasks planned for tomorrow</p>
        )}
      </section>

      {/* Journal Prompt */}
      <section>
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-purple-600" />
          Evening Reflection
        </h3>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          className="w-full p-3 border border-purple-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="What went well today? What could be better tomorrow?"
          rows={3}
        />
        <button
          onClick={handleSaveReflection}
          disabled={!reflection.trim()}
          className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Reflection
        </button>
      </section>
    </motion.div>
  );
}

export default EveningReviewWidget;

