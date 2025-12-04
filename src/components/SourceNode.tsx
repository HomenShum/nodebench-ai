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
        group relative flex items-center justify-between p-2.5 rounded-xl
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
        absolute -left-1 top-1/2 -translate-y-1/2 p-1 rounded
        transition-opacity duration-150 cursor-grab active:cursor-grabbing
        ${isHovered ? 'opacity-60' : 'opacity-0'}
      `}>
        <GripVertical className="w-3 h-3 text-gray-400" />
      </div>

      <div className="flex items-center gap-3 pl-2">
        {/* Icon with Status Ring */}
        <div className="relative">
          <div className={`
            flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold
            ${active ? 'bg-white shadow-inner' : 'bg-gray-50'}
          `}>
            {icon}
          </div>
          {/* Status Indicator */}
          {active && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              {currentStatus.pulse && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${currentStatus.color} opacity-75`} />
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentStatus.color} ring-2 ring-white`} />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-600'}`}>
              {name}
            </span>
            {active && activityCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                <Zap className="w-2.5 h-2.5" />
                {activityCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            {active ? currentStatus.label : 'Inactive'}
            {trustScore && (
              <>
                <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                <span className={trustScore >= 90 ? 'text-green-600' : trustScore >= 75 ? 'text-yellow-600' : 'text-gray-500'}>
                  {trustScore}% trust
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onConfigure?.(); }}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          title="Configure filters"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          className={`p-1.5 rounded-lg transition-colors ${
            active 
              ? 'hover:bg-red-50 text-gray-400 hover:text-red-500' 
              : 'hover:bg-green-50 text-gray-400 hover:text-green-500'
          }`}
          title={active ? 'Pause source' : 'Activate source'}
        >
          {active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};

export default SourceNode;

