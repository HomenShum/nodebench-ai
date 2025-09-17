import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock convex/react hooks used inside the panel
vi.mock('convex/react', () => ({
  useQuery: () => null,
  useMutation: () => ((..._args: any[]) => Promise.resolve(null)),
  useAction: () => ((..._args: any[]) => Promise.resolve(null)),
}));

// Mock MCP hook
vi.mock('../hooks/useMcp', () => ({
  useMcp: () => ({ sessionId: null, invoking: false, servers: [], selectServer: vi.fn(), tools: [] }),
}));

// Mock ContextPills hook
vi.mock('../hooks/contextPills', () => ({
  useContextPills: () => ({
    setContextDocs: vi.fn(), setToolsMcp: vi.fn(), setUiInfo: vi.fn(),
    focused: null, viewingDocs: [], previousDocs: [], contextDocs: [], toolsMcp: {}, uiInfo: { summary: '' },
  }),
}));

// Import after mocks
import { AIChatPanel } from '../components/AIChatPanel';
import type { Id } from '../../convex/_generated/dataModel';

const noop = () => {};

describe('AIChatPanel mock buttons', () => {
  beforeEach(() => {
    // jsdom fresh state
    document.body.innerHTML = '';
  });

  it('dispatches aiProposal when clicking Code Changes mock (no chat-level proposal panel)', async () => {
    const onProposal = vi.fn();
    // Listen for proposal bridge to the editor
    window.addEventListener('nodebench:aiProposal', onProposal as any, { once: true } as any);

    const { container } = render(
      <div data-testid="chat-root">
        <AIChatPanel
          isOpen={true}
          onClose={noop}
          onDocumentSelect={noop as unknown as (id: Id<'documents'>) => void}
        />
      </div>
    );

    // Open Mocks section
    const summary = await screen.findByRole('button', { name: /mocks/i });
    await userEvent.click(summary);

    // Click Code Changes mock
    const chatRoot = within(container.querySelector('[data-testid="chat-root"]')!);
    const btn = await chatRoot.findByRole('button', { name: /code changes/i });
    await userEvent.click(btn);

    // Ensure bridge event fired
    expect(onProposal).toHaveBeenCalled();

    // Ensure the chat panel itself does not render a proposal control panel
    expect(chatRoot.queryByRole('button', { name: /apply selected/i })).toBeNull();
    expect(chatRoot.queryByRole('button', { name: /apply all/i })).toBeNull();
  });

  it('appends an assistant thinking message when clicking Thinking Msg', async () => {
    const { container } = render(
      <div data-testid="chat-root">
        <AIChatPanel
          isOpen={true}
          onClose={noop}
          onDocumentSelect={noop as unknown as (id: Id<'documents'>) => void}
        />
      </div>
    );

    const summary = await screen.findByRole('button', { name: /mocks/i });
    await userEvent.click(summary);

    const chatRoot = within(container.querySelector('[data-testid="chat-root"]')!);
    const btn = await chatRoot.findByRole('button', { name: /thinking msg/i });
    await userEvent.click(btn);

    await screen.findByText(/Here is my thinking process \(mock\)/i);
  });

  it('appends candidate docs when clicking RAG Msg', async () => {
    const { container } = render(
      <div data-testid="chat-root">
        <AIChatPanel
          isOpen={true}
          onClose={noop}
          onDocumentSelect={noop as unknown as (id: Id<'documents'>) => void}
        />
      </div>
    );

    const summary = await screen.findByRole('button', { name: /mocks/i });
    await userEvent.click(summary);

    const chatRoot = within(container.querySelector('[data-testid="chat-root"]')!);
    const btn = await chatRoot.findByRole('button', { name: /rag msg/i });
    await userEvent.click(btn);

    await screen.findByText(/Candidate documents \(2\)/i);
    await screen.findByText(/Mock Doc Alpha/i);
    await screen.findByText(/Mock Doc Beta/i);
  });
});
