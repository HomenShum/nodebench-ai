import React, { memo } from 'react';
import { X, Search, Bot } from 'lucide-react';
import { toast } from 'sonner';

export interface PanelOverlaysProps {
  // Keyboard Shortcuts
  showShortcutsOverlay: boolean;
  setShowShortcutsOverlay: (value: boolean) => void;

  // System Prompt
  showSystemPrompt: boolean;
  setShowSystemPrompt: (value: boolean) => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  saveSystemPrompt: () => void;
  activeThreadId: string | null;

  // Quick Replies
  showQuickReplies: boolean;
  setShowQuickReplies: (value: boolean) => void;
  quickReplies: string[];
  setQuickReplies: (value: string[]) => void;
  setInput: (value: string) => void;

  // Command Palette
  showCommandPalette: boolean;
  setShowCommandPalette: (value: boolean) => void;
  commandQuery: string;
  setCommandQuery: (value: string) => void;
  commandInputRef: React.RefObject<HTMLInputElement | null>;
  threads: any[];
  setActiveThreadId: (id: string | null) => void;
  setShowSearch: (value: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  setIsFocusMode: (value: (prev: boolean) => boolean) => void;
  setIsWideMode: (value: (prev: boolean) => boolean) => void;
  setShowTimeline: (value: boolean) => void;
  setShowContextPruning: (value: boolean) => void;
  setShowAnalytics: (value: boolean) => void;
  setShowBranchTree: (value: boolean) => void;
  setShowMemoryPanel: (value: boolean) => void;
  setShowImport: (value: boolean) => void;
  setHighContrast: (value: (prev: boolean) => boolean) => void;
  shareConversation: () => void;
  saveSnapshot: () => void;

  // Timeline
  showTimeline: boolean;
  setShowTimelineState: (value: boolean) => void;
  messagesToRender: any[] | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;

  // Context Pruning
  showContextPruning: boolean;
  setShowContextPruningState: (value: boolean) => void;
  contextLimit: number;
  selectedModel: string;
}

export const PanelOverlays = memo(function PanelOverlays(props: PanelOverlaysProps) {
  return (
    <>
      {/* Keyboard Shortcuts Overlay */}
      {props.showShortcutsOverlay && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => props.setShowShortcutsOverlay(false)} />
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <div className="pointer-events-auto bg-surface border border-edge rounded-lg shadow-2xl w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-content">Keyboard Shortcuts</h3>
                <button type="button" onClick={() => props.setShowShortcutsOverlay(false)} className="action-btn p-1 text-content-muted hover:text-content rounded-md hover:bg-surface-secondary" aria-label="Close keyboard shortcuts">
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="space-y-2.5 text-xs">
                {[
                  { keys: '/', desc: 'Focus message input' },
                  { keys: '?', desc: 'Toggle this overlay' },
                  { keys: 'Ctrl+F', desc: 'Search messages' },
                  { keys: 'Ctrl+K', desc: 'Command palette' },
                  { keys: 'Ctrl+T', desc: 'Conversation timeline' },
                  { keys: 'Ctrl+Shift+N', desc: 'New conversation' },
                  { keys: 'j', desc: 'Next message' },
                  { keys: 'k', desc: 'Previous message' },
                  { keys: 'Escape', desc: 'Close overlays / blur / close' },
                  { keys: 'Enter', desc: 'Send message' },
                  { keys: 'Shift+Enter', desc: 'New line in message' },
                ].map((s) => (
                  <div key={s.keys} className="flex items-center justify-between">
                    <span className="text-content-secondary">{s.desc}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.split('+').map((k) => (
                        <kbd key={k} className="px-1.5 py-0.5 bg-surface-secondary border border-edge rounded text-xs font-mono text-content-muted">{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-content-muted text-center">Press <kbd className="px-1 py-0.5 bg-surface-secondary border border-edge rounded text-xs font-mono">?</kbd> or <kbd className="px-1 py-0.5 bg-surface-secondary border border-edge rounded text-xs font-mono">Esc</kbd> to close</p>
            </div>
          </div>
        </>
      )}

      {/* System Prompt Editor Modal */}
      {props.showSystemPrompt && (
        <>
          <div className="absolute inset-0 bg-black/30 z-50" onClick={() => props.setShowSystemPrompt(false)} />
          <div className="absolute inset-x-4 top-20 z-50 bg-surface border border-edge rounded-lg shadow-2xl p-4 max-h-[300px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-content">Custom System Prompt</h3>
              <button type="button" onClick={() => props.setShowSystemPrompt(false)} className="p-1 text-content-muted hover:text-content rounded-md hover:bg-surface-secondary" aria-label="Close system prompt editor">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <textarea
              value={props.systemPrompt}
              onChange={(e) => props.setSystemPrompt(e.target.value)}
              placeholder="Enter a custom system prompt for this thread (e.g., 'You are a financial analyst specializing in tech stocks...')"
              aria-label="Custom system prompt"
              className="flex-1 bg-surface-secondary border border-edge rounded-lg p-3 text-xs text-content placeholder:text-content-muted resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={5}
            />
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => { props.setSystemPrompt(''); if (props.activeThreadId) localStorage.removeItem(`fa_sysprompt_${props.activeThreadId}`); toast.success('System prompt cleared'); }}
                className="text-xs text-red-500 hover:text-red-600 px-2 py-1"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={props.saveSystemPrompt}
                className="text-xs px-4 py-1.5 rounded-lg bg-content text-surface hover:opacity-80 font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}

      {/* Quick Reply Templates */}
      {props.showQuickReplies && (
        <>
          <div className="absolute inset-0 z-40" onClick={() => props.setShowQuickReplies(false)} />
          <div className="absolute bottom-24 left-3 right-3 z-50 bg-surface border border-edge rounded-lg shadow-2xl p-3">
            <div className="text-xs font-medium text-content-secondary mb-2">Quick Replies</div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {props.quickReplies.map((reply, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { props.setInput(reply); props.setShowQuickReplies(false); }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-surface-secondary text-content transition-colors truncate"
                >
                  {reply}
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-edge">
              <input
                type="text"
                placeholder="Add a new template..."
                aria-label="Add quick reply template"
                className="w-full text-xs bg-surface-secondary border border-edge rounded-lg px-3 py-1.5 text-content placeholder:text-content-muted focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                    const val = (e.target as HTMLInputElement).value.trim();
                    const updated = [...props.quickReplies, val];
                    props.setQuickReplies(updated);
                    localStorage.setItem('fa_quick_replies', JSON.stringify(updated));
                    (e.target as HTMLInputElement).value = '';
                    toast.success('Template added');
                  }
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Command Palette (Ctrl+K) */}
      {props.showCommandPalette && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => props.setShowCommandPalette(false)} />
          <div className="absolute inset-x-4 top-16 z-50 bg-surface border border-edge rounded-lg shadow-2xl overflow-hidden max-h-[400px] flex flex-col">
            <div
              data-nb-composer="agent-overlay-search"
              className="nb-composer-surface flex items-center gap-2 px-4 py-3 border-b border-edge transition-colors"
            >
              <Search className="w-4 h-4 text-content-muted" aria-hidden="true" />
              <input
                ref={props.commandInputRef}
                type="text"
                value={props.commandQuery}
                onChange={(e) => props.setCommandQuery(e.target.value)}
                placeholder="Search commands, threads, actions..."
                aria-label="Search commands"
                className="flex-1 bg-transparent text-sm text-content placeholder:text-content-muted focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { props.setShowCommandPalette(false); props.setCommandQuery(''); }
                }}
              />
              <kbd className="px-1.5 py-0.5 bg-surface-secondary border border-edge rounded text-xs font-mono text-content-muted">Esc</kbd>
            </div>
            <div className="overflow-y-auto p-2 space-y-0.5">
              {[
                { label: 'New Thread', shortcut: 'Ctrl+Shift+N', action: () => { props.setActiveThreadId(null); props.setInput(''); } },
                { label: 'Search Messages', shortcut: 'Ctrl+F', action: () => { props.setShowSearch(true); setTimeout(() => props.searchInputRef.current?.focus(), 50); } },
                { label: 'Focus Mode', shortcut: '', action: () => props.setIsFocusMode(prev => !prev) },
                { label: 'Wide Mode', shortcut: '', action: () => props.setIsWideMode(prev => !prev) },
                { label: 'System Prompt', shortcut: '', action: () => props.setShowSystemPrompt(true) },
                { label: 'Quick Replies', shortcut: '', action: () => props.setShowQuickReplies(true) },
                { label: 'Keyboard Shortcuts', shortcut: '?', action: () => props.setShowShortcutsOverlay(true) },
                { label: 'Conversation Timeline', shortcut: 'Ctrl+T', action: () => props.setShowTimeline(true) },
                { label: 'Context Window Usage', shortcut: '', action: () => props.setShowContextPruning(true) },
                { label: '\u{1F4CA} Analytics Dashboard', shortcut: '', action: () => props.setShowAnalytics(true) },
                { label: '\u{1F333} Thread Branches', shortcut: '', action: () => props.setShowBranchTree(true) },
                { label: '\u{1F517} Share Conversation', shortcut: '', action: () => props.shareConversation() },
                { label: '\u2699\uFE0F System Prompt', shortcut: '', action: () => props.setShowSystemPrompt(true) },
                { label: '\u{1F9E0} Memory Panel', shortcut: '', action: () => props.setShowMemoryPanel(true) },
                { label: '\u{1F4E5} Import Conversation', shortcut: '', action: () => props.setShowImport(true) },
                { label: '\u{1F4F8} Save Snapshot', shortcut: '', action: () => props.saveSnapshot() },
                { label: '\u{1F506} High Contrast Mode', shortcut: '', action: () => props.setHighContrast(p => !p) },
                ...(props.threads || []).slice(0, 5).map(t => ({ label: `Thread: ${t.title || 'New Chat'}`, shortcut: '', action: () => props.setActiveThreadId(t._id) })),
              ].filter(cmd => !props.commandQuery || cmd.label.toLowerCase().includes(props.commandQuery.toLowerCase())).map((cmd, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { cmd.action(); props.setShowCommandPalette(false); props.setCommandQuery(''); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-surface-secondary text-left transition-colors"
                >
                  <span className="text-content">{cmd.label}</span>
                  {cmd.shortcut && (
                    <kbd className="px-1.5 py-0.5 bg-surface-secondary border border-edge rounded text-xs font-mono text-content-muted">{cmd.shortcut}</kbd>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Conversation Timeline Overlay */}
      {props.showTimeline && props.messagesToRender && props.messagesToRender.length > 0 && (
        <>
          <div className="absolute inset-0 z-40" onClick={() => props.setShowTimelineState(false)} />
          <div className="absolute inset-x-3 top-14 bottom-14 z-50 bg-surface border border-edge rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge">
              <span className="text-xs font-semibold text-content">Conversation Timeline</span>
              <button type="button" onClick={() => props.setShowTimelineState(false)} className="text-content-muted hover:text-content text-sm">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="relative border-l-2 border-edge ml-3 space-y-0">
                {props.messagesToRender.map((msg: any, idx: number) => {
                  const isUser = msg.role === 'user';
                  const text = (msg.text || msg.content || '').slice(0, 80);
                  const charLen = (msg.text || msg.content || '').length;
                  const tokEst = Math.ceil(charLen / 4);
                  return (
                    <div
                      key={idx}
                      className="relative pl-6 py-1.5 group hover:bg-surface-secondary rounded-r-lg transition-colors cursor-pointer"
                      onClick={() => {
                        const msgEls = props.scrollContainerRef.current?.querySelectorAll('.msg-entrance');
                        if (msgEls && msgEls[idx]) {
                          msgEls[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
                          (msgEls[idx] as HTMLElement).style.outline = '2px solid var(--accent-primary, #3b82f6)';
                          (msgEls[idx] as HTMLElement).style.outlineOffset = '4px';
                          (msgEls[idx] as HTMLElement).style.borderRadius = '12px';
                          setTimeout(() => { (msgEls[idx] as HTMLElement).style.outline = 'none'; }, 2000);
                        }
                        props.setShowTimelineState(false);
                      }}
                      title="Click to scroll to this message"
                    >
                      <div className={`absolute left-[-5px] top-3 w-2.5 h-2.5 rounded-full border-2 border-surface ${isUser ? 'bg-indigo-600' : 'bg-green-500'}`} />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-surface-secondary text-content-muted">{isUser ? 'You' : 'AI'}</span>
                        <span className="text-xs tabular-nums text-content-muted">~{tokEst} tok</span>
                      </div>
                      <p className="text-xs text-content-secondary mt-0.5 truncate">{text || '(empty)'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-4 py-2 border-t border-edge text-xs text-content-muted flex items-center justify-between">
              <span>{props.messagesToRender.length} messages</span>
              <span>~{Math.ceil(props.messagesToRender.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0) / 4).toLocaleString()} tokens total</span>
            </div>
          </div>
        </>
      )}

      {/* Context Pruning UI */}
      {props.showContextPruning && props.messagesToRender && props.messagesToRender.length > 0 && (
        <>
          <div className="absolute inset-0 z-40" onClick={() => props.setShowContextPruningState(false)} />
          <div className="absolute inset-x-3 bottom-12 z-50 bg-surface border border-edge rounded-lg shadow-2xl overflow-hidden max-h-[320px] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge">
              <span className="text-xs font-semibold text-content">Context Window</span>
              <button type="button" onClick={() => props.setShowContextPruningState(false)} className="text-content-muted hover:text-content text-sm">&times;</button>
            </div>
            <div className="px-4 py-2 border-b border-edge">
              {(() => {
                const totalChars = props.messagesToRender!.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0);
                const tokUsed = Math.ceil(totalChars / 4);
                const pct = Math.min((tokUsed / props.contextLimit) * 100, 100);
                return (
                  <div>
                    <div className="flex items-center justify-between text-xs text-content-muted mb-1">
                      <span>{tokUsed.toLocaleString()} tokens used</span>
                      <span>{(props.contextLimit / 1000).toFixed(0)}K limit ({props.selectedModel})</span>
                    </div>
                    <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22c55e' }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)]">
              {props.messagesToRender!.map((msg: any, idx: number) => {
                const isUser = msg.role === 'user';
                const charLen = (msg.text || msg.content || '').length;
                const tokEst = Math.ceil(charLen / 4);
                const pctOfTotal = props.messagesToRender!.length > 0
                  ? ((tokEst / Math.max(1, Math.ceil(props.messagesToRender!.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0) / 4))) * 100)
                  : 0;
                return (
                  <div key={idx} className="flex items-center gap-2 px-4 py-1.5 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isUser ? 'bg-indigo-600' : 'bg-green-500'}`} />
                    <span className="font-medium text-content-secondary w-6">{isUser ? 'You' : 'AI'}</span>
                    <span className="flex-1 truncate text-content-muted">{(msg.text || msg.content || '').slice(0, 60)}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-[30px] h-[3px] bg-[var(--border-color)] rounded-full overflow-hidden">
                        <div className="h-full bg-content-muted rounded-full" style={{ width: `${Math.min(pctOfTotal * 2, 100)}%` }} />
                      </div>
                      <span className="tabular-nums text-content-muted">{tokEst}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
});
