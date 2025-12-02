// src/components/FastAgentPanel/TypingIndicator.tsx
// Typing indicator component for showing agent is processing

import React from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  agentRole?: 'coordinator' | 'documentAgent' | 'mediaAgent' | 'secAgent' | 'webAgent';
  message?: string;
}

// Agent role configuration
const agentRoleConfig = {
  coordinator: {
    label: 'Coordinator',
    icon: '🎯',
    color: 'purple',
  },
  documentAgent: {
    label: 'Document Agent',
    icon: '📄',
    color: 'blue',
  },
  mediaAgent: {
    label: 'Media Agent',
    icon: '🎬',
    color: 'pink',
  },
  secAgent: {
    label: 'SEC Agent',
    icon: '📊',
    color: 'green',
  },
  webAgent: {
    label: 'Web Agent',
    icon: '🌐',
    color: 'cyan',
  },
};

/**
 * TypingIndicator - Shows agent is processing with animated dots
 * Displays agent role badge and optional status message
 */
export function TypingIndicator({ agentRole, message }: TypingIndicatorProps) {
  const roleConfig = agentRole ? agentRoleConfig[agentRole] : null;

  return (
    <div className="flex gap-3 mb-4 justify-start">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          roleConfig
            ? `bg-gradient-to-br from-${roleConfig.color}-400 to-${roleConfig.color}-600`
            : "bg-gradient-to-br from-purple-500 to-blue-500"
        )}>
          <Bot className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Typing Content */}
      <div className="flex flex-col gap-2 max-w-[80%]">
        {/* Agent Role Badge */}
        {roleConfig && (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
            "bg-gradient-to-r shadow-sm",
            roleConfig.color === 'purple' && "from-purple-100 to-purple-200 text-purple-700",
            roleConfig.color === 'blue' && "from-blue-100 to-blue-200 text-blue-700",
            roleConfig.color === 'pink' && "from-pink-100 to-pink-200 text-pink-700",
            roleConfig.color === 'green' && "from-green-100 to-green-200 text-green-700",
            roleConfig.color === 'cyan' && "from-cyan-100 to-cyan-200 text-cyan-700"
          )}>
            <span className="text-sm">{roleConfig.icon}</span>
            <span>{roleConfig.label}</span>
          </div>
        )}

        {/* Typing Bubble */}
        <div className="rounded-lg px-4 py-3 bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Animated Dots */}
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>

            {/* Optional Status Message */}
            {message && (
              <span className="text-sm text-gray-600">{message}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MessageSkeleton - Skeleton loader for messages being generated
 */
export function MessageSkeleton({ agentRole }: { agentRole?: TypingIndicatorProps['agentRole'] }) {
  const roleConfig = agentRole ? agentRoleConfig[agentRole] : null;

  return (
    <div className="flex gap-3 mb-4 justify-start animate-pulse">
      {/* Avatar Skeleton */}
      <div className="flex-shrink-0">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          roleConfig
            ? `bg-${roleConfig.color}-200`
            : "bg-gray-200"
        )}>
          <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="flex flex-col gap-2 max-w-[80%] flex-1">
        {/* Badge Skeleton */}
        {roleConfig && (
          <div className="h-6 w-32 bg-gray-200 rounded-full"></div>
        )}

        {/* Text Skeleton */}
        <div className="rounded-lg px-4 py-3 bg-white border border-gray-200 shadow-sm space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}

