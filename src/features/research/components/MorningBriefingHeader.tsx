/**
 * MorningBriefingHeader - Personalized greeting with update count
 * 
 * "Good morning, Homen. 3 sectors updated overnight."
 * Uses elegant serif typography for a newspaper feel.
 */

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';

interface MorningBriefingHeaderProps {
  userName?: string;
  updateCount?: number;
  className?: string;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getFirstName(fullName?: string): string {
  if (!fullName) return 'there';
  return fullName.split(' ')[0] || fullName;
}

export function MorningBriefingHeader({
  userName,
  updateCount = 0,
  className = '',
}: MorningBriefingHeaderProps) {
  const greeting = useMemo(() => {
    const timeOfDay = getTimeOfDay();
    const firstName = getFirstName(userName);
    return `Good ${timeOfDay}, ${firstName}`;
  }, [userName]);

  const updateMessage = useMemo(() => {
    if (updateCount === 0) {
      return 'Your intelligence sources are synced.';
    }
    if (updateCount === 1) {
      return '1 source updated overnight.';
    }
    return `${updateCount} sources updated overnight.`;
  }, [updateCount]);

  return (
    <div className={`text-center space-y-2 ${className}`}>
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[color:var(--text-primary)]/5 text-[color:var(--text-primary)] rounded-full text-xs font-medium border border-[color:var(--border-color)]">
        <Sparkles className="w-3 h-3" />
        <span>Intelligence Dashboard</span>
      </div>

      {/* Main Greeting - Serif Font for Newspaper Feel */}
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[color:var(--text-primary)]">
        {greeting}.
      </h1>

      {/* Update Status */}
      <p className="text-base text-[color:var(--text-primary)] font-medium">
        {updateMessage}
      </p>
    </div>
  );
}

export default MorningBriefingHeader;

