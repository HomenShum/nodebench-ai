// src/components/FastAgentPanel/FastAgentPanel.Settings.tsx
// Settings panel for FastAgentPanel

import React, { useState } from 'react';
import { X, Zap, Thermometer, Hash, FileText } from 'lucide-react';

type ModelOption = 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gemini';

interface SettingsProps {
  fastMode: boolean;
  onFastModeChange: (enabled: boolean) => void;
  model: ModelOption;
  onModelChange: (model: ModelOption) => void;
  onClose: () => void;
}

/**
 * Settings - Configuration panel for FastAgentPanel
 */
export function Settings({
  fastMode,
  onFastModeChange,
  model,
  onModelChange,
  onClose,
}: SettingsProps) {
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [systemPrompt, setSystemPrompt] = useState('');
  
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3 className="settings-title">Fast Agent Settings</h3>
          <button onClick={onClose} className="settings-close">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="settings-content">
          {/* Fast Mode Toggle */}
          <div className="setting-group">
            <div className="setting-label">
              <Zap className="h-4 w-4" />
              <span>Fast Mode</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={fastMode}
                onChange={(e) => onFastModeChange(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <p className="setting-description">
            Optimized for speed with reduced thinking steps and faster responses
          </p>
          
          {/* Model Selection */}
          <div className="setting-group">
            <div className="setting-label">
              <FileText className="h-4 w-4" />
              <span>Model</span>
            </div>
            <select
              value={model}
              onChange={(e) => onModelChange(e.target.value as ModelOption)}
              className="setting-select"
            >
              <optgroup label="GPT-5 Series">
                <option value="gpt-5">GPT-5 (Most Capable)</option>
                <option value="gpt-5-mini">GPT-5 Mini (Balanced)</option>
                <option value="gpt-5-nano">GPT-5 Nano (Fastest)</option>
              </optgroup>
              <optgroup label="Other">
                <option value="gemini">Google Gemini</option>
              </optgroup>
            </select>
          </div>
          
          {/* Temperature */}
          <div className="setting-group">
            <div className="setting-label">
              <Thermometer className="h-4 w-4" />
              <span>Temperature</span>
              <span className="setting-value">{temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="setting-slider"
            />
          </div>
          <p className="setting-description">
            Higher values make output more random, lower values more focused
          </p>
          
          {/* Max Tokens */}
          <div className="setting-group">
            <div className="setting-label">
              <Hash className="h-4 w-4" />
              <span>Max Tokens</span>
              <span className="setting-value">{maxTokens}</span>
            </div>
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="setting-slider"
            />
          </div>
          <p className="setting-description">
            Maximum length of the response (higher = longer responses)
          </p>
          
          {/* System Prompt */}
          <div className="setting-group-vertical">
            <div className="setting-label">
              <FileText className="h-4 w-4" />
              <span>System Prompt (Optional)</span>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter custom instructions for the AI..."
              className="setting-textarea"
              rows={4}
            />
          </div>
          <p className="setting-description">
            Custom instructions that guide the AI's behavior
          </p>
        </div>

        <div className="settings-footer">
          <button onClick={onClose} className="btn-primary">
            Done
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .settings-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1002;
        }
        
        .settings-panel {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        
        .settings-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .settings-close {
          padding: 0.5rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 0.375rem;
          transition: all 0.15s;
        }
        
        .settings-close:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        
        .settings-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }
        
        .setting-group {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .setting-group-vertical {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        
        .setting-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        
        .setting-value {
          margin-left: auto;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .setting-description {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        
        .toggle-switch {
          position: relative;
          width: 48px;
          height: 24px;
        }
        
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 24px;
          transition: all 0.2s;
        }
        
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: all 0.2s;
        }
        
        input:checked + .toggle-slider {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          border-color: #fbbf24;
        }
        
        input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }
        
        .setting-select {
          padding: 0.5rem 0.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
        }
        
        .setting-select:focus {
          outline: none;
          border-color: #3b82f6;
        }
        
        .setting-slider {
          width: 100%;
          height: 4px;
          background: var(--bg-tertiary);
          border-radius: 2px;
          outline: none;
          margin-top: 0.5rem;
        }
        
        .setting-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .setting-textarea {
          width: 100%;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          font-family: inherit;
          resize: vertical;
        }
        
        .setting-textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }
        
        .settings-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
        }
        
        .btn-primary {
          padding: 0.5rem 1.5rem;
          background: #3b82f6;
          border: none;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .btn-primary:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}
