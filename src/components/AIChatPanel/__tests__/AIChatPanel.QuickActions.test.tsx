import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIChatPanelQuickActions } from '../AIChatPanel.QuickActions';

describe('AIChatPanelQuickActions', () => {
  const defaultProps = {
    selectedDocumentId: null,
    selectedNodeId: null,
    onQuickAction: vi.fn(),
  };

  it('renders quick actions section', () => {
    render(<AIChatPanelQuickActions {...defaultProps} />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('shows default actions when no document is selected', () => {
    render(<AIChatPanelQuickActions {...defaultProps} />);

    // Check for default action buttons by their prompts (used as titles)
    expect(screen.getByTitle('Create a new document about')).toBeInTheDocument();
    expect(screen.getByTitle('Find documents about')).toBeInTheDocument();
    expect(screen.getByTitle('Create a project plan')).toBeInTheDocument();
    expect(screen.getByTitle('Create meeting notes')).toBeInTheDocument();
  });

  it('shows document-specific actions when document is selected', () => {
    render(<AIChatPanelQuickActions {...defaultProps} selectedDocumentId="doc123" as any />);

    // Check for document-specific action buttons
    expect(screen.getByTitle('Add a new section about')).toBeInTheDocument();
    expect(screen.getByTitle('Create an outline with key points')).toBeInTheDocument();
    expect(screen.getByTitle('Add a code example for')).toBeInTheDocument();
    expect(screen.getByTitle('Add a checklist for')).toBeInTheDocument();

    // Check for "(for current doc)" indicator
    expect(screen.getByText('(for current doc)')).toBeInTheDocument();
  });

  it('calls onQuickAction with correct prompt when action is clicked', () => {
    const onQuickAction = vi.fn();
    render(<AIChatPanelQuickActions {...defaultProps} onQuickAction={onQuickAction} />);

    const newDocButton = screen.getByTitle('Create a new document about');
    fireEvent.click(newDocButton);

    expect(onQuickAction).toHaveBeenCalledWith('Create a new document about');
  });

  it('calls onQuickAction with document-specific prompt when document is selected', () => {
    const onQuickAction = vi.fn();
    render(
      <AIChatPanelQuickActions
        {...defaultProps}
        selectedDocumentId="doc123" as any
        onQuickAction={onQuickAction}
      />
    );

    const addSectionButton = screen.getByTitle('Add a new section about');
    fireEvent.click(addSectionButton);

    expect(onQuickAction).toHaveBeenCalledWith('Add a new section about');
  });

  it('shows selected node hint when node is selected', () => {
    render(
      <AIChatPanelQuickActions
        {...defaultProps}
        selectedNodeId="node123" as any
      />
    );

    expect(screen.getByText(/Block selected:/)).toBeInTheDocument();
  });

  it('does not show selected node hint when no node is selected', () => {
    render(<AIChatPanelQuickActions {...defaultProps} />);
    
    expect(screen.queryByText(/Selected node:/)).not.toBeInTheDocument();
  });
});

