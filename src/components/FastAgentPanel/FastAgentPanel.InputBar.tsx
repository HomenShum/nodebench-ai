// src/components/FastAgentPanel/FastAgentPanel.InputBar.tsx
// Enhanced input bar with auto-resize and keyboard shortcuts

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2, Paperclip, X } from 'lucide-react';

interface InputBarProps {
  onSend: (content: string) => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    if (!trimmed || disabled) return;
    
    onSend(trimmed);
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
  
  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const canSend = input.trim().length > 0 && !disabled;
  
  return (
    <div className="input-bar">
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="attached-files">
          {attachedFiles.map((file, index) => (
            <div key={index} className="attached-file">
              <Paperclip className="h-3.5 w-3.5" />
              <span className="file-name">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="remove-file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Input container */}
      <div className="input-container">
        {/* File upload button */}
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
          border-top: 1px solid var(--border-color);
          background: var(--bg-primary);
          padding: 1rem;
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
