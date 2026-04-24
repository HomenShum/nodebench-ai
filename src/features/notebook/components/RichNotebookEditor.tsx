import { useMemo, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type RichNotebookEditorProps = {
  initialContent: string;
  storageKey?: string;
  testId?: string;
  className?: string;
  editorClassName?: string;
  footer?: ReactNode;
  onChange?: (html: string) => void;
};

type ToolbarButton = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function readStoredNotebook(storageKey: string | undefined, fallback: string) {
  if (!storageKey || typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(storageKey) || fallback;
  } catch {
    return fallback;
  }
}

function writeStoredNotebook(storageKey: string | undefined, html: string) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, html);
  } catch {
    // Local storage can be unavailable in private sessions. The editor should
    // still work as an in-memory notebook in that case.
  }
}

export function RichNotebookEditor({
  initialContent,
  storageKey,
  testId = "rich-notebook-editor",
  className,
  editorClassName,
  footer,
  onChange,
}: RichNotebookEditorProps) {
  const content = useMemo(
    () => readStoredNotebook(storageKey, initialContent),
    [initialContent, storageKey],
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none font-serif leading-8 text-gray-700 focus:outline-none dark:text-gray-200",
          "prose-headings:font-semibold prose-headings:tracking-[-0.01em] prose-p:my-3 prose-ul:my-3 prose-ol:my-3",
          editorClassName,
        ),
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      const html = activeEditor.getHTML();
      writeStoredNotebook(storageKey, html);
      onChange?.(html);
    },
  });

  const buttons: ToolbarButton[] = editor
    ? [
        {
          label: "Heading",
          icon: Heading2,
          active: editor.isActive("heading", { level: 2 }),
          onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          label: "Bold",
          icon: Bold,
          active: editor.isActive("bold"),
          onClick: () => editor.chain().focus().toggleBold().run(),
        },
        {
          label: "Italic",
          icon: Italic,
          active: editor.isActive("italic"),
          onClick: () => editor.chain().focus().toggleItalic().run(),
        },
        {
          label: "Bullet list",
          icon: List,
          active: editor.isActive("bulletList"),
          onClick: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
          label: "Numbered list",
          icon: ListOrdered,
          active: editor.isActive("orderedList"),
          onClick: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
          label: "Quote",
          icon: Quote,
          active: editor.isActive("blockquote"),
          onClick: () => editor.chain().focus().toggleBlockquote().run(),
        },
        {
          label: "Undo",
          icon: Undo2,
          disabled: !editor.can().chain().focus().undo().run(),
          onClick: () => editor.chain().focus().undo().run(),
        },
        {
          label: "Redo",
          icon: Redo2,
          disabled: !editor.can().chain().focus().redo().run(),
          onClick: () => editor.chain().focus().redo().run(),
        },
      ]
    : [];

  return (
    <article
      className={cn(
        "rounded-md border border-black/[0.08] bg-[#fffcf6] p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#15130f]",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-black/[0.06] pb-3 dark:border-white/[0.08]">
        {buttons.map((button) => {
          const Icon = button.icon;
          return (
            <button
              key={button.label}
              type="button"
              aria-label={button.label}
              aria-pressed={button.active === undefined ? undefined : button.active}
              title={button.label}
              disabled={button.disabled}
              onClick={button.onClick}
              data-active={button.active ? "true" : "false"}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md border text-gray-600 transition dark:text-gray-300",
                button.active
                  ? "border-[#d97757]/35 bg-[#d97757]/12 text-[#ad5f45] dark:text-[#f0b39a]"
                  : "border-black/[0.06] bg-white hover:border-[#d97757]/30 hover:text-[#ad5f45] dark:border-white/[0.08] dark:bg-white/[0.04]",
                button.disabled && "cursor-not-allowed opacity-40 hover:border-black/[0.06] hover:text-gray-600",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className="border-l-2 border-[#d97757] pl-5">
        {editor ? (
          <EditorContent editor={editor} data-testid={testId} />
        ) : (
          <div className="text-sm text-gray-400">Loading notebook editor...</div>
        )}
      </div>
      {footer ? (
        <div className="mt-4 border-t border-black/[0.05] pt-3 dark:border-white/[0.05]">
          {footer}
        </div>
      ) : null}
    </article>
  );
}

export default RichNotebookEditor;
