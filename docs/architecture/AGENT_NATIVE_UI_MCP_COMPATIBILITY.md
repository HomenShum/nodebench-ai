# Agent-Native UI MCP Compatibility

Purpose: make every NodeBench screen easy to drive through both:

- WebMCP in-page tools via `navigator.modelContext`
- Chrome DevTools MCP browser automation and inspection

## Current upstream target

As of 2026-03-18, the latest published `chrome-devtools-mcp` release is `v0.20.2`.

Recommended client config:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

Rule: use `@latest` in the config, but document the currently observed release in architecture notes when this file is updated.

## Shell contract

The app shell should expose:

- `data-app-id="nodebench-ai"`
- `data-app-shell="main"`
- `data-agent-surface="app"`
- `data-mcp-compat="webmcp chrome-devtools-mcp"`
- `data-webmcp-enabled="true|false"`

This lets external browser agents verify that they are on the right application shell before acting.

## Screen contract

Every routed screen root should expose:

- `data-screen-id`
- `data-screen-title`
- `data-screen-path`
- `data-screen-state`
- `data-screen-surface="primary"`
- `data-current-view`
- `data-route-view`
- `data-agent-id="view:<view>:content"`
- `data-agent-label`

The screen root should also be a real landmark or region with an accessible label.

## Interaction contract

Primary interactive elements should expose:

- `data-agent-id`
- `data-agent-action`
- `data-agent-label`
- `data-agent-target` when the action navigates or opens another surface

Design goal: the same control should be understandable by:

- a human using the visual UI
- keyboard and assistive tech users
- WebMCP element discovery
- Chrome DevTools MCP DOM and accessibility inspection

## Scope contract

Transient surfaces must declare a single active scope:

- dialogs: `role="dialog"` or `aria-modal="true"`
- agent panel: stable `aria-label`
- command palette: stable `aria-label` or stable labeled input
- drawers and overlays: single visible root, not multiple competing roots

Rule: when a modal or overlay is open, background controls must not appear to be the active interaction surface.

## WebMCP expectations

NodeBench should expose browser-native orientation tools:

- `nodebench_get_app_state`
- `nodebench_get_screen_context`
- `nodebench_query_elements`
- `nodebench_list_views`
- `nodebench_navigate`

These should return enough metadata for an agent to answer:

1. What screen am I on?
2. Which scope is active?
3. Which controls are available in this scope?
4. Is the screen ready?

## Chrome DevTools MCP expectations

Chrome DevTools MCP does not depend on `data-agent-*`, but it benefits from them when debugging the DOM and state transitions.

To keep screens compatible:

- prefer real buttons, inputs, tabs, dialogs, and regions
- always label controls explicitly
- keep screen titles and state visible in the DOM
- avoid hover-only or animation-only affordances
- expose success, loading, and error states as stable text or attributes

## Verification

Use the traversal audit after UI changes:

```bash
npm run dogfood:traverse
```

For targeted runs:

```bash
npx tsx scripts/ui/runUiTraversalAudit.ts --routeStart 0 --routeCount 10 --scopeTimeoutMs 10000 --maxScopeLoops 90
```

The audit should pass before claiming a screen is agent-ready.
