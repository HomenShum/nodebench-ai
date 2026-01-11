// src/components/FastAgentPanel/FastAgentPanel.Settings.tsx
// Settings panel for FastAgentPanel with multi-provider LLM support

import React, { useState, useEffect } from 'react';
import { X, Zap, Thermometer, Hash, FileText, Scale, BarChart3, Sparkles, BookOpen } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { ModelSelector } from '../../../../components/ModelSelector';
import { UsageDashboard } from '../../../../components/UsageDashboard';
import type { Id } from '../../../../../convex/_generated/dataModel';

// Extended to support all providers
type ModelOption = string;

interface SettingsProps {
  fastMode: boolean;
  onFastModeChange: (enabled: boolean) => void;
  model: ModelOption;
  onModelChange: (model: ModelOption) => void;
  arbitrageMode: boolean;
  onArbitrageModeChange: (enabled: boolean) => void;
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
  arbitrageMode: arbitrageModeProp,
  onArbitrageModeChange,
  onClose,
}: SettingsProps) {
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [systemPrompt, setSystemPrompt] = useState('');

  // Arbitrage mode - persisted to backend
  const agentsPrefs = useQuery(api.agentsPrefs.getAgentsPrefs);
  const setAgentsPrefs = useMutation(api.agentsPrefs.setAgentsPrefs);
  const [arbitrageMode, setArbitrageMode] = useState(arbitrageModeProp);
  const updateTeaching = useMutation(api.domains.teachability.updateTeaching);
  const deleteTeaching = useMutation(api.domains.teachability.deleteTeaching);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [draftKey, setDraftKey] = useState('');

  const savedPreferences = useQuery(api.domains.teachability.listUserTeachings, {
    type: "preference",
    limit: 5,
  });
  const savedSkills = useQuery(api.domains.teachability.listUserTeachings, {
    type: "skill",
    limit: 5,
  });

  // Sync arbitrage mode from backend
  useEffect(() => {
    if (agentsPrefs?.arbitrageMode !== undefined) {
      setArbitrageMode(agentsPrefs.arbitrageMode === 'true');
      onArbitrageModeChange(agentsPrefs.arbitrageMode === 'true');
    }
  }, [agentsPrefs, onArbitrageModeChange]);

  // Sync local toggle with prop (so FastAgentPanel state stays authoritative)
  useEffect(() => {
    setArbitrageMode(arbitrageModeProp);
  }, [arbitrageModeProp]);

  // Handle arbitrage mode toggle
  const handleArbitrageModeChange = async (enabled: boolean) => {
    setArbitrageMode(enabled);
    onArbitrageModeChange(enabled);
    try {
      await setAgentsPrefs({ prefs: { arbitrageMode: enabled ? 'true' : 'false' } });
    } catch (err) {
      console.error('[Settings] Failed to save arbitrage mode:', err);
      // Revert on error
      setArbitrageMode(!enabled);
    }
  };
  
  const startEditing = (item: any) => {
    setEditingId(String(item._id));
    setDraftContent(item.content || "");
    setDraftKey(item.key || "");
  };

  const saveEditing = async (id: Id<"userTeachings">) => {
    if (!draftContent.trim()) return;
    try {
      await updateTeaching({ teachingId: id, content: draftContent.trim(), key: draftKey.trim() || undefined });
    } finally {
      setEditingId(null);
      setDraftContent('');
      setDraftKey('');
    }
  };

  const handleDelete = async (id: Id<"userTeachings">) => {
    try {
      await deleteTeaching({ teachingId: id });
    } catch (err) {
      console.error("[Settings] Delete teaching failed", err);
    }
  };
  
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

          {/* Arbitrage Mode Toggle */}
          <div className="setting-group">
            <div className="setting-label">
              <Scale className="h-4 w-4" />
              <span>Arbitrage Mode</span>
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 rounded">BETA</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={arbitrageMode}
                onChange={(e) => handleArbitrageModeChange(e.target.checked)}
                aria-label="Toggle Arbitrage Mode"
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <p className="setting-description">
            Receipts-first research mode: detects contradictions, scores source quality, and tracks changes over time. "Show me the receipts."
          </p>

          {/* Model Selection - Multi-provider support */}
          <div className="setting-group-vertical">
            <div className="setting-label mb-3">
              <FileText className="h-4 w-4" />
              <span>AI Model</span>
            </div>
            <ModelSelector
              value={model}
              onChange={(modelId) => onModelChange(modelId as ModelOption)}
            />
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

          {/* Saved Preferences */}
          <div className="setting-group-vertical mt-6 pt-6 border-t border-[var(--border-color)]">
            <div className="setting-label mb-2">
              <Sparkles className="h-4 w-4" />
              <span>Saved Preferences</span>
            </div>
            {!savedPreferences ? (
              <p className="text-xs text-[var(--text-secondary)]">Loading preferences...</p>
            ) : savedPreferences.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">No preferences saved yet. Teach the agent how you like responses.</p>
            ) : (
              <div className="space-y-2">
                {savedPreferences.map((pref) => {
                  const isEditing = editingId === String(pref._id);
                  return (
                    <div
                      key={pref._id}
                      className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)] space-y-1"
                    >
                      {isEditing ? (
                        <>
                          <textarea
                            className="w-full text-xs border rounded px-2 py-1"
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.target.value)}
                            rows={2}
                          />
                          <div className="flex gap-2 text-[11px]">
                            <button
                              className="px-2 py-1 bg-[var(--bg-primary)] text-[var(--text-primary)] rounded"
                              onClick={() => saveEditing(pref._id as Id<"userTeachings">)}
                            >
                              Save
                            </button>
                            <button
                              className="px-2 py-1 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>{pref.content}</div>
                          <div className="flex gap-2 text-[11px] text-[var(--text-secondary)]">
                            <button onClick={() => startEditing(pref)}>Edit</button>
                            <button onClick={() => handleDelete(pref._id as Id<"userTeachings">)}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Learned Skills */}
          <div className="setting-group-vertical mt-4">
            <div className="setting-label mb-2">
              <BookOpen className="h-4 w-4" />
              <span>Learned Skills</span>
            </div>
            {!savedSkills ? (
              <p className="text-xs text-[var(--text-secondary)]">Loading skills...</p>
            ) : savedSkills.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">No custom skills yet. Teach a workflow in chat to see it here.</p>
            ) : (
              <div className="space-y-2">
                {savedSkills.map((skill) => {
                  const isEditing = editingId === String(skill._id);
                  return (
                    <div
                      key={skill._id}
                      className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 space-y-1"
                    >
                      {isEditing ? (
                        <>
                          <input
                            className="w-full text-xs border rounded px-2 py-1"
                            value={draftKey}
                            onChange={(e) => setDraftKey(e.target.value)}
                            placeholder="Skill name"
                          />
                          <textarea
                            className="w-full text-xs border rounded px-2 py-1 mt-1"
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.target.value)}
                            rows={2}
                          />
                          <div className="flex gap-2 text-[11px]">
                            <button
                              className="px-2 py-1 bg-[var(--bg-primary)] text-[var(--text-primary)] rounded"
                              onClick={() => saveEditing(skill._id as Id<"userTeachings">)}
                            >
                              Save
                            </button>
                            <button
                              className="px-2 py-1 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-semibold text-[var(--text-primary)]">
                            {skill.key || skill.category || "Custom skill"}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                            {skill.content}
                          </div>
                          <div className="flex gap-2 text-[11px] text-[var(--text-secondary)]">
                            <button onClick={() => {
                              setDraftKey(skill.key || skill.category || "");
                              setDraftContent(skill.content || "");
                              setEditingId(String(skill._id));
                            }}>Edit</button>
                            <button onClick={() => handleDelete(skill._id as Id<"userTeachings">)}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Usage Dashboard */}
          <div className="setting-group-vertical mt-6 pt-6 border-t border-[var(--border-color)]">
            <div className="setting-label mb-3">
              <BarChart3 className="h-4 w-4" />
              <span>Usage & Limits</span>
            </div>
            <UsageDashboard compact />
          </div>
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
