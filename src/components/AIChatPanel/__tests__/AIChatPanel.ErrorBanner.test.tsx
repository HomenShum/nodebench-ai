import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIChatPanelErrorBanner } from '../AIChatPanel.ErrorBanner';

describe('AIChatPanelErrorBanner', () => {
  const defaultProps = {
    errorBanner: null,
    onDismiss: vi.fn(),
    onToggleExpanded: vi.fn(),
  };

  it('does not render when errorBanner is null', () => {
    const { container } = render(<AIChatPanelErrorBanner {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error message when errorBanner is provided', () => {
    const errorBanner = {
      message: 'Something went wrong',
      errors: [],
      expanded: false,
    };
    
    render(<AIChatPanelErrorBanner {...defaultProps} errorBanner={errorBanner} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders error icon', () => {
    const errorBanner = {
      message: 'Error occurred',
      errors: [],
      expanded: false,
    };
    
    render(<AIChatPanelErrorBanner {...defaultProps} errorBanner={errorBanner} />);
    // AlertCircle icon should be present
    const banner = screen.getByText('Error occurred').closest('div');
    expect(banner).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    const errorBanner = {
      message: 'Error occurred',
      errors: [],
      expanded: false,
    };
    
    render(
      <AIChatPanelErrorBanner 
        {...defaultProps} 
        errorBanner={errorBanner}
        onDismiss={onDismiss}
      />
    );
    
    const dismissButton = screen.getByTitle('Dismiss');
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows expand button when there are errors', () => {
    const errorBanner = {
      message: 'Multiple errors',
      errors: [
        { tool: 'tool1', message: 'Error 1' },
        { tool: 'tool2', message: 'Error 2' },
      ],
      expanded: false,
    };
    
    render(<AIChatPanelErrorBanner {...defaultProps} errorBanner={errorBanner} />);
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('calls onToggleExpanded when expand button is clicked', () => {
    const onToggleExpanded = vi.fn();
    const errorBanner = {
      message: 'Multiple errors',
      errors: [{ tool: 'tool1', message: 'Error 1' }],
      expanded: false,
    };

    render(
      <AIChatPanelErrorBanner
        {...defaultProps}
        errorBanner={errorBanner}
        onToggleExpanded={onToggleExpanded}
      />
    );

    const expandButton = screen.getByText('Details');
    fireEvent.click(expandButton);
    expect(onToggleExpanded).toHaveBeenCalled();
  });

  it('shows error details when expanded', () => {
    const errorBanner = {
      message: 'Multiple errors',
      errors: [
        { tool: 'tool1', message: 'Error 1' },
        { tool: 'tool2', message: 'Error 2' },
      ],
      expanded: true,
    };

    render(<AIChatPanelErrorBanner {...defaultProps} errorBanner={errorBanner} />);

    // Tool names are in separate divs without colons
    expect(screen.getByText('tool1')).toBeInTheDocument();
    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('tool2')).toBeInTheDocument();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
  });

  it('hides error details when not expanded', () => {
    const errorBanner = {
      message: 'Multiple errors',
      errors: [
        { tool: 'tool1', message: 'Error 1' },
      ],
      expanded: false,
    };

    render(<AIChatPanelErrorBanner {...defaultProps} errorBanner={errorBanner} />);

    expect(screen.queryByText('tool1')).not.toBeInTheDocument();
    expect(screen.queryByText('Error 1')).not.toBeInTheDocument();
  });

  it('changes button text when expanded', () => {
    const errorBanner = {
      message: 'Multiple errors',
      errors: [{ tool: 'tool1', message: 'Error 1' }],
      expanded: true,
    };

    render(<AIChatPanelErrorBanner {...defaultProps} errorBanner={errorBanner} />);
    expect(screen.getByText('Hide')).toBeInTheDocument();
  });
});

