'use client';

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Loader2, Bot, Zap, CheckCircle, Clock, Activity } from 'lucide-react';

export function AgentsClient() {
  // Try to get agent-related data
  const user = useQuery(api.domains.auth.auth.loggedInUser);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-gray-400">Loading Agents Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agents Hub</h1>
            <p className="text-gray-400 mt-1">AI agent orchestration and monitoring</p>
          </div>
          <button type="button" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Spawn Agent
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Bot} label="Active Agents" value="3" color="purple" />
          <StatCard icon={Activity} label="Tasks Running" value="7" color="blue" />
          <StatCard icon={CheckCircle} label="Completed Today" value="24" color="green" />
          <StatCard icon={Clock} label="Avg Response" value="1.2s" color="yellow" />
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Agents */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">Active Agents</h2>
            </div>
            <div className="p-6 space-y-4">
              <AgentCard name="Research Agent" status="running" task="Analyzing market signals" />
              <AgentCard name="Document Agent" status="idle" task="Waiting for tasks" />
              <AgentCard name="Calendar Agent" status="running" task="Scheduling meetings" />
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">Recent Tasks</h2>
            </div>
            <div className="p-6 space-y-3">
              <TaskItem title="Generate weekly report" status="completed" time="2m ago" />
              <TaskItem title="Summarize meeting notes" status="completed" time="15m ago" />
              <TaskItem title="Research competitor analysis" status="running" time="In progress" />
              <TaskItem title="Schedule follow-ups" status="pending" time="Queued" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ name, status, task }: { name: string; status: 'running' | 'idle'; task: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-gray-400">{task}</p>
        </div>
      </div>
      <span className={`text-xs px-2 py-1 rounded ${status === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
        {status}
      </span>
    </div>
  );
}

function TaskItem({ title, status, time }: { title: string; status: 'completed' | 'running' | 'pending'; time: string }) {
  const statusColors = {
    completed: 'text-green-400',
    running: 'text-blue-400',
    pending: 'text-gray-400',
  };
  const StatusIcon = status === 'completed' ? CheckCircle : status === 'running' ? Activity : Clock;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <StatusIcon className={`w-4 h-4 ${statusColors[status]}`} />
        <span className="text-sm">{title}</span>
      </div>
      <span className="text-xs text-gray-500">{time}</span>
    </div>
  );
}
