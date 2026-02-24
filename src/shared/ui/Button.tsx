import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

function joinClasses(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const sizeMap = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-5 py-2.5 text-base",
} as const;

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "ghost", size = "md", loading, children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-60 disabled:cursor-not-allowed";
    const sizes = sizeMap[size];
    const variants =
      variant === "primary"
        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
        : variant === "outline"
        ? "border border-edge text-content hover:bg-surface-hover"
        : variant === "destructive"
        ? "bg-red-600 text-white hover:bg-red-700"
        : "border border-edge bg-surface hover:bg-surface-hover text-content";

    return (
      <button ref={ref} className={joinClasses(base, sizes, variants, className)} disabled={disabled || loading} {...props}>
        {loading && <Loader2 className="w-4 h-4 motion-safe:animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

