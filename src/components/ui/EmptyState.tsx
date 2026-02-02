/**
 * EmptyState - Illustrated empty states for various scenarios
 * 
 * Features:
 * - Animated SVG illustrations
 * - Action buttons
 * - Customizable title/description
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

type EmptyStateVariant = 'documents' | 'search' | 'inbox' | 'tasks' | 'error' | 'success';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const illustrations: Record<EmptyStateVariant, React.ReactNode> = {
  documents: (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <motion.rect
        x="25" y="20" width="70" height="85" rx="4"
        fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="2"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      />
      <motion.rect
        x="35" y="35" width="40" height="4" rx="2"
        fill="#a8a29e"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.3 }}
      />
      <motion.rect
        x="35" y="45" width="50" height="3" rx="1.5"
        fill="#d6d3d1"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.4 }}
      />
      <motion.rect
        x="35" y="53" width="45" height="3" rx="1.5"
        fill="#d6d3d1"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5 }}
      />
      <motion.rect
        x="35" y="61" width="35" height="3" rx="1.5"
        fill="#d6d3d1"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.6 }}
      />
      <motion.circle
        cx="90" cy="90" r="20"
        fill="#10b981" fillOpacity="0.1"
        stroke="#10b981" strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
      />
      <motion.path
        d="M82 90L88 96L98 84"
        stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <motion.circle
        cx="50" cy="50" r="30"
        fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="3"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring' }}
      />
      <motion.line
        x1="72" y1="72" x2="100" y2="100"
        stroke="#a8a29e" strokeWidth="6" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3 }}
      />
      <motion.text
        x="50" y="55" textAnchor="middle"
        fill="#a8a29e" fontSize="24" fontWeight="300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        ?
      </motion.text>
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <motion.path
        d="M20 50L60 20L100 50V95C100 97.7614 97.7614 100 95 100H25C22.2386 100 20 97.7614 20 95V50Z"
        fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      />
      <motion.path
        d="M20 50L60 75L100 50"
        stroke="#d6d3d1" strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3 }}
      />
      <motion.circle
        cx="60" cy="60" r="8"
        fill="#a8a29e"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
      />
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <motion.rect
        x="20" y="25" width="80" height="70" rx="6"
        fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="2"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      />
      {[40, 55, 70].map((y, i) => (
        <React.Fragment key={y}>
          <motion.rect
            x="30" y={y} width="12" height="12" rx="3"
            fill="white" stroke="#d6d3d1" strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          />
          <motion.rect
            x="50" y={y + 4} width={40 - i * 8} height="4" rx="2"
            fill="#d6d3d1"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          />
        </React.Fragment>
      ))}
    </svg>
  ),
  error: (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <motion.circle
        cx="60" cy="60" r="40"
        fill="#fef2f2" stroke="#fca5a5" strokeWidth="3"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' }}
      />
      <motion.path
        d="M45 45L75 75M75 45L45 75"
        stroke="#ef4444" strokeWidth="4" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      <motion.circle
        cx="60" cy="60" r="40"
        fill="#ecfdf5" stroke="#6ee7b7" strokeWidth="3"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' }}
      />
      <motion.path
        d="M40 60L55 75L80 45"
        stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      />
    </svg>
  ),
};

export function EmptyState({
  variant = 'documents',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      <div className="w-32 h-32 mb-6">
        {illustrations[variant]}
      </div>
      
      <h3 className="text-lg font-semibold text-stone-800 mb-2">{title}</h3>
      
      {description && (
        <p className="text-sm text-stone-500 max-w-sm mb-6">{description}</p>
      )}
      
      {action && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className="px-5 py-2.5 bg-emerald-900 text-white text-sm font-medium rounded-lg hover:bg-emerald-800 transition-colors shadow-sm"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

export default EmptyState;
