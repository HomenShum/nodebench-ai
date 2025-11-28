/**
 * InlineAgentActivity - Section-level agent activity indicators
 * Shows which agent is building a section with progress, and attribution when complete
 */

import React from 'react';
import { 
    Bot, 
    CheckCircle2, 
    Loader2, 
    AlertCircle, 
    Globe, 
    FileText, 
    Database, 
    Briefcase, 
    Users,
    Zap,
    Clock
} from 'lucide-react';

export type AgentRole = 'coordinator' | 'documentAgent' | 'mediaAgent' | 'secAgent' | 'webAgent';
export type ActivityStatus = 'building' | 'complete' | 'error';

export interface InlineAgentActivityProps {
    agentName: string;
    agentRole?: AgentRole;
    status: ActivityStatus;
    message?: string;
    tools?: string[];
    duration?: number; // seconds
    progress?: number; // 0-100
    className?: string;
}

// Agent role to icon mapping
const agentIcons: Record<string, React.ReactNode> = {
    coordinator: <Users className="w-3.5 h-3.5" />,
    documentAgent: <FileText className="w-3.5 h-3.5" />,
    mediaAgent: <Database className="w-3.5 h-3.5" />,
    secAgent: <Briefcase className="w-3.5 h-3.5" />,
    webAgent: <Globe className="w-3.5 h-3.5" />,
};

// Agent role to color mapping
const agentColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    coordinator: {
        bg: 'from-purple-500/10 to-indigo-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-600',
        glow: 'shadow-purple-500/10',
    },
    documentAgent: {
        bg: 'from-blue-500/10 to-cyan-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-600',
        glow: 'shadow-blue-500/10',
    },
    mediaAgent: {
        bg: 'from-amber-500/10 to-orange-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-600',
        glow: 'shadow-amber-500/10',
    },
    secAgent: {
        bg: 'from-emerald-500/10 to-teal-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-600',
        glow: 'shadow-emerald-500/10',
    },
    webAgent: {
        bg: 'from-rose-500/10 to-pink-500/10',
        border: 'border-rose-500/30',
        text: 'text-rose-600',
        glow: 'shadow-rose-500/10',
    },
};

/**
 * Building State - Shows animated progress while agent is working
 */
function BuildingState({ 
    agentName, 
    agentRole, 
    message, 
    progress 
}: Pick<InlineAgentActivityProps, 'agentName' | 'agentRole' | 'message' | 'progress'>) {
    const colors = agentColors[agentRole || 'coordinator'];
    const icon = agentIcons[agentRole || 'coordinator'] || <Bot className="w-3.5 h-3.5" />;

    return (
        <div className={`my-4 p-4 rounded-xl border bg-gradient-to-r ${colors.bg} ${colors.border} animate-fade-slide-in`}>
            {/* Shimmer overlay */}
            <div className="absolute inset-0 section-skeleton rounded-xl opacity-50" />
            
            <div className="relative flex items-center gap-3">
                {/* Agent Avatar */}
                <div className={`relative w-9 h-9 rounded-lg bg-white/80 dark:bg-gray-800/80 border ${colors.border} flex items-center justify-center ${colors.text}`}>
                    {icon}
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full live-dot" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${colors.text}`}>
                            {agentName}
                        </span>
                        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {message || 'Processing...'}
                    </p>
                </div>

                {/* Progress indicator */}
                {progress !== undefined && (
                    <div className="hidden sm:block w-24">
                        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                            <span>Progress</span>
                            <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Complete State - Subtle attribution badge at section bottom
 */
function CompleteState({ 
    agentName, 
    agentRole, 
    duration, 
    tools 
}: Pick<InlineAgentActivityProps, 'agentName' | 'agentRole' | 'duration' | 'tools'>) {
    const colors = agentColors[agentRole || 'coordinator'];
    const icon = agentIcons[agentRole || 'coordinator'] || <Bot className="w-3 h-3" />;

    return (
        <div className="mt-3 flex items-center gap-2 text-xs animate-fade-slide-in">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700`}>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-gray-600 dark:text-gray-400">Built by</span>
                <span className={`font-medium ${colors.text}`}>{agentName}</span>
            </div>
            
            {duration !== undefined && (
                <div className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{duration.toFixed(1)}s</span>
                </div>
            )}

            {tools && tools.length > 0 && (
                <div className="hidden sm:flex items-center gap-1 text-gray-400">
                    <Zap className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">
                        {tools.slice(0, 2).join(', ')}
                        {tools.length > 2 && ` +${tools.length - 2}`}
                    </span>
                </div>
            )}
        </div>
    );
}

/**
 * Error State - Shows error indicator
 */
function ErrorState({ 
    agentName, 
    message 
}: Pick<InlineAgentActivityProps, 'agentName' | 'message'>) {
    return (
        <div className="my-4 p-4 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 animate-fade-slide-in">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1">
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">
                        {agentName} encountered an error
                    </span>
                    {message && (
                        <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                            {message}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Main Component - Renders appropriate state
 */
export function InlineAgentActivity({
    agentName,
    agentRole,
    status,
    message,
    tools,
    duration,
    progress,
    className = '',
}: InlineAgentActivityProps) {
    switch (status) {
        case 'building':
            return (
                <div className={className}>
                    <BuildingState 
                        agentName={agentName} 
                        agentRole={agentRole} 
                        message={message} 
                        progress={progress} 
                    />
                </div>
            );
        
        case 'complete':
            return (
                <div className={className}>
                    <CompleteState 
                        agentName={agentName} 
                        agentRole={agentRole} 
                        duration={duration} 
                        tools={tools} 
                    />
                </div>
            );
        
        case 'error':
            return (
                <div className={className}>
                    <ErrorState 
                        agentName={agentName} 
                        message={message} 
                    />
                </div>
            );
        
        default:
            return null;
    }
}

/**
 * Multi-Agent Coordination View - Shows multiple agents working simultaneously
 */
export interface MultiAgentCoordinationProps {
    agents: Array<{
        name: string;
        role: AgentRole;
        status: ActivityStatus;
        task?: string;
    }>;
}

export function MultiAgentCoordination({ agents }: MultiAgentCoordinationProps) {
    const runningAgents = agents.filter(a => a.status === 'building');
    
    if (runningAgents.length === 0) return null;

    return (
        <div className="my-4 p-4 rounded-xl border border-purple-200 dark:border-purple-800/50 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 animate-fade-slide-in">
            <div className="flex items-center gap-2 mb-3">
                <div className="flex -space-x-2">
                    {runningAgents.slice(0, 3).map((agent, idx) => {
                        const colors = agentColors[agent.role];
                        const icon = agentIcons[agent.role];
                        return (
                            <div 
                                key={agent.name}
                                className={`w-7 h-7 rounded-full bg-white dark:bg-gray-800 border-2 ${colors.border} flex items-center justify-center ${colors.text} ring-2 ring-white dark:ring-gray-900`}
                                style={{ zIndex: 10 - idx }}
                            >
                                {icon}
                            </div>
                        );
                    })}
                </div>
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                    {runningAgents.length} agents collaborating
                </span>
                <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin ml-auto" />
            </div>
            
            <div className="space-y-1.5">
                {runningAgents.map(agent => (
                    <div key={agent.name} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${agentColors[agent.role].text.replace('text-', 'bg-')}`} />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{agent.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">→</span>
                        <span className="text-gray-600 dark:text-gray-400">{agent.task || 'Processing'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default InlineAgentActivity;
