# @Mentions Implementation Guide

## Overview

The @mentions feature in our unified editor allows users to reference other documents inline within their content. This creates a rich, interconnected knowledge graph where documents can link to each other, enabling quick navigation and context-aware editing.

## Architecture

### 1. **TipTap Mention Extension** (Editor Layer)

The mentions are implemented using TipTap's `Mention` extension, which is configured in:
- `src/components/UnifiedEditor.tsx` (canonical editor implementation)

#### Key Components:

**Custom Mention Extension:**
```typescript
const MentionWithId = Mention.extend({
  addAttributes() {
    return {
      id: {
        default: null,
        renderHTML: attributes => ({ 'data-document-id': attributes.id }),
        parseHTML: (element) => element.getAttribute('data-document-id'),
      },
      label: {
        default: null,
      },
    };
  },
});
```

**Configuration:**
```typescript
MentionWithId.configure({
  HTMLAttributes: { class: 'mention' },
  suggestion: {
    char: '@',
    startOfLine: false,
    items: async ({ query }: { query: string }) => {
      // Search logic (see below)
    },
    command: ({ editor, range, props }: any) => {
      // Insertion logic
    },
    render: createRenderer, // Custom dropdown UI
  },
})
```

### 2. **Search & Suggestion System**

When a user types `@`, the system provides intelligent suggestions:

**Empty Query (No Search Term):**
- Shows 8 most recently modified documents
- Uses `api.documents.getRecentForMentions`
- Sorted by `lastModified` or `_creationTime`

**With Search Term:**
- Full-text search across document titles
- Uses `api.documents.getSearch`
- Leverages Convex search index on `title` field
- Returns up to 50 results

**Backend Queries:**

<augment_code_snippet path="convex/documents.ts" mode="EXCERPT">
```typescript
// Recent documents for default @-mention suggestions
export const getRecentForMentions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();
    
    // Sort by lastModified if available, otherwise by creation time
    docs.sort((a, b) => {
      const aTime = (a as any).lastModified || a._creationTime;
      const bTime = (b as any).lastModified || b._creationTime;
      return bTime - aTime;
    });
    
    return docs.slice(0, limit ?? 8);
  },
});

export const getSearch = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    return await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query)
         .eq("createdBy", userId)
         .eq("isArchived", false)
      )
      .take(50);
  },
});
```
</augment_code_snippet>

### 3. **Custom Dropdown Renderer**

The suggestion dropdown is rendered using a custom in-DOM renderer (no external dependencies):

**Features:**
- Positioned absolutely below the cursor
- Keyboard navigation (Arrow keys, Enter)
- Click selection
- Auto-updates as user types
- Cleans up on exit

**Implementation Pattern:**
```typescript
const createRenderer = () => {
  let el: HTMLDivElement | null = null;
  let items: Array<{ label: string; id?: string }> = [];
  let selectedIndex = 0;

  return {
    onStart: (props: any) => {
      el = window.document.createElement('div');
      el.className = 'mention-suggestions';
      window.document.body.appendChild(el);
      updateList(props);
    },
    onUpdate: (props: any) => updateList(props),
    onKeyDown: (props: any) => {
      // Handle arrow keys and Enter
    },
    onExit: () => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      el = null;
    },
  };
};
```

### 4. **Hover Preview System**

When users hover over a mention, they see a preview popover with document details.

**Component:** `src/components/MentionHoverPreview.tsx`

**Features:**
- 350ms delay before showing (debounced)
- Shows document title and content preview (200 chars)
- "Quick Edit" button to open inline editor
- Positioned above the mention with arrow pointer
- Stays open when mouse enters popover

**Implementation:**
```typescript
// Detect hover on .mention elements
const onPointerOver = (e: Event) => {
  const mentionEl = target?.closest('.mention');
  const rawId = mentionEl.getAttribute('data-document-id');
  
  delayRef.current = setTimeout(() => {
    setHover({
      documentId: rawId,
      position: { x: rect.left + rect.width / 2, y: rect.top },
      label: mentionEl.textContent,
    });
  }, 350);
};
```

### 5. **Click Navigation**

Clicking on a mention navigates to the referenced document.

**Navigation Event:**
```typescript
window.dispatchEvent(
  new CustomEvent('nodebench:openDocument', {
    detail: { 
      documentId: rawId, 
      openInGrid: Boolean(me.metaKey || me.ctrlKey),
      sourceDocumentId 
    },
  })
);
```

**Modifier Keys:**
- **Normal Click:** Opens document in single view
- **Cmd/Ctrl + Click:** Opens document in grid mode alongside current document
- **Middle Click (button === 1):** Also opens in grid mode

**Event Handler** (in `MainLayout.tsx`):
```typescript
useEffect(() => {
  const handler = (evt: Event) => {
    const e = evt as CustomEvent<{ 
      documentId?: string; 
      openInGrid?: boolean; 
      sourceDocumentId?: string 
    }>;
    
    const docId = e.detail?.documentId;
    const openInGrid = Boolean(e.detail?.openInGrid);
    
    setCurrentView('documents');
    
    if (openInGrid) {
      setIsGridMode(true);
      // Open both source and target documents
    } else {
      onDocumentSelect(docId);
    }
  };
  
  window.addEventListener('nodebench:openDocument', handler);
  return () => window.removeEventListener('nodebench:openDocument', handler);
}, [onDocumentSelect]);
```

## Data Flow

```
User types '@'
    ↓
TipTap triggers suggestion
    ↓
Query backend (getRecentForMentions or getSearch)
    ↓
Render dropdown with results
    ↓
User selects document
    ↓
Insert mention node with { id, label }
    ↓
Render as <span class="mention" data-document-id="...">@Title</span>
    ↓
User hovers → Show preview popover
    ↓
User clicks → Navigate to document
```

## Storage Format

Mentions are stored in ProseMirror JSON format:

```json
{
  "type": "mention",
  "attrs": {
    "id": "k57abc123...",
    "label": "Project Roadmap"
  }
}
```

**HTML Rendering:**
```html
<span class="mention" data-document-id="k57abc123...">@Project Roadmap</span>
```

## Styling

Mentions use the `.mention` CSS class:

```css
.mention {
  color: var(--accent-primary);
  background: var(--accent-bg);
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  text-decoration: none;
}

.mention:hover {
  background: var(--accent-bg-hover);
}
```

## Integration Points

### UnifiedEditor (BlockNote-based) ✅
- **Full support** for @mentions and #hashtags
- Uses TipTap Mention extension via BlockNote's `_tiptapOptions.extensions`
- Custom mention extension with hover and click handlers
- Integrated with MentionHoverPreview and TagHoverPreview components
- Supports all three editor modes: full, quickEdit, and quickNote

### Legacy Editor_nb3 (Deprecated)
- **Removed** as of latest migration
- All functionality migrated to UnifiedEditor
- No longer maintained

## Related Features

### #Hashtags
Similar implementation for tags using the same TipTap Mention extension:
- Trigger character: `#`
- Searches tags via `api.tags.search`
- Allows creating new tags inline
- Renders with `.hashtag` class
- Automatically links tags to documents

### Document Links in Dossiers
- Dossier media gallery can extract document links from content
- Double-click opens full document view
- Uses same `nodebench:openDocument` event pattern

## Best Practices

1. **Always use `data-document-id` attribute** for storing the document ID
2. **Use custom events** (`nodebench:openDocument`) for navigation to maintain consistency
3. **Debounce hover events** to avoid performance issues
4. **Clean up event listeners** in useEffect cleanup functions
5. **Support keyboard navigation** in suggestion dropdowns
6. **Handle archived documents** gracefully in search results
7. **Use `runNonHistorical` helper** to prevent undo/redo pollution when inserting mentions programmatically

## Migration Notes (Editor_nb3 → UnifiedEditor)

**Completed:** All @mentions and #hashtags functionality has been successfully migrated from Editor_nb3 to UnifiedEditor.

**Key Changes:**
- Mention and hashtag extensions now defined in UnifiedEditor.tsx (lines 145-430)
- Both extensions use the same TipTap Mention base with custom attributes
- MentionHoverPreview and TagHoverPreview components integrated
- All legacy Editor_nb3 files removed from codebase
- Editor.tsx wrapper updated to only support "unified" and "legacy" engines

## Future Enhancements

- [ ] Show document type icons in mention suggestions
- [ ] Add mention analytics (track which documents are most referenced)
- [ ] Support @user mentions for collaboration
- [ ] Add backlinks panel showing all documents that mention current document
- [ ] Implement mention autocomplete in mobile view
- [ ] Add rich preview cards on hover (beyond current text preview)

