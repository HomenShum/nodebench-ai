# Popover Mini Editors

Canonical, compact editors for quick edits in popovers or hover previews. These are intentionally lightweight and safe to mount inside interactive popovers.

## Entry Point

`PopoverMiniEditor.tsx` is the single entry component that routes to the right mini editor based on `kind`.

```tsx
// usage
<PopoverMiniEditor kind="task" taskId={taskId} onClose={close} />
<PopoverMiniEditor kind="event" eventId={eventId} onClose={close} />
<PopoverMiniEditor kind="document" documentId={docId} onClose={close} />
<PopoverMiniEditor kind="spreadsheet" documentId={fileDocId} onClose={close} />
```

## Props

```ts
export type PopoverMiniEditorProps =
  | { kind: "task"; taskId: Id<"tasks">; onClose: () => void }
  | { kind: "event"; eventId: Id<"events">; onClose: () => void; documentIdForAssociation?: Id<"documents"> | null }
  | { kind: "document"; documentId: Id<"documents">; onClose: () => void }
  | { kind: "spreadsheet"; documentId: Id<"documents">; onClose: () => void };
```

- `onClose` is always required. Implementers should close the surrounding popover when called.
- Editors trap hotkeys: `Esc` closes (calls `onClose`), `Ctrl/Cmd+S` saves.

## Specific Editors

- `TaskMiniEditor.tsx`
  - Wraps the existing `agenda/InlineTaskEditor` for full-featured task quick edits.
- `EventMiniEditor.tsx`
  - Wraps the existing `InlineEventEditor` for event quick edits.
- `DocumentMiniEditor.tsx`
  - Minimal title-only editor for document rename. Calls `api.documents.update`.
- `SpreadsheetMiniEditor.tsx`
  - For CSV file-docs. Updates `documents.update` (title) and `files.renameFile` (fileName).

## Patterns & Guidance

- Keep the UI small and fast. Avoid multi-step flows. Use single-input edits and compact chips.
- Do not render large editors (full content editing) inside popovers; route those to the main Editor view.
- Prefer placing Quick Edit buttons on hover previews (e.g., mention/tag hover) to toggle these editors inline.

## Examples

- In mini calendar day preview, rendering task/event editors inside the pinned preview:

```tsx
{editTarget.kind === "task" && (
  <PopoverMiniEditor kind="task" taskId={taskId} onClose={close} />
)}
{editTarget.kind === "event" && (
  <PopoverMiniEditor kind="event" eventId={eventId} onClose={close} />
)}
```

- In a document quick edit popover (title vs. CSV file-doc):

```tsx
const fileDoc = useQuery(api.fileDocuments.getFileDocument, { documentId });
return fileDoc?.document.fileType === "csv"
  ? <PopoverMiniEditor kind="spreadsheet" documentId={documentId} onClose={close} />
  : <PopoverMiniEditor kind="document" documentId={documentId} onClose={close} />
```

## Notes

- These components depend on existing Convex mutations/queries already present in this codebase.
- Debounce and autosave patterns should be handled inside the specific editors when needed.
- Keep imports at the top and avoid introducing side-effects in render paths.
