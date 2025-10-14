# FastAgentPanel - Quick Start Guide

## 🚀 Getting Started

### Basic Usage

```tsx
import { FastAgentPanel } from '@/components/FastAgentPanel';

function App() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsPanelOpen(true)}>
        Open Fast Agent
      </button>
      
      <FastAgentPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        selectedDocumentId={currentDocId} // Optional
      />
    </>
  );
}
```

---

## 📁 File Structure

```
src/components/FastAgentPanel/
├── FastAgentPanel.tsx                 # Main container
├── FastAgentPanel.MessageBubble.tsx   # Message rendering
├── FastAgentPanel.ThreadList.tsx      # Thread sidebar
├── FastAgentPanel.MessageStream.tsx   # Scrollable message area
├── FastAgentPanel.InputBar.tsx        # Input with file upload
├── FastAgentPanel.ExportMenu.tsx      # Export modal
├── FastAgentPanel.Settings.tsx        # Settings panel
├── FastAgentPanel.animations.css      # Animations & polish
├── types/
│   ├── index.ts                       # Type exports
│   ├── message.ts                     # Message types
│   ├── thread.ts                      # Thread types
│   └── stream.ts                      # SSE event types
├── README.md                          # Component docs
└── QUICK_START.md                     # This file
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + F` | Toggle FastAgentPanel |
| `Escape` | Close panel |
| `Enter` | Send message (in input) |
| `Shift + Enter` | New line (in input) |

---

## 🎨 Customization

### Changing Colors

Edit the gradient in `FastAgentPanel.tsx`:

```tsx
// Header gradient
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

// Fast mode toggle
background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
```

### Adjusting Panel Width

```tsx
// In FastAgentPanel.tsx styles
.fast-agent-panel {
  width: 900px; // Change this
}
```

### Custom Animations

Add to `FastAgentPanel.animations.css`:

```css
@keyframes myCustomAnimation {
  from { opacity: 0; }
  to { opacity: 1; }
}

.my-element {
  animation: myCustomAnimation 0.3s ease-out;
}
```

---

## 🔧 API Reference

### Props

```typescript
interface FastAgentPanelProps {
  isOpen: boolean;              // Controls panel visibility
  onClose: () => void;          // Called when panel closes
  selectedDocumentId?: Id<"documents">; // Optional context document
}
```

### Convex Functions

```typescript
// Queries
api.fastAgentPanel.listThreads()
api.fastAgentPanel.getMessages({ threadId })

// Mutations
api.fastAgentPanel.createThread({ title, pinned? })
api.fastAgentPanel.updateThread({ threadId, title?, pinned? })
api.fastAgentPanel.deleteThread({ threadId })
api.fastAgentPanel.createMessage({ threadId, role, content, ... })
api.fastAgentPanel.updateMessage({ messageId, content?, status?, ... })

// Actions
api.fastAgentPanel.sendMessage({ threadId, content, fastMode?, model?, ... })
```

---

## 🎯 Common Tasks

### Adding a New Export Format

1. Edit `FastAgentPanel.ExportMenu.tsx`
2. Add new export function:

```typescript
const exportAsPDF = () => {
  setIsExporting(true);
  try {
    // Your PDF generation logic
    const pdf = generatePDF(thread, messages);
    downloadFile(pdf, `${sanitizeFilename(thread.title)}.pdf`, 'application/pdf');
  } finally {
    setIsExporting(false);
  }
};
```

3. Add button to UI:

```tsx
<button onClick={exportAsPDF} className="export-option">
  <FileText className="h-5 w-5" />
  <div className="export-option-text">
    <span className="export-option-title">PDF</span>
    <span className="export-option-desc">Formatted document</span>
  </div>
</button>
```

### Adding a New Setting

1. Edit `FastAgentPanel.Settings.tsx`
2. Add state in parent component:

```typescript
const [mySetting, setMySetting] = useState(defaultValue);
```

3. Pass to Settings component:

```tsx
<SettingsPanel
  mySetting={mySetting}
  onMySettingChange={setMySetting}
  // ... other props
/>
```

4. Add UI in Settings:

```tsx
<div className="setting-group">
  <div className="setting-label">
    <Icon className="h-4 w-4" />
    <span>My Setting</span>
  </div>
  <input
    type="checkbox"
    checked={mySetting}
    onChange={(e) => onMySettingChange(e.target.checked)}
  />
</div>
```

### Customizing Message Rendering

Edit `FastAgentPanel.MessageBubble.tsx`:

```tsx
// Add custom rendering logic
{message.role === 'assistant' && (
  <div className="custom-assistant-badge">
    AI Response
  </div>
)}
```

---

## 🐛 Troubleshooting

### Panel Not Opening

**Check:**
1. `isOpen` prop is `true`
2. No CSS `display: none` overrides
3. Z-index is high enough (default: 1001)

### Messages Not Streaming

**Check:**
1. SSE endpoint is running: `/api/agents/runs/:runId/events`
2. `ChatStreamManager` is initialized
3. `runId` is valid from `sendMessage` action
4. Network tab shows SSE connection

### Export Not Working

**Check:**
1. Browser allows downloads
2. `thread` and `messages` data is valid
3. Console for errors in export functions
4. File size isn't too large

### Keyboard Shortcuts Not Working

**Check:**
1. Event listeners are attached (check `MainLayout.tsx`)
2. No other handlers preventing default
3. Focus is not trapped in an input

---

## 📊 Performance Tips

1. **Limit Message History:** Only load recent messages
   ```typescript
   .take(100) // Limit to 100 messages
   ```

2. **Debounce Input:** Prevent excessive re-renders
   ```typescript
   const debouncedInput = useDebounce(input, 300);
   ```

3. **Virtualize Long Lists:** Use `react-window` for 1000+ threads
   ```typescript
   import { FixedSizeList } from 'react-window';
   ```

4. **Lazy Load Components:** Code-split heavy components
   ```typescript
   const ExportMenu = lazy(() => import('./FastAgentPanel.ExportMenu'));
   ```

---

## 🧪 Testing

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react';
import { FastAgentPanel } from './FastAgentPanel';

test('renders panel when open', () => {
  render(<FastAgentPanel isOpen={true} onClose={() => {}} />);
  expect(screen.getByText('Fast Agent')).toBeInTheDocument();
});
```

### Integration Tests

```typescript
test('sends message and receives response', async () => {
  const { user } = renderWithConvex(<FastAgentPanel isOpen={true} onClose={() => {}} />);
  
  await user.type(screen.getByPlaceholderText('Ask me anything...'), 'Hello');
  await user.click(screen.getByRole('button', { name: /send/i }));
  
  await waitFor(() => {
    expect(screen.getByText(/Hello/i)).toBeInTheDocument();
  });
});
```

---

## 🔗 Related Documentation

- [DESIGN_SPECS.md](../../../DESIGN_SPECS.md) - Overall architecture
- [FAST_AGENT_PANEL_IMPLEMENTATION.md](../../../FAST_AGENT_PANEL_IMPLEMENTATION.md) - Phase 1 & 2 details
- [FAST_AGENT_PANEL_PHASE_3_COMPLETE.md](../../../FAST_AGENT_PANEL_PHASE_3_COMPLETE.md) - Phase 3 features
- [Convex Docs](https://docs.convex.dev) - Backend documentation

---

## 💡 Tips & Best Practices

1. **Always use `useCallback`** for event handlers to prevent re-renders
2. **Memoize expensive computations** with `useMemo`
3. **Keep components under 300 lines** - split if larger
4. **Use TypeScript strictly** - no `any` types
5. **Test on multiple browsers** - Chrome, Firefox, Safari
6. **Check accessibility** - keyboard navigation, screen readers
7. **Monitor performance** - React DevTools Profiler
8. **Handle errors gracefully** - try/catch with user-friendly messages

---

## 🎓 Learning Resources

- [React Hooks](https://react.dev/reference/react)
- [Convex React](https://docs.convex.dev/client/react)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [Accessibility](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review the main README.md
3. Check DESIGN_SPECS.md for architecture
4. Open an issue with reproduction steps

---

**Happy coding!** 🚀

