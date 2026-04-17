import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Mark, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Image from "@tiptap/extension-image";
import { useTiptapSync } from "@convex-dev/prosemirror-sync/tiptap";

import { useConvexApi } from "@/lib/convexApi";
import type { EntityMatch } from "./MentionPicker";
import type { BlockChip } from "./BlockChipRenderer";
import { chipsToProsemirrorDoc, prosemirrorDocToChips } from "../../../../../shared/notebookBlockProsemirror";

type Props = {
  syncDocumentId: string;
  chips: BlockChip[];
  className: string;
  isEditable: boolean;
  ariaLabel: string;
  autoFocus?: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onLocalContentChange?: (content: BlockChip[]) => void;
  onEnter: () => void;
  onBackspaceAtStart: () => void;
  onOpenSlash: () => void;
  onCloseSlash: () => void;
};

export type NotebookBlockEditorHandle = {
  insertMention: (match: EntityMatch) => void;
  focus: () => void;
};

const Underline = Mark.create({
  name: "underline",
  parseHTML() {
    return [{ tag: "u" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["u", HTMLAttributes, 0];
  },
});

const NotebookMention = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mentionSuggestionChar: {
        default: "@",
      },
      label: {
        default: null,
      },
    };
  },
  renderText({ node }) {
    const trigger =
      typeof node.attrs.mentionSuggestionChar === "string"
        ? node.attrs.mentionSuggestionChar
        : "@";
    const label =
      typeof node.attrs.label === "string"
        ? node.attrs.label
        : typeof node.attrs.id === "string"
          ? node.attrs.id
          : "";
    return `${trigger}${label}`;
  },
  renderHTML({ node, HTMLAttributes }) {
    const trigger =
      typeof node.attrs.mentionSuggestionChar === "string"
        ? node.attrs.mentionSuggestionChar
        : "@";
    const label =
      typeof node.attrs.label === "string"
        ? node.attrs.label
        : typeof node.attrs.id === "string"
          ? node.attrs.id
          : "";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class:
          "rounded px-1 text-[var(--accent-primary)] bg-[var(--accent-primary)]/10",
        "data-type": "mention",
        "data-mention-target":
          typeof node.attrs.id === "string" ? node.attrs.id : undefined,
        "data-mention-trigger": trigger,
      }),
      `${trigger}${label}`,
    ];
  },
});

export const NotebookBlockEditor = forwardRef<NotebookBlockEditorHandle, Props>(
  function NotebookBlockEditor(
    {
      syncDocumentId,
      chips,
      className,
      isEditable,
      ariaLabel,
      autoFocus = false,
      onFocus,
      onBlur,
      onLocalContentChange,
      onEnter,
      onBackspaceAtStart,
      onOpenSlash,
      onCloseSlash,
    },
    ref,
  ) {
    const api = useConvexApi();
    const createRequestedRef = useRef(false);
    const lastPublishedRef = useRef<string>("");

    const syncApi = useMemo(
      () =>
        api?.domains.product.blockProsemirror
          ? {
              getSnapshot: api.domains.product.blockProsemirror.getSnapshot,
              latestVersion: api.domains.product.blockProsemirror.latestVersion,
              getSteps: api.domains.product.blockProsemirror.getSteps,
              submitSteps: api.domains.product.blockProsemirror.submitSteps,
              submitSnapshot: api.domains.product.blockProsemirror.submitSnapshot,
            }
          : null,
      [api],
    );

    const sync = useTiptapSync(
      (syncApi ?? {
        getSnapshot: "skip",
        latestVersion: "skip",
        getSteps: "skip",
        submitSteps: "skip",
        submitSnapshot: "skip",
      }) as any,
      syncDocumentId,
      {
        snapshotDebounceMs: 900,
      },
    );

    useEffect(() => {
      if (sync.isLoading || sync.initialContent !== null || createRequestedRef.current) {
        return;
      }
      createRequestedRef.current = true;
      void sync.create(chipsToProsemirrorDoc(chips));
    }, [chips, sync]);

    const editor = useEditor(
      sync.initialContent
        ? {
            immediatelyRender: false,
            editable: isEditable,
            content: sync.initialContent,
            extensions: [
              StarterKit.configure({
                heading: false,
                blockquote: false,
                codeBlock: false,
                bulletList: false,
                orderedList: false,
                listItem: false,
                horizontalRule: false,
              }),
              Underline,
              Link.configure({
                openOnClick: false,
                autolink: true,
              }),
              Image,
              NotebookMention.configure({
                suggestion: {
                  char: "@",
                  items: () => [],
                },
              }),
              sync.extension!,
            ],
            editorProps: {
              attributes: {
                class: `outline-none focus-visible:outline-none ${className} ${
                  !isEditable ? "cursor-default opacity-80" : ""
                }`,
                role: "textbox",
                "aria-label": ariaLabel,
                "aria-readonly": String(!isEditable),
              },
              handleKeyDown(view, event) {
                const textContent = view.state.doc.textContent;
                if (!isEditable) {
                  if (event.key === "Escape") onCloseSlash();
                  if (
                    event.key === "/" ||
                    event.key === "Enter" ||
                    event.key === "Backspace" ||
                    event.key.length === 1
                  ) {
                    event.preventDefault();
                    return true;
                  }
                  return false;
                }
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onEnter();
                  return true;
                }
                if (event.key === "Backspace" && textContent.length === 0) {
                  event.preventDefault();
                  onBackspaceAtStart();
                  return true;
                }
                if (event.key === "/" && !event.shiftKey && textContent.length === 0) {
                  event.preventDefault();
                  onOpenSlash();
                  return true;
                }
                if (event.key === "Escape") {
                  onCloseSlash();
                }
                return false;
              },
            },
            onFocus,
            onBlur,
            onUpdate({ editor: activeEditor }) {
              if (!onLocalContentChange) return;
              const nextContent = prosemirrorDocToChips(activeEditor.getJSON()) as BlockChip[];
              const signature = JSON.stringify(nextContent);
              if (signature === lastPublishedRef.current) return;
              lastPublishedRef.current = signature;
              onLocalContentChange(nextContent);
            },
          }
        : null,
      [ariaLabel, className, isEditable, onBackspaceAtStart, onBlur, onCloseSlash, onEnter, onFocus, onLocalContentChange, onOpenSlash, sync.extension, sync.initialContent],
    );

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(isEditable);
    }, [editor, isEditable]);

    useEffect(() => {
      if (!editor || !autoFocus) return;
      editor.commands.focus("end");
    }, [autoFocus, editor]);

    useImperativeHandle(
      ref,
      () => ({
        insertMention(match) {
          if (!editor) return;
          editor
            .chain()
            .focus()
            .insertContent([
              {
                type: "mention",
                attrs: {
                  id: match.slug,
                  label: match.name,
                  mentionSuggestionChar: "@",
                },
              },
              { type: "text", text: " " },
            ])
            .run();
        },
        focus() {
          editor?.commands.focus("end");
        },
      }),
      [editor],
    );

    if (!api || sync.isLoading || !sync.extension || sync.initialContent === null || !editor) {
      return (
        <div className={`opacity-70 ${className}`} aria-label={ariaLabel}>
          Loading…
        </div>
      );
    }

    return <EditorContent editor={editor} />;
  },
);

export default NotebookBlockEditor;
