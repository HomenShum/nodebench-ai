import React from "react";
import { useBlockNoteSyncSafe } from "../lib/useBlockNoteSyncSafe";
import { BlockNoteView } from "@blocknote/mantine";
import { useQuery, useAction } from "convex/react";
import { useConvex } from "convex/react";
import { useEffect, useState, useMemo, useCallback, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";
import { Id } from "../../convex/_generated/dataModel";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import Mention from "@tiptap/extension-mention";
import {
  Bot,
  Loader2,
  Sparkles,
  X,
  PenSquare,
  ListTodo,
  BrainCircuit,
  AlertTriangle,
  RefreshCw,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { TextSelection } from "prosemirror-state";
import type { Transaction } from "prosemirror-state";
import type { Node as PMNode } from "prosemirror-model";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor-blocks.css";
import { NodeHoverTracker } from "./NodeHoverTracker";
import { MentionHoverPreview } from "./MentionHoverPreview";
import { TagHoverPreview } from "./TagHoverPreview";
import { useContextPills } from "../hooks/contextPills";

interface EditorProps {
  documentId: Id<"documents">;
  isGridMode?: boolean;
  isFullscreen?: boolean;
}


// Disable programmatic mount-time mutations to avoid step storms.
const DISABLE_PROGRAMMATIC_MOUNT_MUTATIONS = true;

// Error boundary to catch unexpected runtime errors in the Editor tree
class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry?: () => void },
  { hasError: boolean; error?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("[EditorErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md mx-4 text-center">
            <div className="flex items-center gap-3 justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Editor Error</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              The editor encountered a problem and couldn’t render. You can try again or refresh the page.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm hover:shadow"
              >
                Refresh Page
              </button>
              {this.props.onRetry && (
                <button
                  onClick={() => this.props.onRetry?.()}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 shadow-sm hover:shadow"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Recursively unwraps nested doc/blockGroup wrapper nodes from the markdown parser
 * to extract the actual content blocks that BlockNote can use
 */
const unwrapBlocks = (blocks: PartialBlock[]): PartialBlock[] => {
  const result: PartialBlock[] = [];

  for (const block of blocks) {
    // Check if this is a wrapper node that needs unwrapping
    if (block && typeof block === 'object' && 'type' in block) {
      const blockAny: any = block;
      const blockType = blockAny.type;
      const blockContent = blockAny.content;

      // If it's a wrapper node (doc or blockGroup) with content array, unwrap it
      if ((blockType === 'doc' || blockType === 'blockGroup') && Array.isArray(blockContent)) {
        // Recursively unwrap the content
        result.push(...unwrapBlocks(blockContent));
      } else {
        // It's a regular block, add it to results
        result.push(block);
      }
    } else {
      // Not a block object, add as-is
      result.push(block);
    }
  }

  return result;
};

// Central helper: safely read a BlockNote block's Convex node id
// Many block shapes exist (union types, external libs). Access via this helper
// to avoid repetitive any-casts at call sites.
const getBlockNodeId = (b: unknown): Id<'nodes'> | null => {
  try {
    const id = (b as any)?.props?.nodeId;
    return (id ?? null) as Id<'nodes'> | null;
  } catch {
    return null;
  }
};

// Normalization helpers to ensure any loaded content is valid BlockNote blocks.
// Guards against top-level "text" nodes and wrapper nodes like "doc"/"blockGroup".
const BN_BLOCK_TYPES = new Set<string>([
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "codeBlock",
  "image",
  "horizontalRule",
  "table",
  "tableRow",
  "tableCell",
  "toggle",
  "callout",
  "file",
]);

const BN_INLINE_BLOCK_TYPES = new Set<string>([
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "callout",
  "toggle",
]);

const bnToParagraph = (children: any[] = []) => ({ type: "paragraph", content: children });

const bnNormalizeInline = (node: any): any => {
  if (typeof node === "string") return { type: "text", text: node };
  if (!node || typeof node !== "object") return null;
  if (node.type === "text" && typeof node.text === "string") return node;
  if (typeof node.text === "string") {
    return { type: "text", text: node.text };
  }
  try {
    return { type: "text", text: JSON.stringify(node) };
  } catch {
    return { type: "text", text: String(node) };
  }
};

const bnEnsureTopLevelBlock = (maybeBlock: any): any => {
  if (!maybeBlock || typeof maybeBlock !== "object") {
    return bnToParagraph([]);
  }
  // Unwrap wrapper nodes by delegating to caller to flatten
  if ((maybeBlock.type === "doc" || maybeBlock.type === "blockGroup") && Array.isArray(maybeBlock.content)) {
    return { _flattenFromDoc: true, content: maybeBlock.content };
  }
  if (Array.isArray(maybeBlock)) {
    const inlines = maybeBlock.map(bnNormalizeInline).filter(Boolean);
    return bnToParagraph(inlines);
  }
  const type = maybeBlock.type;
  if (typeof type !== "string" || type === "text" || !BN_BLOCK_TYPES.has(type)) {
    const child = bnNormalizeInline(maybeBlock);
    const inlines = child ? [child] : [];
    return bnToParagraph(inlines);
  }
  if (BN_INLINE_BLOCK_TYPES.has(type)) {
    const rawContent = Array.isArray(maybeBlock.content)
      ? maybeBlock.content
      : maybeBlock.content
      ? [maybeBlock.content]
      : [];
    const content = rawContent.map(bnNormalizeInline).filter(Boolean);
    return { ...maybeBlock, content };
  }
  return { ...maybeBlock };
};

// Accepts any JSON-like input and produces a safe BlockNote doc graph
const normalizeDocGraphFromAny = (input: any): { type: "doc"; content: any[] } => {
  const content: any[] = [];
  const pushNormalized = (b: any) => {
    if (!b) return;
    if (b._flattenFromDoc && Array.isArray(b.content)) {
      for (const child of b.content) {
        pushNormalized(bnEnsureTopLevelBlock(child));
      }
      return;
    }
    if (b.type && b.type !== "blockGroup") {
      content.push(b);
    }
  };

  if (input && typeof input === "object" && !Array.isArray(input) && input.type === "doc" && Array.isArray(input.content)) {
    for (const c of input.content) pushNormalized(bnEnsureTopLevelBlock(c));
  } else if (Array.isArray(input)) {
    pushNormalized(bnEnsureTopLevelBlock(input));
  } else if (input) {
    pushNormalized(bnEnsureTopLevelBlock(input));
  }

  return { type: "doc", content };
};

// Compute a stable, lightweight signature for a BlockNote-style doc graph.
// Used to cheaply detect meaningful structural/text changes before replacing content.
const computeDocSignature = (input: any): string => {
  try {
    const normalized = normalizeDocGraphFromAny(input);
    const parts: string[] = [];

    const visit = (node: any) => {
      if (!node || typeof node !== "object") return;
      const type = typeof node.type === "string" ? node.type : "";
      parts.push(type);
      if (typeof node.text === "string") {
        parts.push("|t:");
        parts.push(node.text);
      }
      const content = node.content;
      if (Array.isArray(content)) {
        for (const child of content) {
          if (!child) continue;
          if (typeof child === "string") {
            parts.push("|s:");
            parts.push(child);
          } else if (typeof child === "object") {
            if (child.type === "text" && typeof child.text === "string") {
              parts.push("|t:");
              parts.push(child.text);
            } else {
              visit(child);
            }
          }
        }
      }
    };

    visit(normalized);

    // djb2 hash over the collected parts for a deterministic short signature
    let hash = 5381 >>> 0;
    for (let i = 0; i < parts.length; i++) {
      const str = parts[i];
      for (let j = 0; j < str.length; j++) {
        hash = (((hash << 5) + hash) ^ str.charCodeAt(j)) >>> 0; // variant to reduce collisions
      }
    }
    // Include part count to differentiate small permutations
    return hash.toString(36) + ":" + parts.length.toString(36);
  } catch {
    // Fallback to a trivial signature if anything goes wrong
    try {
      const json = JSON.stringify(input)?.slice(0, 2048) ?? "";
      let h = 0 >>> 0;
      for (let i = 0; i < json.length; i++) {
        h = (((h << 5) + h) ^ json.charCodeAt(i)) >>> 0;
      }
      return h.toString(36);
    } catch {
      return "0";
    }
  }
};

export function Editor({ documentId, isGridMode = false, isFullscreen = false }: EditorProps) {
  const convex = useConvex();
  const document = useQuery(api.documents.getById, { documentId });
  const nodes = useQuery(api.nodes.by_document, { docId: documentId });

  // Track active pointer so we don't destroy/reload mid-gesture (ProseMirror race guard)
  const pointerDownRef = useRef(false);
  useEffect(() => {
    const onDown = () => (pointerDownRef.current = true);
    const onUp = () => (pointerDownRef.current = false);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp, true);
    };
  }, []);

  const waitForPointerUp = useCallback(() => {
    if (!pointerDownRef.current) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => {
        window.removeEventListener("pointerup", done, true);
        resolve();
      };
      window.addEventListener("pointerup", done, true);
    });
  }, []);

  // Use this whenever you destroy/reload the EditorView
  const _destroyViewSafely = useCallback(async (view: any | null) => {
    if (!view) return;
    if (pointerDownRef.current) {
      // Block the one stale ProseMirror mouseup that targets the dead view
      const blockOnce = (e: Event) => {
        try { (e as any).stopImmediatePropagation?.(); } catch { /* noop */ }
        window.removeEventListener("mouseup", blockOnce, true);
      };
      window.addEventListener("mouseup", blockOnce, true);
      await waitForPointerUp();
      // Let PM’s internal handlers unwind before destroy
      await new Promise((r) => setTimeout(r, 0));
    }
    try { view.destroy?.(); } catch { /* noop */ }
  }, [waitForPointerUp]);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const updateNode = useMutation(api.nodes.update);
  const addNode = useMutation(api.nodes.add);
  const removeNode = useMutation(api.nodes.remove);
  const updateOrders = useMutation(api.nodes.updateOrders);
  const generateAIResponse = useAction(api.ai.generateResponse);
  const updateDocument = useMutation(api.documents.update);
  const { setFocused } = useContextPills();

  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // NEW: Enhanced error tracking and recovery
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  // Guard against concurrent snapshot attempts across rapid clicks/renders
  const recoveringRef = useRef<boolean>(false);

  // NEW: AI change proposal state (preview before applying)
  type AIToolAction = {
    type: 'createDocument' | 'updateDocument' | 'archiveDocument' | 'findDocuments' | 'createNode' | 'updateNode' | 'archiveNode';
    documentId?: Id<'documents'>;
    title?: string;
    content?: unknown; // avoid `any` to keep discriminated union sound
    nodeId?: Id<'nodes'>;
    markdown?: string;
    select?: boolean;
    parentId?: Id<'nodes'> | null;
  };
  type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
  interface DocumentStats {
    currentVersion: number | null;
    latestSnapshotVersion?: number | null;
    lastSnapshotAt: number | null;
    stepsSinceLastSnapshot: number;
    contentSize?: number;
    snapshotCount?: number;
    riskLevel: RiskLevel;
  }
  interface PendingProposal {
    message: string;
    actions: AIToolAction[];
    summary: Array<{ kind: string; details: string; snippet?: string }>; // lightweight preview list
    anchorBlockId: string | null;
  }
  const [pendingProposal, setPendingProposal] = useState<PendingProposal | null>(null);
  // Removed bottom overlay controls; details/selection UI now lives inline per block

  // NEW: Monitoring queries
  const forceSnapshot = useMutation(api.prosemirror.forceSnapshot);
  const getDocumentStats = useQuery(api.prosemirror.getDocumentStats, { documentId });
  // Client-side snapshot thresholds and guards (env-configurable with sensible defaults)
  const CLIENT_SNAPSHOT_STEP_THRESHOLD = parseInt(
    (import.meta as any)?.env?.VITE_EDITOR_SNAPSHOT_STEP_THRESHOLD ?? "",
    10,
  ) || 25;
  const CLIENT_SNAPSHOT_TIME_THRESHOLD_MS = parseInt(
    (import.meta as any)?.env?.VITE_EDITOR_SNAPSHOT_TIME_THRESHOLD_MS ?? "",
    10,
  ) || 60_000; // 1 minute
  const WARN_THROTTLE_MS = parseInt(
    (import.meta as any)?.env?.VITE_EDITOR_WARN_THROTTLE_MS ?? "",
    10,
  ) || 30_000;
  const AUTO_TRIGGER_COOLDOWN_MS = parseInt(
    (import.meta as any)?.env?.VITE_EDITOR_AUTO_TRIGGER_COOLDOWN_MS ?? "",
    10,
  ) || 45_000;
  const warnAtRef = useRef<Record<string, number>>({});
  const lastAutoTriggerAtRef = useRef<number>(0);

  // Detect current theme from DOM document root
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return typeof window !== 'undefined'
      ? window.document.documentElement.classList.contains('dark')
      : false;
  });

  // Listen for theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setIsDarkMode(window.document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(window.document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Batch low-level ProseMirror patches into a single non-historical transaction.
  // NOTE: Currently not used by applyActions. To enable, convert higher-level
  // BlockNote operations into Patch[] with absolute positions.
  type Patch =
    | { kind: "replace"; from: number; to: number; node?: PMNode; text?: string }
    | { kind: "insertAt"; pos: number; node: PMNode }
    | { kind: "delete"; from: number; to: number }
    | { kind: "cursor"; pos: number };

  // DEPRECATED/UNUSED: prefer historical edits. Only caret moves should be non-historical.
  // Kept for reference; do not use for applying AI actions.
  const _applyActionsNonHistorical = (ed: any, patches: Patch[]) => {
    try {
      const view = ed?.view;
      if (!view || !patches || patches.length === 0) return;
      const tr: Transaction = view.state.tr;
      try { tr.setMeta("addToHistory", false); } catch { /* noop */ }
      for (const p of patches) {
        switch (p.kind) {
          case "replace": {
            const content = p.node ?? view.state.schema.text(p.text ?? "");
            try { tr.replaceWith(p.from, p.to, content); } catch { /* noop */ }
            break;
          }
          case "insertAt": {
            try { tr.insert(p.pos, p.node); } catch { /* noop */ }
            break;
          }
          case "delete": {
            try { tr.delete(p.from, p.to); } catch { /* noop */ }
            break;
          }
          case "cursor": {
            try { tr.setSelection(TextSelection.create(tr.doc, p.pos)); } catch { /* noop */ }
            break;
          }
        }
      }
      view.dispatch(tr);
    } catch { /* noop */ }
  };

  const parserEditor = useMemo(() => BlockNoteEditor.create(), []);

  // Helper to force programmatic mutations to be non-historical (re-entrant & async-safe)
  // Non-historical helpers (type-safe, no ts-ignore)
  const _nhNesting = useRef(new WeakMap<any, number>()).current;
  const _nhRestore = useRef(new WeakMap<any, () => void>()).current;

  const _beginNonHistorical = useCallback((view: { dispatch: (tr: any) => void }) => {
    const count = _nhNesting.get(view) ?? 0;
    if (count === 0) {
      const orig = view.dispatch.bind(view);
      view.dispatch = (tr: any) => {
        try { tr?.setMeta?.("addToHistory", false); } catch { /* noop */ }
        return orig(tr);
      };
      _nhRestore.set(view, () => { view.dispatch = orig; });
    }
    _nhNesting.set(view, count + 1);
  }, [_nhNesting, _nhRestore]);

  const _endNonHistorical = useCallback((view: { dispatch: (tr: any) => void }) => {
    const count = _nhNesting.get(view) ?? 0;
    if (count <= 1) {
      _nhRestore.get(view)?.();
      _nhRestore.delete(view);
      _nhNesting.delete(view);
    } else {
      _nhNesting.set(view, count - 1);
    }
  }, [_nhNesting, _nhRestore]);

  // 1) Non-async variant
  const runNonHistorical = useCallback((ed: any, fn: () => void) => {
    const view = ed?.view as { dispatch?: (tr: any) => void } | undefined;
    if (!view?.dispatch) return fn();
    const v = view as { dispatch: (tr: any) => void };
    _beginNonHistorical(v);
    try { fn(); } finally { _endNonHistorical(v); }
  }, [_beginNonHistorical, _endNonHistorical]);

  // 2) Async-safe variant
  const _runNonHistoricalAsync = useCallback(async (ed: any, fn: () => Promise<void> | void) => {
    const view = ed?.view as { dispatch?: (tr: any) => void } | undefined;
    if (!view?.dispatch) return await fn();
    const v = view as { dispatch: (tr: any) => void };
    _beginNonHistorical(v);
    try { await fn(); } finally { _endNonHistorical(v); }
  }, [_beginNonHistorical, _endNonHistorical]);

  // (moved) Dev dispatch logger — see effect below after `sync` is initialized

  // Mention extension: fetch document titles for @-mentions and insert inline mention tokens
  const mentionExtension = useMemo(() => {
    // Minimal in-DOM renderer without external deps
    const createRenderer = () => {
      let el: HTMLDivElement | null = null;
      let items: Array<{ label: string; id?: string; name?: string; kind?: string }> = [];
      let selectedIndex = 0;

      const updateList = (props: any) => {
        if (!el) return;
        items = props.items ?? [];
        selectedIndex = Math.min(selectedIndex, Math.max(0, items.length - 1));
        el.innerHTML = '';
        const ul = window.document.createElement('ul');
        ul.className = 'mention-suggestions-list';
        items.forEach((item, idx) => {
          const li = window.document.createElement('li');
          li.className = `mention-suggestion-item ${idx === selectedIndex ? 'active' : ''}`;
          li.textContent = item.label;
          li.onclick = () => props.command(item);
          ul.appendChild(li);
        });
        el.appendChild(ul);
        // position near cursor
        const rect = props.clientRect?.();
        if (rect) {
          el.style.position = 'absolute';
          el.style.left = `${Math.round(rect.left + window.scrollX)}px`;
          el.style.top = `${Math.round(rect.bottom + window.scrollY)}px`;
        }
      };

      return {
        onStart: (props: any) => {
          el = window.document.createElement('div');
          el.className = 'mention-suggestions';
          window.document.body.appendChild(el);
          updateList(props);
        },
        onUpdate: (props: any) => updateList(props),
        onKeyDown: (props: any) => {
          if (!items || items.length === 0) return false;
          if (props.event.key === 'ArrowDown') {
            selectedIndex = (selectedIndex + 1) % items.length;
            updateList(props);
            return true;
          }
          if (props.event.key === 'ArrowUp') {
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            updateList(props);
            return true;
          }
          if (props.event.key === 'Enter') {
            props.command(items[selectedIndex]);
            return true;
          }
          return false;
        },
        onExit: () => {
          if (el && el.parentNode) el.parentNode.removeChild(el);
          el = null;
          items = [];
          selectedIndex = 0;
        },
      };
    };

    // Extend Mention to emit data-document-id for hover detection
    const MentionWithId = Mention.extend({
      addAttributes() {
        return {
          id: {
            default: null,
            renderHTML: attributes => ({ 'data-document-id': attributes.id }),
            parseHTML: (element) => element.getAttribute('data-document-id'),
          },
          label: {
            default: null,
          },
        };
      },
    });

    return MentionWithId.configure({
      HTMLAttributes: { class: 'mention' },
      suggestion: {
        char: '@',
        startOfLine: false,
        items: async ({ query }: { query: string }) => {
          try {
            const trimmed = (query ?? '').trim();
            if (trimmed.length < 1) {
              const recent = await convex.query(api.documents.getRecentForMentions, { limit: 8 });
              return (recent || []).map((d: any) => ({ id: d._id, label: d.title || 'Untitled' }));
            }
            const results = await convex.query(api.documents.getSearch, { query: trimmed });
            // Map to id/label payload; label is shown in UI and inserted as text content
            return (results || []).map((d: any) => ({ id: d._id, label: d.title || 'Untitled' }));
          } catch {
            return [];
          }
        },
        // Ensure programmatic insertion is non-historical
        command: ({ editor, range, props }: any) => {
          const id = props?.id ?? props?.documentId;
          const label = props?.label ?? props?.title ?? '';
          runNonHistorical(editor, () => {
            editor
              .chain()
              .focus()
              .insertContentAt(range, {
                type: 'mention',
                attrs: { id, label },
              })
              .run();
          });
        },
        // Pass the factory function; Tiptap calls suggestion.render() internally
        render: createRenderer,
      },
    });
  }, [convex, runNonHistorical]);

  // Hashtag extension: suggest tags for #mentions and link tag to the current document
  const hashtagExtension = useMemo(() => {
    // Minimal in-DOM renderer with icons and "new" badge
    const createRenderer = () => {
      let el: HTMLDivElement | null = null;
      let items: Array<{ label: string; name?: string; kind?: string; isNew?: boolean }> = [];

      const iconForKind = (kind?: string) => {
        const k = (kind || '').toLowerCase();
        if (k === 'keyword') return '🏷️';
        if (k === 'entity') return '🏢';
        if (k === 'topic') return '📚';
        if (k === 'community') return '👥';
        if (k === 'relationship') return '🔗';
        return '➕';
      };

      const updateList = (props: any) => {
        if (!el) return;
        items = props.items ?? [];
        const selectedIndex = 0;
        el.innerHTML = '';
        const ul = window.document.createElement('ul');
        ul.className = 'mention-suggestions-list';
        items.forEach((item, idx) => {
          const li = window.document.createElement('li');
          li.className = `mention-suggestion-item ${idx === selectedIndex ? 'active' : ''}`;

          // Row container
          const row = window.document.createElement('div');
          row.className = 'tag-suggestion-row';

          // Icon
          const icon = window.document.createElement('span');
          icon.className = `tag-kind-icon ${item.kind ? `kind-${item.kind}` : 'kind-new'}`;
          icon.textContent = iconForKind(item.kind);
          row.appendChild(icon);

          // Main label and badges
          const main = window.document.createElement('div');
          main.className = 'tag-suggestion-main';
          const label = window.document.createElement('span');
          label.className = 'tag-suggestion-label';
          label.textContent = `#${item.label}`;
          main.appendChild(label);

          if (item.isNew) {
            const badge = window.document.createElement('span');
            badge.className = 'badge-new';
            badge.textContent = 'New';
            main.appendChild(badge);
          }

          row.appendChild(main);

          // Kind pill (when available)
          if (item.kind) {
            const pill = window.document.createElement('span');
            pill.className = `tag-kind-pill kind-${item.kind}`;
            pill.textContent = item.kind;
            row.appendChild(pill);
          }

          li.appendChild(row);
          li.onclick = () => props.command(item);
          ul.appendChild(li);
        });
        el.appendChild(ul);
        const rect = props.clientRect?.();
        if (rect) {
          el.style.position = 'absolute';
          el.style.left = `${Math.round(rect.left + window.scrollX)}px`;
          el.style.top = `${Math.round(rect.bottom + window.scrollY)}px`;
        }
      };

      return {
        onStart: (props: any) => {
          el = window.document.createElement('div');
          el.className = 'mention-suggestions';
          window.document.body.appendChild(el);
          updateList(props);
        },
        onUpdate: (props: any) => updateList(props),
        onKeyDown: (props: any) => {
          if (!items || items.length === 0) return false;
          if (props.event.key === 'Enter') {
            props.command(items[0]);
            return true;
          }
          return false;
        },
        onExit: () => {
          if (el && el.parentNode) el.parentNode.removeChild(el);
          el = null;
          items = [];
        },
      };
    };

    const Hashtag = Mention.extend({
      name: 'hashtag',
      addAttributes() {
        return {
          name: {
            default: null,
            renderHTML: (attributes) => ({ 'data-tag-name': attributes.name }),
            parseHTML: (element) => element.getAttribute('data-tag-name'),
          },
          kind: {
            default: null,
            renderHTML: (attributes) => (attributes.kind ? { 'data-tag-kind': attributes.kind } : {}),
            parseHTML: (element) => element.getAttribute('data-tag-kind'),
          },
        };
      },
    });

    return Hashtag.configure({
      HTMLAttributes: { class: 'mention hashtag' },
      renderLabel: ({ node }: any) => {
        const nm = node?.attrs?.name || node?.attrs?.label || '';
        return `#${nm}`;
      },
      suggestion: {
        char: '#',
        startOfLine: false,
        items: async ({ query }: { query: string }) => {
          const trimmed = (query ?? '').replace(/^#/, '').trim();
          try {
            const results = await convex.query(api.tags.search, {
              query: trimmed,
              kinds: ['keyword', 'entity', 'topic', 'community', 'relationship'],
              limit: 8,
            });
            const mapped = (results || []).map((t: any) => ({ name: t.name, kind: t.kind, label: t.name, isNew: false }));
            // If no exact match and user typed something, offer creation of a new tag
            if (trimmed && !mapped.some((m: any) => (m.name || '').toLowerCase() === trimmed.toLowerCase())) {
              mapped.unshift({ name: trimmed, kind: undefined, label: trimmed, isNew: true });
            }
            return mapped;
          } catch {
            // Still allow creating a tag with typed text if backend search fails
            return trimmed ? [{ name: trimmed, kind: undefined, label: trimmed, isNew: true }] : [];
          }
        },
        command: ({ editor, range, props }: any) => {
          const name = String(props?.name || props?.label || '').trim();
          const kind = props?.kind as string | undefined;
          if (!name) return;
          try {
            runNonHistorical(editor, () => {
              editor
                .chain()
                .focus()
                .insertContentAt(range, [
                  { type: 'hashtag', attrs: { name, kind } },
                  { type: 'text', text: ' ' },
                ])
                .run();
            });
          } catch { /* noop */ }
          // Fire-and-forget: link tag to this document
          try {
            void convex.mutation(api.tags.addTagsToDocument, {
              documentId,
              tags: [{ name, kind }],
            });
          } catch {/* noop */}
        },
        render: createRenderer,
      },
    });
  }, [convex, documentId, runNonHistorical]);

  // NEW: Prefetch a server snapshot and reboot from it by seeding the local cache used by useInitialState
  const prefetchSnapshotAndReload = useCallback(
    async (targetVersion?: number) => {
      try {
        // Guard against invalid/empty document IDs to avoid server-side decode errors
        if (typeof documentId !== 'string' || documentId.length === 0) {
          console.warn('[Editor] Invalid documentId for prefetchSnapshotAndReload', { documentId });
          setSyncError('RECOVERY_FAILED');
          return;
        }
        const args: any = targetVersion
          ? { id: documentId as any, version: targetVersion }
          : { id: documentId as any };
        const snap = await convex.query(api.prosemirror.getSnapshot as any, args);
        if (snap && snap.content) {
          try {
            const contentObj = JSON.parse(snap.content);
            sessionStorage.setItem(
              `convex-sync-${documentId}`,
              JSON.stringify({ content: contentObj, version: snap.version ?? (targetVersion ?? 1), steps: [] })
            );
          } catch {
            // ignore cache failures, still try reload
          }
          // Safe reload: avoid PM mouseup race by waiting for pointer-up
          if (pointerDownRef.current) {
            // Block one stale mouseup that may target the soon-to-be destroyed view
            const blockOnce = (e: Event) => {
              try { (e as any).stopImmediatePropagation?.(); } catch { /* noop */ }
              window.removeEventListener("mouseup", blockOnce, true);
            };
            window.addEventListener("mouseup", blockOnce, true);
            await waitForPointerUp();
            await new Promise((r) => setTimeout(r, 0));
          }
          // Reload so collab plugin re-initializes from the cached snapshot version
          window.location.reload();
          return;
        }
        // If no snapshot content returned, surface recovery UI
        setSyncError('RECOVERY_FAILED');
      } catch (e) {
        console.error("[Editor] prefetchSnapshotAndReload failed", e);
        setSyncError('RECOVERY_FAILED');
      }
    },
    [convex, documentId, waitForPointerUp]
  );

  const editorExtensions = useMemo(() => ([
    mentionExtension as any,
    hashtagExtension as any,
  ]), [mentionExtension, hashtagExtension]);

  const editorOptions = useMemo(() => ({
    _tiptapOptions: {
      extensions: editorExtensions,
    },
  }), [editorExtensions]);

  // Basic sync configuration with Tiptap mention extension
  // Pass explicit Convex refs (avoid passing the whole namespace blindly)
  const pmRefs = useMemo(() => ({
    getSnapshot: api.prosemirror.getSnapshot,
    latestVersion: api.prosemirror.latestVersion,
    getSteps: api.prosemirror.getSteps,
    submitSteps: api.prosemirror.submitSteps,
    submitSnapshot: api.prosemirror.submitSnapshot,
  }), []);

  // Optional: quick runtime sanity check to fail fast with a helpful error
  useEffect(() => {
    const missing: string[] = [];
    const required = [
      "getSnapshot",
      "latestVersion",
      "getSteps",
      "submitSteps",
      "submitSnapshot",
    ] as const;
    for (const k of required) {
      if (!(pmRefs as any)[k]) missing.push(k as string);
    }
    if (missing.length) {
      console.error("[prosemirror] Missing function references:", missing);
      throw new Error(
        `[prosemirror] Missing function reference(s): ${missing.join(", ")}. Did you run "npx convex codegen"?`
      );
    }
  }, [pmRefs]);

  const sync = useBlockNoteSyncSafe(pmRefs as any, documentId, {
    editorOptions,
    snapshotDebounceMs: 2000,
    onSyncError: (error: Error) => {
      const msg = String(error?.message ?? error);
      // Large delta fallback: fetch snapshot and reboot editor from it
      if (msg.startsWith("SNAPSHOT_AVAILABLE:")) {
        const verStr = msg.split(":")[1];
        const ver = verStr ? parseInt(verStr, 10) : undefined;
        setSyncError('SNAPSHOT_REQUIRED');
        void prefetchSnapshotAndReload(ver).catch(() => {
          setSyncError('RECOVERY_FAILED');
        });
        return;
      }
      if (msg.includes("TOO_MANY_STEPS_NEED_SNAPSHOT")) {
        setSyncError('SNAPSHOT_REQUIRED');
        void prefetchSnapshotAndReload(undefined).catch(() => {
          setSyncError('RECOVERY_FAILED');
        });
        return;
      }
      if (msg.includes("Unauthorized") || msg.includes("Not authenticated")) {
        setSyncError('ACCESS_DENIED');
        return;
      }
      if (msg.includes("Document not found")) {
        setSyncError('DOCUMENT_NOT_FOUND');
        return;
      }
      setSyncError(`SYNC_ERROR: ${msg}`);
    },
  });

  // TEMP DEBUG: Count Convex queries/mutations/actions to detect idle polling/heartbeats
  useEffect(() => {
    if (!sync.editor) return;
    const convexClient: any = convex as any;
    if (!convexClient) return;

    // NEW: Gate sync debug instrumentation behind an env flag to avoid prod noise
    const DEBUG_SYNC = String((import.meta as any)?.env?.VITE_DEBUG_SYNC ?? "").toLowerCase();
    if (DEBUG_SYNC === "" || DEBUG_SYNC === "0" || DEBUG_SYNC === "false") {
      return;
    }

    let queryCount = 0;
    let mutationCount = 0;
    let actionCount = 0;
    // NEW: Focused counters for Convex sync queries
    let getStepsCount = 0;
    let latestVersionCount = 0;
    const interval = window.setInterval(() => {
      try {
        // eslint-disable-next-line no-console
        console.log(`[Editor ${documentId}] Convex (5s):`, {
          queries: queryCount,
          mutations: mutationCount,
          actions: actionCount,
          // NEW: Include focused sync counts
          sync: {
            getSteps: getStepsCount,
            latestVersion: latestVersionCount,
          },
        });
      } catch {}
      queryCount = 0;
      mutationCount = 0;
      actionCount = 0;
      // NEW: reset focused counters
      getStepsCount = 0;
      latestVersionCount = 0;
    }, 5000);

    const originalQuery = typeof convexClient.query === 'function' ? convexClient.query : undefined;
    const originalMutation = typeof convexClient.mutation === 'function' ? convexClient.mutation : undefined;
    const originalAction = typeof convexClient.action === 'function' ? convexClient.action : undefined;

    if (originalQuery) {
      convexClient.query = (...args: any[]) => {
        queryCount++;
        // NEW: increment focused counters when these specific FunctionReferences are called
        try {
          const fnRef = args?.[0];
          if (fnRef === (pmRefs as any).getSteps) {
            getStepsCount++;
          } else if (fnRef === (pmRefs as any).latestVersion) {
            latestVersionCount++;
          }
        } catch {}
        return originalQuery.apply(convexClient, args);
      };
    }
    if (originalMutation) {
      convexClient.mutation = (...args: any[]) => {
        mutationCount++;
        return originalMutation.apply(convexClient, args);
      };
    }
    if (originalAction) {
      convexClient.action = (...args: any[]) => {
        actionCount++;
        return originalAction.apply(convexClient, args);
      };
    }

    return () => {
      window.clearInterval(interval);
      if (originalQuery) convexClient.query = originalQuery;
      if (originalMutation) convexClient.mutation = originalMutation;
      if (originalAction) convexClient.action = originalAction;
    };
  }, [sync.editor, documentId, convex, pmRefs]);

  // (Removed) Always-on dispatch logger replaced with opt-in localStorage-gated logger above.

  // Title sync guards and debounce timer
  const titleSyncRef = useRef<{ updatingFromBlock: boolean; updatingFromTitle: boolean }>({
    updatingFromBlock: false,
    updatingFromTitle: false,
  });
  const titleDebounceRef = useRef<number | null>(null);
  // Cache for computeDocSignature to avoid redundant work on identical objects
  const lastSigRef = useRef<{ doc: any; sig: string } | null>(null);
  const sigOf = useCallback((doc: any): string => {
    if (lastSigRef.current && lastSigRef.current.doc === doc) return lastSigRef.current.sig;
    const sig = computeDocSignature(doc);
    lastSigRef.current = { doc, sig };
    return sig;
  }, []);

  // Dev-only logger toggle state (hot-toggleable via storage event)
  const [debugDispatchEnabled, setDebugDispatchEnabled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const read = () => setDebugDispatchEnabled(window.localStorage?.getItem('nodebench.debugDispatch') === '1');
    read();
    const onStorage = (e: StorageEvent) => { if (e.key === 'nodebench.debugDispatch') read(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // dev-only marker to satisfy strict no-unused-vars in some configs
  useEffect(() => {
    if (debugDispatchEnabled) { /* debug dispatch logger enabled */ }
  }, [debugDispatchEnabled]);

  const buildBlocksFromNodes = useCallback(() => {
    if (!nodes) return null;
    const ordered = [...nodes].sort((a, b) => a.order - b.order);

    const ensureBlock = (maybeBlock: any): any => {
      if (!maybeBlock || typeof maybeBlock !== "object") {
        // Preserve legacy string payloads as paragraph text
        if (typeof maybeBlock === "string") {
          const inline = bnNormalizeInline(maybeBlock);
          const arr: any[] = [];
          if (inline) arr.push(inline);
          return bnToParagraph(arr);
        }
        return bnToParagraph([]);
      }

      // Flatten nested doc objects
      if (maybeBlock.type === "doc" && Array.isArray(maybeBlock.content)) {
        // Caller will handle flattening arrays; return a marker object here
        return { _flattenFromDoc: true, content: maybeBlock.content };
      }

      // If this looks like an array of nodes, treat them as children of a paragraph
      if (Array.isArray(maybeBlock)) {
        const inlines = maybeBlock.map(bnNormalizeInline).filter(Boolean);
        return bnToParagraph(inlines);
      }

      // If it's an inline or unknown type, wrap in paragraph
      const type = maybeBlock.type;
      if (typeof type !== "string" || type === "text" || !BN_BLOCK_TYPES.has(type)) {
        const child = bnNormalizeInline(maybeBlock);
        const inlines = child ? [child] : [];
        return bnToParagraph(inlines);
      }

      // Only normalize inline content for text-carrying blocks
      if (BN_INLINE_BLOCK_TYPES.has(type)) {
        const rawContent = Array.isArray(maybeBlock.content)
          ? maybeBlock.content
          : maybeBlock.content
          ? [maybeBlock.content]
          : [];
        const content = rawContent.map(bnNormalizeInline).filter(Boolean);
        return { ...maybeBlock, content };
      }
      // For list/table-like blocks, return as-is to preserve nested structure
      return { ...maybeBlock };
    };

    const content: any[] = [];
    for (const n of ordered) {
      // json can be stored as a string; parse when needed
      const nn: any = n;
      let raw: any = nn.json ?? { type: nn.type, content: [] };
      if (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch { /* leave as-is to avoid crashing */ }
      }

      // Convert raw into a list of top-level blocks
      let blocks: any[] = [];
      if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.type === "doc" && Array.isArray(raw.content)) {
        blocks = raw.content.map(ensureBlock);
      } else if (Array.isArray(raw)) {
        blocks = [ensureBlock(raw)];
      } else {
        blocks = [ensureBlock(raw)];
      }

      for (const b of blocks) {
        if (b && b._flattenFromDoc && Array.isArray(b.content)) {
          // If ensureBlock returned a doc-flatten marker, expand it now
          for (const child of b.content) {
            const nb = ensureBlock(child);
            if (nb && nb.type && nb.type !== "blockGroup") {
              content.push({ ...nb, props: { ...(nb.props || {}), nodeId: n._id } });
            }
          }
          continue;
        }
        if (b && b.type && b.type !== "blockGroup") {
          content.push({ ...b, props: { ...(b.props || {}), nodeId: n._id } });
        }
      }
    }

    return { type: "doc", content } as { type: "doc"; content: any[] };
  }, [nodes]);

  const parseDocumentContent = useCallback(
    async (
      raw: string | undefined
    ): Promise<{ type: "doc"; content: any[] } | null> => {
      if (!raw || typeof raw !== "string") return null;

      try {
        const maybeJson = JSON.parse(raw);
        // Normalize any ProseMirror/BlockNote-like JSON into a valid bnBlock doc
        return normalizeDocGraphFromAny(maybeJson);
      } catch (err) {
        console.error("Failed to parse JSON content", err);
      }

      try {
        // Parse markdown, unwrap wrappers, and coerce to valid blocks
        const blocks: PartialBlock[] = await parserEditor.tryParseMarkdownToBlocks(raw);
        const unwrapped = unwrapBlocks(blocks);
        const normalized = unwrapped
          .map((b: any) => bnEnsureTopLevelBlock(b))
          .filter((b: any) => b && b.type && !["blockGroup", "text"].includes(b.type));
        return { type: "doc", content: normalized };
      } catch (err) {
        console.error("Failed to convert markdown to blocks", err);
      }
      return null;
    },
    [parserEditor]
  );

  // NEW: Handle snapshot recovery
  const handleSnapshotRecovery = useCallback(async () => {
    // Immediate in-function reentrancy guard
    if (recoveringRef.current || isRecovering) return;
    recoveringRef.current = true;
    setIsRecovering(true);
    try {
      console.log('Handling memory limit recovery...');
      toast.info('Creating checkpoint…', { description: 'Optimizing the document for better performance.' });
      // Set cooldown immediately so autosnapshot logic doesn't retrigger while we start
      lastAutoTriggerAtRef.current = Date.now();

      // Create a snapshot at the true head; server returns { success, version }
      const result = await forceSnapshot({ documentId });
      if (result?.success && typeof result.version === 'number') {
        console.log('Emergency snapshot created at version', result.version, '— priming local cache and reloading');
        try { toast.success('Checkpoint created', { description: 'Reloading from checkpoint…' }); } catch { /* noop */ }
        // Seed sessionStorage with that exact version so the collab plugin starts from it
        await prefetchSnapshotAndReload(result.version);
        return; // prefetch triggers reload
      }
      throw new Error('Snapshot creation failed or no version returned');
    } catch (error: any) {
      console.error('Checkpoint recovery failed:', error);
      toast.error('Checkpoint failed', { description: error?.message ?? 'Please try again.' });
      setSyncError('RECOVERY_FAILED');
    } finally {
      setTimeout(() => {
        setIsRecovering(false);
        recoveringRef.current = false;
      }, 2000);
    }
  }, [documentId, forceSnapshot, isRecovering, prefetchSnapshotAndReload]);

  // Build a lightweight textual summary for proposed actions
  const buildProposalSummary = useCallback((actions: AIToolAction[], currentNodeTitle: string | undefined) => {
    const items: Array<{ kind: string; details: string; snippet?: string }> = [];
    for (const a of actions) {
      if (a.type === 'createNode') {
        const snippet = typeof a.markdown === 'string' ? a.markdown.slice(0, 200) : undefined;
        items.push({ kind: 'Create Block', details: `Insert new content below the current block${currentNodeTitle ? ` (${currentNodeTitle})` : ''}.`, snippet });
      } else if (a.type === 'updateNode') {
        const snippet = typeof a.markdown === 'string' ? a.markdown.slice(0, 200) : undefined;
        items.push({ kind: 'Update Block', details: 'Replace the selected block with the proposed content.', snippet });
      } else if (a.type === 'updateDocument') {
        items.push({ kind: 'Rename Document', details: `Update document title to "${a.title}".` });
      } else if (a.type === 'archiveNode') {
        items.push({ kind: 'Delete Block', details: 'Delete the selected block.' });
      } else if (a.type === 'createDocument') {
        items.push({ kind: 'Create Document', details: `Create a new document${a.title ? ` titled "${a.title}"` : ''}.` });
      } else if (a.type === 'archiveDocument') {
        items.push({ kind: 'Archive Document', details: 'Move current document to trash.' });
      }
    }
    return items;
  }, []);

  // Listen for AIChatPanel proposal tool calls and surface them here as a pending proposal
  useEffect(() => {
    const onAiProposal = (evt: Event) => {
      const e = evt as CustomEvent<any>;
      const detail = (e && e.detail) || null;
      if (!detail || !detail.actions || !Array.isArray(detail.actions)) return;
      console.debug('[Editor] aiProposal received', detail);
      const actions = detail.actions as AIToolAction[];
      const message = typeof detail.message === 'string' ? detail.message : 'AI proposed changes';
      const summary = buildProposalSummary(actions, undefined);
      // Anchor inline preview: prefer provided anchor, else use selection or fallbacks
      let anchorBlockId: string | null = (typeof (detail?.anchorBlockId) === 'string') ? detail.anchorBlockId : null;
      try {
        if (!anchorBlockId) {
          const editorAny: any = sync.editor;
          if (editorAny && typeof editorAny.getTextCursorPosition === 'function') {
            const pos = editorAny.getTextCursorPosition();
            const maybeId = pos?.block?.id;
            if (typeof maybeId === 'string') anchorBlockId = maybeId;
          }
          // Fallbacks if no cursor-based block id
          if (!anchorBlockId && editorAny?.topLevelBlocks && editorAny.topLevelBlocks.length > 0) {
            // Prefer first content block after header if present
            const first = editorAny.topLevelBlocks[0];
            const second = editorAny.topLevelBlocks[1] ?? first;
            anchorBlockId = second?.id ?? first?.id ?? null;
          }
        }
      } catch {/* no-op */}
      setPendingProposal({ message, actions, summary, anchorBlockId });
    };
    window.addEventListener('nodebench:aiProposal', onAiProposal);
    return () => {
      window.removeEventListener('nodebench:aiProposal', onAiProposal);
    };
  }, [buildProposalSummary, sync.editor]);

  // Apply a set of actions returned by the AI (accept all)
  const applyActions = useCallback(
    async (
      actions: AIToolAction[],
      currentBlock: any,
      currentNodeId: Id<'nodes'> | null,
      opts?: { debugToasts?: boolean; focus?: boolean }
    ) => {
      if (!sync.editor) return;
      const editor: any = sync.editor;
      const debugToasts = !!opts?.debugToasts;
      const doFocus = opts?.focus !== false;

      const scrollAndFlash = (blockId: string) => {
        try {
          requestAnimationFrame(() => {
            const el = window.document.querySelector<HTMLElement>(
              `[data-block-id="${blockId}"], [data-id="${blockId}"]`
            );
            const outer = (el?.closest('.bn-block-outer') as HTMLElement | null) ?? null;
            const targetEl = outer ?? el;
            if (targetEl) {
              try {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } catch {
                /* noop */
              }
              try {
                targetEl.style.outline = '2px solid var(--accent-primary)';
                targetEl.style.outlineOffset = '-2px';
                setTimeout(() => {
                  targetEl.style.outline = '';
                  targetEl.style.outlineOffset = '';
                }, 900);
              } catch {
                /* noop */
              }
            }
          });
        } catch {
          /* noop */
        }
      };

      // IMPORTANT: Apply content edits as historical operations so they are undoable.
      // Only wrap caret moves and view housekeeping in runNonHistorical.
      for (const action of actions) {
        if (action.type === 'createNode' && action.markdown) {
          const rawBlocks = await parserEditor.tryParseMarkdownToBlocks(action.markdown);
          const unwrapped = unwrapBlocks(rawBlocks);
          const blocksToInsert = unwrapped
            .map((b: any) => bnEnsureTopLevelBlock(b))
            .filter((b: any) => b && b.type && !["blockGroup", "text"].includes(b.type));
          if (blocksToInsert.length === 0) {
            console.warn('AI response markdown could not be parsed into blocks – skipping insertion.');
            if (debugToasts) toast.error('[debug] Create: markdown parse failed');
            continue;
          }

          // If a parentId hint is provided and the target matches, try nested insertion
          const isNestedTarget = !!(
            action.parentId && getBlockNodeId(currentBlock) && String(getBlockNodeId(currentBlock)) === String(action.parentId)
          );

          if (isNestedTarget) {
          try {
            const existingChildren: any[] = Array.isArray(currentBlock.children)
              ? currentBlock.children
              : [];
            const newChildren: any[] = [...existingChildren, ...blocksToInsert];
            // Historical block update
            const updated = editor.updateBlock(currentBlock.id, { children: newChildren });
            if (debugToasts) {
              try {
                toast.info(`[debug] Nested inserted ${blocksToInsert.length} block(s) under parent`);
              } catch {
                /* noop */
              }
            }
            if (doFocus) {
              const kids: any[] = updated?.children ?? [];
              const last = kids.length > 0 ? kids[kids.length - 1] : null;
              if (last?.id) {
                try { runNonHistorical(editor, () => { editor.setTextCursorPosition(last, 'start'); }); } catch { /* noop */ }
                scrollAndFlash(last.id);
              } else {
                if (updated?.id) scrollAndFlash(updated.id);
              }
            }
          } catch (err) {
            console.error('[Editor] Nested insertion failed, falling back to after insertion', err);
            // Historical insertion after target
            const inserted: any[] | null = editor.insertBlocks(blocksToInsert, currentBlock, 'after');
            if (debugToasts) {
              try {
                toast.info(`[debug] Fallback insert after parent: ${(inserted?.length ?? blocksToInsert.length)} block(s)`);
              } catch {
                /* noop */
              }
            }
            if (doFocus) {
              const arr: any[] = inserted ?? [];
              const focusBlk = arr[arr.length - 1] ?? arr[0];
              if (focusBlk?.id) {
                try { runNonHistorical(editor, () => { editor.setTextCursorPosition(focusBlk, 'start'); }); } catch { /* noop */ }
                scrollAndFlash(focusBlk.id);
              } else {
                scrollAndFlash(currentBlock.id);
              }
            }
          }
        } else {
          // Default: insert after the target block
          // Historical insertion
          const inserted: any[] | null = editor.insertBlocks(blocksToInsert, currentBlock, 'after');
          if (debugToasts) {
            try {
              toast.info(`[debug] Inserted ${(inserted?.length ?? blocksToInsert.length)} block(s) after target`);
            } catch {
              /* noop */
            }
          }
          if (doFocus) {
            const arr = inserted ?? [];
            const focusBlk = arr[arr.length - 1] ?? arr[0];
            if (focusBlk?.id) {
              try { runNonHistorical(editor, () => { editor.setTextCursorPosition(focusBlk, 'start'); }); } catch { /* noop */ }
              scrollAndFlash(focusBlk.id);
            } else {
              scrollAndFlash(currentBlock.id);
            }
          }
        }
      } else if (action.type === 'updateNode' && action.markdown) {
          const rawBlocks = await parserEditor.tryParseMarkdownToBlocks(action.markdown);
          const unwrapped = unwrapBlocks(rawBlocks);
          const newBlocks = unwrapped
            .map((b: any) => bnEnsureTopLevelBlock(b))
            .filter((b: any) => b && b.type && !["blockGroup", "text"].includes(b.type));
          if (newBlocks.length === 0) {
            console.warn('AI update markdown could not be parsed – skipping update.');
            if (debugToasts) toast.error('[debug] Update: markdown parse failed');
            continue;
          }
          if (newBlocks.length === 1) {
            console.debug('[Editor] applyActions:updateNode updating single block', { blockId: currentBlock?.id });
            // Historical block update
            const updated = editor.updateBlock(currentBlock.id, newBlocks[0]);
            if (debugToasts) {
              try { toast.success('[debug] Updated block'); } catch { /* noop */ }
            }
            if (doFocus && updated?.id) {
              try { runNonHistorical(editor, () => { editor.setTextCursorPosition(updated, 'start'); }); } catch { /* noop */ }
              scrollAndFlash(updated.id);
            }
          } else {
            console.debug('[Editor] applyActions:updateNode replacing block with multiple', { fromBlockId: currentBlock?.id, newCount: newBlocks.length });
            // Historical replace with multiple
            const res = editor.replaceBlocks([currentBlock], newBlocks);
            if (debugToasts) {
              try { toast.success(`[debug] Replaced with ${newBlocks.length} block(s)`); } catch { /* noop */ }
            }
            const insertedArr: any[] = res?.insertedBlocks ?? [];
            const focusBlk = insertedArr[insertedArr.length - 1] ?? insertedArr[0];
            if (doFocus && focusBlk?.id) {
              try { runNonHistorical(editor, () => { editor.setTextCursorPosition(focusBlk, 'start'); }); } catch { /* noop */ }
              scrollAndFlash(focusBlk.id);
            }
          }
        } else if (action.type === 'updateDocument') {
          // Future-proofing: only honor `title` and ignore any other fields the tool might add.
          const rawTitle: unknown = (action as { title?: unknown }).title;
          const nextTitle = typeof rawTitle === 'string' ? rawTitle.trim() : '';
          if (!nextTitle) {
            console.debug('[Editor] applyActions:updateDocument ignored (empty or invalid title)', { rawTitle });
            continue;
          }
          const currentTitle = typeof document?.title === 'string' ? document.title.trim() : '';
          if (currentTitle === nextTitle) {
            console.debug('[Editor] applyActions:updateDocument ignored (no-op, same title)');
            // treat as no-op (neither applied nor failed)
            continue;
          }
          try {
            const ignoredKeys = Object.keys(action).filter(k => !['type', 'documentId', 'title'].includes(k));
            if (ignoredKeys.length > 0) {
              console.debug('[Editor] applyActions:updateDocument ignoring unsupported fields', { ignoredKeys });
            }
            await updateDocument({ id: documentId, title: nextTitle });
            if (debugToasts) {
              try { toast.success('[debug] Updated document title'); } catch { /* noop */ }
            }
          } catch (e) {
            console.error('Failed to update document title', e);
            if (debugToasts) {
              try { toast.error('[debug] Failed to update title'); } catch { /* noop */ }
            }
          }
        }
        // Note: createDocument / archiveDocument are not applied from within Editor; handled elsewhere in UI.
      }
    },
    [documentId, document, parserEditor, sync.editor, updateDocument, runNonHistorical]
  );

  // Apply selected actions sent from AIChatPanel globally
  useEffect(() => {
    const onApplyActions = async (evt: Event) => {
      const e = evt as CustomEvent;
      const detail = (e && (e as any).detail) || null;
      const actions: AIToolAction[] = (detail && Array.isArray(detail.actions)) ? detail.actions : [];
      if (!actions || actions.length === 0) return;

      console.debug('[Editor] nodebench:applyActions received', { actionsCount: actions.length, detail });

      // If the event targets a specific document, ignore when it doesn't match this editor
      const detailDocId: string | null = (detail && typeof detail.documentId === 'string') ? detail.documentId : null;
      if (detailDocId && detailDocId !== (documentId as unknown as string)) {
        console.debug('[Editor] ignoring applyActions for different document', { detailDocId, documentId });
        return;
      }

      const anchorFromEvent: string | null = (detail && typeof detail.anchorBlockId === 'string') ? detail.anchorBlockId : null;
      const anchorBlockId: string | null = anchorFromEvent ?? pendingProposal?.anchorBlockId ?? null;

      const editorAny: any = sync.editor;
      if (!editorAny) return;
      type EditorBlock = { id: string; type?: string; content?: unknown; props?: { nodeId?: Id<'nodes'> } };
      const allBlocks: EditorBlock[] = editorAny?.topLevelBlocks ?? [];

      const getBlockByNodeId = (nodeId: string | Id<'nodes'>): EditorBlock | null =>
        allBlocks.find(b => String(getBlockNodeId(b)) === String(nodeId)) ?? null;
      const getBlockById = (blockId: string): EditorBlock | null =>
        allBlocks.find(b => b.id === blockId) ?? null;
      const getCurrentOrLastBlock = (): EditorBlock | null => {
        try {
          const pos = editorAny?.getTextCursorPosition?.();
          const maybeId = pos?.block?.id;
          if (maybeId) return getBlockById(maybeId);
        } catch { /* noop */ }
        return allBlocks.length > 0 ? allBlocks[allBlocks.length - 1] : null;
      };

      let applied = 0;
      let failed = 0;
      const debugToasts = !!(
        (detail && detail.debug === true) ||
        (typeof window !== 'undefined' && window.localStorage?.getItem('nodebench.debugToasts') === '1') ||
        (typeof window !== 'undefined' && window.location?.search?.includes('debugToasts=1'))
      );

      for (const action of actions) {
        if (action.type === 'updateNode' && action.markdown) {
          let target: EditorBlock | null = null;
          if (action.nodeId) {
            target = getBlockByNodeId(action.nodeId);
          }
          if (!target && anchorBlockId) {
            target = getBlockById(anchorBlockId);
          }
          if (!target) {
            target = getCurrentOrLastBlock();
          }
          if (target) {
            try {
              await applyActions([action], target, getBlockNodeId(target), { debugToasts, focus: true });
              applied++;
            } catch (err) {
              console.error('[Editor] Failed to apply updateNode', err);
              failed++;
            }
          } else {
            console.warn('[Editor] updateNode action could not find a target block', { action });
            failed++;
          }
        } else if (action.type === 'createNode' && action.markdown) {
          let target: EditorBlock | null = null;
          // Prefer parentId hint if provided
          if (action.parentId) target = getBlockByNodeId(action.parentId);
          if (!target && anchorBlockId) target = getBlockById(anchorBlockId);
          if (!target) target = getCurrentOrLastBlock();
          if (target) {
            try {
              await applyActions([action], target, getBlockNodeId(target), { debugToasts, focus: true });
              applied++;
            } catch (err) {
              console.error('[Editor] Failed to apply createNode', err);
              failed++;
            }
          } else {
            console.warn('[Editor] createNode action could not determine insertion target');
            failed++;
          }
        } else if (action.type === 'updateDocument') {
          // Future-proofing: only honor `title` and ignore any other fields the tool might add.
          const rawTitle: unknown = (action as any).title;
          const nextTitle = typeof rawTitle === 'string' ? rawTitle.trim() : '';
          if (!nextTitle) {
            console.debug('[Editor] global apply:updateDocument ignored (empty or invalid title)', { rawTitle });
            failed++;
            continue;
          }
          const currentTitle = typeof document?.title === 'string' ? document.title.trim() : '';
          if (currentTitle === nextTitle) {
            console.debug('[Editor] global apply:updateDocument ignored (no-op, same title)');
            // treat as no-op (neither applied nor failed)
            continue;
          }
          try {
            const ignoredKeys = Object.keys(action).filter(k => !['type', 'documentId', 'title'].includes(k));
            if (ignoredKeys.length > 0) {
              console.debug('[Editor] global apply:updateDocument ignoring unsupported fields', { ignoredKeys });
            }
            await updateDocument({ id: documentId, title: nextTitle });
            applied++;
          } catch (err) {
            console.error('Failed to update document title (global apply)', err);
            failed++;
          }
        }
        // Note: archiveNode/createDocument/archiveDocument are handled elsewhere.
      }

      // Show aggregated toast outcome
      try {
        if (applied > 0 && failed === 0) {
          toast.success(`Applied ${applied} change${applied > 1 ? 's' : ''}`);
        } else if (applied > 0 && failed > 0) {
          toast.info(`Applied ${applied} of ${actions.length} change${actions.length > 1 ? 's' : ''}`);
        } else {
          toast.error('No changes applied');
        }
      } catch { /* ignore toast errors */ }

      // Clear inline proposal after applying globally
      setPendingProposal(null);
    };
    // Wrap async handler to satisfy void-returning listener signature
    const onApplyActionsHandler = (evt: Event) => {
      void onApplyActions(evt);
    };
    window.addEventListener('nodebench:applyActions', onApplyActionsHandler);
    return () => window.removeEventListener('nodebench:applyActions', onApplyActionsHandler);
  }, [applyActions, document, documentId, sync.editor, updateDocument, pendingProposal]);

  // NEW: Monitor document stats, throttle warnings, and auto-trigger snapshots by steps/time
  useEffect(() => {
    if (!getDocumentStats) return;
    setDocumentStats(getDocumentStats as DocumentStats);

    const stats = getDocumentStats as DocumentStats;
    const now = Date.now();

    // Throttled warnings based on risk level
    const warnKey = `risk:${stats.riskLevel}`;
    const lastWarned = warnAtRef.current[warnKey] ?? 0;
    if (now - lastWarned > WARN_THROTTLE_MS) {
      warnAtRef.current[warnKey] = now;
      if (stats.riskLevel === 'high') {
        console.warn('[Editor] Document approaching sync limits:', stats);
      } else if (stats.riskLevel === 'critical') {
        console.error('[Editor] Document at critical sync limits:', stats);
      }
    }

    // Auto-trigger snapshot on critical risk (cooldown guarded)
    if (stats.riskLevel === 'critical') {
      if (now - lastAutoTriggerAtRef.current > AUTO_TRIGGER_COOLDOWN_MS && !isRecovering) {
        lastAutoTriggerAtRef.current = now;
        void handleSnapshotRecovery();
      }
      return; // don't double trigger below
    }

    // Auto-trigger by step threshold
    const steps = stats.stepsSinceLastSnapshot ?? 0;
    const lastAt = stats.lastSnapshotAt ?? null;
    const tooManySteps = steps >= CLIENT_SNAPSHOT_STEP_THRESHOLD;
    const tooMuchTime = lastAt !== null && now - lastAt >= CLIENT_SNAPSHOT_TIME_THRESHOLD_MS && steps > 0;

    if ((tooManySteps || tooMuchTime) && now - lastAutoTriggerAtRef.current > AUTO_TRIGGER_COOLDOWN_MS && !isRecovering) {
      console.log('[Editor] Auto-triggering snapshot', { steps, lastAt, reason: tooManySteps ? 'steps' : 'time' });
      lastAutoTriggerAtRef.current = now;
      void handleSnapshotRecovery();
    }
  }, [
    getDocumentStats,
    handleSnapshotRecovery,
    isRecovering,
    WARN_THROTTLE_MS,
    AUTO_TRIGGER_COOLDOWN_MS,
    CLIENT_SNAPSHOT_STEP_THRESHOLD,
    CLIENT_SNAPSHOT_TIME_THRESHOLD_MS,
  ]);



  // NEW: Handle memory limit recovery
  const handleMemoryRecovery = useCallback(async () => {
    if (isRecovering) return;

    setIsRecovering(true);
    try {
      console.log('Handling memory limit recovery...');

      // Force a snapshot first
      const result = await forceSnapshot({ documentId });

      if (result?.success) {
        console.log('Emergency snapshot created, reloading...');

        // Then reload to start fresh
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error('Emergency snapshot failed');
      }

    } catch (error: any) {
      console.error('Memory recovery failed:', error);
      setSyncError('RECOVERY_FAILED');
    } finally {
      setTimeout(() => setIsRecovering(false), 2000);
    }
  }, [documentId, forceSnapshot, isRecovering]);

  // Enhanced initialization with comprehensive error handling
  useEffect(() => {
    const initializeEditor = async () => {
      if (!sync.isLoading && !sync.editor && document !== undefined && nodes !== undefined) {

        // Prevent too many initialization attempts
        if (initializationAttempts >= 3) {
          console.error('Too many initialization attempts, giving up');
          setSyncError('INIT_MAX_ATTEMPTS');
          return;
        }

        setInitializationAttempts(prev => prev + 1);

        let blocks: { type: "doc"; content: any[] } | null = null;

        try {
          // Try to build from nodes first
          if (nodes && nodes.length > 0) {
            blocks = buildBlocksFromNodes();
            console.log(`Built blocks from ${nodes.length} nodes`);
          }

          // Fallback to document content
          if (!blocks) {
            const contentToParse = typeof document?.content === "string" ? document.content : undefined;
            blocks = await parseDocumentContent(contentToParse);
            console.log('Built blocks from document content');
          }

          // Final fallback to empty document
          if (!blocks) {
            blocks = { type: "doc", content: [] };
            console.log('Using empty document fallback');
          }

          // Attempt to create the editor
          await sync.create(blocks);
          console.log('Editor initialized successfully');
          setInitializationAttempts(0); // Reset on success

        } catch (error: any) {
          console.error("Error initializing editor:", error);

          // Check if it's a sync-related error
          if (error.message?.includes('TOO_MANY_STEPS') ||
              error.message?.includes('bytes read') ||
              error.message?.includes('16777216')) {
            setSyncError('INIT_MEMORY_ERROR');
            void handleMemoryRecovery();
            return;
          }

          // Check for authentication errors
          if (error.message?.includes('Not authenticated')) {
            setSyncError('AUTH_ERROR');
            window.location.reload();
            return;
          }

          // Fallback initialization with empty document
          try {
            console.log('Attempting fallback initialization...');
            await sync.create({ type: "doc", content: [] });
            console.log('Fallback initialization succeeded');
            setInitializationAttempts(0);
          } catch (fallbackError: any) {
            console.error("Error creating fallback editor:", fallbackError);
            setSyncError('INIT_FAILED');

            // Schedule retry if we haven't exceeded max attempts
            if (initializationAttempts < 3) {
              setTimeout(() => {
                console.log(`Retrying initialization (attempt ${initializationAttempts + 1}/3)...`);
                setSyncError(null);
              }, 3000 * initializationAttempts); // Increasing delay
            }
          }
        }
      }
    };

    void initializeEditor();
  }, [sync, document, nodes, buildBlocksFromNodes, parseDocumentContent, initializationAttempts, handleMemoryRecovery]);

  useEffect(() => {
    if (DISABLE_PROGRAMMATIC_MOUNT_MUTATIONS) return;
    const updateEditor = async () => {
      if (sync.editor && nodes && nodes.length > 0) {
        const graph = buildBlocksFromNodes();
        if (graph) {
          const currentSig = sigOf(sync.editor.document);
          const nextSig = computeDocSignature(graph);
          if (currentSig !== nextSig) {
            try {
              // Validate blocks before replacing (non-historical)
              if (graph.content && Array.isArray(graph.content)) {
                runNonHistorical(sync.editor, () => {
                  sync.editor.replaceBlocks(sync.editor.topLevelBlocks, graph.content);
                });
              }
            } catch (error) {
              console.error("Error updating editor with nodes:", error);
              // Note: Editor will continue to work with existing content
              // The sync system will handle recovery automatically
            }
          }
        }
      } else if (sync.editor && document?.content) {
        const currentSig = sigOf(sync.editor.document);
        const parsed = await parseDocumentContent(document.content);
        if (parsed?.content) {
          const nextSig = computeDocSignature(parsed);
          if (currentSig !== nextSig) {
            try {
              // Validate blocks before replacing (non-historical)
              if (Array.isArray(parsed.content)) {
                // Filter out any invalid blocks
                const validBlocks = parsed.content.filter((block: any) =>
                  block && typeof block === 'object' && block.type &&
                  !['blockGroup', 'text'].includes(block.type)
                );
                if (validBlocks.length > 0) {
                  runNonHistorical(sync.editor, () => {
                    sync.editor.replaceBlocks(sync.editor.topLevelBlocks, validBlocks);
                  });
                }
              }
            } catch (error) {
              console.error("Error updating editor with document content:", error);
              // Don't attempt fallback here to avoid infinite loops
            }
          }
        }
      }
    };
    void updateEditor();
  }, [nodes, document?.content, buildBlocksFromNodes, sync, parseDocumentContent, runNonHistorical, sigOf]);

  // Update global focused context for Context Pills based on editor cursor
  useEffect(() => {
    if (!sync.editor) return;

    // Lightweight signature guard to avoid redundant updates
    let lastSig: string | null = null;
    let rafId: number | null = null;

    const computeSig = (payload: { blockId: string; beforeIds: string[]; afterIds: string[]; preview: string }) => {
      // Keep signature short and stable
      return [documentId, payload.blockId, payload.beforeIds.join(','), payload.afterIds.join(','), payload.preview].join('|');
    };

    const handleUpdate = () => {
      try {
        // Reduce churn during active pointer gestures
        if (pointerDownRef.current) return;
        const cursorPosition = sync.editor.getTextCursorPosition?.();
        if (!cursorPosition || !cursorPosition.block) return;
        const currentBlock = cursorPosition.block as any;
        const editorAny: any = sync.editor;
        const blocks: any[] = editorAny.topLevelBlocks || [];
        const idx = blocks.findIndex((b: any) => b.id === currentBlock.id);
        if (idx === -1) return;

        const beforeIds: string[] = blocks.slice(Math.max(0, idx - 2), idx).map((b: any) => b.id);
        const afterIds: string[] = blocks.slice(idx + 1, idx + 3).map((b: any) => b.id);
        const preview = (() => {
          try {
            const text = Array.isArray(currentBlock?.content)
              ? currentBlock.content.map((c: any) => c?.text ?? '').join(' ')
              : '';
            return text.slice(0, 100);
          } catch {
            return '';
          }
        })();

        const payload = { blockId: currentBlock.id as string, beforeIds, afterIds, preview };
        const sig = computeSig(payload);
        if (sig === lastSig) return; // idempotent: no state update if unchanged
        lastSig = sig;

        setFocused({
          documentId,
          blockId: payload.blockId,
          beforeIds: payload.beforeIds,
          afterIds: payload.afterIds,
          preview: payload.preview,
        });
      } catch {
        // noop
      }
    };

    const scheduleUpdate = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        handleUpdate();
      });
    };

    // Prefer the editor's selectionChange signal over noisy DOM events
    const unsubscribe = (sync.editor as any).on('selectionChange', scheduleUpdate);

    // Kick off one rAF update to initialize
    scheduleUpdate();

    return () => {
      try {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } catch { /* noop */ }
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [sync.editor, documentId, setFocused]);

  const handleAiAction = useCallback(async (prompt: string) => {
    if (!sync.editor || isGenerating) return;

    setIsAiMenuOpen(false);
    setIsGenerating(true);

    try {
      const cursorPosition = sync.editor.getTextCursorPosition();
      const currentBlock: any = cursorPosition.block;
      const editorAny2: any = sync.editor;
      const blocks: any[] = editorAny2.topLevelBlocks;
      const currentBlockIndex = blocks.findIndex(b => b.id === currentBlock.id);

      // Try to get nodeId from the current block
      let currentNodeId = getBlockNodeId(currentBlock) ?? undefined;

      // If no nodeId in props, try to find it from the nodes array
      if (!currentNodeId && nodes) {
        const blockNode = nodes.find(n => {
          try {
            if (!n.json) return false;
            const nodeJson = JSON.parse(n.json);
            return nodeJson?.id === currentBlock.id;
          } catch {
            return false;
          }
        });
        currentNodeId = blockNode?._id;
      }

      // Build context
      const contextBeforeCursor = blocks
        .slice(0, currentBlockIndex)
        .map(block => {
          if (Array.isArray(block.content)) {
            return block.content.map((c: any) => c.text || '').join('');
          }
          return '';
        })
        .join('\n');

      const selectedBlockContent = currentBlock.content && Array.isArray(currentBlock.content)
        ? currentBlock.content.map((c: any) => c.text || '').join('')
        : '';

      const contextAfterCursor = blocks
        .slice(currentBlockIndex + 1)
        .map(block => {
          if (Array.isArray(block.content)) {
            return block.content.map((c: any) => c.text || '').join('');
          }
          return '';
        })
        .join('\n');

      const response = await generateAIResponse({
        userMessage: prompt,
        selectedDocumentId: documentId,
        selectedNodeId: currentNodeId || null,
        contextBeforeCursor,
        selectedBlockContent,
        contextAfterCursor,
      });

      if (!response || !response.actions || response.actions.length === 0) {
        toast.info(response?.message || "No actionable changes were returned.");
        return;
      }

      // Build a proposal preview instead of applying immediately
      let currentNodeTitle = '';
      if (Array.isArray(currentBlock?.content)) {
        currentNodeTitle = currentBlock.content
          .map((c: any) => (typeof c?.text === 'string' ? c.text : ''))
          .join('')
          .slice(0, 60);
      }
      const summary = buildProposalSummary(response.actions as AIToolAction[], currentNodeTitle || undefined);
      setPendingProposal({ message: response.message || 'AI proposed changes', actions: response.actions as AIToolAction[], summary, anchorBlockId: currentBlock.id });

    } catch (error) {
      console.error("Error generating AI content:", error);
      toast.error("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [sync.editor, generateAIResponse, isGenerating, documentId, nodes, buildProposalSummary, setPendingProposal]);

  // Safety: clear any leftover data attributes when proposals are dismissed/unmounted
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pendingProposal) {
      try {
        window.document
          .querySelectorAll('.bn-block-outer[data-proposal-line], .bn-block-content[data-proposal-line]')
          .forEach((el) => el.removeAttribute('data-proposal-line'));
      } catch { /* noop */ }
    }
  }, [pendingProposal]);

  // Quick Test: Dispatch a synthetic proposal for easier testing
  const handleTestProposal = useCallback(() => {
    if (!sync.editor) return;
    try {
      const editorAny: any = sync.editor;
      const pos = editorAny.getTextCursorPosition?.();
      const currentBlock = pos?.block ?? editorAny?.topLevelBlocks?.[0] ?? null;
      if (!currentBlock) return;

      // Prefer updating the current node if possible
      let currentNodeId: Id<'nodes'> | null = getBlockNodeId(currentBlock);
      if (!currentNodeId && nodes) {
        try {
          const blockNode = nodes.find((n: any) => {
            if (!n?.json) return false;
            try {
              const nodeJson = JSON.parse(n.json);
              return nodeJson?.id === currentBlock.id;
            } catch { return false; }
          });
          currentNodeId = blockNode?._id ?? null;
        } catch { /* no-op */ }
      }

      // Build a small proposed markdown (diff-friendly)
      const proposedMarkdown = [
        'Test Proposal: This is a synthetic change to verify overlays.',
        '- Added checklist item',
        '- Another line to show diff',
      ].join('\n');

      const action: AIToolAction = currentNodeId
        ? { type: 'updateNode', nodeId: currentNodeId, markdown: proposedMarkdown }
        : { type: 'updateNode', markdown: proposedMarkdown };

      console.debug('[Editor] dispatching aiProposal (test)', { hasNodeId: !!currentNodeId, anchorBlockId: currentBlock.id });
      window.dispatchEvent(new CustomEvent('nodebench:aiProposal', {
        detail: {
          actions: [action],
          message: 'Test proposal (Editor)',
          anchorBlockId: currentBlock.id,
        },
      }));
      setIsAiMenuOpen(false);
    } catch (e) {
      console.error('Failed to dispatch test proposal', e);
    }
  }, [sync.editor, nodes]);

  const aiActions: Array<{ label: string; icon: any; prompt?: string; onClick?: () => void }> = [
    {
      label: "Improve Writing",
      icon: <PenSquare className="h-5 w-5" />,
      prompt: "Improve the writing in the selected text. Make it more clear, concise, and engaging.",
    },
    {
      label: "Brainstorm Ideas",
      icon: <BrainCircuit className="h-5 w-5" />,
      prompt: "Brainstorm ideas based on the selected text. Provide a list of related topics, questions, and concepts.",
    },
    {
      label: "Create a To-Do List",
      icon: <ListTodo className="h-5 w-5" />,
      prompt: "Based on the document's content, create a checklist of action items.",
    },
    {
      label: "Test Proposal",
      icon: <FlaskConical className="h-5 w-5" />,
      onClick: () => handleTestProposal(),
    },
  ];

  const slashRegisteredRef = useRef(false);

  // Inline preview decorations for proposals, with node-level line diffs and per-line accept/reject
  const ProposalInlineDecorations = () => {
    const [lineSelections, setLineSelections] = useState<Record<string, Record<number, boolean>>>({});
    const [positionTick, setPositionTick] = useState(0);
    const container = editorContainerRef.current;
    // Reference the tick so it's not flagged as unused by linters
    void positionTick;

    // Recompute overlay positions on scroll/resize since we use fixed-position portals to document.body
    useEffect(() => {
      if (!container || typeof window === 'undefined' || !window.document?.body) return;
      const handle = () => setPositionTick((t) => t + 1);
      // listen to window scroll/resize and container scroll
      window.addEventListener('scroll', handle, true);
      window.addEventListener('resize', handle);
      container.addEventListener('scroll', handle, true);
      return () => {
        window.removeEventListener('scroll', handle, true);
        window.removeEventListener('resize', handle);
        container.removeEventListener('scroll', handle, true);
      };
    }, [container]);

    // Build mapping from nodeId to block for targeting updateNode actions
    type EditorBlock = { id: string; type?: string; content?: unknown; props?: { nodeId?: Id<'nodes'> } };
    const editorAny = sync.editor as { topLevelBlocks?: EditorBlock[] } | undefined;
    const topLevelBlocks = editorAny?.topLevelBlocks;
    const allBlocks: EditorBlock[] = useMemo(() => topLevelBlocks ?? [], [topLevelBlocks]);

    // Helper: find a block by its nodeId
    const getBlockByNodeId = useCallback((nodeId: string) => {
      return allBlocks.find(b => String(getBlockNodeId(b)) === String(nodeId));
    }, [allBlocks]);

    // Resolve target block for an action (only updateNode previews inline)
    const _resolveTargetBlockForAction = (action: AIToolAction): EditorBlock | null => {
      if (action.type !== 'updateNode') return null;
      if (action.nodeId) {
        const byNode = getBlockByNodeId(String(action.nodeId));
        if (byNode) return byNode;
      }
      const anchorId = pendingProposal?.anchorBlockId ?? null;
      if (anchorId) return allBlocks.find(b => b.id === anchorId) ?? null;
      return null;
    };

    // Build unique overlay targets by block id to avoid stacking duplicates
    const proposalActions = pendingProposal?.actions ?? [];
    const proposalAnchorId = pendingProposal?.anchorBlockId ?? null;
    const overlayTargets: Array<{ action: AIToolAction; block: EditorBlock }> = (() => {
      const seen = new Set<string>();
      const targets: Array<{ action: AIToolAction; block: EditorBlock }> = [];
      for (const action of proposalActions) {
        if (action.type !== 'updateNode') continue;
        let blk: EditorBlock | null = null;
        if (action.nodeId) {
          const byNode = getBlockByNodeId(String(action.nodeId));
          if (byNode) blk = byNode;
        }
        if (!blk && proposalAnchorId) blk = allBlocks.find(b => b.id === proposalAnchorId) ?? null;
        if (!blk) continue;
        if (seen.has(blk.id)) continue;
        seen.add(blk.id);
        targets.push({ action, block: blk });
      }
      return targets;
    })();

    // Simple LCS-based diff for lines
    type LineOp = { type: 'eq' | 'del' | 'add'; line: string; aIdx?: number; bIdx?: number };
    const diffLines = useCallback((a: string[], b: string[]): LineOp[] => {
      // Soft caps to avoid UI jank for very large blocks or trivial small blocks
      const MAX_LINES = 500;
      const maxLen = Math.max(a.length, b.length);
      if (maxLen < 5) {
        // For very small inputs, skip LCS and show a simple add/replace view
        return b.map((line, idx) => ({ type: 'add' as const, line, bIdx: idx }));
      }
      if (a.length + b.length > MAX_LINES) {
        // Cap: treat as wholesale replacement to keep UI snappy
        return [
          // Show the first few removals and additions for context
          ...a.slice(0, 3).map((line, i) => ({ type: 'del' as const, line, aIdx: i })),
          ...b.slice(0, 3).map((line, i) => ({ type: 'add' as const, line, bIdx: i })),
        ];
      }

      const n = a.length, m = b.length;
      const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
      const ops: Array<LineOp> = [];
      let i = 0, j = 0;
      while (i < n && j < m) {
        if (a[i] === b[j]) { ops.push({ type: 'eq', line: a[i], aIdx: i, bIdx: j }); i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'del', line: a[i], aIdx: i }); i++; }
        else { ops.push({ type: 'add', line: b[j], bIdx: j }); j++; }
      }
      while (i < n) { ops.push({ type: 'del', line: a[i], aIdx: i }); i++; }
      while (j < m) { ops.push({ type: 'add', line: b[j], bIdx: j }); j++; }
      return ops;
    }, []);

    // moved below getBlockEl/getBlockText

    // Prefer data-block-id, but fall back to data-id used by bn-block-outer
    const getBlockEl = useCallback((blockId: string): HTMLElement | null => {
      return container?.querySelector<HTMLElement>(`[data-block-id="${blockId}"], [data-id="${blockId}"]`) ?? null;
    }, [container]);
    const getBlockText = useCallback((block: EditorBlock): string => {
      if (!block) return '';
      try {
        if (block.type === 'paragraph' && Array.isArray(block.content)) {
          const arr = block.content as Array<{ text?: string }>;
          return arr.filter((c) => c?.text).map((c) => c.text as string).join('');
        }
        if ((block.type || '').startsWith('heading') && Array.isArray(block.content)) {
          const arr = block.content as Array<{ text?: string }>;
          return arr.filter((c) => c?.text).map((c) => c.text as string).join('');
        }
        // Safer fallback for any block with array content
        const bAny: any = block as any;
        if (Array.isArray(bAny.content)) {
          return (bAny.content as Array<any>).map((c: any) => c?.text || '').join('');
        }
      } catch (err) { void err; }
      // Fallback stringify
      const bAny2: any = block as any;
      return (block?.content && typeof bAny2.content === 'string') ? bAny2.content : '';
    }, []);

    // Set a subtle in-block gutter line number using a data attribute on the target block
    useEffect(() => {
      if (!container || typeof window === 'undefined') return;
      // Clear any previous indicators
      window.document
        .querySelectorAll('.bn-block-outer[data-proposal-line]')
        .forEach((el) => {
          el.removeAttribute('data-proposal-line');
        });
      window.document
        .querySelectorAll('.bn-block-content[data-proposal-line]')
        .forEach((el) => {
          el.removeAttribute('data-proposal-line');
        });

      if (overlayTargets.length === 0) return;

      const { action, block } = overlayTargets[0];
      let lineNo: number | null = null;
      if (action.type === 'updateNode') {
        const current = getBlockText(block);
        const proposed = typeof action.markdown === 'string' ? action.markdown : '';
        const ops = diffLines(current.split('\n'), proposed.split('\n'));
        const firstChange = ops.find((op) => op.type !== 'eq');
        const aIdx = firstChange && typeof firstChange.aIdx === 'number' ? firstChange.aIdx : undefined;
        const bIdx = firstChange && typeof firstChange.bIdx === 'number' ? firstChange.bIdx : undefined;
        lineNo = aIdx !== undefined ? aIdx + 1 : bIdx !== undefined ? bIdx + 1 : null;
      }

      const blockEl = getBlockEl(block.id);
      const outer = blockEl?.closest('.bn-block-outer');
      if (outer) {
        if (lineNo != null) {
          outer.setAttribute('data-proposal-line', String(lineNo));
        } else {
          outer.removeAttribute('data-proposal-line');
        }
        const contentEl = outer.querySelector('.bn-block-content');
        if (contentEl) {
          if (lineNo != null) {
            contentEl.setAttribute('data-proposal-line', String(lineNo));
          } else {
            contentEl.removeAttribute('data-proposal-line');
          }
        }
      }

      return () => {
        window.document
          .querySelectorAll('.bn-block-outer[data-proposal-line]')
          .forEach((el) => {
            el.removeAttribute('data-proposal-line');
          });
        window.document
          .querySelectorAll('.bn-block-content[data-proposal-line]')
          .forEach((el) => {
            el.removeAttribute('data-proposal-line');
          });
      };
    }, [container, overlayTargets, positionTick, getBlockEl, getBlockText, diffLines]);

    // Render an inline diff panel for a specific action anchored to the block,
    // but mounted as a fixed-position portal to document.body to avoid ProseMirror DOM mutations.
    const renderInlineForAction = (action: AIToolAction, _idx: number) => {
      let targetBlock: EditorBlock | null = null;
      if (action.type === 'updateNode' && action.nodeId) {
        targetBlock = getBlockByNodeId(action.nodeId) ?? null;
      }
      const anchorBlockId = pendingProposal?.anchorBlockId ?? null;
      if (!targetBlock && anchorBlockId) {
        // fallback to anchor block
        targetBlock = allBlocks.find(b => b.id === anchorBlockId) ?? null;
      }
      if (!targetBlock) return null;

      const current = getBlockText(targetBlock);
      const proposed = typeof action.markdown === 'string' ? action.markdown : '';
      const a = current.split('\n');
      const b = proposed.split('\n');
      const ops = diffLines(a, b);
      const blockId: string = targetBlock.id;
      const sel = lineSelections[blockId] || {};

      const blockEl = getBlockEl(blockId);
      if (!blockEl) return null;
      // Compute screen position for a fixed overlay rendered into document.body
      const blockRect = blockEl.getBoundingClientRect();
      // Choose a compact width that fits the layout but avoids covering the block
      const panelWidth = Math.min(Math.max(280, Math.round(blockRect.width * 0.6)), 420);
      const gutter = 12;
      const estHeight = 260; // approx header + list (max-h-56)
      let top: number;
      let left: number;
      // 1) Prefer right-of-block
      if (blockRect.right + panelWidth + gutter <= window.innerWidth) {
        left = Math.round(blockRect.right + gutter);
        top = Math.max(8, Math.min(Math.round(blockRect.top), window.innerHeight - estHeight - 8));
      } else if (blockRect.left - panelWidth - gutter >= 0) {
        // 2) Otherwise, try left-of-block
        left = Math.round(blockRect.left - panelWidth - gutter);
        top = Math.max(8, Math.min(Math.round(blockRect.top), window.innerHeight - estHeight - 8));
      } else {
        // 3) Fallback: below if space, else above
        if (blockRect.bottom + gutter + estHeight <= window.innerHeight) {
          top = Math.round(blockRect.bottom + gutter);
        } else {
          top = Math.max(8, Math.round(blockRect.top - gutter - estHeight));
        }
        left = Math.max(8, Math.min(Math.round(blockRect.left), window.innerWidth - panelWidth - 8));
      }

      const toggle = (lineIndexKey: number, defaultAccepted: boolean) => {
        const next = { ...(lineSelections[blockId] || {}) };
        next[lineIndexKey] = !(next[lineIndexKey] ?? defaultAccepted);
        setLineSelections({ ...lineSelections, [blockId]: next });
      };

      const applySelected = () => {
        // Merge based on per-line selections. Default: keep current for deletions, include additions.
        const merged: string[] = [];
        for (const op of ops) {
          const key = op.aIdx ?? (100000 + (op.bIdx ?? 0));
          const accepted = sel[key] ?? (op.type === 'add');
          if (op.type === 'eq') { merged.push(op.line); }
          else if (op.type === 'del') { if (!accepted) { merged.push(op.line); } }
          else if (op.type === 'add') { if (accepted) { merged.push(op.line); } }
        }
        // Sanitize: strip any accidental HTML tags that could have leaked from overlays
        let newMarkdown = merged.join('\n')
          .replace(/<[^>]*data-nodebench-overlay[^>]*>.*?<\/[^>]+>/gsi, '')
          .replace(/<div[^>]*style="[^"]*position:\s*fixed[^"]*"[^>]*>[\s\S]*?<\/div>/gsi, '')
          .replace(/\n{3,}/g, '\n\n');

        newMarkdown = newMarkdown.trim();

        // Dispatch using global apply handler. If the block has a nodeId, updateNode; otherwise, createNode.
        const currentNodeId: Id<'nodes'> | null = getBlockNodeId(targetBlock);
        const actionToDispatch: AIToolAction = currentNodeId
          ? { type: 'updateNode', nodeId: currentNodeId, markdown: newMarkdown }
          : { type: 'createNode', parentId: null, markdown: newMarkdown };

        window.dispatchEvent(new CustomEvent('nodebench:applyActions', {
          detail: { actions: [actionToDispatch], anchorBlockId: blockId },
        }));
        // Optimistically clear the inline proposal UI
        setPendingProposal(null);
      };
      // Compute first changed line to display in header and in-block badge
      const firstChange = ops.find((op) => op.type !== 'eq');

      // Helper to visually highlight the target block while hovering lines
      const setBlockGlow = (on: boolean) => {
        const el = getBlockEl(blockId);
        if (!el) return;
        if (on) {
          el.style.outline = '2px solid var(--accent-primary)';
          el.style.outlineOffset = '-2px';
          el.style.transition = 'outline 120ms ease-in-out';
        } else {
          el.style.outline = '';
          el.style.outlineOffset = '';
        }
      };

      // Render a small diff panel overlayed near the target block
      return createPortal(
        <div
          contentEditable={false}
          data-nodebench-overlay
          className="rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
          style={{ position: 'fixed', top, left, width: panelWidth, zIndex: 60, pointerEvents: 'auto' }}
          aria-live="polite"
          onMouseDown={(e) => { e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); }}
        >
          <div className="px-2.5 py-1.5 border-b flex items-center justify-between gap-3">
            <div className="text-[11px] font-medium opacity-70">
              AI change{firstChange ? (
                <>
                  {' '}· Line{' '}
                  {typeof firstChange.aIdx === 'number'
                    ? firstChange.aIdx + 1
                    : typeof firstChange.bIdx === 'number'
                      ? firstChange.bIdx + 1
                      : '—'}
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={applySelected}
                className="text-[11px] px-2 py-0.5 rounded bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => setPendingProposal(null)}
                className="text-[11px] px-2 py-0.5 rounded border text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="max-h-56 overflow-auto p-2 text-[12px] leading-5">
            <div className="flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wide opacity-60">
              <div className="w-8 text-right">Orig</div>
              <div className="w-8 text-right">New</div>
              <div className="flex-1">Content</div>
            </div>
            {ops.filter(op => op.type !== 'eq').map((op, i) => {
              const key = op.aIdx ?? (100000 + (op.bIdx ?? 0));
              const defaultAccepted = op.type === 'add';
              const accepted = sel[key] ?? defaultAccepted;
              const base =
                op.type === 'eq' ? 'text-[var(--text-secondary)]' :
                op.type === 'add' ? 'ai-changes--new' :
                'ai-changes--old';
              const origNo = typeof op.aIdx === 'number' ? op.aIdx + 1 : '';
              const newNo = typeof op.bIdx === 'number' ? op.bIdx + 1 : '';
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-2 py-0.5 rounded ${base}`}
                  onMouseEnter={() => setBlockGlow(true)}
                  onMouseLeave={() => setBlockGlow(false)}
                >
                  {op.type !== 'eq' ? (
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={() => toggle(key, defaultAccepted)}
                      className="mt-0.5"
                    />
                  ) : (
                    <span className="w-[16px]" />
                  )}
                  <div className="w-8 text-right opacity-60 tabular-nums">{origNo}</div>
                  <div className="w-8 text-right opacity-60 tabular-nums">{newNo}</div>
                  <pre className="whitespace-pre-wrap break-words flex-1 m-0">{op.line || ''}</pre>
                </div>
              );
            })}
          </div>
        </div>,
        window.document.body
      );
    };

    // Render all proposal inline overlays
    if (!pendingProposal || overlayTargets.length === 0 || !container || typeof window === 'undefined' || !window.document?.body) {
      return null;
    }
    return (
      <>
        {overlayTargets.slice(0, 1).map(({ action }, i) => (
          <Fragment key={`inline-proposal-${i}`}>{renderInlineForAction(action, i)}</Fragment>
        ))}
      </>
    );
  };

  // (removed stray onRemove/persistOrder definitions that were injected erroneously)

  useEffect(() => {
    if (!sync.editor || slashRegisteredRef.current) return;

    const timer = setTimeout(() => {
      try {
        const editorAny: any = sync.editor;
        const slashMenu = editorAny.slashMenu;
        if (slashMenu && Array.isArray(slashMenu.items)) {
          const aiCommand = {
            title: "AI Action",
            description: "Use AI to generate or modify content",
            icon: () => <Bot className="h-4 w-4" />,
            onItemClick: async () => {
              const customPrompt = window.prompt("What would you like the AI to do?");
              if (customPrompt) {
                await handleAiAction(customPrompt);
              }
            }
          };
          if (!slashMenu.items.some((item: any) => item.title === "AI Action")) {
            slashMenu.items = [...slashMenu.items, aiCommand];
            slashRegisteredRef.current = true;
          }
        }
      } catch (err) {
        console.error("Failed to register AI slash command", err);
      }
    }, 500); // Give the editor time to fully initialize

    return () => clearTimeout(timer);
  }, [sync.editor, handleAiAction]);

  useEffect(() => {
    if (!sync.editor) return;
    const editor: any = sync.editor;
    if (editor._convexBridgeReady) return;
    editor._convexBridgeReady = true;

    console.debug("[ConvexBridge] Registering BlockNote listeners");

    const onInsert = async ({ blocks, parentBlock }: any) => {
      for (const block of blocks) {
        try {
          const parentId = getBlockNodeId(parentBlock) ?? undefined;
          const order = editor.topLevelBlocks.findIndex((b: any) => b.id === block.id);
          const newId = await addNode({
            documentId,
            parentId,
            order,
            type: block.type,
            json: block,
            text: block.type === "paragraph" && Array.isArray(block.content)
              ? block.content.filter((c: any) => c?.text).map((c: any) => c.text).join("")
              : undefined
          });
          editor.updateBlock(block.id, { props: { ...(block.props || {}), nodeId: newId } });
        } catch (err) {
          console.error("[ConvexBridge] Failed addNode", err);
        }
      }
    };

    const onUpdate = async ({ blocks }: any) => {
      // Enforce Heading 1 on the first block
      try {
        const ed: any = sync.editor;
        const first = ed?.topLevelBlocks?.[0];
        if (first && first.type !== 'heading') {
          runNonHistorical(editor, () => {
            ed.updateBlock(first.id, {
              type: 'heading',
              props: { level: 1 },
              content: first.content,
            });
          });
          setTimeout(() => { titleSyncRef.current.updatingFromTitle = false; }, 0);
        }
      } catch (e) {
        console.error('Enforce H1 on first block error', e);
      }

      // Per-block updates
      for (const block of blocks) {
        const nodeId = getBlockNodeId(block);
        if (!nodeId) continue;

        // If the updated block is the first top-level block, sync its plain text to the document title (debounced)
        try {
          const ed: any = sync.editor;
          const first = ed?.topLevelBlocks?.[0];
          if (!first) continue;
          if (block.id === first.id && !titleSyncRef.current.updatingFromBlock) {
            // Extract plain text from the block's content
            const text = Array.isArray(block.content)
              ? block.content.map((c: any) => (typeof c?.text === 'string' ? c.text : '')).join('').trim()
              : '';

            const newTitle = text || 'Untitled';
            // Equality guard: avoid no-op updates when title hasn't changed
            const currentTitle = (document?.title ?? 'Untitled').trim();
            if (newTitle.trim() === currentTitle) {
              continue;
            }
            if (titleDebounceRef.current) {
              window.clearTimeout(titleDebounceRef.current);
            }
            titleDebounceRef.current = window.setTimeout(() => {
              titleSyncRef.current.updatingFromBlock = true;
              updateDocument({ id: documentId, title: newTitle })
                .catch((e: unknown) => {
                  console.error('Failed to update document title from first block', e);
                })
                .finally(() => {
                  titleSyncRef.current.updatingFromBlock = false;
                });
            }, 400);
          }
        } catch (e) {
          console.error('Title sync (block->title) error', e);
        }
      }
    };

    const onRemove = async ({ blocks }: any) => {
      for (const block of blocks) {
        const nodeId = getBlockNodeId(block);
        if (!nodeId) continue;
        try {
          await removeNode({ nodeId });
        } catch (err) {
          console.error("[ConvexBridge] Failed removeNode", err);
        }
      }
    };

    const persistOrder = async () => {
      try {
        const blocks: any[] = editor?.topLevelBlocks ?? [];
        if (!Array.isArray(blocks) || blocks.length === 0) return;
        // Build current order map from server state to enable no-op guard
        const currentOrders = new Map<string, number>();
        for (const n of (nodes ?? [])) {
          currentOrders.set(String(n._id), (n as any).order ?? 0);
        }
        type NodeOrderUpdate = { nodeId: Id<"nodes">; order: number };
        const updates: NodeOrderUpdate[] = [];
        for (let idx = 0; idx < blocks.length; idx++) {
          const nodeId = getBlockNodeId(blocks[idx]);
          if (!nodeId) continue;
          const curr = currentOrders.get(String(nodeId));
          if (curr === idx) continue; // skip unchanged
          updates.push({ nodeId, order: idx });
        }
        if (updates.length === 0) return; // guard: nothing to persist
        await updateOrders({ updates });
      } catch (err) {
        console.error("[ConvexBridge] Failed batched reorder", err);
      }
    };

    const onMove = persistOrder;

    editor.on("blocks:insert", onInsert);
    editor.on("blocks:update", onUpdate);
    editor.on("blocks:remove", onRemove);
    editor.on("blocks:move", onMove);

    return () => {
      editor.off("blocks:insert", onInsert);
      editor.off("blocks:update", onUpdate);
      editor.off("blocks:remove", onRemove);
      editor.off("blocks:move", onMove);
      editor._convexBridgeReady = false;
    };
  }, [sync.editor, documentId, addNode, updateNode, removeNode, updateDocument, document?.title, nodes, runNonHistorical, updateOrders]);

  // Keep first block text in sync with document.title (title -> block)
  useEffect(() => {
    if (DISABLE_PROGRAMMATIC_MOUNT_MUTATIONS) return;
    if (!sync.editor || !document) return;
    try {
      const editor: any = sync.editor;
      const first = editor?.topLevelBlocks?.[0];
      if (!first) return;
      // Extract current first-block text
      const currentText = Array.isArray(first.content)
        ? first.content.map((c: any) => (typeof c?.text === 'string' ? c.text : '')).join('')
        : '';
      const desired = document.title ?? '';
      const level = first?.props?.level;
      const needsHeading = first.type !== 'heading' || level !== 1;
      if ((desired !== currentText || needsHeading) && !titleSyncRef.current.updatingFromBlock) {
        titleSyncRef.current.updatingFromTitle = true;
        try {
          runNonHistorical(editor, () => {
            editor.updateBlock(first.id, {
              // enforce Heading 1 and override content
              type: 'heading',
              props: { level: 1 },
              content: [{ type: 'text', text: desired }],
            });
          });
        } finally {
          // release flag on next tick to avoid immediate feedback
          setTimeout(() => {
            titleSyncRef.current.updatingFromTitle = false;
          }, 0);
        }
      }
    } catch (e) {
      console.error('Title sync (title->block) error', e);
    }
  }, [document?.title, sync.editor, document, runNonHistorical]);

  // Dev-only: surface only historical doc changes; hot-toggleable via localStorage key
  useEffect(() => {
    try {
      const ed: any = (sync as any)?.editor ?? null;
      if (!ed?.view) return;
      if (!debugDispatchEnabled) return;

      const view = ed.view;
      const orig = view.dispatch.bind(view);
      let timer: ReturnType<typeof setTimeout> | null = null;
      let buffer: any[] = [];

      // Guard: avoid double-wrapping dispatch if toggled rapidly
      const WRAPPED_KEY = "__nb_dispatch_wrapped" as const;
      if (view[WRAPPED_KEY]) {
        return () => {};
      }
      view[WRAPPED_KEY] = true;

      view.dispatch = (tr: any) => {
        if (tr?.docChanged) {
          const addToHistory = tr.getMeta && tr.getMeta('addToHistory');
          if (addToHistory !== false) {
            buffer.push({
              metaKeys: Object.keys(tr?.meta || {}),
              stepsSample: Array.isArray(tr?.steps)
                ? tr.steps.slice(0, 2).map((s: any) => (s?.toJSON?.() ?? String(s)))
                : [],
            });
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
              if (buffer.length) {
                try { console.log(`[docChanged (historical) x${buffer.length}]`, buffer.at(-1)); } catch { /* noop */ }
                buffer = [];
              }
            }, 250);
          }
        }
        return orig(tr);
      };

      return () => {
        view.dispatch = orig;
        try { delete view[WRAPPED_KEY]; } catch { /* noop */ }
        if (timer) clearTimeout(timer);
      };
    } catch { /* noop */ }
  }, [sync, sync.editor, debugDispatchEnabled]);

  useEffect(() => {
    if (!sync.editor) return;

    const handleSelectionChange = () => {
      const selection = sync.editor.getTextCursorPosition();
      if (selection.block) {
        // Add visual selection class
        window.document.querySelectorAll('.bn-block-outer').forEach((el: Element) => {
          el.setAttribute('data-block-selected', 'false');
        });
        const blockElement = window.document.querySelector(`[data-block-id="${selection.block.id}"]`);
        if (blockElement) {
          blockElement.closest('.bn-block-outer')?.setAttribute('data-block-selected', 'true');
        }
      }
    };

    // Listen for selection changes
    const unsubscribe = sync.editor.on("selectionChange" as any, handleSelectionChange);

    // Listen for click events only within THIS editor instance
    const currentEditorElement = editorContainerRef.current?.querySelector('.bn-editor');
    if (currentEditorElement) {
      currentEditorElement.addEventListener('click', handleSelectionChange);
    }

    return () => {
      unsubscribe();
      currentEditorElement?.removeEventListener('click', handleSelectionChange);
    };
  }, [sync.editor]);

  // Focus a specific node on request from AIChatPanel (e.g., after editDoc)
  useEffect(() => {
    const focusByNodeId = (nodeId: string, attempt = 0) => {
      const editorAny: any = sync.editor;
      if (!editorAny) {
        if (attempt < 5) setTimeout(() => focusByNodeId(nodeId, attempt + 1), 200);
        return;
      }
      const blocks: any[] = editorAny.topLevelBlocks ?? [];
      const target = blocks.find((b: any) => String(getBlockNodeId(b)) === String(nodeId));
      if (!target) {
        if (attempt < 5) setTimeout(() => focusByNodeId(nodeId, attempt + 1), 200);
        return;
      }
      requestAnimationFrame(() => {
        const el = window.document.querySelector<HTMLElement>(`[data-block-id="${target.id}"]`);
        const outer = (el?.closest('.bn-block-outer') as HTMLElement | null) ?? null;
        const targetEl = outer ?? el;
        if (targetEl) {
          try { targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* noop */ }
          try {
            targetEl.style.outline = '2px solid var(--accent-primary)';
            targetEl.style.outlineOffset = '-2px';
            setTimeout(() => {
              if (targetEl) {
                targetEl.style.outline = '';
                targetEl.style.outlineOffset = '';
              }
            }, 900);
          } catch { /* noop */ }
          const editable = targetEl.querySelector<HTMLElement>('[contenteditable="true"]');
          if (editable) {
            try { editable.focus(); } catch { /* noop */ }
          }
        }
      });
    };
    const onFocusNode = (evt: Event) => {
      const e = evt as CustomEvent;
      const detail = (e && (e as any).detail) || {};
      if (!detail || !detail.documentId || !detail.nodeId) return;
      if (detail.documentId !== documentId) return;
      focusByNodeId(String(detail.nodeId));
    };
    window.addEventListener('nodebench:focusNode', onFocusNode);
    return () => window.removeEventListener('nodebench:focusNode', onFocusNode);
  }, [documentId, sync.editor]);

  // Shortcuts (scoped to this editor):
  // - Ctrl/Cmd + Alt + T => Jump to top and insert an empty paragraph after the header
  // - Ctrl/Cmd + Alt + Y => Jump to top and insert/reuse today's date section with an editable paragraph and separator
  // - Ctrl/Cmd + Alt + H => Jump to top without creating anything; focus the first paragraph if present, else the header
  useEffect(() => {
    if (!sync.editor) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.altKey && (e.ctrlKey || e.metaKey) && typeof e.key === 'string')) return;
      const key = e.key.toLowerCase();
      if (key !== 't' && key !== 'y' && key !== 'h') return;

      const container = editorContainerRef.current;
      if (!container) return;

      // Ensure the event is coming from within this editor instance
      const active = window.document?.activeElement;
      const sel = window.getSelection();
      const withinThisEditor = !!(
        (active && container.contains(active)) ||
        (sel && sel.anchorNode && container.contains(sel.anchorNode))
      );
      if (!withinThisEditor) return;

      e.preventDefault();
      e.stopPropagation();

      try {
        const editor: any = sync.editor;
        const blocks = editor.topLevelBlocks || [];
        if (blocks.length === 0) return;

        const first = blocks[0];

        if (key === 't') {
          // Insert empty paragraph after header
          const inserted = editor.insertBlocks([{ type: 'paragraph' }], first, 'after')?.[0];
          if (inserted) editor.setTextCursorPosition(inserted, 'start');
        } else if (key === 'y') {
          // Insert or reuse today's date section
          const now = new Date();
          const headingText = `📍 ${now.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          })}`;

          const todayIndex = blocks.findIndex((b: any) => {
            if (b.type !== 'quote') return false;
            const text = Array.isArray(b.content)
              ? b.content.map((c: any) => (typeof c?.text === 'string' ? c.text : '')).join('')
              : (b.text ?? '');
            return text.trim() === headingText;
          });

          const shortDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          let targetEditable: any = null;

          if (todayIndex !== -1) {
            const after = blocks[todayIndex + 1];
            if (after && after.type === 'paragraph') {
              // Ensure the first paragraph (edit area) remains empty for user input
              const currentText = Array.isArray(after.content)
                ? after.content.map((c: any) => (typeof c?.text === 'string' ? c.text : '')).join('').trim()
                : '';
              if (currentText) {
                // Leave user's existing text untouched
              } else {
                // Keep as an empty paragraph for typing (no marker here)
                editor.updateBlock(after.id, { content: [] });
              }

              // Ensure a separate marker paragraph exists right below the edit area
              const maybeMarker = blocks[todayIndex + 2];
              const isMarkerParagraph = !!(
                maybeMarker && maybeMarker.type === 'paragraph' && Array.isArray(maybeMarker.content) &&
                maybeMarker.content.map((c: any) => (typeof c?.text === 'string' ? c.text : '')).join('').trim() === `[Above note is made on ${shortDate}]`
              );
              if (!isMarkerParagraph) {
                editor.insertBlocks([
                  { type: 'paragraph', content: [{ type: 'text', text: `[Above note is made on ${shortDate}]`, styles: { italic: true } }] },
                ], after, 'after');
                // Keep focus on edit area
              }
              targetEditable = after;
            } else {
              // Rebuild minimal section under the date: edit paragraph, marker, then keep existing separator if any
              const insertedEdit = editor.insertBlocks([
                { type: 'paragraph', content: [] },
              ], blocks[todayIndex], 'after');
              const editPara = insertedEdit?.[0] ?? null;
              if (editPara) {
                editor.insertBlocks([
                  { type: 'paragraph', content: [{ type: 'text', text: `[Above note is made on ${shortDate}]`, styles: { italic: true } }] },
                ], editPara, 'after');
                targetEditable = editPara;
              }
            }
          } else {
            // Create: quote header, empty edit paragraph, italic marker, separator
            const newBlocks = [
              { type: 'quote', content: [{ type: 'text', text: headingText }] },
              { type: 'paragraph', content: [] },
              { type: 'paragraph', content: [{ type: 'text', text: `[Above note is made on ${shortDate}]`, styles: { italic: true } }] },
              { type: 'paragraph', content: [{ type: 'text', text: '---' }] },
            ];
            const inserted = editor.insertBlocks(newBlocks, first, 'after');
            // Focus the newly created empty edit paragraph (index 1)
            targetEditable = inserted?.[1] ?? inserted?.[0] ?? null;
          }

          if (targetEditable) {
            editor.setTextCursorPosition(targetEditable, 'start');
          }
        } else if (key === 'h') {
          // Focus the first paragraph if it exists; otherwise focus the header itself
          const firstParagraph = blocks[1]?.type === 'paragraph' ? blocks[1] : null;
          const target = firstParagraph ?? first;
          if (target) editor.setTextCursorPosition(target, 'start');
        }

        // Smooth scroll to the top of the editor
        const firstBlockEl = container.querySelector('.bn-editor .bn-block-outer');
        if (firstBlockEl && firstBlockEl.scrollIntoView) {
          firstBlockEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          container.scrollTop = 0;
        }
      } catch (err) {
        console.error('Editor shortcut handling failed', err);
      }
    };

    // Prefer attaching to this editor's root element to avoid global binding
    const editorRoot = editorContainerRef.current?.querySelector('.bn-editor') as HTMLElement | null;
    if (editorRoot) {
      editorRoot.addEventListener('keydown', onKeyDown);
      return () => editorRoot.removeEventListener('keydown', onKeyDown);
    }

    // Fallback: attach to window
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sync.editor]);

  // Prevent BlockNote drag events from bubbling up to DocumentGrid's drag system
  const handleDragStart = useCallback((e: React.DragEvent) => {
    // Check if this drag originated from within BlockNote content
    const target = e.target as HTMLElement;
    if (target.closest('.bn-block') || target.closest('.ProseMirror')) {
      // This is a BlockNote internal drag - stop it from bubbling to grid
      e.stopPropagation();
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Only prevent drops from outside sources or other editors
    const editorElement = editorContainerRef.current;
    if (editorElement && !editorElement.contains(e.target as Node)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Allow BlockNote's internal drag operations to proceed normally
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    // Only prevent drops from outside sources or other editors
    const editorElement = editorContainerRef.current;
    if (editorElement && !editorElement.contains(e.target as Node)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Allow BlockNote's internal drop operations to proceed normally
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Check if this drag originated from within BlockNote content
    const target = e.target as HTMLElement;
    if (target.closest('.bn-block') || target.closest('.ProseMirror')) {
      // This is a BlockNote internal drag - stop it from bubbling to grid
      e.stopPropagation();
    }
  }, []);

  // NEW: Render error overlay when sync issues occur
  const renderErrorOverlay = () => {
    if (!syncError && !isRecovering) return null;

    const getErrorContent = () => {
      switch (syncError) {
        case 'SNAPSHOT_REQUIRED':
          return {
            title: 'Creating Checkpoint',
            message: 'Document has accumulated many changes. Creating a checkpoint to optimize performance...',
            icon: <Database className="h-6 w-6 text-blue-500" />,
            showActions: false,
          };
        case 'SNAPSHOT_AVAILABLE':
          return {
            title: 'Loading Checkpoint',
            message: 'Loading from the most recent checkpoint to optimize performance...',
            icon: <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />,
            showActions: false,
          };
        case 'MEMORY_LIMIT':
          return {
            title: 'Optimizing Storage',
            message: 'Document size limit reached. Creating an emergency checkpoint and optimizing storage...',
            icon: <AlertTriangle className="h-6 w-6 text-amber-500" />,
            showActions: false,
          };
        case 'INIT_MEMORY_ERROR':
          return {
            title: 'Loading Issue',
            message: 'Document is very large. Optimizing for better performance...',
            icon: <AlertTriangle className="h-6 w-6 text-amber-500" />,
            showActions: false,
          };
        case 'AUTH_ERROR':
          return {
            title: 'Authentication Required',
            message: 'Please log in again. Redirecting...',
            icon: <XCircle className="h-6 w-6 text-red-500" />,
            showActions: false,
          };
        case 'ACCESS_DENIED':
          return {
            title: 'Access Denied',
            message: 'You do not have permission to edit this document.',
            icon: <XCircle className="h-6 w-6 text-red-500" />,
            showActions: true,
          };
        case 'DOCUMENT_NOT_FOUND':
          return {
            title: 'Document Not Found',
            message: 'This document may have been deleted or moved.',
            icon: <XCircle className="h-6 w-6 text-red-500" />,
            showActions: true,
          };
        case 'DISCONNECTED':
          return {
            title: 'Connection Lost',
            message: 'Attempting to reconnect to the server...',
            icon: <AlertCircle className="h-6 w-6 text-amber-500" />,
            showActions: false,
          };
        case 'RECOVERY_FAILED':
          return {
            title: 'Recovery Failed',
            message: 'Unable to automatically recover. Please try the actions below.',
            icon: <XCircle className="h-6 w-6 text-red-500" />,
            showActions: true,
          };
        case 'INIT_FAILED':
          return {
            title: 'Failed to Load Editor',
            message: 'Unable to initialize the editor. Please refresh the page.',
            icon: <XCircle className="h-6 w-6 text-red-500" />,
            showActions: true,
          };
        case 'INIT_MAX_ATTEMPTS':
          return {
            title: 'Repeated Load Failures',
            message: 'The editor failed to load multiple times. There may be an issue with this document.',
            icon: <XCircle className="h-6 w-6 text-red-500" />,
            showActions: true,
          };
        default:
          if (syncError?.startsWith('SYNC_ERROR:')) {
            return {
              title: 'Sync Error',
              message: `Connection issue: ${syncError.replace('SYNC_ERROR: ', '')}`,
              icon: <AlertCircle className="h-6 w-6 text-amber-500" />,
              showActions: true,
            };
          }
          return {
            title: 'Unknown Error',
            message: syncError || 'An unknown error occurred.',
            icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
            showActions: true,
          };
      }
    };

    const errorContent = getErrorContent();

    return (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md mx-4">
          <div className="flex items-center gap-3 mb-4">
            {isRecovering ? (
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            ) : (
              errorContent.icon
            )}
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {isRecovering ? 'Recovering...' : errorContent.title}
            </h3>
          </div>

          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <p>{errorContent.message}</p>

            {isRecovering && (
              <p className="text-blue-600 dark:text-blue-400">
                This may take a few moments. Please don't close the page.
              </p>
            )}

            {syncError === 'RECOVERY_FAILED' && (
              <div className="text-red-600 dark:text-red-400">
                <p>Automatic recovery failed. Please try:</p>
                <ul className="list-disc ml-4 mt-2">
                  <li>Save your work elsewhere if possible</li>
                  <li>Refresh the page manually</li>
                  <li>Contact support if issues persist</li>
                </ul>
              </div>
            )}
          </div>

          {errorContent.showActions && !isRecovering && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] transition-colors"
              >
                Refresh Page
              </button>
              {syncError !== 'ACCESS_DENIED' && syncError !== 'DOCUMENT_NOT_FOUND' && (
                <button
                  onClick={() => {
                    setSyncError(null);
                    setInitializationAttempts(0);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] transition-colors"
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => setSyncError(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Format bytes to a compact label (e.g. 950 KB, 1.2 MB)
  const formatBytes = useCallback((bytes?: number | null): string | null => {
    if (typeof bytes !== 'number' || !isFinite(bytes) || bytes <= 0) return null;
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    const mb = kb / 1024;
    const val = mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10;
    return `${val} MB`;
  }, []);

  // NEW: Document health indicator
  const renderHealthIndicator = () => {
    if (!documentStats || isGridMode || syncError) return null;

    const { riskLevel, stepsSinceLastSnapshot, contentSize } = documentStats;
    const sizeLabel = formatBytes(contentSize);

    if (riskLevel === 'low') return null;

    const getIndicatorColor = () => {
      switch (riskLevel) {
        case 'critical': return 'bg-red-100 text-red-800 border-red-200';
        case 'high': return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default: return 'bg-blue-100 text-blue-800 border-blue-200';
      }
    };

    const getIndicatorIcon = () => {
      switch (riskLevel) {
        case 'critical': return <AlertTriangle className="h-4 w-4" />;
        case 'high': return <AlertCircle className="h-4 w-4" />;
        case 'medium': return <Database className="h-4 w-4" />;
        default: return <CheckCircle className="h-4 w-4" />;
      }
    };

    return (
      <div className={`fixed top-4 right-4 z-20 px-3 py-2 rounded-lg text-sm font-medium border ${getIndicatorColor()}`}>
        <div className="flex items-center gap-2">
          {getIndicatorIcon()}
          <span>
            {stepsSinceLastSnapshot} changes since checkpoint
          </span>
          {sizeLabel && (
            <span className="text-xs opacity-75">
              ({sizeLabel})
            </span>
          )}
          {(riskLevel === 'high' || riskLevel === 'critical') && (
            <button
              onClick={() => void handleSnapshotRecovery()}
              className="ml-2 px-2 py-1 bg-red-200 text-red-800 rounded text-xs hover:bg-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isRecovering}
            >
              {isRecovering ? 'Creating…' : 'Compress now'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // NEW: Sync status indicator
  const renderSyncStatus = () => {
    if (isGridMode || isFullscreen) return null;

    if (!syncError) return null;

    return (
      <div className="fixed bottom-4 left-4 z-20 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
        <div className="flex items-center gap-2">
          {syncError ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          <span>{syncError || 'Sync Status'}</span>
        </div>
      </div>
    );
  }

  if (document === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-[var(--text-muted)]">
          <XCircle className="h-12 w-12 mx-auto mb-3 text-red-400" />
          <p>Document not found.</p>
          <button
            onClick={() => window.history.back()}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!sync.editor && !syncError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
          <p className="text-sm text-[var(--text-muted)]">
            Initializing editor... (Attempt {initializationAttempts}/3)
          </p>
        </div>
      </div>
    );
  }

  // Determine UI visibility based on grid mode and fullscreen state
  const shouldShowAiActions = !isGridMode || isFullscreen;
  const shouldShowNodeHoverTracker = !isGridMode || isFullscreen;

  return (
    <EditorErrorBoundary onRetry={() => { setSyncError(null); setInitializationAttempts(0); }}>
    <div
      className={`prose prose-lg max-w-none relative editor-instance ${
        isGridMode && !isFullscreen ? 'minimal-grid-mode' : ''
      }`}
      ref={editorContainerRef}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-editor-id={documentId}
    >
      {/* Render error overlay if there are sync issues */}
      {renderErrorOverlay()}

      {/* Render health indicator */}
      {renderHealthIndicator()}

      {/* Render sync status */}
      {renderSyncStatus()}

      {/* Existing editor content */}
      {sync.editor && (
        <BlockNoteView
          editor={sync.editor}
          theme={isDarkMode ? "dark" : "light"}
          slashMenu={true}
          data-block-id-attribute="data-block-id"
        />
      )}

      {/* Node-level edit tracking with hover popovers - only show in fullscreen or non-grid mode */}
      {shouldShowNodeHoverTracker && sync.editor && (
        <NodeHoverTracker
          documentId={documentId}
          editorContainer={editorContainerRef.current}
        />
      )}
      {/* Mention hover preview for @mentions */}
      {sync.editor && (
        <MentionHoverPreview
          editorContainer={editorContainerRef.current}
          sourceDocumentId={documentId}
        />
      )}
      {/* Tag hover preview for #hashtags */}
      {sync.editor && (
        <TagHoverPreview
          editorContainer={editorContainerRef.current}
        />
      )}
      {/* Inline proposal decorations anchored to current block */}
      {pendingProposal && <ProposalInlineDecorations />}

      {/* Spacer to ensure editor content isn't obscured by the proposal panel when visible */}
      {pendingProposal && (
        <div className="h-36" />
      )}

      {/* AI Actions - only show in fullscreen or non-grid mode */}
      {shouldShowAiActions && sync.editor && !syncError && (
        <div className="fixed bottom-8 right-8 z-10 flex flex-col items-end gap-4">
          <div
            className={`flex flex-col items-end gap-3 transition-all duration-300 ease-in-out ${
              isAiMenuOpen
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            {aiActions.map((action) => (
              <div key={action.label} className="flex items-center gap-3 group">
                <span className="bg-[var(--bg-primary)] text-sm text-[var(--text-secondary)] px-3 py-1.5 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-[var(--border-color)]">
                  {action.label}
                </span>
                <button
                  onClick={() => {
                    if (typeof action.onClick === 'function') {
                      action.onClick();
                    } else if (typeof action.prompt === 'string') {
                      void handleAiAction(action.prompt);
                    }
                  }}
                  disabled={isRecovering || (typeof action.onClick !== 'function' && isGenerating)}
                  className="flex items-center justify-center w-12 h-12 bg-[var(--bg-primary)] text-[var(--accent-primary)] rounded-full shadow-md hover:shadow-lg hover:scale-105 hover:brightness-105 active:scale-100 active:brightness-100 transition-all border border-[var(--border-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:opacity-50 disabled:scale-100"
                >
                  {action.icon}
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setIsAiMenuOpen(!isAiMenuOpen)}
            disabled={isGenerating || isRecovering}
            title="AI Actions"
            className="flex items-center justify-center w-14 h-14 bg-[var(--accent-primary)] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 hover:brightness-105 active:scale-100 active:brightness-100 transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-50 disabled:scale-100 hover:bg-[var(--accent-primary-hover)]"
          >
            {isGenerating ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : isAiMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Sparkles className="h-6 w-6" />
            )}
          </button>
        </div>
      )}
    </div>
    </EditorErrorBoundary>
  );
}