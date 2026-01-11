"use client";

import React from "react";

export type ActId = "actI" | "actII" | "actIII";

interface ActProgressIndicatorProps {
  currentAct: ActId;
  onActChange?: (act: ActId) => void;
  className?: string;
}

const ACTS: { id: ActId; label: string; subtitle: string }[] = [
  { id: "actI", label: "Act I", subtitle: "Composition" },
  { id: "actII", label: "Act II", subtitle: "Change" },
  { id: "actIII", label: "Act III", subtitle: "Decision" },
];

const ActProgressIndicator: React.FC<ActProgressIndicatorProps> = ({
  currentAct,
  onActChange,
  className = "",
}) => {
  const activeIndex = ACTS.findIndex((act) => act.id === currentAct);
  const safeIndex = activeIndex === -1 ? 0 : activeIndex;
  const progressPercent =
    ACTS.length > 1 ? (safeIndex / (ACTS.length - 1)) * 100 : 100;

  return (
    <div
      className={`rounded-xl border border-[color:var(--border-color)] bg-[#fbfaf2]/90 px-3 py-2 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-semibold tracking-wide text-[color:var(--text-primary)] uppercase">
          Story Acts
        </span>
        <span className="text-[11px] text-[color:var(--text-secondary)]">
          {ACTS[safeIndex]?.label ?? "Act I"}
        </span>
      </div>
      <div className="mt-1">
        {/* Progress bar */}
        <div className="relative h-1.5 w-full rounded-full bg-[color:var(--bg-secondary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gray-900 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {/* Act markers */}
        <div className="mt-2 flex items-center justify-between">
          {ACTS.map((act) => {
            const isActive = act.id === currentAct;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => onActChange?.(act.id)}
                className="group flex flex-col items-center gap-0.5 focus:outline-none"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive
                      ? "bg-gray-900"
                      : "bg-[color:var(--text-secondary)] group-hover:bg-[color:var(--text-primary)]"
                  }`}
                />
                <span
                  className={`text-[9px] font-medium ${
                    isActive ? "text-[color:var(--text-primary)]" : "text-[color:var(--text-secondary)]"
                  }`}
                >
                  {act.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ActProgressIndicator;
