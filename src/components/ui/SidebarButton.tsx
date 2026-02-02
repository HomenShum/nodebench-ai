/**
 * SidebarButton - Navigation button with micro-interactions
 * 
 * Features:
 * - Subtle press feedback (scale)
 * - Active state styling
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

const activeColorStyles = {
  emerald: 'bg-emerald-50 text-emerald-900 shadow-sm',
  blue: 'bg-blue-50 text-blue-900 shadow-sm',
  purple: 'bg-purple-50 text-purple-900 shadow-sm',
  indigo: 'bg-indigo-50 text-indigo-900 shadow-sm',
  amber: 'bg-amber-50 text-amber-900 shadow-sm',
  rose: 'bg-rose-50 text-rose-900 shadow-sm',
};

const activeIconColors = {
  emerald: 'text-emerald-600',
  blue: 'text-blue-600',
  purple: 'text-purple-600',
  indigo: 'text-indigo-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
};

export function SidebarButton({
  icon,
  label,
  onClick,
  isActive = false,
  activeColor = 'emerald',
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
        'flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors duration-100 w-full text-left will-change-transform',
        isActive
          ? activeColorStyles[activeColor]
          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800',
        className
      )}
    >
      <span className={cn(
        'w-4 h-4 flex-shrink-0 [&>svg]:w-full [&>svg]:h-full',
        isActive ? activeIconColors[activeColor] : 'text-stone-400'
      )}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-stone-200 text-stone-600">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </motion.button>
  );
}

export default SidebarButton;
