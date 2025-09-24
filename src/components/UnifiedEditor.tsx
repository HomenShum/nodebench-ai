import React, { useEffect, useMemo, useState, useCallback, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { BlockNoteView } from "@blocknote/mantine";
import { useTiptapSync } from "@convex-dev/prosemirror-sync/tiptap";
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useBlockNoteSync } from "@convex-dev/prosemirror-sync/blocknote";
import { useQuery, useMutation } from "convex/react";

import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";

import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";


import { ProposalProvider, useProposal } from "./proposals/ProposalProvider";
import { ProposalBar } from "./proposals/ProposalBar";

import { computeStructuredOps, prismHighlight, detectFenceLang, diffWords, annotateMoves, type AnnotatedOp, type MovePair } from "./proposals/diffUtils";

export type EditorMode = "quickEdit" | "quickNote" | "full";

export interface UnifiedEditorProps {
  documentId: Id<"documents">;
  mode?: EditorMode;
  isGridMode?: boolean;
  isFullscreen?: boolean;
  // If false, editor renders in view-only mode (no edits, no slash menu)
  editable?: boolean;
  // If true, automatically initialize an empty document when none exists (skips the "Create document" button)
  autoCreateIfEmpty?: boolean;
  // Optional: when creating a new doc (or when empty), seed from this markdown (e.g., last output)
  seedMarkdown?: string;
  // Signal to force-restore from provided markdown (increments to trigger)
  restoreSignal?: number;
  // Markdown to use for restore/seed operations
  restoreMarkdown?: string;
  // Provide a way for parent to extract plain text from the editor
  registerExporter?: (fn: () => Promise<{ plain: string }>) => void;
}

/**
 * UnifiedEditor
 * - Single canonical editor based on BlockNote + Convex ProseMirror sync
 * - Supports three modes via lightweight UI/behavior switches
 *   - quickEdit: compact UI for small edits
 *   - quickNote: minimal single-note feel (no slash menu, compact paddings)
 *   - full: full-featured document editor
 */
export default function UnifiedEditor({ documentId, mode = "full", isGridMode, isFullscreen, editable = true, autoCreateIfEmpty = false, seedMarkdown, restoreSignal, restoreMarkdown, registerExporter }: UnifiedEditorProps) {


  // Explicit Convex refs required by the sync hook
  const pmRefs = useMemo(() => ({
    getSnapshot: api.prosemirror.getSnapshot,
    latestVersion: api.prosemirror.latestVersion,
    getSteps: api.prosemirror.getSteps,
    submitSteps: api.prosemirror.submitSteps,
    submitSnapshot: api.prosemirror.submitSnapshot,
  }), []);

  // Editor configuration by mode
  const isCompact = mode === "quickEdit" || mode === "quickNote";
  const disableSlashMenu = mode === "quickNote" || !editable; // keep super light or when view-only

  const editorOptions = useMemo(() => ({
    _tiptapOptions: {
      extensions: [
        // Task/checklist support
        TaskList,
        TaskItem.configure({ nested: true }),
        // Standard list nodes for legacy content
        ListItem,
        BulletList,
        OrderedList,
      ],
    },
  }), []);

  const sync = useBlockNoteSync(pmRefs as any, documentId, {
    editorOptions,
    snapshotDebounceMs: 2000,
    onSyncError: (error: Error) => {
      console.warn("[UnifiedEditor] sync error:", error?.message || String(error));
    },
  });

  // --- AI proposal/apply wiring (parity with NB3, minimal overlay) ---
  type AIToolAction = {
    type: 'createDocument' | 'updateDocument' | 'archiveDocument' | 'findDocuments' | 'createNode' | 'updateNode' | 'archiveNode';
    documentId?: Id<'documents'>;
    title?: string;
    content?: unknown;
    nodeId?: Id<'nodes'>;
    parentId?: Id<'nodes'> | null;
    markdown?: string;
    // Optional semantic anchor: resolve target position by heading text
    anchorHeading?: string;
  };

  // Server-side content flag via agentsPrefs
  const prefs = useQuery((api as any).agentsPrefs.getAgentsPrefs, {} as any) as (Record<string, string> | undefined);
  const serverHadContent = useMemo(() => {
    try { return (prefs && prefs[`doc.hasContent.${String(documentId)}`] === '1') || false; } catch { return false; }
  }, [prefs, documentId]);
  const setAgentsPrefs = useMutation((api as any).agentsPrefs.setAgentsPrefs);
  const serverMarkedRef = useRef(false);
  const markHasContent = useCallback(async () => {
    if (serverMarkedRef.current) return;
    serverMarkedRef.current = true;
    try {
      await setAgentsPrefs({ prefs: { [`doc.hasContent.${String(documentId)}`]: '1' } as any });
    } catch {}
  }, [setAgentsPrefs, documentId]);

  const [pendingProposal, setPendingProposal] = useState<null | { message: string; actions: AIToolAction[]; anchorBlockId: string | null }>(null);
  const attemptedAutoCreateRef = useRef(false);
  const attemptedSeedRef = useRef(false);

  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  // Ensure file/doc notes exist without requiring a manual click
  useEffect(() => {
    if (autoCreateIfEmpty && !sync.editor && !attemptedAutoCreateRef.current) {
      attemptedAutoCreateRef.current = true;
      try {
        void sync.create?.({ type: "doc", content: [] } as any);
      } catch (e) {
        console.warn("[UnifiedEditor] autoCreateIfEmpty failed", e);
      }
    }
  }, [autoCreateIfEmpty, sync]);

  // Helper: get current or last block as a reasonable default target
  const getCurrentOrLastBlock = useCallback((): any | null => {
    try {
      const anyEd: any = sync.editor as any;
      const pos = anyEd?.getTextCursorPosition?.();
      if (pos?.block) return pos.block;
      const all = anyEd?.topLevelBlocks ?? [];
      return all.length ? all[all.length - 1] : null;
    } catch { return null; }
  }, [sync.editor]);

  // Rich markdown -> BlockNote blocks using BlockNote's own parser
  const bnEnsureTopLevelBlock = (maybeBlock: any): any => {
    if (!maybeBlock || typeof maybeBlock !== "object") return { type: "paragraph", content: [] };
    if ((maybeBlock.type === "doc" || maybeBlock.type === "blockGroup") && Array.isArray(maybeBlock.content)) {
      return { _flattenFromDoc: true, content: maybeBlock.content } as any;
    }
    if (maybeBlock.type === "text" && typeof (maybeBlock.text) === "string") {
      return { type: "paragraph", content: [{ type: "text", text: String(maybeBlock.text) }] };
    }
    if (maybeBlock.type && Array.isArray(maybeBlock.content)) {
      return { type: maybeBlock.type, content: maybeBlock.content, props: maybeBlock.props };
    }
    return { type: "paragraph", content: [] };
  };



  const parserEditor = useMemo(() => BlockNoteEditor.create(), []);

  const blocksFromMarkdown = useCallback(async (md?: string): Promise<any[]> => {
    const txt = (md ?? '').trim();
    if (!txt) return [];
    try {
      const rawBlocks: PartialBlock[] = await parserEditor.tryParseMarkdownToBlocks(txt);
      const unwrapLocal = (blocks: PartialBlock[]): PartialBlock[] => {
        const out: PartialBlock[] = [];
        const push = (b: any) => {
          if (!b) return;
          if (b._flattenFromDoc && Array.isArray(b.content)) {
            for (const c of b.content) push(bnEnsureTopLevelBlock(c));
            return;
          }
          if (b.type && b.type !== "blockGroup") out.push(b);
        };
        for (const b of blocks) push(bnEnsureTopLevelBlock(b as any));
        return out;
      };
      const unwrapped = unwrapLocal(rawBlocks);
      const normalized = unwrapped
        .map((b: any) => bnEnsureTopLevelBlock(b))
        .filter((b: any) => b && b.type && !["blockGroup", "text"].includes(b.type));
      return normalized;
    } catch (e) {
      console.warn('[UnifiedEditor] markdown parse failed, falling back to paragraph', e);
      return [{ type: 'paragraph', content: [{ type: 'text', text: txt }] }];
    }
  }, [parserEditor]);

  // Seed the document with provided markdown if editor exists and doc is empty or trivial
  useEffect(() => {
    const editor: any = sync.editor as any;
    if (!editor) return;
    if (attemptedSeedRef.current) return;

    // Note: Do NOT skip seeding purely based on a local flag; only seed when the doc is actually empty/trivial.
    // This ensures previously created "null" docs still get seeded on first render.

    const blocks: any[] = Array.isArray(editor.topLevelBlocks) ? editor.topLevelBlocks : [];
    const extractText = (n: any): string => {
      if (!n) return '';
      if (typeof n === 'string') return n;
      if (Array.isArray(n)) return n.map(extractText).join('');
      if (n.type === 'text' && typeof n.text === 'string') return n.text;
      if (Array.isArray(n.content)) return n.content.map(extractText).join('');
      if (Array.isArray(n.children)) return n.children.map(extractText).join('');
      return '';
    };
    const plain = blocks.map(extractText).join('');
    const isTriviallyEmpty = plain.replace(/\s+/g, '').length === 0;

    const seed = (seedMarkdown || '').trim();
    const localHad = (() => { try { return window.localStorage.getItem(`nb.doc.hasContent.${String(documentId)}`) === '1'; } catch { return false; } })();
    const hadEverContent = (!!serverHadContent) || localHad;
    if (isTriviallyEmpty && seed) {
      // If the doc ever had content and is now empty, assume user intentionally cleared it; do not auto-reseed
      if (hadEverContent) { attemptedSeedRef.current = true; return; }
      attemptedSeedRef.current = true;
      void (async () => {
        try {
          const newBlocks = await blocksFromMarkdown(seed);
          if (Array.isArray(newBlocks) && newBlocks.length > 0) {
            const existing: any[] = Array.isArray(editor.topLevelBlocks) ? editor.topLevelBlocks : [];
            // Replace existing (possibly empty) blocks with seeded blocks
            editor.replaceBlocks(existing, newBlocks);
            // Mark document as having content
            try { window.localStorage.setItem(`nb.doc.hasContent.${String(documentId)}`, '1'); } catch {} ; void markHasContent();
          }
        } catch (e) {
          console.warn('[UnifiedEditor] failed to seed from markdown', e);
        }
      })();
    }
  }, [sync.editor, seedMarkdown, blocksFromMarkdown, documentId, serverHadContent, markHasContent]);

  // Restore from provided markdown when signal changes
  useEffect(() => {
    const editor: any = sync.editor as any;
    if (!editor) return;
    if (typeof restoreSignal !== 'number') return;
    const seed = (restoreMarkdown || '').trim();
    if (!seed) return;
    void (async () => {
      try {
        const newBlocks = await blocksFromMarkdown(seed);
        const existing: any[] = Array.isArray(editor.topLevelBlocks) ? editor.topLevelBlocks : [];
        editor.replaceBlocks(existing, newBlocks);
        try { window.localStorage.setItem(`nb.doc.hasContent.${String(documentId)}`, '1'); } catch {} ; void markHasContent();
      } catch (e) {
        console.warn('[UnifiedEditor] restore failed', e);
      }
    })();
  }, [restoreSignal, restoreMarkdown, blocksFromMarkdown, sync.editor, documentId, markHasContent]);

  // Helper: resolve target block by heading text (case-insensitive)
  const resolvePositionByHeading = useCallback((heading: string): any | null => {
    try {
      const anyEd: any = sync.editor as any;
      const blocks: any[] = anyEd?.topLevelBlocks ?? [];
      const needle = heading.trim().toLowerCase();
      return blocks.find((b: any) => {
        if (b?.type !== 'heading') return false;
        const text = (b?.content || []).map((c: any) => (typeof c?.text === 'string' ? c.text : '')).join(' ').trim().toLowerCase();
        return text === needle;
      }) ?? null;
    } catch { return null; }
  }, [sync.editor]);

  const findBlockByNodeId = useCallback((nodeId: string): any | null => {
    try {
      const anyEd: any = sync.editor as any;
      const all: any[] = anyEd?.topLevelBlocks ?? [];
      return all.find((b: any) => String(b?.props?.nodeId ?? "") === nodeId) ?? null;
    } catch { return null; }
  }, [sync.editor]);

  // Apply a set of actions (minimal: updateNode/createNode with markdown)
  const applyActions = useCallback(async (actions: AIToolAction[], detail?: any) => {
    const editor: any = sync.editor as any;
    if (!editor) return;
    let anchor: any | null = null;
    // Prefer explicit block id if provided in event detail
    try {
      const anchorId: string | undefined = typeof detail?.anchorBlockId === 'string' ? detail.anchorBlockId : undefined;
      if (anchorId) {
        const all = editor.topLevelBlocks ?? [];
        anchor = all.find((b: any) => b.id === anchorId) ?? null;
      }
    } catch { /* noop */ }

    for (const action of actions) {
      if (action.type === 'updateDocument' && typeof action.title === 'string') {
        // Title rename handled elsewhere via toolbar; ignore in UnifiedEditor for now
        continue;
      }
      if ((action.type === 'updateNode' || action.type === 'createNode') && typeof action.markdown === 'string') {
        // Resolve target precedence: nodeId -> per-action anchorBlockId -> action.anchorHeading -> event anchor -> current/last
        let target: any | null = null;
        const nodeId: string | undefined = (action as any)?.nodeId;
        const perActionAnchorId: string | undefined = (action as any)?.anchorBlockId;
        if (nodeId) target = findBlockByNodeId(String(nodeId));
        if (!target && perActionAnchorId) {
          try {
            const all = editor.topLevelBlocks ?? [];
            target = all.find((b: any) => b.id === perActionAnchorId) ?? null;
          } catch { /* noop */ }
        }
        if (!target && action.anchorHeading) target = resolvePositionByHeading(action.anchorHeading);
        if (!target) target = anchor ?? getCurrentOrLastBlock();

        const newBlocks = await blocksFromMarkdown(action.markdown);
        if (!newBlocks.length) continue;
        if (action.type === 'updateNode' && target) {
          if (newBlocks.length === 1) {
            editor.updateBlock(target.id, newBlocks[0]);
          } else {
            editor.replaceBlocks([target], newBlocks);
          }
        } else if (action.type === 'createNode' && target) {
          editor.insertBlocks(newBlocks, target, 'after');
        } else if (action.type === 'createNode' && !target) {
          // Fallback: append to end
          const all = editor.topLevelBlocks ?? [];
          const last = all.length ? all[all.length - 1] : null;
          if (last) editor.insertBlocks(newBlocks, last, 'after');
          else editor.replaceBlocks([], newBlocks);
        }
      }
    }
  }, [sync.editor, blocksFromMarkdown, getCurrentOrLastBlock, resolvePositionByHeading, findBlockByNodeId]);

  // Listen for proposals and apply requests from AIChatPanel/test buttons
  useEffect(() => {
    const onProposal = (evt: Event) => {
      const e = evt as CustomEvent<any>;
      const detail = e?.detail || {};
      const actions: AIToolAction[] = Array.isArray(detail?.actions) ? detail.actions : [];
      const message: string = typeof detail?.message === 'string' ? detail.message : 'AI proposed changes';
      if (!actions.length) return;
      // Compute a reasonable anchor block id (current selection -> second block -> first)
      let anchorBlockId: string | null = null;
      try {
        const anyEd: any = sync.editor as any;
        const pos = anyEd?.getTextCursorPosition?.();
        if (pos?.block?.id) anchorBlockId = String(pos.block.id);
        if (!anchorBlockId) {
          const all: any[] = anyEd?.topLevelBlocks ?? [];
          const first = all?.[0] ?? null;
          const second = all?.[1] ?? null;
          anchorBlockId = second?.id ?? first?.id ?? null;
        }
      } catch { /* noop */ }
      setPendingProposal({ message, actions, anchorBlockId });
    };
    const onApply = (evt: Event) => {
      const e = evt as CustomEvent<any>;
      const detail = e?.detail || {};
      const actions: AIToolAction[] = Array.isArray(detail?.actions) ? detail.actions : [];
      if (!actions.length) return;
      void applyActions(actions, detail);
      setPendingProposal(null);
    };
    window.addEventListener('nodebench:aiProposal', onProposal);
    window.addEventListener('nodebench:applyActions', onApply);
    return () => {
      window.removeEventListener('nodebench:aiProposal', onProposal);
      window.removeEventListener('nodebench:applyActions', onApply);
    };
  }, [applyActions, sync.editor]);

  // Enable hidden Tiptap shadow editor only when AI Chat is active
  const [aiChatActive, setAiChatActive] = useState(false);
  useEffect(() => {
    const onMount = () => setAiChatActive(true);
    const onUnmount = () => setAiChatActive(false);
    window.addEventListener('nodebench:aiChat:mounted', onMount as EventListener);
    window.addEventListener('nodebench:aiChat:unmounted', onUnmount as EventListener);
    return () => {
      window.removeEventListener('nodebench:aiChat:mounted', onMount as EventListener);
      window.removeEventListener('nodebench:aiChat:unmounted', onUnmount as EventListener);
    };
  }, []);

  // Bridge component that exposes PM context + accepts PM operations
  const PmBridge: React.FC<{ documentId: string | Id<"documents"> | undefined }>
    = ({ documentId }) => {
    const { editor } = useCurrentEditor();

    useEffect(() => {
      if (!editor) return;
      const buildContext = () => {
        try {
          const json = editor.state.doc.toJSON();
          const { from, to } = editor.state.selection;
          const nodes: any[] = [];
          editor.state.doc.descendants((node: any, pos: number) => {
            const entry: any = { type: node.type.name, from: pos, to: pos + node.nodeSize };
            if (node.attrs && Object.keys(node.attrs).length) entry.attrs = node.attrs;
            if (node.isText && typeof node.text === 'string') entry.text = node.text;
            nodes.push(entry);
          });
          return { doc: json, selection: { from, to }, nodes };
        } catch (e) {
          console.warn('[PM Bridge] buildContext failed', e);
          return null;
        }
      };

      const onRequest = (evt: Event) => {
        const e = evt as CustomEvent<{ requestId: string }>;
        const ctx = buildContext();
        try {
          window.dispatchEvent(new CustomEvent('nodebench:ai:pmContext', {
            detail: { requestId: e.detail?.requestId, documentId, context: ctx },
          }));
        } catch (err) {
          console.warn('[PM Bridge] failed to dispatch pmContext', err);
        }
      };

      const onApply = (evt: Event) => {
        const e = evt as CustomEvent<{ operations?: any[]; documentId?: string }>; // loose type
        const ops: any[] = Array.isArray(e.detail?.operations) ? e.detail?.operations : [];
        const anchorOccurrenceStrategy = (e.detail as any)?.anchorOccurrenceStrategy as ("nearest" | "next" | "prev" | undefined);
        if (!ops.length) return;
        try {
          editor.chain().focus();

          // Build a text index to map plain-text offsets to PM positions
          const segments: { text: string; plainStart: number; plainEnd: number; pmStart: number; pmEnd: number }[] = [];
          let plainCursor = 0;
          const doc = editor.state.doc;
          doc.descendants((node, pos) => {
            if (node.isText && typeof node.text === 'string') {
              const text = node.text;
              const pmStart = pos;
              const pmEnd = pos + node.nodeSize; // for text, nodeSize === text.length
              const plainStart = plainCursor;
              const plainEnd = plainStart + text.length;
              segments.push({ text, plainStart, plainEnd, pmStart, pmEnd });
              plainCursor = plainEnd;
            }
          });
          const fullPlain = segments.map(s => s.text).join('');
          const plainToPm = (offset: number): number | null => {
            if (offset < 0) return null;
            for (const s of segments) {
              if (offset >= s.plainStart && offset <= s.plainEnd) {
                const delta = offset - s.plainStart;
                return s.pmStart + delta;
              }
            }
            return null;
          };

          const pmToPlain = (pos: number): number | null => {
            for (const s of segments) {
              const len = s.plainEnd - s.plainStart;
              if (pos >= s.pmStart && pos <= s.pmStart + len) {
                const delta = pos - s.pmStart;
                return s.plainStart + delta;
              }
            }
            return null;
          };


          for (const op of ops) {
            if (!op || typeof op !== 'object') continue;

            if (op.type === 'replace' && typeof op.from === 'number' && typeof op.to === 'number') {
              const content = op.content ?? [];
              editor.chain().deleteRange({ from: op.from, to: op.to }).insertContentAt(op.from, content).run();

            } else if (op.type === 'insert' && typeof op.at === 'number') {
              const content = op.content ?? [];
              editor.chain().insertContentAt(op.at, content).run();

            } else if (op.type === 'delete' && typeof op.from === 'number' && typeof op.to === 'number') {
              editor.chain().deleteRange({ from: op.from, to: op.to }).run();

            } else if (op.type === 'setAttrs' && typeof op.pos === 'number' && op.attrs && typeof op.attrs === 'object') {
              // Best-effort node attribute update at a position
              editor.commands.command(({ tr, state }) => {
                try {
                  const $pos = state.doc.resolve(op.pos);
                  const node = $pos.nodeAfter || $pos.parent?.maybeChild($pos.index());
                  if (!node) return false;
                  const type = node.type;
                  tr.setNodeMarkup(op.pos, type, { ...(node.attrs || {}), ...(op.attrs || {}) });
                  return true;
                } catch {
                  return false;
                }
              });

            } else if (op.type === 'anchoredReplace' && typeof op.anchor === 'string') {
              const anchor: string = op.anchor;
              const toDelete: string = typeof op.delete === 'string' ? op.delete : '';
              const toInsert: string = typeof op.insert === 'string' ? op.insert : '';

              // Find all occurrences of the anchor in the flattened plain text
              const occ: number[] = [];
              if (anchor.length > 0) {
                let i = 0;
                while (i <= fullPlain.length) {
                  const j = fullPlain.indexOf(anchor, i);
                  if (j === -1) break;
                  occ.push(j);
                  i = j + Math.max(1, anchor.length);
                }
              }

              if (occ.length === 0) {
                console.warn('[PM Bridge] anchoredReplace: anchor not found', { anchor });
                continue;
              }

              // Prefer the occurrence closest to the current selection; allow next/prev cycling
              const selPm = editor.state.selection?.from ?? 0;
              const selPlain = pmToPlain(selPm) ?? 0;
              let nearestValue = occ[0];
              let nearestIdx = 0;
              let bestDist = Math.abs(nearestValue - selPlain);
              for (let k = 0; k < occ.length; k++) {
                const val = occ[k];
                const d = Math.abs(val - selPlain);
                if (d < bestDist) { bestDist = d; nearestValue = val; nearestIdx = k; }
              }
              let chosenIdx = nearestIdx;
              if (anchorOccurrenceStrategy === 'next' && occ.length > 1) {
                chosenIdx = (nearestIdx + 1) % occ.length;
              } else if (anchorOccurrenceStrategy === 'prev' && occ.length > 1) {
                chosenIdx = (nearestIdx - 1 + occ.length) % occ.length;
              }
              const bestIdx = occ[chosenIdx];

              const fromPlain = bestIdx + anchor.length;
              const toPlain = fromPlain + toDelete.length;
              const pmFrom = plainToPm(fromPlain);
              const pmTo = plainToPm(toPlain);
              if (typeof pmFrom === 'number' && typeof pmTo === 'number') {
                const chain = editor.chain().deleteRange({ from: pmFrom, to: pmTo });
                if (toInsert) chain.insertContentAt(pmFrom, toInsert);
                chain.run();
              } else {
                console.warn('[PM Bridge] anchoredReplace: failed to map plain offsets', { fromPlain, toPlain, anchor });
              }

            } else if (op.type === 'replaceDocument' && typeof op.content === 'string') {
              editor.commands.clearContent(true);
              if (op.content) editor.chain().insertContent(op.content).run();
            }
          }
        } catch (err) {
          console.warn('[PM Bridge] apply operations failed', err);
        }
      };

      window.addEventListener('nodebench:ai:requestPmContext', onRequest as EventListener);
      window.addEventListener('nodebench:ai:applyPmOperations', onApply as EventListener);
      return () => {
        window.removeEventListener('nodebench:ai:requestPmContext', onRequest as EventListener);
        window.removeEventListener('nodebench:ai:applyPmOperations', onApply as EventListener);
      };
    }, [editor, documentId]);

    // Broadcast editor focus/selection with a lightweight preview for Chat auto-selection and chips
    useEffect(() => {
      const editor: any = (sync as any)?.editor;
      if (!editor) return;
      const emit = () => {
        try {
          // Prefer current block text; fallback to small slice of doc
          let preview = '';
          try {
            const blk = getCurrentOrLastBlock();
            if (blk) preview = (getBlockText(blk) || '').slice(0, 200);
          } catch {}
          if (!preview) {
            try {
              const texts: string[] = [];
  // Expose exporter to parent
  useEffect(() => {
    if (!registerExporter) return;
    const ed: any = sync.editor as any;
    if (!ed) return;
    registerExporter(async () => {
      try {
        const blocks: any[] = ed?.topLevelBlocks ?? [];
        const plain = blocks.map(getBlockText).join('\n\n');
        return { plain };
      } catch {
        return { plain: '' };
      }
    });
  }, [registerExporter, sync.editor, getBlockText]);

              editor.state.doc.descendants((n: any) => { if (n.isText && typeof n.text === 'string') texts.push(n.text); });
              preview = texts.join(' ').slice(0, 200);
            } catch {}
          }
          window.dispatchEvent(new CustomEvent('nodebench:editor:focused', { detail: { documentId, preview } }));
          // Persist a local flag indicating this doc has content, to avoid reseeding on next mount
          if ((preview || '').trim().length > 0) {
            try { window.localStorage.setItem(`nb.doc.hasContent.${String(documentId)}`, '1'); } catch {} ; void markHasContent();
          }
        } catch {}
      };
      try { emit(); } catch {}
  // Expose exporter to parent

      try { editor.on('selectionUpdate', emit); } catch {}
      try { editor.on('update', emit); } catch {}
      return () => {
        try { editor.off?.('selectionUpdate', emit); } catch {}
        try { editor.off?.('update', emit); } catch {}
      };
    }, [sync.editor, documentId, getCurrentOrLastBlock, getBlockText]);

  // Expose exporter to parent
  useEffect(() => {
    if (!registerExporter) return;
    const ed: any = sync.editor as any;
    if (!ed) return;
    registerExporter(async () => {
      try {
        const blocks: any[] = ed?.topLevelBlocks ?? [];
        const plain = blocks.map(getBlockText).join('\n\n');
        return { plain };
      } catch {
        return { plain: '' };
      }
    });
  }, [registerExporter, sync.editor, getBlockText]);


    return null;
  };

  // Hidden Tiptap editor used only for PM context/exact offsets
  const ShadowTiptap: React.FC = () => {
    const syncTT = useTiptapSync(pmRefs as any, documentId);
    if (syncTT.isLoading || syncTT.initialContent === null) return null;
    return (
      <div style={{ display: 'none' }} aria-hidden>
        {(() => {
          const json = syncTT.initialContent as any;
          const containsBN = JSON.stringify(json).includes('blockContainer') || JSON.stringify(json).includes('blockGroup');
          const extractText = (node: any): string => {
            if (!node) return '';

            if (typeof node === 'string') return node;
            if (Array.isArray(node)) return node.map(extractText).join(' ');
            const type = node.type;
            if (type === 'text' && typeof node.text === 'string') return node.text;
            const content = Array.isArray(node.content) ? node.content : [];
            return content.map(extractText).join(' ');
          };
          const safeContent = containsBN
            ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: extractText(json) }] }] }
            : json;
          return (
            <EditorProvider content={safeContent as any} extensions={[StarterKit, syncTT.extension]}>
              <PmBridge documentId={documentId} />
            </EditorProvider>
          );
        })()}
      </div>
    );
  };


  // Helpers for diff overlay

  // Inspector state and toggle (header button dispatches nodebench:toggleInspector)
  const [showInspector, setShowInspector] = useState(false);
  useEffect(() => {
    const onToggle = () => setShowInspector((s) => !s);
    window.addEventListener('nodebench:toggleInspector', onToggle as EventListener);
    return () => window.removeEventListener('nodebench:toggleInspector', onToggle as EventListener);
  }, []);

  const getBlockText = useCallback((block: any): string => {
    const texts: string[] = [];
    const walk = (n: any) => {
      if (!n) return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (n.type === 'text' && typeof n.text === 'string') { texts.push(n.text); }
      if (Array.isArray(n.content)) n.content.forEach(walk);
    };
    try { walk(block); } catch {}
    return texts.join('');
  }, []);

  type LineOp = { type: 'eq' | 'del' | 'add'; line: string; aIdx?: number; bIdx?: number };
  const diffLines = useCallback((a: string[], b: string[]): LineOp[] => {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const ops: LineOp[] = [];
    let i = 0, j = 0;
    while (i < m && j < n) {
      if (a[i] === b[j]) { ops.push({ type: 'eq', line: a[i], aIdx: i, bIdx: j }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'del', line: a[i], aIdx: i }); i++; }
      else { ops.push({ type: 'add', line: b[j], bIdx: j }); j++; }
    }
    while (i < m) { ops.push({ type: 'del', line: a[i], aIdx: i }); i++; }
    while (j < n) { ops.push({ type: 'add', line: b[j], bIdx: j }); j++; }
    return ops;
  }, []);

  const getBlockEl = useCallback((blockId: string): HTMLElement | null => {
    const root = editorContainerRef.current;
    try {
      return (root?.querySelector?.(`[data-block-id="${blockId}"], [data-id="${blockId}"]`) as HTMLElement) || null;
    } catch {
      return null;
    }
  }, [editorContainerRef]);

  // Inspector renderer: Builds a ProseMirror-like JSON with from/to offsets
  const InspectorPanel: React.FC<{ editorRef: any }> = ({ editorRef }) => {
    const [tick, setTick] = useState(0);
    const build = useCallback(() => {
      const ed: any = editorRef as any;
      const blocks: any[] = ed?.topLevelBlocks ?? [];
      let pos = 0;
      const makeMarks = (styles: any): any[] | undefined => {
        try {
          const marks: any[] = [];
          const s = styles || {};
          if (s.bold) marks.push({ type: 'bold' });
          if (s.italic) marks.push({ type: 'italic' });
          if (s.code) marks.push({ type: 'code' });
          return marks.length ? marks : undefined;
        } catch { return undefined; }
      };
      const walkInline = (nodes: any[]): any[] => {
        const out: any[] = [];
        for (const n of (nodes || [])) {
          if (!n) continue;
          if (n.type === 'text' && typeof n.text === 'string') {
            const from = pos; const len = n.text.length; pos += len; const to = pos;
            const marks = makeMarks(n.styles || n.marks || n.props);
            const base: any = { type: 'text', from, to, text: n.text };
            if (marks) base.marks = marks;
            out.push(base);
          } else if (n.type === 'lineBreak' || n.type === 'hardBreak') {
            const from = pos; pos += 1; const to = pos; out.push({ type: 'hardBreak', from, to });
          } else if (Array.isArray(n.content)) {
            out.push(...walkInline(n.content));
          }
        }
        return out;
      };
      const walkBlock = (b: any): any | null => {
        if (!b || typeof b !== 'object') return null;
        const raw = String(b.type || 'paragraph');
        const allowed = ['heading','paragraph','bulletList','orderedList','listItem','codeBlock','blockquote'];
        const type = allowed.includes(raw) ? raw : 'paragraph';
        const attrs: any = (type === 'heading')
          ? { level: Number(b?.props?.level ?? 1) }
          : (type === 'codeBlock')
            ? { language: (b?.props?.language ?? b?.props?.lang ?? null) }
            : undefined;

        const nodeFrom = pos; pos += 1; // open token

        let content: any[] = [];
        const maybe = b?.content ?? b?.children ?? [];
        const looksInline = Array.isArray(maybe) && maybe.some((n: any) => n && (
          n.type === 'text' || n.type === 'hardBreak' || n.type === 'lineBreak' || typeof n?.text === 'string'
        ));
        if (looksInline) {
          content = walkInline(maybe);
        } else if (Array.isArray(maybe)) {
          content = maybe.map(walkBlock).filter(Boolean) as any[];
        }

        const nodeTo = pos + 1; pos = nodeTo; // close token
        const node: any = { type, from: nodeFrom, to: nodeTo };
        if (attrs) node.attrs = attrs;
        if (content.length) node.content = content;
        return node;
      };
      const content = blocks.map(walkBlock).filter(Boolean);
      const doc: any = { type: 'doc', from: 0, to: pos, content };
      return doc;
    }, [editorRef]);

    const json = useMemo(() => { void tick; return build(); }, [build, tick]);

    const handleCopy = useCallback(() => {
      try { void navigator.clipboard.writeText(JSON.stringify(json, null, 2)); } catch {}
    }, [json]);

    return (
      <div className="mb-3 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
        <div className="px-2 py-1.5 flex items-center justify-between border-b border-[var(--border-color)]">
          <div className="text-xs font-semibold">Inspect</div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-0.5 text-[11px] rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]" onClick={() => setTick((x) => x + 1)}>Refresh</button>
            <button className="px-2 py-0.5 text-[11px] rounded bg-[var(--accent-primary)] text-white hover:opacity-90" onClick={handleCopy}>Copy</button>
          </div>
        </div>
        <pre className="p-2 overflow-auto text-[12px] leading-tight max-h-64 whitespace-pre-wrap">
{JSON.stringify(json, null, 2)}
        </pre>
      </div>
    );
  };

  const computeProposalTargets = useCallback(() => {
    const targets: Array<{ blockId: string; nodeId?: string; ops: { type: 'eq'|'add'|'del'; line: string }[]; action: any }> = [];
    try {
      if (!pendingProposal) return targets;
      const actions = (pendingProposal.actions || []).filter((a: any) => typeof (a as any)?.markdown === 'string');
      const anyEd: any = sync.editor as any;
      const allBlocks: any[] = anyEd?.topLevelBlocks ?? [];
      for (const action of actions) {
        let blk: any | null = null;
        if (action.nodeId) blk = findBlockByNodeId(String(action.nodeId));
        if (!blk) {
          const perAnchor = (action as any)?.anchorBlockId ?? pendingProposal.anchorBlockId;
          if (perAnchor) blk = allBlocks.find(b => b.id === perAnchor) ?? null;
        }
        if (!blk) continue;
        const current = getBlockText(blk);
        const proposed = String(action.markdown || '');
        const { ops } = computeStructuredOps(current, proposed);
        targets.push({ blockId: blk.id, nodeId: action.nodeId, ops, action });
      }
    } catch {}
    return targets;
  }, [pendingProposal, sync.editor, diffLines, getBlockText]);








  const [positionTick, setPositionTick] = useState(0);
  void positionTick;
  useEffect(() => {
    const root = editorContainerRef.current;
    const handle = () => setPositionTick((t) => t + 1);
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    root?.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
      root?.removeEventListener('scroll', handle, true);
    };
  }, []);

  // Revert to a previous local checkpoint by applying inverse actions


  const ProposalInlineDecorations = () => {
    const { selections, toggleLine, setBlockDefaults } = useProposal();

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const overlayIndexRef = useRef(0);
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (!pendingProposal) return;
        const overlays = Array.from(document.querySelectorAll('[data-nodebench-overlay]')) as HTMLElement[];
        if (e.key === 'j' || e.key === 'J') {
          if (overlays.length === 0) return;
          overlayIndexRef.current = (overlayIndexRef.current + 1) % overlays.length;

          overlays[overlayIndexRef.current]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } else if (e.key === 'k' || e.key === 'K') {
          if (overlays.length === 0) return;
          overlayIndexRef.current = (overlayIndexRef.current - 1 + overlays.length) % overlays.length;
          overlays[overlayIndexRef.current]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } else if (e.key === 'Enter') {
          try {
            const targets = computeProposalTargets();
            const actions: any[] = [];
            for (const t of targets) {
              const sel = selections[t.blockId] || {};
              const merged: string[] = [];
              for (let k = 0; k < t.ops.length; k++) {
                const op = t.ops[k];
                const accepted = sel[k] ?? (op.type === 'add');
                if (op.type === 'eq') merged.push(op.line);
                else if (op.type === 'del') { if (!accepted) merged.push(op.line); }
                else if (op.type === 'add') { if (accepted) merged.push(op.line); }
              }
              const markdown = merged.join('\n').replace(/\n{3,}/g, '\n\n').trim();
              const base = t.action?.nodeId ? { type: 'updateNode', nodeId: t.action.nodeId, markdown } : { type: 'createNode', markdown };
              actions.push({ ...base, anchorBlockId: t.blockId });
            }
            window.dispatchEvent(new CustomEvent('nodebench:applyActions', { detail: { actions } }));
            setPendingProposal(null);
          } catch { /* ignore */ }
        } else if (e.key === 'Escape') {
          setPendingProposal(null);
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [pendingProposal, selections, computeProposalTargets]);

    // Initialize default line selections (accept adds and moved deletions) after render
    useEffect(() => {
      if (!pendingProposal) return;
      try {
        const seen = new Set<string>();
        for (const action of (pendingProposal.actions || []) as any[]) {
          let blk = findBlockByNodeId(action.nodeId);
          if (!blk && pendingProposal.anchorBlockId) {
            try {
              const anyEd: any = sync.editor as any;
              const top: any[] = anyEd?.topLevelBlocks ?? [];
              blk = top.find((b: any) => b.id === pendingProposal.anchorBlockId) ?? null;
            } catch { /* noop */ }
          }
          if (!blk) continue;
          if (seen.has(blk.id)) continue;
          seen.add(blk.id);
          if (selections[blk.id]) continue; // already initialized
          const current = getBlockText(blk);
          const proposed = String(action.markdown || '');
          const { ops } = computeStructuredOps(current, proposed);
          const { ops: annotatedOps } = annotateMoves(ops);
          const defaults: Record<number, boolean> = {};
          annotatedOps.forEach((op: any, idx: number) => {
            if (op.type === 'add') defaults[idx] = true;
            if (op.type === 'del' && op.moved) defaults[idx] = true;
          });
          setBlockDefaults(blk.id, defaults);
        }
      } catch { /* ignore */ }
    }, [pendingProposal, selections, findBlockByNodeId, getBlockText, computeStructuredOps, annotateMoves, setBlockDefaults, sync.editor]);


    const container = editorContainerRef.current;
    const actions = pendingProposal?.actions?.filter(a => typeof (a as any)?.markdown === 'string') as any[] | undefined;
    if (!pendingProposal || !actions || actions.length === 0 || !container || typeof window === 'undefined' || !window.document?.body) return null;

    const anyEd: any = sync.editor as any;
    const allBlocks: any[] = anyEd?.topLevelBlocks ?? [];


    // Unique overlay targets by block id
    const seen = new Set<string>();
    const overlayTargets: Array<{ action: any; block: any }> = [];
    for (const action of actions) {
      let blk: any | null = null;
      if (action.nodeId) {
        blk = findBlockByNodeId(String(action.nodeId));
      }
      if (!blk && pendingProposal.anchorBlockId) {
        blk = allBlocks.find(b => b.id === pendingProposal.anchorBlockId) ?? null;
      }
      if (!blk) continue;
      if (seen.has(blk.id)) continue;
      seen.add(blk.id);
      overlayTargets.push({ action, block: blk });
    }

    if (overlayTargets.length === 0) return null;

    const renderOverlay = (action: any, blk: any, i: number) => {
      const current = getBlockText(blk);
      const proposed = String(action.markdown || '');
      const { ops } = computeStructuredOps(current, proposed);
      const { ops: annotatedOps, pairs } = annotateMoves(ops);
      // Default selections: accept adds; for moved items, also accept deletion (to avoid duplicates)
      const defaults: Record<number, boolean> = {};
      annotatedOps.forEach((op, idx) => {
        if (op.type === 'add') defaults[idx] = true;
        if (op.type === 'del' && op.moved) defaults[idx] = true;
      });

      const toFrom = new Map<number, number>();
      const fromTo = new Map<number, number>();
      pairs.forEach(p => { fromTo.set(p.from, p.to); toFrom.set(p.to, p.from); });

      const blockEl = getBlockEl(blk.id);
      if (!blockEl) return null;
      const rect = blockEl.getBoundingClientRect();
      const panelWidth = Math.min(Math.max(280, Math.round(rect.width * 0.6)), 420);
      const gutter = 12;
      const left = Math.min(rect.left + window.scrollX + gutter, window.scrollX + window.innerWidth - panelWidth - 16);
      const top = Math.max(16, rect.top + window.scrollY + 4);

      const sel = selections[blk.id] || {};

      const applySelected = () => {
        const merged: string[] = [];
        for (let k = 0; k < ops.length; k++) {
          const op = ops[k];
          const accepted = sel[k] ?? (op.type === 'add');
          if (op.type === 'eq') merged.push(op.line);
          else if (op.type === 'del') { if (!accepted) merged.push(op.line); }
          else if (op.type === 'add') { if (accepted) merged.push(op.line); }
        }
        const newMarkdown = merged.join('\n').replace(/\n{3,}/g, '\n\n').trim();
        const actionToDispatch = action.nodeId
          ? { type: 'updateNode', nodeId: action.nodeId, markdown: newMarkdown }
          : { type: 'createNode', markdown: newMarkdown };
        try {
          window.dispatchEvent(new CustomEvent('nodebench:applyActions', {
            detail: { actions: [actionToDispatch], anchorBlockId: blk.id },
          }));
        } catch { /* ignore */ }
        setPendingProposal(null);
      };

      return createPortal(
        <div
          key={`inline-proposal-${blk.id}`}
          contentEditable={false}
          data-nodebench-overlay
          className="rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
          style={{ position: 'fixed', top, left, width: panelWidth, zIndex: 60, pointerEvents: 'auto' }}
          aria-live="polite"
          onMouseDown={(e) => { e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); }}
        >
          <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between gap-3">
            <div className="text-xs font-medium truncate">Proposed change</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setExpanded((prev) => ({ ...prev, [blk.id]: !prev[blk.id] }))} className="text-[11px] px-2 py-0.5 rounded border">
                {expanded[blk.id] ? 'Collapse' : 'Expand'}
              </button>
              <button onClick={applySelected} className="text-[11px] px-2 py-0.5 rounded bg-[var(--accent-primary)] text-white">Apply</button>
              <button onClick={() => setPendingProposal(null)} className="text-[11px] px-2 py-0.5 rounded border">Dismiss</button>
            </div>
          </div>
          {expanded[blk.id] ? (
            <div className="p-3 grid grid-cols-2 gap-3 max-h-56 overflow-auto text-[12px] leading-[1.2] nb-code-pane">
              <pre className="bg-[var(--bg-secondary)]/60 rounded p-2 overflow-auto"><code dangerouslySetInnerHTML={{ __html: prismHighlight(current, detectFenceLang(proposed)) }} /></pre>
              <pre className="bg-[var(--bg-secondary)]/60 rounded p-2 overflow-auto"><code dangerouslySetInnerHTML={{ __html: prismHighlight(proposed, detectFenceLang(proposed)) }} /></pre>
            </div>
          ) : (
            <div className="max-h-56 overflow-auto text-[12px] leading-[1.2]">
              <ul className="px-3 py-2 space-y-1">
                {annotatedOps.slice(0, 200).map((op, idx) => {
                  // Skip rendering the 'from' half of a moved pair; render only at the 'to' index
                  if (op.moved && op.role === 'from') return null;
                  let rowClass = 'text-[var(--text-secondary)] nb-diff-row';
                  let sym = ' ';
                  if (op.moved && op.role === 'to') {
                    rowClass = 'nb-diff-row moved nb-moved text-purple-700 dark:text-purple-300';
                    sym = '↕';
                  } else if (op.type === 'add') {
                    rowClass = 'nb-diff-row add ai-changes--new';
                    sym = '+';
                  } else if (op.type === 'del') {
                    rowClass = 'nb-diff-row del ai-changes--old';
                    sym = '-';
                  }

                  const partnerFromIdx = op.moved && op.role === 'to' ? toFrom.get(idx) : undefined;
                  const partnerFromLine = (typeof partnerFromIdx === 'number') ? annotatedOps[partnerFromIdx].line : undefined;
                  const words = (partnerFromLine !== undefined) ? diffWords(partnerFromLine, op.line) : undefined;

                  const checked = sel[idx] ?? (op.type === 'add');

                  const onToggle = () => {
                    if (partnerFromIdx !== undefined) {
                      toggleLine(blk.id, idx);
                      toggleLine(blk.id, partnerFromIdx);
                    } else {
                      toggleLine(blk.id, idx);
                    }
                  };

                  return (
                    <li key={idx} className={rowClass}>
                      <label className="inline-flex items-start gap-2 cursor-pointer select-none w-full">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          onChange={onToggle}
                        />
                        <span className="flex-1">
                          <span className="inline-block w-3 select-none" title={op.moved ? 'Moved' : op.type === 'add' ? 'Added' : op.type === 'del' ? 'Deleted' : ''}>{sym}</span>
                          {words ? (
                            <span className="whitespace-pre-wrap">
                              <span className="text-red-700 dark:text-red-300" dangerouslySetInnerHTML={{ __html: words.oldHtml }} />
                              <span className="mx-1 text-[var(--text-secondary)]">→</span>
                              <span className="text-green-700 dark:text-green-300" dangerouslySetInnerHTML={{ __html: words.newHtml }} />
                            </span>
                          ) : (
                            <span className="whitespace-pre-wrap">{op.line}</span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>,
        window.document.body
      );
    };

    return <>{overlayTargets.map(({ action, block }, i) => (<Fragment key={block.id}>{renderOverlay(action, block, i)}</Fragment>))}</>;
  };

  if (sync.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-2 text-sm text-[var(--text-secondary)]">

          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-primary)]" />
          Loading editor…
        </div>
      </div>
    );
  }

  if (!sync.editor) {
    if (autoCreateIfEmpty) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--accent-primary)]" />
            Preparing notes…
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <button
          className="px-3 py-1.5 text-sm rounded bg-[var(--accent-primary)] text-white"
          onClick={() => { void sync.create?.({ type: "doc", content: [] } as any); }}
        >
          Create document
        </button>
      </div>
    );
  }

  const enableProposalUI = ((import.meta as any)?.env?.VITE_PROPOSAL_UI === 'on');
  const proposalTargets = (enableProposalUI && editable && pendingProposal) ? computeProposalTargets() : [] as any[];
  return (
    <ProposalProvider>
      <div
      ref={editorContainerRef}
      className={`max-w-none relative ${isCompact ? "prose prose-sm" : "prose prose-lg"} ${
        isGridMode && !isFullscreen ? "minimal-grid-mode" : ""
      }`}
      data-editor-id={documentId}
    >

	      {aiChatActive && <ShadowTiptap />}

      {pendingProposal && (
        <div className="absolute top-2 right-2 z-10 bg-[var(--bg-secondary)]/95 backdrop-blur border border-[var(--border-color)] rounded-md shadow p-2 flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)] truncate max-w-[260px]" title={pendingProposal.message}>
            {pendingProposal.message}
          </span>
          <button
            className="px-2 py-0.5 text-xs rounded bg-[var(--accent-primary)] text-white hover:opacity-90"
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent('nodebench:applyActions', { detail: { actions: pendingProposal.actions, anchorBlockId: pendingProposal.anchorBlockId } }));
              } catch { /* ignore */ }
            }}
          >
            Apply
          </button>
          <button
            className="px-2 py-0.5 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
            onClick={() => setPendingProposal(null)}
          >
            Dismiss
          </button>
        </div>

      )}
      {editable && enableProposalUI && pendingProposal && Array.isArray(proposalTargets) && (proposalTargets as any[]).length > 0 && (
        <ProposalBar targets={proposalTargets as any} onDismiss={() => setPendingProposal(null)} />
      )}
      {editable && pendingProposal && <ProposalInlineDecorations />}

          <BlockNoteView
            editor={sync.editor}
            theme={document?.documentElement?.classList?.contains?.("dark") ? "dark" : "light"}
            slashMenu={!disableSlashMenu}
            editable={editable as any}
            data-block-id-attribute="data-block-id"
          />
        </div>
      </ProposalProvider>
    );
  }

