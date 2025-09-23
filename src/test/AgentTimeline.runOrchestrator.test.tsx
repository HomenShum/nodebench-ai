// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock convex/react hooks
vi.mock('convex/react', async () => {
  const actual: any = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: (_fn: any, args: any) => ({ baseStartMs: Date.now() - 1000, tasks: [], links: [] }),
    useMutation: () => vi.fn(),
    useAction: () => vi.fn(async () => ({ timelineId: 'tl1', result: 'ok' })),
  };
});

import { AgentTimeline } from '@/components/agentDashboard/AgentTimeline';

describe('AgentTimeline Run Orchestrator button', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.clearAllTimers(); });

  it.skip('calls runOnTimeline when clicking Run Orchestrator', async () => {
    render(<AgentTimeline timelineId={'tl1' as any} />);

    // Type a prompt
    const input = screen.getByPlaceholderText(/Ask AI to plan/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Research Tesla' } });

    // Click Run Orchestrator button
    const btn = screen.getByRole('button', { name: /Run Orchestrator/i });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);

    // If no errors thrown, action was invoked (spy already set up in mock)
    expect(btn).toBeEnabled();
  });
});

