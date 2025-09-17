import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import InlineRichEditor from "../common/InlineRichEditor";
import { MentionHoverPreview } from "../MentionHoverPreview";
import { TagHoverPreview } from "../TagHoverPreview";
import UnifiedEditor, { type EditorMode } from "../UnifiedEditor";
import { Editor as EditorNB3 } from "./Editor_nb3";
import "./editor-blocks.css";

interface EditorProps {
  documentId: Id<"documents">;
  isGridMode?: boolean;
  isFullscreen?: boolean;
  // Optional: select which editor engine to render. Defaults to env flag or Unified.
  engine?: "unified" | "nb3" | "legacy";
  // Optional: editing mode for UnifiedEditor
  mode?: EditorMode;
  // Whether editing is allowed (owner or public-edit). Defaults to true.
  editable?: boolean;
}

// Best-effort extraction of plain text from a ProseMirror-like JSON doc
const extractPlainFromProseMirror = (input: any): string => {
  const lines: string[] = [];
  const visit = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node.type === "text" && typeof node.text === "string") {
      lines.push(node.text);
    }
    const content = (node as any).content;
    if (Array.isArray(content)) {
      content.forEach(visit);
      // Add paragraph-like breaks for common block nodes
      if (
        typeof (node as any).type === "string" &&
        [
          "paragraph",
          "heading",
          "blockquote",
          "listItem",
          "taskItem",
          "codeBlock",
          "horizontalRule",
        ].includes((node as any).type)
      ) {
        lines.push("\n\n");
      }
    }
  };
  try {
    visit(input);
    return lines.join("").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return "";
  }
};

// Convert a ProseMirror-like doc JSON to EditorJS JSON (headers, lists, quotes, code, checklist)
const convertProseMirrorToEditorJS = (input: any): any => {
  try {
    const blocks: any[] = [];
    const toText = (node: any): string => {
      if (!node) return "";
      if (typeof node.text === "string") return node.text;
      if (Array.isArray(node.content)) return node.content.map(toText).join("");
      return "";
    };
    const handleNodes = (nodes: any[]) => {
      for (const n of nodes) {
        const type = n?.type;
        switch (type) {
          case "heading": {
            const level = Math.min(6, Number(n.attrs?.level || 1));
            blocks.push({ type: "header", data: { level, text: toText(n) } });
            break;
          }
          case "paragraph": {
            blocks.push({ type: "paragraph", data: { text: toText(n) } });
            break;
          }
          case "quote":
          case "blockquote": {
            blocks.push({ type: "quote", data: { text: toText(n) } });
            break;
          }
          case "codeBlock": {
            const codeText = (n.content && n.content[0]?.text) || toText(n);
            blocks.push({ type: "code", data: { code: codeText } });
            break;
          }
          case "bulletList":
          case "orderedList": {
            const style = type === "orderedList" ? "ordered" : "unordered";
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
    const content = Array.isArray(input?.content) ? input.content : [];
    handleNodes(content);
    return { time: Date.now(), blocks: blocks.length ? blocks : [{ type: "paragraph", data: { text: "" } }], version: "2.31.0" };
  } catch {
    return { time: Date.now(), blocks: [{ type: "paragraph", data: { text: "" } }], version: "2.31.0" };
  }
};

// Extract plain text from EditorJS blocks
const extractPlainFromEditorJS = (data: any): string => {
  try {
    const blocks: any[] = Array.isArray(data?.blocks) ? data.blocks : [];
    const out: string[] = [];
    for (const b of blocks) {
      switch (b?.type) {
        case "header":
          out.push("# ".repeat(Math.min(6, b?.data?.level || 1)) + (b?.data?.text || ""));
          break;
        case "list": {
          const style = (b?.data?.style || "unordered") as string;
          const items: string[] = Array.isArray(b?.data?.items) ? b.data.items : [];
          items.forEach((it: string, i: number) => {
            const prefix = style === "ordered" ? `${i + 1}. ` : "- ";
            out.push(prefix + (it || ""));
          });
          break;
        }
        case "quote":
          out.push("> " + (b?.data?.text || ""));
          break;
        case "delimiter":
          out.push("---");
          break;
        case "code":
          out.push("```\n" + (b?.data?.code || "") + "\n```");
          break;
        case "paragraph":
        default:
          out.push(String(b?.data?.text || "").replace(/<br\s*\/?>(?=\s|$)/g, "\n"));
      }
    }
    return out.join("\n\n").trimEnd();
  } catch {
    return "";
  }
};

export function Editor({ documentId, isGridMode, isFullscreen, engine, mode, editable }: EditorProps) {
  const document = useQuery(api.documents.getById, { documentId });
  const updateDocument = useMutation(api.documents.update);

  const [text, setText] = useState<string>("");
  const saveTimerRef = useRef<number | null>(null);
  const extractorRef = useRef<null | (() => Promise<any>)>(null);
  const lastSavedRef = useRef<string>("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize local state from server document
  useEffect(() => {
    if (!document) return;
    const raw = document.content ?? "";
    let initialText = "";
    try {
      if (typeof raw === "string" && raw.trim().startsWith("{")) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.type === "doc") {
          initialText = extractPlainFromProseMirror(parsed);
        } else if (parsed && Array.isArray(parsed.blocks)) {
          initialText = extractPlainFromEditorJS(parsed);
        } else {
          initialText = raw;
        }
      } else {
        initialText = String(raw);
      }
    } catch {
      initialText = typeof raw === "string" ? raw : "";
    }
    setText(initialText);
    lastSavedRef.current = ""; // force first save when user edits
  }, [documentId, document]);

  const scheduleSave = useCallback(
    (nextText: string) => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void (async () => {
          try {
            let payload = nextText;
            if (extractorRef.current) {
              try {
                const out = await extractorRef.current();
                if (out && out.blocks) {
                  payload = JSON.stringify(out);
                }
              } catch {
                // ignore extractor errors, fall back to plain text
              }
            }
            if (payload === lastSavedRef.current) return;
            await updateDocument({ id: documentId, content: payload });
            lastSavedRef.current = payload;
          } catch (err) {
            console.error("Failed to save document", err);
          }
        })();
      }, 800);
    },
    [documentId, updateDocument]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Determine initial EditorJS JSON: prefer existing EditorJS, otherwise convert ProseMirror -> EditorJS
  const initialEditorJsJson: string | null = (() => {
    try {
      const raw = document?.content;
      if (typeof raw !== "string") return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.blocks)) return raw;
      if (parsed && typeof parsed === "object" && parsed.type === "doc" && Array.isArray(parsed.content)) {
        const converted = convertProseMirrorToEditorJS(parsed);
        return JSON.stringify(converted);
      }
      return null;
    } catch {
      return null;
    }
  })();

  // Engine selection: prop > env > default
  const envEngine = String((import.meta as any)?.env?.VITE_EDITOR_ENGINE ?? "unified").toLowerCase();
  const selectedEngine = (engine ?? (envEngine as any)) as "unified" | "nb3" | "legacy";

  // Render UnifiedEditor directly when selected; hydrate-only, no mount-time mutations
  if (selectedEngine === "unified") {
    return (
      <UnifiedEditor documentId={documentId as any} mode={mode} isGridMode={isGridMode} isFullscreen={isFullscreen} editable={editable} />
    );
  }

  // Render legacy NB3 editor when selected
  if (selectedEngine === "nb3") {
    return (
      <EditorNB3 documentId={documentId as any} isGridMode={!!isGridMode} isFullscreen={!!isFullscreen} />
    );
  }

  if (document === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[700px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
          <p className="text-sm text-[var(--text-secondary)]">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-none">
      <div ref={containerRef} className="min-h-[700px] border border-[var(--border-color)] rounded-md bg-[var(--bg-secondary)] relative">
        <InlineRichEditor
          value={text}
          onChange={(v: string) => {
            setText(v);
            scheduleSave(v);
          }}
          initialJson={initialEditorJsJson}
          registerSaveExtractor={(fn: any) => {
            extractorRef.current = fn;
          }}
          placeholder="Write your document…"
          documentId={documentId}
          enableMentions
          enableProposals
        />
        {/* Hover previews anchored to the editor container */}
        <MentionHoverPreview editorContainer={containerRef.current} sourceDocumentId={documentId} />
        <TagHoverPreview editorContainer={containerRef.current} />
      </div>
    </div>
  );
}
