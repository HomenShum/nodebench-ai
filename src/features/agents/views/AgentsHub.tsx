/**
 * AgentsHub - Central hub for viewing and managing AI agents
 * 
 * Shows active autonomous agents (Research, Analyst, Sourcing) with their
 * current status, recent activity, and quick actions.
 */

import { Bot, Sparkles, Search, FileText, TrendingUp, Clock, Play, Pause, Settings } from "lucide-react";
import { UnifiedHubPills } from "@/shared/ui/UnifiedHubPills";

interface AgentCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'idle' | 'paused';
  lastActivity?: string;
  tasksCompleted?: number;
  onConfigure?: () => void;
  onToggle?: () => void;
}

function AgentCard({ name, description, icon, status, lastActivity, tasksCompleted, onConfigure, onToggle }: AgentCardProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-700 border-green-200',
    idle: 'bg-gray-100 text-gray-600 border-gray-200',
    paused: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const statusLabels = {
    active: 'Active',
    idle: 'Idle',
    paused: 'Paused',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        {lastActivity && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{lastActivity}</span>
          </div>
        )}
        {tasksCompleted !== undefined && (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{tasksCompleted} tasks</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          {status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {status === 'active' ? 'Pause' : 'Start'}
        </button>
        <button
          type="button"
          onClick={onConfigure}
          className="flex items-center justify-center p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

export function AgentsHub() {
  const agents = [
    {
      name: 'Research Agent',
      description: 'Deep web research and data gathering',
      icon: <Search className="w-5 h-5" />,
      status: 'idle' as const,
      lastActivity: '2 hours ago',
      tasksCompleted: 47,
    },
    {
      name: 'Analyst Agent',
      description: 'Data analysis and insights generation',
      icon: <TrendingUp className="w-5 h-5" />,
      status: 'idle' as const,
      lastActivity: '1 day ago',
      tasksCompleted: 23,
    },
    {
      name: 'Sourcing Agent',
      description: 'Lead generation and contact discovery',
      icon: <FileText className="w-5 h-5" />,
      status: 'idle' as const,
      lastActivity: '3 days ago',
      tasksCompleted: 156,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Agents Hub</h1>
            <p className="text-sm text-gray-500">Manage your autonomous AI agents</p>
          </div>
        </div>
        <UnifiedHubPills active="agents" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">3</div>
              <div className="text-sm text-gray-500">Total Agents</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-500">Active Now</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">226</div>
              <div className="text-sm text-gray-500">Tasks Completed</div>
            </div>
          </div>

          {/* Agent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <AgentCard
                key={agent.name}
                {...agent}
                onConfigure={() => console.log('Configure', agent.name)}
                onToggle={() => console.log('Toggle', agent.name)}
              />
            ))}
          </div>

          {/* Coming Soon */}
          <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">More Agents Coming Soon</h3>
            </div>
            <p className="text-sm text-gray-600">
              We're building specialized agents for email outreach, social media monitoring, 
              competitive analysis, and more. Stay tuned!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

