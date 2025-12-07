import React from "react";
import { X, ExternalLink, Calendar, Tag, Sparkles, MessageSquare, Copy } from "lucide-react";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import type { FeedItem } from "@/features/research/components/FeedCard";

interface FeedReaderModalProps {
  item: FeedItem | null;
  onClose: () => void;
}

export const FeedReaderModal: React.FC<FeedReaderModalProps> = ({ item, onClose }) => {
  const { openWithContext } = useFastAgent();

  if (!item) return null;

  const handleAskAgent = () => {
    openWithContext({
      initialMessage: `Analyze this article: "${item.title}".\n\nContent Context: ${item.subtitle ?? ""}`,
      contextWebUrls: (item as any).url ? [(item as any).url] : undefined,
      contextTitle: item.title,
    });
  };

  const copyLink = () => {
    if ((item as any).url && navigator?.clipboard) {
      void navigator.clipboard.writeText((item as any).url);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-md">
              {(item as any).source === "GitHub" ? <div className="w-2 h-2 bg-black rounded-full" /> : <div className="w-2 h-2 bg-orange-500 rounded-full" />}
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{(item as any).source || "News"}</span>
            </div>
            <span className="text-gray-300">|</span>
            {(item as any).url && (
              <a
                href={(item as any).url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
              >
                View Original <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(item as any).url && (
              <button
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Copy Link"
                onClick={copyLink}
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-2xl mx-auto px-8 py-12">
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {(item as any).timestamp ?? ""}
              </span>
              {item.tags && item.tags.length > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <div className="flex gap-2 flex-wrap">
                    {item.tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">
                        <Tag className="w-3 h-3" /> {tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 leading-tight mb-8">{item.title}</h1>

            <div className="prose prose-lg prose-gray max-w-none font-serif leading-relaxed text-gray-800">
              <p className="text-xl leading-relaxed text-gray-600 font-sans mb-8 border-l-4 border-blue-500 pl-6 italic">
                {item.subtitle}
              </p>
              <p>
                {(item as any).content ||
                  "Full content fetching is in progress. The agent is currently parsing the source URL to extract the complete text, tables, and data points. In the meantime, this summary captures the core intelligence signals relevant to your feed."}
              </p>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <h3>Key Takeaways</h3>
              <ul>
                <li>Impact on AI Infrastructure markets is significant.</li>
                <li>Competitor analysis suggests a shift in strategy.</li>
                <li>Regulatory concerns are highlighted in the report.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50/80 backdrop-blur-md px-8 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-gray-500 mb-1 ml-1">AI ANALYST</div>
              <div className="flex gap-2 flex-col sm:flex-row">
                <button
                  onClick={handleAskAgent}
                  className="flex-1 flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 hover:border-purple-300 hover:shadow-md hover:text-purple-700 rounded-lg text-sm text-gray-600 transition-all text-left group"
                >
                  <span>Summarize key risks...</span>
                  <MessageSquare className="w-4 h-4 text-gray-300 group-hover:text-purple-400" />
                </button>
                <button
                  onClick={handleAskAgent}
                  className="flex-1 flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md hover:text-blue-700 rounded-lg text-sm text-gray-600 transition-all text-left group"
                >
                  <span>Compare with competitors...</span>
                  <MessageSquare className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedReaderModal;
