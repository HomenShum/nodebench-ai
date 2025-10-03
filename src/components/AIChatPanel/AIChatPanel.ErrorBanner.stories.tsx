import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AIChatPanelErrorBanner } from './AIChatPanel.ErrorBanner';

/**
 * AIChatPanel Error Banner Component
 * 
 * Displays error messages with:
 * - Expandable error details
 * - Dismiss functionality
 * - Support for multiple errors
 * - Tool-specific error information
 */
const meta = {
  title: 'AIChatPanel/ErrorBanner',
  component: AIChatPanelErrorBanner,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Error banner component that displays error messages with expandable details and dismiss functionality.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    errorBanner: {
      control: 'object',
      description: 'Error banner data including message, errors array, and expanded state',
    },
    expanded: {
      control: 'boolean',
      description: 'Whether the error details are expanded',
    },
  },
  args: {
    onDismiss: fn(),
    onToggleExpanded: fn(),
  },
} satisfies Meta<typeof AIChatPanelErrorBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * No error - banner is hidden
 */
export const NoError: Story = {
  args: {
    errorBanner: null,
    expanded: false,
  },
};

/**
 * Single error - collapsed state
 */
export const SingleErrorCollapsed: Story = {
  args: {
    errorBanner: {
      message: 'Failed to execute tool',
      errors: [
        { tool: 'codebase-search', message: 'Connection timeout after 30 seconds' },
      ],
      expanded: false,
    },
    expanded: false,
  },
};

/**
 * Single error - expanded state
 */
export const SingleErrorExpanded: Story = {
  args: {
    errorBanner: {
      message: 'Failed to execute tool',
      errors: [
        { tool: 'codebase-search', message: 'Connection timeout after 30 seconds' },
      ],
      expanded: true,
    },
    expanded: true,
  },
};

/**
 * Multiple errors - collapsed state
 */
export const MultipleErrorsCollapsed: Story = {
  args: {
    errorBanner: {
      message: 'Multiple errors occurred',
      errors: [
        { tool: 'file-read', message: 'File not found: src/missing.ts' },
        { tool: 'codebase-search', message: 'Search index unavailable' },
        { tool: 'git-status', message: 'Not a git repository' },
      ],
      expanded: false,
    },
    expanded: false,
  },
};

/**
 * Multiple errors - expanded state
 */
export const MultipleErrorsExpanded: Story = {
  args: {
    errorBanner: {
      message: 'Multiple errors occurred',
      errors: [
        { tool: 'file-read', message: 'File not found: src/missing.ts' },
        { tool: 'codebase-search', message: 'Search index unavailable' },
        { tool: 'git-status', message: 'Not a git repository' },
      ],
      expanded: true,
    },
    expanded: true,
  },
};

/**
 * Long error message - tests text wrapping
 */
export const LongErrorMessage: Story = {
  args: {
    errorBanner: {
      message: 'An unexpected error occurred while processing your request',
      errors: [
        {
          tool: 'openai-api',
          message: 'The OpenAI API returned an error: Rate limit exceeded. You have sent too many requests in a short period of time. Please wait a few minutes and try again. For more information, visit https://platform.openai.com/docs/guides/rate-limits',
        },
      ],
      expanded: true,
    },
    expanded: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests how the component handles long error messages with proper text wrapping.',
      },
    },
  },
};

/**
 * Interactive example - try expanding/collapsing and dismissing
 */
export const Interactive: Story = {
  args: {
    errorBanner: {
      message: 'Multiple errors occurred',
      errors: [
        { tool: 'tool1', message: 'Error message 1' },
        { tool: 'tool2', message: 'Error message 2' },
      ],
      expanded: false,
    },
    expanded: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Try clicking the Details/Hide button to expand/collapse errors, and the X button to dismiss.',
      },
    },
  },
};

