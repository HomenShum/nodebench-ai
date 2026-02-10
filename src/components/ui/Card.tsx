/**
 * Card - Industry-standard card with hover micro-interactions
 * 
 * Features:
 * - Hover elevation (y-translate + shadow increase)
 * - Click feedback for interactive cards
 * - Consistent border radius and spacing
 */

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLMotionProps<'div'> {
  /** Make the card interactive with hover/click effects */
  interactive?: boolean;
  /** Add a subtle border */
  bordered?: boolean;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      interactive = false,
      bordered = true,
      padding = 'md',
      className,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const isClickable = interactive || !!onClick;

    return (
      <motion.div
        ref={ref}
        whileHover={isClickable ? { y: -2, boxShadow: '0 0 0 1px rgba(0,0,0,0.03), 0 4px 8px rgba(0,0,0,0.04), 0 24px 48px rgba(0,0,0,0.08)' } : undefined}
        whileTap={isClickable ? { scale: 0.995 } : undefined}
        transition={{ type: 'tween', duration: 0.15 }}
        className={cn(
          'bg-card rounded-xl',
          bordered && 'border border-gray-200/60',
          paddingStyles[padding],
          isClickable && 'cursor-pointer will-change-transform',
          'shadow-sm transition-all duration-150',
          className
        )}
        onClick={onClick}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

/** Card header section */
export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      {children}
    </div>
  );
}

/** Card title */
export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h3 className={cn('text-base font-semibold text-gray-900 tracking-tight', className)}>
      {children}
    </h3>
  );
}

/** Card description */
export function CardDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <p className={cn('text-sm text-gray-500', className)}>
      {children}
    </p>
  );
}

/** Card content section */
export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
}

/** Card footer section */
export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-center gap-2 mt-4 pt-3 border-t border-gray-100', className)}>
      {children}
    </div>
  );
}

export default Card;
