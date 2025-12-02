// src/components/FastAgentPanel/FastAgentPanel.AgentHierarchy.tsx
// Compact visualization of dynamically spawned sub-agents during a run

import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Users } from 'lucide-react';
import type { SpawnedAgent } from './types/agent';

interface AgentHierarchyProps {
  agents: SpawnedAgent[];
  isStreaming?: boolean;
}

export function AgentHierarchy({ agents, isStreaming = false }: AgentHierarchyProps) {
  if (!isStreaming && agents.length === 0) return null;

  return (
    <div className="agent-hierarchy">
      <div className="header">
        <Users className="h-4 w-4" />
        <span className="title">Agents</span>
        <span className="count">{agents.length}</span>
      </div>
      <div className="list">
        {agents.map((a) => {
          const Icon = a.status === 'running' ? Loader2 : a.status === 'complete' ? CheckCircle : AlertCircle;
          const cls = a.status === 'running' ? 'running' : a.status === 'complete' ? 'complete' : 'error';
          const elapsed = a.completedAt ? Math.max(0, a.completedAt - a.startedAt) : Math.max(0, Date.now() - a.startedAt);
          return (
            <div className={`agent-row ${cls}`} key={a.id} title={a.errorMessage || ''}>
              <Icon className={`icon ${a.status === 'running' ? 'spin' : ''}`} />
              <div className="name">{a.name || a.id}</div>
              <div className="meta">{(elapsed / 1000).toFixed(1)}s</div>
            </div>
          );
        })}
        {isStreaming && agents.length === 0 && (
          <div className="agent-row running" key="pending">
            <Loader2 className="icon spin" />
            <div className="name">Starting…</div>
          </div>
        )}
      </div>
      <style>{`
        .agent-hierarchy { 
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-primary);
        }
        .agent-hierarchy .header {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.5rem 1rem; color: var(--text-secondary);
        }
        .agent-hierarchy .title { font-weight: 600; color: var(--text-primary); }
        .agent-hierarchy .count { font-size: 0.75rem; opacity: 0.8; }
        .agent-hierarchy .list { padding: 0.25rem 0.5rem 0.5rem 0.5rem; }
        .agent-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.5rem; border-radius: 0.5rem; }
        .agent-row .icon { width: 14px; height: 14px; }
        .agent-row .icon.spin { animation: spin 1s linear infinite; }
        .agent-row .name { flex: 1; min-width: 0; color: var(--text-primary); font-size: 0.8125rem; overflow: hidden; text-overflow: ellipsis; }
        .agent-row .meta { font-size: 0.75rem; color: var(--text-secondary); }
        .agent-row.running { background: var(--bg-tertiary); }
        .agent-row.complete { background: rgba(34,197,94,0.08); }
        .agent-row.error { background: rgba(239,68,68,0.08); }
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

