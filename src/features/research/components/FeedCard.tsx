import React from 'react';
import { TrendingUp, FileText, MessageSquare, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';

export type FeedItemType = 'dossier' | 'signal' | 'news';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  subtitle?: string;
  timestamp: string;
  metrics?: { label: string; value: string; trend?: 'up' | 'down' }[];
  sourceIcon?: React.ReactNode;
  tags: string[];
  url?: string;  // External URL for live feed items (opens in new tab)
}

interface FeedCardProps {
  item: FeedItem;
  onClick: () => void;
  /** Handler for "Analyze with AI" action - opens global agent with context */
  onAnalyze?: () => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({ item, onClick, onAnalyze }) => {
  const isSignal = item.type === 'signal';
  const isDossier = item.type === 'dossier';

  const handleAnalyzeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card onClick
    onAnalyze?.();
  };

  return (
    <div
      onClick={onClick}
      className={`
        group relative break-inside-avoid mb-4 cursor-pointer overflow-hidden rounded-xl border transition-all duration-300
        ${isSignal
          ? 'bg-slate-900 border-slate-800 text-white hover:border-green-500/50'
          : 'bg-white border-gray-200 text-gray-900 hover:shadow-lg hover:-translate-y-1'}
      `}
    >
      {/* Bloomberg Vibe: Accent bar for Signals */}
      {isSignal && (
        <div className="absolute top-0 left-0 w-1 bg-green-500 h-full" />
      )}

      <div className="p-5">
        {/* Header: Type badge + Timestamp */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isDossier && <div className="p-1.5 bg-purple-100 rounded-md text-purple-600"><FileText size={12}/></div>}
            {isSignal && <div className="p-1.5 bg-green-500/20 rounded-md text-green-400"><TrendingUp size={12}/></div>}
            {item.type === 'news' && <div className="p-1.5 bg-blue-100 rounded-md text-blue-600"><MessageSquare size={12}/></div>}
            <span className={`text-[10px] uppercase tracking-wider font-semibold ${isSignal ? 'text-slate-400' : 'text-gray-400'}`}>
              {item.type}
            </span>
          </div>
          <span className={`text-xs ${isSignal ? 'text-slate-500' : 'text-gray-400'}`}>{item.timestamp}</span>
        </div>

        {/* Title: Serif for dossiers (newsletter feel), Sans for data */}
        <h3 className={`text-lg font-semibold leading-tight mb-2 ${isDossier ? 'font-serif' : 'font-sans'} ${isSignal ? 'text-white' : 'text-gray-900'}`}>
          {item.title}
        </h3>

        {item.subtitle && (
          <p className={`text-sm line-clamp-3 mb-4 ${isSignal ? 'text-slate-400' : 'text-gray-600'}`}>
            {item.subtitle}
          </p>
        )}

        {/* Data Metrics Row (Pitchbook/Bloomberg Style) */}
        {item.metrics && item.metrics.length > 0 && (
          <div className={`flex items-center gap-4 mt-3 pt-3 border-t border-dashed ${isSignal ? 'border-slate-700' : 'border-gray-200'}`}>
            {item.metrics.map((m, i) => (
              <div key={i} className="flex flex-col">
                <span className={`text-[10px] uppercase ${isSignal ? 'text-slate-500' : 'text-gray-400'}`}>{m.label}</span>
                <span className={`text-sm font-mono font-bold flex items-center gap-1 ${isSignal ? 'text-white' : 'text-gray-900'}`}>
                  {m.value}
                  {m.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-500" />}
                  {m.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-500" />}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tags (LinkedIn/Twitter Style) */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {item.tags.map((tag, i) => (
              <span
                key={i}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  isSignal
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-gray-50 border-gray-100 text-gray-500'
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hover Overlay (Instagram Style) - with dual actions */}
      <div className={`
        absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]
        ${isSignal ? 'bg-white/10' : 'bg-white/60'}
      `}>
         {/* Primary action: View/Read */}
         <div className="bg-black text-white text-xs font-medium px-4 py-2 rounded-full shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
            {isSignal ? 'View Signal' : isDossier ? 'Read Dossier' : 'View Article'}
         </div>

         {/* Secondary action: Analyze with AI (only if handler provided) */}
         {onAnalyze && (
           <button
             type="button"
             onClick={handleAnalyzeClick}
             className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform hover:from-purple-500 hover:to-indigo-500"
           >
             <Sparkles size={12} />
             Analyze
           </button>
         )}
      </div>
    </div>
  );
};
