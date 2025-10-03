# Web.Fetch Template Variable Fix

**Issue:** ENOENT error when web.fetch receives unresolved template variables  
**Commit:** 395c806  
**Date:** January 2025

## Problem

The orchestrator was generating `web.fetch` nodes with payloads containing unresolved template variables:

```typescript
{
  kind: 'custom',
  tool: 'web.fetch',
  payload: { url: '${search_prices.url}' }  // ❌ Wrong syntax
}
```

When the `fetchUrlTool` received this, it tried to open `${search_prices.url}` as a local file path, resulting in:

```
ENOENT: no such file or directory, open '/var/task/agents/app/demo_scenarios/${search_prices.url}'
```

## Root Cause

Two issues:
1. **Wrong template syntax:** The eval was generating `${...}` instead of `{{channel:...}}`
2. **No validation:** `fetchUrlTool` didn't validate URLs before attempting file operations

## Solution

### 1. Enhanced URL Validation in `fetchUrlTool`

Added validation to detect and reject unresolved template variables:

```typescript
// Validate URL is not empty and doesn't contain unresolved template variables
if (!url) {
  throw new Error('web.fetch requires a non-empty url parameter');
}
if (url.includes('${') || url.includes('{{channel:')) {
  throw new Error(
    `web.fetch received unresolved template variable in URL: "${url}". ` +
    `Ensure upstream nodes have completed and channel references are resolved.`
  );
}
```

### 2. Added Size Limits and Better Logging

```typescript
const maxBytes = args?.maxBytes || 1_000_000; // 1MB default

// Read response with size limit
const buffer = await res.arrayBuffer();
if (buffer.byteLength > maxBytes) {
  throw new Error(`Response too large: ${buffer.byteLength} bytes (max: ${maxBytes})`);
}

ctx.trace.info('web.fetch.complete', { url, size: text.length });
```

### 3. Correct Template Syntax

The orchestrator already uses the correct `{{channel:...}}` syntax. The eval prompt now explicitly shows examples:

```typescript
// ✅ Correct syntax for web.fetch payload
{
  url: "{{channel:search_prices.last}}",
  maxBytes: 500000
}
```

## Expected Behavior

### Before Fix
```
User: "Analyze GOOGL stock prices"
→ eval generates: { url: "${search_prices.url}" }
→ web.fetch tries to open file: /var/task/.../demo_scenarios/${search_prices.url}
→ ENOENT error
```

### After Fix
```
User: "Analyze GOOGL stock prices"
→ eval generates: { url: "{{channel:search_prices.last}}" }
→ orchestrator resolves: { url: "https://finance.yahoo.com/..." }
→ web.fetch validates URL (no template vars)
→ Fetches content successfully
```

## Error Messages

### Unresolved Template Variable
```
Error: web.fetch received unresolved template variable in URL: "{{channel:search_prices.last}}".
Ensure upstream nodes have completed and channel references are resolved.
```

This indicates the orchestrator's channel resolution failed. Check:
- Upstream node completed successfully
- Channel ID matches exactly
- Node output is non-empty

### Empty URL
```
Error: web.fetch requires a non-empty url parameter
```

The payload didn't include a `url` field or it was empty.

### Response Too Large
```
Error: Response too large: 5242880 bytes (max: 1000000)
```

The fetched content exceeded the size limit. Increase `maxBytes` in the payload:

```typescript
{
  url: "https://example.com/large-file.csv",
  maxBytes: 10_000_000  // 10MB
}
```

## Testing

### Valid HTTP URL
```typescript
await fetchUrlTool()({ url: 'https://example.com' }, ctx);
// ✅ Fetches and returns content
```

### Valid Local File (demo scenarios)
```typescript
await fetchUrlTool()({ url: 'task_spec_trip_sf.json' }, ctx);
// ✅ Reads from agents/app/demo_scenarios/
```

### Unresolved Template (should fail)
```typescript
await fetchUrlTool()({ url: '${search.url}' }, ctx);
// ❌ Throws: "web.fetch received unresolved template variable..."
```

### Unresolved Channel Ref (should fail)
```typescript
await fetchUrlTool()({ url: '{{channel:search.last}}' }, ctx);
// ❌ Throws: "web.fetch received unresolved template variable..."
```

## Migration Guide

No breaking changes. Existing workflows continue to work.

### For Custom Graphs

If you're manually creating graphs with `web.fetch` nodes:

**Before:**
```typescript
{
  id: 'fetch_data',
  kind: 'custom',
  tool: 'web.fetch',
  payload: { url: '${upstream.url}' }  // ❌ Wrong
}
```

**After:**
```typescript
{
  id: 'fetch_data',
  kind: 'custom',
  tool: 'web.fetch',
  payload: { url: '{{channel:upstream.last}}' }  // ✅ Correct
}
```

### For Eval Prompts

The bootstrap eval prompt already includes correct examples. If you're writing custom eval prompts, use:

```
For custom kinds, ALWAYS set 'tool' and a JSON 'payload'. Examples:
- web.fetch: { url: "{{channel:search_prices.last}}", maxBytes: 500000 }
```

## Related Files

- `agents/tools/fetchUrl.ts` - Enhanced validation and error messages
- `agents/core/orchestrator.ts` - Channel reference resolution
- `convex/agents/promptPlan.ts` - Bootstrap eval with correct syntax examples

## Future Enhancements

1. **Auto-extract URLs from search results:** If search returns structured data with URLs, automatically extract the first valid URL
2. **Retry with fallback:** If a URL fails, try alternative sources from search results
3. **Content-type detection:** Parse and validate content based on MIME type
4. **Streaming for large files:** Support streaming downloads for files > 10MB

---

**Questions?** See `docs/ORCHESTRATOR_FIXES_SUMMARY.md` for the broader dataflow architecture.

