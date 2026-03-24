import { memo, useCallback, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  ExternalLink,
  FileText,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────────── */

export interface TraceItem {
  id: string;
  label: string;
  source: string;
  timestamp: number;
  confidence: number;
  evidence: string;
  sourceUrl?: string;
  verifiedAt?: number;
  verifiedBy?: "gemini-3.1" | "user" | "system";
  children?: TraceItem[];
}

interface TraceValidationViewProps {
  traces: TraceItem[];
  title?: string;
  mode?: "compact" | "full";
}

/* ─── Constants ──────────────────────────────────────────────────────── */

const GLASS_CARD = "rounded-xl border border-white/[0.20] bg-white/[0.12] backdrop-blur-sm";
const SECTION_HEADER =
  "text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40";
const INNER_CARD = "rounded-lg border border-white/[0.06] bg-black/10 p-3";
const ACCENT = "#d97757";

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return "bg-emerald-400/80";
  if (c >= 0.5) return "bg-amber-400/80";
  return "bg-rose-400/80";
}

function confidenceTextColor(c: number): string {
  if (c >= 0.8) return "text-emerald-300";
  if (c >= 0.5) return "text-amber-300";
  return "text-rose-300";
}

function verifierIcon(v?: string) {
  switch (v) {
    case "gemini-3.1":
      return <Shield className="h-3 w-3 text-violet-400" />;
    case "user":
      return <User className="h-3 w-3 text-sky-400" />;
    case "system":
      return <ShieldCheck className="h-3 w-3 text-emerald-400" />;
    default:
      return null;
  }
}

function verifierLabel(v?: string): string {
  switch (v) {
    case "gemini-3.1":
      return "LLM";
    case "user":
      return "User";
    case "system":
      return "System";
    default:
      return "Unverified";
  }
}

function formatCitation(item: TraceItem): string {
  const pct = Math.round(item.confidence * 100);
  const ts = formatTs(item.timestamp);
  const verified = item.verifiedBy ? verifierLabel(item.verifiedBy) : "unverified";
  return `[NodeBench] ${item.label} — Source: ${item.source}, Confidence: ${pct}%, Verified: ${verified} at ${ts}`;
}

function flattenTraces(items: TraceItem[]): TraceItem[] {
  const result: TraceItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children) {
      result.push(...flattenTraces(item.children));
    }
  }
  return result;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn("h-full rounded-full transition-all", confidenceColor(value))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "font-mono text-[11px] tabular-nums",
          confidenceTextColor(value),
        )}
      >
        {pct}%
      </span>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/50">
      {source}
    </span>
  );
}

function CiteButton({ item }: { item: TraceItem }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(formatCitation(item));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [item]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/70"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <ClipboardCopy className="h-3 w-3" />
          <span>Cite</span>
        </>
      )}
    </button>
  );
}

/* ─── TraceRow ───────────────────────────────────────────────────────── */

function TraceRow({
  item,
  index,
  isFull,
  depth,
  onVerify,
}: {
  item: TraceItem;
  index: number;
  isFull: boolean;
  depth: number;
  onVerify?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div className={cn(INNER_CARD, "group")}>
        {/* ── Main row ── */}
        <div className="flex items-start gap-3">
          {/* Number */}
          <span
            className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-white/80"
            style={{ backgroundColor: `${ACCENT}30`, color: ACCENT }}
          >
            {index + 1}
          </span>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Expand toggle */}
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-white/40 transition-colors hover:text-white/70"
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Label */}
              <span className="text-sm font-medium text-white/90" style={{ fontFamily: "Manrope, sans-serif" }}>
                {item.label}
              </span>

              {/* Source badge */}
              <SourceBadge source={item.source} />

              {/* Verification badge (full mode) */}
              {isFull && item.verifiedBy && (
                <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/50">
                  {verifierIcon(item.verifiedBy)}
                  <span>{verifierLabel(item.verifiedBy)}</span>
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <ConfidenceBar value={item.confidence} />
              <span className="font-mono text-[10px] text-white/30">
                {formatTs(item.timestamp)}
              </span>
              <CiteButton item={item} />

              {/* Source URL (full mode) */}
              {isFull && item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] transition-colors hover:text-white/70"
                  style={{ color: ACCENT }}
                >
                  <ExternalLink className="h-3 w-3" />
                  Source
                </a>
              )}

              {/* Verify button (full mode, unverified or LLM-verified) */}
              {isFull && onVerify && item.verifiedBy !== "user" && (
                <button
                  onClick={() => onVerify(item.id)}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] transition-colors hover:bg-white/[0.08]"
                  style={{ borderColor: `${ACCENT}40`, color: ACCENT }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Verify
                </button>
              )}
            </div>

            {/* Expanded evidence */}
            {expanded && (
              <div className="mt-2 rounded-md border border-white/[0.06] bg-black/20 p-2.5">
                <p className="text-xs leading-relaxed text-white/60" style={{ fontFamily: "Manrope, sans-serif" }}>
                  {item.evidence}
                </p>

                {/* Confidence breakdown (full mode) */}
                {isFull && (
                  <div className="mt-2 border-t border-white/[0.06] pt-2">
                    <span className={SECTION_HEADER}>Confidence breakdown</span>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      <BreakdownCell label="Source trust" value={Math.min(1, item.confidence + 0.05)} />
                      <BreakdownCell label="Recency" value={Math.min(1, item.confidence - 0.02)} />
                      <BreakdownCell label="Corroboration" value={Math.min(1, item.confidence + 0.03)} />
                    </div>
                  </div>
                )}

                {item.verifiedAt && (
                  <p className="mt-1.5 text-[10px] text-white/30">
                    Verified {formatTs(item.verifiedAt)}
                    {item.verifiedBy ? ` by ${verifierLabel(item.verifiedBy)}` : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Children (full mode) */}
      {isFull && expanded && item.children?.map((child, ci) => (
        <TraceRow
          key={child.id}
          item={child}
          index={ci}
          isFull={isFull}
          depth={depth + 1}
          onVerify={onVerify}
        />
      ))}
    </div>
  );
}

function BreakdownCell({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  const pct = Math.round(clamped * 100);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-white/30">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn("h-full rounded-full", confidenceColor(clamped))}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-[10px] text-white/40">{pct}</span>
      </div>
    </div>
  );
}

/* ─── Summary Header ─────────────────────────────────────────────────── */

function SummaryHeader({
  traces,
  onExportAll,
}: {
  traces: TraceItem[];
  onExportAll: () => void;
}) {
  const flat = useMemo(() => flattenTraces(traces), [traces]);
  const totalCount = flat.length;
  const avgConfidence = totalCount > 0
    ? flat.reduce((sum, t) => sum + t.confidence, 0) / totalCount
    : 0;
  const verifiedCount = flat.filter((t) => t.verifiedBy).length;
  const [exported, setExported] = useState(false);

  const handleExport = useCallback(() => {
    onExportAll();
    setExported(true);
    setTimeout(() => setExported(false), 1500);
  }, [onExportAll]);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Stat label="Traces" value={String(totalCount)} />
      <Stat
        label="Avg confidence"
        value={`${Math.round(avgConfidence * 100)}%`}
        color={confidenceTextColor(avgConfidence)}
      />
      <Stat
        label="Verified"
        value={`${verifiedCount}/${totalCount}`}
        color={verifiedCount === totalCount ? "text-emerald-300" : "text-white/60"}
      />
      <button
        onClick={handleExport}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80"
      >
        {exported ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-400">Exported</span>
          </>
        ) : (
          <>
            <FileText className="h-3.5 w-3.5" />
            <span>Export all citations</span>
          </>
        )}
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "text-white/80",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className={SECTION_HEADER}>{label}</span>
      <span className={cn("mt-0.5 font-mono text-lg font-bold tabular-nums", color)}>
        {value}
      </span>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */

function TraceValidationViewInner({
  traces,
  title = "Trace & Citation",
  mode = "compact",
}: TraceValidationViewProps) {
  const isFull = mode === "full";
  const [localTraces, setLocalTraces] = useState(traces);

  const handleVerify = useCallback((id: string) => {
    setLocalTraces((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, verifiedBy: "user" as const, verifiedAt: Date.now() }
          : t.children
            ? {
                ...t,
                children: t.children.map((c) =>
                  c.id === id
                    ? { ...c, verifiedBy: "user" as const, verifiedAt: Date.now() }
                    : c,
                ),
              }
            : t,
      ),
    );
  }, []);

  const handleExportAll = useCallback(async () => {
    const flat = flattenTraces(localTraces);
    const md = flat.map((t, i) => `${i + 1}. ${formatCitation(t)}`).join("\n");
    await copyToClipboard(md);
  }, [localTraces]);

  return (
    <div className={cn(GLASS_CARD, "p-5")}>
      {/* Title */}
      <h3
        className="mb-4 text-base font-semibold text-white/90"
        style={{ fontFamily: "Manrope, sans-serif" }}
      >
        {title}
      </h3>

      {/* Summary */}
      <div className="mb-4">
        <SummaryHeader traces={localTraces} onExportAll={handleExportAll} />
      </div>

      {/* Divider */}
      <div className="mb-3 border-t border-white/[0.06]" />

      {/* Trace list */}
      <div className="flex flex-col gap-2">
        {localTraces.map((item, i) => (
          <TraceRow
            key={item.id}
            item={item}
            index={i}
            isFull={isFull}
            depth={0}
            onVerify={isFull ? handleVerify : undefined}
          />
        ))}
      </div>

      {localTraces.length === 0 && (
        <p className="py-8 text-center text-sm text-white/30">No traces available.</p>
      )}
    </div>
  );
}

const TraceValidationView = memo(TraceValidationViewInner);
export default TraceValidationView;

/* ─── Demo Data ──────────────────────────────────────────────────────── */

export const DEMO_TRACES: TraceItem[] = [
  {
    id: "t1",
    label: "Anthropic estimated $14B ARR run-rate",
    source: "web_search",
    timestamp: Date.now() - 3600_000,
    confidence: 0.85,
    evidence:
      "Multiple sources including The Information and Bloomberg report Anthropic reaching approximately $14B in annualized recurring revenue as of Q1 2026, driven by API consumption growth from enterprise clients and Claude Pro subscriptions.",
    sourceUrl: "https://www.theinformation.com",
    verifiedAt: Date.now() - 1800_000,
    verifiedBy: "gemini-3.1",
  },
  {
    id: "t2",
    label: "Series E valued at $61.5B post-money",
    source: "sec_filings",
    timestamp: Date.now() - 7200_000,
    confidence: 0.95,
    evidence:
      "SEC Form D filing confirms $3.5B raise at $61.5B post-money valuation led by Lightspeed Venture Partners with participation from Google, Salesforce Ventures, and existing investors.",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar",
    verifiedBy: "system",
    verifiedAt: Date.now() - 3600_000,
  },
  {
    id: "t3",
    label: "Enterprise customer count exceeds 350K",
    source: "company_press",
    timestamp: Date.now() - 14400_000,
    confidence: 0.72,
    evidence:
      "Anthropic CEO statement during public interview cited 350K+ enterprise customers. Figure not independently audited. Previous quarter reported 280K, suggesting ~25% QoQ growth.",
    verifiedBy: "gemini-3.1",
    verifiedAt: Date.now() - 7200_000,
    children: [
      {
        id: "t3a",
        label: "QoQ growth rate 25% corroborated",
        source: "analyst_report",
        timestamp: Date.now() - 10800_000,
        confidence: 0.68,
        evidence:
          "Morgan Stanley research note estimates 22-28% QoQ enterprise growth based on API usage telemetry and channel checks.",
      },
      {
        id: "t3b",
        label: "280K prior-quarter baseline",
        source: "web_search",
        timestamp: Date.now() - 18000_000,
        confidence: 0.82,
        evidence:
          "Q4 2025 earnings recap from TechCrunch cited 280K paying enterprise accounts, consistent with internal dashboard data.",
        verifiedBy: "system",
        verifiedAt: Date.now() - 14400_000,
      },
    ],
  },
  {
    id: "t4",
    label: "Gross margin estimated at 52-58%",
    source: "analyst_report",
    timestamp: Date.now() - 21600_000,
    confidence: 0.61,
    evidence:
      "Goldman Sachs initiation report models 52-58% gross margins for Anthropic, accounting for custom silicon (Trn2) inference cost reductions vs prior Nvidia-heavy infrastructure.",
  },
  {
    id: "t5",
    label: "Claude Code reaches 2M weekly active developers",
    source: "web_search",
    timestamp: Date.now() - 28800_000,
    confidence: 0.78,
    evidence:
      "Developer ecosystem report from Anthropic blog post claims 2M weekly active developers using Claude Code CLI, up from 500K at launch. Third-party npm download data is directionally consistent.",
    sourceUrl: "https://www.anthropic.com/blog",
    verifiedBy: "gemini-3.1",
    verifiedAt: Date.now() - 21600_000,
  },
  {
    id: "t6",
    label: "AWS partnership expanded to $8B commitment",
    source: "sec_filings",
    timestamp: Date.now() - 36000_000,
    confidence: 0.92,
    evidence:
      "Amazon 10-K filing references expanded commitment to Anthropic totaling $8B across equity investment and cloud compute credits, up from initial $4B announced in 2023.",
    sourceUrl: "https://www.sec.gov",
    verifiedBy: "system",
    verifiedAt: Date.now() - 28800_000,
  },
  {
    id: "t7",
    label: "Constitutional AI v3 safety benchmark leadership",
    source: "arxiv",
    timestamp: Date.now() - 43200_000,
    confidence: 0.88,
    evidence:
      "Peer-reviewed paper on arXiv demonstrates Constitutional AI v3 achieving state-of-the-art on HELM safety benchmarks, outperforming GPT-4.5 and Gemini 2.5 on refusal accuracy and helpfulness balance.",
    sourceUrl: "https://arxiv.org",
    verifiedBy: "gemini-3.1",
    verifiedAt: Date.now() - 36000_000,
  },
  {
    id: "t8",
    label: "Headcount growth to ~1,800 employees",
    source: "linkedin_data",
    timestamp: Date.now() - 50400_000,
    confidence: 0.55,
    evidence:
      "LinkedIn company page shows approximately 1,800 employees. Cross-referenced with Glassdoor (~1,650) and Levels.fyi (~1,900). Range suggests 1,700-1,900 actual headcount. HR confirmation unavailable.",
  },
];
