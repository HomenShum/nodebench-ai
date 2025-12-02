import React from "react";

function joinClasses(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "info";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default:
      "border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)]",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    info: "border-[var(--accent-primary)]/30 bg-[var(--accent-muted)] text-[var(--text-primary)]",
  };
  return (
    <span
      className={joinClasses(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        tones[tone] ?? tones.default,
        className
      )}
    >
      {children}
    </span>
  );
}

