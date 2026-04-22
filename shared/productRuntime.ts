export type ProductRunBudgetStatus = "ok" | "warning" | "exceeded";

export type ProductToolEventSnapshot = {
  tool: string;
  provider?: string | null;
  model?: string | null;
  step: number;
  totalPlanned: number;
  status: "running" | "done" | "error";
  durationMs?: number | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  startedAt: number;
  updatedAt: number;
};

export type ProductProviderBudgetRow = {
  provider: string;
  callBudget: number;
  tokenBudget: number | null;
  calls: number;
  completedCalls: number;
  erroredCalls: number;
  runningCalls: number;
  tokensIn: number;
  tokensOut: number;
  totalTokens: number;
  avgDurationMs: number;
  dominantModel: string | null;
  utilizationPct: number;
  status: ProductRunBudgetStatus;
};

export type ProductProviderBudgetSummary = {
  overallStatus: ProductRunBudgetStatus;
  providers: ProductProviderBudgetRow[];
  totals: {
    providers: number;
    calls: number;
    completedCalls: number;
    erroredCalls: number;
    runningCalls: number;
    tokensIn: number;
    tokensOut: number;
    totalTokens: number;
    avgDurationMs: number;
  };
};

type ProviderBudgetConfig = {
  callBudget: number;
  tokenBudget: number | null;
};

const DEFAULT_PROVIDER_NAME = "runtime";

function normalizeProviderName(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_PROVIDER_NAME;
}

function compareBudgetStatus(
  left: ProductRunBudgetStatus,
  right: ProductRunBudgetStatus,
): number {
  const rank = {
    ok: 0,
    warning: 1,
    exceeded: 2,
  } as const;
  return rank[left] - rank[right];
}

export function getProductProviderBudgetConfig(
  provider: string | null | undefined,
): ProviderBudgetConfig {
  const normalized = normalizeProviderName(provider).toLowerCase();

  if (
    normalized.includes("linkup") ||
    normalized.includes("search") ||
    normalized.includes("fetch") ||
    normalized.includes("web")
  ) {
    return {
      callBudget: 10,
      tokenBudget: null,
    };
  }

  if (
    normalized.includes("openai") ||
    normalized.includes("gpt") ||
    normalized.includes("anthropic") ||
    normalized.includes("claude") ||
    normalized.includes("google") ||
    normalized.includes("gemini")
  ) {
    return {
      callBudget: 8,
      tokenBudget: 120_000,
    };
  }

  return {
    callBudget: 8,
    tokenBudget: 80_000,
  };
}

export function getProductBudgetStatus(
  utilizationPct: number,
): ProductRunBudgetStatus {
  if (utilizationPct >= 100) return "exceeded";
  if (utilizationPct >= 70) return "warning";
  return "ok";
}

export function buildProductProviderBudgetSummary(
  toolEvents: ProductToolEventSnapshot[],
): ProductProviderBudgetSummary {
  const grouped = new Map<
    string,
    {
      row: ProductProviderBudgetRow;
      durationSamples: number[];
      modelCounts: Map<string, number>;
    }
  >();

  for (const event of toolEvents) {
    const provider = normalizeProviderName(event.provider);
    const config = getProductProviderBudgetConfig(provider);
    const existing = grouped.get(provider) ?? {
      row: {
        provider,
        callBudget: config.callBudget,
        tokenBudget: config.tokenBudget,
        calls: 0,
        completedCalls: 0,
        erroredCalls: 0,
        runningCalls: 0,
        tokensIn: 0,
        tokensOut: 0,
        totalTokens: 0,
        avgDurationMs: 0,
        dominantModel: null,
        utilizationPct: 0,
        status: "ok" as ProductRunBudgetStatus,
      },
      durationSamples: [],
      modelCounts: new Map<string, number>(),
    };

    existing.row.calls += 1;
    if (event.status === "done") existing.row.completedCalls += 1;
    if (event.status === "error") existing.row.erroredCalls += 1;
    if (event.status === "running") existing.row.runningCalls += 1;

    const tokensIn = Number(event.tokensIn ?? 0);
    const tokensOut = Number(event.tokensOut ?? 0);
    existing.row.tokensIn += Number.isFinite(tokensIn) ? tokensIn : 0;
    existing.row.tokensOut += Number.isFinite(tokensOut) ? tokensOut : 0;

    const durationMs = Number(event.durationMs ?? 0);
    if (Number.isFinite(durationMs) && durationMs > 0) {
      existing.durationSamples.push(durationMs);
    }

    const model = String(event.model ?? "").trim();
    if (model.length > 0) {
      existing.modelCounts.set(model, (existing.modelCounts.get(model) ?? 0) + 1);
    }

    grouped.set(provider, existing);
  }

  let overallStatus: ProductRunBudgetStatus = "ok";
  let totalCalls = 0;
  let totalCompletedCalls = 0;
  let totalErroredCalls = 0;
  let totalRunningCalls = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  const allDurations: number[] = [];

  const providers = Array.from(grouped.values())
    .map(({ row, durationSamples, modelCounts }) => {
      row.totalTokens = row.tokensIn + row.tokensOut;
      row.avgDurationMs =
        durationSamples.length > 0
          ? Math.round(
              durationSamples.reduce((sum, value) => sum + value, 0) /
                durationSamples.length,
            )
          : 0;
      allDurations.push(...durationSamples);

      let dominantModel: string | null = null;
      let dominantCount = 0;
      for (const [model, count] of modelCounts.entries()) {
        if (count > dominantCount) {
          dominantModel = model;
          dominantCount = count;
        }
      }
      row.dominantModel = dominantModel;

      const callUtilization = row.callBudget > 0 ? (row.calls / row.callBudget) * 100 : 0;
      const tokenUtilization =
        row.tokenBudget && row.tokenBudget > 0
          ? (row.totalTokens / row.tokenBudget) * 100
          : 0;
      row.utilizationPct = Math.round(Math.max(callUtilization, tokenUtilization));
      row.status = getProductBudgetStatus(row.utilizationPct);

      if (compareBudgetStatus(row.status, overallStatus) > 0) {
        overallStatus = row.status;
      }

      totalCalls += row.calls;
      totalCompletedCalls += row.completedCalls;
      totalErroredCalls += row.erroredCalls;
      totalRunningCalls += row.runningCalls;
      totalTokensIn += row.tokensIn;
      totalTokensOut += row.tokensOut;

      return row;
    })
    .sort((left, right) => {
      const statusDelta = compareBudgetStatus(right.status, left.status);
      if (statusDelta !== 0) return statusDelta;
      if (right.utilizationPct !== left.utilizationPct) {
        return right.utilizationPct - left.utilizationPct;
      }
      return left.provider.localeCompare(right.provider);
    });

  return {
    overallStatus,
    providers,
    totals: {
      providers: providers.length,
      calls: totalCalls,
      completedCalls: totalCompletedCalls,
      erroredCalls: totalErroredCalls,
      runningCalls: totalRunningCalls,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      totalTokens: totalTokensIn + totalTokensOut,
      avgDurationMs:
        allDurations.length > 0
          ? Math.round(allDurations.reduce((sum, value) => sum + value, 0) / allDurations.length)
          : 0,
    },
  };
}
