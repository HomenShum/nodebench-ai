# Streaming UI Optimization - Quick Start Guide

## What Was Implemented

A complete streaming UI optimization system for FastAgentPanel that ensures smooth 30-60fps rendering with per-step updates and no layout thrashing.

## Key Components

### 1. Frame-Aligned Streaming Buffer
**File**: `hooks/useStreamingBuffer.ts`

Batches streaming updates and flushes them on animation frames.

```tsx
const { addUpdate, flush, start, stop, isActive, bufferSize } = useStreamingBuffer(
  (updates) => setMessages(applyUpdates(messages, updates)),
  { maxBufferSize: 50, flushIntervalMs: 33 }
);

start();
addUpdate({ type: 'token', data: 'hello', timestamp: Date.now() });
stop();
```

### 2. Smart Auto-Scroll
**File**: `hooks/useSmartAutoScroll.ts`

Intelligent auto-scroll that respects user scroll position.

```tsx
const { autoScroll, isNearBottom, scrollToBottom, reset } = useSmartAutoScroll(
  scrollRef,
  { nearBottomThreshold: 80 }
);

useEffect(() => {
  autoScroll(); // Only scrolls if user is near bottom
}, [messages.length, autoScroll]);
```

### 3. Memoized Timeline Items
**File**: `StepTimelineItem.tsx`

Prevents unnecessary re-renders of timeline steps.

```tsx
const StepTimelineItem = memo(Component, (prev, next) => {
  return prev.step === next.step && prev.isExpanded === next.isExpanded;
});
```

### 4. GPU-Accelerated Animations
**File**: `FastAgentPanel.animations.css`

All animations use `transform` and `opacity` for GPU acceleration.

```css
.animate-fadeIn {
  animation: fadeInSmooth 0.2s ease-out;
}

.timeline-item {
  transform: translateZ(0); /* Enable GPU acceleration */
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 5. Deferred Value Processing
**File**: `FastAgentPanel.UIMessageStream.tsx`

Defers heavy message filtering to prevent UI blocking.

```tsx
const deferredMessages = useDeferredValue(messages);

const filteredMessages = useMemo(() => {
  return deferredMessages.filter(...); // Heavy work deferred
}, [deferredMessages]);
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Frame Rate | 30-60fps |
| Commit Time | <8ms |
| Buffer Flush | Every 33ms |
| Auto-Scroll | Smooth, no jank |
| Memory | Bounded |

## Best Practices

### ✅ DO

- Use streaming buffer for high-frequency updates
- Memoize timeline items with custom comparison
- Use `transform`/`opacity` for animations
- Defer heavy computations with `useDeferredValue`
- Batch updates on animation frames

### ❌ DON'T

- Update state on every token (causes re-render per token)
- Use height/position for animations (causes layout recalculation)
- Block UI with heavy filtering during streaming
- Auto-scroll without checking user scroll position
- Create new objects in render functions

## Testing

```bash
# Run streaming optimization tests
npm run test:run -- streaming-optimization.test.tsx

# Run all tests
npm run test:run
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
3. Profile with React DevTools Profiler
4. Check for layout-causing properties

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

## Files Overview

```
src/components/FastAgentPanel/
├── hooks/
│   ├── useStreamingBuffer.ts      # Frame-aligned buffer
│   ├── useSmartAutoScroll.ts      # Smart auto-scroll
│   └── index.ts                   # Hook exports
├── StepTimelineItem.tsx           # Memoized timeline item
├── FastAgentPanel.UIMessageStream.tsx  # Updated with optimizations
├── FastAgentPanel.animations.css  # GPU-accelerated animations
├── STREAMING_OPTIMIZATION.md      # Detailed guide
├── IMPLEMENTATION_SUMMARY.md      # What was implemented
└── QUICK_START.md                 # This file
```

## Next Steps

1. **Monitor**: Use React Profiler to verify 30-60fps
2. **Adjust**: Tune buffer size and flush interval
3. **Extend**: Apply patterns to other streaming components
4. **Optimize**: Consider Web Worker for heavy parsing
5. **Measure**: Add performance monitoring dashboard

## Resources

- [React 18 useTransition](https://react.dev/reference/react/useTransition)
- [React 18 useDeferredValue](https://react.dev/reference/react/useDeferredValue)
- [CSS Animations Performance](https://web.dev/animations-guide/)
- [Scroll Anchoring](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor)

## Support

For issues or questions:
1. Check `STREAMING_OPTIMIZATION.md` for detailed docs
2. Review test cases in `streaming-optimization.test.tsx`
3. Enable logging: `enableLogging: true` in hook config
4. Profile with React DevTools Profiler

