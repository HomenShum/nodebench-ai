import React, { forwardRef } from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md";
};

function joinClasses(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "ghost", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center gap-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:opacity-60 disabled:cursor-not-allowed";
    const sizes = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
    const variants =
      variant === "primary"
        ? "bg-[var(--accent-primary)] text-white hover:bg-[#5558e3] shadow-sm"
        : variant === "outline"
        ? "border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
        : variant === "destructive"
        ? "bg-[var(--danger)] text-white hover:brightness-95"
        : "border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]";

    return (
      <button ref={ref} className={joinClasses(base, sizes, variants, className)} {...props} />
    );
  }
);
Button.displayName = "Button";

