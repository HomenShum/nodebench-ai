import React from "react";
import { Id } from "../../convex/_generated/dataModel";
import { ChevronDown, ChevronRight, Brain, Search, FileText, Loader2, ArrowUp, Undo2, Edit2, X, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

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
        <div
          key={message.id}
          className={`group flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} relative`}
          onMouseEnter={() => setHoveredMessageId(message.id)}
          onMouseLeave={() => setHoveredMessageId(null)}
        >
          <div className={`max-w-[90%] rounded-lg px-3 py-2 relative ${message.type === 'user' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>
            {/* Message Content or Edit Input */}
            {editingMessageId === message.id ? (
              <div className="space-y-2">
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="w-full min-h-[60px] p-2 rounded bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="px-2 py-1 bg-[var(--accent-primary)] text-white rounded text-xs flex items-center gap-1"><Check className="h-3 w-3" />Save</button>
                  <button onClick={handleCancelEdit} className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-xs flex items-center gap-1"><X className="h-3 w-3" />Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-sm whitespace-pre-wrap">
                  <ReactMarkdown 
                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Document Created Badge */}
                {message.documentCreated && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    <FileText className="h-3 w-3" />
                    <span>Created: {message.documentCreated.title}</span>
                  </div>
                )}

                {/* Thinking Steps */}
                {message.type === 'assistant' && message.thinkingSteps && message.thinkingSteps.length > 0 && (
                  <div className="mt-2">
                    <button onClick={() => toggleThinking(message.id)} className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                      {expandedThinking.has(message.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <Brain className="h-3 w-3" />Show thinking ({message.thinkingSteps.length} steps)
                    </button>
                    {expandedThinking.has(message.id) && <div className="mt-2 space-y-2">{message.thinkingSteps.map((step: any, idx: number) => renderThinkingStep(step, idx))}</div>}
                  </div>
                )}

                {/* RAG Candidates */}
                {message.candidateDocs && message.candidateDocs.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                      <Search className="h-3 w-3" />
                      Found {message.candidateDocs.length} relevant documents
                    </div>
                    <div className="space-y-1">
                      {message.candidateDocs.slice(0, 3).map((doc: any) => (
                        <button
                          key={doc.documentId}
                          onClick={() => onDocumentSelect(doc.documentId)}
                          className="w-full text-left text-xs p-2 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors flex items-start gap-2"
                        >
                          <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{doc.title}</div>
                            {doc.snippet && <div className="text-[var(--text-secondary)] line-clamp-2 mt-0.5">{doc.snippet}</div>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Hover Actions */}
            {hoveredMessageId === message.id && !editingMessageId && (
              <div className="absolute -top-2 right-2 flex gap-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded shadow-sm p-1">
                {message.type === 'user' && (
                  <button onClick={() => handleEditMessage(message.id, message.content)} className="p-1 hover:bg-[var(--bg-hover)] rounded" title="Edit message"><Edit2 className="h-3 w-3" /></button>
                )}
                {message.type === 'user' && index < messages.length - 1 && (
                  <button onClick={() => handleRerunFromMessage(message.id)} className="p-1 hover:bg-[var(--bg-hover)] rounded" title="Rerun from here"><ArrowUp className="h-3 w-3" /></button>
                )}
                {message.type === 'assistant' && index === messages.length - 1 && (
                  <button onClick={handleUndoLastResponse} className="p-1 hover:bg-[var(--bg-hover)] rounded" title="Undo last response"><Undo2 className="h-3 w-3" /></button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      {isLoading && !messages.some((m: any) => m.isProcessing) && (
        <div className="flex justify-start"><div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /><span className="text-sm text-[var(--text-secondary)]">Thinking...</span></div></div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

