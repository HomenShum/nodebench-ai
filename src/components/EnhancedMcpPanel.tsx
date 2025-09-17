import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Server,
  Plus,
  X,
  Settings,
  Play,
  ChevronDown,
  ChevronRight,
  Loader2,
  Link as LinkIcon,
  Key,
  Trash2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  History as HistoryIcon
} from 'lucide-react';
import { useMcp } from '../hooks/useMcp';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { Id } from '../../convex/_generated/dataModel';

interface EnhancedMcpPanelProps {
  onClose: () => void;
}

type ConfirmPopoverProps = {
  anchorEl: HTMLElement;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

function ConfirmPopover({ anchorEl, title, message, confirmLabel = "Confirm", onConfirm, onClose }: ConfirmPopoverProps) {
  const popRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    const rect = anchorEl.getBoundingClientRect();
    const pop = popRef.current;
    const margin = 8;
    const defaultWidth = 360;
    const width = pop?.offsetWidth || defaultWidth;
    const height = pop?.offsetHeight || 0;
    let left = rect.right + margin;
    if (left + width > window.innerWidth - margin) left = Math.max(margin, rect.left - width - margin);
    let top = rect.top;
    if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.bottom - height);
    setStyle({ top, left });
  }, [anchorEl]);

  useEffect(() => {
    updatePosition();
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!popRef.current) return;
      if (popRef.current.contains(target)) return;
      if (anchorEl.contains(target)) return;
      onClose();
    };
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    document.addEventListener('keydown', onEsc, true);
    document.addEventListener('mousedown', onClick, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize, true);
    return () => {
      document.removeEventListener('keydown', onEsc, true);
      document.removeEventListener('mousedown', onClick, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize, true);
    };
  }, [anchorEl, onClose, updatePosition]);

  useEffect(() => { const id = window.setTimeout(updatePosition, 0); return () => window.clearTimeout(id); }, [updatePosition]);

  if (!style) return null;

  return (
    <div ref={popRef} style={{ position: 'fixed', top: style.top, left: style.left, zIndex: 10000, width: 360, maxWidth: '95vw' }} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md shadow-lg">
      <div className="p-3 w-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2"><Trash2 className="h-4 w-4 text-red-500" />{title}</h3>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">{message}</p>
        <div className="flex gap-2">
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">
            <Trash2 className="h-3 w-3" /> {confirmLabel}
          </button>
          <button onClick={onClose} className="px-3 py-2 text-sm bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded hover:bg-[var(--bg-active)]">Cancel</button>
        </div>
      </div>
    </div>
  );
}

type AddServerPopoverProps = {
  anchorEl: HTMLElement;
  separateInputs: boolean;
  setSeparateInputs: (v: boolean) => void;
  combinedInput: string;
  setCombinedInput: (v: string) => void;
  newServerName: string;
  setNewServerName: (v: string) => void;
  newServerUrl: string;
  setNewServerUrl: (v: string) => void;
  newApiKey: string;
  setNewApiKey: (v: string) => void;
  onAdd: () => void;
  onClose: () => void;
};

function AddServerPopover(props: AddServerPopoverProps) {
  const {
    anchorEl,
    separateInputs,
    setSeparateInputs,
    combinedInput,
    setCombinedInput,
    newServerName,
    setNewServerName,
    newServerUrl,
    setNewServerUrl,
    newApiKey,
    setNewApiKey,
    onAdd,
    onClose,
  } = props;

  const popRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    const rect = anchorEl.getBoundingClientRect();
    const pop = popRef.current;
    const margin = 8;
    const defaultWidth = 420;
    const width = pop?.offsetWidth || defaultWidth;
    const height = pop?.offsetHeight || 0;
    let left = rect.right + margin;
    if (left + width > window.innerWidth - margin) left = Math.max(margin, rect.left - width - margin);
    let top = rect.top;
    if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.bottom - height);
    setStyle({ top, left });
  }, [anchorEl]);

  useEffect(() => {
    updatePosition();
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!popRef.current) return;
      if (popRef.current.contains(target)) return;
      if (anchorEl.contains(target)) return;
      onClose();
    };
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    document.addEventListener('keydown', onEsc, true);
    document.addEventListener('mousedown', onClick, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize, true);
    return () => {
      document.removeEventListener('keydown', onEsc, true);
      document.removeEventListener('mousedown', onClick, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize, true);
    };
  }, [anchorEl, onClose, updatePosition]);

  useEffect(() => { const id = window.setTimeout(updatePosition, 0); return () => window.clearTimeout(id); }, [separateInputs, combinedInput, newServerName, newServerUrl, newApiKey, updatePosition]);

  if (!style) return null;

  const addDisabled = separateInputs
    ? (!newServerName || !newServerUrl || !newApiKey)
    : (!combinedInput || !combinedInput.includes('tavilyApiKey='));

  return (
    <div ref={popRef} style={{ position: 'fixed', top: style.top, left: style.left, zIndex: 10000, width: 420, maxWidth: '95vw' }} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md shadow-lg">
      <div className="p-3 w-full max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-xs font-medium text-[var(--text-primary)]">Add MCP Server</h5>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-[var(--text-secondary)]">{separateInputs ? 'Separate' : 'Combined'}</span>
          <button
            onClick={() => setSeparateInputs(!separateInputs)}
            className={`p-1 rounded transition-colors ${separateInputs ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
            title="Toggle input method"
          >
            {separateInputs ? <Key className="h-3 w-3" /> : <LinkIcon className="h-3 w-3" />}
          </button>
        </div>
        {separateInputs ? (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Server name (e.g., Tavily Search)"
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
            />
            <input
              type="url"
              placeholder="MCP URL (e.g., https://mcp.tavily.com/mcp/)"
              value={newServerUrl}
              onChange={(e) => setNewServerUrl(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
            />
            <input
              type="password"
              placeholder="API Key (e.g., tvly-xxxxx)"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
            />
          </div>
        ) : (
          <input
            type="url"
            placeholder="Complete MCP URL with API key"
            value={combinedInput}
            onChange={(e) => setCombinedInput(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
          />
        )}
        <div className="flex gap-2 mt-3">
          <button
            onClick={onAdd}
            disabled={addDisabled}
            className="flex-1 flex items-center justify-center gap-2 px-2 py-1 text-xs bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Add Server
          </button>
          <button onClick={onClose} className="px-2 py-1 text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded hover:bg-[var(--bg-active)]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

type HistoryPopoverProps = {
  anchorEl: HTMLElement;
  userHistory: Array<any> | undefined;
  onClose: () => void;
};

function HistoryPopover({ anchorEl, userHistory, onClose }: HistoryPopoverProps) {
  const popRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    const rect = anchorEl.getBoundingClientRect();
    const pop = popRef.current;
    const margin = 8;
    const defaultWidth = 680;
    const width = pop?.offsetWidth || defaultWidth;
    const height = pop?.offsetHeight || 0;
    let left = rect.right + margin;
    if (left + width > window.innerWidth - margin) left = Math.max(margin, rect.left - width - margin);
    let top = rect.top;
    if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.bottom - height);
    setStyle({ top, left });
  }, [anchorEl]);

  useEffect(() => {
    updatePosition();
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!popRef.current) return;
      if (popRef.current.contains(target)) return;
      if (anchorEl.contains(target)) return;
      onClose();
    };
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    document.addEventListener('keydown', onEsc, true);
    document.addEventListener('mousedown', onClick, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize, true);
    return () => {
      document.removeEventListener('keydown', onEsc, true);
      document.removeEventListener('mousedown', onClick, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize, true);
    };
  }, [anchorEl, onClose, updatePosition]);

  useEffect(() => { const id = window.setTimeout(updatePosition, 0); return () => window.clearTimeout(id); }, [userHistory, updatePosition]);

  if (!style) return null;

  return (
    <div ref={popRef} style={{ position: 'fixed', top: style.top, left: style.left, zIndex: 10000, width: 680, maxWidth: '95vw', maxHeight: '85vh' }} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md shadow-lg">
      <div className="p-3 w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4 text-[var(--text-secondary)]" />
            <h3 className="text-sm font-medium text-[var(--text-primary)]">MCP Usage History</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="text-xs text-[var(--text-muted)] mb-2">Showing your most recent 20 MCP tool executions.</div>
        <ErrorBoundary>
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-[var(--border-color)]">
            {userHistory && userHistory.length > 0 ? (
              userHistory.map((h: any) => (
                <div key={h._id} className="py-2 px-1 flex items-start gap-2">
                  <div className="pt-0.5">{h.executionSuccess ? (<CheckCircle className="h-3.5 w-3.5 text-emerald-500" />) : (<AlertCircle className="h-3.5 w-3.5 text-red-500" />)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[var(--text-primary)] truncate max-w-[360px]">{h.naturalLanguageQuery}</span>
                      <span className="text-[var(--text-muted)]">•</span>
                      <span className="text-[var(--text-secondary)] font-mono text-[10px]">{String(h.toolId)}</span>
                    </div>
                    {h.resultPreview && (<div className="mt-1 text-[var(--text-secondary)] line-clamp-2 whitespace-pre-wrap">{h.resultPreview}</div>)}
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-[var(--text-muted)] text-[10px]"><Clock className="h-3 w-3" /> {new Date(h.createdAt).toLocaleString()}</div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-[var(--text-secondary)]">No usage recorded yet.</div>
            )}
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
type EditServerForm = {
  name: string;
  description: string;
  url: string;
  apiKey: string;
  isEnabled: boolean;
};

type EditServerPopoverProps = {
  anchorEl: HTMLElement;
  editForm: EditServerForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditServerForm>>;
  onClose: () => void;
  onSave: () => void;
};

function EditServerPopover({ anchorEl, editForm, setEditForm, onClose, onSave }: EditServerPopoverProps) {
  const popRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    const rect = anchorEl.getBoundingClientRect();
    const pop = popRef.current;
    const margin = 8;
    const defaultWidth = 420;
    const width = pop?.offsetWidth || defaultWidth;
    const height = pop?.offsetHeight || 0;

    let left = rect.right + margin;
    if (left + width > window.innerWidth - margin) {
      left = Math.max(margin, rect.left - width - margin);
    }
    let top = rect.top;
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, rect.bottom - height);
    }
    setStyle({ top, left });
  }, [anchorEl]);

  useEffect(() => {
    updatePosition();
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!popRef.current) return;
      if (popRef.current.contains(target)) return;
      if (anchorEl.contains(target)) return;
      onClose();
    };
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    document.addEventListener('keydown', onEsc, true);
    document.addEventListener('mousedown', onClick, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize, true);
    return () => {
      document.removeEventListener('keydown', onEsc, true);
      document.removeEventListener('mousedown', onClick, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize, true);
    };
  }, [anchorEl, onClose, updatePosition]);

  useEffect(() => { const id = window.setTimeout(updatePosition, 0); return () => window.clearTimeout(id); }, [editForm, updatePosition]);

  if (!style) return null;

  return (
    <div
      ref={popRef}
      style={{ position: 'fixed', top: style.top, left: style.left, zIndex: 10000, width: 420, maxWidth: '95vw' }}
      className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md shadow-lg"
    >
      <div className="p-3 w-full max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
            <Settings className="h-4 w-4 text-[var(--accent-primary)]" />
            Edit MCP Server
          </h3>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Server Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea
              rows={2}
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">MCP URL (optional)</label>
            <input
              type="url"
              value={editForm.url}
              onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://mcp.tavily.com/mcp/"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">API Key (optional)</label>
            <input
              type="password"
              value={editForm.apiKey}
              onChange={(e) => setEditForm((f) => ({ ...f, apiKey: e.target.value }))}
              placeholder="Leave blank to keep existing key"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="server-enabled"
              type="checkbox"
              checked={!!editForm.isEnabled}
              onChange={(e) => setEditForm((f) => ({ ...f, isEnabled: e.target.checked }))}
              className="rounded border-[var(--border-color)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
            />
            <label htmlFor="server-enabled" className="text-xs text-[var(--text-primary)]">Server enabled</label>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={() => { void onSave(); }} className="flex-1 px-3 py-2 text-sm bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-primary-hover)]">
            Save Changes
          </button>
          <button onClick={onClose} className="px-3 py-2 text-sm bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded hover:bg-[var(--bg-active)]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

type ExecuteToolPopoverProps = {
  anchorEl: HTMLElement;
  onClose: () => void;
  selectedToolName: string;
  selectedToolDescription: string;
  selectedModel: 'openai' | 'gemini';
  setSelectedModel: (m: 'openai' | 'gemini') => void;
  naturalLanguageQuery: string;
  setNaturalLanguageQuery: (s: string) => void;
  onExecute: () => void;
  isExecuting: boolean;
  executionResult: any;
  placeholderText: string;
  toolHistory?: Array<any>;
  onUpdateTool: (name: string, description: string) => Promise<void> | void;
};

function ExecuteToolPopover(props: ExecuteToolPopoverProps) {
  const {
    anchorEl,
    onClose,
    selectedToolName,
    selectedToolDescription,
    selectedModel,
    setSelectedModel,
    naturalLanguageQuery,
    setNaturalLanguageQuery,
    onExecute,
    isExecuting,
    executionResult,
    placeholderText,
    toolHistory = [],
    onUpdateTool,
  } = props;

  const popRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<{ top: number; left: number } | null>(null);
  const [editName, setEditName] = useState<string>(selectedToolName);
  const [editDescription, setEditDescription] = useState<string>(selectedToolDescription);

  useEffect(() => {
    setEditName(selectedToolName);
    setEditDescription(selectedToolDescription);
  }, [selectedToolName, selectedToolDescription]);

  const updatePosition = useCallback(() => {
    const rect = anchorEl.getBoundingClientRect();
    const pop = popRef.current;
    const margin = 8;
    const defaultWidth = 380;
    const width = pop?.offsetWidth || defaultWidth;
    const height = pop?.offsetHeight || 0;

    // Prefer showing to the right of the trigger; fall back to left if overflowing
    let left = rect.right + margin;
    if (left + width > window.innerWidth - margin) {
      left = Math.max(margin, rect.left - width - margin);
    }

    // Align vertically with the trigger; if overflow bottom, try placing above
    let top = rect.top;
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, rect.bottom - height);
    }

    setStyle({ top, left });
  }, [anchorEl]);

  useEffect(() => {
    updatePosition();
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!popRef.current) return;
      if (popRef.current.contains(target)) return;
      if (anchorEl.contains(target)) return;
      onClose();
    };
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();

    document.addEventListener('keydown', onEsc, true);
    document.addEventListener('mousedown', onClick, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize, true);
    return () => {
      document.removeEventListener('keydown', onEsc, true);
      document.removeEventListener('mousedown', onClick, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize, true);
    };
  }, [anchorEl, updatePosition, onClose]);

  useEffect(() => {
    // Recalculate position after content changes (e.g., when result appears)
    const id = window.setTimeout(updatePosition, 0);
    return () => window.clearTimeout(id);
  }, [executionResult, naturalLanguageQuery, updatePosition]);

  if (!style) return null;

  return (
    <div
      ref={popRef}
      style={{ position: 'fixed', top: style.top, left: style.left, zIndex: 10000, width: 380, maxWidth: '95vw' }}
      className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md shadow-lg"
    >
      <div className="p-3 w-full max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
            <Play className="h-4 w-4 text-[var(--accent-primary)]" />
            Execute: {selectedToolName}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Model Selection */}
        <div className="mb-2">
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">AI Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as 'openai' | 'gemini')}
            className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
          >
            <option value="openai">OpenAI (GPT-5)</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>

        {/* Natural Language Input */}
        <div className="mb-2">
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">What would you like to do?</label>
          <textarea
            value={naturalLanguageQuery}
            onChange={(e) => setNaturalLanguageQuery(e.target.value)}
            placeholder={placeholderText}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-none placeholder-[var(--text-muted)]"
          />
          {toolHistory && toolHistory.length > 0 && (
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              <div className="font-medium mb-1">Recent examples:</div>
              <ul className="space-y-0.5">
                {toolHistory.slice(0, 3).map((h) => (
                  <li key={h._id}>
                    <button
                      type="button"
                      onClick={() => {
                        setNaturalLanguageQuery(h.naturalLanguageQuery);
                        // Execute after state updates
                        window.setTimeout(() => onExecute(), 0);
                      }}
                      disabled={isExecuting}
                      className="w-full relative overflow-hidden pl-1.5 py-0.5 pr-1 rounded-sm border border-[var(--border-color)] bg-[var(--bg-secondary)] cursor-pointer hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
                      title={h.naturalLanguageQuery}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <Play className="inline-block h-3 w-3 text-[var(--text-secondary)]" />
                        <span className="truncate text-[var(--text-primary)] text-[11px] leading-4">{h.naturalLanguageQuery}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Inline Edit Tool */}
        <details className="mb-2">
          <summary className="text-xs text-[var(--text-secondary)] cursor-pointer select-none">Edit tool details</summary>
          <div className="mt-2 space-y-2">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Tool name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { void onUpdateTool(editName, editDescription); }}
                className="px-3 py-1.5 text-xs bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-primary-hover)]"
              >
                Save changes
              </button>
            </div>
          </div>
        </details>

        {/* Result Preview */}
        {executionResult && (
          <div className="p-2 bg-[var(--bg-secondary)] rounded border mb-2">
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">Result:</div>
            <div className="text-xs text-[var(--text-primary)] whitespace-pre-wrap max-h-48 overflow-y-auto">
              {typeof executionResult.result === 'string'
                ? executionResult.result
                : JSON.stringify(executionResult.result, null, 2)}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onExecute}
            disabled={!naturalLanguageQuery.trim() || isExecuting}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Executing...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" /> Execute with AI
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded hover:bg-[var(--bg-active)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function EnhancedMcpPanel({ onClose }: EnhancedMcpPanelProps) {
  // Helper function to get user-friendly display names for tools
  const getDisplayName = (toolName: string) => {
    const displayNames: Record<string, string> = {
      // Get rid of underline and upper case first letter
      [toolName]: toolName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    };
    return displayNames[toolName];
  };

  // State for new server creation
  // Add server popover
  const [addAnchorEl, setAddAnchorEl] = useState<HTMLElement | null>(null);
  const [newServerName, setNewServerName] = useState('');
  const [newServerUrl, setNewServerUrl] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  
  // Toggle for input method
  const [separateInputs, setSeparateInputs] = useState(false);
  const [combinedInput, setCombinedInput] = useState('https://mcp.tavily.com/mcp/?tavilyApiKey=');
  
  // State for expanded servers
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  
  // State for model selection
  const [selectedModel, setSelectedModel] = useState<'openai' | 'gemini'>('openai');
  
  // Tool invocation state - now AI-powered!
  const [selectedTool, setSelectedTool] = useState<{serverId: string, toolName: string} | null>(null);
  const [executeAnchorEl, setExecuteAnchorEl] = useState<HTMLElement | null>(null);
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  // Global history popover
  const [historyAnchorEl, setHistoryAnchorEl] = useState<HTMLElement | null>(null);
  
  // Dropdown menu state
  const [activeDropdown, setActiveDropdown] = useState<Id<"mcpServers"> | null>(null);
  
  // Server editing state
  const [editingServer, setEditingServer] = useState<Id<"mcpServers"> | null>(null);
  const [editAnchorEl, setEditAnchorEl] = useState<HTMLElement | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    url: '',
    apiKey: '',
    isEnabled: true
  });
  
  // Server deletion state
  const [deletingServer, setDeletingServer] = useState<Id<"mcpServers"> | null>(null);
  const [serverDeleteAnchorEl, setServerDeleteAnchorEl] = useState<HTMLElement | null>(null);
  
  // Tool management state (edit merged into execute popover)
  const [deletingTool, setDeletingTool] = useState<{serverId: string, toolId: string} | null>(null);
  const [toolDeleteAnchorEl, setToolDeleteAnchorEl] = useState<HTMLElement | null>(null);

  // Get all MCP servers and tools using Convex queries
  const servers = useQuery(api.mcp.listMcpServers, {}) || [];
  const tools = useQuery(api.mcp.getMcpTools, {}) || [];
  const userHistory = useQuery(api.mcp.listUserHistory, historyAnchorEl ? { limit: 20 } : 'skip');

  // MCP hook for operations
  const {
    invoking: _invoking,
    addServer: addMcpServer,
  } = useMcp();
  
  // Convex mutations for CRUD operations
  const updateMcpServer = useMutation(api.mcp.updateMcpServer);
  const deleteMcpServer = useMutation(api.mcp.deleteMcpServer);
  const updateMcpTool = useMutation(api.mcp.updateMcpTool);
  const deleteMcpTool = useMutation(api.mcp.deleteMcpTool);
  
  // AI-powered tool execution
  const executeToolWithAI = useAction(api.aiAgents.executeToolWithNaturalLanguage);

  // Find the actual tool object for the selected tool to get the correct _id
  const actualTool = selectedTool ? tools.find(tool => 
    tool.serverId === selectedTool.serverId && tool.name === selectedTool.toolName
  ) : null;
  // Per-tool usage history (last 5) for placeholder/examples
  const toolHistory = useQuery(
    api.mcp.listToolHistory,
    actualTool ? { toolId: actualTool._id, limit: 5 } : "skip"
  );

  // Recent examples from your own usage history (fallbacks if empty)
  const getToolPlaceholder = (toolName: string): string => {
    // Prefer most recent successful user examples
    if (toolHistory && (toolHistory as any[]).length > 0) {
      const lines = (toolHistory as any[])
        .filter((h: any) => h.executionSuccess && h.naturalLanguageQuery)
        .slice(0, 3)
        .map((h: any) => `- ${h.naturalLanguageQuery}`)
        .join('\n');
      if (lines) return `Recent examples from your usage:\n${lines}`;
    }
    
    // Fallback to static examples if no learning data available yet
    switch (toolName) {
      case 'tavily_search':
        return `For example:\n- Search for latest AI news\n- Find information about React frameworks\n- Look up NodeJS best practices`;
      case 'tavily_map':
        return `For example:\n- Map the structure of docs.convex.dev\n- Discover all pages on github.com/microsoft/vscode\n- Find the URL structure of a documentation site`;
      case 'tavily_extract':
        return `For example:\n- Extract content from https://example.com/article\n- Get the full text from a specific blog post\n- Read and summarize a documentation page`;
      case 'tavily_crawl':
        return `For example:\n- Crawl all pages from docs.react.dev\n- Explore multiple pages on a company website\n- Gather content from a blog's recent posts`;
      default:
        return `For example:\n- Search for latest AI news\n- Find information about React\n- Look up NodeJS tutorials`;
    }
  };

  const toggleServerExpansion = (serverId: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverId)) {
      newExpanded.delete(serverId);
    } else {
      newExpanded.add(serverId);
    }
    setExpandedServers(newExpanded);
  };

  const handleAddServer = async () => {
    try {
      let serverUrl = '';
      let serverName = '';
      
      if (separateInputs) {
        // Use separate inputs
        if (!newServerName || !newServerUrl || !newApiKey) {
          toast.error('Please fill in all fields');
          return;
        }
        serverUrl = `${newServerUrl}?tavilyApiKey=${newApiKey}`;
        serverName = newServerName;
      } else {
        // Use combined input
        if (!combinedInput || !combinedInput.includes('tavilyApiKey=')) {
          toast.error('Please provide a valid URL with API key');
          return;
        }
        serverUrl = combinedInput;
        serverName = new URL(combinedInput).hostname || 'Remote Server';
      }

      await addMcpServer(serverUrl, serverName);
      toast.success('MCP server added successfully');
      
      // Reset form
      setNewServerName('');
      setNewServerUrl('');
      setNewApiKey('');
      setCombinedInput('https://mcp.tavily.com/mcp/?tavilyApiKey=');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add server');
    }
  };

  const handleInvokeTool = async () => {
    if (!selectedTool || !naturalLanguageQuery.trim()) return;
    
    try {
      setIsExecuting(true);
      
      // Use AI agent to parse natural language and execute the tool with selected model
      const result = await executeToolWithAI({
        serverId: selectedTool.serverId,
        toolName: selectedTool.toolName,
        naturalLanguageQuery: naturalLanguageQuery.trim(),
        model: selectedModel,
      });
      
      setExecutionResult(result);
      setNaturalLanguageQuery('');
      toast.success('Tool executed successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Tool execution failed: ${errorMessage}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Inline update from the Execute popover
  const handleInlineUpdateTool = async (toolId: Id<'mcpTools'>, name: string, description: string) => {
    await updateMcpTool({ toolId, name, description });
    // If the tool name changed, update selectedTool reference for consistency
    if (selectedTool && selectedTool.toolName !== name) {
      setSelectedTool({ serverId: selectedTool.serverId, toolName: name });
    }
    toast.success('Tool updated');
  };

  const handleDeleteTool = async (toolId: string) => {
    if (!deletingTool) return;
    
    try {
      await deleteMcpTool({
        toolId: toolId as Id<"mcpTools">
      });
      
      setDeletingTool(null);
      toast.success('Tool deleted successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to delete tool: ${errorMessage}`);
    }
  };

  const getUniqueTools = (serverTools: any[]) => {
    const uniqueMap = new Map();
    serverTools.forEach(tool => {
      const key = `${tool.name}_${tool.serverId}`;
      if (!uniqueMap.has(key) || tool._creationTime > uniqueMap.get(key)._creationTime) {
        uniqueMap.set(key, tool);
      }
    });
    return Array.from(uniqueMap.values());
  };

  const handleEditServer = (server: any, anchorEl: HTMLElement) => {
    setActiveDropdown(null); // Close dropdown first
    setEditingServer(server._id);
    setEditAnchorEl(anchorEl);
    
    // Parse URL to separate base URL from API key
    let baseUrl = server.url || '';
    if (baseUrl.includes('?tavilyApiKey=')) {
      baseUrl = baseUrl.split('?tavilyApiKey=')[0];
    }
    
    setEditForm({
      name: server.name || '',
      description: server.description || '',
      url: baseUrl,
      apiKey: '', // Don't show existing API key for security
      isEnabled: server.isEnabled ?? true // Ensure boolean value, default to true
    });
  };

  const handleUpdateServer = async () => {
    if (!editingServer) return;

    try {
      const updates: any = {
        serverId: editingServer,
        name: editForm.name,
        description: editForm.description,
        isEnabled: editForm.isEnabled
      };

      // Only include URL/API key if they've been changed
      if (editForm.url) {
        if (editForm.apiKey) {
          updates.url = `${editForm.url}?tavilyApiKey=${editForm.apiKey}`;
        } else {
          updates.url = editForm.url;
        }
      }

      await updateMcpServer(updates);
      toast.success('Server updated successfully');
      setEditingServer(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update server');
    }
  };

  const handleDeleteServer = async (serverId: Id<"mcpServers">) => {
    try {
      await deleteMcpServer({ serverId });
      toast.success('Server deleted successfully');
      setDeletingServer(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete server');
    }
  };

  // Group tools by server
  const toolsByServer = tools.reduce((acc, tool) => {
    if (!acc[tool.serverId]) {
      acc[tool.serverId] = [];
    }
    acc[tool.serverId].push(tool);
    return acc;
  }, {} as Record<string, typeof tools>);

  return (
    <div className="mt-3 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-[var(--text-secondary)]" />
          <h4 className="text-sm font-medium text-[var(--text-primary)]">MCP Integration</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => setHistoryAnchorEl(e.currentTarget)}
            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
            title="Open MCP Usage History"
            aria-label="Open MCP Usage History"
          >
            <HistoryIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => setAddAnchorEl(e.currentTarget)}
            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
            title="Add MCP Server"
            aria-label="Add MCP Server"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="p-3 space-y-3">
      {/* Add Server Popover */}
      {addAnchorEl && createPortal(
        <AddServerPopover
          anchorEl={addAnchorEl}
          separateInputs={separateInputs}
          setSeparateInputs={setSeparateInputs}
          combinedInput={combinedInput}
          setCombinedInput={setCombinedInput}
          newServerName={newServerName}
          setNewServerName={setNewServerName}
          newServerUrl={newServerUrl}
          setNewServerUrl={setNewServerUrl}
          newApiKey={newApiKey}
          setNewApiKey={setNewApiKey}
          onAdd={() => { void handleAddServer(); setAddAnchorEl(null); }}
          onClose={() => setAddAnchorEl(null)}
        />,
        document.body
      )}
      
        {/* Servers List */}
        {servers.length === 0 ? (
          <div className="text-center py-6">
            <Server className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-xs text-[var(--text-secondary)]">No MCP servers configured</p>
            <p className="text-xs text-[var(--text-muted)]">Add a server to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {servers.map((server) => {
              const serverTools = toolsByServer[server._id] || [];
              const uniqueServerTools = getUniqueTools(serverTools); // Deduplicate tools
              const isExpanded = expandedServers.has(server._id);
              // No connection status in static mode - just show server as available
              const getStatusColor = () => {
                return 'bg-blue-500'; // Static servers are always "available" for tool calling
              };

              return (
                <div key={server._id} className="border border-[var(--border-color)] rounded">
                  {/* Server Header */}
                  <div 
                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-[var(--bg-hover)]"
                    onClick={() => toggleServerExpansion(server._id)}
                  >
                    <div className="flex items-center gap-2">
                      {uniqueServerTools.length > 0 ? (
                        isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-[var(--text-secondary)]" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-[var(--text-secondary)]" />
                        )
                      ) : (
                        <div className="w-3 h-3" />
                      )}
                      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} title="Available for tool calling" />
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        {server.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[var(--text-muted)]">
                        {uniqueServerTools.length} tools
                      </span>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(server._id === activeDropdown ? null : server._id);
                          }}
                          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-active)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
                        >
                          <Settings className="h-3 w-3" />
                        </button>
                        
                        {/* Settings Dropdown */}
                        {activeDropdown === server._id && (
                          <div className="absolute right-0 top-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded shadow-lg z-50 min-w-[120px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditServer(server, e.currentTarget);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                            >
                              <Settings className="h-3 w-3" />
                              Edit Server
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingServer(server._id);
                                setServerDeleteAnchorEl(e.currentTarget);
                                setActiveDropdown(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete Server
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Server Tools */}
                  {isExpanded && uniqueServerTools.length > 0 && (
                    <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
                      {uniqueServerTools.map((tool) => (
                        <div key={tool._id} className="p-3 border-b border-[var(--border-color)] last:border-b-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono font-medium text-[var(--text-primary)]">
                                  {getDisplayName(tool.name)}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      setSelectedTool({ serverId: server._id, toolName: tool.name });
                                      setExecuteAnchorEl(e.currentTarget);
                                    }}
                                    className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
                                    title="Execute tool"
                                    aria-label="Execute tool"
                                  >
                                    <Play className="h-3 w-3" />
                                  </button>
                                  {/* Edit moved into Execute popover */}
                                  <button
                                    onClick={(e) => { setDeletingTool({ serverId: server._id, toolId: tool._id }); setToolDeleteAnchorEl(e.currentTarget); }}
                                    className="p-1 rounded text-[var(--text-secondary)] hover:text-red-600 hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
                                    title="Delete tool"
                                    aria-label="Delete tool"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-secondary)] mb-2">
                                {tool.description || 'No description available'}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-2">
                                {(tool.usageCount || 0) > 0 && (
                                  <span>Used {tool.usageCount || 0} times</span>
                                )}
                                {tool.lastUsed && (
                                  <span>Last: {new Date(tool.lastUsed).toLocaleString()}</span>
                                )}
                              </div>
                              {/* Per-tool recent usage */}
                              <ErrorBoundary>
                                <ToolHistoryList
                                  toolId={tool._id as Id<'mcpTools'>}
                                  onSelectQuery={(query, anchorEl) => {
                                    setSelectedTool({ serverId: server._id, toolName: tool.name });
                                    setExecuteAnchorEl(anchorEl);
                                    setNaturalLanguageQuery(query);
                                  }}
                                />
                              </ErrorBoundary>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Server Popover */}
        {editingServer && editAnchorEl && createPortal(
          <EditServerPopover
            anchorEl={editAnchorEl}
            editForm={editForm}
            setEditForm={setEditForm}
            onClose={() => { setEditingServer(null); setEditAnchorEl(null); }}
            onSave={() => { void handleUpdateServer(); }}
          />,
          document.body
        )}
        
        {/* Delete Server Popover */}
        {deletingServer && serverDeleteAnchorEl && createPortal(
          <ConfirmPopover
            anchorEl={serverDeleteAnchorEl}
            title="Delete Server"
            message="Are you sure you want to delete this MCP server? This action cannot be undone and will remove all associated tools and connections."
            confirmLabel="Delete Server"
            onConfirm={() => { if (deletingServer) { void handleDeleteServer(deletingServer); } }}
            onClose={() => { setDeletingServer(null); setServerDeleteAnchorEl(null); }}
          />,
          document.body
        )}
        
        {/* Tool Edit Modal removed; editing is now inside Execute popover */}
        
        {/* Delete Tool Popover */}
        {deletingTool && toolDeleteAnchorEl && createPortal(
          <ConfirmPopover
            anchorEl={toolDeleteAnchorEl}
            title="Delete Tool"
            message="Are you sure you want to delete this MCP tool? This action cannot be undone and will remove the tool from your server configuration."
            confirmLabel="Delete Tool"
            onConfirm={() => { if (deletingTool) { void handleDeleteTool(deletingTool.toolId); } }}
            onClose={() => { setDeletingTool(null); setToolDeleteAnchorEl(null); }}
          />,
          document.body
        )}
        
        {/* Anchored Execute Tool Popover */}
        {selectedTool && executeAnchorEl && actualTool && createPortal(
          <ExecuteToolPopover
            anchorEl={executeAnchorEl}
            onClose={() => {
              setSelectedTool(null);
              setExecuteAnchorEl(null);
              setNaturalLanguageQuery('');
              setExecutionResult(null);
            }}
            selectedToolName={actualTool.name}
            selectedToolDescription={actualTool.description || ''}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            naturalLanguageQuery={naturalLanguageQuery}
            setNaturalLanguageQuery={setNaturalLanguageQuery}
            onExecute={() => { void handleInvokeTool(); }}
            isExecuting={isExecuting}
            executionResult={executionResult}
            placeholderText={getToolPlaceholder(selectedTool?.toolName || '')}
            toolHistory={Array.isArray(toolHistory) ? toolHistory : []}
            onUpdateTool={(name: string, description: string) => {
              void handleInlineUpdateTool(actualTool._id, name, description);
            }}
          />,
          document.body
        )}
      </div>
      {/* Global MCP Usage History Popover */}
      {historyAnchorEl && createPortal(
        <HistoryPopover
          anchorEl={historyAnchorEl}
          userHistory={userHistory as any[] | undefined}
          onClose={() => setHistoryAnchorEl(null)}
        />,
        document.body
      )}
    </div>
  );
}
class ErrorBoundary extends React.Component<{ fallback?: React.ReactNode; children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  override componentDidCatch(_error: any, _info: any) {
    // optional: log error
  }
  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="text-xs text-[var(--text-secondary)] p-2 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)]">
          History is unavailable. Make sure the backend is updated and running.
        </div>
      );
    }
    return this.props.children as any;
  }
}

function ToolHistoryList({ toolId, onSelectQuery }: { toolId: Id<'mcpTools'>; onSelectQuery?: (query: string, anchorEl: HTMLElement) => void }) {
  const history = useQuery(api.mcp.listToolHistory, toolId ? { toolId, limit: 5 } : 'skip') as any[] | undefined;
  if (!history || history.length === 0) return null;
  return (
    <div className="mt-2">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">Recent usage</div>
      <ul className="space-y-0.5">
        {history.map((h) => (
          <li key={h._id}>
            <button
              type="button"
              onClick={(e) => onSelectQuery?.(h.naturalLanguageQuery, e.currentTarget)}
              className="w-full relative overflow-hidden pl-1.5 py-0.5 pr-1 rounded-sm border border-[var(--border-color)] bg-[var(--bg-secondary)] cursor-pointer hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
              title={h.naturalLanguageQuery}
            >
              <div className="min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Play className="inline-block h-3 w-3 text-[var(--text-secondary)]" />
                  <span className="truncate text-[var(--text-primary)] text-[11px] leading-4">{h.naturalLanguageQuery}</span>
                  <span className="ml-auto inline-flex items-center gap-1 px-1 py-[1px] rounded-sm border border-[var(--border-color)] bg-[var(--bg-hover)] text-[9px] text-[var(--text-secondary)]">
                    <Clock className="h-3 w-3" />
                    {new Date(h.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
