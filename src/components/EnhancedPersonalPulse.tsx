import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  FileText,
  CheckSquare,
  Calendar,
  ChevronRight,
  ChevronDown,
  Clock,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTimeContext } from '../hooks/useTimeContext';

interface EnhancedPersonalPulseProps {
  className?: string;
  onDocumentSelect?: (id: string) => void;
  onTaskSelect?: (id: string) => void;
  onNavigate?: (path: string) => void;
}

export function EnhancedPersonalPulse({
  className = '',
  onDocumentSelect,
  onTaskSelect,
  onNavigate,
}: EnhancedPersonalPulseProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('tasks');
  const timeContext = useTimeContext();

  // Fetch data
  const tasks = useQuery(api.domains.tasks.tasks.listTasks, { limit: 10 });
  const documents = useQuery(api.domains.documents.documents.listDocuments, { limit: 10 });
  const recommendations = useQuery(api.domains.recommendations.recommendationEngine.getActiveRecommendations, { limit: 3 });

  const pendingTasks = tasks?.filter((t) => t.status === 'pending').slice(0, 5) ?? [];
  const recentDocs = documents?.slice(0, 5) ?? [];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className={`bg-white dark:bg-[#09090B] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-500/10 dark:to-blue-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Personal Pulse</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>{timeContext.timeOfDay === 'morning' ? 'Morning Mode' : timeContext.timeOfDay === 'afternoon' ? 'Focus Mode' : 'Wind Down'}</span>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
        {/* Tasks Section */}
        <CollapsibleSection
          title="Today's Tasks"
          icon={CheckSquare}
          count={pendingTasks.length}
          isExpanded={expandedSection === 'tasks'}
          onToggle={() => toggleSection('tasks')}
          color="text-green-600"
        >
          {pendingTasks.length > 0 ? (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <button
                  key={task._id}
                  onClick={() => onTaskSelect?.(task._id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors text-left"
                >
                  <div className="w-4 h-4 rounded border-2 border-gray-300" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{task.title}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No pending tasks</p>
          )}
        </CollapsibleSection>

        {/* Documents Section */}
        <CollapsibleSection
          title="Recent Documents"
          icon={FileText}
          count={recentDocs.length}
          isExpanded={expandedSection === 'documents'}
          onToggle={() => toggleSection('documents')}
          color="text-blue-600"
        >
          {recentDocs.length > 0 ? (
            <div className="space-y-2">
              {recentDocs.map((doc) => (
                <button
                  key={doc._id}
                  onClick={() => onDocumentSelect?.(doc._id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors text-left"
                >
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{doc.title || 'Untitled'}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No recent documents</p>
          )}
        </CollapsibleSection>

        {/* AI Suggestions Section */}
        <CollapsibleSection
          title="AI Suggestions"
          icon={Sparkles}
          count={recommendations?.length ?? 0}
          isExpanded={expandedSection === 'suggestions'}
          onToggle={() => toggleSection('suggestions')}
          color="text-purple-600"
        >
          {recommendations && recommendations.length > 0 ? (
            <div className="space-y-2">
              {recommendations.map((rec) => (
                <div key={rec._id} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-sm text-gray-700">{rec.message}</p>
                  <button className="mt-2 text-xs text-purple-600 font-medium hover:text-purple-700">
                    {rec.actionLabel} →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No suggestions right now</p>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: typeof FileText;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  color: string;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon: Icon, count, isExpanded, onToggle, color, children }: CollapsibleSectionProps) {
  return (
    <div>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-sm font-medium text-gray-800">{title}</span>
          {count > 0 && <span className="text-xs text-gray-500 bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-full">{count}</span>}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-6 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EnhancedPersonalPulse;

