# Dynamic Timeline Window Fix

## 🐛 Problem

The timeline was showing a **fixed 11-minute window** (0:00 to 11:00) regardless of actual execution duration, making execution bars appear tiny (6-7% width) when actual execution was only 75 seconds.

### **Example Issue**

```html
<!-- Timeline showing 0:00 to 20:00 (20 minutes) -->
<div class="time-units">
  <div class="time-unit now">0:00</div>
  <div class="time-unit">2:00</div>
  <div class="time-unit">4:00</div>
  ...
  <div class="time-unit">20:00</div>
</div>

<!-- Execution bar only 6.31% width (tiny!) -->
<div class="execution-bar complete" style="left: 0%; width: 6.31386%;">
  <div class="execution-bar-title">Orchestrator: ... (10m 0s)</div>
</div>
```

**Problem**: 
- Actual execution: **75 seconds** (1m 15s)
- Timeline window: **1200 seconds** (20 minutes)
- Bar width: **75 / 1200 = 6.25%** ❌ (too small!)

---

## 🔍 Root Cause

### **Issue 1: Fixed 10-Minute Default**

**File**: `src/components/agentDashboard/AgentTimeline.tsx` (Line 25)

```typescript
const DEFAULT_WINDOW_SEC = 600; // ❌ Fixed 10 minutes (600 seconds)
```

This was used as the default window size when there were no tasks or in "Fixed" mode.

### **Issue 2: Using Estimated Duration Instead of Actual Elapsed**

**File**: `src/components/agentDashboard/AgentTimeline.tsx` (Lines 214-216)

```typescript
// ❌ OLD CODE: Used Math.max(elapsedMs, durationMs)
if (status === 'complete' || status === 'error') {
  return o + Math.max(elapsedTimes[i], durations[i]);
  //         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //         If durationMs = 600000 (10m) and elapsedMs = 75000 (75s),
  //         this returns 600000, making window 20 minutes!
}
```

**Why This Was Wrong**:
- `durationMs` is an **estimated** duration (often 600 seconds = 10 minutes)
- `elapsedMs` is the **actual** execution time (e.g., 75 seconds)
- Using `Math.max()` meant the window was based on the **larger** value (estimated 10 minutes)
- This made the window 20 minutes (with 10% padding), making bars tiny

---

## ✅ Solution

### **Fix 1: Remove Fixed Default**

**Removed** the `DEFAULT_WINDOW_SEC` constant and replaced it with **dynamic calculation** based on actual task durations.

```typescript
// ❌ OLD: Fixed 10-minute default
const DEFAULT_WINDOW_SEC = 600;

// ✅ NEW: No fixed default, calculate dynamically
// (removed constant)
```

### **Fix 2: Use Actual Elapsed Time for Completed Tasks**

**Changed** the window calculation to use **only actual elapsed time** for completed tasks, ignoring estimated duration.

```typescript
// ❌ OLD CODE: Used Math.max(elapsedMs, durationMs)
if (status === 'complete' || status === 'error') {
  return o + Math.max(elapsedTimes[i], durations[i]);
}

// ✅ NEW CODE: Use ONLY actual elapsed time
if (status === 'complete' || status === 'error') {
  return o + (elapsedTimes[i] || durations[i] || 1000);
  //         ^^^^^^^^^^^^^^^^^ Use actual elapsed, fallback to duration
}
```

### **Fix 3: Dynamic Window Calculation**

**Updated** all window modes to use **actual duration** instead of fixed 10 minutes:

```typescript
// Calculate actual duration from tasks
const maxEnd = actualEnds.length ? Math.max(...actualEnds) : 60000; // Default 1 minute if no tasks
const actualDuration = Math.max(1000, maxEnd - minStart); // Minimum 1 second

// Fixed mode: use actual duration with 10% padding
if (wm === WindowMode.Fixed) {
  start = 0;
  const pad = Math.max(1000, Math.round(actualDuration * 0.1));
  total = Math.max(actualDuration + pad, 60000); // Minimum 1 minute window
}
```

---

## 📊 Before vs After

### **Before (Broken)**

```
Timeline Window: 0:00 to 20:00 (1200 seconds)
Actual Execution: 75 seconds
Bar Width: 75 / 1200 = 6.25% ❌

┌────────────────────────────────────────────────────────────┐
│ 0:00  2:00  4:00  6:00  8:00  10:00  12:00  14:00  16:00  │
│ [█]                                                        │ ❌ Tiny bar!
└────────────────────────────────────────────────────────────┘
```

### **After (Fixed)**

```
Timeline Window: 0:00 to 1:23 (83 seconds = 75s + 10% padding)
Actual Execution: 75 seconds
Bar Width: 75 / 83 = 90.4% ✅

┌────────────────────────────────────────────────────────────┐
│ 0:00    0:15    0:30    0:45    1:00    1:15               │
│ [████████████████████████████████████████████████]         │ ✅ Proper size!
└────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Changes

### **1. Removed Fixed 10-Minute Default**

**File**: `src/components/agentDashboard/AgentTimeline.tsx`

```diff
- const DEFAULT_WINDOW_SEC = 600; // 10 minutes baseline
```

### **2. Use Actual Elapsed Time for Completed Tasks**

**File**: `src/components/agentDashboard/AgentTimeline.tsx` (Lines 209-232)

```diff
  // For completed tasks, use ONLY actual elapsed time (ignore estimated duration)
  if (status === 'complete' || status === 'error') {
-   return o + Math.max(elapsedTimes[i], durations[i]);
+   return o + (elapsedTimes[i] || durations[i] || 1000); // Fallback to duration if no elapsed
  }

  // For running tasks, use current elapsed time
  if (status === 'running') {
    const startedAt = task?.startedAtMs;
    if (startedAt) {
      const currentElapsed = Date.now() - startedAt;
-     return o + Math.max(currentElapsed, elapsedTimes[i], durations[i]);
+     return o + Math.max(currentElapsed, elapsedTimes[i] || 0);
    }
+   // If no startedAt, use elapsed or duration
+   return o + (elapsedTimes[i] || durations[i] || 1000);
  }

  // For pending tasks, use estimated duration (or minimum 1s)
- return o + durations[i];
+ return o + (durations[i] || 1000);
```

### **3. Dynamic Window Sizing**

**File**: `src/components/agentDashboard/AgentTimeline.tsx` (Lines 234-262)

```diff
- const maxEnd = offsets.length ? Math.max(...offsets.map((o, i) => o + (durations[i] || 0))) : DEFAULT_WINDOW_SEC * 1000;
+ const maxEnd = actualEnds.length ? Math.max(...actualEnds) : 60000; // Default 1 minute if no tasks
+ const actualDuration = Math.max(1000, maxEnd - minStart); // Minimum 1 second

  let start = 0;
- let total = DEFAULT_WINDOW_SEC * 1000;
+ let total = actualDuration;

  if (wm === WindowMode.Fixed) {
    start = 0;
-   total = DEFAULT_WINDOW_SEC * 1000;
+   const pad = Math.max(1000, Math.round(actualDuration * 0.1));
+   total = Math.max(actualDuration + pad, 60000); // Minimum 1 minute window
  }
```

---

## 🧪 Testing

### **Test 1: Short Execution (75 seconds)**

**Expected**:
- Timeline window: **0:00 to ~1:23** (83 seconds = 75s + 10% padding)
- Bar width: **~90%** (75 / 83)
- Time units: **0:00, 0:15, 0:30, 0:45, 1:00, 1:15**

### **Test 2: Medium Execution (5 minutes)**

**Expected**:
- Timeline window: **0:00 to ~5:30** (330 seconds = 300s + 10% padding)
- Bar width: **~91%** (300 / 330)
- Time units: **0:00, 1:00, 2:00, 3:00, 4:00, 5:00**

### **Test 3: Long Execution (20 minutes)**

**Expected**:
- Timeline window: **0:00 to ~22:00** (1320 seconds = 1200s + 10% padding)
- Bar width: **~91%** (1200 / 1320)
- Time units: **0:00, 2:00, 4:00, 6:00, ..., 20:00, 22:00**

### **Test 4: Running Tasks**

**Expected**:
- Window grows dynamically as tasks execute
- Bar width increases in real-time
- Time units update to fit current execution

---

## 🎉 Benefits

✅ **Accurate window sizing**: Timeline fits actual execution duration  
✅ **Proper bar visibility**: Bars are 80-95% width (not 6%)  
✅ **Dynamic scaling**: Window adjusts to short (1m) or long (20m) executions  
✅ **Real-time growth**: Window expands as running tasks execute  
✅ **Better UX**: Users can see execution progress clearly  
✅ **No artificial limits**: No fixed 10-minute or 20-minute windows  

---

## 📝 Summary

### **What Was Fixed**

1. ✅ Removed fixed 10-minute default (`DEFAULT_WINDOW_SEC`)
2. ✅ Use actual `elapsedMs` for completed tasks (not estimated `durationMs`)
3. ✅ Dynamic window calculation based on actual task durations
4. ✅ Minimum 1-minute window for visibility
5. ✅ 10% padding for better visualization

### **Result**

- **Before**: Timeline showed 0:00 to 20:00 (20 minutes), bars were 6% width ❌
- **After**: Timeline shows 0:00 to 1:23 (83 seconds), bars are 90% width ✅

---

## 🔗 Related Files

- `src/components/agentDashboard/AgentTimeline.tsx` - Window calculation logic
- `docs/CHAT_HISTORY_AND_DYNAMIC_PROGRESS.md` - Dynamic progress bars
- `docs/EDITOR_REAPPENDING_FIX.md` - Editor reappending fix

---

**The timeline window is now DYNAMIC and fits actual execution duration!** 🎉

