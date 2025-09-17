# UI Design Guideline: Inline Sections vs. Popovers/Modals

This document codifies our current UI preference for interaction surfaces across Nodebench: prefer inline sections below the relevant bar or header over floating popovers or full-screen modals, with an explicit exception for the Enhanced MCP Panel which intentionally uses anchored popovers.

## Rationale

- Lower interaction cost and faster task completion.
- Maintains spatial context; avoids cognitive switch to a separate layer.
- Better keyboard and screen-reader accessibility.
- Fewer positioning/scroll edge cases vs. floating layers.
- Simpler responsive behavior across narrow viewports.

## Patterns and When to Use

### Inline Panels (Preferred)

Use inline panels that expand directly under the bar/section header when the task is:

- A short, focused input or command:
  - Search/filter fields.
  - Analyze URL (single input + submit).
  - Quick configuration with 1–3 small inputs.
- A transient context area that relates to the current section (e.g., MCP quick execution, compact history list).

Behavioral expectations:

- Toggle open/closed via the invoking button (aria-expanded should reflect state).
- Auto-focus the primary input when opened.
- Submit with Enter; close with Escape.
- Provide a clear (X) affordance on the right side of the input.
- Dismiss after success unless the user remains in a multi-action flow.

Styling expectations:

- Container: `px-3 py-2 bg-[var(--bg-secondary)]/50` directly under the section header.
- Inner wrapper: `relative` with a left-aligned icon.
- Input: `w-full pl-8 pr-8 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg focus:ring-1 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)] outline-none transition-all`.
- Left icon (absolute): `h-3.5 w-3.5 text-[var(--text-secondary)]` positioned at `left-3` centered vertically.

### Popovers (Allowed Sparingly, with an Explicit Exception)

Use a popover (anchored, floating) when:

- It’s a lightweight context menu with a small set of actions.
- It’s a read-only or minimal-info tooltip/preview.
- The content is brief and not primarily text-entry.

Exception — EnhancedMcpPanel popovers (as-is):

- EnhancedMcpPanel intentionally uses anchored popovers for:
  - Add Server
  - Execute Tool
  - Usage History (global)
- Rationale:
  - Popovers keep interactions tightly anchored to their triggers in dense tool lists.
  - Prevent large layout shifts inside long, scrollable server/tool sections.
  - Fit quick, compact interactions with clear dismissal patterns (Esc, outside click, close button).
  - Aligns with users’ expectations for tool palettes and inspector-like controls.

Note: Outside this explicit exception, avoid popovers for multi-input forms and prefer inline panels.

### Full-screen/Blocking Modals (Reserved)

Use a modal overlay when:

- The action is destructive or critical (e.g., delete confirmation).
- The flow is multi-step and requires full attention or blocks the background.
- The content is large/complex and cannot fit inline without harming readability.

## Accessibility

- Toggle buttons must set `aria-expanded` and describe the controlled region via `aria-controls` when practical.
- Inputs should be labeled via placeholder plus visually hidden labels where appropriate.
- All actions reachable via keyboard (Enter to submit, Escape to close, Tab order sensible).

## Implementation Guidance

- Prefer inline state booleans (e.g., `showUrlPanel`, `isSearchOpen`) to control panel visibility.
- Do not use `createPortal` for these inline panels; render them in-flow under the header.
- For any data fetch tied to a panel, use Convex React’s `"skip"` sentinel until the panel is opened to avoid unnecessary queries.
- Keep ephemeral inputs in component state and reset on success; keep error state in-line with friendly messages.

## Current References

- `src/components/Sidebar.tsx`
  - Search/Filter: implemented as an inline bar under the header (`isSearchOpen`).
  - Analyze URL: toggles an inline panel under the header with a URL input; Enter submits via `handleUrlAnalysis(url)`, Escape closes.
- `src/components/EnhancedMcpPanel.tsx`
  - Uses anchored popovers (as-is) for Add Server, Execute Tool, and Usage History.
  - Overlays remain only for destructive confirmations (e.g., Delete Server/Tool), which is consistent with this guideline.

### EnhancedMcpPanel Popover Anatomy

- Popovers are anchored to the trigger control and auto-positioned to avoid viewport edges.
- Close patterns: Esc key, outside click, and explicit close button.
- Content:
  - Add Server: compact fields with a clear primary action.
  - Execute Tool: model selector, short natural-language input, small result preview, actions.
  - Usage History: compact scrollable list with status icons.
- Forms are intentionally compact; avoid multi-step or long-form content in these popovers.

## Visual Consistency Tokens

- Icons: lucide-react; sizes `h-3.5 w-3.5` for compact tools.
- Color roles use CSS variables (`var(--text-secondary)`, `var(--bg-hover)`, `var(--border-color)`, `var(--accent-primary)`), ensuring dark/light theme support.
- Motion: preserve subtle transitions; respect `prefers-reduced-motion`.

## QA Checklist

- Inline panel toggles open/close consistently via the invoking button.
- Input autofocus on open; Enter submits, Escape closes.
- Clear control present and accessible.
- Responsive: no layout overlap with sticky headers or scroll clipping.
- Screen reader: labels, roles, and expanded state are correct.

## DocumentsHomeHub: Editing Preferences

The following preferences apply specifically to `src/components/DocumentsHomeHub.tsx` and related task/document editing flows.

### Task Editing

- List mode (e.g., Today’s Agenda, This Week):
  - Use `InlineTaskEditor` inline directly beneath the clicked `TaskRowGlobal`.
  - Do not use floating popovers for multi-field task editing.
  - Keyboard: Enter saves (or applies), Escape closes; keep focus within the inline area while open.
  - Visuals: maintain compact card styling and preserve the status stripe interactions.
  - Quick chips (status, priority, start/due): inline chip click may open a small anchored popover/date picker next to the chip. Keep these popovers single-purpose and dismiss on selection/Escape.
  - Status stripe: left vertical stripe remains clickable (full height, no left-edge rounding); updates status in order todo → in_progress → done → blocked. Prevent stripe clicks from starting drag.

- Kanban mode:
  - Prefer the dedicated `TaskEditorPanel` overlay/panel for full editing.
  - Avoid inline expansion that would disrupt kanban column heights and drag interactions.
  - Do not use anchored popovers for full editing; reserve popovers for tiny, single-action affordances if needed.
  - Allowed quick edits on the card:
    - Click status stripe to cycle status (same behavior as list).
    - Priority selector as a compact popover menu.
    - Due date quick-set as a compact date picker popover.
  - Styling: standardized Kanban card visuals (rounded-xl, focus-within ring), no hover scale/translate/shadow; drag overlay uses consistent ring/rounded.

### Document Editing

- Full content editing should always open in the main Editor view (not inline in DocumentsHomeHub).
- It is acceptable to allow minimal metadata edits (e.g., rename) via a small inline input or compact popover, but:
  - Do not embed a full document editor inline within DocumentsHomeHub.
  - Use consistent input styling and clear Save/Cancel affordances for metadata edits.
  - Rename affordance:
    - Prefer inline rename where possible (text input replaces title within the card/row) with Enter=commit, Escape=cancel.
    - If inline is not feasible in a given context, use a compact anchored popover with a single text input; no multi-field popover for documents.
  - Other metadata (tags, favorite): allowed via small, single-purpose popovers or inline toggles.

### General

- Favor inline panels for small, transient inputs that live with their context.
- Use the Editor view or a dedicated panel for rich, multi-field experiences.
- Avoid large textareas or multi-step forms inside popovers in DocumentsHomeHub.

## Summary

Default to inline panels for short, contextual interactions under the relevant header or bar. Use popovers sparingly for lightweight menus and tips. Reserve full modals for destructive or multi-step flows. Apply consistent structure and styling across components for a cohesive, accessible experience.
