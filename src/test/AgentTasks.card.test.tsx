// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

vi.mock('convex/react', async () => {
  const actual: any = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: (_fn: any, args: any) => {
      if (args && typeof args === 'object' && 'timelineId' in args) {
        return {
          baseStartMs: Date.now() - 10000,
          tasks: [
            { _id: 't1', name: 'Executive Background Check', status: 'pending', durationMs: 0, startOffsetMs: 0, description: '{"status":"Queued for processing…"}' },
          ],
          links: [],
        } as any;
      }
      return [];
    },
    useMutation: () => async () => undefined,
    useConvex: () => ({ query: vi.fn(), mutation: vi.fn() }),
  };
});

import { AgentTasks } from '@/components/agentDashboard/AgentTasks';

describe('AgentTasks card design & interactions', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  it('renders a task-card with expected sections', () => {
    const onViewTimeline = vi.fn();
    const onOpenFullView = vi.fn();
    render(<AgentTasks timelineId={'tl1' as any} onViewTimeline={onViewTimeline} onOpenFullView={onOpenFullView} />);

    // Header pieces (pick the visible header title span, not hover-title)
    const allTitles = screen.getAllByText('Executive Background Check');
    expect(allTitles.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Final Output/i).length).toBeGreaterThan(0);

    // Card acts like a button with aria
    const cards = screen.getAllByRole('button', { name: /Executive Background Check/i });
    expect(cards.length).toBeGreaterThan(0);
    const card = cards[0];

    // Status dot + status label present
    expect(screen.getByText(/pending/i)).toBeTruthy();

    // Hover overlay action buttons exist in the DOM
    expect(screen.getAllByText('Open Full View').length).toBeGreaterThan(0);
  });

  it('exposes accessible affordances and hover actions for scaffold/full view', () => {
    const onViewTimeline = vi.fn();
    const onOpenFullView = vi.fn();
    render(<AgentTasks timelineId={'tl1' as any} onViewTimeline={onViewTimeline} onOpenFullView={onOpenFullView} />);

    const cards = screen.getAllByRole('button', { name: /Executive Background Check/i });
    const card = cards[0] as HTMLElement;

    // Aria hints advertise interactions (space/enter)
    expect(card.getAttribute('aria-label')).toMatch(/Press Enter for full view/i);
    expect(card.getAttribute('aria-label')).toMatch(/Space for scaffold/i);

    // Hover overlay actions exist in the DOM
    expect(screen.getAllByText('View Scaffold').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Open Full View').length).toBeGreaterThan(0);
  });
});

