// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock heavy deps early
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
vi.mock('@/components/shared/PageHeroHeader', () => ({ PageHeroHeader: () => <div /> }));
vi.mock('@/components/shared/PresetChip', () => ({ PresetChip: () => <div /> }));
vi.mock('@/components/shared/TopDividerBar', () => ({ TopDividerBar: (p: any) => <div>{p.left}{p.right}</div> }));

// So we actually render the real UnifiedHubPills
// no mock for it

import { DocumentsHomeHub } from '@/components/DocumentsHomeHub';

function Wrapper() {
  return (<DocumentsHomeHub onDocumentSelect={() => {}} />);
}

describe('DocumentsHomeHub header pills', () => {
  afterEach(() => cleanup());
  beforeEach(() => { try { window.location.hash = ''; } catch {} });

  it('renders the unified pill group with Documents active', () => {
    render(<Wrapper />);
    const tablist = screen.getAllByRole('tablist', { name: 'Primary hubs' })[0];
    expect(tablist).toBeTruthy();
    const docs = screen.getAllByRole('tab', { name: 'Documents' })[0];
    expect(docs.getAttribute('aria-selected')).toBe('true');
  });
});

