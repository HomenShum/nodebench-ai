/**
 * Empty State Components
 * Polished empty states for various sections of the app
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  CheckSquare,
  Calendar,
  Search,
  Inbox,
  FolderOpen,
  Plus,
  Sparkles,
  AlertCircle,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { scaleFadeVariants } from '../utils/animations';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: typeof FileText;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action, className = '' }: EmptyStateProps) {
  return (
    <motion.div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
      variants={scaleFadeVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-stone-400" />
      </div>
      <h3 className="text-lg font-semibold text-stone-800 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

// Pre-configured empty states for common scenarios
export function EmptyDocuments({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No documents yet"
      description="Create your first document to start organizing your thoughts, notes, and research."
      action={onCreate ? { label: 'Create Document', onClick: onCreate } : undefined}
    />
  );
}

export function EmptyTasks({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={CheckSquare}
      title="All caught up!"
      description="You have no pending tasks. Create a new task to stay organized."
      action={onCreate ? { label: 'Add Task', onClick: onCreate } : undefined}
    />
  );
}

export function EmptyCalendar({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No events scheduled"
      description="Your calendar is clear. Add an event to start planning your schedule."
      action={onCreate ? { label: 'Add Event', onClick: onCreate } : undefined}
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try a different search term.`}
    />
  );
}

export function EmptyFolder() {
  return (
    <EmptyState
      icon={FolderOpen}
      title="This folder is empty"
      description="Add documents or subfolders to organize your content."
    />
  );
}

export function EmptyRecommendations() {
  return (
    <EmptyState
      icon={Sparkles}
      title="No suggestions yet"
      description="Keep using the app and we'll provide personalized recommendations based on your activity."
    />
  );
}

// Error states
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Something went wrong', message = 'An unexpected error occurred. Please try again.', onRetry, className = '' }: ErrorStateProps) {
  return (
    <motion.div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
      variants={scaleFadeVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-stone-800 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 max-w-sm mb-6">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </motion.div>
  );
}

export function OfflineState() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
      variants={scaleFadeVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
        <WifiOff className="h-8 w-8 text-amber-500" />
      </div>
      <h3 className="text-lg font-semibold text-stone-800 mb-2">You're offline</h3>
      <p className="text-sm text-stone-500 max-w-sm">Check your internet connection and try again.</p>
    </motion.div>
  );
}

export default EmptyState;

