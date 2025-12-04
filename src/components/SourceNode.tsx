import React, { useState } from 'react';
import { Settings, GripVertical, Radio, Zap, Pause, Play } from 'lucide-react';

export type SourceStatus = 'live' | 'syncing' | 'paused' | 'querying';

interface SourceNodeProps {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: SourceStatus;
  trustScore?: number;
  activityCount?: number;
  active?: boolean;
  onToggle?: () => void;
  onConfigure?: () => void;
  onDragStart?: (e: React.DragEvent, sourceId: string) => void;
}

export const SourceNode: React.FC<SourceNodeProps> = ({
  id,
  name,
  icon,
  status,
  trustScore,
  activityCount = 0,
  active = false,
  onToggle,
  onConfigure,
  onDragStart,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const statusConfig = {
    live: { label: 'Streaming', color: 'bg-green-500', pulse: true },
    syncing: { label: 'Syncing...', color: 'bg-yellow-500', pulse: true },
    paused: { label: 'Paused', color: 'bg-gray-400', pulse: false },
    querying: { label: 'Querying...', color: 'bg-blue-500', pulse: true },
  };

  const currentStatus = statusConfig[status];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative flex items-center justify-between py-1.5 px-2 rounded-lg
        border transition-all duration-200 cursor-pointer
        ${active
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm'
          : 'bg-white/50 border-gray-100 hover:border-gray-200 hover:bg-white hover:shadow-sm'
        }
      `}
      onClick={onToggle}
    >
      {/* Drag Handle */}
      <div className={`
        absolute -left-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded
        transition-opacity duration-150 cursor-grab active:cursor-grabbing
        ${isHovered ? 'opacity-60' : 'opacity-0'}
      `}>
        <GripVertical className="w-2.5 h-2.5 text-gray-400" />
      </div>

      <div className="flex items-center gap-2 pl-1">
        {/* Icon with Status Ring */}
        <div className="relative">
          <div className={`
            flex items-center justify-center w-6 h-6 rounded text-xs font-bold
            ${active ? 'bg-white shadow-inner' : 'bg-gray-50'}
          `}>
            {icon}
          </div>
          {/* Status Indicator */}
          {active && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
              {currentStatus.pulse && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${currentStatus.color} opacity-75`} />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${currentStatus.color} ring-1 ring-white`} />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className={`text-xs font-medium truncate ${active ? 'text-gray-900' : 'text-gray-600'}`}>
              {name}
            </span>
            {active && activityCount > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded-full font-medium shrink-0">
                <Zap className="w-2 h-2" />
                {activityCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
            {active ? currentStatus.label : 'Inactive'}
            {trustScore && (
              <span className={`shrink-0 ${trustScore >= 90 ? 'text-green-600' : trustScore >= 75 ? 'text-yellow-600' : 'text-gray-500'}`}>
                {trustScore}% trust
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-0.5 transition-opacity shrink-0 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onConfigure?.(); }}
          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
          title="Configure filters"
        >
          <Settings className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          className={`p-1 rounded transition-colors ${
            active
              ? 'hover:bg-red-50 text-gray-400 hover:text-red-500'
              : 'hover:bg-green-50 text-gray-400 hover:text-green-500'
          }`}
          title={active ? 'Pause source' : 'Activate source'}
        >
          {active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
};

export default SourceNode;

