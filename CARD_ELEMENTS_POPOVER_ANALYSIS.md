# Card Elements & Popover View Analysis

## Overview
This document explains how card elements (CompanySelectionCard, PeopleSelectionCard, EventSelectionCard, NewsSelectionCard) currently handle display and interaction, and how they integrate with the proposed popover view for tool results.

---

## Current Card Element Architecture

### 1. Card Components Structure

All selection cards follow the same pattern:

```
SelectionCard (Main Component)
├── Prompt Section (Icon + Text)
└── Grid of Individual Cards
    ├── Card 1
    │   ├── Validation Badge
    │   ├── Icon
    │   ├── Info Section
    │   └── Select Button
    ├── Card 2
    └── Card N
```

### 2. Key Characteristics

#### State Management
- **Local Selection State**: Each card component maintains `selectedId` or `selectedCik`
- **Callback Pattern**: `onSelect` callback fires when user selects an item
- **Validation Filtering**: Only shows items with `validationResult === 'PASS'`

#### Styling
- **Responsive Grid**: `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`
- **Hover Effects**: Cards lift up and change border color on hover
- **Selection Feedback**: Selected cards show green border and background
- **Inline Styles**: Each card component includes its own `<style>` tag

#### Data Extraction
Cards are rendered from HTML comment markers embedded in tool output:
```typescript
// Example: Company selection data
<!-- COMPANY_SELECTION_DATA
{
  "prompt": "Which company would you like to analyze?",
  "companies": [
    { "cik": "0000789019", "name": "Microsoft", "ticker": "MSFT", ... }
  ]
}
-->
```

---

## Current Display Flow

### In Tool Results (Timeline)
```
Tool Execution Step
├── Tool Name (clickable in Phase 1)
├── Tool Output
│   ├── Selection Cards (if present)
│   ├── Galleries (YouTube, SEC, Images)
│   └── Text Content
```

### In Final Answer
```
Final Answer Message
├── Media Galleries (Phase 2)
│   ├── YouTube Videos
│   ├── SEC Documents
│   └── Images
└── Answer Text
    └── Selection Cards (if embedded)
```

---

## Popover Integration Strategy

### Phase 1: Tool Result Popovers

When user clicks on a tool name in the timeline, a popover opens showing:

```
┌─────────────────────────────────────┐
│ Tool: webSearch                  [X] │
├─────────────────────────────────────┤
│ [Result] [Arguments] [Error]        │
├─────────────────────────────────────┤
│                                     │
│ Selection Cards (if present)        │
│ ├─ Company Card 1                   │
│ ├─ Company Card 2                   │
│ └─ Company Card 3                   │
│                                     │
│ Galleries (if present)              │
│ ├─ YouTube Videos                   │
│ ├─ SEC Documents                    │
│ └─ Images                           │
│                                     │
│ Text Content                        │
│                                     │
└─────────────────────────────────────┘
```

### Key Considerations for Popover

#### 1. **Sizing & Scrolling**
- **Max-width**: 600px (or 90vw on mobile)
- **Max-height**: 80vh with scrollable content
- **Overflow**: Cards may need to be displayed in a single column in popover
- **Responsive**: Adjust grid columns based on available space

#### 2. **Selection Callbacks**
- Popover needs access to selection callbacks
- When user selects a company/person/event/news, callback fires
- Popover can optionally close after selection (configurable)

#### 3. **Data Extraction**
- ToolResultPopover receives `result` (unknown type)
- Must parse HTML comment markers from result string
- Reuse existing extraction logic from ToolOutputRenderer

#### 4. **Styling Constraints**
- Cards use inline `<style>` tags (scoped to class names)
- Popover may have different background/padding
- Need to ensure cards render correctly in constrained space
- Consider dark mode compatibility

---

## Implementation Approach

### Option A: Reuse ToolOutputRenderer (Recommended)

**Pros:**
- Consistent rendering logic
- All extraction logic already exists
- Minimal code duplication
- Easy to maintain

**Cons:**
- ToolOutputRenderer designed for full-width display
- May need layout adjustments for popover

**Implementation:**
```typescript
// ToolResultPopover.tsx
function ToolResultPopover({ result, ...props }) {
  return (
    <Modal {...props}>
      <ToolOutputRenderer
        output={result}
        onCompanySelect={props.onCompanySelect}
        onPersonSelect={props.onPersonSelect}
        onEventSelect={props.onEventSelect}
        onNewsSelect={props.onNewsSelect}
      />
    </Modal>
  );
}
```

### Option B: Create Specialized Popover Renderer

**Pros:**
- Optimized for popover layout
- Can customize card grid for smaller space
- Better control over styling

**Cons:**
- Code duplication with ToolOutputRenderer
- Harder to maintain consistency

---

## Card Element Behavior in Popover

### Selection Card Interaction

1. **User clicks card** → `onClick` handler fires
2. **Card highlights** → Local state updates (green border)
3. **Button changes** → "Select This Company" → "Selected" (disabled)
4. **Callback fires** → `onCompanySelect(company)` called
5. **Parent handles** → Popover can close or stay open

### Current Callback Pattern
```typescript
// In CompanySelectionCard
const handleSelect = (company: CompanyOption) => {
  setSelectedCik(company.cik);  // Local state
  onSelect(company);             // Callback to parent
};
```

### Popover Callback Handling
```typescript
// In ToolResultPopover
const handleCompanySelect = (company: CompanyOption) => {
  // Option 1: Close popover after selection
  onClose();
  
  // Option 2: Keep popover open
  // (user can see selection feedback)
  
  // Option 3: Propagate to parent
  props.onCompanySelect?.(company);
};
```

---

## Layout Adjustments for Popover

### Current Grid Layout
```css
.company-grid {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}
```

### Popover-Optimized Layout
```css
/* In popover context (600px max-width) */
.company-grid {
  grid-template-columns: 1fr;  /* Single column */
  gap: 0.75rem;               /* Reduced gap */
}

/* Or responsive */
.company-grid {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.75rem;
}
```

### Card Size Adjustments
```css
/* Reduce padding in popover */
.company-card {
  padding: 1rem;  /* was 1.25rem */
}

.company-name {
  font-size: 0.95rem;  /* was 1rem */
}

.company-description {
  -webkit-line-clamp: 1;  /* was 2 */
}
```

---

## Data Flow Diagram

```
Tool Execution
    ↓
Tool Output (string with HTML comments)
    ↓
ToolResultPopover receives result
    ↓
Extract data from HTML comments
├─ YouTube videos
├─ SEC documents
├─ Company selection data
├─ People selection data
├─ Event selection data
└─ News selection data
    ↓
Render components
├─ CompanySelectionCard
├─ PeopleSelectionCard
├─ EventSelectionCard
├─ NewsSelectionCard
├─ YouTubeGallery
├─ SECDocumentGallery
└─ Text content
    ↓
User interacts
├─ Clicks card → onSelect callback
├─ Clicks gallery item → handled by gallery
└─ Clicks close → onClose callback
```

---

## Integration Checklist

### For Phase 1 Implementation

- [ ] Create ToolResultPopover component
  - [ ] Accept `result` prop (unknown type)
  - [ ] Extract data from HTML comments
  - [ ] Render using ToolOutputRenderer or custom logic
  - [ ] Pass selection callbacks through

- [ ] Update StepTimeline
  - [ ] Make tool names clickable
  - [ ] Pass selection callbacks to popover
  - [ ] Handle popover open/close state

- [ ] Test with various result types
  - [ ] Results with selection cards
  - [ ] Results with galleries
  - [ ] Results with text only
  - [ ] Results with mixed content

- [ ] Styling
  - [ ] Ensure cards render correctly in popover
  - [ ] Test responsive layout
  - [ ] Verify color contrast
  - [ ] Test dark mode (if applicable)

### For Future Enhancements

- [ ] Add "Copy Result" button
- [ ] Add "Export Result" functionality
- [ ] Add result filtering/search
- [ ] Add result comparison (multiple tools)
- [ ] Add result history/caching

---

## Potential Issues & Solutions

### Issue 1: Card Styling Conflicts
**Problem:** Cards use inline `<style>` tags that may conflict with popover styles

**Solution:**
- Use CSS modules or scoped styles
- Or prefix all card classes with unique identifier
- Or use CSS-in-JS for better scoping

### Issue 2: Selection State Persistence
**Problem:** User selects item in popover, then closes and reopens - selection is lost

**Solution:**
- Store selection in parent component state
- Pass `selectedId` prop to card components
- Or accept that selection resets (simpler UX)

### Issue 3: Large Result Sets
**Problem:** Popover becomes too tall with many cards

**Solution:**
- Implement pagination in card components
- Or use virtualization for large lists
- Or limit displayed items (show top 5, "Show more" button)

### Issue 4: Mobile Responsiveness
**Problem:** Popover too small on mobile for card grid

**Solution:**
- Use single-column layout on mobile
- Reduce card padding/font sizes
- Or use bottom sheet instead of popover on mobile

---

## Summary

**Current State:**
- Card elements are self-contained components with local state
- They extract data from HTML comment markers in tool output
- They use responsive grid layout and inline styling
- Selection callbacks propagate to parent components

**Popover Integration:**
- Reuse ToolOutputRenderer for consistent rendering
- Pass selection callbacks through popover props
- Adjust grid layout for constrained space
- Handle selection state appropriately

**Next Steps:**
1. Implement ToolResultPopover using ToolOutputRenderer
2. Update StepTimeline to make tool names clickable
3. Test with various result types
4. Gather user feedback and iterate

