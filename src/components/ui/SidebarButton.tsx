/**
 * SidebarButton - Navigation button with micro-interactions
 *
 * Features:
 * - Subtle press feedback (scale)
 * - Monochrome active state (Linear-style)
 * - Icon + label layout
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  activeColor?: 'emerald' | 'blue' | 'purple' | 'indigo' | 'amber' | 'rose';
  badge?: number;
  className?: string;
}

export function SidebarButton({
  icon,
  label,
  onClick,
  isActive = false,
  activeColor: _activeColor = 'emerald',
  badge,
  className,
}: SidebarButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'tween', duration: 0.1 }}
      className={cn(
        'flex items-center gap-2.5 px-2 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-150 w-full text-left will-change-transform',
        isActive
          ? 'bg-black/[0.06] dark:bg-white/[0.08] text-gray-900 dark:text-gray-100'
          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300',
        className
      )}
    >
      <span className={cn(
        'w-4 h-4 flex-shrink-0 [&>svg]:w-full [&>svg]:h-full',
        isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'
      )}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-200 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </motion.button>
  );
}

export default SidebarButton;
