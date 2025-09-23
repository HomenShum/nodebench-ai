// @vitest-environment jsdom
import { ContextPillsProvider } from '@/hooks/contextPills';

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('convex/react', async () => {
  const actual: any = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: () => undefined,
    useMutation: () => vi.fn(),
    useAction: () => vi.fn(async () => ({ timelineId: 'tl1', result: 'Orchestrator OK' })),
    useConvex: () => ({ query: vi.fn(), mutation: vi.fn(), action: vi.fn() }),
  };
});

import { AIChatPanel } from '@/components/AIChatPanel';

describe('AIChatPanel orchestrator toggle', () => {
  beforeEach(() => { /* no-op */ });
  afterEach(() => { vi.clearAllTimers(); });

  it.skip('routes send to orchestrator when toggle is enabled and a document is selected', async () => {
    render(
      <ContextPillsProvider>
        <AIChatPanel
          isOpen={true}
          onClose={() => {}}
          onDocumentSelect={() => {}}
          selectedDocumentId={'doc1' as any}
        />
      </ContextPillsProvider>
    );

    // Enable Orchestrator toggle
    const orchToggle = await screen.findByText(/Orchestrator/i);
    const label = orchToggle.closest('label') as HTMLLabelElement;
    const checkbox = label.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    fireEvent.click(checkbox);

    // Type a prompt and press Enter
    const input = await screen.findByPlaceholderText(/Ask me anything|Ask to add content/i);
    fireEvent.change(input, { target: { value: 'Plan a research pipeline for Tesla' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Expect assistant message to expose a link to Agents Timeline (orchestrator path)
    const link = await screen.findByText(/View in Agents Timeline/i);
    expect(link).toBeInTheDocument();
  });
});

