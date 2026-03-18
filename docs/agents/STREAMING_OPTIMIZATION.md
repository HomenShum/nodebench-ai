# Streaming UI Optimization Guide

## Overview

This document describes the streaming UI optimization patterns implemented in FastAgentPanel to ensure smooth, animated streaming with per-step updates at 30-60fps without layout thrashing.

## Architecture

### 1. Frame-Aligned Streaming Buffer (`useStreamingBuffer`)

**Purpose**: Accumulate streaming updates and flush them on animation frames to prevent excessive re-renders.

**How it works**:
- Collects tokens, tool steps, and status updates in a ring buffer
- Flushes updates on `requestAnimationFrame` or at configurable intervals (default: 33ms ≈ 30fps)
- Automatically flushes when buffer exceeds max size (default: 50 updates)
- Prevents UI blocking by batching updates

**Usage**:
```tsx
const { addUpdate, flush, start, stop, isActive, bufferSize } = useStreamingBuffer(
  (updates) => {
    // Apply batched updates to state
    setMessages(applyUpdates(messages, updates));
  },
  { maxBufferSize: 50, flushIntervalMs: 33, enableLogging: false }
);

// Start streaming
start();

// Add updates as they arrive
addUpdate({ type: 'token', data: 'hello', timestamp: Date.now() });

// Stop and flush remaining
stop();
```

### 2. Smart Auto-Scroll (`useSmartAutoScroll`)

**Purpose**: Intelligent auto-scroll that respects user scroll position and prevents scroll fighting.

**Features**:
- Only auto-scrolls when user is near bottom (configurable threshold, default: 80px)
- Pauses auto-scroll when user scrolls up
- Resumes when user scrolls back to bottom
- Uses scroll anchoring to prevent layout thrash
- Respects `prefers-reduced-motion` for accessibility

**Usage**:
```tsx
const { autoScroll, isNearBottom, scrollToBottom, reset, userHasScrolledUp } = useSmartAutoScroll(
  scrollRef,
  { nearBottomThreshold: 80, enableLogging: false }
);

// Auto-scroll when new messages arrive
useEffect(() => {
  autoScroll();
}, [messages.length, autoScroll]);

// Reset when starting new conversation
useEffect(() => {
  reset();
}, [reset]);
```

### 3. Memoized Timeline Items (`StepTimelineItem`)

**Purpose**: Prevent unnecessary re-renders of timeline steps during streaming.

**Optimizations**:
- Uses `React.memo` with custom comparison function
- Only re-renders when step data or expanded state changes
- Animations use `transform` and `opacity` (GPU-accelerated) instead of height changes
- Smooth transitions with `cubic-bezier(0.4, 0, 0.2, 1)` timing

**Benefits**:
- Reduces commit time for each step update
- Smooth animations without layout recalculation
- Scales well with many steps

### 4. Deferred Value Processing (`useDeferredValue`)

**Purpose**: Defer heavy message filtering/grouping to prevent blocking UI.

**How it works**:
- React 18's `useDeferredValue` defers expensive computations
- Message filtering happens in background while UI remains responsive
- Streaming updates render immediately with stale data, then update when filtering completes

**Usage**:
```tsx
const deferredMessages = useDeferredValue(messages);

const filteredMessages = useMemo(() => {
  // Heavy filtering logic
  return messages.filter(...);
}, [deferredMessages]);
```

## CSS Animations

All animations use GPU-accelerated properties:

### Smooth Fade-In
```css
@keyframes fadeInSmooth {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn { animation: fadeInSmooth 0.2s ease-out; }
```

### Expand/Collapse
```css
@keyframes expandHeight {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 500px; }
}
```

### Timeline Item Hover
```css
.timeline-item {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateZ(0); /* GPU acceleration */
}
.timeline-item:hover {
  transform: translateX(2px) translateZ(0);
}
```

## Performance Targets

- **Frame Rate**: 30-60fps during streaming
- **Commit Time**: <8ms average per update
- **Buffer Flush**: Every 33ms (30fps) or when buffer full
- **Auto-Scroll**: Smooth with no jank
- **Memory**: Bounded buffer prevents memory leaks

## Testing

Run streaming optimization tests:
```bash
npm run test -- streaming-optimization.test.tsx
```

Tests verify:
1. Buffer accumulation and flushing
2. Auto-scroll behavior and user scroll detection
3. Frame rate maintenance (≥30fps)
4. Minimal layout thrashing

## Best Practices

### 1. Use Streaming Buffer for High-Frequency Updates
```tsx
// ✅ Good: Batch token updates
addUpdate({ type: 'token', data: chunk, timestamp: Date.now() });

// ❌ Bad: Direct state updates
setMessage(prev => prev + chunk); // Causes re-render per token
```

### 2. Memoize Timeline Items
```tsx
// ✅ Good: Memoized with custom comparison
const StepTimelineItem = memo(Component, (prev, next) => {
  return prev.step === next.step && prev.isExpanded === next.isExpanded;
});

// ❌ Bad: No memoization
const StepTimelineItem = (props) => { ... };
```

### 3. Use Transform/Opacity for Animations
```tsx
// ✅ Good: GPU-accelerated
transform: translateX(2px);
opacity: 0.5;

// ❌ Bad: Causes layout recalculation
left: 2px;
height: 100px;
```

### 4. Defer Heavy Computations
```tsx
// ✅ Good: Deferred filtering
const deferredMessages = useDeferredValue(messages);
const filtered = useMemo(() => filter(deferredMessages), [deferredMessages]);

// ❌ Bad: Blocks UI
const filtered = useMemo(() => filter(messages), [messages]);
```

## Monitoring

Add performance monitoring:
```tsx
useEffect(() => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 8) {
        console.warn(`Slow commit: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
      }
    }
  });
  observer.observe({ entryTypes: ['measure'] });
  return () => observer.disconnect();
}, []);
```

## Troubleshooting

### Streaming feels janky
1. Check buffer size - increase if flushing too frequently
2. Verify animations use `transform`/`opacity` only
3. Check for layout-causing properties (width, height, position)
4. Profile with React DevTools Profiler

### Auto-scroll not working
1. Verify `scrollRef` is attached to scrollable container
2. Check `nearBottomThreshold` value (default: 80px)
3. Ensure scroll event listeners are attached
4. Check for `overflow: hidden` on container

### High memory usage
1. Verify buffer is flushing regularly
2. Check for memory leaks in update handlers
3. Monitor `bufferSize` in development
4. Use `enableLogging: true` to debug

## References

- [React 18 useTransition](https://react.dev/reference/react/useTransition)
- [React 18 useDeferredValue](https://react.dev/reference/react/useDeferredValue)
- [CSS Animations Performance](https://web.dev/animations-guide/)
- [Scroll Anchoring](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor)

