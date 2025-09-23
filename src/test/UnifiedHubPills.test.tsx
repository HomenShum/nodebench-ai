// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UnifiedHubPills } from '@/components/shared/UnifiedHubPills';

describe('UnifiedHubPills', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    // reset hash between tests
    try { window.location.hash = ''; } catch {}
  });

  it('marks the active pill via aria-selected', () => {
    render(<UnifiedHubPills active="documents" />);
    const docs = screen.getByRole('tab', { name: 'Documents' });
    const cal = screen.getByRole('tab', { name: 'Calendar' });
    const agents = screen.getByRole('tab', { name: 'Agents' });
    expect(docs.getAttribute('aria-selected')).toBe('true');
    expect(cal.getAttribute('aria-selected')).toBe('false');
    expect(agents.getAttribute('aria-selected')).toBe('false');
  });

  it('navigates to #calendar and #calendar/agents on click', () => {
    render(<UnifiedHubPills active="documents" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Calendar' }));
    expect(window.location.hash).toBe('#calendar');

    fireEvent.click(screen.getByRole('tab', { name: 'Agents' }));
    expect(window.location.hash).toBe('#calendar/agents');
  });

  it('dispatches navigate:documents when clicking Documents', () => {
    const spy = vi.spyOn(window, 'dispatchEvent');
    render(<UnifiedHubPills active="calendar" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Documents' }));
    expect(spy).toHaveBeenCalled();
    const evt = spy.mock.calls.find((c) => c[0] instanceof Event)?.[0] as Event | undefined;
    expect(evt && evt.type).toBe('navigate:documents');
    spy.mockRestore();
  });

  it('does not navigate when Roadmap is disabled, and does when enabled', () => {
    const spy = vi.spyOn(window, 'dispatchEvent');

    // Disabled roadmap (default)
    render(<UnifiedHubPills active="calendar" showRoadmap roadmapDisabled />);
    const roadmapDisabledBtn = screen.getByRole('tab', { name: 'Roadmap' });
    expect(roadmapDisabledBtn.hasAttribute('disabled')).toBe(true);
    fireEvent.click(roadmapDisabledBtn);
    // still no event and no hash change
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'navigate:roadmap' }));

    // Enabled roadmap
    spy.mockClear();
    cleanup();
    render(<UnifiedHubPills active="calendar" showRoadmap roadmapDisabled={false} />);
    const roadmapBtn = screen.getByRole('tab', { name: 'Roadmap' });
    expect(roadmapBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(roadmapBtn);
    // dispatched navigate:roadmap
    expect(spy).toHaveBeenCalled();
    const evt = spy.mock.calls.find((c) => (c[0] as Event).type === 'navigate:roadmap')?.[0] as Event | undefined;
    expect(evt && evt.type).toBe('navigate:roadmap');
    spy.mockRestore();
  });
});

