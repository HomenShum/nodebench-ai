// src/components/FastAgentPanel/FastAgentPanel.InputBar.tsx
// Enhanced input bar with auto-resize, context pills, drag-and-drop, and floating design

import React, { useState, useRef, useEffect, KeyboardEvent, DragEvent } from 'react';
import { Send, Loader2, Paperclip, X, Mic, Video, Image as ImageIcon, FileText, Sparkles, ChevronUp, StopCircle, FolderOpen, Table2, Calendar } from 'lucide-react';
import { MediaRecorderComponent } from './FastAgentPanel.MediaRecorder';
import { FileDropOverlay } from '@/shared/components/FileDropOverlay';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSelection } from '@/features/agents/context/SelectionContext';

// Import from SINGLE SOURCE OF TRUTH for models
import {
  getModelUIList,
  MODEL_UI_INFO,
  type ApprovedModel,
} from '@shared/llm/approvedModels';

// Get models from shared module
const APPROVED_MODEL_LIST = getModelUIList();

// File size limits
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Document context item for drag-and-drop
export interface DocumentContextItem {
  id: string;
  title: string;
  type?: 'document' | 'dossier' | 'note';
  analyzing?: boolean;
}

// Calendar event context item for drag-and-drop
export interface CalendarEventContextItem {
  id: string;
  title: string;
  startTime: number;
  endTime?: number;
  allDay?: boolean;
  location?: string;
  description?: string;
}

interface FastAgentInputBarProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (content?: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  attachedFiles: File[];
  onAttachFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  selectedDocumentIds?: Set<string>; // For context pills
  contextDocuments?: DocumentContextItem[]; // Enhanced document context
  onAddContextDocument?: (doc: DocumentContextItem) => void;
  onRemoveContextDocument?: (docId: string) => void;
  // Calendar event context
  contextCalendarEvents?: CalendarEventContextItem[];
  onAddCalendarEvent?: (event: CalendarEventContextItem) => void;
  onRemoveCalendarEvent?: (eventId: string) => void;
  placeholder?: string;
  maxLength?: number;
}

/**
 * FastAgentInputBar - Floating input container with context pills and model selection
 */
export function FastAgentInputBar({
  input,
  setInput,
  onSend,
  isStreaming,
  onStop,
  selectedModel,
  onSelectModel,
  attachedFiles,
  onAttachFiles,
  onRemoveFile,
  selectedDocumentIds,
  contextDocuments = [],
  onAddContextDocument,
  onRemoveContextDocument,
  contextCalendarEvents = [],
  onAddCalendarEvent,
  onRemoveCalendarEvent,
  placeholder = 'Ask anything...',
  maxLength = 10000,
}: FastAgentInputBarProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'audio' | 'video' | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragType, setDragType] = useState<'document' | 'calendar' | 'file' | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Selection context for "Chat with Selection" feature
  const { selection, clearSelection } = useSelection();

  // Handle document drag-and-drop
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Detect drag type for visual feedback
    const hasCalendarData = e.dataTransfer.types.includes('application/x-nodebench-calendar-event');
    // Support both MIME types: x-nodebench-document (legacy) and x-document-node (DocumentCard)
    const hasDocumentData = e.dataTransfer.types.includes('application/x-nodebench-document') ||
                            e.dataTransfer.types.includes('application/x-document-node');
    const hasFiles = e.dataTransfer.types.includes('Files');

    if (hasCalendarData) {
      setIsDragOver(true);
      setDragType('calendar');
    } else if (hasDocumentData) {
      setIsDragOver(true);
      setDragType('document');
    } else if (hasFiles) {
      setIsDragOver(true);
      setDragType('file');
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragType(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragType(null);

    // Handle document drops - support both MIME types
    // x-nodebench-document (legacy) and x-document-node (DocumentCard)
    let documentData = e.dataTransfer.getData('application/x-nodebench-document');
    if (!documentData) {
      documentData = e.dataTransfer.getData('application/x-document-node');
    }
    if (documentData && onAddContextDocument) {
      try {
        const rawDoc = JSON.parse(documentData);
        // Normalize the document data structure (x-document-node uses 'id', x-nodebench-document uses 'id')
        const doc: DocumentContextItem = {
          id: rawDoc.id || rawDoc._id,
          title: rawDoc.title,
          type: rawDoc.type || 'document',
          analyzing: true,
        };
        onAddContextDocument(doc);
        toast.success(`Added "${doc.title}" to context`);
        // Simulate analysis completion after a delay (would be replaced with actual API call)
        setTimeout(() => {
          onAddContextDocument?.({ ...doc, analyzing: false });
        }, 1500);
      } catch (err) {
        console.error('Failed to parse document data:', err);
      }
    }

    // Handle calendar event drops
    const calendarEventData = e.dataTransfer.getData('application/x-nodebench-calendar-event');
    if (calendarEventData && onAddCalendarEvent) {
      try {
        const event = JSON.parse(calendarEventData) as CalendarEventContextItem;
        onAddCalendarEvent(event);
        toast.success(`Added "${event.title}" to context`);
      } catch (err) {
        console.error('Failed to parse calendar event data:', err);
      }
    }

    // Handle file drops
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const mediaFiles = files.filter(file =>
        file.type.startsWith('image/') ||
        file.type.startsWith('audio/') ||
        file.type.startsWith('video/')
      );

      // Check file sizes
      const oversizedFiles = mediaFiles.filter(file => file.size > MAX_FILE_SIZE_BYTES);
      if (oversizedFiles.length > 0) {
        toast.error(`File too large for context window. Maximum size: ${MAX_FILE_SIZE_MB}MB`, {
          description: oversizedFiles.map(f => f.name).join(', ')
        });
        // Filter out oversized files
        const validFiles = mediaFiles.filter(file => file.size <= MAX_FILE_SIZE_BYTES);
        if (validFiles.length > 0) {
          onAttachFiles(validFiles);
        }
      } else if (mediaFiles.length > 0) {
        onAttachFiles(mediaFiles);
      }
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200); // Max 200px
    textarea.style.height = `${newHeight}px`;
  }, [input]);

  // Focus on mount
  useEffect(() => {
    if (!isStreaming) {
      textareaRef.current?.focus();
    }
  }, [isStreaming]);

  const handleSend = () => {
    const trimmed = input.trim();
    const hasSelection = selection !== null;
    const hasCalendarEvents = contextCalendarEvents.length > 0;
    if ((!trimmed && attachedFiles.length === 0 && !hasSelection && !hasCalendarEvents) || isStreaming) return;

    let contextPrefix = '';

    // Add calendar event context
    if (hasCalendarEvents) {
      const eventsContext = contextCalendarEvents.map(event => {
        const eventDate = new Date(event.startTime);
        const dateStr = eventDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const timeStr = event.allDay ? 'All day' : eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const endTimeStr = event.endTime ? new Date(event.endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
        return `- **${event.title}**\n  - Date: ${dateStr}\n  - Time: ${event.allDay ? 'All day' : `${timeStr}${endTimeStr ? ` - ${endTimeStr}` : ''}`}${event.location ? `\n  - Location: ${event.location}` : ''}${event.description ? `\n  - Description: ${event.description}` : ''}`;
      }).join('\n\n');
      contextPrefix += `**Calendar Events for Context:**\n\n${eventsContext}\n\n---\n\n`;
    }

    // Add selection context
    if (hasSelection && selection) {
      const selectionContext = `**Analyzing ${selection.metadata.sourceType} selection from "${selection.metadata.filename}"${selection.metadata.rangeDescription ? ` (${selection.metadata.rangeDescription})` : ''}:**\n\n${selection.content}\n\n---\n\n`;
      contextPrefix += selectionContext;
    }

    // Send with context
    if (contextPrefix) {
      const defaultPrompt = hasCalendarEvents ? 'Please prepare a dossier for these events.' : 'Please analyze this data.';
      const messageWithContext = trimmed ? `${contextPrefix}${trimmed}` : `${contextPrefix}${defaultPrompt}`;
      onSend(messageWithContext);
      if (hasSelection) clearSelection();
    } else {
      onSend();
    }

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (Shift+Enter for newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      toast.error(`File too large for context window. Maximum size: ${MAX_FILE_SIZE_MB}MB`, {
        description: oversizedFiles.map(f => f.name).join(', ')
      });
      const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE_BYTES);
      if (validFiles.length > 0) {
        onAttachFiles(validFiles);
      }
    } else {
      onAttachFiles(files);
    }

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleFilesDrop = (files: File[]) => {
    // Filter for media files (images, audio, video)
    const mediaFiles = files.filter(file =>
      file.type.startsWith('image/') ||
      file.type.startsWith('audio/') ||
      file.type.startsWith('video/')
    );

    // Check file sizes
    const oversizedFiles = mediaFiles.filter(file => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      toast.error(`File too large for context window. Maximum size: ${MAX_FILE_SIZE_MB}MB`, {
        description: oversizedFiles.map(f => f.name).join(', ')
      });
      const validFiles = mediaFiles.filter(file => file.size <= MAX_FILE_SIZE_BYTES);
      if (validFiles.length > 0) {
        onAttachFiles(validFiles);
      }
    } else if (mediaFiles.length > 0) {
      onAttachFiles(mediaFiles);
    }
  };

  const startRecording = (mode: 'audio' | 'video') => {
    setRecordingMode(mode);
    setIsRecording(true);
  };

  const handleRecordingComplete = (blob: Blob, type: 'audio' | 'video') => {
    const file = new File(
      [blob],
      `${type}-${Date.now()}.webm`,
      { type: type === 'video' ? 'video/webm' : 'audio/webm' }
    );
    onAttachFiles([file]);
    setIsRecording(false);
    setRecordingMode(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-3.5 w-3.5" />;
    if (file.type.startsWith('audio/')) return <Mic className="h-3.5 w-3.5" />;
    if (file.type.startsWith('video/')) return <Video className="h-3.5 w-3.5" />;
    return <Paperclip className="h-3.5 w-3.5" />;
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const canSend = (input.trim().length > 0 || attachedFiles.length > 0 || contextDocuments.length > 0 || selection !== null || contextCalendarEvents.length > 0) && !isStreaming;

  // Get drag feedback colors based on type
  const getDragFeedbackClasses = () => {
    switch (dragType) {
      case 'calendar':
        return {
          overlay: 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20',
          text: 'text-purple-600 dark:text-purple-400',
          border: 'border-purple-500 ring-2 ring-purple-500/20',
          message: 'Drop calendar event to add context',
          icon: Calendar,
        };
      case 'document':
        return {
          overlay: 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20',
          text: 'text-blue-600 dark:text-blue-400',
          border: 'border-blue-500 ring-2 ring-blue-500/20',
          message: 'Drop documents to add context',
          icon: FolderOpen,
        };
      case 'file':
      default:
        return {
          overlay: 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20',
          text: 'text-blue-600 dark:text-blue-400',
          border: 'border-blue-500 ring-2 ring-blue-500/20',
          message: 'Drop files to add context',
          icon: FolderOpen,
        };
    }
  };

  const dragFeedback = getDragFeedbackClasses();
  const DragIcon = dragFeedback.icon;

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-over visual feedback */}
      {isDragOver && (
        <div className={cn(
          "absolute inset-0 z-10 rounded-2xl border-2 border-dashed flex items-center justify-center pointer-events-none",
          dragFeedback.overlay
        )}>
          <div className={cn("flex items-center gap-2", dragFeedback.text)}>
            <DragIcon className="w-5 h-5" />
            <span className="text-sm font-medium">{dragFeedback.message}</span>
          </div>
        </div>
      )}

      {/* File drop overlay */}
      <FileDropOverlay
        containerRef={containerRef}
        onFilesDrop={handleFilesDrop}
        disabled={isStreaming || isRecording}
        hint="Drop media files here"
      />

      {/* Recording Modal */}
      {isRecording && recordingMode && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <MediaRecorderComponent
            mode={recordingMode}
            onRecordingComplete={handleRecordingComplete}
            onClose={() => {
              setIsRecording(false);
              setRecordingMode(null);
            }}
          />
        </div>
      )}

      {/* Main Input Card */}
      <div className={cn(
        "bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-lg transition-all duration-200",
        "focus-within:shadow-xl focus-within:border-[var(--accent-primary)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-primary)]/20",
        isDragOver && dragFeedback.border
      )}>

        {/* Context Pills Area (Documents, Models, etc.) */}
        <div className="px-3 pt-3 flex flex-wrap gap-2 items-center">
          {/* Model Selector Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-full text-xs font-medium text-[var(--text-primary)] transition-colors"
            >
              <Sparkles className="w-3 h-3 text-[var(--accent-secondary)]" />
              {/* 2025 Model Consolidation: Uses shared/llm/approvedModels.ts */}
              <span>{MODEL_UI_INFO[selectedModel as ApprovedModel]?.name ?? 'GPT-5.2'}</span>
              <ChevronUp className={cn("w-3 h-3 transition-transform", showModelSelector ? "rotate-180" : "")} />
            </button>

            {/* Model Dropdown - Uses APPROVED_MODEL_LIST from shared module */}
            {showModelSelector && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowModelSelector(false)}
                />
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] shadow-xl overflow-hidden z-20 flex flex-col py-1">
                  <div className="px-3 py-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Select Model</div>
                  {APPROVED_MODEL_LIST.map((model) => (
                    <button
                      type="button"
                      key={model.id}
                      onClick={() => {
                        onSelectModel(model.id);
                        setShowModelSelector(false);
                      }}
                      className={cn(
                        "px-3 py-2 text-left hover:bg-[var(--bg-hover)] transition-colors flex flex-col",
                        selectedModel === model.id && "bg-[var(--accent-primary-bg)]"
                      )}
                    >
                      <span className={cn("text-xs font-medium flex items-center gap-1.5", selectedModel === model.id ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]")}>
                        <span>{model.icon}</span>
                        {model.name}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{model.description}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Document Pills (legacy) */}
          {selectedDocumentIds && selectedDocumentIds.size > 0 && Array.from(selectedDocumentIds).map((docId) => (
            <div key={docId} className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300">
              <FileText className="w-3 h-3" />
              <span className="max-w-[100px] truncate">Document</span>
              <button type="button" className="hover:text-blue-900">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Context Documents Pills (drag-and-drop) */}
          {contextDocuments.map((doc) => (
            <div
              key={doc.id}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all",
                doc.analyzing
                  ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                  : "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              )}
            >
              {doc.analyzing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <FileText className="w-3 h-3" />
              )}
              <span className="max-w-[120px] truncate">
                {doc.analyzing ? `Analyzing ${doc.title}...` : doc.title}
              </span>
              {!doc.analyzing && onRemoveContextDocument && (
                <button
                  type="button"
                  onClick={() => onRemoveContextDocument(doc.id)}
                  className="hover:text-emerald-900 dark:hover:text-emerald-100"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Selection Context Pill */}
          {selection && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-full text-xs font-medium text-teal-700 dark:text-teal-300">
              <Table2 className="w-3 h-3" />
              <span className="max-w-[150px] truncate">
                {selection.metadata.sourceType === 'spreadsheet'
                  ? `Cells ${selection.metadata.rangeDescription} from ${selection.metadata.filename}`
                  : `Selection from ${selection.metadata.filename}`
                }
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="hover:text-teal-900 dark:hover:text-teal-100"
                title="Remove selection context"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Calendar Event Context Pills */}
          {contextCalendarEvents.map((event) => {
            const eventDate = new Date(event.startTime);
            const dateStr = eventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const timeStr = event.allDay ? 'All day' : eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={event.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-full text-xs font-medium text-purple-700 dark:text-purple-300"
              >
                <Calendar className="w-3 h-3" />
                <span className="max-w-[120px] truncate" title={`${event.title} - ${dateStr} ${timeStr}`}>
                  {event.title}
                </span>
                <span className="text-purple-500 dark:text-purple-400 text-[10px]">
                  {dateStr}
                </span>
                {onRemoveCalendarEvent && (
                  <button
                    type="button"
                    onClick={() => onRemoveCalendarEvent(event.id)}
                    className="hover:text-purple-900 dark:hover:text-purple-100"
                    title="Remove event context"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="px-3 pt-2 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => {
              const preview = getFilePreview(file);
              return (
                <div key={index} className="relative group flex items-center gap-2 px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-xs">
                  {preview ? (
                    <img src={preview} alt={file.name} className="w-6 h-6 object-cover rounded" />
                  ) : (
                    <div className="p-1 bg-[var(--bg-primary)] rounded border border-[var(--border-color)]">
                      {getFileIcon(file)}
                    </div>
                  )}
                  <span className="max-w-[100px] truncate text-[var(--text-primary)]">{file.name}</span>
                  <button
                    onClick={() => onRemoveFile(index)}
                    className="absolute -top-1.5 -right-1.5 bg-[var(--bg-primary)] rounded-full border border-[var(--border-color)] p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 flex items-end gap-2">
          {/* Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isStreaming}
            maxLength={maxLength}
            className="flex-1 max-h-[200px] py-2 bg-transparent border-none focus:ring-0 p-0 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none leading-relaxed"
            rows={1}
          />

          {/* Send/Stop Button */}
          {isStreaming ? (
            <button
              onClick={onStop}
              className="p-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
              title="Stop generating"
            >
              <StopCircle className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                canSend
                  ? "bg-[var(--accent-primary)] text-white hover:opacity-90 shadow-sm hover:shadow"
                  : "bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed"
              )}
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Footer / Hints */}
      <div className="mt-2 flex items-center justify-between px-2 text-[10px] text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <span>Enter to send</span>
          <span>•</span>
          <span>Shift + Enter for new line</span>
        </div>
        {input.length > maxLength * 0.8 && (
          <span>{input.length} / {maxLength}</span>
        )}
      </div>
    </div>
  );
}
