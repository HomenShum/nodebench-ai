# Agent Dashboard Issues and Fixes

## Summary
This document details all issues found and fixed in the agent dashboard related to task state management, timing calculations, and UI display.

## Issues Found and Fixed

### 1. ✅ Completed Tasks Showing as "Running" for Hours
**Severity**: Critical  
**Status**: Fixed

#### Problem
Tasks that had completed were showing as "running" for over an hour (e.g., "1h 44m 52s") because the UI was calculating runtime based on `nowMs - startedAtMs` for tasks with status "running", but the status was never being updated to "complete" in a way that stopped the timer.

#### Root Cause
When tasks were marked as `complete`, the `updateTaskMetrics` mutation was only setting:
- `status: 'complete'`
- `elapsedMs: <duration>`

However, it was **not** setting `completedAtMs`, which the UI's `runtimeForTask` function needs to calculate the correct runtime for completed tasks.

#### Fix Applied
1. **Schema Update** (`convex/schema.ts` line 848):
   - Added `completedAtMs: v.optional(v.number())` field to the `agentTasks` table

2. **Mutation Update** (`convex/agentTimelines.ts` lines 414-429):
   - Added `completedAtMs` to the `updateTaskMetrics` mutation args
   - Added automatic logic to set `completedAtMs` when a task transitions to `'complete'` or `'error'` status
   - If `completedAtMs` is not explicitly provided, it defaults to the current timestamp

#### How It Works Now
```typescript
// When orchestrator emits node.end:
await updateTaskMetrics({ taskId, status: 'complete', elapsedMs });

// Mutation handler automatically:
if (args.status === "complete" || args.status === "error") {
  if (!(task as any).completedAtMs) {
    patch.completedAtMs = args.completedAtMs ?? now;
  }
}

// UI can now correctly calculate:
if (status === 'complete' || status === 'error') {
  if (startedAt && completedAt && completedAt > startedAt) 
    return completedAt - startedAt;
}
```

---

### 2. ✅ ETA Showing Incorrect Values for Completed Tasks
**Severity**: Medium  
**Status**: Fixed

#### Problem
The ETA (Estimated Time to Arrival) was being calculated for completed tasks, showing values like "523s" when the task was already done.

**Locations**:
- `AgentTasks.tsx` line 664
- `AgentPopover.tsx` line 94

#### Fix Applied
```typescript
// Before:
const etaSec = Math.max(0, Math.ceil((dur - elapsed)/1000));

// After:
const etaSec = (status === 'complete' || status === 'error') 
  ? 0 
  : Math.max(0, Math.ceil((dur - elapsed)/1000));

// Display:
{etaSec > 0 ? `${etaSec}s` : '—'}
```

**Files Modified**:
- `src/components/agentDashboard/AgentTasks.tsx`
- `src/components/agentDashboard/AgentPopover.tsx`

---

### 3. ✅ Progress Not Always 100% for Completed Tasks
**Severity**: Medium  
**Status**: Fixed

#### Problem
For completed tasks, if the `progress` field was not explicitly set to 1, the UI would calculate progress based on `elapsed/duration`, which could show less than 100% even for completed tasks.

**Locations**:
- `AgentTasks.tsx` lines 398-402, 665
- `AgentPopover.tsx` line 47

#### Fix Applied

**Backend** (`convex/agentTimelines.ts`):
```typescript
if (args.status === "complete" || args.status === "error") {
  // Ensure progress is set to 1 (100%) for completed tasks if not explicitly provided
  if (typeof args.progress !== "number") {
    patch.progress = 1;
  }
}
```

**Frontend** (`AgentTasks.tsx`, `AgentPopover.tsx`):
```typescript
// Progress should always be 100% for completed/error tasks
const progressVal = (status === 'complete' || status === 'error')
  ? 1  // or 100 for percentage
  : (typeof raw.progress === 'number' ? raw.progress : calculatedProgress);
```

**Files Modified**:
- `convex/agentTimelines.ts`
- `src/components/agentDashboard/AgentTasks.tsx`
- `src/components/agentDashboard/AgentPopover.tsx`

---

### 4. ✅ Terminology Consistency: "Elapsed" → "Runtime"
**Severity**: Low  
**Status**: Fixed

#### Problem
The UI inconsistently used "Elapsed" and "Runtime" to refer to the same metric, causing confusion.

#### Fix Applied
Changed "Elapsed" to "Runtime" in `AgentPopover.tsx` for consistency with other components.

**File Modified**:
- `src/components/agentDashboard/AgentPopover.tsx` line 117

---

## Testing Recommendations

### Manual Testing
1. **Completed Task Display**:
   - Run an agent workflow to completion
   - Verify completed tasks show:
     - Status: "complete"
     - Progress: 100%
     - ETA: "—" (not a number)
     - Runtime: Fixed duration (not increasing)

2. **Running Task Display**:
   - Start an agent workflow
   - Verify running tasks show:
     - Status: "running"
     - Progress: Increasing percentage
     - ETA: Decreasing countdown
     - Runtime: Increasing duration

3. **Error Task Display**:
   - Trigger a task error
   - Verify error tasks show:
     - Status: "error"
     - Progress: 100%
     - ETA: "—"
     - Runtime: Fixed duration

### Automated Testing
Consider adding tests for:
- `runtimeForTask` function with various task states
- Progress calculation for complete/error/running states
- ETA calculation edge cases
- `updateTaskMetrics` mutation with status transitions

---

## Related Files

### Modified Files
1. `convex/schema.ts` - Added `completedAtMs` field
2. `convex/agentTimelines.ts` - Updated `updateTaskMetrics` mutation
3. `src/components/agentDashboard/AgentTasks.tsx` - Fixed ETA, progress, and runtime calculations
4. `src/components/agentDashboard/AgentPopover.tsx` - Fixed ETA, progress display, and terminology

### Files That Call `updateTaskMetrics`
- `convex/agents/orchestrate.ts` - Orchestrator trace handlers
- `src/components/agentDashboard/AgentDashboard.tsx` - UI action handlers
- `convex/agents/timelineMock.ts` - Mock data seeding

All of these will automatically benefit from the fixes without requiring changes.

---

## Future Improvements

### Potential Enhancements
1. **Real-time Progress Updates**: Consider adding periodic progress updates for long-running tasks
2. **Retry Tracking**: Better visualization of retry attempts and their impact on runtime
3. **Performance Metrics**: Add more detailed performance breakdowns (queue time, execution time, etc.)
4. **Status Transitions**: Track and display status transition history
5. **Predictive ETA**: Use historical data to provide more accurate ETA estimates

### Code Quality
1. **Type Safety**: Add proper TypeScript types for task status and progress
2. **Shared Utilities**: Extract common calculation logic into shared utility functions
3. **Constants**: Define status values as constants to avoid string literals
4. **Documentation**: Add JSDoc comments to complex calculation functions

---

## Backward Compatibility

All changes are backward compatible:
- New `completedAtMs` field is optional
- Existing tasks without `completedAtMs` will have it set automatically on next status update
- UI gracefully handles missing fields with fallback calculations
- No database migration required

---

## Deployment Notes

1. Deploy backend changes first (schema + mutation)
2. Deploy frontend changes second (UI components)
3. No downtime required
4. Existing running tasks will automatically get `completedAtMs` when they complete

