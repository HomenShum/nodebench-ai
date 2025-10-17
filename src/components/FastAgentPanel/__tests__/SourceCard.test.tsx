// src/components/FastAgentPanel/__tests__/SourceCard.test.tsx
// Tests for SourceCard and SourceGrid components

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SourceCard, SourceGrid } from '../SourceCard';
import type { BaseSource } from '../SourceCard';

describe('SourceCard', () => {
  const mockSource: BaseSource = {
    title: 'Tesla News Article',
    url: 'https://example.com/tesla-news',
    domain: 'example.com',
    description: 'Latest Tesla news and updates',
  };

  it('should render source card with title', () => {
    render(<SourceCard source={mockSource} />);
    expect(screen.getByText('Tesla News Article')).toBeInTheDocument();
  });

  it('should render domain', () => {
    render(<SourceCard source={mockSource} />);
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(<SourceCard source={mockSource} />);
    expect(screen.getByText('Latest Tesla news and updates')).toBeInTheDocument();
  });

  it('should have correct href', () => {
    render(<SourceCard source={mockSource} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/tesla-news');
  });

  it('should display citation number if provided', () => {
    render(<SourceCard source={mockSource} citationNumber={1} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should have citation ID if citation number provided', () => {
    const { container } = render(<SourceCard source={mockSource} citationNumber={2} />);
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('id', 'source-2');
  });

  it('should have scroll-mt-4 class for smooth scrolling', () => {
    const { container } = render(<SourceCard source={mockSource} />);
    const link = container.querySelector('a');
    expect(link?.className).toContain('scroll-mt-4');
  });
});

describe('SourceGrid', () => {
  const mockSources: BaseSource[] = Array.from({ length: 8 }, (_, i) => ({
    title: `Source ${i + 1}`,
    url: `https://example.com/source-${i + 1}`,
    domain: 'example.com',
    description: `Description for source ${i + 1}`,
  }));

  it('should render nothing if no sources', () => {
    const { container } = render(<SourceGrid sources={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display initial sources (up to 6)', () => {
    render(<SourceGrid sources={mockSources} />);
    
    expect(screen.getByText('Source 1')).toBeInTheDocument();
    expect(screen.getByText('Source 6')).toBeInTheDocument();
    expect(screen.queryByText('Source 7')).not.toBeInTheDocument();
  });

  it('should show "Show More" button when sources exceed 6', () => {
    render(<SourceGrid sources={mockSources} />);
    
    const showMoreButton = screen.getByRole('button', { name: /Show 2 More/i });
    expect(showMoreButton).toBeInTheDocument();
  });

  it('should show all sources when "Show More" is clicked', () => {
    render(<SourceGrid sources={mockSources} />);
    
    const showMoreButton = screen.getByRole('button', { name: /Show 2 More/i });
    fireEvent.click(showMoreButton);
    
    expect(screen.getByText('Source 7')).toBeInTheDocument();
    expect(screen.getByText('Source 8')).toBeInTheDocument();
  });

  it('should show "Show Less" button after expanding', () => {
    render(<SourceGrid sources={mockSources} />);
    
    const showMoreButton = screen.getByRole('button', { name: /Show 2 More/i });
    fireEvent.click(showMoreButton);
    
    const showLessButton = screen.getByRole('button', { name: /Show Less/i });
    expect(showLessButton).toBeInTheDocument();
  });

  it('should display citation numbers when enabled', () => {
    render(<SourceGrid sources={mockSources.slice(0, 3)} showCitations={true} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should not display citation numbers when disabled', () => {
    render(<SourceGrid sources={mockSources.slice(0, 3)} showCitations={false} />);
    
    // Should not have citation badges
    const badges = screen.queryAllByText(/^[0-9]$/);
    expect(badges).toHaveLength(0);
  });

  it('should display correct count in header', () => {
    render(<SourceGrid sources={mockSources} />);
    
    // Should show "6/8" initially
    expect(screen.getByText(/6\/8/)).toBeInTheDocument();
  });
});

