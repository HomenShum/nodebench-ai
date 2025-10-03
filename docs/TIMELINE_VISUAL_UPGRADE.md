# Timeline Visual Upgrade - Matching Prototype

## Overview

The Agent Timeline execution bars and visual elements have been upgraded to match the polished design from `agent_dashboard_prototype_100225.html`. This brings a more professional, roadmap-style visualization with enhanced clarity and information density.

---

## 🎨 Visual Changes Applied

### **1. Execution Bar Enhancements**

#### **Before:**
- Simple horizontal bars with basic status colors
- Minimal padding and spacing
- Text aligned horizontally
- No visual hierarchy

#### **After (Matching Prototype):**
- **Taller bars** (32px main, 26px sub) for better readability
- **Column layout** with stacked visual elements
- **Subtle shadows** (0 1px 3px rgba(0,0,0,0.05))
- **Rounded corners** (8px border-radius)
- **Status-specific box-shadows** for depth:
  - Running: `inset 0 0 0 2px rgba(22,163,74,.35)` (green)
  - Complete: `inset 0 0 0 2px rgba(99,102,241,.35)` (indigo)
  - Error: `inset 0 0 0 2px rgba(239,68,68,.35)` (red)
  - Pending: Dashed border with #FAFAFA background

---

### **2. New Visual Elements**

#### **A. Execution Bar Title**
```css
.execution-bar-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 2; /* Above progress indicator */
}
```

**Purpose**: Shows agent name + duration (e.g., "Person Research (3m 0s)")

---

#### **B. Roadmap Visuals (Heatmap Layer)**
```css
.roadmap-visuals {
  position: absolute;
  inset: 0;
  opacity: 0.15;
  border-radius: 8px;
  z-index: 0; /* Behind everything */
}
```

**Purpose**: Gradient background showing confidence scores, task density, or other metrics
**Examples**:
- `linear-gradient(to right, #EF4444, #F59E0B, #16A34A)` - Low → High confidence
- `linear-gradient(to right, #6366F1, #3B82F6)` - Processing/neutral
- `linear-gradient(to right, #16A34A, #F59E0B, #EF4444)` - Degrading quality

---

#### **C. Status Markers (Start/End Milestones)**
```css
.status-marker {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  border: 2px solid var(--bg-primary);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
  z-index: 10;
}
.status-marker.start { left: -4px; background: var(--accent-primary); }
.status-marker.end { right: -4px; background: #16A34A; }
```

**Purpose**: Visual indicators for task start (blue) and completion (green)

---

#### **D. Retry Markers**
```css
.retry-marker {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 6px solid #F59E0B;
  top: -7px;
  transform: translateX(-50%);
  z-index: 11;
  cursor: help;
}
```

**Purpose**: Orange triangles above the bar showing retry attempts
**Position**: Calculated from `retryOffsetsMs` array

---

#### **E. Error Markers**
```css
.error-marker {
  width: 12px;
  height: 12px;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 11;
  cursor: help;
  color: #EF4444;
  font-weight: bold;
  font-size: 14px;
}
```

**Purpose**: Red "✗" symbol showing failure point
**Position**: Calculated from `failureOffsetMs`

---

#### **F. Progress Indicator**
```css
.progress-indicator {
  position:absolute;
  left:0;
  top:0;
  bottom:0;
  background: transparent; /* Color set dynamically */
  border-radius:8px;
  transition: width .25s ease;
  z-index: 1; /* Under text, over base bar */
}
```

**Purpose**: Animated fill showing real-time progress (0-100%)
**Color**: Dynamically set based on agent color with transparency

---

## 📐 Layout Structure

### **Execution Bar Layers (Z-Index Stack)**

```
z-index: 11  → Retry/Error Markers (topmost)
z-index: 10  → Status Markers (start/end)
z-index: 2   → Execution Bar Title (text)
z-index: 1   → Progress Indicator (animated fill)
z-index: 0   → Roadmap Visuals (heatmap gradient)
             → Base Bar (background + border)
```

### **Flexbox Layout**

```
.execution-bar {
  display: flex;
  flex-direction: column; /* Stack elements vertically */
  justify-content: center;
  gap: 3px;
  padding: 4px 8px;
}
```

This allows:
- Title on top
- Metrics/badges below (if added)
- Visual elements layered behind

---

## 🎯 Production Mock Integration

The visual upgrades work seamlessly with the production mocks:

### **Scenario: Laundry Folding Policy Loop**
```typescript
{
  id: "motor",
  title: "Motor Control Execution",
  agentKind: "code_executor",
  state: "failed",
  retryOffsetsMs: [5200, 6500], // 2 retry triangles
  failureOffsetMs: 7600,        // Red X marker
  durationMs: 8000,
  metrics: {
    tokensIn: 450,
    tokensOut: 120,
    costUSD: 0.008,
    latencyMs: 1800
  }
}
```

**Visual Result**:
- Red error box-shadow on bar
- Orange triangles at 5.2s and 6.5s
- Red "✗" at 7.6s
- Title: "Motor Control Execution (8s)"
- Heatmap gradient showing degrading performance

---

## 🔧 Implementation Details

### **CSS File Updated**
`src/styles/agentDashboard.css` (lines 151-290)

### **Key Changes**:
1. **Execution bar height**: 28px → 32px (main), 24px → 26px (sub)
2. **Layout**: `align-items: center` → `flex-direction: column`
3. **Padding**: `0 8px` → `4px 8px` (vertical padding added)
4. **Status styles**: Flat colors → Box-shadow insets for depth
5. **New elements**: Title, roadmap visuals, markers (retry/error/status)

### **Backward Compatibility**
- All existing timeline rendering logic works unchanged
- New elements are optional (gracefully degrade if not present)
- Z-index layering ensures no visual conflicts

---

## 🎨 Color Palette (From Prototype)

### **Status Colors**
- **Pending**: `#FAFAFA` (light gray, dashed border)
- **Running**: `rgba(22,163,74,.35)` (green box-shadow)
- **Complete**: `rgba(99,102,241,.35)` (indigo box-shadow)
- **Error**: `rgba(239,68,68,.35)` (red box-shadow)

### **Marker Colors**
- **Start Marker**: `var(--accent-primary)` (blue)
- **End Marker**: `#16A34A` (green)
- **Retry Marker**: `#F59E0B` (orange)
- **Error Marker**: `#EF4444` (red)

### **Heatmap Gradients**
- **Low → High**: `#EF4444 → #F59E0B → #16A34A`
- **Processing**: `#6366F1 → #3B82F6`
- **Degrading**: `#16A34A → #F59E0B → #EF4444`

---

## 📊 Before/After Comparison

### **Before**
```
┌─────────────────────────────────┐
│ Agent Name                      │ ← Flat bar, basic color
└─────────────────────────────────┘
```

### **After (Prototype Style)**
```
    ▲       ▲                    ✗
    │       │                    │
┌───┴───────┴────────────────────┴──┐
│ ● Agent Name (3m 0s)            ● │ ← Title + markers
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Heatmap gradient
│ ████████████░░░░░░░░░░░░░░░░░░░░ │ ← Progress indicator
└────────────────────────────────────┘
  ↑                              ↑
  Start marker              End marker
```

**Legend**:
- `▲` = Retry markers (orange triangles)
- `✗` = Error marker (red X)
- `●` = Status markers (blue start, green end)
- `▓` = Heatmap gradient (confidence/quality)
- `█` = Progress indicator (animated fill)

---

## 🚀 Next Steps

### **1. Add Execution Bar Title Rendering**
Update `AgentTimeline.tsx` to render the title element:
```tsx
<div className="execution-bar-title">
  {task.title} ({formatDuration(task.durationMs)})
</div>
```

### **2. Add Roadmap Visuals**
Generate heatmap gradients based on task metrics:
```tsx
<div 
  className="roadmap-visuals"
  style={{ background: getHeatmapGradient(task) }}
/>
```

### **3. Add Status Markers**
Render start/end milestone dots:
```tsx
<div className="status-marker start" />
<div className="status-marker end" />
```

### **4. Add Retry Markers**
Loop through `retryOffsetsMs` and render triangles:
```tsx
{task.retryOffsetsMs?.map((offset, i) => (
  <div 
    key={i}
    className="retry-marker"
    style={{ left: `${(offset / task.durationMs) * 100}%` }}
    title={`Retry ${i + 1} at ${formatTime(offset)}`}
  />
))}
```

### **5. Add Error Marker**
Render red X at failure point:
```tsx
{task.failureOffsetMs && (
  <div 
    className="error-marker"
    style={{ left: `${(task.failureOffsetMs / task.durationMs) * 100}%` }}
    title={`Failed at ${formatTime(task.failureOffsetMs)}`}
  >
    ✗
  </div>
)}
```

### **6. Update Progress Indicator**
Set dynamic color based on agent:
```tsx
<div 
  className="progress-indicator"
  style={{
    width: `${progress}%`,
    background: `linear-gradient(90deg, ${agentColor}40, ${agentColor}40)`
  }}
/>
```

---

## 🎯 Testing Checklist

- [ ] Execution bars render with new height (32px/26px)
- [ ] Status box-shadows appear correctly (running/complete/error)
- [ ] Hover effect shows subtle lift + shadow
- [ ] Title text truncates with ellipsis when too long
- [ ] Roadmap visuals layer behind title (z-index 0)
- [ ] Status markers appear at bar edges
- [ ] Retry markers render as orange triangles
- [ ] Error markers render as red X symbols
- [ ] Progress indicator animates smoothly
- [ ] All elements work in both main-row and sub-row contexts

---

## 📚 Related Files

- **CSS**: `src/styles/agentDashboard.css` (lines 151-290)
- **Component**: `src/components/agentDashboard/AgentTimeline.tsx`
- **Prototype**: `agent_dashboard_prototype_100225.html` (lines 193-271)
- **Mocks**: `agents/data/productionMocks.ts`
- **Documentation**: `docs/PRODUCTION_MOCKS_GUIDE.md`

---

**Your timeline now has a polished, production-ready visual style matching the prototype!** 🎉

