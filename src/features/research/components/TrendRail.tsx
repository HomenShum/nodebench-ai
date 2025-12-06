import React from 'react';
import { Flame, TrendingUp, TrendingDown, Zap, FileText, Bell } from 'lucide-react';

export interface TrendItem {
  id: string;
  label: string;
  delta: string;
  hot?: boolean;
  type?: 'up' | 'down' | 'new' | 'update';
}

interface TrendRailProps {
  trends?: TrendItem[];
  onTrendClick?: (trend: TrendItem) => void;
  className?: string;
}

const DEFAULT_TRENDS: TrendItem[] = [
  { id: '1', label: "AI Infra", delta: "+12%", hot: true, type: 'up' },
  { id: '2', label: "NVIDIA 10-K", delta: "New", hot: true, type: 'new' },
  { id: '3', label: "SaaS Multiples", delta: "-2.1%", hot: false, type: 'down' },
  { id: '4', label: "Regulatory EU", delta: "Update", hot: false, type: 'update' },
  { id: '5', label: "OpenAI", delta: "Trending", hot: true, type: 'up' },
  { id: '6', label: "Series A Deals", delta: "+8%", hot: false, type: 'up' },
  { id: '7', label: "Biotech FDA", delta: "Alert", hot: true, type: 'new' },
];

export const TrendRail: React.FC<TrendRailProps> = ({ 
  trends = DEFAULT_TRENDS, 
  onTrendClick,
  className = '' 
}) => {
  const getDeltaStyle = (trend: TrendItem) => {
    if (trend.type === 'up' || trend.hot) return 'bg-green-100 text-green-700';
    if (trend.type === 'down') return 'bg-red-100 text-red-600';
    if (trend.type === 'new') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-500';
  };

  const getDeltaIcon = (trend: TrendItem) => {
    if (trend.type === 'up') return <TrendingUp className="w-2.5 h-2.5" />;
    if (trend.type === 'down') return <TrendingDown className="w-2.5 h-2.5" />;
    if (trend.type === 'new') return <FileText className="w-2.5 h-2.5" />;
    if (trend.type === 'update') return <Bell className="w-2.5 h-2.5" />;
    return null;
  };

  return (
    <div className={`w-full overflow-x-auto no-scrollbar py-3 ${className}`}>
      <div className="flex items-center gap-3 px-1">
        {/* Live Signals Badge */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold whitespace-nowrap shrink-0">
          <Flame className="w-3.5 h-3.5 fill-orange-500" />
          <span>LIVE SIGNALS</span>
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
        </div>
        
        {/* Trend Pills */}
        {trends.map((trend) => (
          <button 
            key={trend.id} 
            onClick={() => onTrendClick?.(trend)}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all whitespace-nowrap group shrink-0"
          >
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{trend.label}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${getDeltaStyle(trend)}`}>
              {getDeltaIcon(trend)}
              {trend.delta}
            </span>
            {trend.hot && (
              <Zap className="w-3 h-3 text-yellow-500 fill-yellow-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

