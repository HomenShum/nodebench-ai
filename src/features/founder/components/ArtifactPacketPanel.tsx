import { memo, useMemo } from "react";
import {
  BarChart3,
  Bot,
  ClipboardCopy,
  Code2,
  Eye,
  FileText,
  Globe,
  History,
  Layers,
  RefreshCw,
  Sparkles,
  Table2,
  Target,
  TriangleAlert,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatArtifactPacketTimestamp,
  getArtifactPacketTypeLabel,
} from "../lib/artifactPacket";
import type { ArtifactPacketType, FounderArtifactPacket } from "../types/artifactPacket";

/* ─── Props ──────────────────────────────────────────────────────────── */

interface ArtifactPacketPanelProps {
  packet: FounderArtifactPacket | null;
  packetHistory: FounderArtifactPacket[];
  onGenerate: (mode: "weekly_reset" | "pre_delegation" | "important_change") => void;
  onRefresh: () => void;
  onExportMarkdown: () => void;
  onExportHTML: () => void;
  onCopyPacket: () => void;
  onHandToAgent: () => void;
}

/* ─── Constants ──────────────────────────────────────────────────────── */

const GLASS_CARD = "rounded-xl border border-white/[0.20] bg-white/[0.12]";
const SECTION_HEADER =
  "text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60";
const INNER_CARD = "rounded-lg border border-white/[0.06] bg-black/10 p-4";

const MODE_OPTIONS: Array<{ type: ArtifactPacketType; label: string }> = [
  { type: "weekly_reset", label: "Weekly Reset" },
  { type: "pre_delegation", label: "Pre-Delegation Brief" },
  { type: "important_change", label: "Change Review" },
];

const SEVERITY_BORDER: Record<string, string> = {
  high: "border-l-rose-400/60",
  medium: "border-l-amber-400/60",
  low: "border-l-emerald-400/60",
};

const PRIORITY_PILL: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  low: "bg-white/[0.06] text-white/60 border-white/[0.08]",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "NOW",
  medium: "This week",
  low: "Next week",
};

/* ─── Helpers ────────────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function EmptyState({
  onGenerate,
}: {
  onGenerate: ArtifactPacketPanelProps["onGenerate"];
}) {
  return (
    <div className="flex flex-col items-center gap-5 px-4 py-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.20] bg-white/[0.12]">
        <Layers className="h-5 w-5 text-white/60" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-white/60">
          No packet generated yet.
        </p>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-white/60">
          Choose a mode to generate your first operating brief:
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            data-testid={`generate-${option.type}-packet`}
            onClick={() => onGenerate(option.type)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function VersionIndicator({
  history,
  currentId,
}: {
  history: FounderArtifactPacket[];
  currentId: string;
}) {
  if (!history || history.length <= 1) return null;
  const currentIndex = history.findIndex((p) => p.packetId === currentId);
  const version = currentIndex >= 0 ? history.length - currentIndex : history.length;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-white/60">
      <History className="h-3 w-3" />
      {Array.from({ length: Math.min(history.length, 5) }, (_, i) => {
        const v = history.length - i;
        const isCurrent = i === currentIndex;
        return (
          <span
            key={v}
            className={cn(
              "font-mono",
              isCurrent ? "text-[#d97757]" : "text-white/60",
            )}
          >
            v{v}
          </span>
        );
      }).reduce<React.ReactNode[]>((acc, el, i) => {
        if (i > 0) acc.push(<span key={`dot-${i}`} className="text-white/70"> &middot; </span>);
        acc.push(el);
        return acc;
      }, [])}
    </span>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */

function ArtifactPacketPanelInner({
  packet,
  packetHistory,
  onGenerate,
  onRefresh,
  onExportMarkdown,
  onExportHTML,
  onCopyPacket,
  onHandToAgent,
}: ArtifactPacketPanelProps) {
  const confidencePercent = useMemo(
    () =>
      packet
        ? `${Math.round(packet.canonicalEntity.identityConfidence * 100)}%`
        : null,
    [packet],
  );

  return (
    <section
      className={cn(GLASS_CARD, "p-5")}
      role="region"
      aria-label="Artifact packet review"
    >
      {/* ── Header row ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={SECTION_HEADER}>
            <span className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" />
              Artifact Packet
            </span>
          </div>
          {packet && (
            <>
              <span className="inline-flex items-center rounded-full border border-[#d97757]/25 bg-[#d97757]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#d97757]">
                {getArtifactPacketTypeLabel(packet.packetType)}
              </span>
              <VersionIndicator
                history={packetHistory}
                currentId={packet.packetId}
              />
            </>
          )}
        </div>

        {packet && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/60">
              Generated {relativeTime(packet.provenance.generatedAt)}
            </span>
            <button
              type="button"
              aria-label="Refresh packet"
              onClick={onRefresh}
              className="inline-flex items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.06] p-1.5 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/70"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Empty state ────────────────────────────────────────────── */}
      {!packet ? (
        <EmptyState onGenerate={onGenerate} />
      ) : (
        <>
          {/* ── Audience + Objective ────────────────────────────── */}
          {(packet.audience || packet.objective) && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px]">
              {packet.audience && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-2.5 py-1 text-white/60">
                  <Users className="h-3 w-3" />
                  {packet.audience}
                </span>
              )}
              {packet.objective && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-2.5 py-1 text-white/60">
                  <Eye className="h-3 w-3" />
                  {packet.objective}
                </span>
              )}
            </div>
          )}

          {/* ── Two-column: Company + Contradiction ───────────────── */}
          <div className="mt-5 grid gap-3 md:grid-cols-[1.3fr_1fr]">
            {/* Canonical company */}
            <div className={INNER_CARD}>
              <p className={SECTION_HEADER}>Canonical Company</p>
              <h3 className="mt-3 text-lg font-semibold text-white/90">
                {packet.canonicalEntity.name}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-white/60">
                <span>{packet.canonicalEntity.companyState || "Forming"}</span>
                <span className="text-white/70">&middot;</span>
                <span
                  className="font-mono tabular-nums text-white/60"
                  aria-label={`Identity confidence ${confidencePercent}`}
                >
                  {confidencePercent} confidence
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60">
                  Mission:{" "}
                </span>
                {packet.canonicalEntity.mission}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d97757]/20 bg-[#d97757]/8 px-2.5 py-1 text-[11px] text-[#d97757]">
                <Target className="h-3 w-3 shrink-0" />
                <span className="leading-tight">
                  {packet.canonicalEntity.wedge}
                </span>
              </div>
            </div>

            {/* Biggest contradiction */}
            {packet.contradictions[0] && (
              <div
                className={cn(
                  INNER_CARD,
                  "border-l-2",
                  SEVERITY_BORDER[packet.contradictions[0].severity] ??
                    SEVERITY_BORDER.medium,
                )}
              >
                <p className={SECTION_HEADER}>Biggest Contradiction</p>
                <h3 className="mt-3 text-sm font-semibold text-white/80">
                  {packet.contradictions[0].title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-white/60">
                  {packet.contradictions[0].detail}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                      packet.contradictions[0].severity === "high"
                        ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                        : packet.contradictions[0].severity === "medium"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
                    )}
                  >
                    <TriangleAlert className="h-2.5 w-2.5" />
                    {packet.contradictions[0].severity}
                  </span>
                  {packet.contradictions.length > 1 && (
                    <span className="text-[10px] text-white/60">
                      +{packet.contradictions.length - 1} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Operating memo ────────────────────────────────────── */}
          <div className={cn(INNER_CARD, "mt-3")}>
            <p className={SECTION_HEADER}>Operating Memo</p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              &ldquo;{packet.operatingMemo}&rdquo;
            </p>
          </div>

          {/* ── Next 3 moves ─────────────────────────────────────── */}
          <div className={cn(INNER_CARD, "mt-3")}>
            <p className={SECTION_HEADER}>Next 3 Moves</p>
            <div className="mt-3 space-y-2">
              {packet.nextActions.slice(0, 3).map((action, index) => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2.5"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#d97757]/10 font-mono text-[10px] font-bold text-[#d97757]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white/80">
                      {action.label}
                    </p>
                    {action.whyNow && (
                      <p className="mt-0.5 text-[11px] leading-relaxed text-white/60">
                        {action.whyNow}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      PRIORITY_PILL[action.priority] ?? PRIORITY_PILL.low,
                    )}
                  >
                    {PRIORITY_LABEL[action.priority] ?? "Later"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Key Evidence ──────────────────────────────────────── */}
          {packet.keyEvidence.length > 0 && (
            <div className={cn(INNER_CARD, "mt-3")}>
              <p className={SECTION_HEADER}>Key Evidence</p>
              <div className="mt-3 space-y-2">
                {packet.keyEvidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2"
                  >
                    <p className="text-xs font-medium text-white/70">
                      {ev.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-white/60">
                      {ev.detail}
                    </p>
                    <span className="mt-1 inline-block text-[10px] text-white/60">
                      Source: {ev.source}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Risks ─────────────────────────────────────────────── */}
          {packet.risks.length > 0 && (
            <div className={cn(INNER_CARD, "mt-3")}>
              <p className={SECTION_HEADER}>Risks</p>
              <ul className="mt-3 space-y-1.5">
                {packet.risks.map((risk, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs leading-relaxed text-white/60"
                  >
                    <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/50" />
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Recommended Framing ───────────────────────────────── */}
          {packet.recommendedFraming && (
            <div className={cn(INNER_CARD, "mt-3")}>
              <p className={SECTION_HEADER}>Recommended Framing</p>
              <p className="mt-3 text-sm leading-relaxed text-white/60 italic">
                {packet.recommendedFraming}
              </p>
            </div>
          )}

          {/* ── Agent Instructions ────────────────────────────────── */}
          {packet.agentInstructions && (
            <div className={cn(INNER_CARD, "mt-3 border-l-2 border-l-sky-500/30")}>
              <p className={SECTION_HEADER}>
                <span className="flex items-center gap-2">
                  <Bot className="h-3 w-3" />
                  Agent Instructions
                </span>
              </p>
              <p className="mt-3 text-xs leading-relaxed text-white/60 font-mono">
                {packet.agentInstructions}
              </p>
            </div>
          )}

          {/* ── What Changed (narrative) ─────────────────────────── */}
          {packet.whatChanged && (
            <div className={cn(INNER_CARD, "mt-3")}>
              <p className={SECTION_HEADER}>What Changed</p>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                {packet.whatChanged}
              </p>
            </div>
          )}

          {/* ── Nearby Entities ────────────────────────────────────── */}
          {packet.nearbyEntities.length > 0 && (
            <div className={cn(INNER_CARD, "mt-3")}>
              <p className={SECTION_HEADER}>
                <span className="flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  Nearby Entities
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {packet.nearbyEntities.map((ent) => (
                  <span
                    key={ent.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.06] px-2.5 py-1.5 text-[11px] text-white/60"
                    title={ent.whyItMatters}
                  >
                    {ent.name}
                    <span className="text-[9px] text-white/60">{ent.relationship}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Suggested Tables + Visuals ─────────────────────────── */}
          {(packet.tablesNeeded.length > 0 || packet.visualsSuggested.length > 0) && (
            <div className={cn(INNER_CARD, "mt-3")}>
              <p className={SECTION_HEADER}>Suggested Outputs</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {packet.tablesNeeded.map((t, i) => (
                  <span
                    key={`t-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-1.5 text-[11px] text-emerald-400/70"
                  >
                    <Table2 className="h-3 w-3" />
                    {t}
                  </span>
                ))}
                {packet.visualsSuggested.map((v, i) => (
                  <span
                    key={`v-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/15 bg-sky-500/5 px-2.5 py-1.5 text-[11px] text-sky-400/70"
                  >
                    <BarChart3 className="h-3 w-3" />
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Action bar ───────────────────────────────────────── */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ActionButton
              icon={<ClipboardCopy className="h-3.5 w-3.5" />}
              label="Copy"
              onClick={onCopyPacket}
            />
            <ActionButton
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Export Markdown"
              onClick={onExportMarkdown}
            />
            <ActionButton
              icon={<Code2 className="h-3.5 w-3.5" />}
              label="Export HTML"
              onClick={onExportHTML}
            />
            <div className="ml-auto">
              <button
                type="button"
                onClick={onHandToAgent}
                className="inline-flex items-center gap-2 rounded-lg border border-[#d97757]/25 bg-[#d97757]/10 px-3.5 py-2 text-xs font-medium text-[#d97757] transition-colors hover:bg-[#d97757]/20"
              >
                <Bot className="h-3.5 w-3.5" />
                Hand to Agent
              </button>
            </div>
          </div>

          {/* ── Mode selector row ────────────────────────────────── */}
          <div className="mt-3 flex flex-wrap gap-2">
            {MODE_OPTIONS.map((option) => {
              const isActive = packet.packetType === option.type;
              return (
                <button
                  key={option.type}
                  type="button"
                  aria-pressed={isActive}
                  data-testid={`generate-${option.type}-packet`}
                  onClick={() => onGenerate(option.type)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors",
                    isActive
                      ? "border-[#d97757]/30 bg-[#d97757]/10 text-[#d97757]"
                      : "border-white/[0.20] bg-white/[0.12] text-white/60 hover:bg-white/[0.07] hover:text-white/60",
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

/* ─── Shared action button ───────────────────────────────────────────── */

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-2 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white/70"
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── Export ──────────────────────────────────────────────────────────── */

const ArtifactPacketPanel = memo(ArtifactPacketPanelInner);
ArtifactPacketPanel.displayName = "ArtifactPacketPanel";

export { ArtifactPacketPanel };
export default ArtifactPacketPanel;
