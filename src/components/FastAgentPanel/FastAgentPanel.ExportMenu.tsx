// src/components/FastAgentPanel/FastAgentPanel.ExportMenu.tsx
// Export conversation menu with multiple format options

import React, { useState } from 'react';
import { Download, FileText, Code, X } from 'lucide-react';
import type { Message, Thread } from './types';

interface ExportMenuProps {
  thread: Thread;
  messages: Message[];
  onClose: () => void;
}

/**
 * ExportMenu - Export conversation in various formats
 */
export function ExportMenu({ thread, messages, onClose }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);
  
  const exportAsMarkdown = () => {
    setIsExporting(true);
    
    try {
      let markdown = `# ${thread.title}\n\n`;
      markdown += `*Exported on ${new Date().toLocaleString()}*\n\n`;
      markdown += `---\n\n`;
      
      messages.forEach((msg, index) => {
        const role = msg.role === 'user' ? '👤 You' : '🤖 Assistant';
        const timestamp = new Date(msg.timestamp).toLocaleString();
        
        markdown += `## ${role} - ${timestamp}\n\n`;
        markdown += `${msg.content}\n\n`;
        
        // Add metadata for assistant messages
        if (msg.role === 'assistant' && (msg.model || msg.elapsedMs)) {
          markdown += `*`;
          if (msg.model) markdown += `Model: ${msg.model}`;
          if (msg.fastMode) markdown += ` (Fast Mode)`;
          if (msg.elapsedMs) markdown += ` • ${(msg.elapsedMs / 1000).toFixed(1)}s`;
          if (msg.tokensUsed) {
            markdown += ` • ${msg.tokensUsed.input + msg.tokensUsed.output} tokens`;
          }
          markdown += `*\n\n`;
        }
        
        if (index < messages.length - 1) {
          markdown += `---\n\n`;
        }
      });
      
      downloadFile(markdown, `${sanitizeFilename(thread.title)}.md`, 'text/markdown');
    } finally {
      setIsExporting(false);
    }
  };
  
  const exportAsJSON = () => {
    setIsExporting(true);
    
    try {
      const data = {
        thread: {
          id: thread._id,
          title: thread.title,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          pinned: thread.pinned,
        },
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          model: msg.model,
          fastMode: msg.fastMode,
          tokensUsed: msg.tokensUsed,
          elapsedMs: msg.elapsedMs,
          thinkingSteps: msg.thinkingSteps,
          toolCalls: msg.toolCalls,
          sources: msg.sources,
        })),
        exportedAt: new Date().toISOString(),
      };
      
      const json = JSON.stringify(data, null, 2);
      downloadFile(json, `${sanitizeFilename(thread.title)}.json`, 'application/json');
    } finally {
      setIsExporting(false);
    }
  };
  
  const exportAsText = () => {
    setIsExporting(true);
    
    try {
      let text = `${thread.title}\n`;
      text += `${'='.repeat(thread.title.length)}\n\n`;
      text += `Exported on ${new Date().toLocaleString()}\n\n`;
      
      messages.forEach((msg, index) => {
        const role = msg.role === 'user' ? 'You' : 'Assistant';
        const timestamp = new Date(msg.timestamp).toLocaleString();
        
        text += `[${role}] ${timestamp}\n`;
        text += `${msg.content}\n`;
        
        if (index < messages.length - 1) {
          text += `\n${'-'.repeat(60)}\n\n`;
        }
      });
      
      downloadFile(text, `${sanitizeFilename(thread.title)}.txt`, 'text/plain');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="export-menu-overlay" onClick={onClose}>
      <div className="export-menu" onClick={(e) => e.stopPropagation()}>
        <div className="export-menu-header">
          <h3 className="export-menu-title">Export Conversation</h3>
          <button onClick={onClose} className="export-menu-close">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="export-menu-content">
          <p className="export-menu-description">
            Export "{thread.title}" ({messages.length} messages)
          </p>
          
          <div className="export-options">
            <button
              onClick={exportAsMarkdown}
              disabled={isExporting}
              className="export-option"
            >
              <FileText className="h-5 w-5" />
              <div className="export-option-text">
                <span className="export-option-title">Markdown</span>
                <span className="export-option-desc">Formatted text with metadata</span>
              </div>
            </button>
            
            <button
              onClick={exportAsJSON}
              disabled={isExporting}
              className="export-option"
            >
              <Code className="h-5 w-5" />
              <div className="export-option-text">
                <span className="export-option-title">JSON</span>
                <span className="export-option-desc">Complete data with all fields</span>
              </div>
            </button>
            
            <button
              onClick={exportAsText}
              disabled={isExporting}
              className="export-option"
            >
              <Download className="h-5 w-5" />
              <div className="export-option-text">
                <span className="export-option-title">Plain Text</span>
                <span className="export-option-desc">Simple text format</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .export-menu-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1002;
        }
        
        .export-menu {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        .export-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        
        .export-menu-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .export-menu-close {
          padding: 0.5rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 0.375rem;
          transition: all 0.15s;
        }
        
        .export-menu-close:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        
        .export-menu-content {
          padding: 1.5rem;
        }
        
        .export-menu-description {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }
        
        .export-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .export-option {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        
        .export-option:hover:not(:disabled) {
          background: var(--bg-tertiary);
          border-color: #3b82f6;
          transform: translateY(-1px);
        }
        
        .export-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .export-option-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .export-option-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .export-option-desc {
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

// Helper functions
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
    .slice(0, 50);
}

