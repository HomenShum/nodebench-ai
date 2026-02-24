/**
 * SignatureOrb — Central visual identity element
 *
 * The orb is NodeBench's brand mark. It appears across the app in different
 * forms — never the same way twice, but always recognizable:
 *
 *   hero      → Full rotating rings + pulsing core (landing page)
 *   loading   → Medium spinning ring (replaces generic spinners)
 *   ambient   → Soft background glow (page header decoration)
 *   indicator → Tiny pulsing dot with ring (live status)
 *   empty     → Static orb with message (empty states)
 */

import React, { useMemo } from "react";
import { prefersReducedMotion } from "../../utils/a11y";

export type OrbVariant = "hero" | "loading" | "ambient" | "indicator" | "empty";

export interface SignatureOrbProps {
  variant?: OrbVariant;
  /** Optional message for empty variant */
  message?: string;
  /** Additional className */
  className?: string;
}

export function SignatureOrb({
  variant = "loading",
  message,
  className = "",
}: SignatureOrbProps) {
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);

  switch (variant) {
    // ─── HERO: Full-size rotating rings + pulsing core ───────────────
    case "hero":
      return (
        <div className={`relative flex items-center justify-center ${className}`}>
          <div className="w-44 h-44 md:w-56 md:h-56 relative flex items-center justify-center">
            {/* Rotating outer rings */}
            <div
              className={`absolute inset-0 will-change-transform ${reduceMotion ? "" : "motion-safe:animate-spin-slow"}`}
            >
              <div className="absolute inset-0 rounded-full border border-edge scale-100" />
              <div className="absolute inset-0 rounded-full border border-[var(--accent-primary)]/20 scale-[1.3]" />
            </div>
            {/* Glow halo */}
            <div className="absolute inset-0 rounded-full bg-[var(--accent-primary)]/[0.06] blur-2xl scale-[1.3]" />
            {/* Pulsing core */}
            <div
              className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-surface border border-edge overflow-hidden shadow-sm ${reduceMotion ? "" : "motion-safe:animate-pulse-subtle"}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/[0.08] via-transparent to-[var(--accent-primary)]/[0.04] rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[var(--accent-primary)]/60 shadow-[0_0_20px_var(--accent-primary)]" />
              </div>
            </div>
          </div>
        </div>
      );

    // ─── LOADING: Medium spinning ring for page transitions ──────────
    case "loading":
      return (
        <div
          className={`flex flex-col items-center justify-center gap-3 ${className}`}
          role="status"
          aria-label="Loading"
        >
          <div className="w-16 h-16 relative flex items-center justify-center">
            {/* Spinning ring */}
            <div
              className={`absolute inset-0 rounded-full border-2 border-edge border-t-[var(--accent-primary)] ${reduceMotion ? "" : "motion-safe:animate-spin"}`}
              style={reduceMotion ? undefined : { animationDuration: "1.2s" }}
            />
            {/* Static inner dot */}
            <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]/50" />
          </div>
        </div>
      );

    // ─── AMBIENT: Soft glow for page headers ─────────────────────────
    case "ambient":
      return (
        <div
          className={`absolute pointer-events-none ${className}`}
          aria-hidden="true"
        >
          <div className="w-[300px] h-[300px] rounded-full bg-[var(--accent-primary)]/[0.04] blur-[80px]" />
        </div>
      );

    // ─── INDICATOR: Tiny pulsing dot for live status ─────────────────
    case "indicator":
      return (
        <span
          className={`relative inline-flex items-center justify-center ${className}`}
          role="status"
          aria-label="Active"
        >
          {/* Ping ring */}
          {!reduceMotion && (
            <span className="absolute w-3 h-3 rounded-full bg-[var(--accent-primary)]/30 motion-safe:animate-ping" />
          )}
          {/* Static dot */}
          <span className="relative w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
        </span>
      );

    // ─── EMPTY: Static orb with message ──────────────────────────────
    case "empty":
      return (
        <div
          className={`flex flex-col items-center justify-center gap-4 py-8 ${className}`}
        >
          <div className="w-24 h-24 relative flex items-center justify-center">
            {/* Static rings */}
            <div className="absolute inset-0 rounded-full border border-edge scale-100 opacity-60" />
            <div className="absolute inset-0 rounded-full border border-edge scale-[1.25] opacity-30" />
            {/* Core */}
            <div className="w-14 h-14 rounded-full bg-surface-secondary border border-edge flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-content-muted/40" />
            </div>
          </div>
          {message && (
            <p className="text-sm text-content-muted text-center max-w-xs">
              {message}
            </p>
          )}
        </div>
      );

    default:
      return null;
  }
}

export default SignatureOrb;
