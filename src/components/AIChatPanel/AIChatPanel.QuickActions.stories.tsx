import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AIChatPanelQuickActions } from './AIChatPanel.QuickActions';

/**
 * AIChatPanel Quick Actions Component
 * 
 * Context-aware quick action buttons that change based on:
 * - Whether a document is selected
 * - Whether a node/block is selected
 * 
 * Features:
 * - Icon-based compact design
 * - Contextual actions (different for document vs. no document)
 * - Block selection indicator
 */
const meta = {
  title: 'AIChatPanel/QuickActions',
  component: AIChatPanelQuickActions,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Quick action buttons that adapt based on the current context (document selected, node selected, etc.).',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    selectedDocumentId: {
      control: 'text',
      description: 'ID of the currently selected document (if any)',
    },
    selectedNodeId: {
      control: 'text',
      description: 'ID of the currently selected node/block (if any)',
    },
  },
  args: {
    onQuickAction: fn(),
  },
} satisfies Meta<typeof AIChatPanelQuickActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state - no document selected
 * Shows: New Doc, Find Docs, Project Plan, Meeting Notes
 */
export const NoDocumentSelected: Story = {
  args: {
    selectedDocumentId: undefined,
    selectedNodeId: undefined,
  },
};

/**
 * Document selected - shows document-specific actions
 * Shows: Add Section, Add Outline, Add Code, Add Checklist
 */
export const DocumentSelected: Story = {
  args: {
    selectedDocumentId: 'doc123' as any,
    selectedNodeId: undefined,
  },
};

/**
 * Document and node selected - shows block selection indicator
 */
export const DocumentAndNodeSelected: Story = {
  args: {
    selectedDocumentId: 'doc123' as any,
    selectedNodeId: 'node456' as any,
  },
  parameters: {
    docs: {
      description: {
        story: 'When a specific block/node is selected, an indicator appears below the actions.',
      },
    },
  },
};

/**
 * Interactive example - click actions to see the prompts
 */
export const Interactive: Story = {
  args: {
    selectedDocumentId: undefined,
    selectedNodeId: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'Click any action button to see the prompt that would be sent to the AI.',
      },
    },
  },
};

