// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('convex/react', async () => {
  const actual: any = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: (_fn: any, args: any) => {
      if (args && typeof args === 'object' && 'timelineId' in args) {
        const now = Date.now();
        return {
          baseStartMs: now - 20_000,
          tasks: [
            { _id: 't0', name: 'Research Orchestrator', agentType: 'orchestrator', status: 'running', startOffsetMs: 0, durationMs: 120000 },
            { _id: 't1', name: 'Person Research Pipeline', agentType: 'main', status: 'running', startOffsetMs: 5000, durationMs: 60000 },
            { _id: 't2', name: 'LinkedIn Scraper', agentType: 'leaf', status: 'pending', startOffsetMs: 8000, durationMs: 15000 },
            { _id: 't3', name: 'News Scanner', agentType: 'leaf', status: 'pending', startOffsetMs: 20000, durationMs: 20000 },
          ],
          links: [
            { sourceTaskId: 't0', targetTaskId: 't1' },
            { sourceTaskId: 't1', targetTaskId: 't2' },
            { sourceTaskId: 't1', targetTaskId: 't3' },
          ],
        } as any;
      }
      return [];
    },
    useMutation: () => async () => undefined,
    useConvex: () => ({ query: vi.fn(), mutation: vi.fn() }),
  };
});

import { AgentTasks } from '@/components/agentDashboard/AgentTasks';

describe('AgentTasks layouts and mini timeline sync', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('agents.windowMode', 'fit');
  });

  it('switches to Grouped layout and shows main section with sub-agents', () => {
    render(<AgentTasks timelineId={'tl1' as any} />);

    const selector = screen.getByDisplayValue('Grid') as HTMLSelectElement;
    fireEvent.change(selector, { target: { value: 'grouped' } });

    // Group header for the main agent appears (header or card title)
    expect(screen.getAllByText('Person Research Pipeline').length).toBeGreaterThan(0);
    // Sub-agent cards should be present
    expect(screen.getAllByText('LinkedIn Scraper').length).toBeGreaterThan(0);
    expect(screen.getAllByText('News Scanner').length).toBeGreaterThan(0);
  });

  it('switches to Tree layout and renders expandable nodes', () => {
    render(<AgentTasks timelineId={'tl1' as any} />);

    const selector = screen.getByDisplayValue('Grid') as HTMLSelectElement;
    fireEvent.change(selector, { target: { value: 'tree' } });

    // Root orchestrator node should be present (may appear in multiple places)
    expect(screen.getAllByText('Research Orchestrator').length).toBeGreaterThan(0);
    // Main pipeline under it
    expect(screen.getAllByText('Person Research Pipeline').length).toBeGreaterThan(0);
  });

  it('mini timeline highlights bars for the responsible agent', () => {
    render(<AgentTasks timelineId={'tl1' as any} />);

    // Find the Person Research Pipeline card
    const card = screen.getAllByRole('button', { name: /Person Research Pipeline/i })[0] as HTMLElement;
    // Within this card, there should be a highlighted mini bar for t1 and its descendants
    const highlights = card.querySelectorAll('.mini-execution-bar.highlight');
    expect(highlights.length).toBeGreaterThan(0);
  });
});

