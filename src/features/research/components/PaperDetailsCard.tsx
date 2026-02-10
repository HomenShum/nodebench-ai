"use client";

import React, { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { FileText, RefreshCw, ExternalLink } from "lucide-react";

interface PaperDetailsCardProps {
  url: string;
  title?: string;
}

export const PaperDetailsCard: React.FC<PaperDetailsCardProps> = ({ url, title }) => {
  const refresh = useAction(api.domains.research.paperDetails.refreshPaperDetails);
  const [details, setDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!url) return;
    setIsLoading(true);
    refresh({ url, title })
      .then((result) => {
        if (mounted) setDetails(result.details);
      })
      .catch((err) => {
        if (mounted) setError(err?.message ?? "Failed to load paper details.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [refresh, title, url]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Citation Card</div>
          <div className="text-sm font-semibold text-gray-900">{details?.title ?? "Research Paper"}</div>
        </div>
        <button
          type="button"
          onClick={() => refresh({ url, title, forceRefresh: true }).then((res) => setDetails(res.details))}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
          aria-label="Refresh paper details"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {details?.authors?.length > 0 && (
        <div className="text-[11px] text-gray-500">
          {details.authors.slice(0, 4).join(", ")}
        </div>
      )}

      {typeof details?.citationCount === "number" && (
        <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-indigo-100 bg-indigo-50 text-[10px] font-semibold text-gray-700">
          {details.citationCount} citations
        </div>
      )}

      <div className="text-xs text-gray-600 leading-relaxed">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Abstract</span>
        <div className="mt-1">{details?.abstract || "Abstract unavailable."}</div>
      </div>

      {details?.methodology && (
        <div className="text-xs text-gray-600 leading-relaxed">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Methodology</span>
          <div className="mt-1">{details.methodology}</div>
        </div>
      )}

      {details?.keyFindings?.length > 0 && (
        <div className="text-xs text-gray-600">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Key Findings</span>
          <ul className="mt-2 list-disc list-inside space-y-1">
            {details.keyFindings.slice(0, 4).map((item: string, idx: number) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        {details?.pdfUrl && (
          <a
            href={details.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 hover:text-gray-900"
          >
            <FileText className="w-3 h-3" />
            PDF
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-700"
        >
          View source
        </a>
      </div>
    </div>
  );
};

export default PaperDetailsCard;
