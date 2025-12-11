/**
 * Lightweight button class presets for consistent Daily Brief UX.
 */

export const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const buttonSecondary =
  `${buttonBase} bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border-[var(--border-color)]`;

export const buttonDanger =
  `${buttonBase} bg-white hover:bg-red-50 text-red-700 border-red-200`;

export const buttonIcon =
  "p-1 rounded transition-colors hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed";

