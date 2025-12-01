// src/features/verification/index.ts
// Re-exports for verification feature

// Hooks
export {
  useScrubCitations,
  useScrubbedText,
  useHasUnverifiedCitations,
} from "./hooks/useScrubCitations";

export {
  useClaimVerifications,
  useFactVerification,
  useVerificationBadge,
  useRequestVerification,
  type Verdict,
  type ClaimVerification,
  type FactVerificationSummary,
} from "./hooks/useClaimVerification";
