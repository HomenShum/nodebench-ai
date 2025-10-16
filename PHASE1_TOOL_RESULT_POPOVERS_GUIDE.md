# Phase 1: Interactive Tool Result Popovers - Implementation Guide

## Overview
Make tool names in the Agent Progress timeline clickable to open a popover displaying formatted tool results.

## Architecture

### Component Hierarchy
```
StepTimeline
├── TimelineStep (clickable tool name)
│   └── onClick → setSelectedTool(toolName)
└── ToolResultPopover
    ├── Modal/Popover overlay
    └── ToolOutputRenderer (reused)
```

### Data Flow
```
ToolUIPart (from UIMessage)
├── type: 'tool-webSearch'
├── args: {...}
└── output: {...}
    ↓
StepTimeline (converts to TimelineStep)
├── toolName: 'webSearch'
├── result: {...}
└── onClick handler
    ↓
ToolResultPopover
└── Renders formatted result
```

## Implementation Steps

### Step 1: Create ToolResultPopover Component

**File:** `src/components/FastAgentPanel/ToolResultPopover.tsx`

Key features:
- Modal/popover overlay with close button
- Reuses ToolOutputRenderer for consistent formatting
- Handles all result types (JSON, galleries, selection cards)
- Responsive sizing
- Keyboard support (ESC to close)

**Props:**
```typescript
interface ToolResultPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  toolName: string;
  result: unknown;
  args?: unknown;
  error?: string;
  // Callbacks for selection cards
  onCompanySelect?: (company: CompanyOption) => void;
  onPersonSelect?: (person: PersonOption) => void;
  onEventSelect?: (event: EventOption) => void;
  onNewsSelect?: (article: NewsArticleOption) => void;
}
```

**Features:**
- Header with tool name and close button
- Tabs for "Result" / "Arguments" / "Error" (if applicable)
- Syntax highlighting for JSON
- Copy-to-clipboard button for results
- Scrollable content area with max-height

### Step 2: Update StepTimeline Component

**File:** `src/components/FastAgentPanel/StepTimeline.tsx`

Changes:
1. Add state for selected tool result
2. Make tool name clickable (button instead of span)
3. Pass click handler to open popover
4. Render ToolResultPopover at bottom of component

**Code changes:**
```typescript
// Add to StepTimeline component
const [selectedToolResult, setSelectedToolResult] = useState<{
  toolName: string;
  result: unknown;
  args?: unknown;
  error?: string;
} | null>(null);

// In step header, replace static tool name with button:
{step.toolName && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      setSelectedToolResult({
        toolName: step.toolName,
        result: step.result,
        args: step.description, // Contains args JSON
        error: step.error,
      });
    }}
    className="text-xs text-blue-600 hover:underline hover:text-blue-700 cursor-pointer"
  >
    Tool: <code className="bg-gray-100 px-1 rounded">{step.toolName}</code>
  </button>
)}

// At end of component, render popover:
{selectedToolResult && (
  <ToolResultPopover
    isOpen={!!selectedToolResult}
    onClose={() => setSelectedToolResult(null)}
    toolName={selectedToolResult.toolName}
    result={selectedToolResult.result}
    args={selectedToolResult.args}
    error={selectedToolResult.error}
    onCompanySelect={onCompanySelect}
    onPersonSelect={onPersonSelect}
    onEventSelect={onEventSelect}
    onNewsSelect={onNewsSelect}
  />
)}
```

### Step 3: Update UIMessageBubble

**File:** `src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx`

Changes:
1. Pass selection callbacks to StepTimeline
2. Ensure ToolResultPopover receives all necessary props

**Code changes:**
```typescript
// In UIMessageBubble, update StepTimeline call:
{toolParts.length > 0 && (
  <StepTimeline
    steps={toolPartsToTimelineSteps(toolParts)}
    isStreaming={message.status === 'streaming'}
    onCompanySelect={onCompanySelect}
    onPersonSelect={onPersonSelect}
    onEventSelect={onEventSelect}
    onNewsSelect={onNewsSelect}
  />
)}
```

### Step 4: Update StepTimeline Props

**File:** `src/components/FastAgentPanel/StepTimeline.tsx`

Add callback props to StepTimelineProps interface:
```typescript
interface StepTimelineProps {
  steps: TimelineStep[];
  isStreaming?: boolean;
  onCompanySelect?: (company: CompanyOption) => void;
  onPersonSelect?: (person: PersonOption) => void;
  onEventSelect?: (event: EventOption) => void;
  onNewsSelect?: (article: NewsArticleOption) => void;
}
```

## Implementation Checklist

- [ ] Create ToolResultPopover.tsx component
  - [ ] Modal/popover overlay
  - [ ] Header with tool name and close button
  - [ ] Tabs for Result/Arguments/Error
  - [ ] Reuse ToolOutputRenderer
  - [ ] Add copy-to-clipboard functionality
  - [ ] Keyboard support (ESC to close)

- [ ] Update StepTimeline.tsx
  - [ ] Add state for selected tool result
  - [ ] Make tool name clickable
  - [ ] Pass callbacks through props
  - [ ] Render ToolResultPopover

- [ ] Update UIMessageBubble.tsx
  - [ ] Pass callbacks to StepTimeline
  - [ ] Test with various result types

- [ ] Testing
  - [ ] Test with JSON results
  - [ ] Test with gallery results (YouTube, SEC)
  - [ ] Test with selection card results (companies, people)
  - [ ] Test with error results
  - [ ] Test keyboard navigation (ESC to close)
  - [ ] Test on mobile (responsive)

## Styling Considerations

### Modal/Popover
- Use fixed positioning or portal for proper z-index
- Overlay with semi-transparent background
- Max-width: 600px (or 90vw on mobile)
- Max-height: 80vh with scrollable content
- Smooth fade-in animation

### Tool Name Button
- Change cursor to pointer on hover
- Add underline on hover
- Maintain existing color scheme
- Add visual feedback (slight color change)

### Tabs
- Use existing tab component if available
- Or create simple tab UI with border-bottom indicator
- Smooth transition between tabs

## Performance Considerations

1. **Lazy rendering** - Only render popover when opened
2. **Memoization** - Memoize ToolOutputRenderer to prevent re-renders
3. **Large results** - Implement pagination for very large result sets
4. **Copy functionality** - Use efficient clipboard API

## Accessibility

- [ ] Keyboard navigation (Tab, Enter, ESC)
- [ ] ARIA labels for buttons and tabs
- [ ] Focus management (focus popover on open, restore on close)
- [ ] Screen reader support for tool names
- [ ] Sufficient color contrast

## Testing Strategy

### Unit Tests
- Test ToolResultPopover rendering
- Test tab switching
- Test copy-to-clipboard
- Test keyboard navigation

### Integration Tests
- Test StepTimeline with popover
- Test callback propagation
- Test with various result types

### Manual Testing
- Test with real agent queries
- Test on different screen sizes
- Test with keyboard navigation
- Test with screen readers

## Estimated Effort
- **Development:** 3-4 hours
- **Testing:** 1-2 hours
- **Total:** 4-6 hours

## Success Criteria
- [ ] Tool names are clickable
- [ ] Popover opens with formatted result
- [ ] All result types render correctly
- [ ] Keyboard navigation works
- [ ] Mobile responsive
- [ ] No performance degradation

