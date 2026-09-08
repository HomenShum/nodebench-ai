# Read and copy agent output

A reviewer inspecting an execution trace or product direction memo needs the exact source, even when syntax highlighting or the clipboard is unavailable. The shared `LazyCodeBlock` keeps source and its copy action present while the renderer loads, reports copy failure with a retry/manual-selection option, and invalidates copied feedback when the source changes.

## Owning surfaces

- `apps/web/src/shared/components/LazyCodeBlock.tsx`: stable wrapper, copy lifecycle, lazy loading and chunk-failure fallback.
- `apps/web/src/components/ai-elements/code-block.tsx`: existing Shiki renderer shared with agent chat and tool output.
- `/execution-trace` and `/product-direction`: the strategy views use the wrapper for typed output and schema JSON. Their backend/query and navigation behavior is unchanged.

The wrapper accepts `code`, optional `language`, `showLineNumbers`, and `className`. Unknown languages and sources longer than 64,000 UTF-16 code units remain plain text; the content is never truncated. The highlighter is optional. A renderer chunk failure leaves readable, copyable code with a visible status. A grammar failure preserves plain source. Both rendered paths use real newline text nodes, with line numbers supplied through CSS rather than copied source text.

Shiki's asynchronous shorthand reuses its grammar/theme singleton. The application no longer retains lifetime Maps of private snippets, token results or subscribers. Results belong to mounted components and are checked against their source/language; late results from a changed or closed review cannot replace current content. This removes app-owned snippet caches, not every allocation or cache inside the third-party engine. See [Shiki performance guidance](https://shiki.style/guide/best-performance).

The Copy action preserves the original string, including trailing newlines. Manual selection follows the browser's native `<pre>` behavior; Chromium can trim final newlines from a selection even when the DOM contains them. Copy completion belongs to the current request and source. Repeated clicks coalesce while a request is pending; source changes and unmounts clear feedback timers and invalidate late completions.

## Verification

Run the five suites in CI's **Shared code renderer contracts** step. They cover delayed/out-of-order highlights, 12 concurrent reviews, 256 source updates, unknown/prototype-shaped languages, large output, blank lines and HTML-like text, load failure, clipboard rejection/retry, 12 rapid clicks, 24 source changes, unmount and surrounding-form behavior. Clipboard and loader failures are controlled test boundaries; these are not paid-provider or production-tenant tests.

For visual acceptance, compare actual rendered before/after pixels at 1440, 768 and 390 CSS pixels in both themes. Inspect keyboard focus and horizontal code scrolling, visible copy labels, copy failure/retry, loading and failed-module states, and full source preservation. Keep DOM, console and screenshot evidence for each exact viewport before resizing. Test real device/clipboard permissions and assistive technology separately; a component fixture cannot certify the full authenticated route.

The retired `react-syntax-highlighter` package and its types are no longer needed. Keep the separate patched root `prismjs` dependency: proposal diff rendering still requires it. Do not remove it based only on the shared wrapper's migration.
