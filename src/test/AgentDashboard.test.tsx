// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('convex/react', async () => {
  const actual: any = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: (_fn: any, args: any) => {
      // Heuristic: when querying a specific timeline, args has a timelineId
      if (args && typeof args === 'object' && 'timelineId' in args) {
        return {
          baseStartMs: Date.now() - 10000,
          tasks: [
            { _id: 't1', name: 'Plan', status: 'running', durationMs: 60000, startOffsetMs: 0 },
            { _id: 't2', name: 'Collect', status: 'pending', durationMs: 120000, startOffsetMs: 30000 },
          ],
          links: [],
        } as any;
      }
      // Otherwise it's the listForUser
      return [
        { timelineId: 'tl1' as any, title: 'Agents Hub', updatedAt: Date.now() },
        { timelineId: 'tl2' as any, title: 'Project X', updatedAt: Date.now() - 1000 },
      ];
    },
    useMutation: () => async () => undefined,
    useConvex: () => ({ query: vi.fn(), mutation: vi.fn() }),
  };
});

import { AgentDashboard } from '@/components/agentDashboard/AgentDashboard';

describe('AgentDashboard', () => {

  it('renders and switches tabs', () => {
    const { asFragment } = render(<AgentDashboard />);
    // Initial timeline tab
    expect(screen.getByText('Timeline & Tasks')).toBeTruthy();

    // Switch to Tasks tab
    fireEvent.click(screen.getByText('Tasks'));
    expect(screen.getByText('Agent Tasks')).toBeTruthy();
    // Basic sanity checks instead of brittle snapshots
    expect(screen.getAllByText('Open Full View').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Plan|Collect/).length).toBeGreaterThan(0);
  });
});

