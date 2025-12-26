import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTimeContext, getActiveWidgetType } from '../../hooks/useTimeContext';
import { MorningDigestWidget } from './MorningDigestWidget';
import { AfternoonProductivityWidget } from './AfternoonProductivityWidget';
import { EveningReviewWidget } from './EveningReviewWidget';
import { WeekendPlannerWidget } from './WeekendPlannerWidget';

interface AdaptiveWidgetProps {
  userName?: string;
  onNavigate?: (path: string) => void;
  onStartFocus?: () => void;
  className?: string;
}

/**
 * Adaptive widget that displays different content based on time of day
 * - Morning (5am-12pm): Daily digest with tasks and meetings
 * - Afternoon (12pm-5pm): Productivity focus with progress tracking
 * - Evening (5pm-9pm): Daily review and reflection
 * - Weekend: Week planning and relaxation mode
 */
export function AdaptiveWidget({
  userName,
  onNavigate,
  onStartFocus,
  className = '',
}: AdaptiveWidgetProps) {
  const timeContext = useTimeContext();
  const widgetType = getActiveWidgetType(timeContext);

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        <motion.div
          key={widgetType}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {widgetType === 'morning' && (
            <MorningDigestWidget userName={userName} onNavigate={onNavigate} />
          )}
          {widgetType === 'afternoon' && (
            <AfternoonProductivityWidget onNavigate={onNavigate} onStartFocus={onStartFocus} />
          )}
          {widgetType === 'evening' && <EveningReviewWidget onNavigate={onNavigate} />}
          {widgetType === 'weekend' && <WeekendPlannerWidget onNavigate={onNavigate} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default AdaptiveWidget;

