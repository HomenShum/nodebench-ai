// agents/mappers/structuredToTimeline.ts
// Pure adapter: map a structured result (agents + timeline) to timeline tasks/links

export type TimelineTask = {
  id: string; parentId: string | null; name: string; startOffsetMs: number; durationMs: number; agentType: 'orchestrator'|'main'|'leaf';
};
export type TimelineLink = { sourceId: string; targetId: string };

export function mapStructuredToTimeline(input: any, opts?: { defaultName?: string; totalWindowMs?: number }) {
  const total = Math.max(60_000, Math.min(3_600_000, opts?.totalWindowMs ?? 600_000));
  const name = opts?.defaultName ?? 'Orchestration';
  const tasks: TimelineTask[] = [{ id: 'root', parentId: null, name, startOffsetMs: 0, durationMs: total, agentType: 'orchestrator' }];
  const links: TimelineLink[] = [];

  const agents = Array.isArray(input?.agents) ? input.agents : [];
  for (const a of agents) {
    const t = String(a?.type || '').toLowerCase();
    const agentType: 'orchestrator'|'main'|'leaf' = t === 'orchestrator' ? 'orchestrator' : t === 'main' ? 'main' : 'leaf';
    const id = String(a?.id || a?.name || Math.random().toString(36).slice(2));
    const parentId = a?.parentId ? String(a.parentId) : 'root';
    tasks.push({ id, parentId, name: String(a?.name || id), startOffsetMs: 0, durationMs: Math.round(total/10), agentType });
    if (a?.parentId) links.push({ sourceId: String(a.parentId), targetId: id });
  }

  // Optional: map timeline bars to durations if present
  const bars = Array.isArray(input?.timeline) ? input.timeline : [];
  const byId = new Map(tasks.map(t => [t.id, t]));
  for (const bar of bars) {
    const id = String(bar?.agentId || '');
    const t = byId.get(id);
    if (!t) continue;
    if (typeof bar?.startOffsetMs === 'number') t.startOffsetMs = Math.max(0, Math.min(total, Math.floor(bar.startOffsetMs)));
    if (typeof bar?.durationMs === 'number') t.durationMs = Math.max(1_000, Math.min(total, Math.floor(bar.durationMs)));
  }

  return { tasks, links };
}

