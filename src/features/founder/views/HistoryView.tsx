/**
 * HistoryView — Screen 4 of the prove-first founder loop.
 *
 * Makes continuity visible so the product compounds over time.
 * Layout: split-pane (timeline left, comparison right), prior packets row, prior memos list.
 *
 * Data sources:
 *   - Packets: localStorage "nodebench-founder-artifact-packets" via artifactPacket lib
 *   - Memos:   localStorage "nodebench-memos" via ShareableMemoView helpers
 *
 * Seeds demo data on first mount if no packets exist.
 */

import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  GitCompare,
  History,
  RefreshCw,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { useMotionConfig } from "@/lib/motion";
import { motion, AnimatePresence } from "framer-motion";
import {
  buildFounderArtifactPacket,
  formatArtifactPacketTimestamp,
  getArtifactPacketTypeLabel,
  loadFounderArtifactPackets,
  saveFounderArtifactPacket,
  setActiveFounderArtifactPacket,
  artifactPacketToMarkdown,
} from "../lib/artifactPacket";
import type {
  ArtifactPacketType,
  FounderArtifactPacket,
} from "../types/artifactPacket";
import {
  type ShareableMemoData,
  getMemoFromStorage,
} from "./ShareableMemoView";

/* ── Constants ────────────────────────────────────────────────────── */

const GLASS_CARD =
  "rounded-xl border border-white/[0.20] bg-white/[0.12] p-4";
const SECTION_HEADER =
  "text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60";
const MEMO_STORAGE_KEY = "nodebench-memos";

/* ── Demo data seeder ─────────────────────────────────────────────── */

function seedDemoPackets(): FounderArtifactPacket[] {
  const now = Date.now();
  const DAY = 86_400_000;

  const demoPackets: Array<{
    type: ArtifactPacketType;
    daysAgo: number;
    confidence: number;
    whatChanged: string;
    memo: string;
    contradictions: Array<{ id: string; title: string; detail: string; severity: "high" | "medium" | "low" }>;
    actions: Array<{ id: string; label: string; whyNow: string; priority: "high" | "medium" | "low" }>;
  }> = [
    {
      type: "weekly_reset",
      daysAgo: 0,
      confidence: 0.62,
      whatChanged: "Pricing engine 90% done. Two enterprise pilots confirmed. Competitor raised $12M.",
      memo: "Momentum is real but fragile. Ship pricing engine this week to lock enterprise pilots before competitor can counter-position.",
      contradictions: [
        { id: "c1", title: "Pricing vs growth", detail: "Enterprise pricing may slow PLG adoption", severity: "medium" },
      ],
      actions: [
        { id: "a1", label: "Ship pricing engine by Friday", whyNow: "Enterprise pilots waiting", priority: "high" },
        { id: "a2", label: "Draft competitive response memo", whyNow: "Competitor funding changes narrative", priority: "medium" },
        { id: "a3", label: "Schedule design partner check-in", whyNow: "Retention signal needed for board", priority: "medium" },
      ],
    },
    {
      type: "pre_delegation",
      daysAgo: 2,
      confidence: 0.58,
      whatChanged: "Agent scan completed. 3 of 5 agents running within latency budget. Voice pipeline restored.",
      memo: "Agent infrastructure is stabilizing. Focus delegation on the 2 slow agents before adding new capabilities.",
      contradictions: [
        { id: "c2", title: "Speed vs coverage", detail: "Fixing slow agents delays new feature rollout", severity: "low" },
      ],
      actions: [
        { id: "a4", label: "Profile slow agents with telemetry", whyNow: "Blocking delegation confidence", priority: "high" },
        { id: "a5", label: "Document voice pipeline recovery", whyNow: "Knowledge capture while fresh", priority: "low" },
      ],
    },
    {
      type: "important_change",
      daysAgo: 4,
      confidence: 0.45,
      whatChanged: "EU CBAM leak detected in supply chain data. Potential tariff impact on 2 key partners.",
      memo: "External regulatory risk surfaced. Low confidence because source is unverified, but impact is high if true. Monitor and prepare contingency.",
      contradictions: [
        { id: "c3", title: "React vs wait", detail: "Acting on unverified intel may waste resources; ignoring it may cause surprise", severity: "high" },
      ],
      actions: [
        { id: "a6", label: "Verify CBAM leak with second source", whyNow: "48-hour window before public disclosure", priority: "high" },
        { id: "a7", label: "Model tariff impact on partner margins", whyNow: "Board needs risk quantification", priority: "medium" },
      ],
    },
    {
      type: "weekly_reset",
      daysAgo: 7,
      confidence: 0.41,
      whatChanged: "Initial MCP gateway deployed. First external API consumer onboarded. 289 tools live.",
      memo: "Foundation laid but adoption is unproven. This week must produce at least 2 external tool invocations to validate the gateway.",
      contradictions: [],
      actions: [
        { id: "a8", label: "Onboard second API consumer", whyNow: "Validates gateway beyond single user", priority: "high" },
        { id: "a9", label: "Add tool count to public dashboard", whyNow: "Social proof for landing page", priority: "low" },
      ],
    },
  ];

  const packets: FounderArtifactPacket[] = demoPackets.map((d) => {
    const generatedAt = new Date(now - d.daysAgo * DAY).toISOString();
    return {
      packetId: `demo-${d.type}-${d.daysAgo}`,
      packetType: d.type,
      audience: "founder",
      objective: "Weekly clarity and drift detection",
      canonicalEntity: {
        name: "NodeBench",
        mission: "Operating intelligence for agent-native businesses",
        wedge: "338-tool MCP server with entity intelligence and persona presets",
        companyState: "building",
        foundingMode: "solo-technical",
        identityConfidence: d.confidence,
      },
      nearbyEntities: [],
      whatChanged: d.whatChanged,
      contradictions: d.contradictions,
      risks: [],
      keyEvidence: [],
      operatingMemo: d.memo,
      nextActions: d.actions,
      recommendedFraming: "",
      tablesNeeded: [],
      visualsSuggested: [],
      provenance: {
        generatedAt,
        sourceCount: Math.floor(Math.random() * 8) + 4,
        triggerLabel: d.type === "weekly_reset" ? "scheduled" : "manual",
      },
      agentInstructions: "",
    };
  });

  // Save each to localStorage via the standard API
  for (const pkt of packets) {
    saveFounderArtifactPacket(pkt);
  }

  return packets;
}

/* ── Diff helpers ─────────────────────────────────────────────────── */

interface SnapshotDiff {
  field: string;
  previous: string;
  current: string;
  changeType: "added" | "removed" | "changed";
}

function diffPackets(
  prev: FounderArtifactPacket,
  curr: FounderArtifactPacket,
): SnapshotDiff[] {
  const diffs: SnapshotDiff[] = [];

  if (prev.whatChanged !== curr.whatChanged) {
    diffs.push({
      field: "What Changed",
      previous: prev.whatChanged,
      current: curr.whatChanged,
      changeType: "changed",
    });
  }

  if (prev.operatingMemo !== curr.operatingMemo) {
    diffs.push({
      field: "Operating Memo",
      previous: prev.operatingMemo,
      current: curr.operatingMemo,
      changeType: "changed",
    });
  }

  // Contradiction changes
  const prevCtrTitles = new Set(prev.contradictions.map((c) => c.title));
  const currCtrTitles = new Set(curr.contradictions.map((c) => c.title));
  for (const title of currCtrTitles) {
    if (!prevCtrTitles.has(title)) {
      diffs.push({
        field: "New Contradiction",
        previous: "",
        current: title,
        changeType: "added",
      });
    }
  }
  for (const title of prevCtrTitles) {
    if (!currCtrTitles.has(title)) {
      diffs.push({
        field: "Resolved",
        previous: title,
        current: "",
        changeType: "removed",
      });
    }
  }

  // Action changes
  const prevActions = new Set(prev.nextActions.map((a) => a.label));
  const currActions = new Set(curr.nextActions.map((a) => a.label));
  for (const label of currActions) {
    if (!prevActions.has(label)) {
      diffs.push({
        field: "New Action",
        previous: "",
        current: label,
        changeType: "added",
      });
    }
  }

  // Identity confidence
  if (
    prev.canonicalEntity.identityConfidence !==
    curr.canonicalEntity.identityConfidence
  ) {
    const prevPct = Math.round(prev.canonicalEntity.identityConfidence * 100);
    const currPct = Math.round(curr.canonicalEntity.identityConfidence * 100);
    diffs.push({
      field: "Confidence",
      previous: `${prevPct}%`,
      current: `${currPct}%`,
      changeType: "changed",
    });
  }

  return diffs;
}

/* ── Memo loader ──────────────────────────────────────────────────── */

interface StoredMemo {
  id: string;
  company: string;
  date: string;
  question: string;
  answer: string;
  confidence: number;
}

function loadAllMemos(): StoredMemo[] {
  try {
    const raw = localStorage.getItem(MEMO_STORAGE_KEY);
    if (!raw) return [];
    const store: Record<string, ShareableMemoData> = JSON.parse(raw);
    return Object.values(store)
      .map((m) => ({
        id: m.id,
        company: m.company,
        date: m.date,
        question: m.question,
        answer: m.answer,
        confidence: m.confidence,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

/* ── Main Component ──────────────────────────────────────────────── */

function HistoryView() {
  const navigate = useNavigate();
  const { ref: revealRef, isVisible } = useRevealOnMount();
  const { transition } = useMotionConfig();

  const [packets, setPackets] = useState<FounderArtifactPacket[]>(() => {
    const existing = loadFounderArtifactPackets();
    if (existing.length > 0) return existing;
    return seedDemoPackets();
  });

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [memos] = useState<StoredMemo[]>(() => loadAllMemos());
  const [expandedMemoId, setExpandedMemoId] = useState<string | null>(null);
  const [expandedPacketId, setExpandedPacketId] = useState<string | null>(null);

  // Auto-select comparison to next oldest
  const compareIdx = packets.length > 1 && selectedIdx + 1 < packets.length ? selectedIdx + 1 : null;

  const selectedPacket = packets[selectedIdx] ?? null;
  const comparePacket = compareIdx !== null ? (packets[compareIdx] ?? null) : null;

  const diffs = useMemo(() => {
    if (!selectedPacket || !comparePacket) return [];
    return diffPackets(comparePacket, selectedPacket);
  }, [selectedPacket, comparePacket]);

  /* ── Handlers ──────────────────────────────────────────────────── */

  const handleRestore = useCallback(
    (packetId: string) => {
      setActiveFounderArtifactPacket(packetId);
      navigate("/founder");
    },
    [navigate],
  );

  const handleRefreshPacket = useCallback(() => {
    // Build a new packet from current state (uses demo defaults)
    const newPacket = buildFounderArtifactPacket({
      packetType: "weekly_reset",
      company: {
        name: "NodeBench",
        canonicalMission: "Operating intelligence for agent-native businesses",
        wedge: "338-tool MCP server with entity intelligence and persona presets",
        companyState: "building",
        foundingMode: "solo-technical",
        identityConfidence: 0.65,
      },
      changes: [
        {
          id: "fresh-1",
          description: "History view shipped. Continuity now visible.",
          relativeTime: "just now",
          type: "feature",
        },
      ],
      interventions: [],
      initiatives: [],
      agents: [],
      dailyMemo: {
        whatMatters: ["Ship history view", "Close feedback loop"],
        whatToDoNext: ["Generate packet from real data"],
        unresolved: [],
        generatedAt: new Date().toISOString(),
      },
      nearbyEntities: [],
    });
    saveFounderArtifactPacket(newPacket);
    setPackets(loadFounderArtifactPackets());
    setSelectedIdx(0);
  }, []);

  const handleExportTimeline = useCallback(() => {
    if (packets.length === 0) return;
    const lines = packets.map((pkt) => {
      const ts = formatArtifactPacketTimestamp(pkt.provenance.generatedAt);
      const type = getArtifactPacketTypeLabel(pkt.packetType);
      const ctr = pkt.contradictions[0]?.title ?? "none";
      const actions = pkt.nextActions.map((a) => a.label).join("; ");
      return `## ${ts} — ${type}\n\n**What changed:** ${pkt.whatChanged}\n**Contradiction:** ${ctr}\n**Actions:** ${actions}\n**Memo:** ${pkt.operatingMemo}\n`;
    });
    const md = `# NodeBench Packet Timeline\n\n${lines.join("\n---\n\n")}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nodebench-packet-timeline.md";
    a.click();
    URL.revokeObjectURL(url);
  }, [packets]);

  /* ── Empty state ───────────────────────────────────────────────── */

  if (packets.length === 0) {
    return (
      <div
        ref={revealRef}
        className="relative flex h-full flex-col items-center justify-center gap-4 px-4"
      >
        <button type="button" onClick={() => navigate("/founder")} className="absolute left-4 top-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-white/60 transition-colors hover:text-white/60">
          <ArrowLeft className="h-3 w-3" />Dashboard
        </button>
        <History className="h-10 w-10 text-white/70" />
        <div className="text-center">
          <p className="text-sm font-medium text-white/60">
            No packets generated yet
          </p>
          <p className="mt-1 text-xs text-white/70">
            Generate your first Artifact Packet from the Dashboard or Intake to
            start building history.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/founder")}
            className="flex items-center gap-1.5 rounded-lg bg-accent-primary/10 px-4 py-2 text-sm font-medium text-accent-primary transition-colors hover:bg-accent-primary/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Go to Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate("/founder/intake")}
            className="flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/60"
          >
            <FileText className="h-3.5 w-3.5" />
            Go to Intake
          </button>
        </div>
      </div>
    );
  }

  /* ── Full view ─────────────────────────────────────────────────── */

  return (
    <div
      ref={revealRef}
      className="flex h-full flex-col gap-4 overflow-auto px-4 pb-24 pt-4"
    >
      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <button type="button" onClick={() => navigate("/founder")} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/60 transition-colors hover:text-white/60">
        <ArrowLeft className="h-3 w-3" />Dashboard
      </button>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white/90">
            History & Changes
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Compare snapshots, review prior memos, track drift over time.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportTimeline}
            className="flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-3 py-1.5 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/60"
          >
            <Download className="h-3 w-3" />
            Export
          </button>
          <button
            type="button"
            onClick={handleRefreshPacket}
            className="flex items-center gap-1.5 rounded-lg bg-accent-primary/10 px-3 py-1.5 text-[10px] font-medium text-accent-primary transition-colors hover:bg-accent-primary/20"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh Packet
          </button>
        </div>
      </div>

      {/* ── Split pane: Timeline (left) + Comparison (right) ─────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Left: Snapshot Timeline */}
        <div className={GLASS_CARD}>
          <h2 className={SECTION_HEADER}>Snapshot Timeline</h2>
          <ul className="mt-3 space-y-1">
            {packets.map((pkt, i) => {
              const isSelected = i === selectedIdx;
              const isCompare = i === compareIdx;
              const conf = Math.round(
                pkt.canonicalEntity.identityConfidence * 100,
              );
              return (
                <li
                  key={pkt.packetId}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-xs transition-colors",
                    isSelected
                      ? "border-accent-primary/20 bg-accent-primary/10 text-accent-primary"
                      : isCompare
                        ? "border-sky-500/10 bg-sky-500/5 text-sky-400"
                        : "border-transparent bg-white/[0.02] text-white/60 hover:bg-white/[0.07]",
                  )}
                  onClick={() => {
                    if (!isSelected) setSelectedIdx(i);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-2 w-2 shrink-0 rounded-full",
                        isSelected
                          ? "bg-accent-primary"
                          : isCompare
                            ? "bg-sky-400/60"
                            : "bg-white/10",
                      )}
                    />
                    <div className="min-w-0">
                      <span className="block truncate font-medium">
                        {getArtifactPacketTypeLabel(pkt.packetType)}
                      </span>
                      <span className="block text-[10px] text-white/60">
                        {formatArtifactPacketTimestamp(
                          pkt.provenance.generatedAt,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
                        conf >= 60
                          ? "bg-emerald-500/10 text-emerald-400/70"
                          : conf >= 45
                            ? "bg-amber-500/10 text-amber-400/70"
                            : "bg-rose-500/10 text-rose-400/70",
                      )}
                    >
                      {conf}%
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(pkt.packetId);
                      }}
                      className="rounded-md bg-white/[0.07] p-1 text-white/60 transition-colors hover:text-white/60"
                      title="Restore this packet as active"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {packets.length > 1 && (
            <p className="mt-2 text-[10px] text-white/70">
              Select a snapshot. Comparison shows the previous one automatically.
            </p>
          )}
        </div>

        {/* Right: Current vs Previous */}
        <div className={GLASS_CARD}>
          <div className="flex items-center gap-2">
            <GitCompare className="h-3.5 w-3.5 text-sky-400/60" />
            <h2 className={SECTION_HEADER}>Current vs Previous</h2>
          </div>

          {!comparePacket ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-white/60">
                Generate more packets to see comparisons.
              </p>
              <p className="mt-1 text-[10px] text-white/70">
                Each new packet creates a snapshot for drift detection.
              </p>
            </div>
          ) : diffs.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-white/60">
                No differences between selected snapshots.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {/* Group diffs by category */}
              {(() => {
                const changed = diffs.filter(
                  (d) => d.changeType === "changed",
                );
                const added = diffs.filter((d) => d.changeType === "added");
                const removed = diffs.filter(
                  (d) => d.changeType === "removed",
                );

                return (
                  <>
                    {changed.length > 0 && (
                      <DiffSection
                        label="What Changed"
                        items={changed}
                        color="sky"
                      />
                    )}
                    {removed.length > 0 && (
                      <DiffSection
                        label="What Resolved"
                        items={removed}
                        color="emerald"
                      />
                    )}
                    {added.filter((d) => d.field === "New Contradiction")
                      .length > 0 && (
                      <DiffSection
                        label="New Contradictions"
                        items={added.filter(
                          (d) => d.field === "New Contradiction",
                        )}
                        color="rose"
                      />
                    )}
                    {added.filter((d) => d.field === "New Action").length >
                      0 && (
                      <DiffSection
                        label="New Next Actions"
                        items={added.filter((d) => d.field === "New Action")}
                        color="amber"
                      />
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ── Prior Packets — horizontal scroll ────────────────────── */}
      <div className={GLASS_CARD}>
        <h2 className={SECTION_HEADER}>Prior Packets</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {packets.map((pkt, i) => {
            const conf = Math.round(
              pkt.canonicalEntity.identityConfidence * 100,
            );
            const isExpanded = expandedPacketId === pkt.packetId;
            return (
              <button
                key={pkt.packetId}
                type="button"
                onClick={() =>
                  setExpandedPacketId(isExpanded ? null : pkt.packetId)
                }
                className={cn(
                  "flex w-[180px] shrink-0 flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors",
                  isExpanded
                    ? "border-accent-primary/20 bg-accent-primary/5"
                    : "border-white/[0.20] bg-white/[0.12] hover:bg-white/[0.07]",
                )}
              >
                <span
                  className={cn(
                    "inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
                    pkt.packetType === "weekly_reset"
                      ? "bg-sky-500/10 text-sky-400/70"
                      : pkt.packetType === "pre_delegation"
                        ? "bg-amber-500/10 text-amber-400/70"
                        : "bg-rose-500/10 text-rose-400/70",
                  )}
                >
                  {getArtifactPacketTypeLabel(pkt.packetType)}
                </span>
                <span className="text-xs font-medium text-white/60">
                  {formatArtifactPacketTimestamp(pkt.provenance.generatedAt)}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold tabular-nums",
                    conf >= 60
                      ? "text-emerald-400/70"
                      : conf >= 45
                        ? "text-amber-400/70"
                        : "text-rose-400/70",
                  )}
                >
                  {conf}% confidence
                </span>
              </button>
            );
          })}
        </div>

        {/* Expanded packet detail */}
        <AnimatePresence mode="wait">
          {expandedPacketId && (
            <motion.div
              key={expandedPacketId}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 overflow-hidden"
            >
              {(() => {
                const pkt = packets.find(
                  (p) => p.packetId === expandedPacketId,
                );
                if (!pkt) return null;
                return (
                  <div className="space-y-2 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">
                        Operating Memo
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedPacketId(null)}
                        className="rounded p-0.5 text-white/70 transition-colors hover:text-white/60"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed text-white/60">
                      {pkt.operatingMemo}
                    </p>
                    {pkt.contradictions.length > 0 && (
                      <div className="rounded-md border border-rose-500/10 bg-rose-500/[0.03] p-2">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-rose-400/60">
                          Contradictions
                        </span>
                        {pkt.contradictions.map((c) => (
                          <p
                            key={c.id}
                            className="mt-1 text-xs text-rose-300/60"
                          >
                            {c.title}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleRestore(pkt.packetId)}
                        className="flex items-center gap-1 rounded-md bg-accent-primary/10 px-2.5 py-1 text-[10px] font-medium text-accent-primary/70 transition-colors hover:bg-accent-primary/20 hover:text-accent-primary"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        Reopen
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const md = artifactPacketToMarkdown(pkt);
                          const blob = new Blob([md], {
                            type: "text/markdown",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `packet-${pkt.packetType}-${pkt.packetId}.md`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-1 rounded-md bg-white/[0.07] px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/60"
                      >
                        <Download className="h-2.5 w-2.5" />
                        Export
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Prior Memos ──────────────────────────────────────────── */}
      <div className={GLASS_CARD}>
        <h2 className={SECTION_HEADER}>Prior Memos</h2>
        {memos.length === 0 ? (
          <p className="mt-3 text-xs text-white/70">
            No memos yet. Share a Decision Memo from the Dashboard to see it
            here.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {memos.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/60">
                      {m.company}
                    </span>
                    <span className="text-[10px] text-white/70">{m.date}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
                        m.confidence >= 70
                          ? "bg-emerald-500/10 text-emerald-400/70"
                          : m.confidence >= 50
                            ? "bg-amber-500/10 text-amber-400/70"
                            : "bg-rose-500/10 text-rose-400/70",
                      )}
                    >
                      {m.confidence}%
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/60">
                    {m.question}
                  </p>
                </div>
                <div className="ml-3 flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate(`/memo/${m.id}`)}
                    className="flex items-center gap-1 rounded-md bg-white/[0.07] px-2 py-1 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/60"
                  >
                    <Eye className="h-2.5 w-2.5" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Reopen = navigate to dashboard (memo data is in localStorage)
                      navigate("/founder");
                    }}
                    className="flex items-center gap-1 rounded-md bg-accent-primary/10 px-2 py-1 text-[10px] font-medium text-accent-primary/70 transition-colors hover:bg-accent-primary/20 hover:text-accent-primary"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Reopen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── DiffSection sub-component ───────────────────────────────────── */

function DiffSection({
  label,
  items,
  color,
}: {
  label: string;
  items: SnapshotDiff[];
  color: "sky" | "emerald" | "rose" | "amber";
}) {
  const colorMap = {
    sky: "border-sky-500/10 bg-sky-500/[0.03]",
    emerald: "border-emerald-500/10 bg-emerald-500/[0.03]",
    rose: "border-rose-500/10 bg-rose-500/[0.03]",
    amber: "border-amber-500/10 bg-amber-500/[0.03]",
  };
  const textColor = {
    sky: "text-sky-400/70",
    emerald: "text-emerald-400/70",
    rose: "text-rose-400/70",
    amber: "text-amber-400/70",
  };

  return (
    <div className={cn("rounded-lg border p-3", colorMap[color])}>
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.15em]",
          textColor[color],
        )}
      >
        {label}
      </span>
      <ul className="mt-2 space-y-1.5">
        {items.map((diff, i) => (
          <li key={`${diff.field}-${i}`}>
            {diff.previous && (
              <p className="text-xs text-white/60 line-through decoration-white/10">
                {diff.previous}
              </p>
            )}
            {diff.current && (
              <p className="text-sm text-white/60">{diff.current}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default memo(HistoryView);
