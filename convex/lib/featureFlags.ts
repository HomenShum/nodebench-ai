// convex/lib/featureFlags.ts
// Feature flags for GAM rollout

/**
 * GAM Feature Flags
 * 
 * Rollout phases:
 * - Phase 0: Shadow mode (logging only)
 * - Phase 1: Query enabled (read-only)
 * - Phase 2: Write enabled (controlled)
 * - Phase 3: Full (memory-first protocol)
 */
export const MEMORY_FLAGS = {
  // ═══════════════════════════════════════════════════════════════════
  // PHASE 0: Shadow Mode
  // ═══════════════════════════════════════════════════════════════════
  /** Log memory operations without executing */
  ENABLE_MEMORY_LOGGING: true,

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: Read-Only (ENABLED for testing)
  // ═══════════════════════════════════════════════════════════════════
  /** Allow queryMemory to return results */
  ENABLE_MEMORY_QUERY: true,  // ✓ Enabled
  
  /** Show memory status hints in UI */
  ENABLE_MEMORY_UI_HINTS: true,  // ✓ Enabled

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: Controlled Writes (ENABLED for testing)
  // ═══════════════════════════════════════════════════════════════════
  /** Allow writing to memory (updateMemoryFromReview, mergeFactsIntoMemory) */
  ENABLE_MEMORY_WRITE: true,  // ✓ Enabled
  
  /** Allow scheduling research jobs */
  ENABLE_RESEARCH_JOBS: true,  // ✓ Enabled

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 3: Full GAM
  // ═══════════════════════════════════════════════════════════════════
  /** Enforce memory-first protocol in agents */
  ENABLE_MEMORY_FIRST_PROTOCOL: false,
  
  /** Allow deep memory features (narratives, heuristics) */
  ENABLE_DEEP_MEMORY: false,

  // ═══════════════════════════════════════════════════════════════════
  // ROLLOUT CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════
  /** Percentage of users with GAM enabled (0-100) */
  MEMORY_ROLLOUT_PERCENT: 0,
  
  /** User IDs always in rollout (for testing) */
  MEMORY_USERS_ALLOWLIST: [] as string[],
};

export type MemoryFlagKey = keyof typeof MEMORY_FLAGS;

/**
 * Simple hash function for consistent user bucketing.
 */
function simpleHash(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * Check if a memory feature is enabled for a user.
 * 
 * @param userId - User ID to check
 * @param flag - Feature flag to check
 * @returns true if the feature is enabled for this user
 */
export function isMemoryEnabled(
  userId: string | null | undefined,
  flag: MemoryFlagKey
): boolean {
  // No user = no features
  if (!userId) return false;
  
  // Allowlist always gets features
  if (MEMORY_FLAGS.MEMORY_USERS_ALLOWLIST.includes(userId)) {
    return MEMORY_FLAGS[flag] as boolean;
  }
  
  // Check rollout percentage
  const userBucket = simpleHash(userId);
  const inRollout = userBucket < MEMORY_FLAGS.MEMORY_ROLLOUT_PERCENT;
  
  if (!inRollout) return false;
  
  // User is in rollout, check specific flag
  return MEMORY_FLAGS[flag] as boolean;
}

/**
 * Check multiple flags at once.
 */
export function areMemoryFlagsEnabled(
  userId: string | null | undefined,
  flags: MemoryFlagKey[]
): boolean {
  return flags.every(flag => isMemoryEnabled(userId, flag));
}

/**
 * Get current rollout status for debugging.
 */
export function getMemoryRolloutStatus(userId: string | null | undefined): {
  userId: string | null;
  inAllowlist: boolean;
  userBucket: number;
  inRolloutPercent: boolean;
  flagStatus: Record<string, boolean>;
} {
  const userBucket = userId ? simpleHash(userId) : -1;
  const inAllowlist = userId ? MEMORY_FLAGS.MEMORY_USERS_ALLOWLIST.includes(userId) : false;
  const inRolloutPercent = userBucket >= 0 && userBucket < MEMORY_FLAGS.MEMORY_ROLLOUT_PERCENT;
  
  const flagStatus: Record<string, boolean> = {};
  for (const key of Object.keys(MEMORY_FLAGS)) {
    if (key !== "MEMORY_ROLLOUT_PERCENT" && key !== "MEMORY_USERS_ALLOWLIST") {
      flagStatus[key] = isMemoryEnabled(userId, key as MemoryFlagKey);
    }
  }
  
  return {
    userId: userId ?? null,
    inAllowlist,
    userBucket,
    inRolloutPercent,
    flagStatus,
  };
}

/**
 * Enable all flags for testing.
 * WARNING: Only use in tests!
 */
export function enableAllFlagsForTesting(): void {
  MEMORY_FLAGS.ENABLE_MEMORY_LOGGING = true;
  MEMORY_FLAGS.ENABLE_MEMORY_QUERY = true;
  MEMORY_FLAGS.ENABLE_MEMORY_UI_HINTS = true;
  MEMORY_FLAGS.ENABLE_MEMORY_WRITE = true;
  MEMORY_FLAGS.ENABLE_RESEARCH_JOBS = true;
  MEMORY_FLAGS.ENABLE_MEMORY_FIRST_PROTOCOL = true;
  MEMORY_FLAGS.ENABLE_DEEP_MEMORY = true;
  MEMORY_FLAGS.MEMORY_ROLLOUT_PERCENT = 100;
}
