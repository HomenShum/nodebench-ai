import React, { Suspense, useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "./ErrorBoundary";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

interface LazyViewProps {
  children: React.ReactNode;
  /** ErrorBoundary title shown when this view crashes */
  title?: string;
  /** Optional wrapper className (e.g. "h-full overflow-auto bg-background") */
  className?: string;
  /** Suspense fallback for lazy-loaded children */
  fallback?: React.ReactNode;
  /** Optional reset key to re-mount the view on navigation changes */
  resetKey?: React.Key;
  /** Optional hook for retry (e.g. refetch) */
  onRetry?: () => void;
}

/**
 * LazyView — Per-view error isolation for lazy-loaded routes.
 *
 * Wraps each view in its own ErrorBoundary so a crash in one view
 * doesn't take down the entire content area. The parent Suspense
 * handles the loading state; this handles the error state.
 *
 * Includes a subtle fade+slide transition between views that
 * respects prefers-reduced-motion.
 */
export function LazyView({ children, title, className, fallback, resetKey, onRetry }: LazyViewProps) {
  const [retry, setRetry] = useState(0);

  const boundaryKey = useMemo(() => `${String(resetKey ?? "view")}::${retry}`, [resetKey, retry]);

  const handleRetry = useCallback(() => {
    setRetry((v) => v + 1);
    onRetry?.();
  }, [onRetry]);

  const innerClass = className ? className : "h-full";
  const reduced = prefersReducedMotion();

  const content = reduced ? (
    <div className={innerClass}>{children}</div>
  ) : (
    <AnimatePresence mode="wait">
      <motion.div
        key={String(resetKey ?? "view")}
        className={innerClass}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <ErrorBoundary key={boundaryKey} title={title || "Something went wrong"} onRetry={handleRetry}>
      <Suspense fallback={fallback ?? null}>{content}</Suspense>
    </ErrorBoundary>
  );
}
