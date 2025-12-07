/**
 * FeedReaderPanel - Deep Dive Reader with integrated Agent Chat
 * 
 * Combines a clean reading experience with AI analysis capabilities.
 * Opens as a slide-over panel from the right side.
 * 
 * Structure:
 * - Top: Header with source info and actions
 * - Middle: Article content in clean reader view
 * - Bottom: AI Analyst prompt block with quick actions
 */

import React, { useState } from 'react';
import { X, Sparkles, ExternalLink, Bookmark, Share2, Clock, Globe } from 'lucide-react';
import type { FeedItem } from './FeedCard';
import { useFastAgent } from '@/features/agents/context/FastAgentContext';

interface FeedReaderPanelProps {
  /** The feed item to display */
  item: FeedItem;
  /** Called when the panel should close */
  onClose: () => void;
}

export const FeedReaderPanel: React.FC<FeedReaderPanelProps> = ({ item, onClose }) => {
  const { openWithContext } = useFastAgent();
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Get source domain from URL
  const sourceDomain = item.url ? new URL(item.url).hostname.replace('www.', '') : null;

  // Quick action handlers
  const handleSummarize = () => {
    openWithContext({
      initialMessage: `Summarize this article: "${item.title}"\n\n${item.subtitle || ''}`,
      contextWebUrls: item.url ? [item.url] : undefined,
      contextTitle: item.title,
    });
  };

  const handleMarketImpact = () => {
    openWithContext({
      initialMessage: `What is the market impact of this news? Analyze: "${item.title}"\n\n${item.subtitle || ''}`,
      contextWebUrls: item.url ? [item.url] : undefined,
      contextTitle: item.title,
    });
  };

  const handleCompetitiveAnalysis = () => {
    openWithContext({
      initialMessage: `Provide a competitive analysis based on this update: "${item.title}"\n\n${item.subtitle || ''}`,
      contextWebUrls: item.url ? [item.url] : undefined,
      contextTitle: item.title,
    });
  };

  const handleAskCustom = () => {
    openWithContext({
      initialMessage: '',
      contextWebUrls: item.url ? [item.url] : undefined,
      contextTitle: item.title,
    });
  };

  // Type badge styling
  const getTypeBadge = () => {
    switch (item.type) {
      case 'signal':
        return { bg: 'bg-green-500', text: 'text-white', label: 'Signal' };
      case 'dossier':
        return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Dossier' };
      case 'repo':
        return { bg: 'bg-gray-800', text: 'text-white', label: 'GitHub' };
      case 'product':
        return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Product' };
      default:
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'News' };
    }
  };

  const badge = getTypeBadge();

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[520px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Source Icon */}
            <div className={`p-1.5 rounded-lg ${badge.bg}`}>
              <Globe className={`w-4 h-4 ${badge.text}`} />
            </div>
            
            {/* Source Badge & Title */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${badge.text} ${badge.bg} px-2 py-0.5 rounded-full`}>
                  {badge.label}
                </span>
                {sourceDomain && (
                  <span className="text-xs text-gray-400">{sourceDomain}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Bookmark */}
            <button 
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`p-2 rounded-lg transition-colors ${isBookmarked ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            >
              <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
            
            {/* Share */}
            <button 
              onClick={() => navigator.clipboard.writeText(item.url || item.title)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            
            {/* External Link */}
            {item.url && (
              <button 
                onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            
            {/* Close */}
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Area (The "Reader") */}
        <div className="flex-1 overflow-y-auto">
          <article className="p-6 space-y-6">
            {/* Title */}
            <h1 className="text-2xl font-serif font-medium text-gray-900 leading-tight">
              {item.title}
            </h1>
            
            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-gray-500 border-b border-gray-100 pb-6">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{item.timestamp}</span>
              </div>
              {item.tags.length > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1.5">
                    {item.tags.slice(0, 3).map((tag, i) => (
                      <span 
                        key={i}
                        className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Metrics (if available) */}
            {item.metrics && item.metrics.length > 0 && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                {item.metrics.map((metric, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[10px] uppercase text-gray-400 font-medium">{metric.label}</div>
                    <div className="text-lg font-mono font-bold text-gray-900">{metric.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Content / Summary */}
            <div className="prose prose-sm prose-gray max-w-none">
              <p className="text-gray-600 leading-relaxed text-base">
                {item.subtitle || 'No preview available for this item.'}
              </p>
              
              {/* Placeholder for full content */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-center">
                <p className="text-sm text-gray-400">
                  Full article content will be loaded from the source.
                </p>
                {item.url && (
                  <button
                    onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Read full article →
                  </button>
                )}
              </div>
            </div>
          </article>

          {/* AI Analyst Block */}
          <div className="p-6 border-t border-gray-100 bg-gradient-to-b from-white to-purple-50/30">
            <div className="p-5 bg-white rounded-2xl border border-purple-100 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">AI Analyst</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    I've read this update. How would you like me to help?
                  </p>
                  
                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button 
                      onClick={handleSummarize}
                      className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-medium rounded-xl transition-colors"
                    >
                      📝 Summarize
                    </button>
                    <button 
                      onClick={handleMarketImpact}
                      className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-medium rounded-xl transition-colors"
                    >
                      📈 Market Impact
                    </button>
                    <button 
                      onClick={handleCompetitiveAnalysis}
                      className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-medium rounded-xl transition-colors"
                    >
                      🏢 Competitive Analysis
                    </button>
                  </div>
                  
                  {/* Custom Ask */}
                  <button
                    onClick={handleAskCustom}
                    className="mt-3 w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Ask Custom Question
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FeedReaderPanel;
