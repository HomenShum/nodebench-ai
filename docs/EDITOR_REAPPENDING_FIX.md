# Editor Reappending Fix

## 🐛 Problem

The final output editor is **reappending results every time you switch between tabs**.

### **Root Cause**

**Component Unmounting/Remounting on Tab Switch**

**File**: `src/components/agentDashboard/AgentDashboard.tsx` (Lines 169-179)

```typescript
{selectedTimelineId ? (
  tab === "timeline" ? (
    <AgentTimeline timelineId={selectedTimelineId} documentId={...} />  // ❌ Unmounts when tab !== "timeline"
  ) : tab === "chat" ? (
    <AgentChats />
  ) : (
    <AgentTasks ... />
  )
) : ...}
```

**What Happens**:
1. User switches from "timeline" → "tasks" tab
2. `<AgentTimeline>` **unmounts** (React removes it from DOM)
3. User switches back "tasks" → "timeline" tab
4. `<AgentTimeline>` **remounts** (React creates new instance)
5. `<UnifiedEditor>` remounts with `seedMarkdown={finalOutput}`
6. **Seeding logic runs again**, appending content to the document

---

## ✅ Solution

### **Option 1: Keep Components Mounted (Recommended)**

Use CSS `display: none` instead of conditional rendering to keep components mounted.

**File**: `src/components/agentDashboard/AgentDashboard.tsx`

**Current Code** (Lines 167-187):
```typescript
<div className="flex-1 min-h-0">
  {selectedTimelineId ? (
    tab === "timeline" ? (
      <AgentTimeline timelineId={selectedTimelineId} documentId={...} />
    ) : tab === "chat" ? (
      <AgentChats />
    ) : (
      <AgentTasks ... />
    )
  ) : ...}
</div>
```

**Fixed Code**:
```typescript
<div className="flex-1 min-h-0">
  {selectedTimelineId ? (
    <>
      {/* Timeline Tab - Keep mounted, hide with CSS */}
      <div style={{ display: tab === "timeline" ? "block" : "none" }} className="h-full">
        <AgentTimeline 
          timelineId={selectedTimelineId} 
          documentId={sorted.find(t => t.timelineId === selectedTimelineId)?.documentId as Id<'documents'> | undefined} 
        />
      </div>

      {/* Chat Tab - Keep mounted, hide with CSS */}
      <div style={{ display: tab === "chat" ? "block" : "none" }} className="h-full">
        <AgentChats />
      </div>

      {/* Tasks Tab - Keep mounted, hide with CSS */}
      <div style={{ display: tab === "tasks" ? "block" : "none" }} className="h-full">
        <AgentTasks
          timelineId={selectedTimelineId}
          onOpenFullView={setFullViewTask}
          onViewTimeline={() => setTab("timeline")}
        />
      </div>
    </>
  ) : (
    tab === "chat" ? (
      <AgentChats />
    ) : (
      <div className="p-6 text-sm text-[var(--text-secondary)]">
        No timelines yet. Create one to get started.
      </div>
    )
  )}
</div>
```

**Why This Works**:
- ✅ Components stay mounted when switching tabs
- ✅ No unmount/remount cycle
- ✅ Editor state persists across tab switches
- ✅ No re-seeding on tab switch
- ✅ Better performance (no re-initialization)

---

### **Option 2: Fix Seeding Logic (Alternative)**

Prevent re-seeding when document already has content.

**File**: `src/components/UnifiedEditor.tsx` (Lines 203-246)

**Current Issue**:
```typescript
// Line 227: Checks if doc ever had content
if (isTriviallyEmpty && seed) {
  if (hadEverContent) { 
    attemptedSeedRef.current = true; 
    return; // ✅ Skips seeding if doc had content before
  }
  // ❌ But if doc is new, it seeds every time component mounts
  attemptedSeedRef.current = true;
  // ... seed logic
}
```

**Problem**: 
- `attemptedSeedRef` is reset on every component mount
- When `AgentTimeline` remounts, `attemptedSeedRef.current` is `false` again
- Seeding logic runs again

**Fix**: Use `documentId` as key to track seeding attempts globally

```typescript
// Add global tracking outside component
const globalSeedAttempts = new Map<string, boolean>();

// Inside useEffect (Line 203)
useEffect(() => {
  const editor: any = sync.editor as any;
  if (!editor) return;
  
  // Check global tracking instead of ref
  const docKey = String(documentId);
  if (globalSeedAttempts.get(docKey)) return; // ✅ Already seeded this doc
  
  const blocks: any[] = Array.isArray(editor.topLevelBlocks) ? editor.topLevelBlocks : [];
  // ... rest of logic
  
  if (isTriviallyEmpty && seed) {
    if (hadEverContent) { 
      globalSeedAttempts.set(docKey, true); // ✅ Mark as attempted
      return; 
    }
    globalSeedAttempts.set(docKey, true); // ✅ Mark as attempted
    void (async () => {
      // ... seed logic
    })();
  }
}, [sync.editor, seedMarkdown, blocksFromMarkdown, documentId, serverHadContent, markHasContent]);
```

**Why This Works**:
- ✅ Tracks seeding attempts globally (survives component unmount)
- ✅ Won't re-seed same document on remount
- ✅ Still allows seeding new documents

---

### **Option 3: Remove `seedMarkdown` Prop (Quick Fix)**

If the document is already created and has content, don't pass `seedMarkdown`.

**File**: `src/components/agentDashboard/AgentTimeline.tsx` (Line 801)

**Current Code**:
```typescript
<UnifiedEditor 
  documentId={documentId as any} 
  mode="quickNote" 
  editable={true} 
  autoCreateIfEmpty={true} 
  seedMarkdown={finalOutput}  // ❌ Always passes seed
  restoreSignal={restoreTick} 
  restoreMarkdown={finalOutput} 
  registerExporter={(fn) => { editorExporterRef.current = fn; }} 
/>
```

**Fixed Code**:
```typescript
<UnifiedEditor 
  documentId={documentId as any} 
  mode="quickNote" 
  editable={true} 
  autoCreateIfEmpty={true} 
  seedMarkdown={undefined}  // ✅ Don't seed on mount (doc already exists)
  restoreSignal={restoreTick} 
  restoreMarkdown={finalOutput}  // ✅ Only restore when user clicks "Restore"
  registerExporter={(fn) => { editorExporterRef.current = fn; }} 
/>
```

**Why This Works**:
- ✅ Document is already created (has `documentId`)
- ✅ Content is already in Convex (synced via ProseMirror)
- ✅ No need to seed on mount
- ✅ "Restore" button still works (uses `restoreSignal` + `restoreMarkdown`)

---

## 📊 Comparison

| Solution | Pros | Cons | Recommended |
|----------|------|------|-------------|
| **Option 1: Keep Mounted** | ✅ Best UX<br>✅ Preserves all state<br>✅ Better performance | ⚠️ Slightly more memory | ⭐⭐⭐⭐⭐ **YES** |
| **Option 2: Fix Seeding** | ✅ Prevents re-seeding<br>✅ Works globally | ⚠️ More complex<br>⚠️ Doesn't fix other state loss | ⭐⭐⭐☆☆ |
| **Option 3: Remove Seed** | ✅ Simple fix<br>✅ Works immediately | ⚠️ Doesn't fix other state loss | ⭐⭐⭐⭐☆ **Quick Fix** |

---

## 🚀 Recommended Implementation

### **Step 1: Apply Option 1 (Keep Components Mounted)**

This is the **best long-term solution** because:
- ✅ Fixes editor reappending issue
- ✅ Preserves scroll position across tabs
- ✅ Preserves filter/sort state in Tasks tab
- ✅ Better performance (no re-initialization)
- ✅ Standard React pattern for tab UIs

### **Step 2: Apply Option 3 as Backup**

If Option 1 causes any issues, apply Option 3 as a quick fix:
- Change `seedMarkdown={finalOutput}` to `seedMarkdown={undefined}`

---

## 🧪 Testing

### **Test 1: Verify No Reappending**

1. Open Agent Dashboard
2. Go to "Timeline" tab
3. Verify final output shows once
4. Switch to "Tasks" tab
5. Switch back to "Timeline" tab
6. **Expected**: Final output still shows once (not duplicated)

### **Test 2: Verify Restore Button Works**

1. Open Agent Dashboard → "Timeline" tab
2. Edit the final output in the editor
3. Click "Restore" button
4. **Expected**: Editor content resets to original final output

### **Test 3: Verify State Persistence**

1. Open Agent Dashboard → "Timeline" tab
2. Scroll down in the timeline
3. Switch to "Tasks" tab
4. Switch back to "Timeline" tab
5. **Expected**: Scroll position is preserved (with Option 1)

---

## 📝 Implementation Code

### **File**: `src/components/agentDashboard/AgentDashboard.tsx`

```typescript
{/* Body */}
<AgentWindowProvider>
  <div className="flex-1 min-h-0">
    {selectedTimelineId ? (
      <>
        {/* Timeline Tab */}
        <div 
          style={{ display: tab === "timeline" ? "block" : "none" }} 
          className="h-full"
        >
          <AgentTimeline 
            timelineId={selectedTimelineId} 
            documentId={sorted.find(t => t.timelineId === selectedTimelineId)?.documentId as Id<'documents'> | undefined} 
          />
        </div>

        {/* Chat Tab */}
        <div 
          style={{ display: tab === "chat" ? "block" : "none" }} 
          className="h-full"
        >
          <AgentChats />
        </div>

        {/* Tasks Tab */}
        <div 
          style={{ display: tab === "tasks" ? "block" : "none" }} 
          className="h-full"
        >
          <AgentTasks
            timelineId={selectedTimelineId}
            onOpenFullView={setFullViewTask}
            onViewTimeline={() => setTab("timeline")}
          />
        </div>
      </>
    ) : (
      tab === "chat" ? (
        <AgentChats />
      ) : (
        <div className="p-6 text-sm text-[var(--text-secondary)]">
          No timelines yet. Create one to get started.
        </div>
      )
    )}
  </div>
</AgentWindowProvider>
```

---

## 🎉 Benefits

After applying Option 1:

✅ **No more reappending**: Editor content stays stable  
✅ **Better UX**: Scroll position preserved  
✅ **Better performance**: No re-initialization on tab switch  
✅ **State preservation**: All component state persists  
✅ **Standard pattern**: Matches common React tab implementations  

---

## 🔗 Related Files

- `src/components/agentDashboard/AgentDashboard.tsx` (Tab switching logic)
- `src/components/agentDashboard/AgentTimeline.tsx` (UnifiedEditor usage)
- `src/components/UnifiedEditor.tsx` (Seeding logic)

