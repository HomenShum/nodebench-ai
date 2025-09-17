import React, { useCallback, useEffect, useRef } from "react";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Checklist from "@editorjs/checklist";
import Delimiter from "@editorjs/delimiter";
import Quote from "@editorjs/quote";
import CodeTool from "@editorjs/code";
import { useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { applyNodeOps, sanitizeBlocks, type EditorNodeAction } from "../../lib/editorNodeOps";

// Fallback sanitizer if the imported one is unavailable or throws
function fallbackSanitizeBlocks(blocks: any): Array<{ type: string; data: any }> {
  if (!Array.isArray(blocks)) return [{ type: "paragraph", data: { text: "" } }];
  return blocks.map((block: any) => {
    if (!block || typeof block !== "object") return { type: "paragraph", data: { text: "" } };
    const type = block.type || "paragraph";
    const data = { ...(block.data || {}) } as any;
    if (type === "paragraph") {
      if (data.text === undefined || data.text === null) data.text = "";
      else data.text = String(data.text);
    }
    return { type, data };
  });
}

export default function InlineRichEditor({
  value,
  onChange,
  placeholder,
  initialJson,
  registerSaveExtractor,
  documentId,
  enableMentions,
  enableProposals,
}: {
  value: string;
  onChange: (md: string) => void;
  placeholder?: string;
  initialJson?: string | null;
  registerSaveExtractor?: (fn: () => Promise<any>) => void;
  documentId?: Id<"documents">;
  enableMentions?: boolean;
  enableProposals?: boolean;
}) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const lastAppliedTextRef = useRef<string>("");
  const changeTimer = useRef<number | null>(null);
  const convex = useConvex();
  const pluginCleanupRef = useRef<Array<() => void>>([]);
  const didDecorateRef = useRef<boolean>(false);

  

  // Mirror EditorJSMainView: accept EditorJS JSON, ProseMirror doc, or plain text
  const parseToEditorJs = useCallback((raw: string): any => {
    const sanitizeFn = (typeof sanitizeBlocks === "function" ? sanitizeBlocks : fallbackSanitizeBlocks) as (b: any) => any;
    if (!raw) return { time: Date.now(), blocks: [{ type: "paragraph", data: { text: "" } }], version: "2.31.0" };
    try {
      const json: any = JSON.parse(raw);
      // EditorJS format already
      if (json && Array.isArray(json?.blocks)) {
        const blocks = sanitizeFn(json.blocks);
        return { time: json.time ?? Date.now(), blocks, version: json.version ?? "2.31.0" };
      }
      // ProseMirror doc -> convert
      if (json && json.type === "doc" && Array.isArray(json.content)) {
        const blocks: any[] = [];
        const toText = (node: any): string => {
          if (!node) return "";
          if (typeof node.text === "string") return node.text;
          if (Array.isArray(node.content)) return node.content.map(toText).join("");
          return "";
        };
        const handleNodes = (nodes: any[]) => {
          for (const n of nodes) {
            switch (n?.type) {
              case "heading": {
                const level = Math.min(6, Number(n.attrs?.level || 1));
                blocks.push({ type: "header", data: { level, text: toText(n) } });
                break;
              }
              case "paragraph": {
                blocks.push({ type: "paragraph", data: { text: toText(n) } });
                break;
              }
              case "quote": {
                blocks.push({ type: "quote", data: { text: toText(n) } });
                break;
              }
              case "codeBlock": {
                const codeText = (n.content && n.content[0]?.text) || "";
                blocks.push({ type: "code", data: { code: codeText } });
                break;
              }
              case "bulletList":
              case "orderedList": {
                const style = n.type === "orderedList" ? "ordered" : "unordered";
                const items = (n.content || []).map((li: any) => toText(li)).filter(Boolean);
                blocks.push({ type: "list", data: { style, items } });
                break;
              }
              case "taskList": {
                const items = (n.content || []).map((ti: any) => ({ text: toText(ti), checked: !!ti.attrs?.checked }));
                blocks.push({ type: "checklist", data: { items } });
                break;
              }
              case "horizontalRule": {
                blocks.push({ type: "delimiter", data: {} });
                break;
              }
              default: {
                const txt = toText(n);
                if (txt) blocks.push({ type: "paragraph", data: { text: txt } });
              }
            }
          }
        };
        handleNodes(json.content);
        return { time: Date.now(), blocks: sanitizeFn(blocks), version: "2.31.0" };
      }
    } catch {
      // not JSON
    }
    // Plain text fallback -> paragraphs split by blank lines, preserving <br> for single newlines
    const text = (raw ?? "").trim();
    if (!text) return { time: Date.now(), blocks: [{ type: "paragraph", data: { text: "" } }], version: "2.31.0" };
    const paras = text.split(/\n\n+/).map((p) => p.replace(/\n/g, "<br>"));
    const blocks = paras.map((p) => ({ type: "paragraph", data: { text: p || "" } }));
    return { time: Date.now(), blocks: sanitizeFn(blocks), version: "2.31.0" };
  }, []);

  const blocksToPlainText = useCallback((data: any): string => {
    try {
      const blocks: any[] = Array.isArray(data?.blocks) ? data.blocks : [];
      const lines: string[] = [];
      for (const b of blocks) {
        switch (b.type) {
          case "header":
            lines.push("# ".repeat(Math.min(6, b.data?.level || 1)) + (b.data?.text || ""));
            break;
          case "list": {
            const style = (b.data?.style || "unordered") as string;
            const items: string[] = Array.isArray(b.data?.items) ? b.data.items : [];
            for (let i = 0; i < items.length; i++) {
              const prefix = style === "ordered" ? `${i + 1}. ` : "- ";
              lines.push(prefix + items[i]);
            }
            break;
          }
          case "quote":
            lines.push("> " + (b.data?.text || ""));
            break;
          case "delimiter":
            lines.push("---");
            break;
          case "code":
            lines.push("```\n" + (b.data?.code || "") + "\n```");
            break;
          case "paragraph":
          default:
            lines.push(String(b.data?.text || "").replace(/<br\s*\/?>/g, "\n"));
        }
      }
      return lines.join("\n\n").trimEnd();
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!holderRef.current) return;
      try {
        const data = parseToEditorJs((initialJson ?? undefined) || (value ?? ""));
        try { console.debug('[InlineRichEditor] init data', data); } catch {}
        lastAppliedTextRef.current = blocksToPlainText(data);
        const ed = new EditorJS({
          holder: holderRef.current,
          minHeight: 120,
          autofocus: true,
          placeholder: placeholder || "Write details…",
          data,
          tools: {
            header: {
              class: Header,
              inlineToolbar: true,
              config: { levels: [2, 3, 4], defaultLevel: 2 },
            },
            list: { class: List, inlineToolbar: true },
            checklist: { class: Checklist, inlineToolbar: true },
            delimiter: Delimiter,
            quote: { class: Quote, inlineToolbar: true },
            code: CodeTool,
          },
          inlineToolbar: true,
          onChange: () => {
            if (changeTimer.current) window.clearTimeout(changeTimer.current);
            changeTimer.current = window.setTimeout(() => {
              ed
                .save()
                .then((output) => {
                  try {
                    console.debug('[InlineRichEditor] onChange.save output', output);
                    const invalids: any[] = Array.isArray((output as any)?.blocks)
                      ? (output as any).blocks.filter((b: any) => b?.type === 'paragraph' && !(b?.data && typeof b.data.text === 'string'))
                      : [];
                    if (invalids.length) {
                      console.warn('[InlineRichEditor] Detected invalid paragraph blocks in save output', invalids);
                      // Self-heal: sanitize immediately and re-render to correct EditorJS state
                      const sanitizeFn = (typeof sanitizeBlocks === "function" ? sanitizeBlocks : fallbackSanitizeBlocks) as (b: any) => any;
                      const healed = { ...(output as any), blocks: sanitizeFn((output as any)?.blocks || []) };
                      try { console.debug('[InlineRichEditor] self-heal render', healed); } catch {}
                      ed.render(healed as any).catch((e: any) => {
                        try { console.warn('[InlineRichEditor] self-heal render failed', e); } catch {}
                      });
                    }
                  } catch {}
                  const plain = blocksToPlainText(output);
                  if (plain !== lastAppliedTextRef.current) {
                    lastAppliedTextRef.current = plain;
                    onChange(plain);
                  }
                })
                .catch((e) => {
                  try { console.warn('[InlineRichEditor] onChange.save error', e); } catch {}
                });
            }, 200);
          },
        });
        editorRef.current = ed;
        if (registerSaveExtractor) {
          registerSaveExtractor(() => ed.save());
        }

        // Register lightweight EditorJS plugins for @mentions, #hashtags, and AI proposals
        pluginCleanupRef.current = [];
        if (enableMentions && documentId) {
          try {
            const cleanup = registerMentionsPlugin({ ed, holder: holderRef.current!, convex, documentId });
            if (cleanup) pluginCleanupRef.current.push(cleanup);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("Mentions plugin failed to init", e);
          }
        }
        if (enableProposals) {
          try {
            const cleanup = registerAiProposalPlugin({
              ed,
              holder: holderRef.current!,
              onPersist: (plain: string) => {
                // Update our last-applied cache and bubble to parent so it saves
                lastAppliedTextRef.current = plain;
                onChange(plain);
              },
            });
            if (cleanup) pluginCleanupRef.current.push(cleanup);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("AI proposal plugin failed to init", e);
          }
        }

        // One-time decoration pass: convert raw @title and #tag into tokens
        if (!didDecorateRef.current) {
          didDecorateRef.current = true;
          try {
            const cleanup = decorateRawMentionsAndTags({ root: holderRef.current!, convex });
            if (cleanup) pluginCleanupRef.current.push(cleanup);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("Decoration pass failed", e);
          }
        }
      } catch (err) {
        console.error("Failed to init InlineRichEditor", err);
      }
    };
    void init();
    return () => {
      if (changeTimer.current) window.clearTimeout(changeTimer.current);
      try {
        // Cleanup plugin listeners first
        for (const fn of pluginCleanupRef.current) {
          try { fn(); } catch { /* noop */ }
        }
        pluginCleanupRef.current = [];
      } catch { /* noop */ }
      try {
        editorRef.current?.destroy?.();
      } catch {
        /* no-op */
      }
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const data = parseToEditorJs((initialJson ?? undefined) || (value ?? ""));
    const nextText = blocksToPlainText(data);
    if (nextText === lastAppliedTextRef.current) return;
    lastAppliedTextRef.current = nextText;
    try {
      try { console.debug('[InlineRichEditor] effect render data', data); } catch {}
      ed.render(data).catch((e: any) => {
        try { console.warn('[InlineRichEditor] ed.render rejected', e); } catch {}
      });
    } catch {
      // ignore
    }
  }, [value, initialJson, parseToEditorJs, blocksToPlainText]);

  return (
    <div className="min-h-[120px]">
      <div ref={holderRef} className="min-h-[120px] px-3 py-2 text-sm" />
      {!editorRef.current && (
        <div className="text-[12px] text-[var(--text-muted)] px-3 py-2">{placeholder || "Loading editor…"}</div>
      )}
    </div>
  );
}

// --- Plugins ---

type MentionsPluginArgs = {
  ed: EditorJS;
  holder: HTMLElement;
  convex: ReturnType<typeof useConvex>;
  documentId: Id<"documents">;
};

function registerMentionsPlugin({ ed, holder, convex, documentId }: MentionsPluginArgs) {
  let active = false;
  let trigger: "@" | "#" | null = null;
  let anchorRange: Range | null = null;
  let panel: HTMLDivElement | null = null;
  let query = "";

  const closePanel = () => {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
    active = false;
    trigger = null;
    anchorRange = null;
    query = "";
  };

  const positionPanelAtSelection = (el: HTMLElement) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    el.style.position = "absolute";
    el.style.left = `${Math.round(rect.left + window.scrollX)}px`;
    el.style.top = `${Math.round(rect.bottom + window.scrollY)}px`;
  };

  const renderPanel = (items: Array<any>) => {
    if (!panel) return;
    const list = panel.querySelector("ul");
    if (!list) return;
    list.innerHTML = "";
    items.forEach((it) => {
      const li = document.createElement("li");
      li.className = "mention-suggestion-item";
      li.textContent = trigger === "@" ? (it.label || it.title || "Untitled") : `#${it.label || it.name}`;
      li.onclick = async () => {
        // Restore caret
        if (anchorRange) {
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(anchorRange);
        }
        // Insert a non-editable span token + trailing space
        const span = document.createElement("span");
        if (trigger === "@") {
          span.className = "mention";
          span.setAttribute("data-document-id", it.id);
          span.textContent = `@${it.label || it.title || "Untitled"}`;
        } else {
          span.className = "mention hashtag";
          if (it.kind) span.setAttribute("data-tag-kind", it.kind);
          span.setAttribute("data-tag-name", it.name || it.label);
          span.textContent = `#${it.label || it.name}`;
          // fire-and-forget: link tag to this doc
          try {
            await convex.mutation(api.tags.addTagsToDocument, {
              documentId,
              tags: [{ name: String(it.name || it.label), kind: it.kind }],
            });
          } catch {
            // ignore
          }
        }
        // Insert at caret
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.insertNode(document.createTextNode(" "));
          range.insertNode(span);
          range.collapse(false);
        }
        closePanel();
      };
      list.appendChild(li);
    });
  };

  const fetchSuggestions = async () => {
    try {
      if (trigger === "@") {
        const trimmed = (query || "").trim();
        if (!trimmed) {
          const recent = await convex.query(api.documents.getRecentForMentions, { limit: 8 });
          return (recent || []).map((d: any) => ({ id: d._id, label: d.title || "Untitled" }));
        }
        const results = await convex.query(api.documents.getSearch, { query: trimmed });
        return (results || []).map((d: any) => ({ id: d._id, label: d.title || "Untitled" }));
      } else if (trigger === "#") {
        const trimmed = (query || "").trim();
        const results = await convex.query(api.tags.search, {
          query: trimmed,
          kinds: ["keyword", "entity", "topic", "community", "relationship"],
          limit: 8,
        });
        const mapped: any[] = (results || []).map((t: any) => ({ name: t.name, kind: t.kind, label: t.name }));
        if (trimmed && !mapped.some((m: any) => (m.name || "").toLowerCase() === trimmed.toLowerCase())) {
          mapped.unshift({ name: trimmed, kind: undefined, label: trimmed, isNew: true });
        }
        return mapped;
      }
    } catch {
      return [];
    }
    return [];
  };

  const openPanel = async () => {
    if (panel) closePanel();
    panel = document.createElement("div");
    panel.className = "mention-suggestions";
    const ul = document.createElement("ul");
    ul.className = "mention-suggestions-list";
    panel.appendChild(ul);
    document.body.appendChild(panel);
    positionPanelAtSelection(panel);
    renderPanel(await fetchSuggestions());
  };

  const onKeyDown = async (e: KeyboardEvent) => {
    if ((e.key === "@" || e.key === "#") && !active) {
      active = true;
      trigger = e.key as "@" | "#";
      // Capture caret after the keydown resolves; schedule microtask
      setTimeout(() => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          anchorRange = sel.getRangeAt(0).cloneRange();
        }
        void openPanel();
      }, 0);
      // Prevent literal char if we’re handling token insertion ourselves
      e.preventDefault();
      return;
    }
    if (!active) return;
    if (e.key === "Escape") {
      closePanel();
    }
  };

  const onInput = async (e: Event) => {
    if (!active) return;
    const t = e as InputEvent;
    if (typeof t.data === "string" && /[\w\- ]/.test(t.data)) {
      query += t.data;
    }
    if (t.inputType === "deleteContentBackward") {
      query = query.slice(0, -1);
    }
    if (panel) positionPanelAtSelection(panel);
    renderPanel(await fetchSuggestions());
  };

  holder.addEventListener("keydown", onKeyDown as any, true);
  holder.addEventListener("input", onInput as any, true);

  const cleanup = () => {
    closePanel();
    holder.removeEventListener("keydown", onKeyDown as any, true);
    holder.removeEventListener("input", onInput as any, true);
  };

  return cleanup;
}

// --- Decoration pass --
type DecorateArgs = { root: HTMLElement; convex: ReturnType<typeof useConvex> };

function decorateRawMentionsAndTags({ root, convex }: DecorateArgs) {
  const processedAttr = "data-tokenized";
  const mentionRegex = /(^|[\s(])@([A-Za-z0-9_\- .]{2,})(?=$|[\s),.!?;:])/g;
  const tagRegex = /(^|[\s(])#([A-Za-z0-9_\-]{1,})(?=$|[\s),.!?;:])/g;

  // Find candidate content nodes (EditorJS paragraphs, headers, quotes)
  const candidates = root.querySelectorAll(
    ".ce-block .ce-paragraph, .ce-block [contenteditable='true'], .ce-block .ce-header, .ce-block .ce-quote"
  );

  const titlesToResolve = new Set<string>();
  const tagNamesToResolve = new Set<string>();

  candidates.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (el.hasAttribute(processedAttr)) return;
    const html = el.innerHTML;
    // Skip if we already have mention spans
    if (html.includes("class=\"mention\"")) {
      el.setAttribute(processedAttr, "1");
      return;
    }
    let changed = false;
    // Replace tags first
    const replacedTags = html.replace(tagRegex, (m, p1, name) => {
      changed = true;
      tagNamesToResolve.add(String(name));
      const label = String(name);
      const span = `<span class=\"mention hashtag\" data-tag-name=\"${escapeHtml(label)}\">#${escapeHtml(label)}</span>`;
      return `${p1}${span}`;
    });
    const replaced = replacedTags.replace(mentionRegex, (m, p1, title) => {
      changed = true;
      const label = String(title).trim();
      if (label.length < 2) return m; // ignore too-short
      titlesToResolve.add(label);
      const span = `<span class=\"mention\" data-document-title=\"${escapeHtml(label)}\">@${escapeHtml(label)}</span>`;
      return `${p1}${span}`;
    });
    if (changed) {
      el.innerHTML = replaced;
      el.setAttribute(processedAttr, "1");
    }
  });

  // Resolve @titles to document ids
  const resolveMentions = async () => {
    for (const title of titlesToResolve) {
      try {
        const id = await convex.query(api.documents.findByTitleAny, { title });
        if (!id) continue;
        // Update any spans with data-document-title
        const spans = root.querySelectorAll(`span.mention[data-document-title="${cssEscape(title)}"]`);
        spans.forEach((s) => s.setAttribute("data-document-id", String(id)));
      } catch {
        // ignore
      }
    }
  };

  // Resolve #tags to kinds (optional)
  const resolveTags = async () => {
    for (const name of tagNamesToResolve) {
      try {
        const results = await convex.query(api.tags.search, { query: name, kinds: undefined, limit: 1 });
        const kind = Array.isArray(results) && results[0]?.kind ? String(results[0].kind) : undefined;
        if (!kind) continue;
        const spans = root.querySelectorAll(`span.mention.hashtag[data-tag-name="${cssEscape(name)}"]`);
        spans.forEach((s) => s.setAttribute("data-tag-kind", kind));
      } catch {
        // ignore
      }
    }
  };

  void resolveMentions();
  void resolveTags();

  return () => {
    // no-op; decoration is static
  };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

// CSS.escape polyfill for attribute selectors
function cssEscape(s: string) {
  try {
    // @ts-ignore
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(s);
  } catch {}
  return s.replace(/['"\\]/g, "\\$&");
}

type ProposalPluginArgs = { ed: EditorJS; holder: HTMLElement; onPersist?: (plain: string) => void };

function registerAiProposalPlugin({ ed, holder, onPersist }: ProposalPluginArgs) {
  let overlay: HTMLDivElement | null = null;
  let lastActions: any[] = [];
  let selected: boolean[] = [];
  const ghostByAction = new Map<number, HTMLElement>();
  let targetBadgeEl: HTMLDivElement | null = null;
  let highlightedIdx = -1;
  let anchorIndex: number | null = null;
  let overlayScrollHandler: ((e: Event) => void) | null = null;
  let overlayResizeHandler: ((e: Event) => void) | null = null;
  let lastBlockIndex: number = 0;

  // --- Helpers: caret/block and visual ghosts ---
  const hasCaretInHolder = (): boolean => {
    try {
      const sel = window.getSelection();
      return !!(sel && sel.rangeCount > 0 && holder.contains(sel.anchorNode));
    } catch {
      return false;
    }
  };

  const getCurrentBlockIndex = (): number => {
    try {
      const idx = (ed as any)?.blocks?.getCurrentBlockIndex?.();
      return typeof idx === 'number' && idx >= 0 ? idx : 0;
    } catch {
      return 0;
    }
  };

  // Track last active block index from user interactions
  const trackBlockIndex = () => {
    try {
      if (hasCaretInHolder()) {
        lastBlockIndex = getCurrentBlockIndex();
      }
    } catch { /* ignore */ }
  };
  const onHolderMouseUp = () => trackBlockIndex();
  const onHolderKeyUp = () => trackBlockIndex();
  const onSelectionChange = () => trackBlockIndex();

  const getBlocksRoot = (): HTMLElement | null => {
    try {
      return holder.querySelector('.ce-blocks') as HTMLElement | null;
    } catch {
      return null;
    }
  };

  const getBlockElAtIndex = (i: number): HTMLElement | null => {
    const root = getBlocksRoot();
    if (!root) return null;
    const list = root.querySelectorAll('.ce-block');
    return (list && list[i] ? (list[i] as HTMLElement) : null);
  };

  const getBlockIndexById = (blockId: string): number | null => {
    try {
      const root = getBlocksRoot();
      if (!root) return null;
      const els = root.querySelectorAll('.ce-block');
      for (let i = 0; i < els.length; i++) {
        const el = els[i] as HTMLElement;
        const idAttr = el.getAttribute('data-id') || (el as any).dataset?.id || '';
        if (idAttr && idAttr === blockId) return i;
      }
    } catch { /* ignore */ }
    return null;
  };

  const clearAllGhosts = () => {
    try {
      for (const [, el] of ghostByAction) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
      ghostByAction.clear();
    } catch {
      /* no-op */
    }
  };

  const clearTargetHighlight = () => {
    try {
      if (targetBadgeEl && targetBadgeEl.parentNode) targetBadgeEl.parentNode.removeChild(targetBadgeEl);
    } catch {
      /* no-op */
    } finally {
      targetBadgeEl = null;
      highlightedIdx = -1;
    }
  };

  const showGhostForAction = (i: number, _action: any) => {
    // Minimal: draw a subtle guideline below the current block as insertion target
    try {
      // Remove existing ghost for this action
      const prev = ghostByAction.get(i);
      if (prev && prev.parentNode) prev.parentNode.removeChild(prev);

      const idx = getCurrentBlockIndex();
      // Find the DOM node for the current block
      const blocksRoot = holder.closest('.ce-blocks') || holder.querySelector('.ce-blocks');
      const blockEls = blocksRoot ? (blocksRoot as HTMLElement).querySelectorAll('.ce-block') : null;
      const target = blockEls && blockEls[idx] ? (blockEls[idx] as HTMLElement) : null;
      if (!target) return;

      const ghost = document.createElement('div');
      ghost.style.height = '2px';
      ghost.style.margin = '6px 0';
      ghost.style.background = 'var(--accent-primary)';
      ghost.style.opacity = '0.35';
      target.insertAdjacentElement('afterend', ghost);
      ghostByAction.set(i, ghost);
    } catch {
      /* no-op */
    }
  };

  const removeOverlay = () => {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    lastActions = [];
    selected = [];
    clearAllGhosts();
    clearTargetHighlight();
    // Remove overlay listeners if any
    if (overlayScrollHandler) {
      try { window.removeEventListener('scroll', overlayScrollHandler, true); } catch {}
      overlayScrollHandler = null;
    }
    if (overlayResizeHandler) {
      try { window.removeEventListener('resize', overlayResizeHandler, true); } catch {}
      overlayResizeHandler = null;
    }
    anchorIndex = null;
  };

  const mdToParagraphs = (md: string): string[] => {
    const lines = (md || "").trim().split(/\n{2,}/);
    return lines.map((l) => l.replace(/\n/g, "<br>").trim());
  };

  // Minimal EditorJS -> plain text (subset of blocks we use)
  const editorJsToPlainText = (data: any): string => {
    try {
      const blocks: any[] = Array.isArray(data?.blocks) ? data.blocks : [];
      const out: string[] = [];
      for (const b of blocks) {
        switch (b?.type) {
          case "header": out.push(String(b?.data?.text || "")); break;
          case "list": {
            const items: string[] = Array.isArray(b?.data?.items) ? b.data.items : [];
            items.forEach((it) => out.push(String(it || "")));
            break;
          }
          case "quote": out.push(String(b?.data?.text || "")); break;
          case "delimiter": out.push("---"); break;
          case "code": out.push(String(b?.data?.code || "")); break;
          case "paragraph":
          default:
            out.push(String(b?.data?.text || "").replace(/<br\s*\/?>(?=\s|$)/g, "\n"));
        }
      }
      return out.join("\n\n").trimEnd();
    } catch { return ""; }
  };

  // (removed legacy scope-based diff helpers)
  type Op = { kind: 'eq' | 'add' | 'del'; text: string };

  const diffLines = (a: string, b: string): Op[] => {
    const aLines = a.split(/\r?\n/);
    const bLines = b.split(/\r?\n/);
    const n = aLines.length, m = bLines.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = aLines[i] === bLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const ops: Op[] = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (aLines[i] === bLines[j]) { ops.push({ kind: 'eq', text: aLines[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ kind: 'del', text: aLines[i] }); i++; }
      else { ops.push({ kind: 'add', text: bLines[j] }); j++; }
    }
    while (i < n) { ops.push({ kind: 'del', text: aLines[i++] }); }
    while (j < m) { ops.push({ kind: 'add', text: bLines[j++] }); }
    return ops;
  };
  const renderUnified = (container: HTMLElement, ops: Op[]) => {
    container.innerHTML = '';
    const pre = document.createElement('pre');
    pre.className = 'text-[12px] leading-[1.35] whitespace-pre-wrap p-2 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)]';
    for (const op of ops) {
      const line = document.createElement('div');
      line.className = op.kind === 'add' ? 'nb-diff-add' : op.kind === 'del' ? 'nb-diff-del' : 'text-[var(--text-secondary)]';
      const prefix = op.kind === 'add' ? '+ ' : op.kind === 'del' ? '- ' : '  ';
      line.textContent = prefix + op.text;
      pre.appendChild(line);
    }
    container.appendChild(pre);
  };

  const applyActions = async () => {
    try {
      try { await (ed as any)?.isReady; } catch { /* ignore */ }
      const output = await ed.save();
      const currentBlocks: any[] = Array.isArray((output as any).blocks) ? (output as any).blocks.slice() : [];
      const baseIdx = (typeof anchorIndex === 'number' && anchorIndex >= 0)
        ? anchorIndex
        : (hasCaretInHolder() ? getCurrentBlockIndex() : lastBlockIndex);

      // Normalize tool/AI actions to EditorNodeAction
      const normalized: EditorNodeAction[] = [];
      for (let i = 0; i < lastActions.length; i++) {
        if (!selected[i]) continue;
        const raw = lastActions[i] ?? {};
        const kind = String(raw.type || '').trim();
        if (!kind) continue;
        const t = (kind === 'proposeNode' || kind === 'create') ? 'createNode'
                : (kind === 'proposeUpdateNode' || kind === 'update') ? 'updateNode'
                : (kind === 'removeNode' || kind === 'delete') ? 'deleteNode'
                : kind;
        if (t === 'createNode') {
          let anchorFromId: number | undefined = undefined;
          if (typeof raw.anchorBlockId === 'string') {
            const idxFromId = getBlockIndexById(raw.anchorBlockId);
            if (idxFromId != null) anchorFromId = idxFromId;
          }
          normalized.push({
            type: 'createNode',
            position: (raw.position as any) || 'after',
            anchorIndex: typeof raw.anchorIndex === 'number' ? raw.anchorIndex : anchorFromId,
            blocks: Array.isArray(raw.blocks) ? raw.blocks : undefined,
            markdown: typeof raw.markdown === 'string' ? raw.markdown : (typeof raw.content === 'string' ? raw.content : undefined),
          });
        } else if (t === 'updateNode') {
          let targetIdx: number | undefined = typeof raw.targetIndex === 'number' ? raw.targetIndex : undefined;
          if (targetIdx == null && typeof raw.nodeId === 'string') {
            const idxFromId = getBlockIndexById(raw.nodeId);
            if (idxFromId != null) targetIdx = idxFromId;
          }
          normalized.push({
            type: 'updateNode',
            targetIndex: targetIdx,
            blocks: Array.isArray(raw.blocks) ? raw.blocks : undefined,
            markdown: typeof raw.markdown === 'string' ? raw.markdown : (typeof raw.content === 'string' ? raw.content : undefined),
          });
        } else if (t === 'deleteNode') {
          let targetIdx: number | undefined = typeof raw.targetIndex === 'number' ? raw.targetIndex : undefined;
          if (targetIdx == null && typeof raw.nodeId === 'string') {
            const idxFromId = getBlockIndexById(raw.nodeId);
            if (idxFromId != null) targetIdx = idxFromId;
          }
          normalized.push({
            type: 'deleteNode',
            targetIndex: targetIdx,
          });
        } else if (t === 'replaceRange') {
          normalized.push({
            type: 'replaceRange',
            startIndex: typeof raw.startIndex === 'number' ? raw.startIndex : undefined,
            endIndex: typeof raw.endIndex === 'number' ? raw.endIndex : undefined,
            blocks: Array.isArray(raw.blocks) ? raw.blocks : undefined,
            markdown: typeof raw.markdown === 'string' ? raw.markdown : (typeof raw.content === 'string' ? raw.content : undefined),
          });
        }
      }
      // Fallback: single markdown becomes createNode after
      if (normalized.length === 0) {
        const md = String(lastActions?.[0]?.markdown || lastActions?.[0]?.content || '').trim();
        if (md) normalized.push({ type: 'createNode', position: 'after', markdown: md });
      }

      const newBlocks = applyNodeOps(currentBlocks, normalized, { anchorIndex: baseIdx });
      const sanitizeFn = (typeof sanitizeBlocks === "function" ? sanitizeBlocks : fallbackSanitizeBlocks) as (b: any) => any;
      const safeBlocks = sanitizeFn(newBlocks as any);
      await ed.render({ time: Date.now(), blocks: safeBlocks, version: '2.31.0' });
      const after = await ed.save();
      const plain = editorJsToPlainText(after);
      onPersist?.(plain);
    } catch (e) {
      console.warn('[InlineRichEditor] applyActions failed, no changes applied', e);
    } finally {
      removeOverlay();
    }
  };

  const showOverlay = (message: string, actions: any[]) => {
    try { console.debug('[InlineRichEditor] showOverlay', { message, count: Array.isArray(actions) ? actions.length : 0 }); } catch {}
    removeOverlay();
    lastActions = Array.isArray(actions) ? actions : [];
    selected = lastActions.map(() => true);
    overlay = document.createElement('div');
    overlay.className = 'nb-proposal-overlay nb-proposal-minimal flex flex-col gap-2';
    overlay.style.position = 'absolute';
    overlay.style.background = 'var(--bg-primary)';
    overlay.style.border = '1px solid var(--border-color)';
    overlay.style.borderRadius = '8px';
    overlay.style.padding = '8px';
    overlay.style.width = 'max-content';
    overlay.style.maxWidth = 'min(640px, 90vw)';
    overlay.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)';
    overlay.style.zIndex = '9999';

    // Position overlay anchored to the target ce-block (current block),
    // fallback to caret, then to below editor holder.
    const positionOverlay = () => {
      try {
        const effectiveIdx = (typeof anchorIndex === 'number' && anchorIndex >= 0)
          ? anchorIndex
          : (hasCaretInHolder() ? getCurrentBlockIndex() : lastBlockIndex);
        let targetEl = getBlockElAtIndex(effectiveIdx);
        // Prefer anchoring to the content area within the block for more precise positioning
        if (targetEl) {
          const content = targetEl.querySelector('.ce-block__content');
          if (content instanceof HTMLElement) targetEl = content;
        }
        if (targetEl) {
          const r = targetEl.getBoundingClientRect();
          overlay!.style.left = `${Math.round(r.left + window.scrollX)}px`;
          overlay!.style.top = `${Math.round(r.bottom + window.scrollY + 6)}px`;
          overlay!.style.transform = '';
          return;
        }
        const sel = window.getSelection();
        const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
        const selRect = range ? range.getBoundingClientRect() : null;
        if (selRect) {
          overlay!.style.left = `${Math.round(selRect.left + window.scrollX)}px`;
          overlay!.style.top = `${Math.round(selRect.bottom + window.scrollY + 6)}px`;
          overlay!.style.transform = '';
          return;
        }
      } catch { /* ignore */ }
      const holderRect = holder.getBoundingClientRect();
      const left = holderRect.left + holderRect.width / 2 + window.scrollX;
      const top = holderRect.bottom + window.scrollY + 8;
      overlay!.style.left = `${Math.round(left)}px`;
      overlay!.style.top = `${Math.round(top)}px`;
      overlay!.style.transform = 'translateX(-50%)';
    };
    positionOverlay();
    // Reposition on scroll/resize briefly to track layout shifts
    overlayScrollHandler = () => positionOverlay();
    overlayResizeHandler = () => positionOverlay();
    window.addEventListener('scroll', overlayScrollHandler, true);
    window.addEventListener('resize', overlayResizeHandler, true);

    const list = document.createElement('div');
    list.className = 'max-h-[40vh] overflow-auto space-y-2';
    lastActions.forEach((a, idx) => {
      const row = document.createElement('div');
      row.className = 'rounded p-2 bg-[var(--bg-secondary)] border border-[var(--border-color)]';
      const type = String(a?.type || '');

      const top = document.createElement('div');
      top.className = 'flex items-center gap-2';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = selected[idx]; cb.onchange = () => (selected[idx] = cb.checked);
      const label = document.createElement('div'); label.className = 'text-[12px] text-[var(--text-secondary)]';
      label.textContent = type === 'updateNode' ? 'Replace current block' : 'Insert below';
      top.appendChild(cb); top.appendChild(label);
      row.appendChild(top);

      // Meta row: target label and optional position selector for createNode
      const meta = document.createElement('div');
      meta.className = 'mt-1 text-[11px] text-[var(--text-secondary)] flex items-center gap-2';
      // Compute effective anchor/target
      const effectiveAnchor = (typeof anchorIndex === 'number' && anchorIndex >= 0)
        ? anchorIndex
        : (hasCaretInHolder() ? getCurrentBlockIndex() : lastBlockIndex);
      const resolveTargetIndex = (): number => {
        if (type === 'updateNode' || type === 'deleteNode') {
          const ti = (lastActions[idx] as any)?.targetIndex;
          if (typeof ti === 'number') return ti;
          const nid = (lastActions[idx] as any)?.nodeId;
          if (typeof nid === 'string') {
            const byId = getBlockIndexById(nid);
            if (byId != null) return byId;
          }
          return effectiveAnchor;
        }
        // createNode / others -> anchor based
        return (typeof (lastActions[idx] as any)?.anchorIndex === 'number')
          ? (lastActions[idx] as any).anchorIndex
          : effectiveAnchor;
      };
      const tgt = resolveTargetIndex();
      const tgtEl = getBlockElAtIndex(tgt);
      const tgtId = tgtEl ? ((tgtEl.getAttribute('data-id') || (tgtEl as any).dataset?.id) as string | undefined) : undefined;
      const targetLabel = document.createElement('div');
      targetLabel.textContent = `Target: Block ${tgt}${tgtId ? ` (${tgtId})` : ''}`;
      meta.appendChild(targetLabel);

      if (type === 'createNode') {
        const posWrap = document.createElement('label');
        posWrap.className = 'inline-flex items-center gap-1';
        const posText = document.createElement('span'); posText.textContent = 'Position:'; posText.className = 'opacity-70';
        const pos = document.createElement('select');
        pos.className = 'text-[11px] border border-[var(--border-color)] rounded px-1 py-0.5 bg-[var(--bg-primary)]';
        const positions = ['before','after','start','end'] as const;
        positions.forEach((p) => { const o = document.createElement('option'); o.value = p; o.text = p; pos.appendChild(o); });
        const currentPos = (lastActions[idx] as any)?.position || 'after';
        try { pos.value = currentPos; } catch { /* ignore */ }
        pos.onchange = () => { (lastActions[idx] as any).position = pos.value; };
        posWrap.appendChild(posText); posWrap.appendChild(pos);
        meta.appendChild(posWrap);
      }
      row.appendChild(meta);

      const preview = document.createElement('div'); preview.className = 'mt-2';
      const diffHost = document.createElement('div'); preview.appendChild(diffHost);
      const refresh = async () => {
        diffHost.innerHTML = '';
        const idx = hasCaretInHolder() ? getCurrentBlockIndex() : 0;
        let base = '';
        if (type === 'updateNode') {
          try {
            const data = await ed.save();
            const b = Array.isArray((data as any).blocks) ? (data as any).blocks[idx] : null;
            base = editorJsToPlainText({ blocks: b ? [b] : [] });
          } catch (e) { /* ignore */ }
        }
        const proposedText = String(a?.markdown || a?.content || '').trim();
        renderUnified(diffHost, diffLines(base, proposedText));
      };
      showGhostForAction(idx, a);
      void refresh();
      row.appendChild(preview);
      list.appendChild(row);
    });
    overlay.appendChild(list);

    const buttons = document.createElement('div'); buttons.className = 'flex items-center gap-2 justify-end pt-1';
    const accept = document.createElement('button'); accept.className = 'px-2 py-1 text-[12px] rounded bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]'; accept.textContent = 'Accept Selected'; accept.onclick = applyActions;
    const dismiss = document.createElement('button'); dismiss.className = 'px-2 py-1 text-[12px] rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)]'; dismiss.textContent = 'Dismiss'; dismiss.onclick = removeOverlay;
    buttons.appendChild(accept); buttons.appendChild(dismiss); overlay.appendChild(buttons);
    document.body.appendChild(overlay);
    // Minor delay to ensure correct placement after DOM paints
    setTimeout(positionOverlay, 0);
  };

  const onProposal = (e: Event) => {
    const detail: any = (e as CustomEvent).detail || {};
    const { actions = [], message = 'AI Proposal' } = detail;
    // Resolve anchor index if provided by caller
    try {
      if (typeof detail.anchorBlockIndex === 'number') {
        anchorIndex = detail.anchorBlockIndex;
      } else if (typeof detail.anchorBlockId === 'string' && detail.anchorBlockId) {
        const root = getBlocksRoot();
        if (root) {
          const els = root.querySelectorAll('.ce-block');
          let found = -1;
          els.forEach((el, i) => {
            const id = (el as HTMLElement).getAttribute('data-id') || (el as HTMLElement).dataset.id;
            if (id === detail.anchorBlockId && found === -1) found = i;
          });
          anchorIndex = found >= 0 ? found : null;
        }
      } else {
        anchorIndex = hasCaretInHolder() ? getCurrentBlockIndex() : lastBlockIndex;
      }
    } catch { anchorIndex = hasCaretInHolder() ? getCurrentBlockIndex() : lastBlockIndex; }
    try { console.debug('[InlineRichEditor] received nodebench:aiProposal', { message, count: Array.isArray(actions) ? actions.length : 0 }); } catch {}
    showOverlay(message, actions);
  };
  window.addEventListener('nodebench:aiProposal', onProposal as any);
  // Attach trackers
  holder.addEventListener('mouseup', onHolderMouseUp, true);
  holder.addEventListener('keyup', onHolderKeyUp, true);
  document.addEventListener('selectionchange', onSelectionChange, true);

  const cleanup = () => {
    window.removeEventListener('nodebench:aiProposal', onProposal as any);
    holder.removeEventListener('mouseup', onHolderMouseUp, true);
    holder.removeEventListener('keyup', onHolderKeyUp, true);
    document.removeEventListener('selectionchange', onSelectionChange, true);
    removeOverlay();
  };
  return cleanup;
}
