/**
 * PacketLineageView — Phase 10E
 *
 * Version history for artifact packets and decision memos.
 * Shows the lineage chain, diffs between versions, audience tracking,
 * and export/share history.
 */

import { memo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileText,
  GitCommit,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCausalMemory } from "../lib/useCausalMemory";

// Demo fixtures sourced from useCausalMemory hook

// ── Types ──────────────────────────────────────────────────────────────

interface PacketVersion {
  id: string;
  versionNumber: number;
  audience: string;
  triggerType: string;
  inputSources: { evidenceCount: number; signalCount: number; initiativeIds: string[]; interventionIds: string[] };
  changedSections: string[];
  diffSummary: string;
  createdAt: number;
}

interface MemoVersion {
  id: string;
  versionNumber: number;
  memoTitle: string;
  exportFormat: string;
  sourcePacketVersion: number;
  sharedWith: { audience: string; method: string; sharedAt: number }[];
  changedSections: string[];
  diffSummary: string;
  createdAt: number;
}

// ── Components ─────────────────────────────────────────────────────────

const AUDIENCE_COLORS: Record<string, string> = {
  founder: "bg-emerald-500/20 text-emerald-400",
  investor: "bg-violet-500/20 text-violet-400",
  agent: "bg-cyan-500/20 text-cyan-400",
  peer: "bg-amber-500/20 text-amber-400",
  team: "bg-blue-500/20 text-blue-400",
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  scheduled: "Scheduled",
  change_triggered: "Change Triggered",
  agent_delivered: "Agent Delivered",
};

function PacketVersionCard({ version, expanded, onToggle }: { version: PacketVersion; expanded: boolean; onToggle: () => void }) {
  const age = Date.now() - version.createdAt;
  const ageStr = age < 3_600_000 ? `${Math.round(age / 60_000)}m ago` : age < 86_400_000 ? `${Math.round(age / 3_600_000)}h ago` : `${Math.round(age / 86_400_000)}d ago`;

  return (
    <button onClick={onToggle} className="w-full rounded-lg border border-white/[0.10] p-3.5 text-left transition-colors hover:bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d97757]/10">
            <GitCommit className="h-3.5 w-3.5 text-[#d97757]" />
          </div>
          <div>
            <span className="text-xs font-medium text-white/70">Packet v{version.versionNumber}</span>
            <span className={cn("ml-2 rounded px-1.5 py-0.5 text-[9px]", AUDIENCE_COLORS[version.audience] ?? "bg-white/10 text-white/50")}>
              {version.audience}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/35">{TRIGGER_LABELS[version.triggerType]}</span>
          <span className="text-[10px] text-white/30">{ageStr}</span>
          {expanded ? <ChevronDown className="h-3 w-3 text-white/20" /> : <ChevronRight className="h-3 w-3 text-white/20" />}
        </div>
      </div>

      {version.diffSummary && (
        <p className="mt-1.5 text-[10px] text-white/40">{version.diffSummary}</p>
      )}

      {expanded && (
        <div className="mt-3 space-y-2">
          {/* Input sources */}
          <div className="flex gap-3 text-[10px] text-white/30">
            <span>{version.inputSources.evidenceCount} evidence</span>
            <span>{version.inputSources.signalCount} signals</span>
            <span>{version.inputSources.initiativeIds.length} initiatives</span>
            <span>{version.inputSources.interventionIds.length} interventions</span>
          </div>
          {/* Changed sections */}
          {version.changedSections.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {version.changedSections.map((s) => (
                <span key={s} className="rounded bg-amber-500/[0.08] px-1.5 py-0.5 text-[9px] text-amber-400/60">{s}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function MemoVersionCard({ version, expanded, onToggle }: { version: MemoVersion; expanded: boolean; onToggle: () => void }) {
  const age = Date.now() - version.createdAt;
  const ageStr = age < 86_400_000 ? `${Math.round(age / 3_600_000)}h ago` : `${Math.round(age / 86_400_000)}d ago`;

  return (
    <button onClick={onToggle} className="w-full rounded-lg border border-white/[0.10] p-3.5 text-left transition-colors hover:bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
            <FileText className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <div>
            <span className="text-xs font-medium text-white/70">{version.memoTitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/35">{version.exportFormat}</span>
          <span className="text-[10px] text-white/30">{ageStr}</span>
          {expanded ? <ChevronDown className="h-3 w-3 text-white/20" /> : <ChevronRight className="h-3 w-3 text-white/20" />}
        </div>
      </div>

      {version.diffSummary && (
        <p className="mt-1.5 text-[10px] text-white/40">{version.diffSummary}</p>
      )}

      {expanded && (
        <div className="mt-3 space-y-2">
          <div className="text-[10px] text-white/30">Source: Packet v{version.sourcePacketVersion}</div>
          {version.sharedWith.length > 0 && (
            <div>
              <div className="mb-1 text-[9px] uppercase tracking-wider text-white/25">Shared with</div>
              {version.sharedWith.map((s, i) => {
                const shareAge = Date.now() - s.sharedAt;
                const shareAgeStr = shareAge < 3_600_000 ? `${Math.round(shareAge / 60_000)}m ago` : `${Math.round(shareAge / 3_600_000)}h ago`;
                return (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <Share2 className="h-2.5 w-2.5 text-white/20" />
                    <span className="text-white/50">{s.audience}</span>
                    <span className="text-white/20">via {s.method}</span>
                    <span className="text-white/15">{shareAgeStr}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

// ── Main View ──────────────────────────────────────────────────────────

function PacketLineageViewInner() {
  const [expandedPacket, setExpandedPacket] = useState<string | null>(null);
  const [expandedMemo, setExpandedMemo] = useState<string | null>(null);
  const [tab, setTab] = useState<"packets" | "memos">("packets");
  const { packetVersions, memoVersions } = useCausalMemory();

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header + Tabs */}
        <div className="flex items-center justify-between">
          <h1 className="text-[11px] uppercase tracking-[0.2em] text-white/40">Artifact Lineage</h1>
          <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] p-0.5">
            <button
              onClick={() => setTab("packets")}
              className={cn("rounded-md px-3 py-1 text-[10px] font-medium transition-colors", tab === "packets" ? "bg-[#d97757]/20 text-[#d97757]" : "text-white/40 hover:text-white/60")}
            >
              Packets ({packetVersions.length})
            </button>
            <button
              onClick={() => setTab("memos")}
              className={cn("rounded-md px-3 py-1 text-[10px] font-medium transition-colors", tab === "memos" ? "bg-violet-500/20 text-violet-400" : "text-white/40 hover:text-white/60")}
            >
              Memos ({memoVersions.length})
            </button>
          </div>
        </div>

        {/* Version Chain Visualization */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
          {(tab === "packets" ? packetVersions : memoVersions)
            .slice()
            .reverse()
            .map((v, i, arr) => (
              <div key={v.id} className="flex shrink-0 items-center gap-1">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-medium", i === arr.length - 1 ? "border-[#d97757]/40 bg-[#d97757]/10 text-[#d97757]" : "border-white/[0.10] bg-white/[0.04] text-white/40")}>
                  v{v.versionNumber}
                </div>
                {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-white/15" />}
              </div>
            ))}
        </div>

        {/* Version List */}
        <div className="space-y-2">
          {tab === "packets" &&
            packetVersions.map((v) => (
              <PacketVersionCard
                key={v.id}
                version={v}
                expanded={expandedPacket === v.id}
                onToggle={() => setExpandedPacket(expandedPacket === v.id ? null : v.id)}
              />
            ))}
          {tab === "memos" &&
            memoVersions.map((v) => (
              <MemoVersionCard
                key={v.id}
                version={v}
                expanded={expandedMemo === v.id}
                onToggle={() => setExpandedMemo(expandedMemo === v.id ? null : v.id)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

const PacketLineageView = memo(PacketLineageViewInner);
export default PacketLineageView;
