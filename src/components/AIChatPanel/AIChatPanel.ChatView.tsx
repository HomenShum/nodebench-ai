import { useRef } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { AIChatPanelQuickActions } from "./AIChatPanel.QuickActions";
import { AIChatPanelMessages } from "./AIChatPanel.Messages";

interface ChatViewProps {
  // Display state
  activeTab: 'chat' | 'flow';
  
  // Selection state
  selectedDocumentId: Id<"documents"> | null;
  selectedNodeId: Id<"nodes"> | null;
  
  // Messages
  messages: any[];
  isLoading: boolean;
  
  // Message editing
  hoveredMessageId: string | null;
  setHoveredMessageId: (id: string | null) => void;
  editingMessageId: string | null;
  editingContent: string;
  setEditingContent: (content: string) => void;
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
  
  // Thinking mode
  expandedThinking: Record<string, boolean>;
  toggleThinking: (messageId: string) => void;
  renderThinkingStep: (step: any, index: number) => JSX.Element;
  
  // Actions
  onDocumentSelect: (documentId: Id<"documents"> | null) => void;
  handleQuickAction: (prompt: string) => void;
  handleEditMessage: (messageId: string) => void;
  handleRerunFromMessage: (messageId: string) => void;
  handleRollbackToMessage: (messageId: string) => void;
  handleUndoLastResponse: () => void;
}

/**
 * Chat View Component
 * 
 * Displays the chat interface with:
 * - Quick action buttons
 * - Message history
 * - Message editing capabilities
 * - Thinking mode visualization
 */
export function AIChatPanelChatView({
  activeTab,
  selectedDocumentId,
  selectedNodeId,
  messages,
  isLoading,
  hoveredMessageId,
  setHoveredMessageId,
  editingMessageId,
  editingContent,
  setEditingContent,
  handleSaveEdit,
  handleCancelEdit,
  expandedThinking,
  toggleThinking,
  renderThinkingStep,
  onDocumentSelect,
  handleQuickAction,
  handleEditMessage,
  handleRerunFromMessage,
  handleRollbackToMessage,
  handleUndoLastResponse,
}: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Only render when chat tab is active
  if (activeTab !== 'chat') {
    return null;
  }

  return (
    <>
      {/* Quick Actions */}
      <AIChatPanelQuickActions
        selectedDocumentId={selectedDocumentId}
        selectedNodeId={selectedNodeId}
        onQuickAction={handleQuickAction}
      />

      {/* Messages Area */}
      <AIChatPanelMessages
        activeTab={activeTab}
        messages={messages}
        hoveredMessageId={hoveredMessageId}
        setHoveredMessageId={setHoveredMessageId}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        setEditingContent={setEditingContent}
        handleSaveEdit={handleSaveEdit}
        handleCancelEdit={handleCancelEdit}
        toggleThinking={toggleThinking}
        expandedThinking={expandedThinking}
        renderThinkingStep={renderThinkingStep}
        onDocumentSelect={onDocumentSelect}
        handleEditMessage={handleEditMessage}
        handleRerunFromMessage={handleRerunFromMessage}
        handleRollbackToMessage={handleRollbackToMessage}
        handleUndoLastResponse={handleUndoLastResponse}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
      />
    </>
  );
}

