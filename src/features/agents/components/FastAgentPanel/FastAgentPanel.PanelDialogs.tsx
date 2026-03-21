import React, { memo } from 'react';
import { Download, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import type { ExtractedMedia } from './utils/mediaExtractor';
import type { DocumentAction } from './DocumentActionCard';

export interface PanelDialogsProps {
  // Artifacts
  showArtifacts: boolean;
  setShowArtifacts: (value: boolean) => void;
  artifactContent: { type: string; content: string; language?: string } | null;

  // Drag and drop
  isDragOver: boolean;
  setIsDragOver: (value: boolean) => void;
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;

  // Analytics
  showAnalytics: boolean;
  setShowAnalytics: (value: boolean) => void;
  messagesToRender: any[] | null;
  selectedModel: string;
  contextLimit: number;
  contextWindowMsgs: { inContext: number; total: number };

  // Branch Tree
  showBranchTree: boolean;
  setShowBranchTree: (value: boolean) => void;
  threads: any[];
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;

  // Context Menu
  contextMenu: { x: number; y: number; msgId: string; role: string } | null;
  setContextMenu: (value: any) => void;
  togglePinMsg: (id: string) => void;
  toggleBookmark: (id: string) => void;
  addMemory: (text: string) => void;
  handleDeleteMessage: (id: any) => void;
  setReplyToMsgId: (value: string | null) => void;

  // Memory Panel
  showMemoryPanel: boolean;
  setShowMemoryPanel: (value: boolean) => void;
  memories: { id: string; text: string; createdAt: number }[];
  removeMemory: (id: string) => void;

  // Import Dialog
  showImport: boolean;
  setShowImport: (value: boolean) => void;

  // Resize Handle
  variant: 'overlay' | 'sidebar';

  // Settings
  showSettings: boolean;
}

export const PanelDialogs = memo(function PanelDialogs(props: PanelDialogsProps) {
  return (
    <>
      {/* Artifacts/Canvas Panel */}
      {props.showArtifacts && props.artifactContent && (
        <>
          <div className="absolute inset-0 z-40 bg-surface-secondary" onClick={() => props.setShowArtifacts(false)} />
          <div className="absolute inset-y-2 right-2 w-[45%] min-w-[300px] z-50 bg-surface border border-edge rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge glass-header">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-content">
                  {props.artifactContent.type === 'html' ? '\u{1F310} HTML Preview' : props.artifactContent.type === 'svg' ? '\u{1F3A8} SVG Preview' : `\u{1F4C4} ${props.artifactContent.language || 'Code'}`}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-surface-secondary text-content-muted">
                  {props.artifactContent.content.length} chars
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(props.artifactContent!.content); toast.success('Copied'); }}
                  className="text-xs px-2 py-1 rounded-md hover:bg-surface-secondary text-content-muted"
                >
                  Copy
                </button>
                <button type="button" onClick={() => props.setShowArtifacts(false)} className="text-content-muted hover:text-content text-sm px-1">&times;</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {props.artifactContent.type === 'html' || props.artifactContent.type === 'svg' ? (
                <iframe
                  srcDoc={props.artifactContent.type === 'svg'
                    ? `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9fafb">${props.artifactContent.content}</body></html>`
                    : props.artifactContent.content}
                  className="w-full h-full border-none bg-surface"
                  sandbox="allow-scripts"
                  title="Artifact Preview"
                />
              ) : (
                <pre className="text-xs font-mono p-4 overflow-auto text-content-secondary whitespace-pre-wrap leading-relaxed">
                  {props.artifactContent.content}
                </pre>
              )}
            </div>
          </div>
        </>
      )}

      {/* Drag-and-Drop File Upload Overlay */}
      {props.isDragOver && (
        <div
          className="absolute inset-0 z-[60] bg-violet-500/10 border-2 border-dashed border-violet-500 rounded-lg flex items-center justify-center backdrop-blur-sm"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragLeave={() => props.setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            props.setIsDragOver(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              props.setAttachedFiles(prev => [...prev, ...files]);
              toast.success(`${files.length} file(s) attached`);
            }
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Download className="w-6 h-6 text-violet-600" />
            </div>
            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">Drop files here</span>
            <span className="text-xs text-violet-500">Images, PDFs, documents</span>
          </div>
        </div>
      )}

      {/* Conversation Analytics Dashboard */}
      {props.showAnalytics && props.messagesToRender && props.messagesToRender.length > 0 && (
        <>
          <div className="absolute inset-0 z-40" onClick={() => props.setShowAnalytics(false)} />
          <div className="absolute inset-x-3 top-14 bottom-14 z-50 bg-surface border border-edge rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge">
              <span className="text-xs font-semibold text-content">{'\u{1F4CA}'} Conversation Analytics</span>
              <button type="button" onClick={() => props.setShowAnalytics(false)} className="text-content-muted hover:text-content text-sm">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(() => {
                const userMsgs = props.messagesToRender!.filter((m: any) => m.role === 'user');
                const aiMsgs = props.messagesToRender!.filter((m: any) => m.role === 'assistant');
                const totalChars = props.messagesToRender!.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0);
                const totalTokens = Math.ceil(totalChars / 4);
                const avgUserLen = userMsgs.length > 0 ? Math.ceil(userMsgs.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0) / userMsgs.length) : 0;
                const avgAiLen = aiMsgs.length > 0 ? Math.ceil(aiMsgs.reduce((s: number, m: any) => s + (m.text || m.content || '').length, 0) / aiMsgs.length) : 0;
                const costEstimate = (totalTokens / 1000000 * 3).toFixed(4);
                return (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Messages', value: props.messagesToRender!.length, sub: `${userMsgs.length} you / ${aiMsgs.length} AI` },
                        { label: 'Tokens', value: totalTokens.toLocaleString(), sub: `~$${costEstimate} est.` },
                        { label: 'Model', value: props.selectedModel.split('/').pop() || props.selectedModel, sub: `${(props.contextLimit / 1000).toFixed(0)}K ctx` },
                      ].map((stat, i) => (
                        <div key={i} className="bg-surface-secondary rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-content">{stat.value}</div>
                          <div className="text-xs text-content-muted">{stat.label}</div>
                          <div className="text-xs text-content-muted mt-0.5">{stat.sub}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-content-secondary mb-2">Token Distribution</div>
                      <div className="flex items-end gap-1 h-[80px]">
                        {props.messagesToRender!.map((msg: any, idx: number) => {
                          const len = Math.ceil((msg.text || msg.content || '').length / 4);
                          const maxLen = Math.max(...props.messagesToRender!.map((m: any) => Math.ceil((m.text || m.content || '').length / 4)));
                          const height = Math.max(4, (len / Math.max(1, maxLen)) * 100);
                          return (
                            <div
                              key={idx}
                              className="flex-1 rounded-t-sm transition-all"
                              style={{ height: `${height}%`, background: msg.role === 'user' ? '#3b82f6' : '#22c55e', opacity: 0.7 }}
                              title={`${msg.role === 'user' ? 'You' : 'AI'}: ~${len} tokens`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[8px] text-content-muted mt-1">
                        <span>Start</span>
                        <span>Latest</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-content-secondary mb-2">Average Length</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-8 text-content-muted">You</span>
                          <div className="flex-1 h-2 bg-surface-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min((avgUserLen / Math.max(avgUserLen, avgAiLen, 1)) * 100, 100)}%` }} />
                          </div>
                          <span className="text-xs text-content-muted tabular-nums w-12 text-right">{avgUserLen} ch</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-8 text-content-muted">AI</span>
                          <div className="flex-1 h-2 bg-surface-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min((avgAiLen / Math.max(avgUserLen, avgAiLen, 1)) * 100, 100)}%` }} />
                          </div>
                          <span className="text-xs text-content-muted tabular-nums w-12 text-right">{avgAiLen} ch</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-content-muted">
                      Context: {props.contextWindowMsgs.inContext}/{props.contextWindowMsgs.total} messages in window
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* Thread Branch Tree */}
      {props.showBranchTree && props.threads && props.threads.length > 0 && (
        <>
          <div className="absolute inset-0 z-40" onClick={() => props.setShowBranchTree(false)} />
          <div className="absolute inset-x-3 top-14 bottom-14 z-50 bg-surface border border-edge rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge">
              <span className="text-xs font-semibold text-content">{'\u{1F333}'} Thread Branches</span>
              <button type="button" onClick={() => props.setShowBranchTree(false)} className="text-content-muted hover:text-content text-sm">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="relative border-l-2 border-edge ml-4 space-y-0">
                {props.threads.slice(0, 20).map((thread: any, idx: number) => {
                  const isActive = thread._id === props.activeThreadId;
                  return (
                    <div
                      key={thread._id || idx}
                      className={`relative pl-6 py-2 cursor-pointer rounded-r-lg transition-colors ${isActive ? 'bg-indigo-600/10' : 'hover:bg-surface-secondary'}`}
                      onClick={() => { props.setActiveThreadId(thread._id); props.setShowBranchTree(false); }}
                    >
                      <div className={`absolute left-[-5px] top-4 w-2.5 h-2.5 rounded-full border-2 border-surface ${isActive ? 'bg-indigo-600' : 'bg-content-muted'}`} />
                      <div className="text-xs font-medium text-content truncate">{thread.title || 'Untitled'}</div>
                      <div className="text-xs text-content-muted">
                        {(thread as any).messageCount || '?'} msgs {'\u00B7'} {new Date(thread._creationTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Right-Click Context Menu */}
      {props.contextMenu && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => props.setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); props.setContextMenu(null); }} />
          <div
            className="fixed z-[80] bg-surface border border-edge rounded-lg shadow-2xl py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
            style={{ left: props.contextMenu.x, top: props.contextMenu.y }}
          >
            {[
              { label: '\u{1F4CB} Copy text', action: () => { const m = props.messagesToRender?.find((m: any) => (m._id || m.id || m.key) === props.contextMenu!.msgId); if (m) navigator.clipboard.writeText((m as any).text || (m as any).content || ''); toast.success('Copied'); } },
              { label: '\u21A9\uFE0F Reply', action: () => props.setReplyToMsgId(props.contextMenu!.msgId) },
              { label: '\u{1F9E0} Remember this', action: () => { const m = props.messagesToRender?.find((m: any) => (m._id || m.id || m.key) === props.contextMenu!.msgId); if (m) props.addMemory(((m as any).text || (m as any).content || '').slice(0, 200)); } },
              { label: '\u{1F4CC} Pin', action: () => props.togglePinMsg(props.contextMenu!.msgId) },
              { label: '\u{1F516} Bookmark', action: () => props.toggleBookmark(props.contextMenu!.msgId) },
              ...(props.contextMenu.role === 'user' ? [{ label: '\u270F\uFE0F Edit', action: () => { /* editing handled in bubble */ } }] : []),
              { label: '\u{1F5D1}\uFE0F Delete', action: () => props.handleDeleteMessage(props.contextMenu!.msgId as any) },
            ].map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { item.action(); props.setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-xs text-content-secondary hover:bg-surface-secondary hover:text-content transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Memory Panel */}
      {props.showMemoryPanel && (
        <>
          <div className="absolute inset-0 z-40" onClick={() => props.setShowMemoryPanel(false)} />
          <div className="absolute inset-x-3 top-14 bottom-14 z-50 bg-surface border border-edge rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge">
              <span className="text-xs font-semibold text-content">{'\u{1F9E0}'} Memory ({props.memories.length})</span>
              <button type="button" onClick={() => props.setShowMemoryPanel(false)} className="text-content-muted hover:text-content text-sm">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {props.memories.length === 0 && (
                <div className="text-center py-8 text-content-muted text-xs">
                  <p>No memories saved yet.</p>
                  <p className="mt-1 text-xs">Right-click a message and select "Remember this"</p>
                </div>
              )}
              {props.memories.map(mem => (
                <div key={mem.id} className="flex items-start gap-2 p-2 rounded-lg bg-surface-secondary border border-edge">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-content-secondary">{mem.text}</p>
                    <span className="text-xs text-content-muted">{new Date(mem.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <button type="button" onClick={() => props.removeMemory(mem.id)} className="text-content-muted hover:text-red-500 text-xs flex-shrink-0">&times;</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Conversation Import Dialog */}
      {props.showImport && (
        <>
          <div className="absolute inset-0 z-40" onClick={() => props.setShowImport(false)} />
          <div className="absolute inset-x-3 top-1/4 z-50 bg-surface border border-edge rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge">
              <span className="text-xs font-semibold text-content">{'\u{1F4E5}'} Import Conversation</span>
              <button type="button" onClick={() => props.setShowImport(false)} className="text-content-muted hover:text-content text-sm">&times;</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-content-muted">Paste a ChatGPT or Claude conversation export (JSON format)</p>
              <textarea
                className="w-full h-[120px] p-2 text-xs font-mono bg-surface-secondary border border-edge rounded-lg text-content resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder='{"messages": [{"role": "user", "content": "..."}, ...]}'
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => props.setShowImport(false)} className="text-xs px-3 py-1.5 rounded-lg bg-surface-secondary text-content-muted">Cancel</button>
                <button type="button" onClick={() => { toast.info('Paste a valid JSON conversation export and try again'); props.setShowImport(false); }} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white">Import</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Drag-to-resize handle (left edge) */}
      {props.variant !== 'sidebar' && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-600/30 transition-colors z-50 group"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const panel = (e.target as HTMLElement).closest('.fast-agent-panel') as HTMLElement;
            if (!panel) return;
            const startWidth = panel.offsetWidth;
            const onMove = (ev: MouseEvent) => {
              const delta = startX - ev.clientX;
              const newWidth = Math.max(400, Math.min(1200, startWidth + delta));
              panel.style.width = `${newWidth}px`;
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3 text-content-muted" />
          </div>
        </div>
      )}
    </>
  );
});
