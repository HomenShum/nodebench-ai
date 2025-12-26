import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Calendar, CheckSquare, ArrowRight } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface MorningDigestWidgetProps {
  userName?: string;
  onNavigate?: (path: string) => void;
}

export function MorningDigestWidget({ userName, onNavigate }: MorningDigestWidgetProps) {
  // Get today's tasks
  const tasks = useQuery(api.domains.tasks.tasks.listTasks, {
    status: 'pending',
    limit: 5,
  });

  // Get today's events
  const events = useQuery(api.domains.calendar.events.listEvents, {
    limit: 5,
  });

  const todayTasks = tasks?.slice(0, 3) ?? [];
  const todayEvents = events?.slice(0, 2) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Sun className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Good Morning{userName ? `, ${userName}` : ''}
          </h2>
          <p className="text-sm text-gray-600">Here's your day at a glance</p>
        </div>
      </div>

      {/* Today's Priorities */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-amber-600" />
            Today's Priorities
          </h3>
          <button
            onClick={() => onNavigate?.('/tasks')}
            className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {todayTasks.length > 0 ? (
          <ul className="space-y-2">
            {todayTasks.map((task) => (
              <li key={task._id} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span>{task.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No tasks scheduled for today</p>
        )}
      </section>

      {/* Upcoming Meetings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-600" />
            Upcoming Meetings
          </h3>
          <button
            onClick={() => onNavigate?.('/calendar')}
            className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            View calendar <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {todayEvents.length > 0 ? (
          <div className="space-y-2">
            {todayEvents.map((event) => (
              <div
                key={event._id}
                className="text-sm border-l-2 border-amber-500 pl-3 py-1"
              >
                <div className="font-medium text-gray-800">{event.title}</div>
                <div className="text-gray-500 text-xs">
                  {new Date(event.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No meetings scheduled</p>
        )}
      </section>
    </motion.div>
  );
}

export default MorningDigestWidget;

