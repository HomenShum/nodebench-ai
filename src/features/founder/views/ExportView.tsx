/**
 * ExportView — Export Center for Founder Artifact Packets.
 *
 * Phase 9: Turn packets into downstream artifacts.
 * Every serious workflow ends in a presentable artifact for another human.
 *
 * Route: /founder/export
 * 7 export formats: Memo, Markdown, HTML Brief, CSV, Share URL, Clipboard, Agent Brief.
 */

import { memo, useCallback, useMemo, useState } from "react";
import {
  FileText,
  FileDown,
  Globe,
  Table2,
  Link2,
  Clipboard,
  Bot,
  ArrowLeft,
  Package,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/useToast";
import {
  loadActiveFounderArtifactPacket,
  artifactPacketToMarkdown,
  artifactPacketToHtml,
  getArtifactPacketTypeLabel,
  formatArtifactPacketTimestamp,
} from "../lib/artifactPacket";
import type { FounderArtifactPacket } from "../types/artifactPacket";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Format definitions                                                 */
/* ------------------------------------------------------------------ */

type ExportFormatId =
  | "memo"
  | "markdown"
  | "html"
  | "csv"
  | "share-url"
  | "clipboard"
  | "agent-brief";

interface ExportFormat {
  id: ExportFormatId;
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: "memo",
    icon: FileText,
    title: "Memo",
    description: "One-page founder brief",
    actionLabel: "Download",
  },
  {
    id: "markdown",
    icon: FileDown,
    title: "Markdown",
    description: "Raw markdown for docs",
    actionLabel: "Download",
  },
  {
    id: "html",
    icon: Globe,
    title: "HTML Brief",
    description: "Standalone dark page",
    actionLabel: "Download",
  },
  {
    id: "csv",
    icon: Table2,
    title: "CSV",
    description: "Variables & metrics",
    actionLabel: "Download",
  },
  {
    id: "share-url",
    icon: Link2,
    title: "Share URL",
    description: "Public memo link",
    actionLabel: "Generate",
  },
  {
    id: "clipboard",
    icon: Clipboard,
    title: "Clipboard",
    description: "Copy full packet",
    actionLabel: "Copy",
  },
  {
    id: "agent-brief",
    icon: Bot,
    title: "Agent Brief",
    description: "Brief for Claude/OClaw",
    actionLabel: "Copy",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function packetToCsv(packet: FounderArtifactPacket): string {
  const rows: string[][] = [["Section", "Item", "Value", "Priority"]];

  rows.push(["Company", "Name", packet.canonicalEntity.name, ""]);
  rows.push(["Company", "Mission", packet.canonicalEntity.mission, ""]);
  rows.push(["Company", "Wedge", packet.canonicalEntity.wedge, ""]);
  rows.push([
    "Company",
    "Identity Confidence",
    `${Math.round(packet.canonicalEntity.identityConfidence * 100)}%`,
    "",
  ]);
  rows.push(["Company", "State", packet.canonicalEntity.companyState, ""]);

  for (const c of packet.contradictions) {
    rows.push(["Contradiction", c.title, c.detail, c.severity]);
  }

  for (const risk of packet.risks) {
    rows.push(["Risk", risk, "", ""]);
  }

  packet.nextActions.forEach((action, i) => {
    rows.push([
      "Action",
      String(i + 1),
      action.label,
      action.priority,
    ]);
  });

  for (const evidence of packet.keyEvidence) {
    rows.push(["Evidence", evidence.title, evidence.detail, evidence.source]);
  }

  for (const entity of packet.nearbyEntities) {
    rows.push(["Entity", entity.name, entity.whyItMatters, entity.relationship]);
  }

  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
}

function packetToAgentBrief(packet: FounderArtifactPacket): string {
  const lines: string[] = [];
  lines.push(`ENTITY: ${packet.canonicalEntity.name}`);
  lines.push(`WEDGE: ${packet.canonicalEntity.wedge}`);
  lines.push(`CONFIDENCE: ${Math.round(packet.canonicalEntity.identityConfidence * 100)}%`);
  lines.push(`CHANGED: ${packet.whatChanged}`);
  lines.push("");
  lines.push("CONTRADICTIONS:");
  for (const c of packet.contradictions) {
    lines.push(`- [${c.severity}] ${c.title}`);
  }
  lines.push("");
  lines.push("ACTIONS:");
  packet.nextActions.forEach((a, i) => {
    lines.push(`${i + 1}. [${a.priority}] ${a.label}`);
  });
  lines.push("");
  lines.push("AGENT_INSTRUCTIONS:");
  lines.push(packet.agentInstructions);
  return lines.join("\n");
}

function packetToPlainText(packet: FounderArtifactPacket): string {
  const md = artifactPacketToMarkdown(packet);
  // Strip markdown formatting for plain text
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, ""))
    .trim();
}

const MEMO_STORAGE_KEY = "nodebench-memos";

function savePacketAsMemo(packet: FounderArtifactPacket): string {
  const memoId = `export-${packet.packetId}`;
  const memoData = {
    id: memoId,
    company: packet.canonicalEntity.name,
    date: new Date().toISOString().slice(0, 10),
    question: packet.objective,
    answer: packet.operatingMemo,
    confidence: Math.round(packet.canonicalEntity.identityConfidence * 100),
    sourceCount: packet.provenance.sourceCount,
    variables: packet.contradictions.slice(0, 5).map((c, i) => ({
      rank: i + 1,
      name: c.title,
      direction: c.severity === "high" ? "down" : c.severity === "low" ? "up" : "neutral",
      impact: c.severity,
    })),
    scenarios: [
      {
        label: "Current",
        probability: 60,
        outcome: packet.whatChanged,
      },
      {
        label: "Resolved",
        probability: 25,
        outcome: packet.nextActions[0]?.label ?? "Execute top action",
      },
      {
        label: "Drift",
        probability: 15,
        outcome: packet.contradictions[0]?.detail ?? "Contradictions compound",
      },
    ],
    actions: packet.nextActions.map((a) => ({
      action: a.label,
      impact: a.priority,
    })),
  };

  try {
    const raw = localStorage.getItem(MEMO_STORAGE_KEY);
    const memos: Record<string, unknown> = raw ? JSON.parse(raw) : {};
    memos[memoId] = memoData;
    localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(memos));
  } catch {
    const memos: Record<string, unknown> = {};
    memos[memoId] = memoData;
    localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(memos));
  }

  return memoId;
}

/* ------------------------------------------------------------------ */
/*  Preview renderers                                                  */
/* ------------------------------------------------------------------ */

function MemoPreview({ packet }: { packet: FounderArtifactPacket }) {
  const text = packetToPlainText(packet);
  return (
    <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/70 font-mono">
      {text}
    </pre>
  );
}

function MarkdownPreview({ packet }: { packet: FounderArtifactPacket }) {
  const md = artifactPacketToMarkdown(packet);
  return (
    <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/70 font-mono">
      {md}
    </pre>
  );
}

function HtmlPreview({ packet }: { packet: FounderArtifactPacket }) {
  const html = artifactPacketToHtml(packet);
  const blobUrl = useMemo(() => {
    const blob = new Blob([html], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [html]);
  return (
    <iframe
      src={blobUrl}
      title="HTML Brief Preview"
      className="h-[400px] w-full rounded-xl border border-white/[0.06]"
      sandbox="allow-same-origin"
    />
  );
}

function CsvPreview({ packet }: { packet: FounderArtifactPacket }) {
  const csv = packetToCsv(packet);
  const rows = csv.split("\n").map((row) =>
    row.split(",").map((cell) => cell.replace(/^"|"$/g, "").replace(/""/g, '"')),
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] text-white/70">
        <thead>
          <tr>
            {rows[0]?.map((cell, i) => (
              <th
                key={i}
                className="border-b border-white/[0.06] px-3 py-2 text-left text-[11px] uppercase tracking-[0.2em] text-white/60 font-medium"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, ri) => (
            <tr key={ri} className="border-b border-white/[0.03]">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 max-w-[240px] truncate">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentBriefPreview({ packet }: { packet: FounderArtifactPacket }) {
  const brief = packetToAgentBrief(packet);
  return (
    <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/70 font-mono">
      {brief}
    </pre>
  );
}

function ShareUrlPreview() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Link2 className="h-8 w-8 text-white/70" />
      <p className="text-[13px] text-white/60">
        Click "Generate" to create a shareable memo URL.
        <br />
        The link will open a standalone page that requires no sign-in.
      </p>
    </div>
  );
}

function ClipboardPreview({ packet }: { packet: FounderArtifactPacket }) {
  const md = artifactPacketToMarkdown(packet);
  return (
    <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/70 font-mono max-h-[300px] overflow-y-auto">
      {md}
    </pre>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const ExportView = memo(function ExportView() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormatId>("memo");

  const packet = useMemo(() => loadActiveFounderArtifactPacket(), []);

  const handleExport = useCallback(
    (formatId: ExportFormatId) => {
      if (!packet) return;

      const slug = packet.canonicalEntity.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const datestamp = new Date().toISOString().slice(0, 10);

      switch (formatId) {
        case "memo": {
          const content = packetToPlainText(packet);
          downloadFile(`${slug}-memo-${datestamp}.txt`, content, "text/plain");
          toast("Downloaded memo.txt", "success");
          break;
        }
        case "markdown": {
          const content = artifactPacketToMarkdown(packet);
          downloadFile(`${slug}-packet-${datestamp}.md`, content, "text/markdown");
          toast("Downloaded packet.md", "success");
          break;
        }
        case "html": {
          const content = artifactPacketToHtml(packet);
          downloadFile(`${slug}-brief-${datestamp}.html`, content, "text/html");
          toast("Downloaded brief.html", "success");
          break;
        }
        case "csv": {
          const content = packetToCsv(packet);
          downloadFile(`${slug}-data-${datestamp}.csv`, content, "text/csv");
          toast("Downloaded data.csv", "success");
          break;
        }
        case "share-url": {
          const memoId = savePacketAsMemo(packet);
          const url = `${window.location.origin}/memo/${memoId}`;
          navigator.clipboard.writeText(url).then(
            () => toast("Share URL copied to clipboard", "success"),
            () => toast("URL generated but clipboard failed", "warning"),
          );
          break;
        }
        case "clipboard": {
          const content = artifactPacketToMarkdown(packet);
          navigator.clipboard.writeText(content).then(
            () => toast("Full packet copied to clipboard", "success"),
            () => toast("Failed to copy to clipboard", "error"),
          );
          break;
        }
        case "agent-brief": {
          const content = packetToAgentBrief(packet);
          navigator.clipboard.writeText(content).then(
            () => toast("Agent brief copied to clipboard", "success"),
            () => toast("Failed to copy to clipboard", "error"),
          );
          break;
        }
      }
    },
    [packet, toast],
  );

  /* ── Empty state ─────────────────────────────────────────────── */
  if (!packet) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <Package className="h-12 w-12 text-white/70" />
          <h2 className="text-lg font-semibold text-white/80">No packet loaded</h2>
          <p className="text-[13px] leading-relaxed text-white/60">
            Generate an Artifact Packet from the Dashboard first. The Export Center
            will render it into any downstream format you need.
          </p>
          <button
            type="button"
            onClick={() => navigate("/founder")}
            className="mt-2 rounded-lg bg-[#d97757] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#c56a4a]"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ── Preview router ──────────────────────────────────────────── */
  const previewNode = (() => {
    switch (selectedFormat) {
      case "memo":
        return <MemoPreview packet={packet} />;
      case "markdown":
        return <MarkdownPreview packet={packet} />;
      case "html":
        return <HtmlPreview packet={packet} />;
      case "csv":
        return <CsvPreview packet={packet} />;
      case "share-url":
        return <ShareUrlPreview />;
      case "clipboard":
        return <ClipboardPreview packet={packet} />;
      case "agent-brief":
        return <AgentBriefPreview packet={packet} />;
      default:
        return null;
    }
  })();

  const confidence = Math.round(packet.canonicalEntity.identityConfidence * 100);
  const typeLabel = getArtifactPacketTypeLabel(packet.packetType);
  const timeAgo = formatArtifactPacketTimestamp(packet.provenance.generatedAt);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-white/[0.06] px-6 py-5">
        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={() => navigate("/founder")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/70"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white/90">Export Center</h1>
            <p className="text-[13px] text-white/60">
              Turn your Artifact Packet into a presentable deliverable
            </p>
          </div>
        </div>
      </header>

      {/* ── Active packet strip ─────────────────────────────────── */}
      <div className="shrink-0 border-b border-white/[0.20] bg-white/[0.12] px-6 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-1.5">
          Active Packet
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <span className="font-medium text-white/80">{typeLabel}</span>
          <span className="text-white/70">|</span>
          <span className="text-white/60">Generated {timeAgo}</span>
          <span className="text-white/70">|</span>
          <span className="text-white/60">{confidence}% confidence</span>
          <span className="text-white/70">|</span>
          <span className="text-white/60">{packet.canonicalEntity.name}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* ── Export format cards ────────────────────────────────── */}
        <div className="mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-3">
            Export Formats
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {EXPORT_FORMATS.map((format) => {
              const Icon = format.icon;
              const isSelected = selectedFormat === format.id;
              return (
                <div
                  key={format.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedFormat(format.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedFormat(format.id);
                    }
                  }}
                  className={`
                    flex flex-col rounded-xl border p-4 transition-all duration-150 cursor-pointer
                    ${
                      isSelected
                        ? "border-[#d97757]/40 bg-[#d97757]/[0.06] shadow-[0_0_0_1px_rgba(217,119,87,0.15)]"
                        : "border-white/[0.20] bg-white/[0.12] hover:bg-white/[0.07] hover:border-white/[0.1]"
                    }
                  `}
                >
                  <Icon
                    className={`h-5 w-5 mb-2 ${isSelected ? "text-[#d97757]" : "text-white/60"}`}
                  />
                  <span
                    className={`text-[13px] font-medium mb-0.5 ${isSelected ? "text-white/90" : "text-white/70"}`}
                  >
                    {format.title}
                  </span>
                  <span className="text-[11px] text-white/60 mb-3 leading-snug">
                    {format.description}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(format.id);
                    }}
                    className={`
                      mt-auto rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors
                      ${
                        isSelected
                          ? "bg-[#d97757] text-white hover:bg-[#c56a4a]"
                          : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white/70"
                      }
                    `}
                  >
                    {format.actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Preview ───────────────────────────────────────────── */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-3">
            Preview
          </div>
          <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-5 min-h-[200px]">
            {previewNode}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ExportView;
