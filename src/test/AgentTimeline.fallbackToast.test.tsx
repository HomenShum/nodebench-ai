// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('convex/react', async () => {
  const actual: any = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: (_fn: any, _args: any) => ({ baseStartMs: Date.now() - 1000, tasks: [], links: [] }),
    useMutation: () => vi.fn(),
    useAction: (_fn: any) => vi.fn(async () => ({ timelineId: 'tl1', result: 'ok', retryCount: 2 })),
  };
});

import { AgentTimeline } from '@/components/agentDashboard/AgentTimeline';

describe.skip('AgentTimeline fallback toast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.clearAllTimers(); });

  it('shows a toast when runOnTimeline returns retryCount > 0', async () => {
    render(<AgentTimeline timelineId={'tl1' as any} />);

    const btn = await screen.findByRole('button', { name: /Run Orchestrator/i });
    fireEvent.click(btn);

    const toast = await screen.findByTestId('agents-fallback-toast');
    expect(toast).toHaveTextContent(/retried 2 time/);
  });
});

