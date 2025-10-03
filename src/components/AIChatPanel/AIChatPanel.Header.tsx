import React from 'react';
import { Save, X, Settings } from 'lucide-react';

interface AIChatPanelHeaderProps {
  activeTab: 'chat' | 'flow';
  setActiveTab: (tab: 'chat' | 'flow') => void;
  autoSaveChat: boolean;
  setAutoSaveChat: (value: boolean) => void;
  onSaveChat: () => void;
  onClose: () => void;
  isLoading: boolean;
}

export const AIChatPanelHeader: React.FC<AIChatPanelHeaderProps> = ({
  activeTab,
  setActiveTab,
  autoSaveChat,
  setAutoSaveChat,
  onSaveChat,
  onClose,
  isLoading,
}) => {
  return (
    <div className="flow-header">
      <div className="flow-title">
        <span className="text-base">💡</span>
        <span>Nodebench AI</span>
        
        {/* Tabs: Chat / Flow */}
        <div className="ml-3 inline-flex rounded-md border border-[var(--border-color)] overflow-hidden">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 text-xs ${
              activeTab === 'chat'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`px-3 py-1.5 text-xs ${
              activeTab === 'flow'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            Flow
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Auto-save toggle */}
        <button
          onClick={() => setAutoSaveChat(v => !v)}
          className={`p-2 rounded transition-colors ${
            autoSaveChat
              ? 'bg-[var(--accent-primary)] text-white'
              : 'hover:bg-[var(--bg-hover)]'
          }`}
          title={autoSaveChat ? 'Auto-save: On' : 'Auto-save: Off'}
        >
          <Save className="h-4 w-4" />
        </button>

        {/* Manual Save */}
        {!autoSaveChat && (
          <button
            onClick={onSaveChat}
            className="p-2 rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="Save chat manually"
            disabled={isLoading}
          >
            <Save className="h-4 w-4" />
          </button>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-[var(--bg-hover)] transition-colors"
          title="Close AI panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

