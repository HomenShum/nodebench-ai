/**
 * LiveRadarWidget - Agent-Curated Intelligence Dashboard
 * 
 * Connects to the feed backend to display high-velocity signals
 * and integrates with Fast Agent for deep analysis.
 */

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { 
  Activity, 
  Zap, 
  GitBranch, 
  DollarSign, 
  Loader2, 
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Globe
} from 'lucide-react';
import { useFastAgent } from '../../agents/context/FastAgentContext';

type SignalCategory = 'all' | 'tech' | 'market' | 'research';

interface LiveRadarWidgetProps {
  className?: string;
}

export const LiveRadarWidget: React.FC<LiveRadarWidgetProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<SignalCategory>('all');
  const { openWithContext } = useFastAgent();
  
  // Connect to Real Agent Data - using getTrending which orders by score
  const signals = useQuery(api.feed.getTrending, { limit: 6 });

  const handleAnalyze = (signal: any) => {
    openWithContext({
      initialMessage: `Analyze the momentum and market impact of: "${signal.title}".\n\nContext: ${signal.summary || 'No additional context'}`,
      contextWebUrls: signal.url ? [signal.url] : [],
      contextTitle: signal.title,
    });
  };

  // Calculate velocity based on score
  const getVelocity = (score: number) => Math.min(100, Math.max(20, (score / 10) + 40));

  // Determine if item matches category
  const matchesCategory = (signal: any, category: SignalCategory): boolean => {
    if (category === 'all') return true;
    
    const tags = signal.tags?.map((t: string) => t.toLowerCase()) || [];
    const source = signal.source?.toLowerCase() || '';
    const type = signal.type?.toLowerCase() || '';
    
    switch (category) {
      case 'tech':
        return tags.some((t: string) => ['tech', 'trending', 'github', 'opensource'].includes(t)) ||
               source.includes('github') || source.includes('ycombinator');
      case 'market':
        return tags.some((t: string) => ['funding', 'startup', 'business', 'finance'].includes(t)) ||
               type === 'signal';
      case 'research':
        return tags.some((t: string) => ['research', 'ai', 'ml', 'nlp'].includes(t)) ||
               source.includes('arxiv') || type === 'dossier';
      default:
        return true;
    }
  };

  const filteredSignals = signals?.filter(s => matchesCategory(s, activeTab)) || [];

  const categoryTabs = [
    { id: 'all' as const, icon: Zap, label: 'All' },
    { id: 'tech' as const, icon: Cpu, label: 'Tech' },
    { id: 'market' as const, icon: DollarSign, label: 'Mkts' },
    { id: 'research' as const, icon: Globe, label: 'Research' }
  ];

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden ${className}`}>
      
      {/* Header: "Live" Pulse */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100">
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Global Radar</h3>
            <p className="text-[9px] text-gray-400">Agent-Curated Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 rounded-full border border-green-200">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] font-bold text-green-700 tracking-wide">LIVE</span>
        </div>
      </div>

      {/* Categories */}
      <div className="flex p-1 gap-1 border-b border-gray-100 bg-gray-50/50">
        {categoryTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Signal List */}
      <div className="divide-y divide-gray-50 min-h-[180px] max-h-[320px] overflow-y-auto">
        {!signals ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : filteredSignals.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400">
            No active signals in this category.
          </div>
        ) : (
          filteredSignals.slice(0, 5).map((signal, i) => {
            const velocity = getVelocity(signal.score || 0);
            const isViral = velocity > 75;
            const isTrending = velocity > 55;

            return (
              <div 
                key={signal._id} 
                onClick={() => handleAnalyze(signal)}
                className="group p-3 hover:bg-gray-50/80 transition-colors cursor-pointer relative"
              >
                {/* Hover Action Hint */}
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-sm font-medium">
                    Deep Dive →
                  </span>
                </div>

                {/* Rank & Title */}
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-xs font-mono font-bold text-gray-300 mt-0.5 w-5">
                    0{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 pr-16">
                      {signal.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-gray-400">{signal.source}</span>
                      
                      {/* Smart Badges */}
                      {isViral && (
                        <span className="text-[9px] font-bold px-1.5 py-0 rounded-sm bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-tight">
                          Viral
                        </span>
                      )}
                      {!isViral && isTrending && (
                        <span className="text-[9px] font-bold px-1.5 py-0 rounded-sm bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-tight">
                          Hot
                        </span>
                      )}
                      {signal.type === 'signal' && (
                        <span className="text-[9px] font-bold px-1.5 py-0 rounded-sm bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-tight">
                          Signal
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Velocity Meter */}
                <div className="flex items-center gap-3 pl-8">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isViral ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 
                        isTrending ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-400'
                      }`} 
                      style={{ width: `${velocity}%` }} 
                    />
                  </div>
                  <div className="flex items-center gap-0.5 text-[10px] font-mono font-medium text-gray-500 min-w-[40px]">
                    <Zap className={`w-3 h-3 ${isViral ? 'text-purple-500 fill-purple-500' : 'text-orange-400 fill-orange-400'}`} />
                    {Math.round(velocity)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <button 
        type="button"
        className="w-full py-3 text-[10px] font-bold text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors border-t border-gray-100 uppercase tracking-widest flex items-center justify-center gap-2"
      >
        View Full Intelligence Report <ArrowUpRight className="w-3 h-3" />
      </button>
    </div>
  );
};

export default LiveRadarWidget;
