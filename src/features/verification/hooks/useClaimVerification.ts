// src/features/verification/hooks/useClaimVerification.ts
// React hooks for claim verification status
// Used by EvidenceChips to display verification badges

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type Verdict = "supported" | "not_found" | "contradicted" | "inaccessible";

export interface ClaimVerification {
  runId: string;
  factId: string;
  artifactId: string;
  verdict: Verdict;
  confidence: number;
  explanation?: string;
  snippet?: string;
  createdAt: number;
}

export interface FactVerificationSummary {
  factId: string;
  totalSources: number;
  supported: number;
  notFound: number;
  contradicted: number;
  inaccessible: number;
  overallStatus: "verified" | "partial" | "unverified" | "contradicted";
  verifications: ClaimVerification[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all claim verifications for a run
 */
export function useClaimVerifications(runId: string | undefined) {
  const verifications = useQuery(
    api.domains.verification.claimVerifications.getVerificationsByRun,
    runId ? { runId } : "skip"
  );

  return {
    verifications: verifications || [],
    isLoading: verifications === undefined,
  };
}

/**
 * Get verification status for a specific fact
 */
export function useFactVerification(
  runId: string | undefined,
  factId: string | undefined
): FactVerificationSummary | null {
  const verifications = useQuery(
    api.domains.verification.claimVerifications.getVerificationsForFact,
    runId && factId ? { runId, factId } : "skip"
  );

  return useMemo(() => {
    if (!verifications || verifications.length === 0) return null;

    const summary: FactVerificationSummary = {
      factId: factId!,
      totalSources: verifications.length,
      supported: 0,
      notFound: 0,
      contradicted: 0,
      inaccessible: 0,
      overallStatus: "unverified",
      verifications,
    };

    for (const v of verifications) {
      switch (v.verdict) {
        case "supported":
          summary.supported++;
          break;
        case "not_found":
          summary.notFound++;
          break;
        case "contradicted":
          summary.contradicted++;
          break;
        case "inaccessible":
          summary.inaccessible++;
          break;
      }
    }

    // Determine overall status
    if (summary.contradicted > 0) {
      summary.overallStatus = "contradicted";
    } else if (summary.supported > 0 && summary.notFound === 0) {
      summary.overallStatus = "verified";
    } else if (summary.supported > 0) {
      summary.overallStatus = "partial";
    } else {
      summary.overallStatus = "unverified";
    }

    return summary;
  }, [verifications, factId]);
}

/**
 * Get verification badge info for display
 */
export function useVerificationBadge(
  runId: string | undefined,
  factId: string | undefined
) {
  const summary = useFactVerification(runId, factId);

  return useMemo(() => {
    if (!summary) {
      return {
        status: "unverified" as const,
        icon: "○",
        color: "gray",
        label: "Unverified",
        tooltip: "This claim has not been verified",
      };
    }

    switch (summary.overallStatus) {
      case "verified":
        return {
          status: "verified" as const,
          icon: "✓",
          color: "green",
          label: `Verified (${summary.supported}/${summary.totalSources})`,
          tooltip: `${summary.supported} source(s) support this claim`,
          verifications: summary.verifications,
        };
      case "partial":
        return {
          status: "partial" as const,
          icon: "◐",
          color: "yellow",
          label: `Partial (${summary.supported}/${summary.totalSources})`,
          tooltip: `${summary.supported} source(s) support, ${summary.notFound} not found`,
          verifications: summary.verifications,
        };
      case "contradicted":
        return {
          status: "contradicted" as const,
          icon: "✗",
          color: "red",
          label: "Contradicted",
          tooltip: `${summary.contradicted} source(s) contradict this claim`,
          verifications: summary.verifications,
        };
      default:
        return {
          status: "unverified" as const,
          icon: "○",
          color: "gray",
          label: "Unverified",
          tooltip: "Sources checked but claim not found",
          verifications: summary.verifications,
        };
    }
  }, [summary]);
}

/**
 * Hook to request verification of a specific fact (on-demand)
 */
export function useRequestVerification() {
  // This would need a mutation that schedules verification
  // For now, return a placeholder
  return {
    requestVerification: async (runId: string, factId: string) => {
      console.log(`[useRequestVerification] Would verify fact ${factId} in run ${runId}`);
      // TODO: Call mutation to schedule verification
    },
    isRequesting: false,
  };
}
