import React, { useState } from "react";
import {
  Linkedin,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Microscope,
  TrendingUp,
  Shield,
  Handshake,
  Newspaper,
  DollarSign,
} from "lucide-react";

interface LinkedInPostCardProps {
  content: string;
  postType: string;
  persona: string;
  dateString: string;
  postedAt: number;
  postUrl?: string;
  factCheckCount?: number;
  metadata?: Record<string, unknown>;
}

const POST_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  daily_digest: { label: "Daily Digest", color: "bg-indigo-100 text-indigo-700", icon: Newspaper },
  funding_tracker: { label: "Funding Tracker", color: "bg-indigo-100 text-gray-700", icon: TrendingUp },
  funding_brief: { label: "Funding Brief", color: "bg-green-100 text-green-700", icon: DollarSign },
  fda: { label: "FDA Update", color: "bg-red-100 text-red-700", icon: Shield },
  clinical: { label: "Clinical Trial", color: "bg-purple-100 text-purple-700", icon: FlaskConical },
  research: { label: "Research", color: "bg-blue-100 text-blue-700", icon: Microscope },
  ma: { label: "M&A", color: "bg-amber-100 text-amber-700", icon: Handshake },
};

const PERSONA_CONFIG: Record<string, { label: string; color: string }> = {
  GENERAL: { label: "General", color: "bg-gray-100 text-gray-600" },
  VC_INVESTOR: { label: "VC Investor", color: "bg-violet-100 text-violet-600" },
  TECH_BUILDER: { label: "Tech Builder", color: "bg-cyan-100 text-cyan-600" },
  FUNDING: { label: "Funding", color: "bg-indigo-100 text-indigo-600" },
  FDA: { label: "FDA", color: "bg-red-100 text-red-600" },
  CLINICAL: { label: "Clinical", color: "bg-purple-100 text-purple-600" },
  RESEARCH: { label: "Research", color: "bg-blue-100 text-blue-600" },
  MA: { label: "M&A", color: "bg-amber-100 text-amber-600" },
};

const CONTENT_PREVIEW_LENGTH = 400;

export const LinkedInPostCard: React.FC<LinkedInPostCardProps> = ({
  content,
  postType,
  persona,
  dateString,
  postedAt,
  postUrl,
  factCheckCount,
  metadata,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const typeConfig = POST_TYPE_CONFIG[postType] || POST_TYPE_CONFIG.daily_digest;
  const personaConfig = PERSONA_CONFIG[persona] || PERSONA_CONFIG.GENERAL;
  const TypeIcon = typeConfig.icon;

  const isLong = content.length > CONTENT_PREVIEW_LENGTH;
  const displayContent = expanded || !isLong ? content : content.slice(0, CONTENT_PREVIEW_LENGTH) + "...";

  const formattedTime = new Date(postedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
            <TypeIcon className="w-3 h-3" />
            {typeConfig.label}
          </span>
          {persona !== postType.toUpperCase() && persona !== "FUNDING" && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${personaConfig.color}`}>
              {personaConfig.label}
            </span>
          )}
          {metadata?.part && (
            <span className="text-xs text-gray-400">
              Part {String(metadata.part)}/{String(metadata.totalParts)}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{formattedTime}</span>
      </div>

      {/* Content */}
      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-light">
        {displayContent}
      </div>

      {/* Expand/collapse */}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-2 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Show more
            </>
          )}
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {factCheckCount != null && factCheckCount > 0 && (
            <span>{factCheckCount} fact checks</span>
          )}
          <span>{content.length} chars</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
            title="Copy post text"
          >
            {copied ? <Check className="w-3 h-3 text-indigo-500" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          {postUrl && (
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            >
              <Linkedin className="w-3 h-3" />
              View
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkedInPostCard;
