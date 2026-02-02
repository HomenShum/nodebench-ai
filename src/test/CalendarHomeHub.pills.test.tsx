// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, cleanup, fireEvent } from '@testing-library/react';
import { renderWithRouter } from './testUtils';

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
vi.mock('@/features/calendar/views/CalendarView', () => ({ CalendarView: () => <div /> }));
vi.mock('@/components/shared/SidebarMiniCalendar', () => ({ SidebarMiniCalendar: () => <div /> }));
vi.mock('@/components/shared/SidebarUpcoming', () => ({ SidebarUpcoming: () => <div /> }));
vi.mock('@/components/shared/TopDividerBar', () => ({ TopDividerBar: (p: any) => <div>{p.left}{p.right}</div> }));
vi.mock('@/components/agentDashboard/AgentDashboard', () => ({ AgentDashboard: () => <div /> }));

import { CalendarHomeHub } from '@/features/calendar/components/CalendarHomeHub';

describe('CalendarHomeHub pills + hash sync', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    try {
      window.location.hash = '';
    } catch {
      // Hash reset failed
    }
  });

  it('defaults to Calendar active (hash #calendar)', () => {
    renderWithRouter(<CalendarHomeHub onDocumentSelect={() => {}} />);
    const cal = screen.getByRole('tab', { name: 'Calendar' });
    expect(cal.getAttribute('aria-selected')).toBe('true');
  });

  it('clicking Agents dispatches navigate:agents', () => {
    const spy = vi.spyOn(window, 'dispatchEvent');
    renderWithRouter(<CalendarHomeHub onDocumentSelect={() => {}} />);
    const agents = screen.getByRole('tab', { name: 'Agents' });
    fireEvent.click(agents);
    expect(spy.mock.calls.some((c) => (c[0] as Event).type === 'navigate:agents')).toBe(true);
    spy.mockRestore();
  });
});
