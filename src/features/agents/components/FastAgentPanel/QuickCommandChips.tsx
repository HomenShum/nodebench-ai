/**
 * QuickCommandChips — Surface-aware one-tap command suggestions.
 *
 * Shown ABOVE the text input on mobile when the agent panel opens.
 * Solves the blank-input problem: users don't know what to ask.
 * One tap = full query dispatched.
 *
 * Mobile UX doc R6: "Quick Command Chips as Default Mobile Input"
 */

import { memo, useMemo } from "react";
import {
  Search,
  FileText,
  BarChart3,
  AlertTriangle,
  Globe,
  Briefcase,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export interface QuickCommand {
  id: string;
  label: string;
  query: string;
  icon: React.ElementType;
}

interface QuickCommandChipsProps {
  /** Current surface context for relevant suggestions */
  surface?: string;
  /** Called when a chip is tapped — dispatches the full query */
  onSelect: (query: string) => void;
  className?: string;
}

/* ─── Command sets by surface ──────────────────────────────────────────────── */

const COMMANDS: Record<string, QuickCommand[]> = {
  ask: [
    { id: "investigate", label: "Investigate", query: "Investigate the top competitor in my space — what changed this week?", icon: Search },
    { id: "daily-brief", label: "Daily Brief", query: "Generate my founder weekly reset — what changed, main contradiction, next 3 moves", icon: FileText },
    { id: "compare", label: "Compare", query: "Compare the top 3 companies in this category — strengths, weaknesses, recent moves", icon: BarChart3 },
    { id: "diligence", label: "Run Diligence", query: "Run a diligence check on this company — red flags, team, funding, product signals", icon: AlertTriangle },
  ],
  memo: [
    { id: "decision-memo", label: "Decision Memo", query: "Build a decision memo for the investment committee", icon: FileText },
    { id: "risk-analysis", label: "Risk Analysis", query: "Analyze the top 5 risks and rank interventions by impact", icon: AlertTriangle },
    { id: "scenario-branch", label: "Scenarios", query: "Generate 5 scenario branches for this decision — base case through worst case", icon: BarChart3 },
    { id: "contradiction", label: "Contradictions", query: "Surface all contradictions between our current position and recent signals", icon: AlertTriangle },
  ],
  research: [
    { id: "market-scan", label: "Market Scan", query: "Scan the market for new entrants, funding rounds, and product launches this week", icon: Globe },
    { id: "competitor-track", label: "Track Competitor", query: "Track competitor changes — hiring, product, pricing, partnerships", icon: Search },
    { id: "signal-digest", label: "Signal Digest", query: "Generate a signal digest — what matters most right now and why", icon: BarChart3 },
    { id: "deep-dive", label: "Deep Dive", query: "Deep dive into this entity — full context graph with temporal changes", icon: Briefcase },
  ],
  default: [
    { id: "investigate", label: "Investigate", query: "Investigate the top competitor in my space — what changed this week?", icon: Search },
    { id: "daily-brief", label: "Daily Brief", query: "Generate my founder weekly reset — what changed, main contradiction, next 3 moves", icon: FileText },
    { id: "compare", label: "Compare", query: "Compare the top 3 companies in this category", icon: BarChart3 },
    { id: "market-scan", label: "Market Scan", query: "Scan the market for new signals this week", icon: Globe },
  ],
};

/* ─── Component ────────────────────────────────────────────────────────────── */

export const QuickCommandChips = memo(function QuickCommandChips({
  surface,
  onSelect,
  className = "",
}: QuickCommandChipsProps) {
  const commands = useMemo(() => {
    return COMMANDS[surface ?? "default"] ?? COMMANDS.default;
  }, [surface]);

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-[11px] uppercase tracking-[0.15em] text-white/30 px-1">
        Quick actions
      </p>
      <div className="flex flex-wrap gap-2">
        {commands.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.id}
              type="button"
              onClick={() => onSelect(cmd.query)}
              className="
                inline-flex items-center gap-1.5 rounded-lg
                border border-white/[0.08] bg-white/[0.03]
                px-3 py-2 min-h-[40px]
                text-[12px] font-medium text-white/60
                hover:bg-white/[0.06] hover:text-white/80
                active:scale-[0.97]
                transition-all duration-100
              "
            >
              <Icon className="h-3.5 w-3.5 text-[#d97757]/70" />
              {cmd.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default QuickCommandChips;
