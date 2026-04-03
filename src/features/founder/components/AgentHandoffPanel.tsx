import { memo, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCopy, Download, Package, ArrowRight, Send } from "lucide-react";
import { useSharedContextActions } from "../hooks/useSharedContextActions";
import type { DelegateTarget } from "../hooks/useSharedContextActions";
import type { FounderArtifactPacket } from "../types/artifactPacket";
import {
  loadActiveFounderArtifactPacket,
  getArtifactPacketTypeLabel,
  formatArtifactPacketTimestamp,
  artifactPacketToMarkdown,
} from "../lib/artifactPacket";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff) || diff < 0) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatArtifactPacketTimestamp(iso);
}

function buildAgentBrief(packet: FounderArtifactPacket): string {
  const lines: string[] = [];
  lines.push(`# Agent Briefing — ${packet.canonicalEntity.name}`);
  lines.push(`> ${getArtifactPacketTypeLabel(packet.packetType)} · Generated ${formatArtifactPacketTimestamp(packet.provenance.generatedAt)}`);
  lines.push("");
  lines.push("## Company Truth");
  lines.push(`- Mission: ${packet.canonicalEntity.mission}`);
  lines.push(`- Wedge: ${packet.canonicalEntity.wedge}`);
  lines.push(`- State: ${packet.canonicalEntity.companyState}`);
  lines.push(`- Identity confidence: ${Math.round(packet.canonicalEntity.identityConfidence * 100)}%`);
  lines.push("");
  lines.push("## What Changed");
  lines.push(packet.whatChanged);
  lines.push("");
  lines.push("## Contradictions");
  for (const c of packet.contradictions) {
    lines.push(`- **${c.title}** (${c.severity}): ${c.detail}`);
  }
  lines.push("");
  lines.push("## Next Actions");
  for (const [i, a] of packet.nextActions.entries()) {
    lines.push(`${i + 1}. ${a.label} — ${a.whyNow}`);
  }
  lines.push("");
  lines.push("## Key Evidence");
  for (const e of packet.keyEvidence) {
    lines.push(`- ${e.title} — ${e.detail} (${e.source})`);
  }
  lines.push("");
  lines.push("## Agent Instructions");
  lines.push(packet.agentInstructions);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Toast (inline micro-toast so we avoid external dep coupling)
// ---------------------------------------------------------------------------

function MicroToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 2400);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-white/[0.08] bg-[#1a1918] px-4 py-2 text-sm text-content shadow-lg">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentHandoffPanel
// ---------------------------------------------------------------------------

function AgentHandoffPanelInner() {
  const navigate = useNavigate();
  const [packet, setPacket] = useState<FounderArtifactPacket | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isDelegating, setIsDelegating] = useState(false);
  const { delegateToAgent } = useSharedContextActions();

  useEffect(() => {
    setPacket(loadActiveFounderArtifactPacket());
  }, []);

  const copyBrief = useCallback(
    (target: "claude-code" | "openclaw") => {
      if (!packet) return;
      const brief = buildAgentBrief(packet);
      navigator.clipboard.writeText(brief).then(() => {
        setToast(
          target === "claude-code"
            ? "Agent brief copied — paste into Claude Code"
            : "Agent brief copied — paste into OpenClaw",
        );
      });
    },
    [packet],
  );

  const delegateBrief = useCallback(
    async (target: DelegateTarget) => {
      if (!packet || isDelegating) return;
      setIsDelegating(true);
      const brief = buildAgentBrief(packet);
      const result = await delegateToAgent(
        {
          contextType: "state_snapshot_packet",
          producerPeerId: "peer:web:control_plane",
          subject: `Agent briefing — ${packet.canonicalEntity.name}`,
          summary: brief.slice(0, 500),
          claims: packet.nextActions.map((a) => a.label),
          evidenceRefs: packet.keyEvidence.map((e) => ({ label: e.title, href: e.source })),
        },
        target,
        `Execute agent briefing for ${packet.canonicalEntity.name}: ${packet.agentInstructions.slice(0, 200)}`,
      );
      setIsDelegating(false);
      setToast(
        result.success
          ? `Delegated to ${target === "claude_code" ? "Claude Code" : "OpenClaw"}`
          : `Delegation failed: ${result.error}`,
      );
    },
    [packet, isDelegating, delegateToAgent],
  );

  const downloadBriefing = useCallback(() => {
    if (!packet) return;
    const md = artifactPacketToMarkdown(packet);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-briefing-${packet.packetId}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Briefing saved as markdown");
  }, [packet]);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!packet) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-white/[0.20] bg-white/[0.12] p-8 text-center">
        <Package className="h-10 w-10 text-content-muted" />
        <p className="text-sm text-content-muted">
          No packet loaded. Generate one from the Dashboard first.
        </p>
        <button
          type="button"
          onClick={() => navigate("/founder")}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-primary/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-primary"
        >
          Go to Dashboard <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // ── Packet loaded ────────────────────────────────────────────────────────
  const summaryItems = [
    { label: "Canonical company truth", count: 1 },
    { label: `What changed (${packet.contradictions.length > 0 ? packet.contradictions.length : 1} items)`, count: null },
    { label: "Biggest contradiction", count: null },
    { label: `Next ${packet.nextActions.length} actions`, count: null },
    { label: `${packet.keyEvidence.length} evidence refs`, count: null },
    { label: "Agent-specific instructions", count: null },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
          Agent Briefing
        </div>
        <div className="text-sm text-content">
          Active packet:{" "}
          <span className="font-semibold text-accent-primary">
            {getArtifactPacketTypeLabel(packet.packetType)}
          </span>{" "}
          <span className="text-content-muted">
            &middot; Generated {relativeTime(packet.provenance.generatedAt)}
          </span>
        </div>
      </div>

      {/* ── Summary card ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
          Agent sees
        </div>
        <ul className="flex flex-col gap-1.5">
          {summaryItems.map((item) => (
            <li
              key={item.label}
              className="flex items-start gap-2 text-[13px] text-content-secondary"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-primary" />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Agent instructions hidden — internal-only, not user-facing */}

      {/* ── Action buttons ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copyBrief("claude-code")}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-primary/90 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/35 active:scale-[0.98]"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          Send to Claude Code
        </button>
        <button
          type="button"
          onClick={() => copyBrief("openclaw")}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-primary/90 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/35 active:scale-[0.98]"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          Send to OpenClaw
        </button>
        <button
          type="button"
          onClick={downloadBriefing}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.07] px-3 py-2 text-xs font-medium text-content-secondary transition-all hover:bg-white/[0.08] hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 active:scale-[0.98]"
        >
          <Download className="h-3.5 w-3.5" />
          Save Briefing
        </button>
        <button
          type="button"
          onClick={() => void delegateBrief("claude_code")}
          disabled={isDelegating}
          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 active:scale-[0.98] disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          {isDelegating ? "Delegating..." : "Delegate to Agent"}
        </button>
      </div>

      {toast && <MicroToast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

const AgentHandoffPanel = memo(AgentHandoffPanelInner);
export default AgentHandoffPanel;
