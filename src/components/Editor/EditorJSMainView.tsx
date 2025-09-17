import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Checklist from "@editorjs/checklist";
import Delimiter from "@editorjs/delimiter";
import Quote from "@editorjs/quote";
import CodeTool from "@editorjs/code";

export function EditorJSMainView({ documentId }: { documentId: Id<"documents"> }) {
  const document = useQuery(api.documents.getById, { documentId });
  const updateDocument = useMutation(api.documents.update);

  const holderRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const saveTimer = useRef<number | null>(null);
  const lastSavedRef = useRef<string>("");
  const [ready, setReady] = useState(false);

  const parseToEditorJs = useCallback((content: string | null | undefined): any => {
    if (!content) return { time: Date.now(), blocks: [{ type: "paragraph", data: { text: "" } }], version: "2.31.0" };
    try {
      const json = JSON.parse(content);
      // If already EditorJS format
      if (json && Array.isArray((json as any).blocks)) {
        return json;
      }
      // If ProseMirror doc -> convert basic nodes
      if (json && (json as any).type === "doc" && Array.isArray((json as any).content)) {
        const blocks: any[] = [];
        const toText = (node: any): string => {
          if (!node) return "";
          if (typeof node.text === "string") return node.text;
          if (Array.isArray(node.content)) return node.content.map(toText).join("");
          return "";
        };
        const handleNodes = (nodes: any[]) => {
          for (const n of nodes) {
            switch (n.type) {
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
              case "bulletList": {
                const items = (n.content || []).map((li: any) => toText(li)).filter(Boolean);
                blocks.push({ type: "list", data: { style: "unordered", items } });
                break;
              }
              case "taskList": {
                const items = (n.content || []).map((ti: any) => ({ text: toText(ti), checked: !!ti.attrs?.checked }));
                blocks.push({ type: "checklist", data: { items } });
                break;
              }
              default: {
                // Fallback: paragraph
                const txt = toText(n);
                if (txt) blocks.push({ type: "paragraph", data: { text: txt } });
              }
            }
          }
        };
        handleNodes((json as any).content);
        return { time: Date.now(), blocks: blocks.length ? blocks : [{ type: "paragraph", data: { text: "" } }], version: "2.31.0" };
      }
    } catch {
      // not JSON, treat as plain text
      const text = String(content);
      if (text.trim().length === 0) return { time: Date.now(), blocks: [{ type: "paragraph", data: { text: "" } }], version: "2.31.0" };
      const paras = text.split(/\n\n+/).map(p => p.replace(/\n/g, "<br>"));
      return { time: Date.now(), blocks: paras.map(p => ({ type: "paragraph", data: { text: p } })), version: "2.31.0" };
    }
    // default empty
    return { time: Date.now(), blocks: [{ type: "paragraph", data: { text: "" } }], version: "2.31.0" };
  }, []);

  const initialData = useMemo(() => parseToEditorJs(document?.content as string | undefined), [document?.content, parseToEditorJs]);

  useEffect(() => {
    if (!holderRef.current) return;
    let destroyed = false;
    const init = async () => {
      try {
        // destroy previous
        if (editorRef.current) {
          try { await editorRef.current.isReady; } catch {}
          try { editorRef.current.destroy(); } catch {}
          editorRef.current = null;
        }
        const ed = new EditorJS({
          holder: holderRef.current!,
          minHeight: 300,
          autofocus: false,
          data: initialData,
          tools: {
            header: { class: Header, inlineToolbar: true, config: { levels: [2,3,4], defaultLevel: 2 } },
            list: { class: List, inlineToolbar: true },
            checklist: { class: Checklist, inlineToolbar: true },
            delimiter: Delimiter,
            quote: { class: Quote, inlineToolbar: true },
            code: CodeTool,
          },
          onReady: () => { if (!destroyed) setReady(true); },
          onChange: () => {
            if (saveTimer.current) window.clearTimeout(saveTimer.current);
            saveTimer.current = window.setTimeout(async () => {
              try {
                const output = await ed.save();
                const contentString = JSON.stringify(output);
                if (contentString !== lastSavedRef.current) {
                  lastSavedRef.current = contentString;
                  await updateDocument({ id: documentId, content: contentString });
                }
              } catch {
                // ignore save errors
              }
            }, 800);
          },
        });
        editorRef.current = ed;
      } catch (e) {
        console.error("Failed to init EditorJSMainView", e);
      }
    };
    void init();
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      try { editorRef.current?.destroy?.(); } catch {}
      editorRef.current = null;
      setReady(false);
    };
  }, [documentId, initialData, updateDocument]);

  return (
    <div className="min-h-[500px]">
      <div ref={holderRef} className="min-h-[500px] px-3 py-2" />
      {!ready && (
        <div className="flex items-center justify-center py-8 text-[var(--text-muted)] text-sm">Loading editor…</div>
      )}
    </div>
  );
}
