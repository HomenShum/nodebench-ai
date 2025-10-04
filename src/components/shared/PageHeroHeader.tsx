import React, { ReactNode } from "react";

interface PageHeroHeaderProps {
  icon?: ReactNode; // Emoji or icon element before title
  title: ReactNode;
  date?: ReactNode; // small muted date element to the right of title
  subtitle?: ReactNode;
  presets?: ReactNode; // optional row of preset buttons/controls
  className?: string;
}

/**
 * Standardized hero header used below the top divider bar.
 * - No outer margins so parent containers can control spacing via space-y utilities.
 */
export function PageHeroHeader({ icon, title, date, subtitle, presets, className }: PageHeroHeaderProps) {
  return (
    <div className={className}>
      <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        {icon}
        {title}
        {date ? <span className="text-sm font-normal text-gray-500 ml-auto">{date}</span> : null}
      </h1>
      {subtitle ? (
        <p className="text-gray-600">{subtitle}</p>
      ) : null}
      {presets ? (
        <div className="mt-3 pb-4 flex flex-wrap gap-2">{presets}</div>
      ) : null}
    </div>
  );
}

