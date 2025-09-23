import { describe, it, expect } from 'vitest';
import { mapStructuredToTimeline } from '../../agents/mappers/structuredToTimeline';

// This test ensures we can reproduce a hierarchy similar to convex/agents/timelineMock.ts
// without network calls by mapping a structured payload to timeline tasks/links.

describe('mapStructuredToTimeline', () => {
  it('maps agents + timeline into tasks/links similar to timelineMock', () => {
    const structured = {
      agents: [
        { id: 'root', name: 'Research Orchestrator', type: 'orchestrator' },
        { id: 'person-research', name: 'Person Research Agent', type: 'main', parentId: 'root' },
        { id: 'linkedin-scraper', name: 'LinkedIn Profile Scraper', type: 'sub', parentId: 'person-research' },
        { id: 'news-scanner', name: 'News & Media Scanner', type: 'sub', parentId: 'person-research' },
      ],
      timeline: [
        { agentId: 'person-research', startOffsetMs: 5_000, durationMs: 30_000, status: 'running' },
        { agentId: 'linkedin-scraper', startOffsetMs: 6_000, durationMs: 7_000, status: 'complete' },
        { agentId: 'news-scanner', startOffsetMs: 6_000, durationMs: 10_000, status: 'complete' },
      ],
    };

    const { tasks, links } = mapStructuredToTimeline(structured, { defaultName: 'Research Orchestrator', totalWindowMs: 600_000 });

    // Root orchestrator exists
    const root = tasks.find(t => t.id === 'root');
    expect(root).toBeTruthy();
    expect(root?.agentType).toBe('orchestrator');

    // Main and leaf agents mapped
    const main = tasks.find(t => t.id === 'person-research');
    const leafA = tasks.find(t => t.id === 'linkedin-scraper');
    const leafB = tasks.find(t => t.id === 'news-scanner');
    expect(main?.agentType).toBe('main');
    expect(leafA?.agentType).toBe('leaf');
    expect(leafB?.agentType).toBe('leaf');

    // Parent-child links preserved
    expect(links).toContainEqual({ sourceId: 'root', targetId: 'person-research' });
    expect(links).toContainEqual({ sourceId: 'person-research', targetId: 'linkedin-scraper' });
    expect(links).toContainEqual({ sourceId: 'person-research', targetId: 'news-scanner' });

    // Timeline bar durations applied
    expect(main?.startOffsetMs).toBe(5_000);
    expect(main?.durationMs).toBe(30_000);
  });
});

