import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIChatPanelChatView } from '../AIChatPanel.ChatView';

// Mock the child components
vi.mock('../AIChatPanel.QuickActions', () => ({
  AIChatPanelQuickActions: () => <div data-testid="quick-actions">Quick Actions</div>,
}));

vi.mock('../AIChatPanel.Messages', () => ({
  AIChatPanelMessages: () => <div data-testid="messages">Messages</div>,
}));

describe('AIChatPanelChatView', () => {
  const defaultProps = {
    activeTab: 'chat' as const,
    selectedDocumentId: null,
    selectedNodeId: null,
    messages: [],
    isLoading: false,
    hoveredMessageId: null,
    setHoveredMessageId: vi.fn(),
    editingMessageId: null,
    editingContent: '',
    setEditingContent: vi.fn(),
    handleSaveEdit: vi.fn(),
    handleCancelEdit: vi.fn(),
    expandedThinking: {},
    toggleThinking: vi.fn(),
    renderThinkingStep: vi.fn(),
    onDocumentSelect: vi.fn(),
    handleQuickAction: vi.fn(),
    handleEditMessage: vi.fn(),
    handleRerunFromMessage: vi.fn(),
    handleRollbackToMessage: vi.fn(),
    handleUndoLastResponse: vi.fn(),
  };

  it('renders when activeTab is chat', () => {
    render(<AIChatPanelChatView {...defaultProps} activeTab="chat" />);
    
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    expect(screen.getByTestId('messages')).toBeInTheDocument();
  });

  it('does not render when activeTab is flow', () => {
    const { container } = render(<AIChatPanelChatView {...defaultProps} activeTab="flow" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('renders QuickActions component', () => {
    render(<AIChatPanelChatView {...defaultProps} />);
    
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
  });

  it('renders Messages component', () => {
    render(<AIChatPanelChatView {...defaultProps} />);
    
    expect(screen.getByTestId('messages')).toBeInTheDocument();
  });
});

