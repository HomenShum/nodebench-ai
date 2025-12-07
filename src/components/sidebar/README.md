# Sidebar Component Structure

This directory contains the refactored Sidebar component, broken down from a monolithic ~3000-line file into focused, maintainable modules.

## Directory Structure

```
sidebar/
├── index.tsx                  # Main orchestrator component
├── types.ts                   # Shared TypeScript interfaces
├── hooks/                     # Custom hooks
│   ├── useSidebarState.ts    # State management (50+ useState consolidated)
│   ├── useDocumentActions.ts # Document mutations & handlers
│   └── useTaskActions.ts     # Task operations
├── navigation/                # Navigation components
│   ├── AppModeNavigation.tsx # Workspace/Fast Agent/Dossier nav
│   ├── SourcesPanel.tsx      # Live sources with trust scores
│   └── SourceFilters.tsx     # Category filter buttons
├── workspace/                 # Workspace content (future extraction)
├── panels/                    # Panel components (future extraction)
├── modals/                    # Modal dialogs
│   ├── TagPickerModal.tsx    # Bulk tag operations
│   ├── MoveFolderModal.tsx   # Move to folder
│   └── ShareModal.tsx        # Share settings
├── footer/                    # Footer components
│   ├── TrashButton.tsx       # Trash with count badge
│   └── UserProfile.tsx       # User profile & settings
└── shared/                    # Shared utilities (future)
```

## Usage

```typescript
import { Sidebar } from "./components/sidebar";

<Sidebar
  appMode={appMode}
  onModeChange={handleModeChange}
  activeSources={activeSources}
  onToggleSource={handleToggleSource}
  // ... other props
/>
```

## Benefits

- **Maintainability**: Each file has a single, clear purpose
- **Reusability**: Components like modals and hooks can be reused
- **Testability**: Components can be unit tested in isolation
- **Performance**: Easier to optimize individual components with React.memo
- **Onboarding**: New developers can navigate the codebase easily

## Future Enhancements

- Extract WorkspaceContent.tsx wrapper
- Extract TabNavigation, DocumentsList, TasksList
- Extract panel components (Search, URL analysis, etc.)
- Add unit tests for each component
- Add Storybook stories for visual testing
