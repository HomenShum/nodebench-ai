// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('convex/react', async () => {
  const actual: any = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: () => undefined,
    useMutation: () => vi.fn(),
    useAction: () => vi.fn(),
    useConvex: () => ({ query: vi.fn(), mutation: vi.fn(), action: vi.fn() }),
  };
});
vi.mock('@/components/views/CalendarView', () => ({ CalendarView: () => <div /> }));
vi.mock('@/components/shared/SidebarMiniCalendar', () => ({ SidebarMiniCalendar: () => <div /> }));
vi.mock('@/components/shared/SidebarUpcoming', () => ({ SidebarUpcoming: () => <div /> }));
vi.mock('@/components/shared/TopDividerBar', () => ({ TopDividerBar: (p: any) => <div>{p.left}{p.right}</div> }));
vi.mock('@/components/agentDashboard/AgentDashboard', () => ({ AgentDashboard: () => <div /> }));

import { CalendarHomeHub } from '@/components/CalendarHomeHub';

describe('CalendarHomeHub pills + hash sync', () => {
  afterEach(() => cleanup());
  beforeEach(() => { try { window.location.hash = ''; } catch {} });

  it('defaults to Calendar active (hash #calendar)', () => {
    render(<CalendarHomeHub onDocumentSelect={() => {}} />);
    const cal = screen.getByRole('tab', { name: 'Calendar' });
    expect(cal.getAttribute('aria-selected')).toBe('true');
  });

  it('switches to Agents when hash is #calendar/agents', () => {
    window.location.hash = '#calendar/agents';
    render(<CalendarHomeHub onDocumentSelect={() => {}} />);
    const agents = screen.getByRole('tab', { name: 'Agents' });
    expect(agents.getAttribute('aria-selected')).toBe('true');
  });

  it('clicking Agents sets hash to #calendar/agents', () => {
    render(<CalendarHomeHub onDocumentSelect={() => {}} />);
    const agents = screen.getByRole('tab', { name: 'Agents' });
    fireEvent.click(agents);
    expect(window.location.hash).toBe('#calendar/agents');
  });
});

