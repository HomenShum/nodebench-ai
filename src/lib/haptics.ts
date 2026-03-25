/**
 * haptics.ts — Lightweight haptic feedback for mobile interactions.
 *
 * Uses the Vibration API (supported on Android Chrome, partial iOS Safari).
 * Silently no-ops on unsupported platforms.
 */

export function haptic(style: "light" | "medium" | "success") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const patterns: Record<string, number | number[]> = {
    light: 10,
    medium: 25,
    success: [15, 50, 15],
  };
  try {
    navigator.vibrate(patterns[style]);
  } catch {
    // Vibration API may throw on some platforms — silently ignore
  }
}
