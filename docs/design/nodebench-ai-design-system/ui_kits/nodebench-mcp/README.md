# NodeBench MCP — CLI Kit

Terminal-style UI kit for the `nodebench-mcp` distribution lane. Pure HTML
+ CSS — no React — because terminal output is text anyway.

## Files

- `index.html` — Two stacked terminal windows:
  1. Install + first `investigate` run with plan, streaming, answer
     packet, and verification pills.
  2. `--list-presets` table, `discover_tools`/`load_toolset`, `track`,
     and an error path (missing env var).
- `terminal.css` — Terminal theme. Palette is the brand dark surface with
  brighter ANSI-style accents (success green, warn amber, fail red,
  indigo for the user prompt, terracotta for agent output).

## Rules followed

- **Commands taken verbatim** from `packages/mcp-local/GETTING_STARTED.md`:
  `claude mcp add nodebench`, `investigate`, `compare`, `track`, `report`,
  `discover_tools`, `load_toolset`, plus `--preset {founder, cursor, power,
  admin, full}`.
- **Status glyphs only** (✓ / ✗ / ▸ / ›) — no decorative emoji.
- **Dry, operator copy** — matches the README ("worth reaching out",
  "saved report"). No exclamation marks.
- **Mono-only inside the terminal.** Everything outside the terminal
  (labels, titlebar) uses the sans stack.
- **Receipts over claims.** Numbers (p95, rev multiple, NRR) appear in
  the same visual weight as the prose.

## Not included

- Live interaction — this is a static visual kit.
- ANSI escape reference / color compatibility tables. If you need real CLI
  rendering, map these classes to `chalk` or `picocolors` in production.
