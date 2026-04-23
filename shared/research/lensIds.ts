/**
 * Lens IDs
 *
 * A lens is a projection of the canonical entity graph into a hierarchical
 * card view. One lens per intent ("dossier on a company", "prep for an event",
 * "deep dive on a person", ...).
 *
 * v1 ships `company_dossier` only. Other lens templates exist as type
 * placeholders for forward-compatible routing — do not implement them until
 * `company_dossier` is fully proven end-to-end.
 */

export const LENS_IDS = [
  "company_dossier",
  "event_brief",
  "person_deep_dive",
  "product_map",
  "topic_monitor",
] as const;

export type LensId = (typeof LENS_IDS)[number];

export const LENS_DISPLAY_NAMES: Record<LensId, string> = {
  company_dossier: "Company Dossier",
  event_brief: "Event Brief",
  person_deep_dive: "Person Deep Dive",
  product_map: "Product Map",
  topic_monitor: "Topic Monitor",
};

/** Depth budgets — see agentic_reliability.md (TIMEOUT rule). */
export const DEPTH_POLICY = {
  quick: { maxRings: 1, maxAngles: 2, maxArtifacts: 8, latencyBudgetMs: 6_000 },
  standard: { maxRings: 2, maxAngles: 3, maxArtifacts: 20, latencyBudgetMs: 12_000 },
  // Defer `comprehensive` and `exhaustive` to v2 per locked v1 scope.
} as const;

export type DepthId = keyof typeof DEPTH_POLICY;
