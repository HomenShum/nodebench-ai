// src/components/FastAgentPanel/FastAgentPanel.InputBar.tsx
// Enhanced input bar with auto-resize, context pills, and floating design

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2, Paperclip, X, Mic, Video, Image as ImageIcon, FileText, Sparkles, ChevronUp, StopCircle } from 'lucide-react';
import { MediaRecorderComponent } from './FastAgentPanel.MediaRecorder';
import { FileDropOverlay } from '../FileDropOverlay';
import { cn } from '@/lib/utils';

interface FastAgentInputBarProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (content?: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  selectedModel: 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gemini';
  onSelectModel: (model: 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gemini') => void;
  attachedFiles: File[];
  onAttachFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  selectedDocumentIds?: Set<string>; // For context pills
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
  placeholder = 'Ask anything...',
  maxLength = 10000,
}: FastAgentInputBarProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'audio' | 'video' | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if ((!trimmed && attachedFiles.length === 0) || isStreaming) return;

    onSend();

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
    onAttachFiles(files);
  };

  const handleFilesDrop = (files: File[]) => {
    // Filter for media files (images, audio, video)
    const mediaFiles = files.filter(file =>
      file.type.startsWith('image/') ||
      file.type.startsWith('audio/') ||
      file.type.startsWith('video/')
    );

    if (mediaFiles.length > 0) {
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

  const canSend = (input.trim().length > 0 || attachedFiles.length > 0) && !isStreaming;

  return (
    <div ref={containerRef} className="relative w-full">
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
        "focus-within:shadow-xl focus-within:border-[var(--accent-primary)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-primary)]/20"
      )}>

        {/* Context Pills Area (Documents, Models, etc.) */}
        <div className="px-3 pt-3 flex flex-wrap gap-2 items-center">
          {/* Model Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-full text-xs font-medium text-[var(--text-primary)] transition-colors"
            >
              <Sparkles className="w-3 h-3 text-[var(--accent-secondary)]" />
              <span>{selectedModel === 'gpt-5' ? 'GPT-5' : selectedModel === 'gpt-5-mini' ? 'GPT-5 Mini' : selectedModel === 'gemini' ? 'Gemini' : 'GPT-5 Nano'}</span>
              <ChevronUp className={cn("w-3 h-3 transition-transform", showModelSelector ? "rotate-180" : "")} />
            </button>

            {/* Model Dropdown */}
            {showModelSelector && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowModelSelector(false)}
                />
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] shadow-xl overflow-hidden z-20 flex flex-col py-1">
                  <div className="px-3 py-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Select Model</div>
                  {[
                    { id: 'gpt-5', label: 'GPT-5', desc: 'Most capable' },
                    { id: 'gpt-5-mini', label: 'GPT-5 Mini', desc: 'Fast & efficient' },
                    { id: 'gpt-5-nano', label: 'GPT-5 Nano', desc: 'Lightning fast' },
                    { id: 'gemini', label: 'Gemini 1.5', desc: 'Large context' },
                  ].map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onSelectModel(model.id as any);
                        setShowModelSelector(false);
                      }}
                      className={cn(
                        "px-3 py-2 text-left hover:bg-[var(--bg-hover)] transition-colors flex flex-col",
                        selectedModel === model.id && "bg-[var(--accent-primary-bg)]"
                      )}
                    >
                      <span className={cn("text-xs font-medium", selectedModel === model.id ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]")}>
                        {model.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{model.desc}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Document Pills */}
          {selectedDocumentIds && selectedDocumentIds.size > 0 && Array.from(selectedDocumentIds).map((docId) => (
            <div key={docId} className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300">
              <FileText className="w-3 h-3" />
              <span className="max-w-[100px] truncate">Document</span>
              <button className="hover:text-blue-900">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
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
