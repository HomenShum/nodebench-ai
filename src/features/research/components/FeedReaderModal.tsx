import React from "react";
import { X, ExternalLink, Calendar, Tag, Sparkles, MessageSquare, Copy } from "lucide-react";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import type { FeedItem } from "@/features/research/components/FeedCard";
import { useReaderContent } from "@/features/research/hooks/useReaderContent";

interface FeedReaderModalProps {
  item: FeedItem | null;
  onClose: () => void;
}

export const FeedReaderModal: React.FC<FeedReaderModalProps> = ({ item, onClose }) => {
  const { openWithContext } = useFastAgent();
  const readerState = useReaderContent(item?.url, item?.title);

  if (!item) return null;

  const readerData = readerState.status === "ready" ? readerState.data : null;
  const readerExcerpt = readerData?.excerpt || item.subtitle || "No preview available for this item.";
  const readerContent = readerData?.content || readerExcerpt;
  const sourceMatrix = readerData?.sourceMatrix ?? [];
  const sourceMatrixItems = sourceMatrix.slice(0, 6);
  const showLoading = readerState.status === "loading";
  const showError = readerState.status === "error";
  const errorMessage = readerState.status === "error" ? readerState.error : null;

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
      <div className="absolute inset-0 bg-black/15 transition-opacity" onClick={onClose} />

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
                {readerExcerpt}
              </p>

              {showLoading && (
                <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-center">
                  <p className="text-sm text-gray-400">Loading full article content...</p>
                </div>
              )}

              {showError && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-center">
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
              )}

              {readerState.status === "ready" && (
                <div className="space-y-5">
                  <p>{readerContent}</p>
                  {readerData?.isTruncated && item.url && (
                    <div className="text-xs text-gray-500">
                      Full text trimmed for size.{" "}
                      <button
                        onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Open original
                      </button>
                    </div>
                  )}
                </div>
              )}

              {readerState.status === "ready" && (
                <div className="mt-10 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Source Matrix</span>
                    <span className="text-[10px] text-gray-400">{sourceMatrix.length} sources</span>
                  </div>
                  {sourceMatrixItems.length > 0 ? (
                    <div className="space-y-3">
                      {sourceMatrixItems.map((source, idx) => (
                        <a
                          key={`${source.url}-${idx}`}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 hover:border-blue-200 hover:bg-white transition-colors"
                        >
                          <div className="text-sm font-semibold text-gray-900">{source.title}</div>
                          <div className="text-[11px] text-gray-500 mt-1">{source.domain || 'Source'}</div>
                          {source.snippet && (
                            <div className="text-xs text-gray-500 mt-2 line-clamp-2">{source.snippet}</div>
                          )}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">No additional sources available.</div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50/80 px-8 py-4">
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
