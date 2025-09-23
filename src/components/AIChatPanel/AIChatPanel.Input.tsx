import React, { useCallback, useEffect, useRef } from "react";

export type AIChatPanelInputProps = {
  input: string;
  onChangeInput: (v: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  placeholder: string;
  isLoading: boolean;
  onSend: () => void;
  onFilesDrop?: (files: File[]) => void;
};

// Convert pasted HTML to plain text while preserving list and nested list structure
const htmlToListMarkdown = (html: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const lines: string[] = [];

    const walk = (node: Node, depth = 0): void => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName;

        if (tag === "UL" || tag === "OL") {
          const ordered = tag === "OL";
          let idx = 1;
          Array.from(el.children).forEach((child) => {
            if ((child as HTMLElement).tagName === "LI") {
              const li = child as HTMLElement;
              const sublists: Element[] = [];
              const textParts: string[] = [];
              li.childNodes.forEach((cn) => {
                if (
                  cn.nodeType === Node.ELEMENT_NODE &&
                  ["UL", "OL"].includes((cn as HTMLElement).tagName)
                ) {
                  sublists.push(cn as Element);
                } else {
                  textParts.push((cn.textContent || "").replace(/[\t\r]+/g, " "));
                }
              });
              const indent = "  ".repeat(depth);
              const prefix = ordered ? `${idx}. ` : "- ";
              const line = `${indent}${prefix}${textParts.join("").trim()}`;
              if (line.trim()) lines.push(line);
              sublists.forEach((sl) => walk(sl, depth + 1));
              idx++;
            }
          });
          return;
        }

        if (tag === "BR") {
          lines.push("");
          return;
        }

        if (tag === "P" || tag === "DIV") {
          const text = (el.textContent || "").trim();
          if (text) lines.push(`${"  ".repeat(depth)}${text}`);
          // Also walk any nested lists
          Array.from(el.children).forEach((c) => {
            if (["UL", "OL"].includes((c as HTMLElement).tagName)) {
              walk(c, depth);
            }
          });
          lines.push("");
          return;
        }

        el.childNodes.forEach((cn) => walk(cn, depth));
        return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.textContent || "").trim();
        if (t) lines.push(`${"  ".repeat(depth)}${t}`);
      }
    };

    doc.body.childNodes.forEach((cn) => walk(cn));

    return lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd();
  } catch {
    return html.replace(/<[^>]*>/g, "");
  }
};

export const AIChatPanelInput: React.FC<AIChatPanelInputProps> = ({
  input,
  onChangeInput,
  onKeyPress,
  placeholder,
  isLoading,
  onSend,
  onFilesDrop,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length && onFilesDrop) onFilesDrop(files);
    },
    [onFilesDrop]
  );

  const prevent = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Keep editor content in sync with external input state (e.g., when clearing after send)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const current = (el.textContent || "").replace(/\r\n/g, "\n");
    if (current !== input) {
      el.textContent = input;
    }
  }, [input]);

  const insertTextAtCursor = (text: string) => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      el.focus();
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    if (html || plain) {
      e.preventDefault();
      const toInsert = html ? htmlToListMarkdown(html) : plain;
      insertTextAtCursor(toInsert);
      // Update external state
      const el = editorRef.current;
      onChangeInput((el?.textContent || "").replace(/\r\n/g, "\n"));
    }
  };

  const onInput = () => {
    const el = editorRef.current;
    onChangeInput((el?.textContent || "").replace(/\r\n/g, "\n"));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Delegate to parent (Enter sends; Shift+Enter makes newline)
    onKeyPress(e);
  };

  return (
    <div className="flex gap-2">
      <div
        className="flex-1 relative"
        onDragEnter={prevent}
        onDragLeave={prevent}
        onDragOver={prevent}
        onDrop={handleDrop}
      >
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline
          contentEditable={!isLoading}
          data-placeholder={placeholder}
          onPaste={onPaste}
          onInput={onInput}
          onKeyDown={onKeyDown}
          spellCheck
          className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] whitespace-pre-wrap break-words max-h-40 overflow-auto editable-input"
          style={{ outline: "none" }}
        />
      </div>
      <button
        onClick={onSend}
        disabled={!input.trim() || isLoading}
        className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 transition-colors"
      >
        {/* Icon comes from parent CSS scope */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
};

