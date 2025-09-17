import React from "react";
import { Id } from "../../convex/_generated/dataModel";
import { ChevronDown, ChevronRight, Brain, Search, FileText, Loader2, ArrowUp, Undo2, Edit2, X, Check } from "lucide-react";
import { ThinkingToggle, RagCandidates, MessageItem } from "../features/chat";

export type MessagesProps = {
  activeTab: string;
  messages: any[];
  hoveredMessageId: string | null;
  setHoveredMessageId: (id: string | null) => void;
  editingMessageId: string | null;
  editingContent: string;
  setEditingContent: (v: string) => void;
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
  toggleThinking: (id: string) => void;
  expandedThinking: Set<string>;
  renderThinkingStep: (step: any, index: number) => React.ReactNode;
  onDocumentSelect: (id: Id<"documents">) => void;
  handleEditMessage: (id: string, content: string) => void;
  handleRerunFromMessage: (id: string) => void;
  handleRollbackToMessage: (id: string) => void;
  handleUndoLastResponse: () => void;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
};

export const AIChatPanelMessages: React.FC<MessagesProps> = (props) => {
  const {
    activeTab,
    messages,
    hoveredMessageId,
    setHoveredMessageId,
    editingMessageId,
    editingContent,
    setEditingContent,
    handleSaveEdit,
    handleCancelEdit,
    toggleThinking,
    expandedThinking,
    renderThinkingStep,
    onDocumentSelect,
    handleEditMessage,
    handleRerunFromMessage,
    handleRollbackToMessage,
    handleUndoLastResponse,
    isLoading,
    messagesEndRef,
  } = props;

  return (
    <div className={`${activeTab === 'chat' ? '' : 'hidden'} flex-1 overflow-y-auto p-4 space-y-4`}>
      {messages.map((message: any, index: number) => (
        <MessageItem
          key={message.id}
          message={message}
          index={index}
          total={messages.length}
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
        />
      ))}
      {isLoading && !messages.some((m: any) => m.isProcessing) && (
        <div className="flex justify-start"><div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /><span className="text-sm text-[var(--text-secondary)]">Thinking...</span></div></div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

