import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AIChatPanelHeader } from './AIChatPanel.Header';

/**
 * AIChatPanel Header Component
 * 
 * The header component for the AI Chat Panel, featuring:
 * - Tab switcher (Chat/Flow views)
 * - Auto-save toggle
 * - Manual save button (when auto-save is off)
 * - Close button
 */
const meta = {
  title: 'AIChatPanel/Header',
  component: AIChatPanelHeader,
  parameters: {
    layout: 'fullwidth',
    docs: {
      description: {
        component: 'Header component for the AI Chat Panel with tab switching and save controls.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    activeTab: {
      control: 'radio',
      options: ['chat', 'flow'],
      description: 'Currently active tab',
    },
    autoSaveChat: {
      control: 'boolean',
      description: 'Whether auto-save is enabled',
    },
    isLoading: {
      control: 'boolean',
      description: 'Whether the panel is in a loading state',
    },
  },
  args: {
    setActiveTab: fn(),
    setAutoSaveChat: fn(),
    onSaveChat: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof AIChatPanelHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state with Chat tab active and auto-save off
 */
export const Default: Story = {
  args: {
    activeTab: 'chat',
    autoSaveChat: false,
    isLoading: false,
  },
};

/**
 * Flow tab active
 */
export const FlowTabActive: Story = {
  args: {
    activeTab: 'flow',
    autoSaveChat: false,
    isLoading: false,
  },
};

/**
 * Auto-save enabled (manual save button hidden)
 */
export const AutoSaveEnabled: Story = {
  args: {
    activeTab: 'chat',
    autoSaveChat: true,
    isLoading: false,
  },
};

/**
 * Loading state (manual save button disabled)
 */
export const Loading: Story = {
  args: {
    activeTab: 'chat',
    autoSaveChat: false,
    isLoading: true,
  },
};

/**
 * Interactive example - try clicking the tabs and buttons
 */
export const Interactive: Story = {
  args: {
    activeTab: 'chat',
    autoSaveChat: false,
    isLoading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Try clicking the Chat/Flow tabs, auto-save toggle, and save button to see the interactions.',
      },
    },
  },
};

