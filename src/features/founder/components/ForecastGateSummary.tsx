import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ForecastGateCard } from "@/features/controlPlane/components/ForecastGateCard";
import type { ResultForecastGate } from "@/features/controlPlane/components/searchTypes";

type SearchSessionResult = {
  result?: {
    forecastGate?: ResultForecastGate;
    entityName?: string;
    canonicalEntity?: string;
    temporalTrajectory?: {
      valuesCount?: number;
      modelUsed?: string;
    };
  };
};

export function ForecastGateSummary({
  surface,
}: {
  surface: "workspace" | "packets" | "history";
}) {
  const sessions = useQuery(api.domains.search.searchPipeline.listRecentSearches, { limit: 25 }) as
    | SearchSessionResult[]
    | undefined;

  const latestGate = useMemo(() => {
    const session = sessions?.find((item) => item?.result?.forecastGate);
    return {
      gate: session?.result?.forecastGate ?? null,
      entityName: session?.result?.entityName ?? session?.result?.canonicalEntity,
    };
  }, [sessions]);

  if (!latestGate.gate) {
    return (
      <section className="mt-6 w-full max-w-2xl rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
          Temporal Gate
        </div>
        <p className="mt-2 text-sm leading-relaxed text-content-secondary">
          Search an entity from Ask to start a repeated-confidence stream. NodeBench will show whether to reuse,
          refresh, escalate, or hand off the packet once enough observations exist.
        </p>
      </section>
    );
  }

  const surfaceLabel =
    surface === "workspace"
      ? "workspace routing"
      : surface === "packets"
        ? "packet freshness"
        : "history review";

  return (
    <div className="mt-6 w-full max-w-2xl">
      <ForecastGateCard
        gate={latestGate.gate}
        className="w-full"
      />
      <p className="mt-2 text-xs text-content-muted">
        Latest entity: {latestGate.entityName ?? "current entity"}. Used for {surfaceLabel}; forecasts are never used
        as causal proof.
      </p>
    </div>
  );
}

export default ForecastGateSummary;
