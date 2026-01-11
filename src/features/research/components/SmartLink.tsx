import React, { useState, useRef, useEffect, useId } from "react";
import { Info } from "lucide-react";

interface SmartLinkProps {
  children: React.ReactNode;
  summary?: string;
  source?: string;
}

/**
 * SmartLink - An accessible hover/focus card for inline terms.
 * Supports keyboard navigation (focus-within) and proper ARIA attributes.
 */
export const SmartLink: React.FC<SmartLinkProps> = ({ children, summary, source }) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(true), 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(false), 100);
  };

  if (!summary) {
    return <span className="font-semibold text-[color:var(--text-primary)]">{children}</span>;
  }

  return (
    <span
      className="group relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="cursor-help font-medium text-blue-700 decoration-blue-300/60 decoration-2 underline underline-offset-4 transition-colors hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 rounded-sm px-0.5"
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        tabIndex={0}
      >
        {children}
      </button>

      {/* Tooltip Card - inline-safe spans to avoid block nesting in <p> */}
      <span
        id={tooltipId}
        role="tooltip"
        className={`
          pointer-events-none absolute left-0 top-full z-50 w-72 translate-y-2 rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] p-3 text-left shadow-xl ring-1 ring-black/5
          transition-all duration-200 origin-top
          ${isOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}
        `}
      >
        <span className="flex flex-col gap-1">
          <span className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-secondary)]">Context</span>
          </span>
          <span className="text-sm leading-relaxed text-[color:var(--text-primary)] font-sans">{summary}</span>
          {source && (
            <span className="border-t border-[color:var(--border-color)] pt-2 text-[10px] text-[color:var(--text-secondary)]">Source: {source}</span>
          )}
        </span>
      </span>
    </span>
  );
};

export default SmartLink;
