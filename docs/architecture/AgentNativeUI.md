# AgentNativeUI

This repo treats agent traversal as a first-class product contract.

The rule is simple: every screen must be understandable to:

- a human using the visual UI
- keyboard and assistive tech users
- WebMCP browser agents
- Chrome DevTools MCP and DOM-driven automation

## Required screen root attributes

Every routed screen must render inside the shared `AgentScreen` contract or an equivalent root exposing:

- `data-main-content`
- `data-screen-id`
- `data-screen-title`
- `data-screen-path`
- `data-screen-state`
- `data-screen-surface="primary"`
- `data-agent-id="view:<screen-id>:content"`
- `data-agent-label`
- `data-current-view`
- `data-route-view`

Screen roots must also be a real landmark or region with an accessible label.

## Required action metadata

Interactive controls that agents are expected to use must expose:

- `data-agent-id`
- `data-agent-action`
- `data-agent-label`
- `data-agent-target` when navigation or cross-surface open behavior exists

Required for:

- `button`
- `a`
- `input`
- `textarea`
- `select`
- custom interactive elements that act like the controls above

Container-only surfaces may use `data-agent-id` without `data-agent-action`.

Prefer the shared helper in `src/shared/agent-ui/agentAction.ts` for new code so button and link metadata are generated from a single contract instead of ad hoc string literals.

## Required async state markers

Every route view must visibly support:

- loading
- empty
- error

At the shell level, the active screen root must expose `data-screen-state` with one of:

- `ready`
- `loading`
- `empty`
- `error`
- `blocked`

## Required modal semantics

Dialogs, palettes, drawers, and panels must expose a single active interaction scope using one of:

- `role="dialog"`
- `aria-modal="true"`
- a stable `aria-label` on the active panel root
- `DialogOverlay` or an equivalent abstraction that renders the semantics above

When a modal is open, background controls must not appear to be the active surface.

## Naming conventions for `data-agent-*`

Use lowercase, colon-separated, kebab-case segments:

- `chrome:action:settings`
- `sidebar:nav:home`
- `view:funding:content`
- `cmd:search`

Rules:

- lowercase only
- kebab-case within each segment
- use stable nouns, not presentation wording
- prefer `area:type:name`
- reserve `view:<id>:content` for screen roots

## Enforcement

Run:

```bash
npm run lint:agent-ui
```

This check enforces:

- required screen root attributes on `data-main-content`
- required action metadata on interactive elements with `data-agent-id`
- naming conventions for static `data-agent-id` strings
- basic modal semantics on modal/dialog components
- loading and empty-state coverage on route views

See also:

- `docs/architecture/AGENT_NATIVE_UI_MCP_COMPATIBILITY.md`
