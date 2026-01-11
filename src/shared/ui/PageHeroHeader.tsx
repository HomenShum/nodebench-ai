import React, { ReactNode } from "react";

interface PageHeroHeaderProps {
  icon?: ReactNode; // Emoji or icon element before title
  title: ReactNode;
  date?: ReactNode; // small muted date element to the right of title
  subtitle?: ReactNode;
  presets?: ReactNode; // optional row of preset buttons/controls
  className?: string;
  /** Enable premium underline accent on title (like WelcomeLanding) */
  accent?: boolean;
}

/**
 * Standardized hero header used below the top divider bar.
 * Premium SaaS styling with optional underline accent.
 */
export function PageHeroHeader({ icon, title, date, subtitle, presets, className, accent = false }: PageHeroHeaderProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-3 font-serif">
          {icon && <span className="text-2xl opacity-90">{icon}</span>}
          {accent ? (
            <span className="underline decoration-[var(--text-primary)]/40 decoration-[3px] underline-offset-[8px]">{title}</span>
          ) : (
            <span>{title}</span>
          )}
        </h1>
        {date && (
          <span className="text-sm font-medium text-[var(--text-muted)] tabular-nums whitespace-nowrap font-sans">{date}</span>
        )}
      </div>
      {subtitle && (
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-xl">{subtitle}</p>
      )}
      {presets && (
        <div className="mt-5 pb-2 flex flex-wrap gap-2">{presets}</div>
      )}
    </div>
  );
}

