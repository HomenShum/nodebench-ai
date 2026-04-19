import {
  useCallback,
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
import Placeholder from "@tiptap/extension-placeholder";
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
    const isEditableRef = useRef(isEditable);
    const onFocusRef = useRef(onFocus);
    const onBlurRef = useRef(onBlur);
    const onLocalContentChangeRef = useRef(onLocalContentChange);
    const onEnterRef = useRef(onEnter);
    const onBackspaceAtStartRef = useRef(onBackspaceAtStart);
    const onOpenSlashRef = useRef(onOpenSlash);
    const onCloseSlashRef = useRef(onCloseSlash);
    const baseExtensions = useMemo(
      () => [
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
        // Framework audit §6 / violation #6: first-time users had no hint
        // the editor does more than typing. A single ghost-text prompt
        // ("Type / for commands…") when the block is empty + focused gives
        // discoverability without chrome. Hidden as soon as the user
        // begins typing — Tiptap's Placeholder handles that natively.
        Placeholder.configure({
          placeholder: "Type / for commands…",
          showOnlyCurrent: true,
          includeChildren: false,
          emptyEditorClass: "is-empty",
          emptyNodeClass: "is-empty",
        }),
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
      ],
      [],
    );

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

    useEffect(() => {
      isEditableRef.current = isEditable;
    }, [isEditable]);

    useEffect(() => {
      onFocusRef.current = onFocus;
      onBlurRef.current = onBlur;
      onLocalContentChangeRef.current = onLocalContentChange;
      onEnterRef.current = onEnter;
      onBackspaceAtStartRef.current = onBackspaceAtStart;
      onOpenSlashRef.current = onOpenSlash;
      onCloseSlashRef.current = onCloseSlash;
    }, [onBackspaceAtStart, onBlur, onCloseSlash, onEnter, onFocus, onLocalContentChange, onOpenSlash]);

    const editorOptions = useMemo(
      () => ({
        immediatelyRender: false,
        editable: isEditableRef.current,
        content:
          sync.initialContent ??
          ({
            type: "doc",
            content: [{ type: "paragraph" }],
          } as const),
        extensions: sync.extension ? [...baseExtensions, sync.extension] : baseExtensions,
        editorProps: {
          attributes: {
            class: `outline-none focus-visible:outline-none ${className} ${
              !isEditableRef.current ? "cursor-default opacity-80" : ""
            }`,
            role: "textbox",
            "aria-label": ariaLabel,
            "aria-readonly": String(!isEditableRef.current),
          },
          handleKeyDown(view, event) {
            const textContent = view.state.doc.textContent;
            if (!isEditableRef.current) {
              if (event.key === "Escape") onCloseSlashRef.current();
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
              onEnterRef.current();
              return true;
            }
            if (event.key === "Backspace" && textContent.length === 0) {
              event.preventDefault();
              onBackspaceAtStartRef.current();
              return true;
            }
            if (event.key === "/" && !event.shiftKey && textContent.length === 0) {
              event.preventDefault();
              onOpenSlashRef.current();
              return true;
            }
            if (event.key === "Escape") {
              onCloseSlashRef.current();
            }
            return false;
          },
        },
        onFocus() {
          onFocusRef.current();
        },
        onBlur() {
          onBlurRef.current();
        },
        onUpdate({ editor: activeEditor }: { editor: { getJSON: () => unknown } }) {
          const onLocalContentChange = onLocalContentChangeRef.current;
          if (!onLocalContentChange || sync.initialContent === null || !sync.extension) return;
          const nextContent = prosemirrorDocToChips(activeEditor.getJSON()) as BlockChip[];
          const signature = JSON.stringify(nextContent);
          if (signature === lastPublishedRef.current) return;
          lastPublishedRef.current = signature;
          onLocalContentChange(nextContent);
        },
      }),
      [
        ariaLabel,
        baseExtensions,
        className,
        sync.extension,
        sync.initialContent,
      ],
    );

    const editor = useEditor(
      editorOptions,
      [syncDocumentId, sync.extension, sync.initialContent],
    );

    const focusEditorSafely = useCallback(() => {
      if (typeof window === "undefined") return;
      window.requestAnimationFrame(() => {
        if (!editor || editor.isDestroyed) return;
        const mounted =
          Boolean((editor as { view?: { dom?: Node } }).view?.dom?.isConnected) ||
          Boolean((editor.options.element as HTMLElement | null | undefined)?.isConnected);
        if (!mounted) return;
        try {
          editor.commands.focus("end");
        } catch {
          // The sync editor can be re-created during collaboration bursts.
          // Missing a single autofocus attempt is acceptable; crashing the
          // whole live notebook is not.
        }
      });
    }, [editor]);

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(isEditable);
    }, [editor, isEditable]);

    useEffect(() => {
      if (!editor || !autoFocus) return;
      focusEditorSafely();
    }, [autoFocus, editor, focusEditorSafely]);

    useImperativeHandle(
      ref,
      () => ({
        insertMention(match) {
          if (!editor) return;
          const mounted =
            Boolean((editor as { view?: { dom?: Node } }).view?.dom?.isConnected) ||
            Boolean((editor.options.element as HTMLElement | null | undefined)?.isConnected);
          if (!mounted) return;
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
          focusEditorSafely();
        },
      }),
      [editor, focusEditorSafely],
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
