/**
 * FounderStrategyView — Compare directions, publish issues, delegate work.
 *
 * Wires the MCP founder strategic ops tools to a visual surface:
 * - Compare founder directions side by side
 * - Publish and track issue packets
 * - Delegate issues to agents
 *
 * Route: /founder?tab=strategy
 */

import { useState, useCallback } from "react";
import { ArrowRight, GitCompare, AlertTriangle, Send, CheckCircle2, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────── */

interface FounderDirection {
  id: string;
  label: string;
  wedge: string;
  confidence: number;
  issueCount: number;
  angles: { name: string; score: number }[];
}

interface IssuePacket {
  id: string;
  angle: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "delegated" | "resolved";
  assignee?: string;
  createdAt: string;
}

/* ─── Demo data ──────────────────────────────────────────────────── */

const DEMO_DIRECTIONS: FounderDirection[] = [
  {
    id: "dir-entity-intel",
    label: "Entity Intelligence Layer",
    wedge: "Search any company, get structured intelligence packets",
    confidence: 0.78,
    issueCount: 2,
    angles: [
      { name: "Market fit", score: 8 },
      { name: "Defensibility", score: 7 },
      { name: "Distribution", score: 6 },
      { name: "Revenue clarity", score: 5 },
      { name: "Team leverage", score: 7 },
    ],
  },
  {
    id: "dir-operating-memory",
    label: "Operating Memory for Agents",
    wedge: "Shared context layer so agents never restart from scratch",
    confidence: 0.65,
    issueCount: 3,
    angles: [
      { name: "Market fit", score: 7 },
      { name: "Defensibility", score: 9 },
      { name: "Distribution", score: 5 },
      { name: "Revenue clarity", score: 4 },
      { name: "Team leverage", score: 8 },
    ],
  },
];

const DEMO_ISSUES: IssuePacket[] = [
  {
    id: "issue-1",
    angle: "Revenue clarity",
    title: "No pricing validation with real users yet",
    severity: "high",
    status: "open",
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
  },
  {
    id: "issue-2",
    angle: "Distribution",
    title: "MCP registry submission pending — no organic discovery channel",
    severity: "medium",
    status: "delegated",
    assignee: "Claude Code",
    createdAt: new Date(Date.now() - 172800_000).toISOString(),
  },
  {
    id: "issue-3",
    angle: "Market fit",
    title: "No user interview data — all assumptions from builder perspective",
    severity: "critical",
    status: "open",
    createdAt: new Date(Date.now() - 259200_000).toISOString(),
  },
];

/* ─── Helpers ────────────────────────────────────────────────────── */

function severityColor(s: IssuePacket["severity"]) {
  switch (s) {
    case "critical": return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    case "high": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "medium": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "low": return "text-white/40 bg-white/5 border-white/10";
  }
}

function statusIcon(s: IssuePacket["status"]) {
  switch (s) {
    case "open": return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
    case "delegated": return <Send className="h-3.5 w-3.5 text-blue-400" />;
    case "resolved": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

/* ─── Main ───────────────────────────────────────────────────────── */

export default function FounderStrategyView() {
  const [directions] = useState(DEMO_DIRECTIONS);
  const [issues, setIssues] = useState(DEMO_ISSUES);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);

  const handleDelegate = useCallback((issueId: string) => {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId ? { ...i, status: "delegated" as const, assignee: "Claude Code" } : i,
      ),
    );
  }, []);

  const handleResolve = useCallback((issueId: string) => {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId ? { ...i, status: "resolved" as const } : i,
      ),
    );
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GitCompare className="h-5 w-5 text-[#d97757]" />
        <h1 className="text-lg font-semibold text-white/90">Strategy Comparison</h1>
      </div>

      {/* Direction comparison cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {directions.map((dir) => (
          <button
            key={dir.id}
            type="button"
            onClick={() => setSelectedDir(selectedDir === dir.id ? null : dir.id)}
            className={cn(
              "rounded-xl border p-5 text-left transition-all",
              selectedDir === dir.id
                ? "border-[#d97757]/30 bg-[#d97757]/[0.04]"
                : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]",
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white/80">{dir.label}</h2>
                <p className="mt-1 text-xs text-white/40">{dir.wedge}</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-[#d97757]">{Math.round(dir.confidence * 100)}%</div>
                <div className="text-[10px] text-white/30">confidence</div>
              </div>
            </div>

            {/* Angle scores */}
            <div className="mt-4 space-y-1.5">
              {dir.angles.map((angle) => (
                <div key={angle.name} className="flex items-center gap-2">
                  <span className="w-24 text-[11px] text-white/40">{angle.name}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-[#d97757]/60"
                      style={{ width: `${angle.score * 10}%` }}
                    />
                  </div>
                  <span className="w-4 text-right text-[10px] font-mono text-white/30">{angle.score}</span>
                </div>
              ))}
            </div>

            {dir.issueCount > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                {dir.issueCount} open issue{dir.issueCount !== 1 ? "s" : ""}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Issue packets */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Strategic Issues
          </h3>
          <span className="text-xs text-white/30">
            {issues.filter((i) => i.status === "open").length} open
          </span>
        </div>

        <div className="space-y-2">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-start gap-3">
                {statusIcon(issue.status)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/70">{issue.title}</span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", severityColor(issue.severity))}>
                      {issue.severity}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-white/30">
                    <span className="font-mono">{issue.angle}</span>
                    <Clock className="h-2.5 w-2.5" />
                    <span>{relativeTime(issue.createdAt)}</span>
                    {issue.assignee && (
                      <>
                        <ArrowRight className="h-2.5 w-2.5" />
                        <span className="text-blue-400">{issue.assignee}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {issue.status === "open" && (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDelegate(issue.id)}
                      className="rounded-md bg-[#d97757]/20 px-2.5 py-1 text-[10px] font-medium text-[#d97757] transition-colors hover:bg-[#d97757]/30"
                    >
                      Delegate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolve(issue.id)}
                      className="rounded-md bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/40 transition-colors hover:bg-white/10"
                    >
                      Resolve
                    </button>
                  </div>
                )}
                {issue.status === "delegated" && (
                  <button
                    type="button"
                    onClick={() => handleResolve(issue.id)}
                    className="shrink-0 rounded-md bg-emerald-500/20 px-2.5 py-1 text-[10px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))}

          {issues.length === 0 && (
            <p className="py-6 text-center text-xs text-white/30">
              No strategic issues. Run a founder pressure test to surface weak angles.
            </p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/[0.08]"
        >
          <Zap className="h-3.5 w-3.5" />
          Run Pressure Test
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/[0.08]"
        >
          <GitCompare className="h-3.5 w-3.5" />
          Add Direction
        </button>
      </div>
    </div>
  );
}
