/**
 * TokenUsageBadge — Inline display for message-level token usage
 *
 * Shows input/output token counts with estimated cost tooltip.
 * Renders as a small monospace badge: "1.2K in / 0.8K out"
 */
import React from "react";

// Model pricing approximations (per 1M tokens, USD)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
  "claude-haiku-4-5": { input: 0.8, output: 4.0 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  default: { input: 3.0, output: 15.0 },
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model?: string,
): number {
  const pricing = MODEL_PRICING[model ?? ""] ?? MODEL_PRICING.default;
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}

function formatCost(usd: number): string {
  if (usd < 0.001) return "<$0.001";
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

interface TokenUsageBadgeProps {
  inputTokens: number;
  outputTokens: number;
  model?: string;
  className?: string;
}

export function TokenUsageBadge({
  inputTokens,
  outputTokens,
  model,
  className = "",
}: TokenUsageBadgeProps) {
  if (inputTokens === 0 && outputTokens === 0) return null;

  const cost = estimateCost(inputTokens, outputTokens, model);
  const costLabel = `${formatCost(cost)} est.${model ? ` (${model})` : ""}`;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono text-muted-foreground ${className}`}
      title={costLabel}
    >
      <span>{formatTokens(inputTokens)}&darr;</span>
      <span>{formatTokens(outputTokens)}&uarr;</span>
    </span>
  );
}
