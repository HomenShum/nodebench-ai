import { useCallback, useState } from "react";
import { Check, Copy, Download, FileCode2, FileText, Share2 } from "lucide-react";
import {
  artifactPacketToHtml,
  artifactPacketToMarkdown,
  artifactPacketToShareableMemoVariables,
} from "../lib/artifactPacket";
import type { FounderArtifactPacket } from "../types/artifactPacket";
import {
  copyMemoUrl,
  generateMemoId,
  saveMemoToStorage,
  type ShareableMemoData,
} from "../views/ShareableMemoView";

interface ExportArtifactPacketButtonProps {
  packet: FounderArtifactPacket;
  className?: string;
  onShared?: () => void;
}

function downloadText(content: string, mimeType: string, filename: string) {
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

function packetToShareableMemo(packet: FounderArtifactPacket): ShareableMemoData {
  return {
    id: generateMemoId(),
    company: packet.canonicalEntity.name,
    date: packet.provenance.generatedAt.slice(0, 10),
    question: packet.objective,
    answer: packet.operatingMemo,
    confidence: Math.round(packet.canonicalEntity.identityConfidence * 100),
    sourceCount: packet.provenance.sourceCount,
    variables: artifactPacketToShareableMemoVariables(packet),
    scenarios: [
      {
        label: "Base",
        probability: 55,
        outcome: packet.nextActions[0]?.label ?? "Resolve the top contradiction and keep execution focused.",
      },
      {
        label: "Bull",
        probability: 25,
        outcome: packet.nextActions[1]?.label ?? "Turn the current wedge into a cleaner, faster operating narrative.",
      },
      {
        label: "Bear",
        probability: 20,
        outcome: packet.contradictions[0]?.detail ?? "Unresolved contradictions force the team to rebuild the story again.",
      },
    ],
    actions: packet.nextActions.map((action) => ({
      action: action.label,
      impact: action.priority,
    })),
  };
}

export function ExportArtifactPacketButton({ packet, className = "", onShared }: ExportArtifactPacketButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(artifactPacketToMarkdown(packet));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy artifact packet markdown", error);
    }
  }, [packet]);

  const handleDownloadMarkdown = useCallback(() => {
    downloadText(
      artifactPacketToMarkdown(packet),
      "text/markdown",
      `${packet.canonicalEntity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-artifact-packet.md`,
    );
  }, [packet]);

  const handleDownloadHtml = useCallback(() => {
    downloadText(
      artifactPacketToHtml(packet),
      "text/html",
      `${packet.canonicalEntity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-artifact-packet.html`,
    );
  }, [packet]);

  const handleShareMemo = useCallback(async () => {
    const memo = packetToShareableMemo(packet);
    saveMemoToStorage(memo);
    const url = `${window.location.origin}/memo/${memo.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${packet.canonicalEntity.name} Artifact Packet`,
          text: packet.operatingMemo,
          url,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          copyMemoUrl(memo.id);
        }
      }
    } else {
      copyMemoUrl(memo.id);
    }

    onShared?.();
  }, [onShared, packet]);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Export artifact packet"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80"
      >
        <Share2 className="h-3.5 w-3.5" />
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/[0.08] bg-[#171615] p-1 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              void handleCopyMarkdown();
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/70 transition-colors hover:bg-white/[0.06]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy as Markdown"}
          </button>
          <button
            type="button"
            onClick={() => {
              handleDownloadMarkdown();
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/70 transition-colors hover:bg-white/[0.06]"
          >
            <Download className="h-3.5 w-3.5" />
            Download .md
          </button>
          <button
            type="button"
            onClick={() => {
              handleDownloadHtml();
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/70 transition-colors hover:bg-white/[0.06]"
          >
            <FileCode2 className="h-3.5 w-3.5" />
            Download .html
          </button>
          <button
            type="button"
            onClick={() => {
              void handleShareMemo();
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/70 transition-colors hover:bg-white/[0.06]"
          >
            <FileText className="h-3.5 w-3.5" />
            Share as memo
          </button>
        </div>
      )}

      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
}

export default ExportArtifactPacketButton;
