// src/components/FastAgentPanel/FastAgentPanel.InputBar.tsx
// Enhanced input bar with auto-resize and keyboard shortcuts

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2, Paperclip, X, Mic, Video, Image as ImageIcon } from 'lucide-react';
import { MediaRecorderComponent } from './FastAgentPanel.MediaRecorder';
import { FileDropOverlay } from '../FileDropOverlay';

interface InputBarProps {
  onSend: (content: string, files?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

/**
 * InputBar - Auto-resizing textarea with send button and keyboard shortcuts
 */
export function InputBar({
  onSend,
  disabled = false,
  placeholder = 'Ask me anything...',
  maxLength = 10000,
}: InputBarProps) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'audio' | 'video' | null>(null);
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
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, [disabled]);
  
  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && attachedFiles.length === 0) || disabled) return;
    
    onSend(trimmed, attachedFiles.length > 0 ? attachedFiles : undefined);
    setInput('');
    setAttachedFiles([]);
    
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
    setAttachedFiles(prev => [...prev, ...files]);
  };
  
  const handleFilesDrop = (files: File[]) => {
    // Filter for media files (images, audio, video)
    const mediaFiles = files.filter(file => 
      file.type.startsWith('image/') || 
      file.type.startsWith('audio/') || 
      file.type.startsWith('video/')
    );
    
    if (mediaFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...mediaFiles]);
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
    setAttachedFiles(prev => [...prev, file]);
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
  
  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const canSend = (input.trim().length > 0 || attachedFiles.length > 0) && !disabled;
  
  return (
    <div ref={containerRef} className="input-bar">
      {/* File drop overlay */}
      <FileDropOverlay
        containerRef={containerRef}
        onFilesDrop={handleFilesDrop}
        disabled={disabled || isRecording}
        hint="Drop media files here (Images, Audio, Video)"
      />
      
      {/* Recording Modal */}
      {isRecording && recordingMode && (
        <div className="recording-modal">
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
      
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="attached-files">
          {attachedFiles.map((file, index) => {
            const preview = getFilePreview(file);
            return (
              <div key={index} className="attached-file">
                {preview ? (
                  <img src={preview} alt={file.name} className="file-preview-img" />
                ) : (
                  getFileIcon(file)
                )}
                <span className="file-name">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="remove-file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Input container */}
      <div className="input-container">
        {/* Media action buttons */}
        <div className="media-actions">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="input-action-btn"
            title="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <button
            onClick={() => startRecording('audio')}
            disabled={disabled || isRecording}
            className="input-action-btn"
            title="Record audio"
          >
            <Mic className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => startRecording('video')}
            disabled={disabled || isRecording}
            className="input-action-btn"
            title="Record video"
          >
            <Video className="h-5 w-5" />
          </button>
        </div>
        
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className="input-textarea"
          rows={1}
        />
        
        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="send-btn"
          title="Send message (Enter)"
        >
          {disabled ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
      
      {/* Character count */}
      {input.length > maxLength * 0.8 && (
        <div className="char-count">
          {input.length} / {maxLength}
        </div>
      )}
      
      {/* Keyboard hint */}
      <div className="keyboard-hint">
        <kbd>Enter</kbd> to send • <kbd>Shift + Enter</kbd> for new line
      </div>
      
      <style>{`
        .input-bar {
          position: relative;
          border-top: 1px solid var(--border-color);
          background: var(--bg-primary);
          padding: 1rem;
        }
        
        .recording-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        
        .attached-files {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        
        .attached-file {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          color: var(--text-primary);
        }
        
        .file-preview-img {
          width: 2rem;
          height: 2rem;
          object-fit: cover;
          border-radius: 0.25rem;
        }
        
        .file-name {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .remove-file {
          padding: 0.125rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 0.25rem;
          transition: all 0.15s;
        }
        
        .remove-file:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        
        .input-container {
          display: flex;
          align-items: flex-end;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          border-radius: 0.75rem;
          transition: border-color 0.15s;
        }
        
        .input-container:focus-within {
          border-color: #3b82f6;
        }
        
        .media-actions {
          display: flex;
          gap: 0.25rem;
          flex-shrink: 0;
        }
        
        .input-action-btn {
          flex-shrink: 0;
          padding: 0.5rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 0.5rem;
          transition: all 0.15s;
        }
        
        .input-action-btn:hover:not(:disabled) {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        
        .input-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .input-textarea {
          flex: 1;
          min-height: 24px;
          max-height: 200px;
          padding: 0.5rem 0;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.9375rem;
          line-height: 1.5;
          resize: none;
          outline: none;
          font-family: inherit;
        }
        
        .input-textarea::placeholder {
          color: var(--text-secondary);
        }
        
        .input-textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .send-btn {
          flex-shrink: 0;
          padding: 0.5rem;
          background: #3b82f6;
          border: none;
          color: white;
          cursor: pointer;
          border-radius: 0.5rem;
          transition: all 0.15s;
        }
        
        .send-btn:hover:not(:disabled) {
          background: #2563eb;
          transform: scale(1.05);
        }
        
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .char-count {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-align: right;
        }
        
        .keyboard-hint {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-align: center;
        }
        
        .keyboard-hint kbd {
          padding: 0.125rem 0.375rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.6875rem;
        }
      `}</style>
    </div>
  );
}
