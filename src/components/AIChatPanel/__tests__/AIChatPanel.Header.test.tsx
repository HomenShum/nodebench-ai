import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIChatPanelHeader } from '../AIChatPanel.Header';

describe('AIChatPanelHeader', () => {
  const defaultProps = {
    activeTab: 'chat' as const,
    setActiveTab: vi.fn(),
    autoSaveChat: false,
    setAutoSaveChat: vi.fn(),
    onSaveChat: vi.fn(),
    onClose: vi.fn(),
    isLoading: false,
  };

  it('renders header with title', () => {
    render(<AIChatPanelHeader {...defaultProps} />);
    // Title is split into two spans, so we check for both parts
    expect(screen.getByText('💡')).toBeInTheDocument();
    expect(screen.getByText('Nodebench AI')).toBeInTheDocument();
  });

  it('renders both tabs', () => {
    render(<AIChatPanelHeader {...defaultProps} />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Flow')).toBeInTheDocument();
  });

  it('highlights active tab', () => {
    const { rerender } = render(<AIChatPanelHeader {...defaultProps} activeTab="chat" />);
    const chatTab = screen.getByText('Chat').closest('button');
    expect(chatTab).toHaveClass('bg-[var(--accent-primary)]');

    rerender(<AIChatPanelHeader {...defaultProps} activeTab="flow" />);
    const flowTab = screen.getByText('Flow').closest('button');
    expect(flowTab).toHaveClass('bg-[var(--accent-primary)]');
  });

  it('calls setActiveTab when tab is clicked', () => {
    const setActiveTab = vi.fn();
    render(<AIChatPanelHeader {...defaultProps} setActiveTab={setActiveTab} />);
    
    fireEvent.click(screen.getByText('Flow'));
    expect(setActiveTab).toHaveBeenCalledWith('flow');
  });

  it('renders auto-save toggle button', () => {
    render(<AIChatPanelHeader {...defaultProps} autoSaveChat={false} />);
    const autoSaveButton = screen.getByTitle('Auto-save: Off');
    expect(autoSaveButton).toBeInTheDocument();
  });

  it('shows auto-save as on when enabled', () => {
    render(<AIChatPanelHeader {...defaultProps} autoSaveChat={true} />);
    const autoSaveButton = screen.getByTitle('Auto-save: On');
    expect(autoSaveButton).toBeInTheDocument();
  });

  it('toggles auto-save when clicked', () => {
    const setAutoSaveChat = vi.fn();
    render(<AIChatPanelHeader {...defaultProps} setAutoSaveChat={setAutoSaveChat} autoSaveChat={false} />);

    const autoSaveButton = screen.getByTitle('Auto-save: Off');
    fireEvent.click(autoSaveButton);
    expect(setAutoSaveChat).toHaveBeenCalled();
  });

  it('renders manual save button when auto-save is off', () => {
    render(<AIChatPanelHeader {...defaultProps} autoSaveChat={false} />);
    const saveButton = screen.getByTitle('Save chat manually');
    expect(saveButton).toBeInTheDocument();
  });

  it('does not render manual save button when auto-save is on', () => {
    render(<AIChatPanelHeader {...defaultProps} autoSaveChat={true} />);
    const saveButton = screen.queryByTitle('Save chat manually');
    expect(saveButton).not.toBeInTheDocument();
  });

  it('calls onSaveChat when manual save button is clicked', () => {
    const onSaveChat = vi.fn();
    render(<AIChatPanelHeader {...defaultProps} onSaveChat={onSaveChat} autoSaveChat={false} />);

    const saveButton = screen.getByTitle('Save chat manually');
    fireEvent.click(saveButton);
    expect(onSaveChat).toHaveBeenCalled();
  });

  it('disables manual save button when loading', () => {
    render(<AIChatPanelHeader {...defaultProps} isLoading={true} autoSaveChat={false} />);
    const saveButton = screen.getByTitle('Save chat manually');
    expect(saveButton).toBeDisabled();
  });

  it('renders close button', () => {
    render(<AIChatPanelHeader {...defaultProps} />);
    const closeButton = screen.getByTitle('Close AI panel');
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<AIChatPanelHeader {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByTitle('Close AI panel');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});

