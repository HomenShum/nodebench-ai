# NodeBench AI Design System Documentation

## Overview

NodeBench AI is a sophisticated AI-powered document editing and workflow management platform built with React, TypeScript, and Convex. The design system emphasizes clean, modern aesthetics with comprehensive light/dark mode support and intuitive user interfaces.

## Design Philosophy

### Core Principles

1. **Clarity First**: Clean, uncluttered interfaces that prioritize content and functionality
2. **Adaptive Design**: Seamless light/dark mode transitions with consistent visual hierarchy
3. **Intuitive Interactions**: Predictable UI patterns with clear visual feedback
4. **Accessibility**: High contrast ratios and keyboard navigation support
5. **Performance**: Optimized animations and efficient resource usage

### Visual Approach

- **Minimalist Aesthetic**: Google-inspired clean design with subtle shadows and borders
- **Information Hierarchy**: Clear typographic scale and consistent spacing
- **Context-Aware UI**: Interface adapts based on user actions and content state
- **Progressive Disclosure**: Complex features revealed gradually through interaction

## Color System

### CSS Variables Architecture

The design system uses CSS custom properties for consistent theming across light and dark modes:

```css
:root {
  /* Light Mode Communication Hub Style Guide Palette */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #f1f3f4;
  --bg-hover: #e8eaed;
  --bg-active: #dadce0;
  --border-color: #e8eaed;
  --border-color-light: #f1f3f4;
  --text-primary: #202124;
  --text-secondary: #5f6368;
  --text-muted: #9aa0a6;
  --accent-primary: #4A90E2;
  --accent-primary-hover: #5AA0F2;
  --accent-primary-bg: rgba(74, 144, 226, 0.08);
  --accent-secondary: #f8f9fa;
  --accent-blue: #529cca;
  --accent-green: #4dab9a;
}

.dark {
  --bg-primary: #1F1F1F;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #252525;
  --bg-hover: #2a2a2a;
  --bg-active: #333333;
  --border-color: #2a2a2a;
  --border-color-light: #333333;
  --text-primary: #ffffff;
  --text-secondary: #b8b8b8;
  --text-muted: #808080;
  --accent-primary: #4A90E2;
  --accent-primary-hover: #5AA0F2;
  --accent-primary-bg: rgba(74, 144, 226, 0.12);
  --accent-secondary: #343434;
  --accent-blue: #529cca;
  --accent-green: #4dab9a;
}
```

### Color Palette

#### Primary Colors
- **Primary Blue**: `#4A90E2` - Main brand color, used for primary actions and highlights
- **Primary Blue Hover**: `#5AA0F2` - Interactive state for primary elements
- **Primary Background**: `rgba(74, 144, 226, 0.08)` - Subtle background tint

#### Secondary Colors
- **Accent Blue**: `#529cca` - Secondary actions and information elements
- **Accent Green**: `#4dab9a` - Success states and positive actions

#### Neutral Colors

**Light Mode:**
- **Background Primary**: `#ffffff` - Main content background
- **Background Secondary**: `#f8f9fa` - Panel and sidebar backgrounds
- **Background Tertiary**: `#f1f3f4` - Input fields and inactive elements
- **Text Primary**: `#202124` - Main text content
- **Text Secondary**: `#5f6368` - Secondary text and labels
- **Text Muted**: `#9aa0a6` - Placeholder text and disabled elements

**Dark Mode:**
- **Background Primary**: `#1F1F1F` - Main content background
- **Background Secondary**: `#1a1a1a` - Panel and sidebar backgrounds
- **Background Tertiary**: `#252525` - Input fields and inactive elements
- **Text Primary**: `#ffffff` - Main text content
- **Text Secondary**: `#b8b8b8` - Secondary text and labels
- **Text Muted**: `#808080` - Placeholder text and disabled elements

#### Interactive States
- **Hover**: `var(--bg-hover)` - Element hover states
- **Active**: `var(--bg-active)` - Element active/pressed states
- **Border**: `var(--border-color)` - Standard borders
- **Border Light**: `var(--border-color-light)` - Subtle dividers

## Typography

### Font System

**Primary Font**: Inter Variable
- Complete Unicode support
- Variable font technology for optimal performance
- Excellent readability at all sizes

**Font Stack**:
```css
font-family:
  "Inter Variable",
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  "Helvetica Neue",
  Arial,
  "Noto Sans",
  sans-serif,
  "Apple Color Emoji",
  "Segoe UI Emoji",
  "Segoe UI Symbol",
  "Noto Color Emoji";
```

### Typographic Hierarchy

The typography system supports clear information hierarchy through:
- **Primary Text**: Main content using `var(--text-primary)`
- **Secondary Text**: Supporting information using `var(--text-secondary)`
- **Muted Text**: Labels and placeholders using `var(--text-muted)`

## Component Design Patterns

### Layout Structure

#### Sidebar Navigation
- **Fixed Width**: Consistent navigation panel
- **Collapsible**: Space-efficient design with expand/collapse functionality
- **Context-Aware**: Different views for documents vs. public content
- **Search Integration**: Global search functionality built-in

#### Main Content Area
- **Document Editor**: BlockNote-powered rich text editing
- **AI Chat Panel**: Slide-in panel for AI interactions
- **Grid/List Views**: Flexible content presentation
- **Multi-Panel Layout**: Support for simultaneous content editing and AI interaction

### Interactive Components

#### Buttons
- **Primary Buttons**: High-contrast actions using accent colors
- **Secondary Buttons**: Subtle actions with hover states
- **Icon Buttons**: Compact actions with Lucide React icons
- **Loading States**: Integrated spinner animations

#### Input Fields
- **Text Inputs**: Clean borders with focus indicators
- **Search Inputs**: Enhanced with clear actions and shortcuts
- **File Upload**: Drag-and-drop with visual feedback
- **Form Validation**: Inline error states and success indicators

#### Panels and Modals
- **Slide-in Panels**: Smooth animations from screen edges
- **Modal Overlays**: Centered dialogs with backdrop blur
- **Collapsible Sections**: Progressive disclosure with chevron indicators
- **Tabs**: Segmented controls for content organization

### Icon System

**Icon Library**: Lucide React
- Consistent 24px default size
- Stroke-based design for clarity
- Comprehensive icon coverage
- Optimized SVG performance

**Common Icons**:
- Navigation: `ChevronLeft`, `ChevronRight`, `ChevronDown`
- Actions: `Plus`, `Edit`, `Trash2`, `Search`, `Upload`
- Content: `FileText`, `Image`, `MessageSquare`, `Bot`
- Status: `CheckCircle`, `AlertCircle`, `Loader2`, `X`
- Features: `Sparkles`, `Zap`, `Brain`, `Settings`

## Animation and Transitions

### Micro-Interactions

#### Hover Effects
```css
transition: all 0.2s ease;
```
- Subtle color changes on interactive elements
- Smooth scaling for clickable components
- Consistent timing across all interactions

#### Loading States
- Spinner animations for processing states
- Skeleton loading for content placeholders
- Progressive loading indicators

#### Panel Animations
- Slide transitions for modal dialogs
- Fade effects for content changes
- Smooth expand/collapse animations

### Keyframe Animations

```css
@keyframes slide-in-from-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-out-to-left {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-100%);
    opacity: 0;
  }
}
```

## Shadows and Depth

### Shadow System

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
```

**Dark Mode Adjustments**:
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
```

### Usage Guidelines
- **Small Shadows**: Subtle elevation for cards and inputs
- **Medium Shadows**: Modal dialogs and floating panels
- **Large Shadows**: Major UI elements like navigation drawers

## Responsive Design

### Breakpoint Strategy
- **Mobile First**: Progressive enhancement from smallest screens
- **Flexible Layouts**: CSS Grid and Flexbox for adaptive layouts
- **Touch-Friendly**: Minimum 44px touch targets on mobile devices
- **Content Priority**: Essential features accessible at all screen sizes

### Layout Adaptations
- **Sidebar Behavior**: Overlay on mobile, fixed on desktop
- **Panel Management**: Stack panels on mobile, side-by-side on desktop
- **Typography Scaling**: Responsive font sizes for optimal readability

## Accessibility Features

### Color Contrast
- **WCAG AA Compliance**: Minimum 4.5:1 contrast ratio for text
- **High Contrast Mode**: Enhanced visibility options
- **Color Independence**: Information not conveyed through color alone

### Keyboard Navigation
- **Tab Order**: Logical navigation sequence
- **Focus Indicators**: Clear visual focus states
- **Keyboard Shortcuts**: Quick access to common actions
- **Screen Reader Support**: Proper ARIA labels and descriptions

### Visual Indicators
- **Loading States**: Clear feedback for processing actions
- **Error States**: Descriptive error messages with visual cues
- **Success States**: Positive confirmation for completed actions

## Scrollbar Theming

### Custom Scrollbar Design

```css
*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

*::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

*::-webkit-scrollbar-thumb {
  background: var(--text-muted);
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

*::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
```

- **Thin Profile**: 8px width for unobtrusive scrolling
- **Rounded Corners**: Consistent with overall design language
- **Hover Effects**: Visual feedback on scrollbar interaction
- **Theme Awareness**: Automatic light/dark mode adaptation

## Integration Points

### Third-Party Components

#### BlockNote Editor
- **Custom Styling**: Theme-aware editor appearance
- **AI Integration**: Enhanced slash commands with AI features
- **Consistent Typography**: Matches application font system

#### Mantine Components
- **Theme Override**: Custom CSS variables integration
- **Component Customization**: Tailored to match design system
- **Accessibility**: Maintains Mantine's accessibility features

### Technology Stack Integration

#### TailwindCSS
- **Utility Classes**: Rapid prototyping and consistent spacing
- **Custom Configuration**: Extended with design system tokens
- **CSS Variables**: Seamless integration with theme system

#### React Components
- **Consistent Props**: Standardized component APIs
- **Theme Context**: Global theme state management
- **Performance**: Optimized re-rendering strategies

## Usage Guidelines

### Do's
- ✅ Use CSS variables for all color references
- ✅ Maintain consistent spacing using Tailwind utilities
- ✅ Follow established icon patterns from Lucide React
- ✅ Test components in both light and dark modes
- ✅ Ensure accessibility standards are met
- ✅ Use semantic HTML elements

### Don'ts
- ❌ Hard-code color values in components
- ❌ Mix different icon libraries without justification
- ❌ Override theme variables without documentation
- ❌ Ignore responsive design considerations
- ❌ Skip accessibility testing
- ❌ Use non-semantic markup for styling purposes

## Development Workflow

### Theme Testing
1. **Dual Mode Testing**: Verify all components in light and dark modes
2. **Color Validation**: Check contrast ratios for accessibility
3. **Interactive States**: Test hover, focus, and active states
4. **Animation Smoothness**: Ensure transitions are performant

### Component Development
1. **Design System First**: Use established patterns and tokens
2. **Progressive Enhancement**: Build from mobile to desktop
3. **Accessibility Audit**: Test with screen readers and keyboard navigation
4. **Performance Monitoring**: Optimize for fast rendering and interactions

## Future Considerations

### Planned Enhancements
- **High Contrast Mode**: Enhanced accessibility option
- **Custom Theme Builder**: User-configurable color schemes
- **Animation Controls**: Reduced motion preferences
- **Density Options**: Compact and comfortable layout modes

### Scalability
- **Component Library**: Systematic documentation of reusable components
- **Design Tokens**: Automated theme generation and distribution
- **Testing Framework**: Automated visual regression testing
- **Documentation**: Living style guide with interactive examples

---

## Quick Reference

### CSS Variables
```css
/* Backgrounds */
var(--bg-primary)    /* Main backgrounds */
var(--bg-secondary)  /* Panel backgrounds */
var(--bg-tertiary)   /* Input backgrounds */

/* Text Colors */
var(--text-primary)   /* Main text */
var(--text-secondary) /* Secondary text */
var(--text-muted)     /* Disabled/placeholder text */

/* Accent Colors */
var(--accent-primary) /* Brand blue */
var(--accent-blue)    /* Secondary blue */
var(--accent-green)   /* Success green */

/* Interactive States */
var(--bg-hover)   /* Hover backgrounds */
var(--bg-active)  /* Active/pressed backgrounds */
var(--border-color) /* Standard borders */
```

### Common Patterns
```tsx
// Theme-aware button
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
  Action
</button>

// Panel with theme support
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
  Content
</div>

// Icon with consistent sizing
<Search className="w-5 h-5 text-gray-500" />
```

This design system documentation serves as the foundation for maintaining consistency and quality across the NodeBench AI platform while ensuring an exceptional user experience.
