import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIChatPanelFlowView } from '../AIChatPanel.FlowView';

// Mock ReactFlow
vi.mock('reactflow', () => ({
  ReactFlow: ({ children }: any) => <div data-testid="react-flow">{children}</div>,
  Background: () => <div data-testid="background">Background</div>,
  Controls: () => <div data-testid="controls">Controls</div>,
  BackgroundVariant: { Dots: 'dots' },
  MarkerType: { ArrowClosed: 'arrowclosed' },
  useNodesState: () => [[], vi.fn(), vi.fn()],
  useEdgesState: () => [[], vi.fn(), vi.fn()],
  addEdge: vi.fn(),
}));

// Mock TurnDetails component
vi.mock('../AIChatPanel.TurnDetails', () => ({
  AIChatPanelTurnDetails: () => <div data-testid="turn-details">Turn Details</div>,
}));

describe('AIChatPanelFlowView', () => {
  const defaultProps = {
    activeTab: 'flow' as const,
    flowReady: true,
    nodes: [],
    edges: [],
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    handleNodeClick: vi.fn(),
    selectedFlowNode: null,
    setSelectedFlowNode: vi.fn(),
    selectedTurnDetails: null,
    setSelectedTurnDetails: vi.fn(),
  };

  it('renders when activeTab is flow', () => {
    render(<AIChatPanelFlowView {...defaultProps} activeTab="flow" />);
    
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('does not render when activeTab is chat', () => {
    const { container } = render(<AIChatPanelFlowView {...defaultProps} activeTab="chat" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('renders ReactFlow when flowReady is true', () => {
    render(<AIChatPanelFlowView {...defaultProps} flowReady={true} />);
    
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('background')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
  });

  it('shows placeholder when flowReady is false', () => {
    render(<AIChatPanelFlowView {...defaultProps} flowReady={false} />);
    
    expect(screen.getByText('Flow view will appear here')).toBeInTheDocument();
    expect(screen.queryByTestId('react-flow')).not.toBeInTheDocument();
  });

  it('renders TurnDetails component', () => {
    render(<AIChatPanelFlowView {...defaultProps} />);
    
    expect(screen.getByTestId('turn-details')).toBeInTheDocument();
  });

  it('applies correct container styles', () => {
    const { container } = render(<AIChatPanelFlowView {...defaultProps} />);
    
    const flowContainer = container.querySelector('.flow-canvas');
    expect(flowContainer).toBeInTheDocument();
    expect(flowContainer).toHaveStyle({ minHeight: '320px', height: '100%', position: 'relative' });
  });
});

